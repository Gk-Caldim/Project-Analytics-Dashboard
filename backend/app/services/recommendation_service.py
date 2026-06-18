"""
Recommendation Service (v1 — Rule-based)
=========================================
Generates actionable recommendations based on project risk signals.
Phase 2+: Replace/extend with ML-triggered recommendations.

Rule triggers:
  - Budget variance > 15% → "Review cost drivers"
  - Quality KPI failed    → "Initiate root cause analysis"
  - Delay probability >60%→ "Fast-track critical path"
  - Critical open issue   → "Escalate issue"
  - PPAP not submitted    → "Submit PPAP milestone"
"""

import logging
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.predictions import RiskScore
from app.models.validation import QualityKPI, PPAPStage
from app.models.cost_analysis import CostAnomaly
from app.models.customer_feedback import CustomerComplaint
from app.core.ml_config import THRESHOLDS

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)

_REC_ID = lambda: f"rec_{uuid.uuid4().hex[:8]}"


def get_recommendations(db: Session, project_id: int) -> List[Dict[str, Any]]:
    """
    Generate ranked recommendations for a project.
    Returns sorted list by urgency: critical > high > medium > low.
    """
    recs = []

    # 1. Risk score triggers
    risk = db.query(RiskScore).filter(
        RiskScore.project_id == project_id
    ).order_by(RiskScore.computed_at.desc()).first()

    if risk:
        if risk.milestones_delay_probability >= THRESHOLDS["delay_high_probability"]:
            recs.append({
                "id": _REC_ID(),
                "type": "risk_alert",
                "title": "High Schedule Delay Risk",
                "description": f"Milestone delay probability is {round(risk.milestones_delay_probability * 100)}%. Critical path needs attention.",
                "action": "Fast-track critical path activities and reallocate resources",
                "urgency": "high" if risk.milestones_delay_probability < 0.8 else "critical",
                "impact": "high",
                "suggested_by": "risk_engine",
                "data": {"delay_probability": risk.milestones_delay_probability},
            })

        if risk.budget_overrun_probability >= 0.5:
            recs.append({
                "id": _REC_ID(),
                "type": "budget_alert",
                "title": "Budget Overrun Risk Detected",
                "description": f"Budget overrun probability is {round(risk.budget_overrun_probability * 100)}%. Review spending.",
                "action": "Schedule budget review meeting and identify cost reduction opportunities",
                "urgency": "high",
                "impact": "high",
                "suggested_by": "risk_engine",
                "data": {"overrun_probability": risk.budget_overrun_probability},
            })

        if risk.overall_health_score < 40:
            recs.append({
                "id": _REC_ID(),
                "type": "health_alert",
                "title": "Project Health Critical",
                "description": f"Overall health score is {round(risk.overall_health_score)}/100. Immediate action required.",
                "action": "Convene project steering committee to review all risk factors",
                "urgency": "critical",
                "impact": "high",
                "suggested_by": "risk_engine",
                "data": {"health_score": risk.overall_health_score},
            })

    # 2. Cost anomaly triggers
    anomalies = db.query(CostAnomaly).filter(
        CostAnomaly.project_id == project_id,
        CostAnomaly.resolved == 0
    ).order_by(CostAnomaly.flagged_date.desc()).limit(3).all()

    for anomaly in anomalies:
        if abs(anomaly.variance_pct) >= THRESHOLDS["budget_anomaly_variance_pct"]:
            recs.append({
                "id": _REC_ID(),
                "type": "cost_optimization",
                "title": f"Cost Anomaly: {anomaly.budget_line}",
                "description": f"{anomaly.anomaly_type.title()} detected — {anomaly.variance_pct:+.1f}% vs expected spend.",
                "action": anomaly.suggested_action or "Review and approve budget variance",
                "urgency": anomaly.severity if anomaly.severity in ("critical", "high") else "medium",
                "impact": "medium",
                "suggested_by": "cost_anomaly_engine",
                "data": {
                    "budget_line": anomaly.budget_line,
                    "variance_pct": anomaly.variance_pct,
                    "anomaly_type": anomaly.anomaly_type,
                },
            })

    # 3. Quality KPI failures
    failed_kpis = db.query(QualityKPI).filter(
        QualityKPI.project_id == project_id,
        QualityKPI.status == "failed"
    ).limit(3).all()

    for kpi in failed_kpis:
        recs.append({
            "id": _REC_ID(),
            "type": "quality_alert",
            "title": f"Quality KPI Failed: {kpi.metric_type}",
            "description": f"{kpi.metric_type} is {kpi.value} vs target {kpi.target_value}.",
            "action": "Initiate root cause analysis and corrective action plan",
            "urgency": "high",
            "impact": "high",
            "suggested_by": "quality_engine",
            "data": {"metric_type": kpi.metric_type, "value": kpi.value, "target": kpi.target_value},
        })

    # 4. Critical customer complaints
    critical_complaints = db.query(CustomerComplaint).filter(
        CustomerComplaint.project_id == project_id,
        CustomerComplaint.urgency_level == "critical",
        CustomerComplaint.eight_d_status != "closed"
    ).count()

    if critical_complaints > 0:
        recs.append({
            "id": _REC_ID(),
            "type": "customer_alert",
            "title": f"{critical_complaints} Critical Customer Complaint(s) Unresolved",
            "description": "Critical unresolved customer complaints require immediate 8D action.",
            "action": "Assign 8D team and initiate root cause analysis within 24 hours",
            "urgency": "critical",
            "impact": "high",
            "suggested_by": "customer_engine",
            "data": {"critical_count": critical_complaints},
        })

    # 5. PPAP not submitted
    ppap_pending = db.query(PPAPStage).filter(
        PPAPStage.project_id == project_id,
        PPAPStage.status == "not_started"
    ).count()

    if ppap_pending > 0:
        recs.append({
            "id": _REC_ID(),
            "type": "process_alert",
            "title": f"PPAP Submission Required ({ppap_pending} levels pending)",
            "description": "PPAP milestone(s) have not been submitted. This may delay customer approval.",
            "action": "Submit PPAP documentation for pending levels",
            "urgency": "medium",
            "impact": "medium",
            "suggested_by": "validation_engine",
            "data": {"pending_levels": ppap_pending},
        })

    # Sort: critical → high → medium → low
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recs.sort(key=lambda r: urgency_order.get(r["urgency"], 4))

    max_recs = THRESHOLDS.get("recommendation_max", 10)
    return recs[:max_recs]


def get_all_anomalies(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent anomalies across all projects."""
    anomalies = db.query(CostAnomaly).filter(
        CostAnomaly.resolved == 0
    ).order_by(CostAnomaly.flagged_date.desc()).limit(limit).all()

    return [{
        "id": a.id,
        "project_id": a.project_id,
        "budget_line": a.budget_line,
        "variance_pct": a.variance_pct,
        "anomaly_type": a.anomaly_type,
        "severity": a.severity,
        "flagged_date": a.flagged_date.isoformat() if a.flagged_date else None,
    } for a in anomalies]
