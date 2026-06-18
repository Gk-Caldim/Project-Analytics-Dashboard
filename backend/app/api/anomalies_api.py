"""
Anomalies API
==============
Detect and retrieve budget, quality, and schedule anomalies.

Prefix: /api/anomalies
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.cost_anomaly_service import detect_budget_anomalies, get_stored_anomalies

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])


@router.get("/budget/{project_id}")
def get_budget_anomalies(
    project_id: int,
    refresh: bool = Query(False, description="Re-run detection and return fresh results"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Detect budget anomalies for a project.

    Response: [
        {
            "budget_line": "PCB Components",
            "actual_spend": 50000,
            "expected_spend": 42000,
            "variance_pct": 19.0,
            "anomaly_type": "spike",
            "severity": "high",
            "flagged_date": "2026-06-18T...",
            "suggested_action": "Review supplier pricing"
        }
    ]
    """
    try:
        if refresh:
            return detect_budget_anomalies(db, project_id)
        # Return stored anomalies by default
        stored = get_stored_anomalies(db, project_id)
        if not stored:
            # First time — run detection
            return detect_budget_anomalies(db, project_id)
        return [{
            "id": a.id,
            "budget_line": a.budget_line,
            "actual_spend": a.actual_spend,
            "expected_spend": a.expected_spend,
            "variance_pct": a.variance_pct,
            "anomaly_type": a.anomaly_type,
            "severity": a.severity,
            "flagged_date": a.flagged_date.isoformat() if a.flagged_date else None,
            "suggested_action": a.suggested_action,
        } for a in stored]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {e}")


@router.get("/quality/{project_id}")
def get_quality_anomalies(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get quality anomalies — failed KPIs and defect spikes.
    """
    try:
        from app.models.validation import QualityKPI
        from app.models.defect import Defect
        from sqlalchemy import func

        failed_kpis = db.query(QualityKPI).filter(
            QualityKPI.project_id == project_id,
            QualityKPI.status.in_(["failed", "at_risk"])
        ).order_by(QualityKPI.period_date.desc()).all()

        defect_count = db.query(func.sum(Defect.frequency)).filter(
            Defect.project_id == project_id
        ).scalar() or 0

        return {
            "project_id": project_id,
            "failed_kpis": [
                {
                    "metric_type": kpi.metric_type,
                    "value": kpi.value,
                    "target": kpi.target_value,
                    "status": kpi.status,
                    "line_id": kpi.line_id,
                }
                for kpi in failed_kpis
            ],
            "total_defects": defect_count,
            "anomaly_count": len(failed_kpis),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality anomaly check failed: {e}")


@router.get("/timeline/{project_id}")
def get_schedule_anomalies(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get schedule variance anomalies — delayed milestones, overdue tasks.
    """
    try:
        from app.models.project import Project
        from app.models.project_milestone import ProjectMilestone
        from datetime import datetime, timezone

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        now = datetime.now(timezone.utc)
        milestones = db.query(ProjectMilestone).filter(
            ProjectMilestone.project_id == project.project_id
        ).all()

        delayed = []
        for m in milestones:
            if m.status == "Delayed":
                delayed.append({
                    "milestone_id": m.id,
                    "activity_name": m.activity_name,
                    "status": m.status,
                    "planned_end": m.end_date.isoformat() if m.end_date else None,
                    "complete_pct": m.complete_percent,
                    "is_critical": m.is_critical,
                })

        return {
            "project_id": project_id,
            "delayed_milestones": delayed,
            "anomaly_count": len(delayed),
            "critical_delayed": sum(1 for m in delayed if m["is_critical"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schedule anomaly check failed: {e}")


@router.post("/budget/{project_id}/resolve/{anomaly_id}", status_code=200)
def resolve_anomaly(
    project_id: int,
    anomaly_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mark a cost anomaly as resolved."""
    from app.models.cost_analysis import CostAnomaly
    anomaly = db.query(CostAnomaly).filter(
        CostAnomaly.id == anomaly_id,
        CostAnomaly.project_id == project_id
    ).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    anomaly.resolved = 1
    db.commit()
    return {"message": "Anomaly marked as resolved"}
