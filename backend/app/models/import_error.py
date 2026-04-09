from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class ImportError(Base):
    """
    Every Excel row that fails validation is stored here.
    This makes every import fully auditable — no silent row loss.
    """
    __tablename__ = "import_errors"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, nullable=True)
    row_number = Column(Integer, nullable=False)          # 0-based Excel row index
    error_message = Column(String, nullable=False)
    raw_payload = Column(Text, nullable=True)             # JSON string of the raw row
    created_at = Column(DateTime(timezone=True), server_default=func.now())
