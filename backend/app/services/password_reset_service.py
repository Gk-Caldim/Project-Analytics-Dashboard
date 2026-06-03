"""
password_reset_service.py
──────────────────────────────────────────────────────────────────────────────
Service layer for the 3-step OTP-based password reset flow.

Layers:
  presentation  →  auth.py (thin HTTP handlers, no business logic)
  logic         →  THIS FILE (OTP generation, hashing, validation, cleanup)
  data          →  PasswordResetToken model + Employee / ApplicationAccess / User

Design decisions:
  • NO email-in-DB restriction on initiate_reset() — OTP is generated for any
    email address. Strictness (must be registered) can be re-added later.
  • Upsert pattern: old pending records for the same email are deleted before
    inserting a new one. Prevents OTP row accumulation.
  • Constant-time hmac.compare_digest() for OTP comparison (timing-attack safe).
  • reset_token is deleted after a single successful use (one-time use only).
  • OTP is always sent via email if SMTP is configured; dev_otp is always
    returned in the response so the UI autofill helper works in any environment.
  • Password is updated across all 3 user tables atomically.
"""

import hashlib
import hmac
import logging
import random
import secrets
from datetime import datetime, timedelta

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.models.password_reset import PasswordResetToken
from app.models.application_access import ApplicationAccess
from app.models.employee import Employee
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────
OTP_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 3


# ── Internal helpers ───────────────────────────────────────────────────────

def _hash_otp(otp: str) -> str:
    """SHA-256 digest of the raw OTP string."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def _constant_time_equal(a: str, b: str) -> bool:
    """Timing-attack-safe string comparison."""
    return hmac.compare_digest(a.encode(), b.encode())


def _try_send_otp_email(email: str, otp: str, background_tasks: BackgroundTasks, db: Session) -> bool:
    """
    Attempt to queue an OTP email via the existing SMTP email service.
    Returns True if the email was successfully queued, False otherwise.
    Does NOT raise — email failure is non-fatal.
    """
    try:
        import os
        from app.models.settings import SystemSetting as SystemSettingModel

        settings = {
            s.key: s.value
            for s in db.query(SystemSettingModel)
            .filter(SystemSettingModel.key.in_(["smtp_user", "smtp_pass", "smtp_host", "smtp_port"]))
            .all()
        }

        smtp_user = settings.get("smtp_user") or os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
        smtp_pass = settings.get("smtp_pass") or os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS")

        if not smtp_user or not smtp_pass:
            logger.info(
                f"[password_reset] SMTP not configured — OTP email skipped. "
                f"OTP for {email} available in dev_otp response field."
            )
            return False

        from app.api.email import send_email_task, EmailRequest

        email_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;
                    padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="margin-bottom:20px;">
            <h2 style="color:#0D1B2A;margin:0 0 4px 0;">Industrial Analytics Dashboard</h2>
            <p style="color:#64748b;margin:0;font-size:14px;">Password Reset Request</p>
          </div>
          <div style="background:#f8fafc;border-radius:6px;padding:24px;
                      text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 12px 0;color:#334155;font-size:15px;">
              Your one-time verification code is:
            </p>
            <div style="font-size:38px;font-weight:bold;letter-spacing:10px;
                        color:#C8341A;font-family:monospace;margin:8px 0;">
              {otp}
            </div>
            <p style="margin:12px 0 0 0;color:#64748b;font-size:13px;">
              This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.
              Do not share it with anyone.
            </p>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0;">
            If you did not request a password reset, you can safely ignore this email.
            Your password will not be changed.
          </p>
        </div>
        """

        background_tasks.add_task(
            send_email_task,
            EmailRequest(
                to=[email],
                subject="Your Password Reset Code — Industrial Analytics",
                message=email_body,
            ),
        )
        logger.info(f"[password_reset] OTP email queued for {email}.")
        return True

    except Exception as exc:
        logger.error(f"[password_reset] Failed to queue OTP email for {email}: {exc}")
        return False


