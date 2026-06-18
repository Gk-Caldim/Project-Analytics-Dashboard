"""
Customer Feedback Service
=========================
Complaint logging, sentiment initialization (placeholder), trend aggregation, 8D status.
Note: Full ML sentiment computation is deferred to Phase 3.
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta

from app.models.customer_feedback import CustomerComplaint, SentimentAnalysis

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


# ── Complaint CRUD ─────────────────────────────────────────────────────────

def log_complaint(db: Session, project_id: int, complaint_text: str,
                  customer_name: str = None, urgency_level: str = "medium",
                  eight_d_status: str = "open", created_by: str = None) -> CustomerComplaint:
    """Log a new complaint and initialize rule-based sentiment."""
    complaint = CustomerComplaint(
        project_id=project_id,
        customer_name=customer_name,
        complaint_text=complaint_text,
        urgency_level=urgency_level,
        eight_d_status=eight_d_status,
        created_by=created_by,
        sentiment_score=_rule_based_sentiment(complaint_text),
    )
    db.add(complaint)
    db.flush()

    # Initialize sentiment record
    sentiment_record = SentimentAnalysis(
        complaint_id=complaint.id,
        emotion_label=_rule_based_emotion(complaint.sentiment_score),
        model_version="rule_based_v1",
        negative_keywords=_extract_negative_keywords(complaint_text),
        positive_keywords=_extract_positive_keywords(complaint_text),
        ml_confidence_score=0.6,
    )
    db.add(sentiment_record)
    db.commit()
    db.refresh(complaint)
    return complaint


def get_complaints(db: Session, project_id: int, limit: int = 50) -> List[CustomerComplaint]:
    return db.query(CustomerComplaint).filter(
        CustomerComplaint.project_id == project_id
    ).order_by(CustomerComplaint.created_at.desc()).limit(limit).all()


def update_complaint(db: Session, complaint_id: int, **kwargs) -> Optional[CustomerComplaint]:
    complaint = db.query(CustomerComplaint).filter(
        CustomerComplaint.id == complaint_id
    ).first()
    if not complaint:
        return None
    for key, value in kwargs.items():
        if value is not None and hasattr(complaint, key):
            setattr(complaint, key, value)
    complaint.updated_at = _utcnow()
    db.commit()
    db.refresh(complaint)
    return complaint


# ── Sentiment Trend ─────────────────────────────────────────────────────────

def get_sentiment_trend(db: Session, project_id: int, days: int = 30) -> Dict[str, Any]:
    """Return daily average sentiment score over the last N days."""
    since = _utcnow() - timedelta(days=days)
    rows = db.query(
        func.date(CustomerComplaint.created_at).label("day"),
        func.avg(CustomerComplaint.sentiment_score).label("avg_score"),
        func.count(CustomerComplaint.id).label("count"),
    ).filter(
        CustomerComplaint.project_id == project_id,
        CustomerComplaint.created_at >= since,
        CustomerComplaint.sentiment_score.isnot(None),
    ).group_by(func.date(CustomerComplaint.created_at)).order_by("day").all()

    data = [
        {"date": str(r.day), "sentiment_score": round(r.avg_score, 3), "count": r.count}
        for r in rows
    ]

    avg_sentiment = round(sum(d["sentiment_score"] for d in data) / len(data), 3) if data else 0.0

    if len(data) >= 2:
        trend = "improving" if data[-1]["sentiment_score"] > data[0]["sentiment_score"] else "declining"
    else:
        trend = "stable"

    return {
        "project_id": project_id,
        "days": days,
        "data": data,
        "avg_sentiment": avg_sentiment,
        "trend_direction": trend,
    }


# ── 8D Status ──────────────────────────────────────────────────────────────

def get_8d_status(db: Session, project_id: int) -> Dict[str, Any]:
    """Return 8D closure metrics."""
    complaints = db.query(CustomerComplaint).filter(
        CustomerComplaint.project_id == project_id
    ).all()

    if not complaints:
        return {
            "project_id": project_id,
            "total_complaints": 0,
            "closure_rate": 0.0,
            "avg_resolution_days": 0.0,
            "escalation_rate": 0.0,
            "open_count": 0,
            "in_progress_count": 0,
            "closed_count": 0,
            "critical_open": 0,
        }

    total = len(complaints)
    closed = [c for c in complaints if c.eight_d_status == "closed"]
    in_progress = [c for c in complaints if c.eight_d_status == "in_progress"]
    open_complaints = [c for c in complaints if c.eight_d_status == "open"]
    critical_open = [c for c in open_complaints if c.urgency_level == "critical"]

    resolution_days = []
    for c in closed:
        if c.resolution_date and c.created_at:
            days = (c.resolution_date - c.created_at).days
            if days >= 0:
                resolution_days.append(days)

    avg_resolution = round(sum(resolution_days) / len(resolution_days), 1) if resolution_days else 0.0
    closure_rate = round((len(closed) / total) * 100, 1)
    escalation_rate = round((len([c for c in complaints if c.urgency_level in ("critical", "high")]) / total) * 100, 1)

    return {
        "project_id": project_id,
        "total_complaints": total,
        "closure_rate": closure_rate,
        "avg_resolution_days": avg_resolution,
        "escalation_rate": escalation_rate,
        "open_count": len(open_complaints),
        "in_progress_count": len(in_progress),
        "closed_count": len(closed),
        "critical_open": len(critical_open),
    }


# ── Rule-based Sentiment Helpers ───────────────────────────────────────────

_NEGATIVE_WORDS = [
    "problem", "delay", "issue", "fail", "broken", "wrong", "bad", "defect",
    "reject", "poor", "unacceptable", "error", "late", "missing", "damaged",
    "complaint", "unsatisfied", "terrible", "worst", "angry", "frustrated"
]
_POSITIVE_WORDS = [
    "good", "excellent", "satisfied", "happy", "great", "perfect", "fast",
    "resolved", "thank", "appreciate", "quality", "timely", "professional"
]


def _rule_based_sentiment(text: str) -> float:
    """Simple word-count based sentiment: -1.0 to 1.0."""
    text_lower = text.lower()
    neg = sum(1 for w in _NEGATIVE_WORDS if w in text_lower)
    pos = sum(1 for w in _POSITIVE_WORDS if w in text_lower)
    total = neg + pos
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 3)


def _rule_based_emotion(score: float) -> str:
    if score < -0.5:
        return "angry"
    if score < -0.1:
        return "frustrated"
    if score > 0.3:
        return "satisfied"
    return "neutral"


def _extract_negative_keywords(text: str) -> List[str]:
    return [w for w in _NEGATIVE_WORDS if w in text.lower()]


def _extract_positive_keywords(text: str) -> List[str]:
    return [w for w in _POSITIVE_WORDS if w in text.lower()]
