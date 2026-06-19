from typing import Any
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class TrackerIngestion(Base):
    __tablename__ = "tracker_ingestions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id", ondelete="CASCADE"), nullable=True)
    file_name = Column(String, nullable=False)
    data: Any = Column(JSONB, nullable=False)            # Cleaned records from IngestionEngine
    summary_data: Any = Column(JSONB, nullable=True)     # Precomputed lightweight analytics summary
    uploaded_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
