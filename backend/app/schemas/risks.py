from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RiskCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    probability: int = Field(3, ge=1, le=5, description="Probability rating (1-5)")
    impact: int = Field(3, ge=1, le=5, description="Impact rating (1-5)")
    mitigation_action: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field("open", description="'open' | 'mitigated' | 'closed'")
    owner: Optional[str] = Field("Unassigned", max_length=100)


class RiskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    probability: Optional[int] = Field(None, ge=1, le=5)
    impact: Optional[int] = Field(None, ge=1, le=5)
    mitigation_action: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(None, description="'open' | 'mitigated' | 'closed'")
    owner: Optional[str] = Field(None, max_length=100)


class RiskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    probability: int
    impact: int
    score: int
    mitigation_action: Optional[str]
    status: str
    owner: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
