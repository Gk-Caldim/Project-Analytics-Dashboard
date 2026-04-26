from pydantic import BaseModel
from typing import Any, Dict, Optional, List

class ProjectBase(BaseModel):
    project_id: Optional[str] = None
    name: str
    status: str = "Planning"
    budget: float = 0.0
    utilized_budget: float = 0.0
    balance_budget: float = 0.0
    project_manager: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timeline_months: Optional[int] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    custom_fields: Dict[str, Any] = {}
    dashboard_config: Dict[str, Any] = {}

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int

    model_config = {"from_attributes": True}
