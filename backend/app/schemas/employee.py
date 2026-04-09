# app/schemas/employee.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class EmployeeBase(BaseModel):
    employee_id: str | None = None
    name: str
    email: EmailStr
    department: str | None = None
    role: str | None = "User"
    status: str = "Active"
    modules: list[str] = []
    custom_fields: dict = {}

class EmployeeCreate(EmployeeBase):
    id: int | None = None
    password: str | None = None

class EmployeeUpdate(BaseModel):
    id: int | None = None
    employee_id: str | None = None
    name: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    role: str | None = None
    status: str | None = None
    modules: list[str] | None = None
    password: str | None = None
    custom_fields: dict | None = None

class EmployeeOut(EmployeeBase):
    id: int
    project_name: str | None = "not assigned"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
