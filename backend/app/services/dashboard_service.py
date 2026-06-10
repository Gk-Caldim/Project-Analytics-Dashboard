"""
Dashboard Intelligence Service
Transforms raw trackers_data records into structured analytics for a given project.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session, defer
from app.models.tracker_ingestion import TrackerIngestion
from app.models.project import Project
from app.services.issue_service import compute_analytics
from app.utils.analytics_utils import standardize_records, compute_tracker_summary
from cachetools import TTLCache

dashboard_cache = TTLCache(maxsize=100, ttl=300) # 5 mins cache


def clear_dashboard_cache(project_id: int = None):
    """Clear all keys or specific keys for a project from the cache."""
    if project_id is None:
        dashboard_cache.clear()
    else:
        keys_to_del = [k for k in dashboard_cache.keys() if k.startswith(f"dashboard_{project_id}") or k == "all_projects_summary"]
        for k in keys_to_del:
            dashboard_cache.pop(k, None)


# ---------------------------------------------------------------------------
# Status constants
# ---------------------------------------------------------------------------
STATUS_ON_TRACK = "On Track"
STATUS_DELAYED  = "Delayed"
STATUS_PENDING  = "Pending"


def _determine_health(delayed: int) -> str:
    """
    Business rule:
      delayed >= 3  → Red
      delayed  > 0  → Yellow
      delayed == 0  → Green
    """
    if delayed >= 3:
        return "Red"
    elif delayed > 0:
        return "Yellow"
    return "Green"


def _safe_pct(numerator: int, total: int) -> int:
    """Integer percentage, guards against divide-by-zero."""
    if total == 0:
        return 0
    return round((numerator / total) * 100)


def _format_date(dt) -> str | None:
    """Return ISO date string or None."""
    if dt is None:
        return None
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return str(dt)


def get_dashboard_data(db: Session, project_id: int, module_filter: str | None = None) -> dict:
    """
    Main entry point for analytics.
    Sources data from TrackerIngestion table (JSONB).
    """
    cache_key = f"dashboard_{project_id}_{module_filter}"
    if cache_key in dashboard_cache:
        print(f"[CACHE HIT] Serving dashboard data for project {project_id} from memory.")
        return dashboard_cache[cache_key]

    print(f"[CACHE MISS] Calculating dashboard data for project {project_id} from DB...")
    # 1 & 2. Fetch project metadata and latest tracker ingestions in a single round-trip
    import time
    start_q1_q2 = time.perf_counter()
    
    subq_merged = db.query(
        TrackerIngestion.file_name,
        func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()
    
    results = (
        db.query(Project, TrackerIngestion)
        .select_from(Project)
        .options(defer(TrackerIngestion.data))  # Defer loading the large JSONB records
        .outerjoin(
            subq_merged,
            Project.id == Project.id
        )
        .outerjoin(
            TrackerIngestion,
            (TrackerIngestion.project_id == Project.id) &
            (TrackerIngestion.file_name == subq_merged.c.file_name) &
            (TrackerIngestion.created_at == subq_merged.c.max_created)
        )
        .filter(Project.id == project_id)
        .all()
    )
    
    q1_q2_duration = (time.perf_counter() - start_q1_q2) * 1000
    print(f"Project + Ingestion merged query: {q1_q2_duration:.2f}ms")
    
    if not results:
        project_name = f"Project {project_id}"
        ingestions = []
    else:
        project = results[0][0]
        project_name = project.name if project else f"Project {project_id}"
        ingestions = [row[1] for row in results if row[1] is not None]

    # Merge precomputed module summaries from all active files
    merged_modules = {}
    for ing in ingestions:
        summary = ing.summary_data
        if summary is None:
            # Fallback/self-healing for legacy rows
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Self-healing tracker summary for ingestion {ing.id} ({ing.file_name})...")
            # This triggers lazy-load of deferred data column
            raw_data = ing.data
            if raw_data and isinstance(raw_data, list):
                summary = compute_tracker_summary(raw_data)
                ing.summary_data = summary
                db.add(ing)
                try:
                    db.commit()
                except Exception as commit_err:
                    db.rollback()
                    logger.error(f"Failed to auto-save summary fallback: {commit_err}")
            else:
                summary = {"modules": {}}
        
        # Merge modules from this ingestion's summary
        modules_dict = summary.get("modules", {})
        for mod, m_stat in modules_dict.items():
            if mod not in merged_modules:
                merged_modules[mod] = {
                    "module": mod,
                    "total": 0,
                    "completed": 0,
                    "delayed": 0,
                    "pending": 0,
                    "total_delay_days": 0,
                    "max_delay_days": 0
                }
            merged = merged_modules[mod]
            merged["total"] += m_stat.get("total", 0)
            merged["completed"] += m_stat.get("completed", 0)
            merged["delayed"] += m_stat.get("delayed", 0)
            merged["pending"] += m_stat.get("pending", 0)
            merged["total_delay_days"] += m_stat.get("total_delay_days", 0)
            merged["max_delay_days"] = max(merged["max_delay_days"], m_stat.get("max_delay_days", 0))

    # Apply module filter if requested
    if module_filter:
        filtered_modules = {mod: stat for mod, stat in merged_modules.items() if mod == module_filter}
    else:
        filtered_modules = merged_modules

    # Edge case: no data at all
    if not filtered_modules:
        return {
            "project_id": project_id,
            "project_name": project_name,
            "project_health": "Green",
            "total_milestones": 0,
            "submodules": 0,
            "completed": 0,
            "delayed": 0,
            "pending": 0,
            "milestones": [],
            "summary": {
                "on_track_percentage": 0,
                "delay_percentage": 0,
                "pending_percentage": 0,
                "avg_delay_days": 0,
                "max_delay_days": 0,
            },
        }

    # Compute counts from merged/filtered modules
    total      = sum(m["total"] for m in filtered_modules.values())
    submodules = len({m["module"] for m in filtered_modules.values() if m["module"]})
    completed  = sum(m["completed"] for m in filtered_modules.values())
    delayed    = sum(m["delayed"] for m in filtered_modules.values())
    pending    = sum(m["pending"] for m in filtered_modules.values())

    # Delay statistics
    total_delay_days = sum(m["total_delay_days"] for m in filtered_modules.values())
    avg_delay = round(total_delay_days / delayed) if delayed > 0 else 0
    max_delay = max((m["max_delay_days"] for m in filtered_modules.values()), default=0)

    # Health + percentages (remains dynamic)
    issue_metrics = compute_analytics(db, project_id)
    overdue_issues_count = issue_metrics.get("total_overdue", 0)

    health             = _determine_health(overdue_issues_count)
    on_track_pct       = _safe_pct(completed, total)
    delay_pct          = _safe_pct(delayed,   total)
    pending_pct        = _safe_pct(pending,   total)

    milestones = []
    if results and results[0][0]:
        project = results[0][0]
        if project.project_id:
            from app.models.project_milestone import ProjectMilestone
            from app.schemas.project_milestone import MilestoneResponse
            from datetime import datetime
            
            milestone_rows = (
                db.query(ProjectMilestone)
                .filter(ProjectMilestone.project_id == project.project_id)
                .order_by(ProjectMilestone.row_order.asc())
                .all()
            )
            for t in milestone_rows:
                try:
                    m_dict = MilestoneResponse.model_validate(t).model_dump(mode="json")
                except AttributeError:
                    m_dict = MilestoneResponse.from_orm(t).dict()
                    for k, v in m_dict.items():
                        if isinstance(v, datetime):
                            m_dict[k] = v.isoformat()
                milestones.append(m_dict)

    # Map to frontend output list format (omitting delay internals)
    modules = [
        {
            "module": m["module"],
            "total": m["total"],
            "completed": m["completed"],
            "delayed": m["delayed"],
            "pending": m["pending"]
        }
        for m in filtered_modules.values()
    ]

    # Final response
    result = {
        "project_id":     project_id,
        "project_name":   project_name,
        "project_health": health,
        "total_milestones": total,
        "submodules": submodules,
        "completed": completed,
        "delayed":   delayed,
        "pending":   pending,
        "milestones": milestones,
        "modules":    modules,
        "summary": {
            "on_track_percentage": on_track_pct,
            "delay_percentage":    delay_pct,
            "pending_percentage":  pending_pct,
            "avg_delay_days":      avg_delay,
            "max_delay_days":      max_delay,
        },
    }
    dashboard_cache[cache_key] = result
    return result


def get_all_projects_summary(db: Session) -> list[dict]:
    """
    Returns a lightweight health card for EVERY project that has tracker data.
    """
    cache_key = "all_projects_summary"
    if cache_key in dashboard_cache:
        print(f"[CACHE HIT] Serving all projects summary from memory.")
        return dashboard_cache[cache_key]

    print(f"[CACHE MISS] Calculating all projects summary...")
    # Distinct project_ids that have ingestions
    rows = db.query(TrackerIngestion.project_id).distinct().all()
    project_ids = [r[0] for r in rows]

    summary = []
    for pid in project_ids:
        data = get_dashboard_data(db, pid)
        summary.append({
            "project_id":       data["project_id"],
            "project_name":     data["project_name"],
            "project_health":   data["project_health"],
            "total_milestones": data["total_milestones"],
            "completed":        data["completed"],
            "delayed":          data["delayed"],
            "pending":          data["pending"],
            "on_track_pct":     data["summary"]["on_track_percentage"],
            "delay_pct":        data["summary"]["delay_percentage"],
        })

    dashboard_cache[cache_key] = summary
    return summary

