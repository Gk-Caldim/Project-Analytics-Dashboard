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
        data = get_dashboard_data(db, project_id, module_filter=module)

        # Return 404 if project has no tracker data at all (total == 0)
        # but the project itself might exist – let the caller decide how to render.
        # We return 200 with an empty structure so dashboards render a "no data" state.
        return data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}",
        )
