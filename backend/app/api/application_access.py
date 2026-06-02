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
    
    # Join with Employee to get all employees and their access info if any
    results = db.query(Employee, ApplicationAccess).outerjoin(
        ApplicationAccess, Employee.id == ApplicationAccess.employee_id
    ).all()
    
    out = []
    for emp, access in results:
        # Create an inline dictionary that matches the expected fields of ApplicationAccessOut
        item = ApplicationAccessOut(
            id=access.id if access else emp.id, # Front end expects an id
            employee_id=emp.id,
            email=access.email if access else emp.email,
            employee_name=emp.name,
            role=emp.role,
            username=emp.name,
            is_active=bool(access),
            date_joined=access.created_at if access else emp.created_at,
            created_at=access.created_at if access else emp.created_at,
            updated_at=access.updated_at if access else emp.updated_at,
        )
        out.append(item)
    return out

@router.post("", response_model=ApplicationAccessOut)
def create_access(
    data: ApplicationAccessCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    check_admin_access(current_user, db)
    
    if not data.employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")
        
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
         raise HTTPException(status_code=404, detail="Employee not found")
         
    existing = db.query(ApplicationAccess).filter(ApplicationAccess.email == data.email).first()
    if existing:
         raise HTTPException(status_code=400, detail="Email already in use")
         
    existing_emp_access = db.query(ApplicationAccess).filter(ApplicationAccess.employee_id == data.employee_id).first()
    if existing_emp_access:
         raise HTTPException(status_code=400, detail="Employee already has access")

    if data.password and data.confirm_password and data.password != data.confirm_password:
         raise HTTPException(status_code=400, detail="Passwords do not match")
         
    if not data.password:
         raise HTTPException(status_code=400, detail="Password is required to grant access")

    new_access = ApplicationAccess(
        employee_id=emp.id,
        email=data.email,
        hashed_password=hash_password(data.password)
    )
    db.add(new_access)
    db.commit()
    db.refresh(new_access)
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="CREATE PERMISSION",
        module="ApplicationAccess",
        entity_id=str(new_access.id),
        details={
            "targetRole": "User Access",
            "summary": f"Granted access to {new_access.email}",
            "details": f"Created application access record ID: {new_access.id}"
        }
    )
    
    out = ApplicationAccessOut.model_validate(new_access)
    out.employee_name = emp.name
    out.role = emp.role
    out.username = emp.name
    out.is_active = True
    out.date_joined = new_access.created_at
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
