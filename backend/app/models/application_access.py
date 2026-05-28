# app/models/application_access.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from app.core.database import Base
from datetime import datetime

class ApplicationAccess(Base):
    __tablename__ = "application_access"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    employee_id: int | None = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True)
    email: str = Column(String, unique=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
