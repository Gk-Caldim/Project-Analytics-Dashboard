from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.models.employee import Employee
from app.models.user import User
from app.models.role import Role # Import Role model
from app.models.application_access import ApplicationAccess

router = APIRouter(prefix="/auth", tags=["Auth"])
#login
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    # 1. Check ApplicationAccess table first (New Source of Truth)
    access = db.query(ApplicationAccess).filter(ApplicationAccess.email == data["email"]).first()
    
    if access and verify_password(data["password"], access.hashed_password):
        # Successfully authenticated via ApplicationAccess
        employee = None
        if access.employee_id:
            employee = db.query(Employee).filter(Employee.id == access.employee_id).first()
        
        # If no employee linked, try to find by email as fallback
        if not employee:
            employee = db.query(Employee).filter(Employee.email == access.email).first()

        if employee:
            # Found linked employee, get roles and permissions
            user_role = db.query(Role).filter(Role.name == (employee.role or "User")).first()
            permissions = user_role.permissions if user_role else []

            access_token = create_access_token({
                "sub": str(employee.id),
                "email": access.email,
                "full_name": employee.name,
                "employee_id": employee.employee_id,
                "role": employee.role or "User"
            })
            refresh_token = create_refresh_token(str(employee.id))

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": employee.id,
                    "email": access.email,
                    "full_name": employee.name,
                    "employee_id": employee.employee_id,
                    "role": employee.role or "User",
                    "permissions": permissions
                },
            }
        else:
            # Authentication successful but no employee profile found
            access_token = create_access_token({
                "sub": f"access_{access.id}",
                "email": access.email,
                "full_name": "Application User",
                "role": "User"
            })
            refresh_token = create_refresh_token(f"access_{access.id}")

            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": access.id,
                    "email": access.email,
                    "full_name": "Application User",
                    "role": "User",
                    "permissions": []
                },
            }

    # 2. Legacy Fallback (Checking Employees table directly)
    employee = db.query(Employee).filter(Employee.email == data["email"]).first()
    if employee and employee.hashed_password and verify_password(data["password"], employee.hashed_password):
        user_role = db.query(Role).filter(Role.name == (employee.role or "User")).first()
        permissions = user_role.permissions if user_role else []
        
        access_token = create_access_token({
            "sub": str(employee.id),
            "email": employee.email,
            "full_name": employee.name,
            "employee_id": employee.employee_id,
            "role": employee.role or "User"
        })
        refresh_token = create_refresh_token(str(employee.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": employee.id,
                "email": employee.email,
                "full_name": employee.name,
                "employee_id": employee.employee_id,
                "role": employee.role or "User",
                "permissions": permissions
            },
        }

    # 3. Final Fallback (User table)
    user = db.query(User).filter(User.email == data["email"]).first()
    if user and verify_password(data["password"], user.hashed_password):
        access_token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "full_name": "User",
            "employee_id": user.employee_id
        })
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": "User",
                "employee_id": user.employee_id,
            },
        }

    raise HTTPException(status_code=401, detail="Invalid credentials")



# ---------- ME ----------
@router.get("/me")
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = current_user["sub"]
    
    if sub.startswith("access_"):
        access_id = int(sub.split("_")[1])
        access = db.query(ApplicationAccess).filter(ApplicationAccess.id == access_id).first()
        if not access:
            raise HTTPException(status_code=404, detail="Access record not found")
        
        return {
            "id": access.id,
            "email": access.email,
            "full_name": "Application User",
            "role": "User",
            "permissions": []
        }

    # Fetch latest employee data to get current role and permissions
    employee = db.query(Employee).filter(Employee.id == int(sub)).first()
    if not employee:
        # Fallback to User table if not found in Employees
        user = db.query(User).filter(User.id == int(sub)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "id": user.id,
            "email": user.email,
            "full_name": "User",
            "role": "User",
            "permissions": []
        }
    
    # Get permissions from Role table
    user_role = db.query(Role).filter(Role.name == employee.role).first()
    permissions = user_role.permissions if user_role else []
    
    return {
        "id": employee.id,
        "email": employee.email,
        "full_name": employee.name,
        "employee_id": employee.employee_id,
        "role": employee.role,
        "permissions": permissions
    }
