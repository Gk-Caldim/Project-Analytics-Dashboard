import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.predictions import Risk

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def get_risks(db: Session, project_id: int) -> List[Risk]:
    """Retrieve all risks for a project ordered by risk score descending."""
    return db.query(Risk).filter(
        Risk.project_id == project_id
    ).order_by(Risk.score.desc(), Risk.created_at.desc()).all()


def get_risk(db: Session, risk_id: int) -> Optional[Risk]:
    """Retrieve a single risk item by ID."""
    return db.query(Risk).filter(Risk.id == risk_id).first()


def create_risk(db: Session, project_id: int, title: str,
                description: Optional[str] = None, probability: int = 3,
                impact: int = 3, mitigation_action: Optional[str] = None,
                status: str = "open", owner: str = "Unassigned") -> Risk:
    """Create a new risk item and compute its initial score."""
    risk = Risk(
        project_id=project_id,
        title=title,
        description=description,
        probability=probability,
        impact=impact,
        score=probability * impact,
        mitigation_action=mitigation_action,
        status=status,
        owner=owner,
        created_at=_utcnow(),
        updated_at=_utcnow()
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


def update_risk(db: Session, risk_id: int, **kwargs) -> Optional[Risk]:
    """Update a risk item, recalculating score if probability or impact changes."""
    risk = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk:
        return None

    # Apply updates
    for key, value in kwargs.items():
        if value is not None and hasattr(risk, key):
            setattr(risk, key, value)

    # Recalculate score
    risk.score = risk.probability * risk.impact
    risk.updated_at = _utcnow()
    
    db.commit()
    db.refresh(risk)
    return risk


def delete_risk(db: Session, risk_id: int) -> bool:
    """Delete a risk item from the database."""
    risk = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk:
        return False
    
    db.delete(risk)
    db.commit()
    return True
