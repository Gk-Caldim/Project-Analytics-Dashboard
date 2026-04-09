"""
Dashboard Intelligence Service
Transforms raw trackers_data records into structured analytics for a given project.
"""
from sqlalchemy.orm import Session
from app.models.tracker import TrackerData
from app.models.project import Project
from app.services.issue_service import compute_analytics


# ---------------------------------------------------------------------------
# Status constants (must match what excel_parser.py writes into the DB)
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
    Main entry point.

    Args:
        db            – SQLAlchemy session
        project_id    – integer FK that matches trackers_data.project_id
        module_filter – optional module name to filter insights

    Returns a fully structured dashboard dict ready for the API layer.
    """
    # -----------------------------------------------------------------------
    # 1. Fetch project meta (optional – we still work without it)
    # -----------------------------------------------------------------------
    project = db.query(Project).filter(Project.id == project_id).first()
    project_name = project.name if project else f"Project {project_id}"

    # -----------------------------------------------------------------------
    # 2. Fetch tracker records
    # -----------------------------------------------------------------------
    query = db.query(TrackerData).filter(TrackerData.project_id == project_id)

    if module_filter:
        query = query.filter(TrackerData.module == module_filter)

    records = query.order_by(TrackerData.planned_date.asc().nullslast()).all()

    # Edge case: no data at all
    if not records:
        return {
            "project_id": project_id,
            "project_name": project_name,
            "project_health": "Green",
            "total_milestones": 0,
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

    # -----------------------------------------------------------------------
    # 3. Compute counts
    # -----------------------------------------------------------------------
    total     = len(records)
    completed = sum(1 for r in records if r.status == STATUS_ON_TRACK)
    delayed   = sum(1 for r in records if r.status == STATUS_DELAYED)
    pending   = sum(1 for r in records if r.status == STATUS_PENDING)

    # Guard: anything that is neither On Track / Delayed → treat as Pending
    unclassified = total - completed - delayed - pending
    pending += unclassified

    # -----------------------------------------------------------------------
    # 4. Delay statistics
    # -----------------------------------------------------------------------
    delay_days_list = [
        r.delay_days for r in records
        if r.delay_days is not None and r.delay_days > 0
    ]
    avg_delay = round(sum(delay_days_list) / len(delay_days_list)) if delay_days_list else 0
    max_delay = max(delay_days_list, default=0)

    # -----------------------------------------------------------------------
    # 5. Health + percentages
    # -----------------------------------------------------------------------
    # Fetch issue analytics for project health
    issue_metrics = compute_analytics(db, project_id)
    overdue_issues_count = issue_metrics.get("total_overdue", 0)

    health             = _determine_health(overdue_issues_count)
    on_track_pct       = _safe_pct(completed, total)
    delay_pct          = _safe_pct(delayed,   total)
    pending_pct        = _safe_pct(pending,   total)

    # -----------------------------------------------------------------------
    # 6. Per-milestone list (most informative first: Delayed → Pending → OnTrack)
    # -----------------------------------------------------------------------
    status_order = {STATUS_DELAYED: 0, STATUS_PENDING: 1, STATUS_ON_TRACK: 2}

    milestones = sorted(
        [
            {
                "id":           r.id,
                "module":       r.module or "",
                "milestone":    r.milestone_name or "",
                "planned_date": _format_date(r.planned_date),
                "actual_date":  _format_date(r.actual_date),
                "delay_days":   r.delay_days or 0,
                "status":       r.status or STATUS_PENDING,
            }
            for r in records
        ],
        key=lambda m: (status_order.get(m["status"], 99), -(m["delay_days"] or 0)),
    )

    # -----------------------------------------------------------------------
    # 7. Module-level breakdown (useful for grouped charts)
    # -----------------------------------------------------------------------
    module_map: dict[str, dict] = {}
    for r in records:
        mod = r.module or "Unknown"
        if mod not in module_map:
            module_map[mod] = {"module": mod, "total": 0, "completed": 0, "delayed": 0, "pending": 0}
        module_map[mod]["total"] += 1
        if r.status == STATUS_ON_TRACK:
            module_map[mod]["completed"] += 1
        elif r.status == STATUS_DELAYED:
            module_map[mod]["delayed"] += 1
        else:
            module_map[mod]["pending"] += 1

    modules = list(module_map.values())

    # -----------------------------------------------------------------------
    # 8. Final response
    # -----------------------------------------------------------------------
    return {
        "project_id":     project_id,
        "project_name":   project_name,
        "project_health": health,
        "total_milestones": total,
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


def get_all_projects_summary(db: Session) -> list[dict]:
    """
    Returns a lightweight health card for EVERY project that has tracker data.
    Useful for a top-level overview dashboard.
    """
    # Distinct project_ids that have tracker rows
    rows = db.query(TrackerData.project_id).distinct().all()
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

    return summary
