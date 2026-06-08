from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum

class TaskType(str, enum.Enum):
    PHASE = "phase"
    ACTIVITY = "activity"
    SUB_ACTIVITY = "sub_activity"
    MILESTONE = "milestone"


# Milestone Custom Columns
class MilestoneColumnBase(BaseModel):
    column_name: str
    column_label: str
    data_type: str = "text"
    options: Optional[List[str]] = []

class MilestoneColumnCreate(MilestoneColumnBase):
    pass

class MilestoneColumnResponse(MilestoneColumnBase):
    id: int
    project_id: str

    class Config:
        from_attributes = True

# Project Release
class ReleaseBase(BaseModel):
    name: str
    version: Optional[str] = None
    status: str = "Planning"
    release_date: Optional[datetime] = None

class ReleaseCreate(ReleaseBase):
    pass

class ReleaseResponse(ReleaseBase):
    id: int
    project_id: str

    class Config:
        from_attributes = True

# Task Follow-up
class FollowupBase(BaseModel):
    follow_up_date: Optional[datetime] = None
    owner: Optional[str] = None
    status: str = "Open"
    notes: Optional[str] = None

class FollowupCreate(FollowupBase):
    task_id: int

class FollowupResponse(FollowupBase):
    id: int
    task_id: int

    class Config:
        from_attributes = True

# Task Baseline
class BaselineBase(BaseModel):
    baseline_version: str = "Baseline_V1"
    baseline_start: Optional[datetime] = None
    baseline_end: Optional[datetime] = None

class BaselineCreate(BaselineBase):
    task_id: int

class BaselineResponse(BaselineBase):
    id: int
    task_id: int

    class Config:
        from_attributes = True

# Project Dependency
class DependencyBase(BaseModel):
    predecessor_task_id: int
    successor_task_id: int
    type: str = "FS"  # FS, SS, FF, SF
    lag_days: int = 0

class DependencyCreate(DependencyBase):
    pass

class DependencyResponse(DependencyBase):
    id: int
    project_id: str

    class Config:
        from_attributes = True

# Project Milestone / WBS Node
class MilestoneBase(BaseModel):
    parent_id: Optional[int] = None
    task_type: Optional[TaskType] = None
    wbs_code: Optional[str] = None
    item_type: str = "Task"  # Phase, Milestone, Task, Sub Task, Deliverable, Approval Gate
    activity_name: str
    row_order: int = 0
    indent_level: int = 0
    department: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    complete_percent: float = 0.0
    status: str = "Not Started"
    assigned_to: Optional[List[str]] = []
    is_critical: bool = False
    total_float_days: float = 0.0
    custom_values: Dict[str, Any] = {}

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(MilestoneBase):
    pass

class MilestoneResponse(MilestoneBase):
    id: int
    project_id: str
    dependencies_as_successor: List[DependencyResponse] = []
    baselines: List[BaselineResponse] = []
    followups: List[FollowupResponse] = []

    class Config:
        from_attributes = True

# Bulk save structures
class BulkSaveMilestonesRequest(BaseModel):
    milestones: List[MilestoneResponse]
    dependencies: List[DependencyBase]
