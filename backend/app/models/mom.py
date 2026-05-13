from sqlalchemy import Column, String, DateTime, Integer, JSON
from datetime import datetime, timezone
import uuid

from app.core.database import Base


class MOMSession(Base):
    __tablename__ = 'mom_sessions'

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id   = Column(String, nullable=False, index=True, unique=True)
    sync_id      = Column(String, nullable=True, index=True) # trace to sync event
    meeting_name = Column(String, nullable=True)
    project_id   = Column(Integer, nullable=True)
    project_name = Column(String, nullable=True)

    # Full array of MOM rows as JSONB
    # Format: [{ s_no, function, project_name, criticality, discussion_point,
    #            responsibility, target, status, action_taken, ... }, ...]
    mom_data     = Column(JSON, nullable=False, default=list)

    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                          onupdate=lambda: datetime.now(timezone.utc))
