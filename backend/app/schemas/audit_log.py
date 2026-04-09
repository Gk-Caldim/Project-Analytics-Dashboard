from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogBase(BaseModel):
    user_id: Optional[str] = None
    action: str
    module: str
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = {}

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: int
    timestamp: datetime
    user_name: Optional[str] = None
    user_role: Optional[str] = None

    class Config:
        orm_mode = True
