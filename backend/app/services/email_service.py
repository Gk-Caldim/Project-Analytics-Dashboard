import smtplib
from email.message import EmailMessage
import os
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", 587))
        self.smtp_user = os.environ.get("SMTP_USERNAME")
        self.smtp_pass = os.environ.get("SMTP_PASSWORD")
    
    def send_meeting_invite(self, meeting_data, join_url):
        """Send professional meeting invitation email using SMTP"""
        
        if not self.smtp_user or not self.smtp_pass:
            logger.warning("SMTP credentials not configured. Skipping email dispatch.")
            return

        attendees = meeting_data.get('attendees', [])
        if not attendees:
            return
            
        platform = meeting_data.get('platform', '').upper()
        title = meeting_data.get('title', 'Meeting')
            
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #1f2937;">📅 {title}</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> {meeting_data.get('date')}</p>
              <p><strong>Time:</strong> {meeting_data.get('time')}</p>
              <p><strong>Duration:</strong> {meeting_data.get('duration_minutes', 60)} minutes</p>
              <p><strong>Platform:</strong> {platform}</p>
              {f"<p><strong>Description:</strong> {meeting_data.get('description')}</p>" if meeting_data.get('description') else ""}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{join_url}" style="display: inline-block; background: #4285f4; color: white; padding: 15px 40px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                Join Meeting
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 30px;">
              This meeting was organized via Antigravity
            </p>
          </body>
        </html>
        """
        
        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                
                for recipient in attendees:
                    msg = EmailMessage()
                    msg['Subject'] = f"📅 {title} - Meeting Invitation"
                    msg['From'] = os.environ.get('SENDER_EMAIL', self.smtp_user)
                    msg['To'] = recipient
                    msg.add_alternative(html_content, subtype='html')
                    
                    server.send_message(msg)
                    logger.info(f"✓ Invite sent to {recipient}")
                    
        except Exception as e:
            logger.error(f"✗ Failed to send emails via SMTP: {str(e)}")
            raise

email_service = EmailService()
