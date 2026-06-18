"""
Quality Schemas (Pydantic)
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class QualityKPIItem(BaseModel):
    type: str            # 'FPY' | 'DPPM' | 'REJECT_RATE' | 'REWORK_RATE'
    value: float
    target: Optional[float] = None
    status: str = "on_track"  # 'on_track' | 'at_risk' | 'failed'
    line_id: Optional[str] = None


class QualityKPIResponse(BaseModel):
    project_id: int
    overall_health: str   # 'green' | 'yellow' | 'red'
    metrics: List[QualityKPIItem]


class HeatmapResponse(BaseModel):
    project_id: int
    lines: List[str]
    metrics: List[str]
    grid: List[List[Optional[float]]]
    health_grid: List[List[str]]  # 'green' | 'yellow' | 'red'


class DefectCreate(BaseModel):
    line_id: Optional[str] = None
    defect_type: str = Field(..., description="'dimensional' | 'functional' | 'cosmetic'")
    category: Optional[str] = None
    severity: int = Field(1, ge=1, le=5)
    root_cause: Optional[str] = None
    corrective_action: Optional[str] = None
    frequency: int = 1
    reported_by: Optional[str] = None


class DefectResponse(BaseModel):
    id: int
    project_id: int
    line_id: Optional[str]
    defect_type: str
    category: Optional[str]
    severity: int
    root_cause: Optional[str]
    corrective_action: Optional[str]
    frequency: int
    created_at: datetime

    class Config:
        from_attributes = True


class ParetoItem(BaseModel):
    category: str
    count: int
    pct: float
    cumulative_pct: float


class ParetoResponse(BaseModel):
    project_id: int
    patterns: List[ParetoItem]
    top_defect_type: Optional[str] = None


class LineQualityCreate(BaseModel):
    line_id: str
    fpy_rate: Optional[float] = None
    dppm: Optional[float] = None
    reject_count: int = 0
    rework_count: int = 0
    total_units: int = 0
    health_status: str = "green"
    quality_engineer: Optional[str] = None
    notes: Optional[str] = None
    metric_date: Optional[datetime] = None
