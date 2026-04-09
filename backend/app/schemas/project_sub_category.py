from pydantic import BaseModel
from typing import Optional, Any, Dict

class SubCategoryBase(BaseModel):
    project_id: str
    sub_category: str
    unit_type: Optional[str] = None
    no_of_counts_per_unit: float = 0.0
    estimated_value: float = 0.0
    utilized_value: float = 0.0
    balance: float = 0.0
    department: Optional[str] = None
    custom_fields: Dict[str, Any] = {}



class SubCategoryCreate(SubCategoryBase):
    pass

class SubCategoryUpdate(BaseModel):
    sub_category: Optional[str] = None
    unit_type: Optional[str] = None
    no_of_counts_per_unit: Optional[float] = None
    estimated_value: Optional[float] = None
    utilized_value: Optional[float] = None
    balance: Optional[float] = None
    department: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None

class SubCategoryResponse(SubCategoryBase):
    id: int

    model_config = {"from_attributes": True}
