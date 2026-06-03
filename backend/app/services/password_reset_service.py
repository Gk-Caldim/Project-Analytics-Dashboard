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

        smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER") or settings.get("smtp_user")
        smtp_pass = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS") or settings.get("smtp_pass")

        if not smtp_user or not smtp_pass:
            logger.info(
                f"[password_reset] SMTP not configured — OTP email skipped. "
                f"OTP for {email} available in dev_otp response field."
            )
            return False

        from app.api.email import send_email_task, EmailRequest

        timestamp_str = datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC")

        email_body = f"""<div style="background-color: #f8fafc; padding: 48px 24px; min-height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.03); overflow: hidden;">
    <!-- Top Indigo Accent Bar -->
    <div style="height: 4px; background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%);"></div>
    
    <div style="padding: 32px 32px 24px 32px;">
      <!-- Header / Logo -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="vertical-align: middle; padding-right: 8px;">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#4f46e5" />
                  <stop offset="100%" stop-color="#6366f1" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#logo-grad)" />
              <path d="M10 20L14 14L17 17L22 11" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </td>
          <td style="vertical-align: middle;">
            <span style="font-family: inherit; font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: 0.1em; text-transform: uppercase;">Industrial Analytics</span>
          </td>
        </tr>
      </table>

      <!-- Title & Intro -->
      <h2 style="font-family: inherit; font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.01em;">Verification Code</h2>
      <p style="font-family: inherit; font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">
        A request has been made to verify your identity. Please use the following single-use authorization code to complete your password reset process.
      </p>

      <!-- Digit Card Box -->
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px 16px; text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px;">One-Time Security Code</span>
        
        <!-- Individual Digits Layout -->
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[0]}</td>
            <td style="width: 6px;"></td>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[1]}</td>
            <td style="width: 6px;"></td>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[2]}</td>
            <td style="width: 14px;"></td>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[3]}</td>
            <td style="width: 6px;"></td>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[4]}</td>
            <td style="width: 6px;"></td>
            <td style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; width: 40px; height: 46px; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">{otp[5]}</td>
          </tr>
        </table>
      </div>

      <!-- Info Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; width: 120px;">
            <span style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Account</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="color: #0f172a; font-size: 13px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">{email}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; width: 120px;">
            <span style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Timestamp</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
            <span style="color: #475569; font-size: 12px; font-weight: 500;">{timestamp_str}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; width: 120px;">
            <span style="color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Lifespan</span>
          </td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="color: #b91c1c; font-size: 11px; font-weight: 600; background: #fee2e2; padding: 2px 8px; border-radius: 12px; display: inline-block;">{OTP_EXPIRY_MINUTES} Minute Expiry</span>
          </td>
        </tr>
      </table>

      <!-- Security Callout -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: top; width: 20px; padding-right: 12px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </td>
            <td style="vertical-align: middle;">
              <p style="font-family: inherit; font-size: 12px; line-height: 1.5; color: #475569; margin: 0;">
                <strong style="color: #0f172a;">Security Advisory:</strong> This code is single-use only. If you did not initiate this request, no action is required and you may safely disregard this message.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer Area -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
      <p style="font-family: inherit; font-size: 11px; line-height: 1.5; color: #94a3b8; margin: 0 0 16px 0;">
        This is an automated transmission by Industrial Analytics Dashboard. Please do not reply directly to this mail. For corporate support or security concerns, contact your administrator.
      </p>
      
      <!-- Socials -->
      <div style="text-align: center; margin-bottom: 12px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; display: inline-block;">
          <tr>
            <td style="padding: 0 8px;">
              <a href="#" style="text-decoration: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#cbd5e1" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                </svg>
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="#" style="text-decoration: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#cbd5e1" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="#" style="text-decoration: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#cbd5e1" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
            </td>
            <td style="padding: 0 8px;">
              <a href="mailto:support@example.com" style="text-decoration: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </td>
          </tr>
        </table>
      </div>
      
      <p style="font-family: inherit; font-size: 11px; color: #cbd5e1; margin: 0;">
        &copy; 2026 Industrial Analytics. All rights reserved.
      </p>
    </div>
  </div>
</div>"""

        background_tasks.add_task(
            send_email_task,
            EmailRequest(
                to=[email],
                subject="Your verification code — Industrial Analytics Dashboard",
                message=email_body,
            ),
        )
        logger.info(f"[password_reset] OTP email queued for {email}.")
        return True

    except Exception as exc:
        logger.error(f"[password_reset] Failed to queue OTP email for {email}: {exc}")
        return False


