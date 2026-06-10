import smtplib
import os
import logging
import json
import datetime as dt
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

logger = logging.getLogger(__name__)

def _format_agenda(agenda_text):
    """Parses agenda_text safely. Handles both rich JSON arrays and plaintext newlines."""
    if not agenda_text:
        return []
    try:
        parsed = json.loads(agenda_text)
        if isinstance(parsed, list):
            points = []
            for item in parsed:
                if isinstance(item, dict):
                    title = item.get("title") or item.get("label") or item.get("text")
                    if title:
                        duration = item.get("duration")
                        if duration and int(duration) > 0:
                            points.append(f"{title} ({duration} mins)")
                        else:
                            points.append(title)
                elif isinstance(item, str):
                    points.append(item)
            if points:
                return points
    except Exception:
        pass
    return [p.strip() for p in agenda_text.splitlines() if p.strip()]

def _generate_ics_content(meeting_data, join_url, sender_email):
    """Generates standard RFC 5545 compliant iCalendar string for calendar widget rendering."""
    title = meeting_data.get('title', 'Meeting')
    description = meeting_data.get('description', '')
    platform = meeting_data.get('platform', '').upper()
    date_str = meeting_data.get('date')
    time_str = meeting_data.get('time')
    duration_minutes = meeting_data.get('duration_minutes', 60)
    tz_name = meeting_data.get('timezone_name') or 'UTC'

    time_str_cleaned = time_str.strip()
    try:
        try:
            start_dt = dt.datetime.strptime(f"{date_str} {time_str_cleaned}", "%Y-%m-%d %H:%M")
        except ValueError:
            try:
                start_dt = dt.datetime.strptime(f"{date_str} {time_str_cleaned}", "%Y-%m-%d %I:%M %p")
            except ValueError:
                start_dt = dt.datetime.fromisoformat(f"{date_str}T{time_str_cleaned}")
        end_dt = start_dt + dt.timedelta(minutes=duration_minutes)
    except Exception as e:
        logger.error(f"Failed to parse dates for iCal generation: {e}")
        start_dt = dt.datetime.utcnow()
        end_dt = start_dt + dt.timedelta(minutes=duration_minutes)

    dtstart_str = start_dt.strftime("%Y%m%dT%H%M%S")
    dtend_str = end_dt.strftime("%Y%m%dT%H%M%S")
    dtstamp = dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    attendees_lines = []
    for attendee in meeting_data.get('attendees', []):
        attendees_lines.append(f"ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{attendee}")
    attendees_block = "\r\n".join(attendees_lines)

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Industrial Analytics Dashboard//EN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uuid.uuid4()}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART;TZID={tz_name}:{dtstart_str}",
        f"DTEND;TZID={tz_name}:{dtend_str}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{description} (Join at: {join_url})",
        f"LOCATION:{platform} - {join_url}",
        f"ORGANIZER;CN=Organizer:mailto:{sender_email}",
        attendees_block if attendees_lines else "",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    return "\r\n".join(line for line in ics_lines if line)

