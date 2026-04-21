from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.enterprise_lead import EnterpriseLead as EnterpriseLeadModel
from app.schemas.enterprise_lead import EnterpriseLeadCreate, EnterpriseLead as EnterpriseLeadSchema

router = APIRouter(prefix="/enterprise", tags=["Enterprise"])

@router.post("/lead", response_model=EnterpriseLeadSchema)
def create_lead(lead_in: EnterpriseLeadCreate, db: Session = Depends(get_db)):
    """
    Capture a new enterprise lead from the Enterprise Landing Page.
    """
    try:
        new_lead = EnterpriseLeadModel(
            full_name=lead_in.full_name,
            work_email=lead_in.work_email,
            company=lead_in.company,
            team_size=lead_in.team_size,
            use_case=lead_in.use_case,
            message=lead_in.message
        )
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        return new_lead
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")

@router.get("/leads", response_model=list[EnterpriseLeadSchema])
def get_leads(db: Session = Depends(get_db)):
    """
    Internal endpoint to retrieve leads (for sales dashboard).
    """
    return db.query(EnterpriseLeadModel).order_by(EnterpriseLeadModel.timestamp.desc()).all()
