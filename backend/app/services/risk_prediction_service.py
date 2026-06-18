"""
Risk Prediction Service
========================
Computes composite project health score (0-100) from four risk dimensions.
Phase 1: Rule-based weighted formula.
Phase 2+: Replace with XGBoost trained on historical data.

Formula:
    health_score = 100 - (0.30 * delay_risk + 0.25 * budget_risk +
                           0.25 * quality_risk + 0.20 * supply_risk)
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.project import Project
from app.models.project_milestone import ProjectMilestone
from app.models.budget import BudgetRevision
from app.models.predictions import RiskScore
from app.services.ml_pipeline import (
    compute_milestone_completion_rate,
    compute_budget_utilization_rate,
    compute_critical_path_slack,
    normalize_score,
    format_risk_result,
)
from app.core.ml_config import CURRENT_MODEL_VERSIONS, THRESHOLDS

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def compute_project_health_score(db: Session, project_id: int) -> Dict[str, Any]:
    """
    Main entry point — computes composite risk for a project.
    Returns the risk score dict and persists a RiskScore record.
    """
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": f"Project {project_id} not found"}

        milestones = db.query(ProjectMilestone).filter(
            ProjectMilestone.project_id == project.project_id
        ).all()
        milestone_dicts = [_milestone_to_dict(m) for m in milestones]

        revisions = db.query(BudgetRevision).filter(
            BudgetRevision.project_id == project.project_id
        ).order_by(BudgetRevision.created_at.desc()).limit(10).all()

        delay_risk = _compute_delay_risk(milestone_dicts)
        budget_risk = _compute_budget_risk(project, revisions)
        quality_risk = _compute_quality_risk(db, project_id)
        supply_risk = 30.0  # Phase 2: pull from supply chain data

        health_score = 100.0 - (
            0.30 * delay_risk +
            0.25 * budget_risk +
            0.25 * quality_risk +
            0.20 * supply_risk
        )
        health_score = normalize_score(health_score)

        factors = _rank_factors(delay_risk, budget_risk, quality_risk, supply_risk)
        version = CURRENT_MODEL_VERSIONS["risk"]

        result = format_risk_result(
            health_score=health_score,
            delay_prob=delay_risk / 100.0,
            budget_prob=budget_risk / 100.0,
            quality_risk=quality_risk,
            supply_risk=supply_risk,
            factors=factors,
            version=version,
        )

        # Persist to DB
        _save_risk_score(db, project_id, health_score, delay_risk / 100.0,
                         budget_risk / 100.0, quality_risk, supply_risk,
                         result["risk_level"], factors, version)

        return result

    except Exception as e:
        logger.error(f"[RiskPrediction] Error computing score for project {project_id}: {e}")
        raise


def _compute_delay_risk(milestones: List[Dict]) -> float:
    """0-100 delay risk based on milestone completion and critical path."""
    if not milestones:
        return 20.0

    total = len(milestones)
    delayed = sum(1 for m in milestones if m.get("status") == "Delayed")
    not_started_past_due = _count_overdue_not_started(milestones)
    completion_rate = compute_milestone_completion_rate(milestones)
    slack = compute_critical_path_slack(milestones)

    delay_pct = (delayed + not_started_past_due) / max(total, 1)
    risk = (delay_pct * 60.0) + ((1 - completion_rate) * 20.0) + max(0, (10 - slack) * 2)
    return normalize_score(risk)


def _count_overdue_not_started(milestones: List[Dict]) -> int:
    now = _utcnow()
    count = 0
    for m in milestones:
        if m.get("status") in ("Not Started", "Pending"):
            end_date = m.get("end_date")
            if end_date:
                try:
                    if isinstance(end_date, str):
                        end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    if end_date.replace(tzinfo=None) < now.replace(tzinfo=None):
                        count += 1
                except Exception:
                    pass
    return count


def _compute_budget_risk(project: Project, revisions: List) -> float:
    """0-100 budget risk from utilization and revision trends."""
    util_rate = compute_budget_utilization_rate(
        project.budget or 0.0,
        project.utilized_budget or 0.0
    )
    if util_rate > 1.1:
        return normalize_score(80 + (util_rate - 1.1) * 200)
    if util_rate > 0.9:
        return normalize_score(40 + (util_rate - 0.9) * 200)
    if util_rate > 0.75:
        return normalize_score(20 + (util_rate - 0.75) * 133)
    return normalize_score(util_rate * 20.0)


def _compute_quality_risk(db: Session, project_id: int) -> float:
    """0-100 quality risk from QualityKPI records."""
    try:
        from app.models.validation import QualityKPI
        kpis = db.query(QualityKPI).filter(
            QualityKPI.project_id == project_id,
            QualityKPI.status != "on_track"
        ).count()
        total_kpis = db.query(QualityKPI).filter(
            QualityKPI.project_id == project_id
        ).count()
        if total_kpis == 0:
            return 20.0
        fail_rate = kpis / total_kpis
        return normalize_score(fail_rate * 80.0 + 10.0)
    except Exception:
        return 20.0


def _rank_factors(delay: float, budget: float, quality: float, supply: float) -> List[Dict]:
    factors_raw = [
        {"factor": "schedule_variance", "label": "Schedule Delay Risk", "impact": delay},
        {"factor": "budget_overrun",    "label": "Budget Overrun Risk",  "impact": budget},
        {"factor": "quality_risk",      "label": "Quality Risk",         "impact": quality},
        {"factor": "supply_chain",      "label": "Supply Chain Risk",    "impact": supply},
    ]
    factors_raw.sort(key=lambda x: x["impact"], reverse=True)
    return [
        {
            "factor": f["factor"],
            "label": f["label"],
            "impact": round(f["impact"] / 100.0, 3),
            "severity": "high" if f["impact"] >= 60 else "medium" if f["impact"] >= 35 else "low"
        }
        for f in factors_raw
    ]


def _save_risk_score(db: Session, project_id: int, health: float,
                     delay_prob: float, budget_prob: float, quality_risk: float,
                     supply_risk: float, level: str, factors: List[Dict], version: str):
    record = RiskScore(
        project_id=project_id,
        overall_health_score=health,
        milestones_delay_probability=delay_prob,
        budget_overrun_probability=budget_prob,
        quality_risk_score=quality_risk,
        supply_chain_risk=supply_risk,
        risk_level=level,
        contributing_factors=factors,
        model_version=version,
        computed_at=_utcnow(),
    )
    db.add(record)
    db.commit()


def _milestone_to_dict(m: ProjectMilestone) -> Dict:
    return {
        "id": m.id,
        "status": m.status,
        "end_date": m.end_date.isoformat() if m.end_date else None,
        "actual_end": m.actual_end.isoformat() if m.actual_end else None,
        "complete_percent": m.complete_percent,
        "is_critical": m.is_critical,
        "total_float_days": m.total_float_days,
    }
