from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.core.database import Base

class ProjectColumn(Base):
    __tablename__ = "project_columns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    column_name = Column(String, nullable=False, unique=True)
    column_label = Column(String, nullable=False)
    data_type = Column(String, nullable=False, default="text")  # text, number, date, boolean, select
    is_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)