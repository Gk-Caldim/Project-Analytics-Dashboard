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
    project_manager = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    timeline_months = Column(Integer, nullable=True)
    department = Column(String, nullable=True)
    employee_id = Column(String, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    employee_name = Column(String, nullable=True)
    assigned_to_id = Column(String, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    assigned_to_name = Column(String, nullable=True)
    custom_fields = Column(JSONB, default={})
    dashboard_config = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Employee model
    employee = relationship("Employee", foreign_keys=[employee_id], primaryjoin="Project.employee_id == Employee.employee_id")

    # Cascade relationships
    sub_categories = relationship(
        "ProjectSubCategory",
        back_populates="project",
        cascade="all, delete-orphan",
        primaryjoin="Project.project_id == ProjectSubCategory.project_id",
        foreign_keys="[ProjectSubCategory.project_id]"
    )
    allocations = relationship(
        "EmployeeProjectMap",
        back_populates="project",
        cascade="all, delete-orphan",
        primaryjoin="Project.project_id == EmployeeProjectMap.project_id",
        foreign_keys="[EmployeeProjectMap.project_id]"
    )
