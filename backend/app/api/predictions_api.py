"""
Predictions API
================
Risk scoring, milestone delay prediction, and quality forecasting.

Prefix: /api/predictions
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.risk_prediction_service import compute_project_health_score
from app.services.schedule_prediction_service import predict_milestone_delay
from app.services.quality_service import get_quality_kpis

router = APIRouter(prefix="/predictions", tags=["Predictions & AI"])


@router.get("/project/{project_id}/risk-score")
def get_project_risk_score(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns composite AI-driven risk score for a project.

    Response:
    {
        "project_health": 75,
        "milestone_delay_probability": 0.35,
        "budget_overrun_probability": 0.22,
        "quality_risk_score": 45,
        "supply_chain_risk": 60,
        "contributing_factors": [...],
        "risk_level": "medium",
        "model_version": "rule_based_v1",
        "last_updated": "2026-06-18T..."
    }
    """
    try:
        return compute_project_health_score(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk score computation failed: {e}")


@router.get("/milestone/{milestone_id}/delay")
def predict_delay(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Predict how many days late a milestone will be.

    Response:
    {
        "milestone_id": 123,
        "predicted_days_late": 5,
        "confidence_interval": {"lower": 2, "upper": 9},
        "confidence_pct": 78,
        "contributing_factors": [...],
        "recommended_actions": [...]
    }
    """
    try:
        result = predict_milestone_delay(db, milestone_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delay prediction failed: {e}")


@router.get("/project/{project_id}/quality-forecast")
def forecast_quality(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Quality metrics forecast for a project.
    Phase 1: Returns current KPIs + trend analysis.
    Phase 2+: ARIMA/Prophet time-series forecast.
    """
    try:
        kpis = get_quality_kpis(db, project_id)
        # Enrich with simplified forecast fields
        return {
            "project_id": project_id,
            "current_metrics": kpis["metrics"],
            "overall_health": kpis["overall_health"],
            "forecast_note": "Time-series forecasting (ARIMA/Prophet) available in Phase 2",
            "predicted_fpy": next((m["value"] for m in kpis["metrics"] if m["type"] == "FPY"), None),
            "predicted_dppm": next((m["value"] for m in kpis["metrics"] if m["type"] == "DPPM"), None),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality forecast failed: {e}")