# ── Public service methods ─────────────────────────────────────────────────

def initiate_reset(email: str, db: Session, background_tasks: BackgroundTasks) -> dict:
    """
    Step 1 — Generate a 6-digit OTP and persist it (hashed).

    No restriction on email — OTP is generated for any address.
    If SMTP is configured, the OTP is also emailed to the address.
    The raw OTP is always returned as dev_otp for UI autofill convenience.

    Returns dict: { message, email, email_sent, dev_otp }
    """
    otp = str(random.randint(100000, 999999))
    hashed = _hash_otp(otp)

    # Always log for server-side visibility.
    logger.info(f"[password_reset] OTP={otp} generated for {email}")

    # Delete any existing pending records for this email (upsert pattern).
    deleted = db.query(PasswordResetToken).filter(PasswordResetToken.email == email).delete()
    if deleted:
        logger.info(f"[password_reset] Cleared {deleted} previous OTP record(s) for {email}.")

    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    record = PasswordResetToken(
        email=email,
        hashed_otp=hashed,
        expires_at=expires_at,
        is_verified=False,
        attempts=0,
    )
    db.add(record)
    db.commit()

    email_sent = _try_send_otp_email(email, otp, background_tasks, db)

    return {
        "message": "Verification code sent. Please check your email.",
        "email": email,
        "email_sent": email_sent,
    }


def verify_otp(email: str, otp: str, db: Session) -> str:
    """
    Step 2 — Validate OTP. On success, mark record verified and return reset_token.

    Raises HTTPException on expiry, wrong code, or too many attempts.
    """
    now = datetime.utcnow()
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.expires_at > now,
            PasswordResetToken.is_verified == False,  # noqa: E712
        )
        .order_by(PasswordResetToken.created_at.desc())
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=400,
            detail="OTP has expired or is invalid. Please request a new one.",
        )

    if record.attempts >= MAX_OTP_ATTEMPTS:
        record.expires_at = now  # Invalidate proactively
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Too many failed attempts. Please request a new code.",
        )

    if not _constant_time_equal(record.hashed_otp, _hash_otp(otp)):
        record.attempts += 1
        db.commit()
        remaining = MAX_OTP_ATTEMPTS - record.attempts
        if remaining <= 0:
            record.expires_at = now
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Too many failed attempts. Please request a new code.",
            )
        raise HTTPException(
            status_code=400,
            detail=f"Invalid code. {remaining} attempt(s) remaining.",
        )

    reset_token = secrets.token_hex(16)  # 32-char hex, high entropy
    record.is_verified = True
    record.reset_token = reset_token
    db.commit()

    logger.info(f"[password_reset] OTP verified for {email}. Reset token issued.")
    return reset_token


def reset_password(email: str, reset_token: str, new_password: str, db: Session) -> None:
    """
    Step 3 — Validate reset_token, update password across all user tables,
    then delete the reset record (one-time use).

    Raises HTTPException on invalid/expired token or weak password.
    """
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    now = datetime.utcnow()
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.reset_token == reset_token,
            PasswordResetToken.is_verified == True,  # noqa: E712
            PasswordResetToken.expires_at > now,
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please restart the password reset process.",
        )

    from app.core.security import hash_password
    hashed_pwd = hash_password(new_password)
    updated = False

    for access in db.query(ApplicationAccess).filter(ApplicationAccess.email == email).all():
        access.hashed_password = hashed_pwd
        updated = True

    for emp in db.query(Employee).filter(Employee.email == email).all():
        emp.hashed_password = hashed_pwd
        updated = True

    for usr in db.query(User).filter(User.email == email).all():
        usr.hashed_password = hashed_pwd
        updated = True

    if not updated:
        raise HTTPException(
            status_code=500,
            detail="No user profile found to update. Please contact support.",
        )

    db.delete(record)
    db.commit()

    logger.info(f"[password_reset] Password successfully reset for {email}.")
