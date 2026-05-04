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
from app.models.access_request import AccessRequest
from app.schemas.application_access import AccessRequestCreate, AccessRequestOut
from typing import List

router = APIRouter(prefix="/auth", tags=["Auth"])
def get_user_login_response(db: Session, employee: Employee = None, access: ApplicationAccess = None, user_obj: User = None):
    """
    Helper to generate a consistent login response across different auth sources.
    Prioritizes Employee profile if available.
    """
    if employee:
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
    
    if access:
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

    if user_obj:
        access_token = create_access_token({
            "sub": f"user_{user_obj.id}",
            "email": user_obj.email,
            "full_name": "User",
            "employee_id": user_obj.employee_id,
            "role": "User"
        })
        refresh_token = create_refresh_token(f"user_{user_obj.id}")
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_obj.id,
                "email": user_obj.email,
                "full_name": "User",
                "employee_id": user_obj.employee_id,
                "role": "User",
                "permissions": []
            },
        }
    
    return None

def safe_verify_password(password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        return verify_password(password, hashed_password)
    except Exception:
        return False

#login
@router.post("/login")
def login(data: dict, db: Session = Depends(get_db)):
    identifier = data.get("email") # This could be email OR employee_id
    password = data.get("password")

    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Email and identifier are required")

    # Helper to find employee by email or employee_id
    def find_employee(id_str):
        return db.query(Employee).filter(
            (Employee.email == id_str) | (Employee.employee_id == id_str)
        ).first()

    # 1. Check ApplicationAccess table
    # Try by email first
    access = db.query(ApplicationAccess).filter(ApplicationAccess.email == identifier).first()
    
    # If not found by email, try to find employee first, then their access record
    if not access:
        emp = find_employee(identifier)
        if emp:
            access = db.query(ApplicationAccess).filter(ApplicationAccess.employee_id == emp.id).first()

    if access and safe_verify_password(password, access.hashed_password):
        employee = db.query(Employee).filter(Employee.id == access.employee_id).first() if access.employee_id else None
        if not employee:
            employee = db.query(Employee).filter(Employee.email == access.email).first()
        
        response = get_user_login_response(db, employee=employee, access=access)
        if response: return response

    # 2. Legacy Fallback (Checking Employees table directly)
    employee = find_employee(identifier)
    if employee and safe_verify_password(password, employee.hashed_password):
        response = get_user_login_response(db, employee=employee)
        if response: return response

    # 3. Final Fallback (User table)
    user_obj = db.query(User).filter(
        (User.email == identifier) | (User.employee_id == identifier)
    ).first()
    
    if user_obj and safe_verify_password(password, user_obj.hashed_password):
        employee = find_employee(user_obj.employee_id) or find_employee(user_obj.email)
        
        response = get_user_login_response(db, employee=employee, user_obj=user_obj)
        if response: return response

    raise HTTPException(status_code=401, detail="Invalid credentials")



# ---------- FORGOT PASSWORD ----------
@router.post("/forgot-password")
def forgot_password(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    # Check if email exists in any of our user sources
    exists = db.query(ApplicationAccess).filter(ApplicationAccess.email == email).first() or \
             db.query(Employee).filter(Employee.email == email).first() or \
             db.query(User).filter(User.email == email).first()
             
    if not exists:
         raise HTTPException(status_code=404, detail="Email not found in our records")
         
    # In a real app, we would send an email here. 
    # For this prototype, we just return success to confirm "real-time" validation.
    return {"message": "Reset link sent successfully"}

# ---------- ME ----------
@router.get("/me")
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = str(current_user["sub"])
    
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

    if sub.startswith("user_"):
        user_id = int(sub.split("_")[1])
        user_obj = db.query(User).filter(User.id == user_id).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User record not found")
        
        return {
            "id": user_obj.id,
            "email": user_obj.email,
            "full_name": "User",
            "employee_id": user_obj.employee_id,
            "role": "User",
            "permissions": []
        }

    # Fetch latest employee data to get current role and permissions
    try:
        employee_id_int = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    employee = db.query(Employee).filter(Employee.id == employee_id_int).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get permissions from Role table
    user_role = db.query(Role).filter(Role.name == (employee.role or "User")).first()
    permissions = user_role.permissions if user_role else []
    
    return {
        "id": employee.id,
        "email": employee.email,
        "full_name": employee.name,
        "employee_id": employee.employee_id,
        "role": employee.role or "User",
        "permissions": permissions
    }

# ---------- ACCESS REQUESTS ----------
def check_admin_access(current_user: dict, db: Session):
    role_name = current_user.get("role")
    if role_name not in ["Admin", "Super Admin"]:
         raise HTTPException(status_code=403, detail="Only Admins and Super Admins can access this section")

@router.post("/request-access")
def create_access_request(data: AccessRequestCreate, db: Session = Depends(get_db)):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check pending requests
    existing_request = db.query(AccessRequest).filter(
        AccessRequest.email == data.email,
        AccessRequest.status == "Pending"
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="A pending request already exists for this email")
        
    from app.core.security import hash_password
    new_req = AccessRequest(
        name=data.name,
        email=data.email,
        role=data.role,
        hashed_password=hash_password(data.password)
    )
    db.add(new_req)
    db.commit()
    return {"message": "Access request submitted successfully"}

@router.get("/access-requests", response_model=List[AccessRequestOut])
def get_access_requests(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_admin_access(current_user, db)
    requests = db.query(AccessRequest).filter(AccessRequest.status == "Pending").all()
    
    out = []
    for req in requests:
        emp = db.query(Employee).filter(
            Employee.email == req.email
        ).first()
        
        req_out = AccessRequestOut.model_validate(req)
        req_out.is_employee_match = bool(emp)
        out.append(req_out)
    return out

@router.post("/access-requests/{req_id}/approve")
def approve_request(req_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    import logging
    log = logging.getLogger("auth.approve")

    check_admin_access(current_user, db)

    req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not req or req.status != "Pending":
        raise HTTPException(status_code=404, detail="Pending request not found")

    log.warning(f"[APPROVE] req_id={req_id} email={req.email} name={req.name} role={req.role}")

    # Try to link to an employee record — but don't hard-block if missing
    emp = db.query(Employee).filter(Employee.email == req.email).first()
    log.warning(f"[APPROVE] employee found: {emp is not None} (id={emp.id if emp else None})")

    # Check for existing access by email OR employee_id
    existing = db.query(ApplicationAccess).filter(
        ApplicationAccess.email == req.email
    ).first()
    if not existing and emp:
        existing = db.query(ApplicationAccess).filter(
            ApplicationAccess.employee_id == emp.id
        ).first()

    log.warning(f"[APPROVE] existing access: {existing is not None} (id={existing.id if existing else None})")

    if existing:
        # Update existing record with latest hashed password and link employee
        existing.hashed_password = req.hashed_password
        if emp and not existing.employee_id:
            existing.employee_id = emp.id
        req.status = "Approved"
        db.commit()
        log.warning(f"[APPROVE] Updated existing access record id={existing.id}")
        return {"message": "Request approved (existing access updated)"}

    # Create new access record
    new_access = ApplicationAccess(
        employee_id=emp.id if emp else None,
        email=req.email,
        hashed_password=req.hashed_password,
    )
    db.add(new_access)
    req.status = "Approved"
    db.commit()
    log.warning(f"[APPROVE] Created new access record for {req.email}")
    return {"message": "Request approved"}

@router.post("/access-requests/{req_id}/reject")
def reject_request(req_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_admin_access(current_user, db)
    req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not req or req.status != "Pending":
        raise HTTPException(status_code=404, detail="Pending request not found")
        
    req.status = "Rejected"
    db.commit()
    return {"message": "Request rejected"}
