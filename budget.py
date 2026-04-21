from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime

class BudgetSummaryBase(BaseModel):
    project_name: str
    uploaded_by: Optional[str] = None
    department: Optional[str] = None
    budget_data: List[List[Any]] = []

class BudgetSummaryCreate(BudgetSummaryBase):
    pass

class BudgetSummaryResponse(BudgetSummaryBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
