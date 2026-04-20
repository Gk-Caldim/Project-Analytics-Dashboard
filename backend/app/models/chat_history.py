from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, ForeignKey
from app.core.database import Base
from datetime import datetime

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String, unique=True, index=True, nullable=False)
    user_email = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    messages = Column(JSON, nullable=False, default=[])
    pinned = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
