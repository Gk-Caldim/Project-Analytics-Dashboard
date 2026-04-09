# app/api/roles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud.role import get_role, get_role_by_name, get_roles, create_role, update_role, delete_role, seed_default_roles
from app.core.security import get_current_user
from app.utils.audit import log_activity
from app.schemas.role import Role, RoleCreate, RoleUpdate

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[Role])
def read_roles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    roles = get_roles(db, skip=skip, limit=limit)
    if not roles:
        seed_default_roles(db)
        roles = get_roles(db, skip=skip, limit=limit)
    return roles

@router.post("/", response_model=Role)
def create_new_role(
    role: RoleCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_role = get_role_by_name(db, name=role.name)
    if db_role:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    new_role = create_role(db=db, role=role)
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="CREATE ROLE",
        module="Roles",
        entity_id=str(new_role.id),
        details={
            "targetRole": new_role.name,
            "summary": f"Initialized new role: {new_role.name}",
            "details": f"Created role with ID: {new_role.id}"
        }
    )
    return new_role

@router.get("/{role_id}", response_model=Role)
def read_role(role_id: int, db: Session = Depends(get_db)):
    db_role = get_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return db_role

@router.patch("/{role_id}", response_model=Role)
def update_existing_role(
    role_id: int, 
    role: RoleUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_role = update_role(db, role_id=role_id, role=role)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="UPDATE ROLE",
        module="Roles",
        entity_id=str(role_id),
        details={
            "targetRole": db_role.name,
            "summary": f"Modified role permissions: {db_role.name}",
            "details": f"Updated role with ID: {role_id}"
        }
    )
    return db_role

@router.delete("/{role_id}", response_model=Role)
def delete_existing_role(
    role_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_role = delete_role(db, role_id=role_id)
    if db_role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Audit Logging
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or current_user.get("id"),
        action="DELETE ROLE",
        module="Roles",
        entity_id=str(role_id),
        details={
            "targetRole": db_role.name,
            "summary": f"Removed role from system: {db_role.name}",
            "details": f"Deleted role with ID: {role_id}"
        }
    )
    return db_role
