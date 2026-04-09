# app/schemas/role.py
from pydantic import BaseModel, field_validator
from typing import List, Optional, Any
from datetime import datetime

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    is_default: Optional[int] = 0

    @field_validator("permissions", mode="before")
    @classmethod
    def ensure_list(cls, v: Any) -> List[str]:
        if isinstance(v, dict):
            return [k for k, v in v.items() if v is True]
        if isinstance(v, list):
            return [str(p) for p in v]
        return []

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class Role(RoleBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
