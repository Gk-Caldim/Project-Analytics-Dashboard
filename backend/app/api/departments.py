from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.department import Department
from app.schemas.department import DepartmentOut

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    try:
        departments = db.query(Department).all()
        return departments
    except Exception as e:
        # Fallback to empty list if table doesn't exist or other DB error
        return []
