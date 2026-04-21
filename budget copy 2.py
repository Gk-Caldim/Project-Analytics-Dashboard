from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from typing import Annotated
from app.core.permissions import check_permissions
from app.models.budget import BudgetSummary
from app.schemas.budget import BudgetSummaryCreate, BudgetSummaryResponse

router = APIRouter()

@router.get("/", response_model=List[BudgetSummaryResponse], dependencies=[Depends(check_permissions("view_budget"))])
def list_budget_summaries(db: Annotated[Session, Depends(get_db)]):
    return db.query(BudgetSummary).all()

@router.get("/{project_name}", response_model=BudgetSummaryResponse)
def get_budget_summary(project_name: str, db: Session = Depends(get_db)):
    budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
    if not budget:
        return BudgetSummaryResponse(id=0, project_name=project_name, uploaded_by="", department="", budget_data=[])
    return budget

@router.post("/{project_name}", response_model=BudgetSummaryResponse, dependencies=[Depends(check_permissions("upload_budget"))])
def save_budget_summary(project_name: str, budget_data: BudgetSummaryCreate, db: Session = Depends(get_db)):
    budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
    if budget:
        budget.budget_data = budget_data.budget_data
        budget.uploaded_by = budget_data.uploaded_by
        budget.department = budget_data.department
        db.commit()
        db.refresh(budget)
    else:
        budget = BudgetSummary(
            project_name=project_name, 
            uploaded_by=budget_data.uploaded_by,
            department=budget_data.department,
            budget_data=budget_data.budget_data
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return budget

@router.delete("/{project_name}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(check_permissions("delete_budget"))])
def delete_budget_summary(project_name: str, db: Annotated[Session, Depends(get_db)]):
    budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget summary not found")
    db.delete(budget)
    db.commit()
    return None
