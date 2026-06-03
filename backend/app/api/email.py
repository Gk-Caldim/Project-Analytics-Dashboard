from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import base64
import os
import logging
from app.core.database import get_db
from app.models.settings import SystemSetting as SystemSettingModel

logger = logging.getLogger(__name__)

router = APIRouter()

class EmailRequest(BaseModel):
    to: List[str]
    cc: Optional[List[str]] = []
    bcc: Optional[List[str]] = []
    subject: str
    message: str
    attachment: Optional[str] = None  # Base64 encoded PDF string

def send_email_task(email_data: EmailRequest):
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Fetch settings from DB (used as fallback when env vars are not set)
        settings_list = db.query(SystemSettingModel).filter(
            SystemSettingModel.key.in_(["smtp_user", "smtp_pass", "smtp_host", "smtp_port"])
        ).all()
        db_settings = {s.key: s.value for s in settings_list}

        # ENV WINS over DB — App Passwords set in .env are always authoritative.
        # DB settings act as a fallback for production deployments without .env files.
        smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER") or db_settings.get("smtp_user")
        smtp_password = os.getenv("SMTP_PASSWORD") or db_settings.get("smtp_pass")
        smtp_host = os.getenv("SMTP_HOST") or db_settings.get("smtp_host") or "smtp.gmail.com"

        # Robust port handling
        port_raw = os.getenv("SMTP_PORT") or db_settings.get("smtp_port") or 587
        try:
            smtp_port = int(port_raw)
        except (ValueError, TypeError):
            smtp_port = 587

        logger.info(f"[email] SMTP config — user={smtp_user}, host={smtp_host}, port={smtp_port}")

        if not smtp_user or not smtp_password:
            logger.error(
                "[email] SMTP credentials not found. Set SMTP_USERNAME + SMTP_PASSWORD in .env "
                "or configure them in Settings → Connections."
            )
            return

        sender_email = smtp_user
        
        # Create message container
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = ", ".join(email_data.to)
        msg['Subject'] = email_data.subject
        
        if email_data.cc:
            msg['Cc'] = ", ".join(email_data.cc)

        # Attach message body
        html_body = f"<div style='font-family: Arial, sans-serif; white-space: pre-line;'>{email_data.message}</div>"
        msg.attach(MIMEText(html_body, 'html'))
        
        # Handle PDF attachment
        if email_data.attachment:
            try:
                # Remove data URI prefix if present (e.g. data:application/pdf;base64,)
                base64_data = email_data.attachment
                if ',' in base64_data:
                    base64_data = base64_data.split(',')[1]
                
                pdf_bytes = base64.b64decode(base64_data)
                
                part = MIMEBase('application', 'pdf')
                part.set_payload(pdf_bytes)
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', 'attachment; filename="Project_Dashboard_Report.pdf"')
                msg.attach(part)
                logger.info("PDF attachment successfully added.")
            except Exception as attachment_err:
                logger.error(f"Failed to process PDF attachment: {str(attachment_err)}")
        
        # Build recipients list for the sendmail command
        all_recipients = email_data.to + (email_data.cc or []) + (email_data.bcc or [])

        # Connect to SMTP
        logger.info(f"Connecting to {smtp_host}:{smtp_port}")
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            server.starttls()
            
        server.login(smtp_user, smtp_password)
        
        # Send
        server.sendmail(sender_email, all_recipients, msg.as_string())
        server.quit()
        logger.info("Email sent successfully via Gmail SMTP.")

    finally:
        db.close()


@router.post("/send")
async def send_email(email_data: EmailRequest, background_tasks: BackgroundTasks):
    """
    Send an email using SMTP.
    To avoid blocking the request, sending is done in the background.
    """
    if not email_data.to:
        raise HTTPException(status_code=400, detail="At least one recipient (to) is required.")

    # Always return success immediately, actual sending runs in background
    background_tasks.add_task(send_email_task, email_data)
    
    return {"status": "success", "message": "Email has been queued for sending."}

@router.post("/test")
async def test_smtp_connection(db: Session = Depends(get_db)):
    """
    Test the SMTP connection using current settings in the database.
    This is a synchronous call to provide immediate feedback.
    """
    try:
        settings_list = db.query(SystemSettingModel).filter(
            SystemSettingModel.key.in_(["smtp_user", "smtp_pass", "smtp_host", "smtp_port"])
        ).all()
        
        db_settings = {s.key: s.value for s in settings_list}

        # ENV WINS over DB (same priority as send_email_task)
        smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER") or db_settings.get("smtp_user")
        smtp_password = os.getenv("SMTP_PASSWORD") or db_settings.get("smtp_pass")
        smtp_host = os.getenv("SMTP_HOST") or db_settings.get("smtp_host") or "smtp.gmail.com"

        # Robust port handling
        port_raw = os.getenv("SMTP_PORT") or db_settings.get("smtp_port") or "587"
        try:
            smtp_port = int(port_raw) if port_raw else 587
        except (ValueError, TypeError):
            smtp_port = 587

        if not smtp_user or not smtp_password:
            raise HTTPException(status_code=400, detail="SMTP credentials (User/Pass) are missing.")

        # Test connection
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            server.starttls()
            
        server.login(smtp_user, smtp_password)
        server.quit()
        
        return {"status": "success", "message": "SMTP connection successful!"}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=401, detail="Authentication failed. Please check your username and password.")
    except smtplib.SMTPConnectError:
        raise HTTPException(status_code=503, detail="Could not connect to the SMTP server. Check the host and port.")
    except Exception as e:
        logger.error(f"SMTP Test Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
