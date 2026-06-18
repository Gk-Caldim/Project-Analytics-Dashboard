"""
Dashboard Intelligence API
GET /api/dashboard/{project_id}   – single project analytics
GET /api/dashboard/summary        – all projects overview
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.dashboard_service import get_dashboard_data, get_all_projects_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard Intelligence"])


@router.get("/summary")
def project_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a lightweight health card for every project that has tracker data.
    Ideal for a top-level overview panel.
    """
    try:
        return get_all_projects_summary(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project summary: {str(e)}",
        )


@router.get("/summary/analytics")
def project_summary_analytics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns aggregated analytics metrics for non-PM roles:
    - Department-wise task breakdown of milestones
    - Resource availability vs utilization of milestones
    - Project status summary (project count by status)
    """
    try:
        from sqlalchemy import func
        from app.models.project_milestone import ProjectMilestone, MilestoneAssignment
        from app.models.employee import Employee
        from app.models.project import Project

        # 1. Department wise breakdown of milestones
        dept_stats = db.query(
            ProjectMilestone.department,
            ProjectMilestone.status,
            func.count(ProjectMilestone.id)
        ).filter(
            ProjectMilestone.department.isnot(None),
            ProjectMilestone.department != ''
        ).group_by(
            ProjectMilestone.department,
            ProjectMilestone.status
        ).all()

        department_breakdown = {}
        for dept, status_val, count in dept_stats:
            dept_clean = dept.strip()
            if not dept_clean:
                continue
            if dept_clean not in department_breakdown:
                department_breakdown[dept_clean] = {}
            department_breakdown[dept_clean][status_val or "Not Started"] = count

        # 2. Resource availability Vs Utilization of milestones
        timeframe = db.query(
            func.min(ProjectMilestone.start_date),
            func.max(ProjectMilestone.end_date)
        ).first()

        min_start, max_end = timeframe
        if min_start and max_end:
            timeline_days = max(1, (max_end - min_start).days)
        else:
            timeline_days = 30

        assignments = db.query(
            MilestoneAssignment.employee_id,
            Employee.name,
            Employee.role,
            ProjectMilestone.start_date,
            ProjectMilestone.end_date
        ).join(
            ProjectMilestone, MilestoneAssignment.task_id == ProjectMilestone.id
        ).join(
            Employee, MilestoneAssignment.employee_id == Employee.employee_id
        ).all()

        employee_hours = {}
        for emp_id, emp_name, emp_role, start_date, end_date in assignments:
            if not start_date or not end_date:
                continue
            days = max(1, (end_date - start_date).days)
            hours = days * 8

            if emp_id not in employee_hours:
                employee_hours[emp_id] = {
                    "employee_id": emp_id,
                    "name": emp_name or emp_id,
                    "role": emp_role or "User",
                    "total_hours": 0
                }
            employee_hours[emp_id]["total_hours"] += hours

        resource_utilization = []
        for emp_id, info in employee_hours.items():
            util_hours_per_day = round((info["total_hours"] / timeline_days) * 10) / 10
            # Cap at 12.0 to avoid layout scaling issues for extreme outliers
            util_hours_per_day = min(12.0, util_hours_per_day)
            resource_utilization.append({
                "employee_id": emp_id,
                "name": info["name"],
                "role": info["role"],
                "availability": 8.0,
                "utilization": util_hours_per_day
            })

        resource_utilization = sorted(resource_utilization, key=lambda x: x["utilization"], reverse=True)[:15]

        # 3. Project status summary
        project_stats = db.query(
            Project.status,
            func.count(Project.id)
        ).group_by(Project.status).all()

        project_status_summary = [{"status": status_val or "Planning", "count": count} for status_val, count in project_stats]

        return {
            "department_breakdown": department_breakdown,
            "resource_utilization": resource_utilization,
            "project_status_summary": project_status_summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard summary analytics: {str(e)}",
        )



@router.get("/{project_id}")
def project_dashboard(
    project_id: int,
    module: Optional[str] = Query(None, description="Filter by module name, e.g. Build"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Full analytics for a single project.

    Response:
    {
        "project_id": 1,
        "project_name": "Mahindra XUV700",
        "project_health": "Red" | "Yellow" | "Green",
        "total_milestones": 10,
        "completed": 4,
        "delayed": 3,
        "pending": 3,
        "milestones": [...],
        "modules": [...],
        "summary": {
            "on_track_percentage": 40,
            "delay_percentage": 30,
            "pending_percentage": 30,
            "avg_delay_days": 12,
            "max_delay_days": 45
        }
    }
    """
    try:
        import time
        start_total = time.perf_counter()
        data = get_dashboard_data(db, project_id, module_filter=module)
        print(f"dashboard total: {(time.perf_counter() - start_total) * 1000:.2f}ms")
        return data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}",
        )
