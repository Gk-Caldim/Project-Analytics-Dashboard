from pydantic import BaseModel
from typing import List, Any, Optional, Dict
from datetime import datetime


# ─── Budget Summary Schemas ──────────────────────────────────────────────────

class BudgetSummaryBase(BaseModel):
    project_name: str
    uploaded_by: Optional[str] = None
    department: Optional[str] = None
    overall_budget: Optional[float] = 0.0
    budget_data: Optional[List[Any]] = []
    attachment_name: Optional[str] = None


class BudgetSummaryCreate(BudgetSummaryBase):
    pass


class BudgetSummaryResponse(BudgetSummaryBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Budget Revision Schemas ──────────────────────────────────────────────────

class BudgetRevisionBase(BaseModel):
    project_id: Optional[str] = None
    project_name: str
    pm_name: Optional[str] = None
    previous_budget: Optional[float] = 0.0
    revised_budget: Optional[float] = 0.0
    reasons: Optional[str] = None
    status: Optional[str] = "Pending Head"
    attachment_name: Optional[str] = None
    waiting_until: Optional[str] = None


class BudgetRevisionCreate(BudgetRevisionBase):
    pass


class BudgetRevisionUpdate(BaseModel):
    status: Optional[str] = None
    waiting_until: Optional[str] = None


class BudgetRevisionResponse(BudgetRevisionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
