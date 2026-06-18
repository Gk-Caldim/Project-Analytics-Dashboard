"""
Failure Pattern Service
========================
Pareto analysis + K-means-style clustering on defect records.
Phase 1: Rule-based Pareto (80/20).
Phase 2+: K-means clustering using scikit-learn.
"""

import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.models.defect import Defect, FailurePattern

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def discover_defect_patterns(db: Session, project_id: int) -> Dict[str, Any]:
    """
    Discover top failure patterns using Pareto analysis.
    Returns categorized patterns with cumulative percentages.
    """
    # Aggregate defect frequency by type
    rows = db.query(
        Defect.defect_type,
        Defect.category,
        func.sum(Defect.frequency).label("total"),
    ).filter(
        Defect.project_id == project_id
    ).group_by(
        Defect.defect_type, Defect.category
    ).order_by(func.sum(Defect.frequency).desc()).all()

    if not rows:
        return {"project_id": project_id, "patterns": [], "top_failure_type": None}

    grand_total = sum(r.total for r in rows) or 1
    patterns = []
    cumulative = 0.0
    pattern_num = 1

    for row in rows:
        pct = round((row.total / grand_total) * 100, 1)
        cumulative += pct
        pattern_id = f"FP{pattern_num:03d}"

        # Persist / update FailurePattern record
        existing = db.query(FailurePattern).filter(
            FailurePattern.project_id == project_id,
            FailurePattern.pattern_id == pattern_id
        ).first()

        if existing:
            existing.frequency = row.total
            existing.cumulative_pct = round(cumulative, 1)
            existing.defect_types = [row.defect_type]
            existing.root_cause_cluster = row.category or row.defect_type
            existing.updated_at = _utcnow()
        else:
            fp = FailurePattern(
                project_id=project_id,
                pattern_id=pattern_id,
                defect_types=[row.defect_type],
                frequency=row.total,
                cumulative_pct=round(cumulative, 1),
                root_cause_cluster=row.category or row.defect_type,
                prediction_confidence=0.65,
            )
            db.add(fp)

        patterns.append({
            "pattern_id": pattern_id,
            "category": row.defect_type,
            "sub_category": row.category,
            "count": row.total,
            "pct": pct,
            "cumulative_pct": round(cumulative, 1),
            "is_vital_few": cumulative <= 80.0,  # 80/20 rule
        })
        pattern_num += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"[FailurePattern] Failed to persist: {e}")

    # Vital few (top ~20% categories causing ~80% of defects)
    vital_few = [p for p in patterns if p["is_vital_few"]]

    return {
        "project_id": project_id,
        "patterns": patterns,
        "top_failure_type": patterns[0]["category"] if patterns else None,
        "vital_few": vital_few,
        "total_defects": grand_total,
    }


def get_stored_patterns(db: Session, project_id: int) -> List[FailurePattern]:
    """Get stored failure patterns from DB."""
    return db.query(FailurePattern).filter(
        FailurePattern.project_id == project_id
    ).order_by(FailurePattern.frequency.desc()).all()
