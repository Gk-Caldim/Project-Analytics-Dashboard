# app/models/employee.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.core.database import Base
from datetime import datetime

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = Column(String, nullable=True)
    role = Column(String, nullable=True, default="User")
    status = Column(String, nullable=True, default="Active")
    modules = Column(ARRAY(String), nullable=True, default=[])
    hashed_password = Column(String, nullable=True)
    custom_fields = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
