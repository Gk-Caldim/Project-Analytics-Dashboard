"""
Recommendations / AI Assistant API
=====================================
Actionable recommendations and anomaly aggregation for the AI Assistant Panel.

Prefix: /api/ai-assistant
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.recommendation_service import get_recommendations, get_all_anomalies

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


@router.get("/recommendations/{project_id}")
def get_project_recommendations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns ranked actionable recommendations for a project.

    Response: [
        {
            "id": "rec_abc123",
            "type": "risk_alert",
            "title": "High Schedule Delay Risk",
            "description": "...",
            "action": "Fast-track critical path",
            "urgency": "high",
            "impact": "high",
            "suggested_by": "risk_engine",
            "data": {...}
        }
    ]
    """
    try:
        return get_recommendations(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {e}")


@router.get("/anomalies-detected")
def get_detected_anomalies(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Real-time flagged issues across all projects.
    Useful for portfolio-level monitoring.
    """
    try:
        return get_all_anomalies(db, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anomalies: {e}")


@router.post("/chat")
async def chat_with_assistant(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Conversational AI for dashboard insights.
    Phase 1: Keyword-based responses.
    Phase 3+: LLM integration via llm_service.
    """
    question = request.get("message", "").lower()
    project_id = request.get("project_id")

    # Simple rule-based responses for Phase 1
    if "risk" in question or "health" in question:
        response = "Risk scores are computed daily using milestone delays, budget variance, quality KPIs, and supply chain data. Ask for a specific project to get details."
    elif "delay" in question or "schedule" in question:
        response = "Delay predictions use current milestone progress vs planned dates. Critical path milestones with low float are highest risk."
    elif "budget" in question or "cost" in question:
        response = "Budget anomalies are flagged when variance exceeds 15% vs expected spend. Check the Budget Anomalies panel for details."
    elif "quality" in question or "defect" in question:
        response = "Quality KPIs include FPY, DPPM, and Reject Rate. The heatmap shows per-line status. Pareto chart highlights top defect categories."
    elif "ppap" in question:
        response = "PPAP has 4 levels. Submit each level for approval. Rejected levels require resubmission with corrective actions."
    else:
        response = "I can help with project risk, schedule delays, budget anomalies, quality metrics, and PPAP status. What would you like to know?"

    return {
        "response": response,
        "confidence": 0.70,
        "data": {"project_id": project_id},
        "phase": "rule_based_v1 — LLM integration in Phase 3",
    }
