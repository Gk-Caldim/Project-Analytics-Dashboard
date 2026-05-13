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

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.mom import MOMSession
from app.models.meeting import Meeting
from app.models.project import Project
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
            session.mom_data     = payload.mom_data  # type: ignore
            session.meeting_name = payload.meeting_name or session.meeting_name  # type: ignore
            session.project_id   = payload.project_id   or session.project_id  # type: ignore
            session.project_name = payload.project_name or session.project_name  # type: ignore
            session.updated_at   = datetime.now(timezone.utc)  # type: ignore
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
            meeting.mom_generated = True  # type: ignore
            meeting.action_item_count = len(payload.mom_data)  # type: ignore

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
            meeting.mom_generated = False  # type: ignore
            meeting.action_item_count = 0  # type: ignore

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


@router.get("/all")
async def list_all_moms(
    project_id: Optional[int] = None,
    sort: Optional[str] = "date_desc",  # date_desc|date_asc|name_asc|name_desc|items_desc|items_asc
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all saved MOM sessions.
    Supports filtering by project_id, full-text search on meeting_name/project_name,
    and sorting by date, name, or action item count.
    """
    try:
        # 1. Fetch saved MOMSessions
        query = db.query(MOMSession)
        if project_id is not None:
            query = query.filter(MOMSession.project_id == project_id)
        sessions = query.all()

        results = []
        seen_meeting_ids = set()

        for s in sessions:
            seen_meeting_ids.add(s.meeting_id)
            action_count = len(s.mom_data) if isinstance(s.mom_data, list) else 0
            results.append({
                "id": s.id,
                "meeting_id": s.meeting_id,
                "meeting_name": s.meeting_name or "Untitled MOM",
                "project_id": s.project_id,
                "project_name": s.project_name or "No Project",
                "action_item_count": action_count,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
                "is_draft": False
            })

        # 2. Fetch drafted meetings (mom_generated = True)
        # Use explicit column selection — avoids pulling unmigrated columns
        # (e.g. transcript, intelligence_data) that may not exist in the DB yet.
        from sqlalchemy import select as sa_select, true
        draft_cols = sa_select(
            Meeting.id,
            Meeting.title,
            Meeting.project_id,
            Meeting.action_item_count,
            Meeting.created_at,
            Meeting.updated_at,
            Project.name.label("p_name"),
        ).outerjoin(Project, Meeting.project_id == Project.id)\
         .where(Meeting.mom_generated == true())

        if project_id is not None:
            draft_cols = draft_cols.where(Meeting.project_id == project_id)

        drafts = db.execute(draft_cols).fetchall()

        for row in drafts:
            if row.id in seen_meeting_ids:
                continue
            results.append({
                "id":               f"draft-{row.id}",
                "meeting_id":       row.id,
                "meeting_name":     row.title or "Untitled Draft",
                "project_id":       row.project_id,
                "project_name":     row.p_name or "No Project",
                "action_item_count": row.action_item_count or 0,
                "created_at":       row.created_at,
                "updated_at":       row.updated_at,
                "is_draft":         True,
            })


        # 3. Apply Search Filter
        if search:
            search_lower = search.strip().lower()
            results = [
                r for r in results
                if search_lower in (r["meeting_name"] or "").lower()
                or search_lower in (r["project_name"] or "").lower()
            ]

        # 4. Sorting logic
        if sort == "date_desc":
            results.sort(key=lambda r: r["updated_at"] or datetime.min, reverse=True)
        elif sort == "date_asc":
            results.sort(key=lambda r: r["updated_at"] or datetime.max)
        elif sort == "name_asc":
            results.sort(key=lambda r: (r["meeting_name"] or "").lower())
        elif sort == "name_desc":
            results.sort(key=lambda r: (r["meeting_name"] or "").lower(), reverse=True)
        elif sort == "items_desc":
            results.sort(key=lambda r: r["action_item_count"], reverse=True)
        elif sort == "items_asc":
            results.sort(key=lambda r: r["action_item_count"])

        # 5. Format for JSON
        for r in results:
            if isinstance(r["created_at"], datetime):
                r["created_at"] = r["created_at"].isoformat()
            if isinstance(r["updated_at"], datetime):
                r["updated_at"] = r["updated_at"].isoformat()

        return {"success": True, "total": len(results), "moms": results}

    except Exception as e:
        logger.error("Error listing MOMs: %s", str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}", response_model=MOMOut)
async def get_mom(meeting_id: str, db: Session = Depends(get_db)):
    """Fetch the MOMSession for a specific meeting_id."""
    if meeting_id in ("unscheduled", "unscheduled-session"):
        return {
            "meeting_id": meeting_id,
            "meeting_name": "Unscheduled Session",
            "mom_data": [],
            "project_id": None,
            "project_name": "No Project"
        }

    session = db.query(MOMSession).filter(
        MOMSession.meeting_id == meeting_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="No MOM found for this meeting.")

    return session

@router.post("/{meeting_id}/broadcast")
async def broadcast_mom(meeting_id: str, db: Session = Depends(get_db)):
    """Broadcast MOM to attendees."""
    session = db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id).first()
    if not session:
         raise HTTPException(status_code=404, detail="No MOM found for this meeting.")
    # In a real scenario, this would integrate with Email/Teams APIs
    # Here we simulate a successful broadcast
    return {"success": True, "message": f"MOM for {session.meeting_name} broadcasted to attendees."}
