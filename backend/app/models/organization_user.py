from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class OrganizationUser(Base):
    __tablename__ = "organization_users"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"), nullable=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=True, default="User")
    permissions = Column(JSONB, nullable=True, default=[])
