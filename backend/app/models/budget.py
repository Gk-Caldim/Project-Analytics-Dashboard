from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base


class BudgetSummary(Base):
    __tablename__ = "budget_summaries"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, index=True, nullable=False)
    budget_date = Column(String, nullable=True)  # YYYY-MM-DD
    uploaded_by = Column(String)
    department = Column(String)
    overall_budget = Column(Float, default=0.0)
    budget_data = Column(JSONB, default=[])
    attachment_name = Column(String, nullable=True)
    attachment_data = Column(Text, nullable=True)  # base64 encoded file
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class BudgetRevision(Base):
    __tablename__ = "budget_revisions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, nullable=True)
    project_name = Column(String, nullable=False, index=True)
    pm_name = Column(String, nullable=True)
    previous_budget = Column(Float, default=0.0)
    revised_budget = Column(Float, default=0.0)
    reasons = Column(Text, nullable=True)
    status = Column(String, default="Pending Head")  # Pending Head, Pending Finance, Approved, Declined, Cancelled, In Waiting Period
    attachment_name = Column(String, nullable=True)
    attachment_data = Column(Text, nullable=True)  # base64 encoded file
    waiting_until = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    approved_at = Column(DateTime, nullable=True)

