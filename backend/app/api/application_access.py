from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.application_access import ApplicationAccess
from app.models.employee import Employee
from app.schemas.application_access import ApplicationAccessOut, ApplicationAccessUpdate, ApplicationAccessCreate
from app.core.security import get_current_user, hash_password
from app.models.role import Role
from app.utils.audit import log_activity, generate_diff_summary

router = APIRouter(prefix="/application-access", tags=["Application Access"])

def check_admin_access(current_user: dict, db: Session):
    role_name = current_user.get("role")
    if role_name not in ["Admin", "Super Admin"]:
         raise HTTPException(status_code=403, detail="Only Admins and Super Admins can access this section")

@router.get("", response_model=List[ApplicationAccessOut])
def get_all_access(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_admin_access(current_user, db)
    
    # Join with Employee to get names
    results = db.query(ApplicationAccess, Employee.name).outerjoin(
        Employee, ApplicationAccess.employee_id == Employee.id
    ).all()
    
    out = []
    for access, name in results:
        access_out = ApplicationAccessOut.model_validate(access)
        access_out.employee_name = name
        out.append(access_out)
    return out

@router.patch("/{access_id}", response_model=ApplicationAccessOut)
def update_access(
    access_id: int,
    data: ApplicationAccessUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_admin_access(current_user, db)
    
    access = db.query(ApplicationAccess).filter(ApplicationAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Access record not found")
    
    # Generate diff before updating the object
    diff_summary = generate_diff_summary(access, data)
    
    if data.email:
        # Check if email taken
        existing = db.query(ApplicationAccess).filter(
            ApplicationAccess.email == data.email, 
            ApplicationAccess.id != access_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        access.email = data.email
    
    if data.password:
        if data.password != data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        access.hashed_password = hash_password(data.password)
    
    access.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(access)
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="UPDATE PERMISSION",
        module="ApplicationAccess",
        entity_id=str(access.id),
        details={
            "targetRole": "User Access",
            "summary": f"Updated permission for {access.email}: {diff_summary}",
            "details": f"Modified application access record ID: {access.id}"
        }
    )
    
    # Get employee name
    emp_name = db.query(Employee.name).filter(Employee.id == access.employee_id).scalar()
    
    out = ApplicationAccessOut.model_validate(access)
    out.employee_name = emp_name
    return out

@router.delete("/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_access(
    access_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_admin_access(current_user, db)
    
    access = db.query(ApplicationAccess).filter(ApplicationAccess.id == access_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="Access record not found")
    
    db.delete(access)
    db.commit()

    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="DELETE PERMISSION",
        module="ApplicationAccess",
        entity_id=str(access_id),
        details={
            "targetRole": "User Access",
            "summary": f"Revoked access for {access.email}",
            "details": f"Deleted application access record ID: {access_id}"
        }
    )
    return None