def _try_send_lockout_email(email: str, background_tasks: BackgroundTasks, db: Session, is_ongoing: bool = False) -> bool:
    """
    Queue a security alert email notifying the user that their password reset flow
    has been locked due to repeated failed attempts.
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

        smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER") or settings.get("smtp_user")
        smtp_pass = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS") or settings.get("smtp_pass")

        # Always log for server-side visibility
        logger.warning(f"[password_reset] SECURITY ALERT for {email} — Password reset temporarily locked (is_ongoing={is_ongoing}).")

        if not smtp_user or not smtp_pass:
            logger.info(f"[password_reset] SMTP not configured — security alert email skipped for {email}.")
            return False

        from app.api.email import send_email_task, EmailRequest

        timestamp_str = datetime.utcnow().strftime("%B %d, %Y at %I:%M %p UTC")
        event_description = (
            "Continued failed attempts were detected while the account was already in a locked state."
            if is_ongoing else
            "3 consecutive incorrect verification codes were entered during a password reset attempt."
        )

        email_body = f"""<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
  <!-- Header -->
  <div style="background:#0D1B2A;padding:18px 24px;border-bottom:1px solid #1e293b;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;">
          <div style="display:inline-block;width:8px;height:8px;background:#C8341A;border-radius:2px;margin-right:8px;vertical-align:middle;"></div>
          <span style="color:#ffffff;font-size:15px;font-weight:600;letter-spacing:-0.01em;vertical-align:middle;font-family:inherit;">Industrial Analytics Dashboard</span>
        </td>
      </tr>
    </table>
  </div>

  <!-- Body -->
  <div style="padding:24px;">
    <p style="margin:0 0 4px 0;color:#C8341A;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Security Alert</p>
    <h2 style="margin:0 0 12px 0;color:#0D1B2A;font-size:20px;font-weight:700;line-height:1.25;">Unusual sign-in activity detected</h2>
    <p style="margin:0 0 20px 0;color:#475569;font-size:13px;line-height:1.5;">We detected unusual activity on the account associated with <strong style="color:#334155;">{email}</strong>. As a precaution, password reset access has been temporarily restricted.</p>

    <!-- Event Details Card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px 0;color:#0D1B2A;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Event Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:5px 0;vertical-align:top;width:100px;">
            <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Event</span>
          </td>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#334155;font-size:13px;">Failed password reset verification</span>
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Detail</span>
          </td>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#334155;font-size:13px;">{event_description}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Action</span>
          </td>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#334155;font-size:13px;">Password resets paused for 15 minutes</span>
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Time</span>
          </td>
          <td style="padding:5px 0;vertical-align:top;">
            <span style="color:#334155;font-size:13px;">{timestamp_str}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Recommended Actions -->
    <div style="margin-bottom:20px;">
      <p style="margin:0 0 10px 0;color:#0D1B2A;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Recommended Actions</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;vertical-align:top;width:18px;">
            <span style="color:#C8341A;font-size:13px;font-weight:700;">1.</span>
          </td>
          <td style="padding:4px 0;vertical-align:top;">
            <span style="color:#475569;font-size:13px;line-height:1.4;"><strong style="color:#334155;">If this was you:</strong> Wait for the 15-minute cooldown period to expire, then retry your password reset request.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;vertical-align:top;width:18px;">
            <span style="color:#C8341A;font-size:13px;font-weight:700;">2.</span>
          </td>
          <td style="padding:4px 0;vertical-align:top;">
            <span style="color:#475569;font-size:13px;line-height:1.4;"><strong style="color:#334155;">If you did not attempt this:</strong> Your account remains secure. No password changes were made. No further action is required.</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding-top:16px;">
      <p style="color:#94a3b8;font-size:11px;line-height:1.4;margin:0;">
        This is an automated security notification from Industrial Analytics Dashboard. Please do not reply to this email. For assistance, contact your system administrator.
      </p>
    </div>
  </div>
