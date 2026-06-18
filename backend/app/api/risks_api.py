from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.risks import RiskCreate, RiskUpdate, RiskResponse
from app.services import risks_service

router = APIRouter(prefix="/risks", tags=["Risk Management"])


@router.post("/project/{project_id}", response_model=RiskResponse, status_code=201)
def log_risk(
    project_id: int,
    body: RiskCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Log a new risk item for a project."""
    try:
        return risks_service.create_risk(
            db, project_id,
            title=body.title,
            description=body.description,
            probability=body.probability,
            impact=body.impact,
            mitigation_action=body.mitigation_action,
            status=body.status or "open",
            owner=body.owner or "Unassigned",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log risk: {e}")


@router.get("/project/{project_id}", response_model=List[RiskResponse])
def get_project_risks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve the risk register for a project, sorted by risk score."""
    return risks_service.get_risks(db, project_id)


@router.put("/{risk_id}", response_model=RiskResponse)
def update_project_risk(
    risk_id: int,
    body: RiskUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update risk details, severity, status, or mitigation action."""
    updated = risks_service.update_risk(
        db, risk_id, **body.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Risk item not found")
    return updated


@router.delete("/{risk_id}", status_code=200)
def delete_project_risk(
    risk_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove a risk item from the register."""
    deleted = risks_service.delete_risk(db, risk_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Risk item not found")
    return {"message": "Risk item successfully deleted"}
