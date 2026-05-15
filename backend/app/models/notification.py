# app/models/notification.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_email = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(50), nullable=True) # 'project', 'meeting', 'issue', 'system'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