</div>"""

        # Dispatch in a background thread (bypasses FastAPI's HTTPException background task cancellation)
        import threading
        thread = threading.Thread(
            target=send_email_task,
            args=(
                EmailRequest(
                    to=[email],
                    subject="Security alert — Industrial Analytics Dashboard",
                    message=email_body,
                ),
            )
        )
        thread.start()
        logger.info(f"[password_reset] Security alert email dispatched for {email} (is_ongoing={is_ongoing}).")
        return True

    except Exception as exc:
        logger.error(f"[password_reset] Failed to send security alert email for {email}: {exc}")
        return False


# ── Public service methods ─────────────────────────────────────────────────

def initiate_reset(email: str, db: Session, background_tasks: BackgroundTasks) -> dict:
    """
    Step 1 — Check if user exists, then generate a 6-digit OTP and persist it (hashed).

    If the email is not registered in the system, either raises a 404 error
    or returns a generic success response depending on SECURE_PASSWORD_RESET setting.
    """
    # Check if the email exists in any of the user tables
    user_exists = (
        db.query(ApplicationAccess).filter(ApplicationAccess.email == email).first() is not None or
        db.query(Employee).filter(Employee.email == email).first() is not None or
        db.query(User).filter(User.email == email).first() is not None
    )

    import os
    secure_mode = os.getenv("SECURE_PASSWORD_RESET", "false").lower() == "true"

    if not user_exists:
        if secure_mode:
            logger.info(f"[password_reset] Email {email} not found. Secure mode enabled: returning fake success.")
            return {
                "message": "Verification code sent. Please check your email.",
                "email": email,
                "email_sent": False,
            }
        else:
            logger.warning(f"[password_reset] Email {email} not found. Returning 404 error.")
            raise HTTPException(
                status_code=404,
                detail="We couldn't find an account with that email address.",
            )

    # Check if they have been locked out due to too many failed OTP attempts recently (15 min cooldown)
    locked_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.attempts >= MAX_OTP_ATTEMPTS,
            PasswordResetToken.updated_at > datetime.utcnow() - timedelta(minutes=15)
        )
        .first()
    )
    if locked_token:
        logger.warning(f"[password_reset] Lockout hit for {email} due to failed OTP attempts. Request blocked.")
        _try_send_lockout_email(email, background_tasks, db, is_ongoing=True)
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. This action is temporarily locked for security. Please try again in 15 minutes.",
        )

    # Rate limit check (cooldown): maximum 1 request per 60 seconds per email
    recent_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.created_at > datetime.utcnow() - timedelta(seconds=60)
        )
        .first()
    )
    if recent_token:
        logger.warning(f"[password_reset] Rate limit hit for {email}. Request blocked.")
        raise HTTPException(
            status_code=429,
            detail="Please wait 60 seconds before requesting another code.",
        )

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


def verify_otp(email: str, otp: str, db: Session, background_tasks: BackgroundTasks = None) -> str:
    """
    Step 2 — Validate OTP. On success, mark record verified and return reset_token.

    Raises HTTPException on expiry, wrong code, or too many attempts.
    """
    now = datetime.utcnow()

    # Pre-check for 15-minute lockout from previous attempts
    locked_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.attempts >= MAX_OTP_ATTEMPTS,
            PasswordResetToken.updated_at > datetime.utcnow() - timedelta(minutes=15)
        )
        .first()
    )
    if locked_token:
        _try_send_lockout_email(email, background_tasks, db, is_ongoing=True)
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. This action is temporarily locked for security. Please try again in 15 minutes.",
        )

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
            detail="Invalid or expired code. Please request a new one.",
        )

    if record.attempts >= MAX_OTP_ATTEMPTS:
        record.expires_at = now  # Invalidate proactively
        db.commit()
        _try_send_lockout_email(email, background_tasks, db)
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. This action is temporarily locked for security. Please try again in 15 minutes.",
        )

    if not _constant_time_equal(record.hashed_otp, _hash_otp(otp)):
        record.attempts += 1
        db.commit()
        if record.attempts >= MAX_OTP_ATTEMPTS:
            record.expires_at = now
            db.commit()
            _try_send_lockout_email(email, background_tasks, db)
            raise HTTPException(
                status_code=400,
                detail="Too many incorrect attempts. This action is temporarily locked for security. Please try again in 15 minutes.",
            )
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect code. Please try again (Attempt {record.attempts} of {MAX_OTP_ATTEMPTS}).",
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

    import re
    if (
        not re.search(r"[A-Z]", new_password)
        or not re.search(r"[0-9]", new_password)
        or not re.search(r"[^A-Za-z0-9]", new_password)
    ):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter, one number, and one special character.",
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
            detail="This session has expired. Please restart the password reset process.",
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
            detail="Account not found. Please contact support.",
        )

    db.delete(record)
    db.commit()

    logger.info(f"[password_reset] Password successfully reset for {email}.")
