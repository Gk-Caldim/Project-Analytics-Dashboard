from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base

class ProjectSubCategory(Base):
    __tablename__ = "project_sub_categories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    phase = Column(String, nullable=True)
    category = Column(String, nullable=True)
    sub_category = Column(String, nullable=False)
    assigned_employees = Column(JSONB, default=[])
    unit_type = Column(String, nullable=True)
    no_of_counts_per_unit = Column(Float, default=0.0)
    estimated_value = Column(Float, default=0.0)
    utilized_value = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    department = Column(String, nullable=True)
    custom_fields = Column(JSONB, default={})

    # Relationship to Project model
    project = relationship("Project", backref="sub_categories")
