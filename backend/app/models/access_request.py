from sqlalchemy import Column, String, Integer, DateTime
from app.core.database import Base
from datetime import datetime

class AccessRequest(Base):
    __tablename__ = "access_requests"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    name: str = Column(String, nullable=False)
    email: str = Column(String, nullable=False)
    role: str = Column(String, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    status: str = Column(String, default="Pending") # Pending, Approved, Rejected
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
