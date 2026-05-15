# scripts/seed_notifications.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.notification import Notification
from app.models.employee import Employee

def seed_notifications():
    db = SessionLocal()
    try:
        # Get some target emails
        employees = db.query(Employee).filter(Employee.role.in_(["Admin", "Super Admin"])).all()
        target_emails = [emp.email for emp in employees]
        
        # Add a few more common ones just in case
        extra_emails = ["superadmin@caldim.com", "preethi@caldim.in", "gokul@caldim.in"]
        for email in extra_emails:
            if email not in target_emails:
                target_emails.append(email)
        
        print(f"Seeding notifications for: {target_emails}")
        
        notifications_data = [
            {
                "title": "Project Alpha Updated",
                "description": "The milestone 'Development Finish' has been marked as complete.",
                "type": "project"
            },
            {
                "title": "New Meeting Scheduled",
                "description": "Q2 Strategy Review meeting has been scheduled for tomorrow at 10:00 AM.",
                "type": "meeting"
            },
            {
                "title": "System Update",
                "description": "The platform will undergo maintenance on Sunday at 2:00 AM.",
                "type": "system"
            },
            {
                "title": "Issue Escalated",
                "description": "A high-priority issue in Project Beta has been escalated to you.",
                "type": "issue"
            }
        ]
        
        for email in target_emails:
            # Check if they already have these notifications to avoid duplicates
            existing_count = db.query(Notification).filter(Notification.recipient_email == email).count()
            if existing_count > 0:
                print(f"Skipping {email}, already has notifications.")
                continue
                
            for data in notifications_data:
                notif = Notification(
                    recipient_email=email,
                    title=data["title"],
                    description=data["description"],
                    type=data["type"],
                    is_read=False
                )
                db.add(notif)
        
        db.commit()
        print("Seeding completed successfully!")
        
    except Exception as e:
        print(f"Error seeding notifications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_notifications()
