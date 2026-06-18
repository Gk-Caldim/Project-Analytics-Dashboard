"""
Customer Feedback Schemas (Pydantic)
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ComplaintCreate(BaseModel):
    customer_name: Optional[str] = None
    complaint_text: str = Field(..., min_length=3)
    urgency_level: str = Field("medium", description="'critical' | 'high' | 'medium' | 'low'")
    eight_d_status: Optional[str] = "open"
    created_by: Optional[str] = None


class ComplaintUpdate(BaseModel):
    urgency_level: Optional[str] = None
    eight_d_status: Optional[str] = None
    resolution_date: Optional[datetime] = None
    eight_d_report: Optional[Dict[str, Any]] = None


class ComplaintResponse(BaseModel):
    id: int
    project_id: int
    customer_name: Optional[str]
    complaint_text: str
    sentiment_score: Optional[float]
    urgency_level: str
    eight_d_status: Optional[str]
    resolution_date: Optional[datetime]
    eight_d_report: Optional[Dict[str, Any]]
    created_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SentimentTrendPoint(BaseModel):
    date: str
    sentiment_score: float
    count: int


class SentimentTrendResponse(BaseModel):
    project_id: int
    days: int
    data: List[SentimentTrendPoint]
    avg_sentiment: float
    trend_direction: str  # 'improving' | 'stable' | 'declining'


class EightDStatusResponse(BaseModel):
    project_id: int
    total_complaints: int
    closure_rate: float        # %
    avg_resolution_days: float
    escalation_rate: float     # %
    open_count: int
    in_progress_count: int
    closed_count: int
    critical_open: int
