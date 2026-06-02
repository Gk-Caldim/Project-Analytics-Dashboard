from pydantic import BaseModel
from datetime import datetime

class ProjectColumnBase(BaseModel):
    column_name: str
    column_label: str
    data_type: str = "text"
    is_required: bool = False
    validation_rules: dict = {}

class ProjectColumnCreate(ProjectColumnBase):
    pass

class ProjectColumnUpdate(BaseModel):
    column_label: str | None = None
    data_type: str | None = None
    is_required: bool | None = None
    validation_rules: dict | None = None

class ProjectColumnOut(ProjectColumnBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}