# app/models/employee.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.core.database import Base
from datetime import datetime
from typing import List, Dict, Any

class Employee(Base):
    __tablename__ = "employees"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    employee_id: str | None = Column(String, unique=True, nullable=True)
    name: str = Column(String, nullable=False)
    email: str = Column(String, nullable=False, unique=True)
    department_id: int | None = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department: str | None = Column(String, nullable=True)
    role: str | None = Column(String, nullable=True, default="User")
    status: str | None = Column(String, nullable=True, default="Active")
    modules: List[str] | None = Column(ARRAY(String), nullable=True, default=[])
    hashed_password: str | None = Column(String, nullable=True)
    custom_fields: Dict[str, Any] = Column(JSONB, default={})
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
