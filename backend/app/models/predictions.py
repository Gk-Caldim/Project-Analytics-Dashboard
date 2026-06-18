"""
Predictions Models
==================
Tables:
  - risk_score       : AI-driven project risk score (0-100)
  - delay_prediction : Schedule risk model output per milestone
  - defect_prediction: Quality risk forecasting per project
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Index
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# risk_score
# ---------------------------------------------------------------------------

class RiskScore(Base):
    """AI-driven project health + risk score (0-100)."""
    __tablename__ = "risk_score"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    milestones_delay_probability = Column(Float, nullable=False, default=0.0)  # 0-1
    budget_overrun_probability = Column(Float, nullable=False, default=0.0)     # 0-1
    quality_risk_score = Column(Float, nullable=False, default=0.0)             # 0-100
    supply_chain_risk = Column(Float, nullable=False, default=0.0)              # 0-100
    overall_health_score = Column(Float, nullable=False, default=50.0)          # 0-100
    risk_level = Column(String(20), nullable=False, default="medium")
    # 'low' | 'medium' | 'high' | 'critical'
    computed_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    model_version = Column(String(30), nullable=False, default="rule_based_v1")
    contributing_factors = Column(JSON, nullable=True, default=list)
    # [{factor, impact, description}]

    __table_args__ = (
        Index("ix_risk_score_project_computed", "project_id", "computed_at"),
    )


# ---------------------------------------------------------------------------
# delay_prediction
# ---------------------------------------------------------------------------

class DelayPrediction(Base):
    """Schedule risk ML model output per milestone."""
    __tablename__ = "delay_prediction"

    id = Column(Integer, primary_key=True, index=True)
    milestone_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_days_late = Column(Integer, nullable=False, default=0)
    confidence_interval = Column(JSON, nullable=True)  # {lower, upper}
    confidence_pct = Column(Float, nullable=True)      # 0-100
    contributing_factors = Column(JSON, nullable=True, default=list)
    recommended_actions = Column(JSON, nullable=True, default=list)
    prediction_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    model_used = Column(String(30), nullable=False, default="rule_based_v1")

    __table_args__ = (
        Index("ix_delay_prediction_milestone", "milestone_id"),
    )


# ---------------------------------------------------------------------------
# defect_prediction
# ---------------------------------------------------------------------------

class DefectPrediction(Base):
    """Quality risk forecasting per project."""
    __tablename__ = "defect_prediction"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_defect_rate = Column(Float, nullable=False, default=0.0)  # %
    predicted_dppm = Column(Float, nullable=False, default=0.0)
    predicted_fpy = Column(Float, nullable=False, default=100.0)  # %
    line_risk_levels = Column(JSON, nullable=True, default=dict)
    # {line_id: risk_score_0_to_1}
    contributing_risks = Column(JSON, nullable=True, default=list)
    prediction_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    model_used = Column(String(30), nullable=False, default="rule_based_v1")

    __table_args__ = (
        Index("ix_defect_prediction_project_date", "project_id", "prediction_date"),
    )


# ---------------------------------------------------------------------------
# risk_register
# ---------------------------------------------------------------------------

class Risk(Base):
    """Individual project risk item in the risk register."""
    __tablename__ = "risk_register"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    probability = Column(Integer, nullable=False, default=3)  # 1-5 scale
    impact = Column(Integer, nullable=False, default=3)       # 1-5 scale
    score = Column(Integer, nullable=False, default=9)        # probability * impact
    mitigation_action = Column(String(1000), nullable=True)
    status = Column(String(20), nullable=False, default="open") # 'open' | 'mitigated' | 'closed'
    owner = Column(String(100), nullable=False, default="Unassigned")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_risk_register_project_score", "project_id", "score"),
    )

