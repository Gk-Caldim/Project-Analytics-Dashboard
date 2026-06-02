# app/schemas/notification.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: Optional[str] = None # 'project', 'meeting', 'issue', 'system'

class NotificationCreate(NotificationBase):
    recipient_email: EmailStr

class NotificationOut(NotificationBase):
    id: int
    recipient_email: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
