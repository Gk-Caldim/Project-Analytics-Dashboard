"""
Validation Service
==================
Business logic for DV/PV/PPAP validation checklist management.
"""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models.validation import ValidationChecklist, PPAPStage, DVResult

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


# ── Validation Checklist ───────────────────────────────────────────────────

def get_checklists(db: Session, project_id: int) -> List[ValidationChecklist]:
    return db.query(ValidationChecklist).filter(
        ValidationChecklist.project_id == project_id
    ).order_by(ValidationChecklist.stage_type).all()


def get_checklist(db: Session, checklist_id: int) -> Optional[ValidationChecklist]:
    return db.query(ValidationChecklist).filter(
        ValidationChecklist.id == checklist_id
    ).first()


def create_checklist(db: Session, project_id: int, stage_type: str,
                     checklist_items: list = None, signed_by: str = None) -> ValidationChecklist:
    items = checklist_items or []
    completion = _calc_completion(items)
    record = ValidationChecklist(
        project_id=project_id,
        stage_type=stage_type.upper(),
        checklist_items=items,
        completion_status=completion,
        signed_by=signed_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_checklist(db: Session, checklist_id: int, **kwargs) -> Optional[ValidationChecklist]:
    record = get_checklist(db, checklist_id)
    if not record:
        return None
    if "checklist_items" in kwargs and kwargs["checklist_items"] is not None:
        record.checklist_items = kwargs["checklist_items"]
        record.completion_status = _calc_completion(kwargs["checklist_items"])
    if "signed_by" in kwargs and kwargs["signed_by"] is not None:
        record.signed_by = kwargs["signed_by"]
    if "sign_off_date" in kwargs and kwargs["sign_off_date"] is not None:
        record.sign_off_date = kwargs["sign_off_date"]
    record.updated_at = _utcnow()
    db.commit()
    db.refresh(record)
    return record


def delete_checklist(db: Session, checklist_id: int) -> bool:
    record = get_checklist(db, checklist_id)
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


def _calc_completion(items: list) -> float:
    """Calculate completion % from checklist items."""
    if not items:
        return 0.0
    completed = sum(1 for item in items if item.get("complete", False))
    return round((completed / len(items)) * 100, 1)


# ── PPAP Stage ─────────────────────────────────────────────────────────────

def get_ppap_stages(db: Session, project_id: int) -> List[PPAPStage]:
    stages = db.query(PPAPStage).filter(
        PPAPStage.project_id == project_id
    ).order_by(PPAPStage.level).all()
    # Ensure all 4 levels exist
    existing_levels = {s.level for s in stages}
    for level in range(1, 5):
        if level not in existing_levels:
            stage = PPAPStage(project_id=project_id, level=level, status="not_started")
            db.add(stage)
    db.commit()
    return db.query(PPAPStage).filter(
        PPAPStage.project_id == project_id
    ).order_by(PPAPStage.level).all()


def submit_ppap_level(db: Session, project_id: int, level: int, submitted_by: str = None) -> PPAPStage:
    stage = db.query(PPAPStage).filter(
        PPAPStage.project_id == project_id,
        PPAPStage.level == level
    ).first()
    if not stage:
        stage = PPAPStage(project_id=project_id, level=level)
        db.add(stage)
    stage.status = "submitted"
    stage.submission_date = _utcnow()
    if submitted_by:
        stage.submitted_by = submitted_by
    db.commit()
    db.refresh(stage)
    return stage


def update_ppap_level(db: Session, project_id: int, level: int,
                      status: str, approved_by: str = None,
                      rejection_reason: str = None) -> Optional[PPAPStage]:
    stage = db.query(PPAPStage).filter(
        PPAPStage.project_id == project_id,
        PPAPStage.level == level
    ).first()
    if not stage:
        return None
    stage.status = status
    if status == "approved":
        stage.approval_date = _utcnow()
        stage.approved_by = approved_by
    elif status == "rejected":
        stage.rejection_reason = rejection_reason
    db.commit()
    db.refresh(stage)
    return stage


# ── DV Results ─────────────────────────────────────────────────────────────

def get_dv_results(db: Session, project_id: int) -> List[DVResult]:
    return db.query(DVResult).filter(
        DVResult.project_id == project_id
    ).order_by(DVResult.test_date.desc()).all()


def create_dv_result(db: Session, project_id: int, **kwargs) -> DVResult:
    result = DVResult(project_id=project_id, **kwargs)
    db.add(result)
    db.commit()
    db.refresh(result)
    return result
