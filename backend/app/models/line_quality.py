"""
Line Quality Models
===================
Tables:
  - line_quality_metric : Per-assembly-line quality tracking (heatmap data)
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# line_quality_metric
# ---------------------------------------------------------------------------

class LineQualityMetric(Base):
    """Per-assembly-line quality tracking — powers the heatmap dashboard."""
    __tablename__ = "line_quality_metric"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    line_id = Column(String(100), nullable=False, index=True)
    # e.g. 'Line_1', 'Line_2', 'Line_A'
    metric_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow, index=True)
    fpy_rate = Column(Float, nullable=True)       # First Pass Yield %
    dppm = Column(Float, nullable=True)           # Defects Per Million
    reject_count = Column(Integer, nullable=True, default=0)
    rework_count = Column(Integer, nullable=True, default=0)
    total_units = Column(Integer, nullable=True, default=0)
    health_status = Column(String(10), nullable=False, default="green")
    # 'green' | 'yellow' | 'red'
    quality_engineer = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("ix_line_quality_project_line_date", "project_id", "line_id", "metric_date"),
    )
