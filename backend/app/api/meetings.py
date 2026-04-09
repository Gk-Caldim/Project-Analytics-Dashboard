"""
meetings.py
===========

Endpoints
---------
GET  /api/meetings/               — list all meetings
GET  /api/meetings/availability   — available time slots
POST /api/meetings/publish        — create meeting on chosen platform

Google OAuth management
GET  /api/meetings/auth/google/start    — start OAuth flow (opens Google consent)
GET  /api/meetings/auth/google/callback — Google redirects here with ?code=...
GET  /api/meetings/auth/google/status   — check if Google is authenticated
POST /api/meetings/auth/google/refresh  — manually force-refresh the access token
DELETE /api/meetings/auth/google/clear  — clear stored tokens (force re-auth)

GET  /api/meetings/{meeting_id}   — get one meeting
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Any
import uuid
import os
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.meeting import Meeting
from app.services.meeting_creators import GoogleMeetCreator, MicrosoftTeamsCreator
from app.services.google_token_service import GoogleTokenService
from app.services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Google OAuth constants ────────────────────────────────────────────────────
GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES    = " ".join([
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ScheduleRequest(BaseModel):
    title: Optional[str] = "Meeting"
    description: Optional[str] = None
    date: str
    time: str
    platform: str
    duration_minutes: Optional[int] = 60
    attendees: Optional[List[Any]] = []
    agenda_text: Optional[str] = None
    timezone: Optional[str] = "UTC"
    organizer_email: Optional[str] = "unknown@example.com"

class MeetingUpdateRequest(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    platform: Optional[str] = None
    duration: Optional[int] = None
    attendees: Optional[List[Any]] = None
    agenda: Optional[List[str]] = None
    agenda_text: Optional[str] = None
    description: Optional[str] = None

class CancelRequest(BaseModel):
    reason: Optional[str] = None
    note: Optional[str] = None
    notify_attendees: Optional[bool] = True
    cancelled_by: Optional[str] = "Host"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def send_invites_background(meeting_data: dict, join_url: str):
    try:
        email_service.send_meeting_invite(meeting_data, join_url)
    except Exception as e:
        logger.error(f"Background invite task failed: {e}")


def get_teams_token() -> str:
    import requests as _req
    tenant = os.environ.get("AZURE_TENANT_ID")
    if not tenant:
        raise Exception("Azure Tenant ID not set")
    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    data = {
        "client_id":     os.environ.get("AZURE_CLIENT_ID"),
        "client_secret": os.environ.get("AZURE_CLIENT_SECRET"),
        "scope":         "https://graph.microsoft.com/.default",
        "grant_type":    "client_credentials",
    }
    resp = _req.post(token_url, data=data)
    if resp.status_code != 200:
        raise Exception("Failed to get Teams token")
    return resp.json()["access_token"]

# ---------------------------------------------------------------------------
# ── Google OAuth endpoints ──────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@router.get("/auth/google/start")
async def google_auth_start():
    """
    Redirect user to Google's OAuth consent page.
    After approval Google will redirect to /auth/google/callback with ?code=...
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=400, detail="GOOGLE_CLIENT_ID not set in .env")

    redirect_uri = os.environ.get(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/meetings/auth/google/callback"
    )

    params = (
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={GOOGLE_SCOPES.replace(' ', '%20')}"
        f"&access_type=offline"
        f"&prompt=consent"          # force Google to issue a new refresh_token
    )
    return RedirectResponse(url=GOOGLE_AUTH_URL + params)


