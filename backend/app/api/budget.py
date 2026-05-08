"""
budget.py — Full-stack Budget Master API
All routes prefixed with /budget (set in main.py).

IMPORTANT: Route order matters in FastAPI.
Static/literal paths must come BEFORE parameterized paths to avoid conflicts.
e.g. /revisions/ must be defined BEFORE /{project_name}

Routes:
  GET    /history/{project_name}       — list all versions for a project
  GET    /version/{budget_id}          — get a specific version
  GET    /{project_name}               — get LATEST budget for a specific project
  POST   /{project_name}               — save/update budget (multipart/form-data)
  DELETE /version/{budget_id}          — delete a specific version
  DELETE /{project_name}               — delete ALL versions for a project
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


# ─── 1. GET / — List all budget summaries ─────────────────────────────────────

@router.get("/", response_model=List[BudgetSummaryResponse])
def list_budget_summaries(db: Session = Depends(get_db)):
    """List all budget summaries (used by sidebar to show which projects have budgets)."""
    # For the sidebar, we might want just the latest for each project, 
    # but for now, returning all is what the frontend expected.
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
        ).order_by(BudgetSummary.budget_date.desc(), BudgetSummary.updated_at.desc()).first()
        
        if budget:
            budget.overall_budget = revision.revised_budget
            logger.info(
                f"[budget revision] Approved — updated LATEST '{revision.project_name}' budget summary to {revision.revised_budget}"
            )
        
        # Sync to Project Master
        from app.models.project import Project
        proj = db.query(Project).filter(Project.name == revision.project_name).first()
        if proj:
            proj.budget = revision.revised_budget
            proj.balance_budget = proj.budget - (proj.utilized_budget or 0.0)
            logger.info(
                f"[budget revision] Approved — synced '{revision.project_name}' to Project Master. New Budget: {proj.budget}, Balance: {proj.balance_budget}"
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


# ─── 2.5. Version & History routes ──────────────────────────────────────────

@router.get("/market-analysis")
def get_market_analysis():
    """
    Get current market analysis factors (Inflation, Currency Rates).
    In a real app, this might call an external API.
    """
    # Based on latest search data for May 2026
    return {
        "inflation_rate": 4.95,
        "currency_rates": {
            "USD": 94.2,
            "INR": 1.0,
            "EUR": 102.5,
            "GBP": 118.4
        },
        "last_updated": "2026-05-07"
    }


@router.get("/proposal/{project_name}")
def generate_budget_proposal(
    project_name: str,
    inflation_rate: Optional[float] = None,
    currency_factor: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Generate a sophisticated budget revision suggestion.
    Analyzes Estimation, Utilization, and Balance to provide a practical recommendation.
    """
    # 1. Get latest budget
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc(), BudgetSummary.updated_at.desc()).first()

    if not budget:
        return {
            "project_name": project_name,
            "overall_budget": 0.0,
            "budget_data": [],
            "message": "No previous budget found."
        }

    # Use defaults if not provided (from market analysis)
    if inflation_rate is None:
        inflation_rate = 4.95
    if currency_factor is None:
        currency_factor = 1.0  # Default to no change if not specified

    # 2. Extract Metrics
    total_estimated = budget.overall_budget or 0.0
    total_utilized = 0.0
    
    for row in (budget.budget_data or []):
        try:
            util = float(row.get('Utilized') or 0.0)
            comm = float(row.get('Commitment') or 0.0)
            total_utilized += (util + comm)
        except (ValueError, TypeError):
            continue

    remaining_balance = max(0, total_estimated - total_utilized)
    utilization_ratio = (total_utilized / total_estimated) if total_estimated > 0 else 0

    # 3. Sophisticated Calculation
    # We apply inflation and currency factors ONLY to the remaining balance (future costs)
    # Because utilized costs are already locked in at past rates.
    suggested_additional = remaining_balance * (inflation_rate / 100)
    
    # Currency adjustment (if currency_factor is e.g. 1.05, it adds 5% for exchange risk)
    if currency_factor != 1.0:
        suggested_additional += (remaining_balance * (currency_factor - 1))

    # Risk-based buffer
    risk_reason = ""
    if utilization_ratio > 0.8:
        # High utilization risk -> add 5% contingency on the whole budget
        contingency = total_estimated * 0.05
        suggested_additional += contingency
        risk_reason = " High utilization (>80%) detected; added 5% contingency buffer."

    # 4. Generate Reasoning
    reasoning = (
        f"Market Analysis Suggestion: Based on current inflation of {inflation_rate}% "
        f"applied to the remaining balance of {round(remaining_balance, 2)}. "
    )
    if currency_factor != 1.0:
        reasoning += f"Adjusted for currency fluctuation factor of {currency_factor}x. "
    
    reasoning += f"Total suggested revision: {round(suggested_additional, 2)}."
    if risk_reason:
        reasoning += risk_reason

    return {
        "project_name": project_name,
        "current_overall_budget": round(total_estimated, 2),
        "total_utilized": round(total_utilized, 2),
        "remaining_balance": round(remaining_balance, 2),
        "utilization_ratio": round(utilization_ratio, 4),
        "suggested_overall_budget": round(total_estimated + suggested_additional, 2),
        "delta": round(suggested_additional, 2),
        "inflation_rate": inflation_rate,
        "currency_factor": currency_factor,
        "reasoning": reasoning
    }


