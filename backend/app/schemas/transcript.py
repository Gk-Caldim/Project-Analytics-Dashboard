from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class TranscriptBase(BaseModel):
    meeting_id: str
    transcript_data: List[Dict[str, Any]]

class TranscriptSave(TranscriptBase):
    pass

class TranscriptOut(TranscriptBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
