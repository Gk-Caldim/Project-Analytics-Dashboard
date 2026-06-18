"""
Customer Feedback Models
========================
Tables:
  - customer_complaint  : Customer escalation + complaint tracking
  - sentiment_analysis  : NLP sentiment scores (batch computed)
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# customer_complaint
# ---------------------------------------------------------------------------

class CustomerComplaint(Base):
    """Customer escalation + complaint tracking."""
    __tablename__ = "customer_complaint"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(200), nullable=True)
    complaint_text = Column(String(2000), nullable=False)
    sentiment_score = Column(Float, nullable=True)   # -1.0 to 1.0 (computed via ML)
    urgency_level = Column(String(20), nullable=False, default="medium")
    # 'critical' | 'high' | 'medium' | 'low'
    eight_d_status = Column(String(50), nullable=True, default="open")
    # '8D closure status': 'open' | 'in_progress' | 'closed'
    resolution_date = Column(DateTime(timezone=True), nullable=True)
    eight_d_report = Column(JSON, nullable=True, default=dict)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationship to sentiment analysis
    sentiment = relationship(
        "SentimentAnalysis",
        back_populates="complaint",
        uselist=False,
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_customer_complaint_project_urgency", "project_id", "urgency_level"),
        Index("ix_customer_complaint_project_date", "project_id", "created_at"),
    )


# ---------------------------------------------------------------------------
# sentiment_analysis
# ---------------------------------------------------------------------------

class SentimentAnalysis(Base):
    """NLP sentiment scores (batch computed via ML pipeline)."""
    __tablename__ = "sentiment_analysis"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("customer_complaint.id", ondelete="CASCADE"), nullable=False, unique=True)
    positive_keywords = Column(JSON, nullable=True, default=list)
    negative_keywords = Column(JSON, nullable=True, default=list)
    emotion_label = Column(String(30), nullable=True)
    # 'angry' | 'frustrated' | 'neutral' | 'satisfied'
    ml_confidence_score = Column(Float, nullable=True)  # 0-1
    model_version = Column(String(30), nullable=True, default="rule_based_v1")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    complaint = relationship("CustomerComplaint", back_populates="sentiment")