@router.get("/history/{project_name}", response_model=List[BudgetSummaryResponse])
def list_budget_history(project_name: str, db: Session = Depends(get_db)):
    """List all budget snapshots/versions for a project."""
    return db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc(), BudgetSummary.updated_at.desc()).all()


@router.get("/version/{budget_id}", response_model=BudgetSummaryResponse)
def get_budget_version(budget_id: int, db: Session = Depends(get_db)):
    """Get a specific budget version by ID."""
    budget = db.query(BudgetSummary).filter(BudgetSummary.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget version not found")
    return budget


@router.delete("/version/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_version(budget_id: int, db: Session = Depends(get_db)):
    """Delete a specific budget version."""
    budget = db.query(BudgetSummary).filter(BudgetSummary.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget version not found")
    db.delete(budget)
    db.commit()
    return None


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
    """Get the LATEST budget data for a specific project."""
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc(), BudgetSummary.updated_at.desc()).first()
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
    budget_date: Optional[str] = Form(None),
    overall_budget: float = Form(0.0),
    uploaded_by: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    budget_data: str = Form("[]"),
    sync_to_project: bool = Form(False),
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

    # Find if a budget for this project AND this specific date already exists
    # If no date is provided, we treat it as a "Default/Current" record for now
    query = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name)
    if budget_date:
        query = query.filter(BudgetSummary.budget_date == budget_date)
    else:
        # If no date, we check for a record with NULL date
        query = query.filter(BudgetSummary.budget_date == None)
    
    budget = query.first()

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
            budget_date=budget_date,
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

    # Sync to Project Master if requested
    if sync_to_project:
        from app.models.project import Project
        
        # Calculate totals from parsed_budget_data
        total_utilized = 0.0
        total_balance = 0.0
        
        for row in parsed_budget_data:
            # Match keys from BudgetMaster.jsx initialColumns labels
            total_utilized += float(row.get('Total utilization') or 0)
            total_balance += float(row.get('Balance') or 0)

        proj = db.query(Project).filter(Project.name == project_name).first()
        if proj:
            # Sync as requested: overall_budget -> budget, total_utilized -> utilized_budget, total_balance -> balance_budget
            proj.budget = overall_budget
            proj.utilized_budget = total_utilized
            proj.balance_budget = total_balance
            db.commit()
            logger.info(f"[budget] Synced budget to Project Master for '{project_name}': Budget={overall_budget}, Utilized={total_utilized}, Balance={total_balance}")
        else:
            logger.warning(f"[budget] Could not find project '{project_name}' in Project Master to sync budget.")

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
