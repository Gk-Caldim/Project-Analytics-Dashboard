from typing import Any
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base

class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    file_name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    row_count = Column(Integer, nullable=True)          # raw Excel rows (excl. header)
    valid_row_count = Column(Integer, nullable=True)    # rows successfully inserted
    invalid_row_count = Column(Integer, nullable=True)  # rows that failed / were skipped
    status = Column(String, default="Processing")       # Processing | Completed | Failed
    uploaded_by = Column(String, nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="SET NULL"), nullable=True)
    file_data: Any = Column(JSONB, nullable=True)            # Ingested data stored as JSONB
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
