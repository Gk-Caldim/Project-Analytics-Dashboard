from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectPermissionBase(BaseModel):
    employee_id: str
    project_id: str
    can_view: bool = True
    can_edit: bool = False
    can_delete: bool = False
    can_manage_team: bool = False

class ProjectPermissionCreate(ProjectPermissionBase):
    pass

class ProjectPermissionUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None
    can_manage_team: Optional[bool] = None

class ProjectPermissionResponse(ProjectPermissionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
