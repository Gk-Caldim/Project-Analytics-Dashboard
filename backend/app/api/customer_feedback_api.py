"""
Customer Feedback API
======================
Complaint logging, sentiment trend, and 8D status tracking.

Prefix: /api/customer
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.customer_feedback import (
    ComplaintCreate, ComplaintUpdate, ComplaintResponse,
    SentimentTrendResponse, EightDStatusResponse,
)
from app.services import customer_feedback_service

router = APIRouter(prefix="/customer", tags=["Customer Feedback"])


@router.post("/complaints/{project_id}", response_model=ComplaintResponse, status_code=201)
def log_complaint(
    project_id: int,
    body: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Log a customer complaint.
    Automatically computes rule-based sentiment score (ML sentiment in Phase 3).
    """
    try:
        return customer_feedback_service.log_complaint(
            db, project_id,
            complaint_text=body.complaint_text,
            customer_name=body.customer_name,
            urgency_level=body.urgency_level,
            eight_d_status=body.eight_d_status or "open",
            created_by=body.created_by or current_user.get("email"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log complaint: {e}")


@router.get("/complaints/{project_id}", response_model=List[ComplaintResponse])
def list_complaints(
    project_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all complaints for a project."""
    return customer_feedback_service.get_complaints(db, project_id, limit)


@router.put("/complaints/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(
    complaint_id: int,
    body: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update complaint urgency, 8D status, or resolution date."""
    updated = customer_feedback_service.update_complaint(
        db, complaint_id, **body.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return updated


@router.get("/sentiment-trend/{project_id}", response_model=SentimentTrendResponse)
def get_sentiment_trend(
    project_id: int,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Daily average sentiment score over last N days.
    Returns trend direction: improving | stable | declining.
    """
    try:
        return customer_feedback_service.get_sentiment_trend(db, project_id, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sentiment trend: {e}")


@router.get("/8d-status/{project_id}", response_model=EightDStatusResponse)
def get_8d_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    8D effectiveness metrics: closure rate, avg resolution days, escalation rate.
    """
    try:
        return customer_feedback_service.get_8d_status(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch 8D status: {e}")
