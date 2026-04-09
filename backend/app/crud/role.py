# app/crud/role.py
from sqlalchemy.orm import Session
from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate

def get_role(db: Session, role_id: int):
    return db.query(Role).filter(Role.id == role_id).first()

def get_role_by_name(db: Session, name: str):
    return db.query(Role).filter(Role.name == name).first()

def get_roles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Role).offset(skip).limit(limit).all()

def create_role(db: Session, role: RoleCreate):
    db_role = Role(
        name=role.name,
        description=role.description,
        permissions=role.permissions,
        is_default=getattr(role, "is_default", 0)
    )
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

def update_role(db: Session, role_id: int, role: RoleUpdate):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    
    update_data = role.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_role, key, value)
    
    db.commit()
    db.refresh(db_role)
    return db_role

def delete_role(db: Session, role_id: int):
    db_role = get_role(db, role_id)
    if not db_role:
        return None
    if getattr(db_role, "is_default", 0) == 1:
        # Prevent deletion of default roles
        return None
    db.delete(db_role)
    db.commit()
    return db_role

def seed_default_roles(db: Session):
    default_roles = [
        {
            "name": "Super Admin", 
            "description": "Full system access and security oversight.", 
            "is_default": 1,
            "permissions": [
                "Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", 
                "Upload Trackers", "Budget Upload", "Settings",
                "upload_tracker", "view_tracker", "delete_tracker",
                "upload_budget", "view_budget", "delete_budget"
            ]
        },
        {
            "name": "Admin", 
            "description": "Full system configuration and master data oversight.", 
            "is_default": 1,
            "permissions": [
                "Dashboard", "MOM", "Employee Master", "Project Master", "Department Master", 
                "Upload Trackers", "Budget Upload",
                "upload_tracker", "view_tracker", "delete_tracker",
                "upload_budget", "view_budget", "delete_budget"
            ]
        },
        {
            "name": "Project Manager", 
            "description": "Project lifecycle and resource tracking.", 
            "is_default": 1,
            "permissions": [
                "Dashboard", "MOM", "Project Master", "Upload Trackers",
                "upload_tracker", "view_tracker", "view_budget"
            ]
        },
        {
            "name": "Team Lead", 
            "description": "Operations planning, approvals, and report generation.", 
            "is_default": 1,
            "permissions": [
                "Dashboard", "MOM", "Upload Trackers",
                "upload_tracker", "view_tracker"
            ]
        },
        {
            "name": "Employee", 
            "description": "Standard user access.", 
            "is_default": 1,
            "permissions": ["Dashboard", "view_tracker"]
        }
    ]
    for r in default_roles:
        existing = get_role_by_name(db, r["name"])
        if not existing:
            create_role(db, RoleCreate(**r))
        else:
            # Update existing default role description but DO NOT overwrite permissions
            # to preserve user-configured access controls across app restarts
            existing.description = r["description"]
            existing.is_default = 1
            db.commit()
