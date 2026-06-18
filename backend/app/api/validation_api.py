"""
Validation API
==============
CRUD for DV/PV/PPAP validation checklists, PPAP stage management, and DV results.

Prefix: /api/quality
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.validation import (
    ValidationChecklistCreate, ValidationChecklistUpdate, ValidationChecklistResponse,
    PPAPStageSubmit, PPAPStageUpdate, PPAPStageResponse, PPAPProgressResponse,
    DVResultCreate, DVResultResponse,
)
from app.services import validation_service

router = APIRouter(prefix="/quality", tags=["Validation"])


# ── Validation Checklist ───────────────────────────────────────────────────

@router.get("/validation-checklist/{project_id}", response_model=List[ValidationChecklistResponse])
def list_checklists(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all DV/PV/PPAP checklists for a project."""
    return validation_service.get_checklists(db, project_id)


@router.post("/validation-checklist/{project_id}", response_model=ValidationChecklistResponse, status_code=201)
def create_checklist(
    project_id: int,
    body: ValidationChecklistCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new validation checklist for a project."""
    items = [item.model_dump() for item in (body.checklist_items or [])]
    return validation_service.create_checklist(
        db, project_id, body.stage_type, items, body.signed_by
    )


@router.put("/validation-checklist/{checklist_id}", response_model=ValidationChecklistResponse)
def update_checklist(
    checklist_id: int,
    body: ValidationChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update checklist items, completion, or sign-off."""
    items = [item.model_dump() for item in body.checklist_items] if body.checklist_items else None
    updated = validation_service.update_checklist(
        db, checklist_id,
        checklist_items=items,
        signed_by=body.signed_by,
        sign_off_date=body.sign_off_date,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return updated


@router.delete("/validation-checklist/{checklist_id}", status_code=204)
def delete_checklist(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a validation checklist."""
    success = validation_service.delete_checklist(db, checklist_id)
    if not success:
        raise HTTPException(status_code=404, detail="Checklist not found")


# ── PPAP Progress ──────────────────────────────────────────────────────────

@router.get("/ppap/{project_id}", response_model=PPAPProgressResponse)
def get_ppap_progress(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get PPAP level progress for a project (auto-creates 4 levels if missing)."""
    stages = validation_service.get_ppap_stages(db, project_id)
    statuses = [s.status for s in stages]
    if all(s == "approved" for s in statuses):
        overall = "completed"
    elif any(s != "not_started" for s in statuses):
        overall = "in_progress"
    else:
        overall = "not_started"
    return {"project_id": project_id, "levels": stages, "overall_status": overall}


@router.post("/ppap/{project_id}/level/{level}/submit", response_model=PPAPStageResponse)
def submit_ppap(
    project_id: int,
    level: int,
    body: PPAPStageSubmit,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Submit a PPAP level for approval."""
    if level < 1 or level > 4:
        raise HTTPException(status_code=400, detail="Level must be 1-4")
    return validation_service.submit_ppap_level(db, project_id, level, body.submitted_by)


@router.put("/ppap/{project_id}/level/{level}/review", response_model=PPAPStageResponse)
def review_ppap(
    project_id: int,
    level: int,
    body: PPAPStageUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Approve or reject a PPAP level submission."""
    allowed_statuses = {"approved", "rejected"}
    if body.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"status must be one of {allowed_statuses}")
    updated = validation_service.update_ppap_level(
        db, project_id, level, body.status, body.approved_by, body.rejection_reason
    )
    if not updated:
        raise HTTPException(status_code=404, detail="PPAP stage not found")
    return updated


# ── DV Results ─────────────────────────────────────────────────────────────

@router.get("/dv-results/{project_id}", response_model=List[DVResultResponse])
def list_dv_results(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all DV/PV test results for a project."""
    return validation_service.get_dv_results(db, project_id)


@router.post("/dv-results/{project_id}", response_model=DVResultResponse, status_code=201)
def create_dv_result(
    project_id: int,
    body: DVResultCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Log a new DV/PV test result."""
    return validation_service.create_dv_result(db, project_id, **body.model_dump(exclude_unset=True))
