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
from typing import List, Optional, Any, cast

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.budget import BudgetRevision, BudgetSummary
from app.models.audit_log import AuditLog
from app.schemas.budget import (
    BudgetRevisionResponse,
    BudgetRevisionUpdate,
    BudgetSummaryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def clean_float(value: Any) -> float:
    """Robust float conversion that handles commas, currency symbols, and None."""
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    
    # Handle string cleaning
    s = str(value).strip()
    # Remove currency symbols (common ones)
    for char in ["$", "₹", "£", "€", ","]:
        s = s.replace(char, "")
    
    try:
        return float(s)
    except ValueError:
        logger.warning(f"[budget] Could not convert '{value}' to float, returning 0.0")
        return 0.0


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
        revision.status = payload.status  # type: ignore
    if payload.waiting_until is not None:
        revision.waiting_until = payload.waiting_until  # type: ignore

    # Auto-update project budget when approved
    if payload.status == "Approved":
        from datetime import datetime
        revision.approved_at = datetime.utcnow()
        budget = db.query(BudgetSummary).filter(
            BudgetSummary.project_name == revision.project_name
        ).order_by(BudgetSummary.budget_date.desc().nulls_last(), BudgetSummary.updated_at.desc()).first()
        
        if budget:
            budget.overall_budget = revision.revised_budget
            logger.info(
                f"[budget revision] Approved — updated LATEST '{revision.project_name}' budget summary to {revision.revised_budget}"
            )
        
        # Sync to Project Master
        from app.models.project import Project
        proj = db.query(Project).filter(Project.name == revision.project_name).first()
        if proj:
            proj.budget = revision.revised_budget  # type: ignore
            proj.balance_budget = cast(Any, proj.budget) - (proj.utilized_budget or 0.0)  # type: ignore
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
        file_bytes = base64.b64decode(cast(str, revision.attachment_data))
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
async def generate_budget_proposal(
    project_name: str,
    inflation_rate: Optional[float] = None,
    currency_factor: Optional[float] = None,
    currency: Optional[str] = "USD",
    db: Session = Depends(get_db)
):
    """
    Generate a sophisticated, currency-aware budget revision suggestion.
    Analyzes Estimation, Utilization, and Balance to provide a practical recommendation.
    """
    # 1. Get latest budget
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc().nulls_last(), BudgetSummary.updated_at.desc()).first()

    if not budget:
        return {
            "project_name": project_name,
            "overall_budget": 0.0,
            "budget_data": [],
            "message": "No previous budget found."
        }

    # 2. Get Live Currency Exchange Rates
    from app.api.currency import get_exchange_rates
    try:
        rates = await get_exchange_rates()
    except Exception as e:
        logger.error(f"[budget proposal] Failed to fetch exchange rates: {e}")
        rates = { "USD": 1.0, "INR": 95.43, "EUR": 0.92, "GBP": 0.80, "JPY": 155.0 }

    target_currency = (currency or "USD").upper()
    rate = float(rates.get(target_currency, 1.0))

    # 3. Determine Dynamic Parameters based on Currency and Settings
    from app.models.settings import SystemSetting as SystemSettingModel

    # Helper to get dynamic float setting from database
    def get_setting_val(key: str, default: float) -> float:
        try:
            setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == key).first()
            if setting and hasattr(setting, "key") and getattr(setting, "key") == key and hasattr(setting, "value") and getattr(setting, "value") is not None:
                return float(getattr(setting, "value"))
        except Exception:
            pass
        return default

    # Stable vs Emerging currencies
    stable_currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]
    is_stable = target_currency in stable_currencies

    # Real-time/Current inflation rates
    if inflation_rate is None:
        setting_key = f"inflation_rate_{target_currency.lower()}"
        inflation_map = {
            "USD": 3.4, "INR": 5.1, "EUR": 2.4, "GBP": 2.0, "JPY": 2.5, "CAD": 2.8, "AUD": 3.6
        }
        fallback_val = inflation_map.get(target_currency, 3.0)
        
        # Try target currency setting first
        inflation_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == setting_key).first()
        if (inflation_setting and hasattr(inflation_setting, "key") and getattr(inflation_setting, "key") == setting_key 
                and hasattr(inflation_setting, "value") and getattr(inflation_setting, "value") is not None):
            try:
                inflation_rate = float(getattr(inflation_setting, "value"))
            except ValueError:
                inflation_rate = fallback_val
        else:
            # Fallback to default inflation rate setting
            default_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == "inflation_rate_default").first()
            if (default_setting and hasattr(default_setting, "key") and getattr(default_setting, "key") == "inflation_rate_default"
                    and hasattr(default_setting, "value") and getattr(default_setting, "value") is not None):
                try:
                    inflation_rate = float(getattr(default_setting, "value"))
                except ValueError:
                    inflation_rate = fallback_val
            else:
                inflation_rate = fallback_val

    # Volatility / Exchange Risk factor
    if currency_factor is None:
        if is_stable:
            currency_factor = get_setting_val("volatility_factor_stable", 1.01)
        else:
            currency_factor = get_setting_val("volatility_factor_volatile", 1.03)

    # Contingency buffer rate
    if is_stable:
        contingency_rate = get_setting_val("contingency_rate_stable", 5.0)
    else:
        contingency_rate = get_setting_val("contingency_rate_volatile", 8.0)

    utilization_threshold = get_setting_val("utilization_threshold", 0.8)

    # 4. Extract Metrics from Budget Master Data robustly
    total_estimated = float(budget.overall_budget or 0.0)
    total_utilized = 0.0
    total_balance = 0.0

    for row in (budget.budget_data or []):
        try:
            # Robustly parse utilization and balance from multiple potential keys
            util = clean_float(row.get('Total utilization') or row.get('total_utilization') or row.get('Utilized') or row.get('utilized') or 0.0)
            if not row.get('Total utilization') and not row.get('total_utilization') and (row.get('Commitment') or row.get('commitment')):
                comm = clean_float(row.get('Commitment') or row.get('commitment') or 0.0)
                total_utilized += (util + comm)
            else:
                total_utilized += util

            bal = clean_float(row.get('Balance') or row.get('balance') or 0.0)
            total_balance += bal
        except Exception as e:
            logger.warning(f"[budget proposal] Row parsing error: {e}")
            continue

    # Fallback/sanity check for balance if it wasn't summed correctly
    if total_balance == 0.0 and total_estimated > 0.0:
        total_balance = max(0.0, total_estimated - total_utilized)

    remaining_balance = max(0.0, total_estimated - total_utilized)
    utilization_ratio = (total_utilized / total_estimated) if total_estimated > 0 else 0

    # 5. Step-by-Step Calculations in USD
    inflation_usd = remaining_balance * (inflation_rate / 100.0)
    volatility_usd = remaining_balance * (currency_factor - 1.0)

    # Risk-based Contingency Buffer
    contingency_usd = 0.0
    contingency_applied = False
    if utilization_ratio > utilization_threshold:
        contingency_usd = total_estimated * (contingency_rate / 100.0)
        contingency_applied = True

    suggested_additional_usd = inflation_usd + volatility_usd + contingency_usd

    # 6. Format currency symbol for reasoning text
    currency_symbols = {
        "USD": "$", "INR": "₹", "EUR": "€", "GBP": "£", "JPY": "¥"
    }
    symbol = currency_symbols.get(target_currency, target_currency + " ")

    # Localized display values
    remaining_local = remaining_balance * rate
    inflation_local = inflation_usd * rate
    volatility_local = volatility_usd * rate
    contingency_local = contingency_usd * rate
    suggested_additional_local = suggested_additional_usd * rate

    # 7. Generate Step-by-Step Calculations List
    calculations = [
        {
            "step": "Remaining Balance",
            "formula": "Total Budget - Total Utilized",
            "usd_val": round(remaining_balance, 2),
            "local_val": round(remaining_local, 2),
            "applied": True
        },
        {
            "step": "Inflation Adjustment",
            "formula": f"Remaining Balance * Inflation Rate ({inflation_rate}%)",
            "usd_val": round(inflation_usd, 2),
            "local_val": round(inflation_local, 2),
            "applied": True
        },
        {
            "step": "Currency Volatility Buffer",
            "formula": f"Remaining Balance * Volatility ({round((currency_factor - 1.0) * 100.0, 1)}%)",
            "usd_val": round(volatility_usd, 2),
            "local_val": round(volatility_local, 2),
            "applied": True
        },
        {
            "step": "Contingency Buffer",
            "formula": f"Total Budget * Contingency ({contingency_rate}%) if Utilization > {int(utilization_threshold * 100)}%",
            "usd_val": round(contingency_usd, 2),
            "local_val": round(contingency_local, 2),
            "applied": contingency_applied
        },
        {
            "step": "Total Revision Suggested",
            "formula": "Sum of Adjustments",
            "usd_val": round(suggested_additional_usd, 2),
            "local_val": round(suggested_additional_local, 2),
            "applied": True
        }
    ]

    # 8. Detailed reasoning text
    reasoning = (
        f"Smart Market Analysis Suggestion for {project_name} (Currency: {target_currency}): "
        f"1. Inflation rate of {inflation_rate}% applied to the remaining balance of {symbol}{round(remaining_local, 2):,} {target_currency} "
        f"(${round(remaining_balance, 2):,} USD) adds {symbol}{round(inflation_local, 2):,} {target_currency}. "
        f"2. Currency volatility risk of {round((currency_factor - 1.0) * 100.0, 1)}% adds {symbol}{round(volatility_local, 2):,} {target_currency}. "
    )
    if contingency_applied:
        reasoning += (
            f"3. High utilization ratio of {round(utilization_ratio * 100.0, 1)}% (exceeding {int(utilization_threshold * 100)}%) "
            f"triggers a {contingency_rate}% contingency buffer of {symbol}{round(contingency_local, 2):,} {target_currency} "
            f"(${round(contingency_usd, 2):,} USD). "
        )
    else:
        reasoning += f"3. Utilization ratio of {round(utilization_ratio * 100.0, 1)}% is within normal limits. "

    reasoning += f"Total suggested budget revision is +{symbol}{round(suggested_additional_local, 2):,} {target_currency} (+${round(suggested_additional_usd, 2):,} USD)."

    return {
        "project_name": project_name,
        "currency": target_currency,
        "exchange_rate": rate,
        "current_overall_budget": round(total_estimated, 2),
        "total_utilized": round(total_utilized, 2),
        "remaining_balance": round(remaining_balance, 2),
        "utilization_ratio": round(utilization_ratio, 4),
        "suggested_overall_budget": round(total_estimated + suggested_additional_usd, 2),
        "delta": round(suggested_additional_usd, 2),
        "inflation_rate": inflation_rate,
        "currency_factor": currency_factor,
        "calculations": calculations,
        "reasoning": reasoning
    }



