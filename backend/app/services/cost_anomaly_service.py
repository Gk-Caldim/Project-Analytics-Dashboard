"""
Cost Anomaly Detection Service
================================
Statistical anomaly detection on budget revision data.
Phase 1: Rule-based variance thresholding.
Phase 2+: Isolation Forest + exponential smoothing.
"""

import logging
import statistics
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.cost_analysis import CostAnomaly
from app.models.budget import BudgetRevision, BudgetSummary
from app.core.ml_config import THRESHOLDS

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def detect_budget_anomalies(db: Session, project_id: int) -> List[Dict[str, Any]]:
    """
    Detect budget anomalies for a project.
    Returns list of flagged items with anomaly type, severity, and suggested actions.
    """
    # Get project by integer id to find the project_id string
    from app.models.project import Project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return []

    revisions = db.query(BudgetRevision).filter(
        BudgetRevision.project_id == project.project_id
    ).order_by(BudgetRevision.created_at.desc()).all()

    if not revisions:
        return []

    anomalies = []
    threshold_pct = THRESHOLDS["budget_anomaly_variance_pct"]

    for rev in revisions:
        if not rev.previous_budget or rev.previous_budget <= 0:
            continue

        variance_pct = ((rev.revised_budget - rev.previous_budget) / rev.previous_budget) * 100

        if abs(variance_pct) >= threshold_pct:
            anomaly_type = _classify_anomaly(variance_pct, revisions, rev)
            severity = _classify_severity(variance_pct)
            suggested_action = _suggest_action(anomaly_type, variance_pct, severity)

            # Check if already recorded recently
            existing = db.query(CostAnomaly).filter(
                CostAnomaly.project_id == project_id,
                CostAnomaly.budget_line == (rev.reasons or f"Revision #{rev.id}"),
                CostAnomaly.resolved == 0
            ).first()

            if not existing:
                anomaly = CostAnomaly(
                    project_id=project_id,
                    budget_line=rev.reasons or f"Budget Revision #{rev.id}",
                    actual_spend=rev.revised_budget,
                    expected_spend=rev.previous_budget,
                    variance_pct=round(variance_pct, 2),
                    anomaly_type=anomaly_type,
                    severity=severity,
                    suggested_action=suggested_action,
                    flagged_by="statistical",
                    flagged_date=_utcnow(),
                )
                db.add(anomaly)

            anomalies.append({
                "budget_line": rev.reasons or f"Budget Revision #{rev.id}",
                "actual_spend": rev.revised_budget,
                "expected_spend": rev.previous_budget,
                "variance_pct": round(variance_pct, 2),
                "anomaly_type": anomaly_type,
                "severity": severity,
                "flagged_date": (rev.created_at or _utcnow()).isoformat(),
                "suggested_action": suggested_action,
            })

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"[CostAnomaly] Failed to persist anomalies: {e}")

    return sorted(anomalies, key=lambda x: abs(x["variance_pct"]), reverse=True)


def get_stored_anomalies(db: Session, project_id: int, resolved: bool = False) -> List[CostAnomaly]:
    """Get stored cost anomalies for a project."""
    return db.query(CostAnomaly).filter(
        CostAnomaly.project_id == project_id,
        CostAnomaly.resolved == (1 if resolved else 0)
    ).order_by(CostAnomaly.flagged_date.desc()).all()


def _classify_anomaly(variance_pct: float, revisions: List, current) -> str:
    """Classify anomaly type based on pattern."""
    if abs(variance_pct) > 40:
        return "spike"
    # Check if multiple consecutive revisions are trending up (drift)
    recent = [r for r in revisions if r.id != current.id][:3]
    if len(recent) >= 2:
        consecutive_up = all(
            (r.revised_budget - r.previous_budget) > 0
            for r in recent if r.previous_budget
        )
        if consecutive_up and variance_pct > 0:
            return "drift"
    return "spike" if variance_pct > 0 else "underrun"


def _classify_severity(variance_pct: float) -> str:
    """Classify anomaly severity by variance magnitude."""
    abs_v = abs(variance_pct)
    if abs_v >= 50:
        return "critical"
    if abs_v >= 30:
        return "high"
    if abs_v >= 15:
        return "medium"
    return "low"


def _suggest_action(anomaly_type: str, variance_pct: float, severity: str) -> str:
    if anomaly_type == "spike":
        return "Review cost drivers and obtain approval for budget increase"
    if anomaly_type == "drift":
        return "Initiate budget review meeting — cumulative overrun detected"
    if anomaly_type == "underrun":
        return "Verify scope completeness — significant underspend detected"
    return "Flag for budget review"
