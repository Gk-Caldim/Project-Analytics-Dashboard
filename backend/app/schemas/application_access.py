from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ApplicationAccessBase(BaseModel):
    email: EmailStr
    employee_id: Optional[int] = None

class ApplicationAccessCreate(ApplicationAccessBase):
    password: str

class ApplicationAccessUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None

class ApplicationAccessOut(ApplicationAccessBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True
