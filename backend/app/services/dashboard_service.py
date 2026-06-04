"""
Dashboard Intelligence Service
Transforms raw trackers_data records into structured analytics for a given project.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.tracker_ingestion import TrackerIngestion
from app.models.project import Project
from app.services.issue_service import compute_analytics
from app.utils.analytics_utils import standardize_records
from cachetools import TTLCache

dashboard_cache = TTLCache(maxsize=100, ttl=300) # 5 mins cache


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
    # 1. Fetch project meta
    project = db.query(Project).filter(Project.id == project_id).first()
    project_name = project.name if project else f"Project {project_id}"

    # 2. Fetch latest tracker ingestions for the project
    # Strategy: Group by file_name and take the latest created_at for each.
    subq = db.query(
        TrackerIngestion.file_name,
        func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()

    ingestions = db.query(TrackerIngestion).join(
        subq, 
        (TrackerIngestion.file_name == subq.c.file_name) & 
        (TrackerIngestion.created_at == subq.c.max_created)
    ).filter(TrackerIngestion.project_id == project_id).all()

    # 3. Combine and standardize records
    all_raw_records = []
    for ing in ingestions:
        if isinstance(ing.data, list):
            all_raw_records.extend(ing.data)
    
    import time
    start_std = time.perf_counter()
    records = standardize_records(all_raw_records)
    print(f"standardize_records: {(time.perf_counter() - start_std) * 1000:.2f}ms")

    # 4. Filter by module if requested
    if module_filter:
        records = [r for r in records if r["module"] == module_filter]

    # Edge case: no data at all
    if not records:
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

    # 5. Compute counts
    total      = len(records)
    submodules = len({r["module"] for r in records if r["module"]})
    completed  = sum(1 for r in records if r["status"] == STATUS_ON_TRACK)
    delayed    = sum(1 for r in records if r["status"] == STATUS_DELAYED)
    pending    = sum(1 for r in records if r["status"] == STATUS_PENDING)

    # 6. Delay statistics
    delay_days_list = [
        r["delay_days"] for r in records
        if r["delay_days"] is not None and r["delay_days"] > 0
    ]
    avg_delay = round(sum(delay_days_list) / len(delay_days_list)) if delay_days_list else 0
    max_delay = max(delay_days_list, default=0)

    # 7. Health + percentages
    issue_metrics = compute_analytics(db, project_id)
    overdue_issues_count = issue_metrics.get("total_overdue", 0)

    health             = _determine_health(overdue_issues_count)
    on_track_pct       = _safe_pct(completed, total)
    delay_pct          = _safe_pct(delayed,   total)
    pending_pct        = _safe_pct(pending,   total)

    milestones = []

    # 9. Module-level breakdown
    module_map: dict[str, dict] = {}
    for r in records:
        mod = r["module"] or "Unknown"
        if mod not in module_map:
            module_map[mod] = {"module": mod, "total": 0, "completed": 0, "delayed": 0, "pending": 0}
        module_map[mod]["total"] += 1
        if r["status"] == STATUS_ON_TRACK:
            module_map[mod]["completed"] += 1
        elif r["status"] == STATUS_DELAYED:
            module_map[mod]["delayed"] += 1
        else:
            module_map[mod]["pending"] += 1

    modules = list(module_map.values())

    # 10. Final response
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

