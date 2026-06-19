"""
Dashboard Intelligence Service
Transforms raw trackers_data records into structured analytics for a given project.
"""
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, defer
from app.models.tracker_ingestion import TrackerIngestion
from app.models.project import Project
from app.services.issue_service import compute_analytics
from app.utils.analytics_utils import standardize_records, compute_tracker_summary
from cachetools import TTLCache

dashboard_cache = TTLCache(maxsize=100, ttl=300) # 5 mins cache


# pyrefly: ignore [bad-function-definition]
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
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        project_name = f"Project {project_id}"
        ingestions = []
    else:
        project_name = project.name
        subq_merged = db.query(
            TrackerIngestion.file_name,
            func.max(TrackerIngestion.created_at).label('max_created')
        ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()

        ingestions = (
            db.query(TrackerIngestion)
            .options(defer(TrackerIngestion.data))
            .filter(TrackerIngestion.project_id == project_id)
            .join(
                subq_merged,
                (TrackerIngestion.file_name == subq_merged.c.file_name) &
                (TrackerIngestion.created_at == subq_merged.c.max_created)
            )
            .all()
        )
    
    q1_q2_duration = (time.perf_counter() - start_q1_q2) * 1000
    print(f"Project + Ingestion merged query: {q1_q2_duration:.2f}ms")

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
    if project:
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
                m_dict = MilestoneResponse.model_validate(t).model_dump(mode="json")
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


# ---------------------------------------------------------------------------
# NEW: Overview KPIs (5 real metrics for Overview Dashboard)
# ---------------------------------------------------------------------------

def get_overview_kpis(db: Session) -> dict:
    """
    Returns exactly 5 KPI values for the Overview Dashboard:
    1. Total Projects
    2. Delayed Milestones (across all projects)
    3. Open Issues (status != Closed)
    4. Pending Budget Revisions
    5. Budgets Exceeding Utilization (project-level: utilized_budget > budget)
    """
    from app.models.project_milestone import ProjectMilestone
    from app.models.issue import Issue
    from app.models.budget import BudgetRevision

    total_projects = db.query(func.count(Project.id)).scalar() or 0

    delayed_milestones = db.query(func.count(ProjectMilestone.id)).filter(
        ProjectMilestone.status == "Delayed"
    ).scalar() or 0

    open_issues = db.query(func.count()).select_from(Issue).filter(
        Issue.status != "Closed"
    ).scalar() or 0

    pending_revisions = db.query(func.count(BudgetRevision.id)).filter(
        BudgetRevision.status.in_(["Pending Head", "Pending Finance"])
    ).scalar() or 0

    exceeding_budget = db.query(func.count(Project.id)).filter(
        Project.utilized_budget > Project.budget,
        Project.budget > 0
    ).scalar() or 0

    return {
        "total_projects": total_projects,
        "delayed_milestones": delayed_milestones,
        "open_issues": open_issues,
        "pending_budget_revisions": pending_revisions,
        "budgets_exceeding_utilization": exceeding_budget,
    }


# ---------------------------------------------------------------------------
# NEW: Supply Chain Analytics (from BudgetSummary.budget_data JSONB)
# ---------------------------------------------------------------------------

def get_supply_chain_analytics(db: Session) -> dict:
    """
    Parses BudgetSummary.budget_data JSONB array for each project.
    Groups by 'Cost Center' and 'Commodity' fields.
    Returns project-level and category-level breakdowns.
    """
    from app.models.budget import BudgetSummary
    summaries = db.query(BudgetSummary).all()

    # Build lookup: project_name -> Project record
    projects = db.query(Project).all()
    proj_budget_map = {p.name: {"budget": p.budget, "utilized": p.utilized_budget} for p in projects}

    CATEGORY_KEYS = ["Cost Center", "cost_center", "CostCenter", "Category", "category", "Commodity", "commodity", "Item Name", "item_name", "item"]
    AMOUNT_KEYS = ["Overall Budget", "overall_budget", "Budget Amount", "budget_amount",
                   "Approved Budget", "approved_budget", "Amount", "amount", "Estimated", "estimated", "Budget", "budget"]
    UTILIZED_KEYS = ["Total utilization", "total_utilization", "Utilized", "utilized",
                     "Actual Cost", "actual_cost", "Spent", "spent"]

    def _extract(row: dict, keys: list):
        for k in keys:
            if k in row and row[k] not in (None, "", 0, "0"):
                return row[k]
        return None

    def _to_float(val) -> float:
        if val is None:
            return 0.0
        try:
            return float(str(val).replace(",", "").replace("₹", "").replace("$", "").strip())
        except (ValueError, TypeError):
            return 0.0

    projects_data = []
    all_cost_centers: dict = {}
    all_commodities: dict = {}

    for bs in summaries:
        rows = bs.budget_data
        if not rows or not isinstance(rows, list):
            continue

        proj_cost_centers: dict = {}
        proj_commodities: dict = {}
        total_budget = 0.0
        total_utilized = 0.0

        for row in rows:
            if not isinstance(row, dict):
                continue

            cost_center = None
            commodity = None

            # Try Cost Center
            for k in ["Cost Center", "cost_center", "CostCenter", "Category", "category"]:
                if k in row and row[k]:
                    cost_center = str(row[k]).strip()
                    break

            # Try Commodity
            for k in ["Commodity", "commodity", "Item Name", "item_name", "Item name", "item"]:
                if k in row and row[k]:
                    commodity = str(row[k]).strip()
                    break

            budget_amt = _to_float(_extract(row, AMOUNT_KEYS))
            utilized_amt = _to_float(_extract(row, UTILIZED_KEYS))

            total_budget += budget_amt
            total_utilized += utilized_amt

            if cost_center:
                if cost_center not in proj_cost_centers:
                    proj_cost_centers[cost_center] = {"budget": 0.0, "utilized": 0.0, "rows": 0}
                proj_cost_centers[cost_center]["budget"] += budget_amt
                proj_cost_centers[cost_center]["utilized"] += utilized_amt
                proj_cost_centers[cost_center]["rows"] += 1

                if cost_center not in all_cost_centers:
                    all_cost_centers[cost_center] = {"budget": 0.0, "utilized": 0.0}
                all_cost_centers[cost_center]["budget"] += budget_amt
                all_cost_centers[cost_center]["utilized"] += utilized_amt

            if commodity:
                if commodity not in proj_commodities:
                    proj_commodities[commodity] = {"budget": 0.0, "utilized": 0.0, "rows": 0}
                proj_commodities[commodity]["budget"] += budget_amt
                proj_commodities[commodity]["utilized"] += utilized_amt
                proj_commodities[commodity]["rows"] += 1

                if commodity not in all_commodities:
                    all_commodities[commodity] = {"budget": 0.0, "utilized": 0.0}
                all_commodities[commodity]["budget"] += budget_amt
                all_commodities[commodity]["utilized"] += utilized_amt

        if total_budget == 0 and not proj_cost_centers and not proj_commodities:
            continue

        proj_meta = proj_budget_map.get(bs.project_name, {})
        projects_data.append({
            "project_name": bs.project_name,
            "total_budget": total_budget or proj_meta.get("budget", 0),
            "total_utilized": total_utilized or proj_meta.get("utilized", 0),
            "cost_centers": [
                {"name": k, "budget": v["budget"], "utilized": v["utilized"], "rows": v["rows"]}
                for k, v in proj_cost_centers.items()
            ],
            "commodities": [
                {"name": k, "budget": v["budget"], "utilized": v["utilized"], "rows": v["rows"]}
                for k, v in proj_commodities.items()
            ],
        })

    # KPI summary
    total_budget_all = sum(p["total_budget"] for p in projects_data)
    total_utilized_all = sum(p["total_utilized"] for p in projects_data)
    utilization_pct = round((total_utilized_all / total_budget_all) * 100, 1) if total_budget_all > 0 else 0

    return {
        "kpis": {
            "total_supply_categories": len(all_cost_centers) + len(all_commodities),
            "total_cost_centers": len(all_cost_centers),
            "total_commodities": len(all_commodities),
            "projects_with_supply_data": len(projects_data),
            "total_budget": total_budget_all,
            "total_utilized": total_utilized_all,
            "utilization_pct": utilization_pct,
        },
        "projects": projects_data,
        "cost_centers": [
            {"name": k, "budget": v["budget"], "utilized": v["utilized"]}
            for k, v in sorted(all_cost_centers.items(), key=lambda x: x[1]["budget"], reverse=True)
        ],
        "commodities": [
            {"name": k, "budget": v["budget"], "utilized": v["utilized"]}
            for k, v in sorted(all_commodities.items(), key=lambda x: x[1]["budget"], reverse=True)
        ],
    }


# ---------------------------------------------------------------------------
# NEW: Workforce Enriched (employees + project allocations)
# ---------------------------------------------------------------------------

def get_workforce_enriched(db: Session) -> dict:
    """
    Returns enriched workforce analytics:
    - All employees with their project allocations (EmployeeProjectMap)
    - Milestone assignment counts per employee
    """
    from app.models.employee import Employee
    from app.models.employee_project import EmployeeProjectMap
    from app.models.project_milestone import ProjectMilestone, MilestoneAssignment

    employees = db.query(Employee).all()
    allocations = db.query(EmployeeProjectMap).all()
    projects = db.query(Project).all()

    proj_map = {p.project_id: p.name for p in projects if p.project_id}
    proj_id_map = {p.id: p.name for p in projects}

    # Build allocation index: employee_id -> list of allocations
    alloc_index: dict = {}
    for a in allocations:
        eid = a.employee_id
        if eid not in alloc_index:
            alloc_index[eid] = []
        alloc_index[eid].append({
            "project_id": a.project_id,
            "project_name": proj_map.get(a.project_id, a.project_id),
            "role": a.role,
            "allocation_percentage": a.allocation_percentage or 0.0,
        })

    # Assignment counts per employee_id
    assignment_counts_raw = db.query(
        MilestoneAssignment.employee_id,
        func.count(MilestoneAssignment.id).label("count")
    ).group_by(MilestoneAssignment.employee_id).all()
    assign_index = {row.employee_id: row.count for row in assignment_counts_raw}

    employees_data = []
    for emp in employees:
        emp_allocs = alloc_index.get(emp.employee_id, [])
        total_allocation = sum(a["allocation_percentage"] for a in emp_allocs)
        milestone_count = assign_index.get(emp.employee_id, 0)
        employees_data.append({
            "employee_id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "department": emp.department,
            "status": emp.status,
            "total_allocation_pct": min(total_allocation, 200),  # cap at 200%
            "project_count": len(emp_allocs),
            "milestone_assignments": milestone_count,
            "allocations": emp_allocs,
        })

    overloaded = [e for e in employees_data if e["total_allocation_pct"] > 100]
    unallocated = [e for e in employees_data if e["project_count"] == 0]
    well_utilized = [e for e in employees_data
                     if 60 <= e["total_allocation_pct"] <= 100]

    # Role breakdown
    role_counts: dict = {}
    for e in employees_data:
        r = e["role"] or "Other"
        role_counts[r] = role_counts.get(r, 0) + 1

    return {
        "kpis": {
            "total_employees": len(employees_data),
            "allocated_employees": len(employees_data) - len(unallocated),
            "overloaded": len(overloaded),
            "unallocated": len(unallocated),
            "well_utilized": len(well_utilized),
        },
        "employees": employees_data,
        "role_breakdown": [
            {"role": k, "count": v}
            for k, v in sorted(role_counts.items(), key=lambda x: x[1], reverse=True)
        ],
    }


# ---------------------------------------------------------------------------
# NEW: Trackers Analytics (metadata from Upload table — no data column)
# ---------------------------------------------------------------------------

def get_trackers_analytics(db: Session) -> dict:
    """
    Returns tracker metadata analytics:
    - Manual trackers (industry == 'MANUAL') and uploaded trackers
    - Groups by project, type, status
    - Excludes drafts
    """
    from app.models.upload import Upload

    uploads = db.query(
        Upload.id,
        Upload.project_id,
        Upload.file_name,
        Upload.department,
        Upload.industry,
        Upload.row_count,
        Upload.valid_row_count,
        Upload.status,
        Upload.uploaded_by,
        Upload.uploaded_at,
    ).filter(
        Upload.status != "Draft"
    ).order_by(Upload.uploaded_at.desc()).all()

    projects = db.query(Project).all()
    proj_map = {p.id: p.name for p in projects}

    trackers = []
    manual_count = 0
    uploaded_count = 0
    status_counts: dict = {}
    project_counts: dict = {}

    for u in uploads:
        is_manual = (u.industry or "").upper() == "MANUAL"
        proj_name = proj_map.get(u.project_id, "-")
        tracker_type = "Manual" if is_manual else "Uploaded"

        if is_manual:
            manual_count += 1
        else:
            uploaded_count += 1

        st = u.status or "Completed"
        status_counts[st] = status_counts.get(st, 0) + 1

        if proj_name not in project_counts:
            project_counts[proj_name] = {"manual": 0, "uploaded": 0, "total": 0}
        project_counts[proj_name]["total"] += 1
        if is_manual:
            project_counts[proj_name]["manual"] += 1
        else:
            project_counts[proj_name]["uploaded"] += 1

        trackers.append({
            "id": u.id,
            "tracker_name": u.file_name,
            "project_name": proj_name,
            "project_id": u.project_id,
            "type": tracker_type,
            "department": u.department,
            "row_count": u.row_count or 0,
            "valid_row_count": u.valid_row_count or 0,
            "status": st,
            "uploaded_by": u.uploaded_by,
            "uploaded_at": u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
        })

    active_projects = len([p for p, v in project_counts.items() if v["total"] > 0 and p != "-"])

    return {
        "kpis": {
            "total_trackers": len(trackers),
            "manual_trackers": manual_count,
            "uploaded_trackers": uploaded_count,
            "active_projects": active_projects,
        },
        "trackers": trackers,
        "by_project": [
            {"project": k, "manual": v["manual"], "uploaded": v["uploaded"], "total": v["total"]}
            for k, v in sorted(project_counts.items(), key=lambda x: x[1]["total"], reverse=True)
        ],
        "by_status": [
            {"status": k, "count": v}
            for k, v in sorted(status_counts.items(), key=lambda x: x[1], reverse=True)
        ],
    }


# ---------------------------------------------------------------------------
# NEW: Issues Enriched (with real project names from DB join)
# ---------------------------------------------------------------------------

def get_issues_enriched(db: Session) -> list:
    """
    Returns all issues joined with their project names from the projects table.
    Guarantees project_name is always a real project name, never null.
    """
    from app.models.issue import Issue

    issues = db.query(Issue, Project.name.label("proj_name")).outerjoin(
        Project, Issue.project_id == Project.id
    ).all()

    result = []
    for issue, proj_name in issues:
        result.append({
            "id": issue.id,
            "project_id": issue.project_id,
            "project_name": proj_name or f"Project {issue.project_id}",
            "source": issue.source,
            "title": issue.title,
            "description": issue.description,
            "owner": issue.owner,
            "department": issue.department,
            "priority": issue.priority,
            "severity_score": issue.severity_score,
            "status": issue.status,
            "due_date": issue.due_date.isoformat() if issue.due_date else None,
            "created_at": issue.created_at.isoformat() if issue.created_at else None,
            "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
        })

    return result