@router.get("/auth/google/callback")
async def google_auth_callback(code: str, db: Session = Depends(get_db)):
    """
    Google redirects here after user approves.
    Exchanges the one-time code for access + refresh tokens and saves them to DB.
    """
    import requests as _req

    client_id     = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    redirect_uri  = os.environ.get(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/meetings/auth/google/callback"
    )

    resp = _req.post(GOOGLE_TOKEN_URL, data={
        "code":          code,
        "client_id":     client_id,
        "client_secret": client_secret,
        "redirect_uri":  redirect_uri,
        "grant_type":    "authorization_code",
    }, timeout=10)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to exchange code for tokens: {resp.text}"
        )

    token_data    = resp.json()
    access_token  = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "Google did not return a refresh_token. "
                "Visit /api/meetings/auth/google/clear then retry to force consent."
            )
        )

    GoogleTokenService.save(
        db,
        access_token=access_token,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
    )

    logger.info("Google OAuth tokens saved to DB.")
    return JSONResponse({
        "success": True,
        "message": "Google Meet authenticated successfully. You can now schedule meetings.",
    })


@router.get("/auth/google/status")
async def google_auth_status(db: Session = Depends(get_db)):
    """Check whether Google credentials are stored and working."""
    creds = GoogleTokenService.load(db)
    if not creds:
        return {"authenticated": False, "source": None}

    # Try a quick refresh to validate the credentials
    new_token = GoogleTokenService.refresh(creds, db=db)
    return {
        "authenticated": new_token is not None,
        "source": creds.get("source"),
        "message": "Token refreshed successfully" if new_token else "Refresh token invalid — re-authenticate",
    }


@router.post("/auth/google/refresh")
async def google_force_refresh(db: Session = Depends(get_db)):
    """Manually force-refresh the Google access token."""
    creds = GoogleTokenService.load(db)
    if not creds:
        raise HTTPException(status_code=400, detail="No Google credentials found.")

    new_token = GoogleTokenService.refresh(creds, db=db)
    if not new_token:
        raise HTTPException(
            status_code=401,
            detail="Token refresh failed — refresh token is invalid or revoked. Re-authenticate."
        )
    return {"success": True, "message": "Access token refreshed."}


@router.delete("/auth/google/clear")
async def google_clear_tokens(db: Session = Depends(get_db)):
    """
    Clear stored Google tokens.
    After this, visit /auth/google/start to re-authenticate.
    """
    cleared = GoogleTokenService.clear(db)
    return {
        "success": True,
        "cleared": cleared,
        "message": "Tokens cleared. Visit /api/meetings/auth/google/start to re-authenticate.",
    }

# ---------------------------------------------------------------------------
# ── Meeting CRUD endpoints ──────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@router.get("/")
async def list_meetings(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).all()
    results = []
    for m in meetings:
        
        # parse attendees
        attendees_list = []
        try:
            attendees_list = json.loads(m.attendees) if m.attendees else []
        except Exception:
            attendees_list = []
            
        results.append({
            "id":           m.id,
            "title":        m.title,
            "date":         m.date,
            "time":         m.time,
            "platform":     m.platform,
            "join_url":     m.join_url,
            "joinUrl":      m.join_url,
            "meeting_code": m.meeting_code,
            "meetingCode":  m.meeting_code,
            "status":       m.status,
            "duration":     m.duration_minutes,
            "attendees":    attendees_list,
            "agenda_text":  m.agenda_text,
            "action_item_count": m.action_item_count,
            "actual_duration_minutes": m.actual_duration_minutes,
            "attendance_rate": m.attendance_rate,
            "mom_generated": m.mom_generated,
        })
    return {"success": True, "meetings": results}


@router.get("/availability")
async def get_availability(date: str, attendees: str = ""):
    all_slots = [
        "09:00 AM", "10:00 AM", "11:00 AM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
    ]
    return {"success": True, "availableSlots": all_slots}


