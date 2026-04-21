from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EnterpriseLeadBase(BaseModel):
    full_name: str
    work_email: EmailStr
    company: str
    team_size: str
    use_case: str
    message: Optional[str] = None

class EnterpriseLeadCreate(EnterpriseLeadBase):
    pass

class EnterpriseLead(EnterpriseLeadBase):
    id: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True
