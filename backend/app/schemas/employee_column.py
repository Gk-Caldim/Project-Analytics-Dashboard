# app/schemas/employee_column.py
from pydantic import BaseModel
from datetime import datetime

class EmployeeColumnBase(BaseModel):
    column_name: str
    column_label: str
    data_type: str = "text"
    is_required: bool = False

class EmployeeColumnCreate(EmployeeColumnBase):
    pass

class EmployeeColumnUpdate(BaseModel):
    column_label: str | None = None
    data_type: str | None = None
    is_required: bool | None = None

class EmployeeColumnOut(EmployeeColumnBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
