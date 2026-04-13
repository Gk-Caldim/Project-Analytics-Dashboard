"""
MOM (Minutes of Meeting) persistence API
=========================================
POST /api/mom/save          → upsert a MOMSession for a meeting
GET  /api/mom/{meeting_id}  → fetch MOMSession by meeting_id
"""
from __future__ import annotations

import logging
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.mom import MOMSession
from app.schemas.mom import MOMSave, MOMOut

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/save", response_model=MOMOut)
async def save_mom(payload: MOMSave, db: Session = Depends(get_db)):
    """
    Upsert MOM rows for a meeting.
    If a session for meeting_id already exists → update it.
    Otherwise → create a new one.
    """
    try:
        session = db.query(MOMSession).filter(
            MOMSession.meeting_id == payload.meeting_id
        ).first()

        if session:
            session.mom_data     = payload.mom_data
            session.meeting_name = payload.meeting_name or session.meeting_name
            session.project_id   = payload.project_id   or session.project_id
            session.project_name = payload.project_name or session.project_name
            session.updated_at   = datetime.now(timezone.utc)
        else:
            session = MOMSession(
                meeting_id   = payload.meeting_id,
                meeting_name = payload.meeting_name,
                project_id   = payload.project_id,
                project_name = payload.project_name,
                mom_data     = payload.mom_data,
            )
            db.add(session)

        db.commit()
        db.refresh(session)
        logger.info("MOM saved: meeting_id=%s rows=%d", payload.meeting_id, len(payload.mom_data))
        return session

    except Exception as e:
        db.rollback()
        logger.error("Error saving MOM: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to save MOM: {str(e)}")


@router.get("/{meeting_id}", response_model=MOMOut)
async def get_mom(meeting_id: str, db: Session = Depends(get_db)):
    """Fetch the MOMSession for a specific meeting_id."""
    session = db.query(MOMSession).filter(
        MOMSession.meeting_id == meeting_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="No MOM found for this meeting.")

    return session
