# app/api/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationOut])
def get_notifications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    notifications = db.query(Notification).filter(
        Notification.recipient_email == email
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications

@router.put("/mark-all-read")
def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="User email not found in token")
    
    db.query(Notification).filter(
        Notification.recipient_email == email,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    
    db.commit()
    return {"message": "All notifications marked as read"}

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email = current_user.get("email")
    
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_email == email
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
