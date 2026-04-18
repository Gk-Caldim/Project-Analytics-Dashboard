from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from app.core.database import Base

class EnterpriseLead(Base):
    __tablename__ = "enterprise_leads"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    work_email = Column(String, nullable=False, index=True)
    company = Column(String, nullable=False)
    team_size = Column(String, nullable=False)
    use_case = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String, default="NEW") # e.g. "NEW", "CONTACTED", "QUALIFIED"
    timestamp = Column(DateTime, default=datetime.utcnow)
