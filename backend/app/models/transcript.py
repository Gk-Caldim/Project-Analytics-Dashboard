from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from datetime import datetime, timezone
import uuid

from app.core.database import Base

class Transcript(Base):
    __tablename__ = 'meeting_transcripts'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = Column(String, nullable=False, index=True, unique=True) # Linked to meeting title or ID
    
    # Store complete transcript entries as JSON
    # Format: [{"id": 123, "type": "speech", "speaker": "...", "text": "...", "time": "..."}, ...]
    transcript_data = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