@router.post("/publish")
async def publish_meeting(
    req: ScheduleRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting_data = {
        "title":           req.title,
        "description":     req.description or "",
        "date":            req.date,
        "time":            req.time,
        "duration_minutes": req.duration_minutes,
        "platform":        req.platform,
        "attendees":       req.attendees or [],
        "timezone_name":   req.timezone,
    }

    platform   = req.platform.lower()
    join_url    = None
    meeting_code = None

    try:
        if platform in ("google", "gmeet", "meet"):
            # ── Always get a fresh token from DB / env ────────────────
            access_token = GoogleTokenService.get_fresh_access_token(db)
            creator = GoogleMeetCreator(access_token)
            result  = creator.create_meeting(meeting_data)
            join_url     = result.get("join_url")
            meeting_code = result.get("meeting_code")

        elif platform == "teams":
            teams_token = get_teams_token()
            creator = MicrosoftTeamsCreator(teams_token)
            result  = creator.create_meeting(meeting_data)
            join_url     = result.get("join_url")
            meeting_code = result.get("meeting_code")



        else:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create meeting on platform {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    meeting = Meeting(
        title=req.title,
        description=req.description,
        date=req.date,
        time=req.time,
        duration_minutes=req.duration_minutes,
        platform=platform,
        join_url=join_url,
        meeting_code=meeting_code,
        organizer_email=req.organizer_email,
        attendees=json.dumps(req.attendees),
        agenda_text=req.agenda_text,
        status="scheduled",
        invites_sent=True,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    background_tasks.add_task(send_invites_background, meeting_data, join_url)

    return {
        "success": True,
        "meeting": {
            "id":           meeting.id,
            "title":        meeting.title,
            "platform":     platform,
            "duration":     meeting.duration_minutes,
            "join_url":     join_url,
            "joinUrl":      join_url,
            "meeting_code": meeting_code,
            "meetingCode":  meeting_code,
            "attendees":    req.attendees,
            "invites_sent": meeting.invites_sent,
        },
    }


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    attendees_list = []
    try:
        attendees_list = json.loads(meeting.attendees) if meeting.attendees else []
    except Exception:
        import ast
        try:
            attendees_list = ast.literal_eval(meeting.attendees) if meeting.attendees else []
        except:
             attendees_list = [meeting.attendees] if meeting.attendees else []

    agenda_list = []
    if meeting.agenda_text:
        agenda_list = [t for t in meeting.agenda_text.split('\n') if t.strip()]

    return {
        "success": True,
        "meeting": {
            "id":           meeting.id,
            "title":        meeting.title,
            "description":  meeting.description,
            "date":         meeting.date,
            "time":         meeting.time,
            "duration":     meeting.duration_minutes,
            "platform":     meeting.platform,
            "join_url":     meeting.join_url,
            "joinUrl":      meeting.join_url,
            "meeting_code": meeting.meeting_code,
            "meetingCode":  meeting.meeting_code,
            "attendees":    attendees_list,
            "agenda":       agenda_list,
            "agenda_text":  meeting.agenda_text,
            "status":       meeting.status,
            "cancellation_reason": meeting.cancellation_reason,
            "cancellation_note": meeting.cancellation_note,
            "cancelled_by": meeting.cancelled_by,
        },
    }

@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, req: MeetingUpdateRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if req.date is not None: meeting.date = req.date
    if req.time is not None: meeting.time = req.time
    if req.platform is not None: meeting.platform = req.platform
    if req.duration is not None: meeting.duration_minutes = req.duration
    if req.attendees is not None: meeting.attendees = json.dumps(req.attendees)
    if req.description is not None: meeting.description = req.description
    
    if req.agenda_text is not None:
        meeting.agenda_text = req.agenda_text
    elif req.agenda is not None:
        # backward compat loop
        meeting.agenda_text = '\n'.join(req.agenda)
        
    db.commit()
    db.refresh(meeting)
    
    # re-fetch wrapper
    return await get_meeting(meeting.id, db=db)

@router.post("/{meeting_id}/cancel")
async def cancel_meeting(meeting_id: str, req: CancelRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "cancelled"
    meeting.cancellation_reason = req.reason
    meeting.cancellation_note = req.note
    meeting.cancelled_by = req.cancelled_by
    meeting.cancelled_at = datetime.now(timezone.utc)
    meeting.attendees_notified = req.notify_attendees
    
    db.commit()
    db.refresh(meeting)
    
    # Mocking email trigger
    if req.notify_attendees:
        logger.info(f"Triggering email notifications for meeting {meeting.id} cancellation")
        
    return {"success": True, "message": "Meeting successfully cancelled."}
