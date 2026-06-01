from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    org_id = Column(Integer, primary_key=True, index=True)
    org_name = Column(String, unique=True, index=True, nullable=False)
