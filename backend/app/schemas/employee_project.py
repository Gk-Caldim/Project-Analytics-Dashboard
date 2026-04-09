from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class EmployeeProjectBase(BaseModel):
    employee_id: str
    project_id: str
    role: str
    allocation_percentage: Optional[float] = 100.0
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class EmployeeProjectCreate(EmployeeProjectBase):
    pass

class EmployeeProjectUpdate(BaseModel):
    role: Optional[str] = None
    allocation_percentage: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class EmployeeProjectResponse(EmployeeProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None # Added for convenience in UI
    employee_email: Optional[str] = None
    employee_department: Optional[str] = None
    employee_role: Optional[str] = None

    class Config:
        orm_mode = True
