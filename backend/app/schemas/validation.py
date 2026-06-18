"""
Validation Schemas (Pydantic)
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class ChecklistItemSchema(BaseModel):
    name: str
    complete: bool = False
    due_date: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class ValidationChecklistCreate(BaseModel):
    stage_type: str = Field(..., description="'DV' | 'PV' | 'PPAP'")
    checklist_items: Optional[List[ChecklistItemSchema]] = []
    signed_by: Optional[str] = None


class ValidationChecklistUpdate(BaseModel):
    checklist_items: Optional[List[ChecklistItemSchema]] = None
    completion_status: Optional[float] = None
    sign_off_date: Optional[datetime] = None
    signed_by: Optional[str] = None


class ValidationChecklistResponse(BaseModel):
    id: int
    project_id: int
    stage_type: str
    checklist_items: Optional[List[Any]] = []
    completion_status: float
    sign_off_date: Optional[datetime]
    signed_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PPAPStageSubmit(BaseModel):
    submitted_by: Optional[str] = None
    notes: Optional[str] = None


class PPAPStageUpdate(BaseModel):
    status: str  # 'approved' | 'rejected'
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None


class PPAPStageResponse(BaseModel):
    id: int
    project_id: int
    level: int
    status: str
    submission_date: Optional[datetime]
    approval_date: Optional[datetime]
    rejection_reason: Optional[str]
    submitted_by: Optional[str]
    approved_by: Optional[str]

    class Config:
        from_attributes = True


class PPAPProgressResponse(BaseModel):
    project_id: int
    levels: List[PPAPStageResponse]
    overall_status: str  # 'not_started' | 'in_progress' | 'completed'


class DVResultCreate(BaseModel):
    test_name: str
    test_type: Optional[str] = "DV"
    pass_fail: bool
    test_date: Optional[datetime] = None
    findings: Optional[str] = None
    corrective_action: Optional[str] = None
    test_owner: Optional[str] = None


class DVResultResponse(BaseModel):
    id: int
    project_id: int
    test_name: str
    test_type: Optional[str]
    pass_fail: bool
    test_date: Optional[datetime]
    findings: Optional[str]
    corrective_action: Optional[str]
    test_owner: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
