# app/models/password_reset.py
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from app.core.database import Base
from datetime import datetime

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, index=True, nullable=False)
    hashed_otp = Column(String, nullable=False)
    reset_token = Column(String, unique=True, index=True, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
