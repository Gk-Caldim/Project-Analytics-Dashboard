from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ApplicationAccessBase(BaseModel):
    email: EmailStr
    employee_id: Optional[int] = None

class ApplicationAccessCreate(ApplicationAccessBase):
    password: str
    confirm_password: Optional[str] = None

class ApplicationAccessUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    confirm_password: Optional[str] = None

class ApplicationAccessOut(ApplicationAccessBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    role: Optional[str] = None
    username: Optional[str] = None
    is_active: bool = True
    date_joined: datetime = None

    class Config:
        from_attributes = True

class AccessRequestCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    password: str
    confirm_password: str

class AccessRequestOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime
    is_employee_match: bool = False

    class Config:
        from_attributes = True
