from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from fastapi import Request

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
from app.models.password_reset_token import PasswordResetToken
from app.schemas.application_access import AccessRequestCreate, AccessRequestOut
from typing import List

router = APIRouter(prefix="/auth", tags=["Auth"])
def get_user_login_response(db: Session, employee: Employee = None, access: ApplicationAccess = None, user_obj: User = None):
    """
    Helper to generate a consistent login response across different auth sources.
    Prioritizes Employee profile if available.
    """
    if employee is not None:
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
    
    if access is not None:
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

    if user_obj is not None:
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

def safe_verify_password(password: str, hashed_password: str | None) -> bool:
    if not hashed_password:
        return False
    try:
        return verify_password(password, hashed_password)
    except Exception:
        return False

#login
@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: dict, db: Session = Depends(get_db)):



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


def _send_reset_email_background(email: str, reset_link: str):
    import os
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # Load SMTP settings
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", 587))
    except ValueError:
        smtp_port = 587
    smtp_username = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SENDER_EMAIL") or smtp_username

    if not smtp_username or not smtp_password:
        print("[SMTP] Warning: SMTP credentials are not configured in environment variables.")
        return

    # Construct email message
    message = MIMEMultipart("alternative")
    message["Subject"] = "Password Reset - Industrial Analytics Dashboard"
    message["From"] = sender_email
    message["To"] = email

    text_content = (
        "Hello,\n\n"
        "We received a request to reset your password. You can do so by clicking the link below:\n"
        f"{reset_link}\n\n"
        "This link will expire in 15 minutes.\n"
        "If you did not request a password reset, please ignore this email.\n\n"
        "Best regards,\n"
        "Industrial Analytics Dashboard Team"
    )

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
          <h2 style="color: #c8341a; border-bottom: 2px solid #c8341a; padding-bottom: 10px;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your account on the <strong>Industrial Analytics Dashboard</strong>.</p>
          <p>You can reset your password by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #c8341a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="{reset_link}">{reset_link}</a></p>
          <p style="color: #666; font-size: 13px;">Please note: This link is valid for 15 minutes. If you did not make this request, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">Industrial Analytics Workspace &copy; 2026</p>
        </div>
      </body>
    </html>
    """

    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        # Establish connection
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_username, smtp_password)
        server.sendmail(sender_email, email, message.as_string())
        server.quit()
        print(f"[SMTP] Success: Password reset email successfully sent to {email}")
    except Exception as e:
        print(f"[SMTP] Error: Failed to send reset email to {email} - {e}")


# ---------- FORGOT PASSWORD ----------
@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: dict, db: Session = Depends(get_db)):
    import secrets
    from datetime import datetime, timedelta, timezone
    from app.core.config import FRONTEND_URL

    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    email_stripped = email.strip().lower()

    # Always return the same message regardless of whether the email exists.
    # This prevents email enumeration attacks (never reveal if an address is registered).
    exists = (
        db.query(ApplicationAccess).filter(ApplicationAccess.email == email_stripped).first()
        or db.query(Employee).filter(Employee.email == email_stripped).first()
        or db.query(User).filter(User.email == email_stripped).first()
    )

    # Silently return success if email is not found — no 404 exposed to the client.
    if not exists:
        return {"message": "If that email exists in our system, a reset link has been sent."}
         
    # Generate secure reset token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=15)

    reset_token = PasswordResetToken(
        email=email_stripped,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_token)
    db.commit()

    # Build the reset URL
    frontend_base = FRONTEND_URL or "http://localhost:5173"
    reset_link = f"{frontend_base.rstrip('/')}/reset-password?token={token}&email={email_stripped}"

    # Always print to console as a fallback for local development
    print("\n" + "="*80)
    print(f"🔒 PASSWORD RESET LINK FOR: {email_stripped}")
    print(f"🔗 {reset_link}")
    print("="*80 + "\n")

    # Fire-and-forget: send the actual email in the background
    import threading
    thread = threading.Thread(
        target=_send_reset_email_background,
        args=(email_stripped, reset_link),
        daemon=True
    )
    thread.start()

    return {"message": "If that email is registered, a reset link has been sent."}

# ---------- RESET PASSWORD ----------
@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: dict, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.core.security import hash_password

    token = data.get("token")
    email = data.get("email")
    password = data.get("password")

    if not token or not email or not password:
        raise HTTPException(status_code=400, detail="Token, email, and password are required")

    email_stripped = email.strip().lower()

    # Find the token record in database
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.email == email_stripped,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
    ).first()

    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used reset token")

    # Hash the new password
    hashed_pw = hash_password(password)

    # 1. Update ApplicationAccess table
    access_record = db.query(ApplicationAccess).filter(ApplicationAccess.email == email_stripped).first()
    if access_record:
        access_record.hashed_password = hashed_pw

    # 2. Update Employees table directly (legacy fallback)
    employee_record = db.query(Employee).filter(Employee.email == email_stripped).first()
    if employee_record:
        employee_record.hashed_password = hashed_pw

    # 3. Update User table (final fallback)
    user_record = db.query(User).filter(User.email == email_stripped).first()
    if user_record:
        user_record.hashed_password = hashed_pw

    # Mark the token as used
    token_record.used = True
    db.commit()

    return {"message": "Password reset successfully"}

# ---------- REFRESH TOKEN ----------
@router.post("/refresh")
@limiter.limit("10/minute")
def refresh_token(request: Request, data: dict, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh_token for a new access_token + rotated refresh_token.
    The sub field encodes the same prefixes used at login:
      - plain int  → Employee.id
      - "access_N" → ApplicationAccess.id
      - "user_N"   → User.id
    Returns 401 if the token is missing, wrong type, expired, or user not found.
    """
    from jose import jwt, JWTError
    from app.core.config import JWT_SECRET, JWT_ALGORITHM

    incoming = data.get("refresh_token")
    if not incoming:
        raise HTTPException(status_code=400, detail="refresh_token is required")

    try:
        payload = jwt.decode(incoming, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    sub = str(payload.get("sub", ""))

    # --- Resolve user by sub prefix (mirrors login logic) ---
    if sub.startswith("access_"):
        access_id = int(sub.split("_")[1])
        access = db.query(ApplicationAccess).filter(ApplicationAccess.id == access_id).first()
        if not access:
            raise HTTPException(status_code=401, detail="User no longer exists")
        employee = db.query(Employee).filter(Employee.id == access.employee_id).first() if access.employee_id else None
        if not employee:
            employee = db.query(Employee).filter(Employee.email == access.email).first()
        response = get_user_login_response(db, employee=employee, access=access)

    elif sub.startswith("user_"):
        user_id = int(sub.split("_")[1])
        user_obj = db.query(User).filter(User.id == user_id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User no longer exists")
        employee = db.query(Employee).filter(
            (Employee.email == user_obj.email) | (Employee.employee_id == user_obj.employee_id)
        ).first()
        response = get_user_login_response(db, employee=employee, user_obj=user_obj)

    else:
        try:
            employee_id_int = int(sub)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid token subject")
        employee = db.query(Employee).filter(Employee.id == employee_id_int).first()
        if not employee:
            raise HTTPException(status_code=401, detail="User no longer exists")
        response = get_user_login_response(db, employee=employee)

    if not response:
        raise HTTPException(status_code=401, detail="Could not build auth response")

    return response


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
@limiter.limit("3/minute")
def create_access_request(request: Request, data: AccessRequestCreate, db: Session = Depends(get_db)):



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
