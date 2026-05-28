# app/models/password_reset_token.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from app.core.database import Base
from datetime import datetime

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    email: str = Column(String, index=True, nullable=False)
    token: str = Column(String, unique=True, index=True, nullable=False)
    expires_at: datetime = Column(DateTime, nullable=False)
    used: bool = Column(Boolean, default=False, nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
