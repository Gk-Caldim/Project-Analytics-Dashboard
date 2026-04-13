from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class MOMSave(BaseModel):
    meeting_id:   str
    meeting_name: Optional[str] = None
    project_id:   Optional[int] = None
    project_name: Optional[str] = None
    mom_data:     List[Dict[str, Any]]


class MOMOut(MOMSave):
    id:         str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
