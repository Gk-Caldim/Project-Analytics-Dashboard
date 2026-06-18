"""
Defect & Failure Pattern Models
================================
Tables:
  - defect           : Defect log with root cause per project/line
  - failure_pattern  : ML-detected or Pareto-identified failure clusters
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Index
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# defect
# ---------------------------------------------------------------------------

class Defect(Base):
    """Defect log with root cause analysis."""
    __tablename__ = "defect"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    line_id = Column(String(100), nullable=True, index=True)
    defect_type = Column(String(50), nullable=False)
    # 'dimensional' | 'functional' | 'cosmetic' | 'surface' | 'assembly'
    category = Column(String(100), nullable=True)
    severity = Column(Integer, nullable=False, default=1)  # 1-5
    root_cause = Column(String(500), nullable=True)
    corrective_action = Column(String(500), nullable=True)
    closure_date = Column(DateTime(timezone=True), nullable=True)
    frequency = Column(Integer, nullable=False, default=1)
    reported_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("ix_defect_project_type", "project_id", "defect_type"),
        Index("ix_defect_project_date", "project_id", "created_at"),
    )


# ---------------------------------------------------------------------------
# failure_pattern
# ---------------------------------------------------------------------------

class FailurePattern(Base):
    """Pareto/K-means identified failure clusters."""
    __tablename__ = "failure_pattern"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    pattern_id = Column(String(20), nullable=True)  # e.g. 'FP001'
    defect_types = Column(JSON, nullable=True, default=list)
    # ['dimensional', 'functional']
    frequency = Column(Integer, nullable=False, default=0)
    cumulative_pct = Column(Float, nullable=True)  # cumulative % for Pareto
    affected_lines = Column(JSON, nullable=True, default=list)
    prediction_confidence = Column(Float, nullable=True)  # 0-1
    root_cause_cluster = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_failure_pattern_project", "project_id"),
    )
