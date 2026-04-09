from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean
from datetime import datetime, timezone
import uuid

from app.core.database import Base

class Meeting(Base):
    __tablename__ = 'meetings'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True, index=True) # Optional now that we're centralizing
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Date & Time
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    time = Column(String(10), nullable=False)   # HH:MM
    duration_minutes = Column(Integer, default=60)
    timezone_name = Column(String(50), default='UTC')
    
    # Platform & Credentials
    platform = Column(String(20), nullable=False)  # 'gmeet', 'teams'
    meeting_id = Column(String(100), nullable=True)  # Legacy local reference
    meeting_code = Column(String(100), nullable=True) # Real platform ID
    meeting_password = Column(String(100), nullable=True)
    join_url = Column(String(500), nullable=True)
    google_calendar_event_id = Column(String(100), nullable=True)
    
    # Attendees
    organizer_email = Column(String, nullable=True)
    attendees = Column(Text, nullable=True)  # JSON list of emails as string
    
    # Status & Cancellation
    status = Column(String(20), default='scheduled')  # scheduled, completed, cancelled, archived
    invites_sent = Column(Boolean, default=False)
    
    # Cancellation Details
    cancellation_reason = Column(String(100), nullable=True)
    cancellation_note = Column(Text, nullable=True)
    cancelled_by = Column(String(100), nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    attendees_notified = Column(Boolean, default=False)
    
    # Advanced / Rich content
    agenda_text = Column(Text, nullable=True)
    
    # Analytics
    actual_duration_minutes = Column(Integer, nullable=True)
    attendance_rate = Column(Integer, nullable=True) # 0 to 100
    mom_generated = Column(Boolean, default=False)
    action_item_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
