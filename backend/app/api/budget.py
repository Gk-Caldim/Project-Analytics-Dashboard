"""
budget.py — Full-stack Budget Master API
All routes prefixed with /budget (set in main.py).

IMPORTANT: Route order matters in FastAPI.
Static/literal paths must come BEFORE parameterized paths to avoid conflicts.
e.g. /revisions/ must be defined BEFORE /{project_name}

Routes:
  GET    /                              — list all budget summaries
  GET    /revisions/                   — list all revision requests  [BEFORE /{project_name}]
  POST   /revisions/                   — submit a revision request
  PATCH  /revisions/{revision_id}      — update revision status
  GET    /revisions/{revision_id}/attachment — download revision attachment
  GET    /{project_name}/attachment    — download stored Excel for a project
  GET    /{project_name}               — get budget for a specific project
  POST   /{project_name}               — save/update budget (multipart/form-data)
  DELETE /{project_name}               — delete a project budget
"""

import base64
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.budget import BudgetRevision, BudgetSummary
from app.schemas.budget import (
    BudgetRevisionResponse,
    BudgetRevisionUpdate,
    BudgetSummaryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── 1. GET / — List all budget summaries ─────────────────────────────────────

@router.get("/", response_model=List[BudgetSummaryResponse])
def list_budget_summaries(db: Session = Depends(get_db)):
    """List all budget summaries (used by sidebar to show which projects have budgets)."""
    return db.query(BudgetSummary).all()


# ─── 2-5. Revision routes — MUST be before /{project_name} ────────────────────

@router.get("/revisions/", response_model=List[BudgetRevisionResponse])
def list_revisions(db: Session = Depends(get_db)):
    """List all budget revision requests (for Head/Finance review tab)."""
    return db.query(BudgetRevision).order_by(BudgetRevision.created_at.desc()).all()


@router.post("/revisions/", response_model=BudgetRevisionResponse)
async def submit_revision(
    project_id: Optional[str] = Form(None),
    project_name: str = Form(...),
    pm_name: Optional[str] = Form(None),
    previous_budget: float = Form(0.0),
    revised_budget: float = Form(0.0),
    reasons: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """Submit a budget revision request from a Project Manager."""
    attachment_name = None
    attachment_data_b64 = None

    if file and file.filename:
        try:
            raw_bytes = await file.read()
            attachment_data_b64 = base64.b64encode(raw_bytes).decode("utf-8")
            attachment_name = file.filename
        except Exception as e:
            logger.error(f"[budget revision] Failed to read attachment: {e}")

    revision = BudgetRevision(
        project_id=str(project_id) if project_id else None,
        project_name=project_name,
        pm_name=pm_name,
        previous_budget=previous_budget,
        revised_budget=revised_budget,
        reasons=reasons,
        status="Pending Head",
        attachment_name=attachment_name,
        attachment_data=attachment_data_b64,
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)
    logger.info(f"[budget revision] New revision submitted for '{project_name}' by '{pm_name}'")
    return revision


@router.patch("/revisions/{revision_id}", response_model=BudgetRevisionResponse)
def update_revision_status(
    revision_id: int,
    payload: BudgetRevisionUpdate,
    db: Session = Depends(get_db)
):
    """Update the status of a budget revision (Approved, Declined, Pending Finance, etc.)."""
    revision = db.query(BudgetRevision).filter(BudgetRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")

    if payload.status:
        revision.status = payload.status
    if payload.waiting_until is not None:
        revision.waiting_until = payload.waiting_until

    # Auto-update project budget when approved
    if payload.status == "Approved":
        budget = db.query(BudgetSummary).filter(
            BudgetSummary.project_name == revision.project_name
        ).first()
        if budget:
            budget.overall_budget = revision.revised_budget
            logger.info(
                f"[budget revision] Approved — updated '{revision.project_name}' budget to {revision.revised_budget}"
            )

    db.commit()
    db.refresh(revision)
    return revision


@router.get("/revisions/{revision_id}/attachment")
def get_revision_attachment(revision_id: int, db: Session = Depends(get_db)):
    """Download the file attachment for a specific revision request."""
    revision = db.query(BudgetRevision).filter(BudgetRevision.id == revision_id).first()
    if not revision or not revision.attachment_data:
        raise HTTPException(status_code=404, detail="No attachment found for this revision.")

    try:
        file_bytes = base64.b64decode(revision.attachment_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode stored attachment.")

    filename = revision.attachment_name or "revision_attachment"
    content_type = "application/octet-stream"
    if filename.lower().endswith(".pdf"):
        content_type = "application/pdf"
    elif filename.lower().endswith((".xlsx", ".xls")):
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ─── 6-9. Project budget routes ────────────────────────────────────────────────

@router.get("/{project_name}/attachment")
def get_budget_attachment(project_name: str, db: Session = Depends(get_db)):
    """Download the stored Excel/file attachment for a project's budget master."""
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).first()

    if not budget or not budget.attachment_data:
        raise HTTPException(status_code=404, detail="No attachment found for this project budget.")

    try:
        file_bytes = base64.b64decode(budget.attachment_data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decode stored attachment.")

    filename = budget.attachment_name or "budget_master.xlsx"
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if filename.lower().endswith(".xls"):
        content_type = "application/vnd.ms-excel"
    elif filename.lower().endswith(".csv"):
        content_type = "text/csv"

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{project_name}", response_model=BudgetSummaryResponse)
def get_budget_summary(project_name: str, db: Session = Depends(get_db)):
    """Get budget data for a specific project."""
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).first()
    if not budget:
        # Return empty response (not 404) so frontend renders empty table
        return BudgetSummaryResponse(
            id=0,
            project_name=project_name,
            uploaded_by="",
            department="",
            overall_budget=0.0,
            budget_data=[],
            attachment_name=None
        )
    return budget


@router.post("/{project_name}", response_model=BudgetSummaryResponse)
async def save_budget_summary(
    project_name: str,
    overall_budget: float = Form(0.0),
    uploaded_by: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    budget_data: str = Form("[]"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Save or update budget data for a project.
    Accepts multipart/form-data matching BudgetMaster.jsx's handleSave().
    """
    try:
        parsed_budget_data = json.loads(budget_data)
    except Exception:
        parsed_budget_data = []

    attachment_name = None
    attachment_data_b64 = None

    if file and file.filename:
        try:
            raw_bytes = await file.read()
            attachment_data_b64 = base64.b64encode(raw_bytes).decode("utf-8")
            attachment_name = file.filename
        except Exception as e:
            logger.error(f"[budget] Failed to read uploaded file: {e}")

    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).first()

    if budget:
        budget.overall_budget = overall_budget
        budget.budget_data = parsed_budget_data
        if uploaded_by:
            budget.uploaded_by = uploaded_by
        if attachment_name:
            budget.attachment_name = attachment_name
            budget.attachment_data = attachment_data_b64
        db.commit()
        db.refresh(budget)
    else:
        budget = BudgetSummary(
            project_name=project_name,
            uploaded_by=uploaded_by,
            department=department,
            overall_budget=overall_budget,
            budget_data=parsed_budget_data,
            attachment_name=attachment_name,
            attachment_data=attachment_data_b64,
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)

    logger.info(f"[budget] Saved budget for '{project_name}' — rows: {len(parsed_budget_data)}, budget: {overall_budget}")
    return budget


@router.delete("/{project_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_summary(project_name: str, db: Session = Depends(get_db)):
    """Delete a project's budget summary."""
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget summary not found")
    db.delete(budget)
    db.commit()
    return None
