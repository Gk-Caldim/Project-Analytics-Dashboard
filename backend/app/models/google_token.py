from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime, timezone
from app.core.database import Base


class GoogleToken(Base):
    """
    Stores Google OAuth tokens so they persist across server restarts
    and can be refreshed automatically without re-running get_google_tokens.py.
    Only one row is kept (id='default').
    """
    __tablename__ = "google_tokens"

    id = Column(String, primary_key=True, default="default")
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=False)
    client_id = Column(String(200), nullable=False)
    client_secret = Column(String(200), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