def _log_email_status(recipient, title, status, details_dict):
    """Writes email delivery audit logs directly into the database."""
    try:
        from app.core.database import SessionLocal
        from app.models.audit_log import AuditLog
        db = SessionLocal()
        try:
            log_entry = AuditLog(
                user_id="SYSTEM",
                action=status,
                module="MOM_Meetings",
                entity_id=recipient,
                details={
                    "meeting_title": title,
                    "recipient": recipient,
                    "timestamp": dt.datetime.utcnow().isoformat(),
                    **details_dict
                }
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to write email audit log: {e}")

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", 587))
        self.smtp_user = os.environ.get("SMTP_USERNAME")
        self.smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    def send_meeting_invite(self, meeting_data, join_url):
        """Send professional meeting invitation email with iCal calendar attachments using SMTP"""
        
        # Resolve SMTP Settings (Dynamic lookup with fallback)
        db_settings = {}
        try:
            from app.core.database import SessionLocal
            from app.models.settings import SystemSetting as SystemSettingModel
            db = SessionLocal()
            try:
                settings_list = db.query(SystemSettingModel).filter(
                    SystemSettingModel.key.in_(["smtp_user", "smtp_pass", "smtp_host", "smtp_port"])
                ).all()
                db_settings = {s.key: s.value for s in settings_list}
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Could not load DB SMTP settings: {e}")

        smtp_user = os.environ.get("SMTP_USERNAME") or os.environ.get("SMTP_USER") or db_settings.get("smtp_user")
        smtp_pass = os.environ.get("SMTP_PASSWORD") or db_settings.get("smtp_pass")
        smtp_host = os.environ.get("SMTP_HOST") or os.environ.get("SMTP_SERVER") or db_settings.get("smtp_host") or "smtp.gmail.com"
        port_raw = os.environ.get("SMTP_PORT") or db_settings.get("smtp_port") or 587
        try:
            smtp_port = int(port_raw)
        except (ValueError, TypeError):
            smtp_port = 587

        if not smtp_user or not smtp_pass:
            logger.warning("SMTP credentials not configured. Skipping email dispatch.")
            return

        attendees = meeting_data.get('attendees', [])
        if not attendees:
            return
            
        platform = meeting_data.get('platform', '').upper()
        title = meeting_data.get('title', 'Meeting')
        agenda_points = _format_agenda(meeting_data.get('agenda_text'))
            
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1.5px;">Meeting Invitation</p>
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1.3;">{title}</h1>
                    </td>
                  </tr>
                  
                  <!-- Details -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">When</p>
                            <p style="margin: 4px 0 0 0; font-size: 16px; color: #334155; font-weight: 500;">{meeting_data.get('date')} at {meeting_data.get('time')}</p>
                            <p style="margin: 2px 0 0 0; font-size: 14px; color: #64748b;">Duration: {meeting_data.get('duration_minutes', 60)} minutes</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Where</p>
                            <p style="margin: 4px 0 0 0; font-size: 16px; color: #334155; font-weight: 500;">{platform}</p>
                          </td>
                        </tr>
                        {f'''
                        <tr>
                          <td style="padding-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
                            <p style="margin: 4px 0 0 0; font-size: 15px; color: #334155; line-height: 1.5;">{meeting_data.get('description')}</p>
                          </td>
                        </tr>
                        ''' if meeting_data.get('description') else ""}
                      </table>
                      
                      {f'''
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-top: 10px;">
                        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0f172a;">Meeting Agenda</p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 15px; color: #334155; line-height: 1.6;">
                          {"".join(f'<li style="margin-bottom: 6px;">{point}</li>' for point in agenda_points)}
                        </ul>
                      </div>
                      ''' if agenda_points else ""}
                      
                    </td>
                  </tr>
                  
                  <!-- CTA -->
                  <tr>
                    <td align="center" style="padding: 10px 40px 40px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="background-color: #2563eb; border-radius: 6px;">
                            <a href="{join_url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Join Meeting</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Footer -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                    <td align="center" style="padding: 30px 20px;">
                      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                        This invitation was organized via <strong>Industrial Analytics Workspace</strong>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        
        try:
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
                server.starttls()
                
            sender_email = os.environ.get('SENDER_EMAIL', smtp_user)
            with server:
                server.login(smtp_user, smtp_pass)
                
                for recipient in attendees:
                    try:
                        ics_content = _generate_ics_content(meeting_data, join_url, sender_email)
                        
                        # Construct mime container
                        msg = MIMEMultipart('mixed')
                        msg['Subject'] = f"Invitation: {title}"
                        msg['From'] = sender_email
                        msg['To'] = recipient
                        
                        # Alternative body parts
                        alt_container = MIMEMultipart('alternative')
                        msg.attach(alt_container)
                        
                        html_part = MIMEText(html_content, 'html')
                        alt_container.attach(html_part)
                        
                        cal_part = MIMEText(ics_content, 'calendar; method=REQUEST; charset="UTF-8"')
                        cal_part.add_header('Content-Class', 'urn:content-classes:calendarmessage')
                        alt_container.attach(cal_part)
                        
                        # Standalone attachment
                        attachment = MIMEBase('text', 'calendar', method='REQUEST', name='invite.ics')
                        attachment.set_payload(ics_content.encode('utf-8'))
                        encoders.encode_base64(attachment)
                        attachment.add_header('Content-Disposition', 'attachment; filename="invite.ics"')
                        msg.attach(attachment)
                        
                        server.send_message(msg)
                        logger.info(f"✓ Invite sent to {recipient}")
                        
                        _log_email_status(recipient, title, "EMAIL_SENT", {
                            "smtp_host": smtp_host,
                            "smtp_port": smtp_port,
                            "platform": platform,
                            "subject": msg['Subject']
                        })
                    except Exception as e_single:
                        logger.error(f"Failed to send email to {recipient}: {e_single}")
                        _log_email_status(recipient, title, "EMAIL_FAILED", {
                            "smtp_host": smtp_host,
                            "smtp_port": smtp_port,
                            "error": str(e_single),
                            "platform": platform
                        })
                        
        except Exception as e:
            logger.error(f"✗ Failed to connect/authenticate via SMTP: {str(e)}")
            for recipient in attendees:
                _log_email_status(recipient, title, "EMAIL_FAILED", {
                    "smtp_host": smtp_host,
                    "smtp_port": smtp_port,
                    "error": f"SMTP Connection/Auth failed: {str(e)}",
                    "platform": platform
                })
            raise

email_service = EmailService()
