# models/dataset.py
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint
from datetime import datetime
from app.core.database import Base

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    file_type = Column(String)
    row_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project_id = Column(Integer, nullable=True)
    project = Column(String, nullable=True)
    department = Column(String, nullable=True)
    uploaded_by = Column(String, nullable=True)
    table_name = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('project', 'department', 'name', name='uq_project_dept_filename'),
    )
