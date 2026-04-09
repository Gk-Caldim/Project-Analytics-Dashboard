from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True) # Employee ID or User ID acting
    action = Column(String, nullable=False) # e.g. "CREATED", "UPDATED", "DELETED", "ASSIGNED"
    module = Column(String, nullable=False) # e.g. "ProjectMaster", "EmployeeMaster", "TeamManagement"
    entity_id = Column(String, nullable=True) # The ID of the generic entity acted upon
    details = Column(JSONB, default={}) # Extra structured info
    timestamp = Column(DateTime, default=datetime.utcnow)
