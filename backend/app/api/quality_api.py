"""
Quality API
============
Quality KPI aggregation, line-wise heatmap, defect logging, and Pareto analysis.

Prefix: /api/quality
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.quality import (
    QualityKPIResponse, HeatmapResponse, DefectCreate, DefectResponse,
    ParetoResponse, LineQualityCreate,
)
from app.services import quality_service

router = APIRouter(prefix="/quality", tags=["Quality"])


@router.get("/kpis/{project_id}", response_model=QualityKPIResponse)
def get_quality_kpis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Aggregate quality KPIs (FPY, DPPM, REJECT_RATE) for a project.
    Returns overall health status + per-metric breakdown.
    """
    try:
        return quality_service.get_quality_kpis(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quality KPIs: {e}")


@router.get("/heatmap/{project_id}", response_model=HeatmapResponse)
def get_quality_heatmap(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Line-wise quality heatmap grid (lines × metrics).
    Each cell contains a metric value and health status (green/yellow/red).
    """
    try:
        return quality_service.get_quality_heatmap(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quality heatmap: {e}")


@router.post("/defect/{project_id}", response_model=DefectResponse, status_code=201)
def log_defect(
    project_id: int,
    body: DefectCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Log a new defect for a project."""
    try:
        return quality_service.log_defect(db, project_id, **body.model_dump(exclude_unset=True))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log defect: {e}")


@router.get("/defects/{project_id}", response_model=List[DefectResponse])
def list_defects(
    project_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List recent defects for a project."""
    return quality_service.get_defects(db, project_id, limit)


@router.get("/defect-analysis/patterns", response_model=ParetoResponse)
def get_defect_patterns(
    project_id: int = Query(..., description="Project ID"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get Pareto chart data for defect analysis.
    Returns categories sorted by frequency with cumulative percentages.
    """
    try:
        return quality_service.get_pareto_patterns(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch defect patterns: {e}")


@router.post("/line-metrics/{project_id}", status_code=201)
def log_line_quality(
    project_id: int,
    body: LineQualityCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Log quality metrics for a specific production line."""
    try:
        metric = quality_service.log_line_quality(db, project_id, **body.model_dump(exclude_unset=True))
        return {"id": metric.id, "message": "Line quality metric logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log line quality: {e}")
