"""
Validation Models
=================
Tables:
  - validation_checklist : DV/PV/PPAP gate tracking per project
  - ppap_stage           : PPAP milestone tracking (Levels 1-4)
  - dv_result            : Design Verification test results
  - quality_kpi          : Quality metrics: FPY, DPPM, defect rate, etc.
"""

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# validation_checklist
# ---------------------------------------------------------------------------

class ValidationChecklist(Base):
    """DV/PV/PPAP validation gate tracking per project."""
    __tablename__ = "validation_checklist"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    stage_type = Column(String(10), nullable=False)  # 'DV' | 'PV' | 'PPAP'
    checklist_items = Column(JSON, nullable=True, default=list)
    # [{name, complete, dueDate, owner, notes}]
    completion_status = Column(Float, default=0.0)  # 0-100 %
    sign_off_date = Column(DateTime(timezone=True), nullable=True)
    signed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_validation_checklist_project_stage", "project_id", "stage_type"),
    )


# ---------------------------------------------------------------------------
# ppap_stage
# ---------------------------------------------------------------------------

class PPAPStage(Base):
    """PPAP milestone tracking (Levels 1-4)."""
    __tablename__ = "ppap_stage"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Integer, nullable=False)  # 1-4
    submission_date = Column(DateTime(timezone=True), nullable=True)
    approval_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="not_started")
    # 'not_started' | 'submitted' | 'approved' | 'rejected'
    rejection_reason = Column(String(500), nullable=True)
    submitted_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_ppap_stage_project_level", "project_id", "level"),
    )


# ---------------------------------------------------------------------------
# dv_result
# ---------------------------------------------------------------------------

class DVResult(Base):
    """Design Verification test results."""
    __tablename__ = "dv_result"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    test_name = Column(String(200), nullable=False)
    test_type = Column(String(50), nullable=True)  # 'DV' | 'PV'
    pass_fail = Column(Boolean, nullable=False, default=False)
    test_date = Column(DateTime(timezone=True), nullable=True)
    findings = Column(String(1000), nullable=True)
    corrective_action = Column(String(500), nullable=True)
    test_owner = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("ix_dv_result_project_date", "project_id", "test_date"),
    )


# ---------------------------------------------------------------------------
# quality_kpi
# ---------------------------------------------------------------------------

class QualityKPI(Base):
    """Quality metrics: FPY, DPPM, defect rate, rework rate, etc."""
    __tablename__ = "quality_kpi"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    line_id = Column(String(100), nullable=True, index=True)  # per-line or project-wide
    metric_type = Column(String(30), nullable=False)
    # 'FPY' | 'DPPM' | 'REJECT_RATE' | 'REWORK_RATE'
    value = Column(Float, nullable=False, default=0.0)
    target_value = Column(Float, nullable=True)
    period_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    status = Column(String(20), nullable=False, default="on_track")
    # 'on_track' | 'at_risk' | 'failed'
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("ix_quality_kpi_project_type_date", "project_id", "metric_type", "period_date"),
    )
