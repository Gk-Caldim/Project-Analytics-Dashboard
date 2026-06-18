"""
Cost Analysis Models
====================
Tables:
  - cost_anomaly          : Flagged anomalous spend patterns
  - should_cost_benchmark : Competitive cost targets / should-cost analysis
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Index
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# cost_anomaly
# ---------------------------------------------------------------------------

class CostAnomaly(Base):
    """Flagged anomalous spend patterns per project."""
    __tablename__ = "cost_anomaly"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    budget_line = Column(String(200), nullable=False)   # Budget line item name
    actual_spend = Column(Float, nullable=False, default=0.0)
    expected_spend = Column(Float, nullable=False, default=0.0)
    variance_pct = Column(Float, nullable=False, default=0.0)
    anomaly_type = Column(String(30), nullable=False, default="spike")
    # 'spike' | 'drift' | 'seasonal_mismatch' | 'underrun'
    severity = Column(String(20), nullable=False, default="medium")
    # 'low' | 'medium' | 'high' | 'critical'
    flagged_date = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    root_cause_analysis = Column(String(500), nullable=True)
    suggested_action = Column(String(300), nullable=True)
    flagged_by = Column(String(30), nullable=False, default="statistical")
    # 'statistical' | 'rule_based' | 'ml_detected'
    resolved = Column(Integer, nullable=False, default=0)  # 0=open, 1=resolved
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    __table_args__ = (
        Index("ix_cost_anomaly_project_date", "project_id", "flagged_date"),
        Index("ix_cost_anomaly_project_severity", "project_id", "severity"),
    )


# ---------------------------------------------------------------------------
# should_cost_benchmark
# ---------------------------------------------------------------------------

class ShouldCostBenchmark(Base):
    """Competitive cost targets — should-cost analysis."""
    __tablename__ = "should_cost_benchmark"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), nullable=False)
    # 'PCB' | 'Assembly' | 'Tooling' | 'Machining'
    target_cost = Column(Float, nullable=False, default=0.0)
    actual_cost = Column(Float, nullable=True)
    savings_opportunity = Column(Float, nullable=True)
    source_market = Column(String(100), nullable=True)
    market_price_index = Column(String(100), nullable=True)
    cost_driver_1 = Column(String(200), nullable=True)
    cost_driver_2 = Column(String(200), nullable=True)
    suggested_action = Column(String(300), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_should_cost_benchmark_category", "category"),
    )