@router.get("/history/{project_name}", response_model=List[BudgetSummaryResponse])
def list_budget_history(project_name: str, db: Session = Depends(get_db)):
    """List all budget snapshots/versions for a project."""
    return db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc().nulls_last(), BudgetSummary.updated_at.desc()).all()


@router.get("/version/{budget_id}", response_model=BudgetSummaryResponse)
def get_budget_version(budget_id: int, db: Session = Depends(get_db)):
    """Get a specific budget version by ID."""
    budget = db.query(BudgetSummary).filter(BudgetSummary.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget version not found")
    return budget


@router.get("/audits/{project_name}")
def get_budget_audits(project_name: str, limit: int = 100, db: Session = Depends(get_db)):
    """Get all budget audit logs for a specific project."""
    from sqlalchemy import desc
    from app.models.employee import Employee
    logs = db.query(
        AuditLog.id,
        AuditLog.user_id,
        AuditLog.action,
        AuditLog.module,
        AuditLog.entity_id,
        AuditLog.details,
        AuditLog.timestamp,
        Employee.name.label("user_name"),
        Employee.role.label("user_role")
    ).outerjoin(
        Employee, AuditLog.user_id == Employee.employee_id
    ).filter(
        AuditLog.module == "BudgetMaster",
        AuditLog.details["project_name"].astext == project_name
    ).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [{"id": r.id, "user_id": r.user_id, "action": r.action, "module": r.module,
             "entity_id": r.entity_id, "details": r.details,
             "timestamp": r.timestamp.isoformat() if r.timestamp else None,
             "user_name": r.user_name, "user_role": r.user_role} for r in logs]


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
        file_bytes = base64.b64decode(cast(str, budget.attachment_data))
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
    logger.info(f"[budget] Fetching budget for project: {project_name}")
    try:
        budget = db.query(BudgetSummary).filter(
            BudgetSummary.project_name == project_name
        ).order_by(BudgetSummary.budget_date.desc().nulls_last(), BudgetSummary.updated_at.desc()).first()
        
        if not budget:
            logger.info(f"[budget] No budget found for project: {project_name}. Returning default.")
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
        
        logger.info(f"[budget] Found budget for project: {project_name} (ID: {budget.id})")
        return budget
    except Exception as e:
        logger.error(f"[budget] Error fetching budget for {project_name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/{project_name}", response_model=BudgetSummaryResponse)
async def save_budget_summary(
    project_name: str,
    budget_date: Optional[str] = Form(None),
    overall_budget: float = Form(0.0),
    uploaded_by: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    budget_data: str = Form("[]"),
    sync_to_project: bool = Form(False),
    user_id: Optional[str] = Form(None),
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

    if not parsed_budget_data or len(parsed_budget_data) == 0:
        raise HTTPException(status_code=400, detail="Cannot save empty budget data. Please add valid budget entries.")

    attachment_name = None
    attachment_data_b64 = None

    if file and file.filename:
        try:
            raw_bytes = await file.read()
            attachment_data_b64 = base64.b64encode(raw_bytes).decode("utf-8")
            attachment_name = file.filename
        except Exception as e:
            logger.error(f"[budget] Failed to read uploaded file: {e}")

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
            total_utilized += clean_float(row.get('Total utilization'))
            total_balance += clean_float(row.get('Balance'))

        proj = db.query(Project).filter(Project.name == project_name).first()
        if proj:
            # Sync as requested: overall_budget -> budget, total_utilized -> utilized_budget, total_balance -> balance_budget
            proj.budget = overall_budget  # type: ignore
            proj.utilized_budget = total_utilized  # type: ignore
            proj.balance_budget = total_balance  # type: ignore
            db.commit()
            logger.info(f"[budget] Synced budget to Project Master for '{project_name}': Budget={overall_budget}, Utilized={total_utilized}, Balance={total_balance}")
        else:
            logger.warning(f"[budget] Could not find project '{project_name}' in Project Master to sync budget.")

    logger.info(f"[budget] Saved budget for '{project_name}' — rows: {len(parsed_budget_data)}, budget: {overall_budget}")

    # Write audit log
    action = "UPLOAD" if attachment_name else "SAVE"
    try:
        audit = AuditLog(
            user_id=user_id,
            action=action,
            module="BudgetMaster",
            entity_id=str(budget.id),
            details={
                "project_name": project_name,
                "overall_budget": overall_budget,
                "rows": len(parsed_budget_data),
                "budget_date": budget_date,
                "uploaded_by": uploaded_by,
                "attachment_name": attachment_name,
                "sync_to_project": sync_to_project,
            }
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        logger.warning(f"[budget] Failed to write audit log: {e}")

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


@router.get("/audits/{project_name}")
def get_budget_audits(project_name: str, limit: int = 100, db: Session = Depends(get_db)):
    """Get all budget audit logs for a specific project."""
    from sqlalchemy import desc
    from app.models.employee import Employee
    logs = db.query(
        AuditLog.id,
        AuditLog.user_id,
        AuditLog.action,
        AuditLog.module,
        AuditLog.entity_id,
        AuditLog.details,
        AuditLog.timestamp,
        Employee.name.label("user_name"),
        Employee.role.label("user_role")
    ).outerjoin(
        Employee, AuditLog.user_id == Employee.employee_id
    ).filter(
        AuditLog.module == "BudgetMaster",
        AuditLog.details["project_name"].astext == project_name
    ).order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [{"id": r.id, "user_id": r.user_id, "action": r.action, "module": r.module,
             "entity_id": r.entity_id, "details": r.details, "timestamp": r.timestamp.isoformat() if r.timestamp else None,
             "user_name": r.user_name, "user_role": r.user_role} for r in logs]
