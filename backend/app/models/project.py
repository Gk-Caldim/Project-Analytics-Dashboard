from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="Planning")
    budget = Column(Float, default=0.0)
    utilized_budget = Column(Float, default=0.0)
    balance_budget = Column(Float, default=0.0)
    timeline = Column(String, nullable=True)
    started_date = Column(DateTime, nullable=True)
    employee_id = Column(String, ForeignKey("employees.employee_id"), nullable=True)
    employee_name = Column(String, nullable=True)
    custom_fields = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Employee model
    employee = relationship("Employee", foreign_keys=[employee_id], primaryjoin="Project.employee_id == Employee.employee_id")
