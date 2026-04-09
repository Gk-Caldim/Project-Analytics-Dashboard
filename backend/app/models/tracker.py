from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class TrackerData(Base):
    __tablename__ = "trackers_data"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    module = Column(String, nullable=False)
    milestone_name = Column(String, nullable=False)
    planned_date = Column(DateTime, nullable=True)
    actual_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=True)
    delay_days = Column(Integer, default=0)
    source_row_number = Column(Integer, nullable=True)  # 0-based Excel row index
    created_at = Column(DateTime(timezone=True), server_default=func.now())
