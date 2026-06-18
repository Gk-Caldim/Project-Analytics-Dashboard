"""
Schedule Delay Prediction Service
===================================
Rule-based Phase 1 implementation.
Phase 2: Replace with XGBoost model using historical milestone data.
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.project_milestone import ProjectMilestone
from app.models.predictions import DelayPrediction
from app.services.ml_pipeline import compute_schedule_variance, format_delay_result
from app.core.ml_config import CURRENT_MODEL_VERSIONS

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def predict_milestone_delay(db: Session, milestone_id: int) -> Dict[str, Any]:
    """
    Predict how many days late a milestone will be.
    Phase 1: Rule-based using progress vs schedule.
    """
    milestone = db.query(ProjectMilestone).filter(
        ProjectMilestone.id == milestone_id
    ).first()
    if not milestone:
        return {"error": f"Milestone {milestone_id} not found"}

    # Feature extraction
    progress = milestone.complete_percent or 0.0
    is_critical = milestone.is_critical or False
    float_days = milestone.total_float_days or 0.0
    status = milestone.status or "Not Started"

    # Schedule variance
    m_dict = {
        "end_date": milestone.end_date.isoformat() if milestone.end_date else None,
        "actual_end": milestone.actual_end.isoformat() if milestone.actual_end else None,
    }
    variance = compute_schedule_variance(m_dict)

    # Rule-based delay prediction
    days_late, confidence_pct, factors, actions = _rule_based_delay(
        progress, is_critical, float_days, status, variance
    )

    result = format_delay_result(
        milestone_id=milestone_id,
        days_late=days_late,
        confidence_pct=confidence_pct,
        factors=factors,
        actions=actions,
    )
    result["model_version"] = CURRENT_MODEL_VERSIONS["delay"]

    # Persist
    _save_delay_prediction(db, milestone_id, days_late, confidence_pct, factors, actions)

    return result


def _rule_based_delay(
    progress: float, is_critical: bool, float_days: float,
    status: str, schedule_variance: int
) -> tuple:
    """Returns (days_late, confidence_pct, factors, actions)."""
    factors = []
    days_late = max(0, schedule_variance)  # start with actual variance

    if status == "Delayed":
        days_late = max(days_late, 5)
        factors.append("milestone_already_delayed")

    if progress < 25 and float_days < 5:
        extra = int((1 - progress / 100) * 10)
        days_late += extra
        factors.append("low_progress_tight_schedule")

    if is_critical and float_days < 3:
        days_late += 3
        factors.append("critical_path_constraint")

    if days_late > 0 and float_days < days_late:
        factors.append("insufficient_float_days")

    if status == "Not Started" and schedule_variance > 0:
        days_late += schedule_variance
        factors.append("not_started_past_planned_date")

    # Confidence: lower when few signals
    confidence_pct = 70.0 if factors else 55.0
    if is_critical:
        confidence_pct += 8.0
    confidence_pct = min(confidence_pct, 92.0)

    actions = []
    if days_late > 0:
        if is_critical:
            actions.append({"action": "Fast-track critical path", "priority": "high"})
        if progress < 50:
            actions.append({"action": "Reallocate resources to accelerate task", "priority": "high"})
        if float_days < 5:
            actions.append({"action": "Review schedule buffer and dependencies", "priority": "medium"})
        actions.append({"action": "Daily stand-up on milestone progress", "priority": "medium"})

    return int(days_late), round(confidence_pct, 1), factors, actions


def _save_delay_prediction(db: Session, milestone_id: int, days_late: int,
                            confidence_pct: float, factors: List[str], actions: List[Dict]):
    record = DelayPrediction(
        milestone_id=milestone_id,
        predicted_days_late=days_late,
        confidence_interval={"lower": max(0, days_late - 3), "upper": days_late + 5},
        confidence_pct=confidence_pct,
        contributing_factors=factors,
        recommended_actions=actions,
        prediction_date=_utcnow(),
        model_used=CURRENT_MODEL_VERSIONS["delay"],
    )
    db.add(record)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"[DelayPrediction] Failed to save: {e}")
