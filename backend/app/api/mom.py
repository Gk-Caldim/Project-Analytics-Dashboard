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
from app.models.meeting import Meeting
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

        # Sync with Meeting Model
        meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()
        if meeting:
            meeting.mom_generated = True
            meeting.action_item_count = len(payload.mom_data)

        db.commit()
        db.refresh(session)
        logger.info("MOM saved: meeting_id=%s rows=%d", payload.meeting_id, len(payload.mom_data))

        # Broadcast via WebSockets
        from app.api.websockets import manager
        try:
            import asyncio
            asyncio.create_task(manager.broadcast({
                "type": "MOM_SAVED",
                "meeting_id": payload.meeting_id,
                "meeting_name": session.meeting_name or meeting.title if meeting else "Untitled Meeting",
                "project_name": session.project_name or (meeting.project_id if meeting else "Unknown Project")
            }))
        except Exception as ws_e:
            logger.error(f"WebSocket broadcast failed: {ws_e}")

        return session

    except Exception as e:
        db.rollback()
        logger.error("Error saving MOM: %s\n%s", str(e), traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to save MOM: {str(e)}")


@router.delete("/{meeting_id}")
async def delete_mom(meeting_id: str, db: Session = Depends(get_db)):
    """Delete the MOMSession and reset the meeting flag."""
    try:
        session = db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="MOM session not found.")

        # Reset Meeting flag
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if meeting:
            meeting.mom_generated = False
            meeting.action_item_count = 0

        db.delete(session)
        db.commit()

        # Broadcast deletion
        from app.api.websockets import manager
        try:
            import asyncio
            asyncio.create_task(manager.broadcast({
                "type": "MOM_DELETED",
                "meeting_id": meeting_id
            }))
        except:
            pass

        return {"success": True, "message": "MOM deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Error deleting MOM: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}", response_model=MOMOut)
async def get_mom(meeting_id: str, db: Session = Depends(get_db)):
    """Fetch the MOMSession for a specific meeting_id."""
    session = db.query(MOMSession).filter(
        MOMSession.meeting_id == meeting_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="No MOM found for this meeting.")

    return session
