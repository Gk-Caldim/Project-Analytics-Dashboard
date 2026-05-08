from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import Base

class MomSyncHistory(Base):
    __tablename__ = "mom_sync_history"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False, index=True)
    meeting_id = Column(String, nullable=True)
    meeting_name = Column(String, nullable=True)
    date = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    mom_output_url = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=True)
