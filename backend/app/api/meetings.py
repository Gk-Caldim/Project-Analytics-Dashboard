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

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import uuid
import os
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.meeting import Meeting
from app.models.project import Project
from app.services.meeting_creators import GoogleMeetCreator, MicrosoftTeamsCreator, ZoomMeetingCreator
from app.services.google_token_service import GoogleTokenService
from app.core.security import get_current_user
from app.services.email_service import email_service
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Google OAuth constants ────────────────────────────────────────────────────
GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES    = " ".join([
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
])

import calendar
from datetime import timedelta

def get_nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> datetime:
    cal = calendar.Calendar(firstweekday=0)
    month_days = cal.monthdatescalendar(year, month)
    matching_days = []
    for week in month_days:
        for day in week:
            if day.month == month and day.weekday() == weekday:
                matching_days.append(day)
    if n == -1 or n == 5:
        return datetime(year, month, matching_days[-1].day)
    else:
        idx = min(n - 1, len(matching_days) - 1)
        return datetime(year, month, matching_days[idx].day)

def parse_recurrence_pattern(start_date: datetime):
    weekday = start_date.weekday()
    day = start_date.day
    year = start_date.year
    month = start_date.month
    cal = calendar.Calendar(firstweekday=0)
    month_days = cal.monthdatescalendar(year, month)
    matching_days = []
    for week in month_days:
        for day_obj in week:
            if day_obj.month == month and day_obj.weekday() == weekday:
                matching_days.append(day_obj.day)
    n = matching_days.index(day) + 1
    is_last = (n == len(matching_days))
    return weekday, n, is_last

def generate_recurring_dates(start_date_str: str, rule: str) -> list[str]:
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except Exception:
        # Fallback if date is ISO datetime string
        start_date = datetime.fromisoformat(start_date_str.split("T")[0])
        
    dates = []
    curr = start_date
    rule = rule.lower()
    
    if rule == "daily":
        count = 10
        for _ in range(count - 1):
            curr += timedelta(days=1)
            dates.append(curr.strftime("%Y-%m-%d"))
    elif rule == "weekly":
        count = 10
        for _ in range(count - 1):
            curr += timedelta(weeks=1)
            dates.append(curr.strftime("%Y-%m-%d"))
    elif rule == "every_weekday":
        count = 10
        inserted = 0
        while inserted < count - 1:
            curr += timedelta(days=1)
            if curr.weekday() < 5:
                dates.append(curr.strftime("%Y-%m-%d"))
                inserted += 1
    elif rule == "monthly_day":
        count = 6
        target_day = start_date.day
        for _ in range(count - 1):
            year = curr.year
            month = curr.month + 1
            if month > 12:
                month = 1
                year += 1
            _, last_day = calendar.monthrange(year, month)
            day = min(target_day, last_day)
            curr = datetime(year, month, day)
            dates.append(curr.strftime("%Y-%m-%d"))
    elif rule == "monthly_weekday":
        count = 6
        weekday, n, is_last = parse_recurrence_pattern(start_date)
        for _ in range(count - 1):
            year = curr.year
            month = curr.month + 1
            if month > 12:
                month = 1
                year += 1
            nth_date = get_nth_weekday_of_month(year, month, weekday, -1 if is_last else n)
            curr = nth_date
            dates.append(curr.strftime("%Y-%m-%d"))
    elif rule == "yearly":
        count = 3
        target_month = start_date.month
        target_day = start_date.day
        for _ in range(count - 1):
            year = curr.year + 1
            _, last_day = calendar.monthrange(year, target_month)
            day = min(target_day, last_day)
            curr = datetime(year, target_month, day)
            dates.append(curr.strftime("%Y-%m-%d"))
            
    return dates

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
    project_id: Optional[int] = None
    reminder_minutes: Optional[int] = None
    reminder_notify_attendees: Optional[bool] = True
    recurrence_rule: Optional[str] = None

class MeetingUpdateRequest(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    platform: Optional[str] = None
    duration: Optional[int] = None
    attendees: Optional[List[Any]] = None
    agenda: Optional[List[str]] = None
    agenda_text: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    reminder_minutes: Optional[int] = None
    reminder_notify_attendees: Optional[bool] = None
    notes: Optional[str] = None
    intelligence_data: Optional[str] = None
    action_item_count: Optional[int] = None
    project_id: Optional[Any] = None
    recurrence_rule: Optional[str] = None

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
    # Extract tenant ID from MS_AUTHORITY (e.g. https://login.microsoftonline.com/TENANT_ID)
    authority = os.environ.get("MS_AUTHORITY") or ""
    tenant = authority.split("/")[-1] if "/" in authority else os.environ.get("AZURE_TENANT_ID")
    
    client_id = os.environ.get("MS_CLIENT_ID") or os.environ.get("AZURE_CLIENT_ID")
    client_secret = os.environ.get("MS_CLIENT_SECRET") or os.environ.get("AZURE_CLIENT_SECRET")

    if not tenant or not client_id or not client_secret:
        raise Exception("Microsoft Teams credentials (Tenant/Client ID/Secret) not fully set in .env")

    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    data = {
        "client_id":     client_id,
        "client_secret": client_secret,
        "scope":         "https://graph.microsoft.com/.default",
        "grant_type":    "client_credentials",
    }
    resp = _req.post(token_url, data=data)
    if resp.status_code != 200:
        raise Exception(f"Failed to get Teams token: {resp.text}")
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
        client_id=cast(str, client_id),
        client_secret=cast(str, client_secret),
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
# ── Zoom OAuth / Credential status ─────────────────────────────────────────
# ---------------------------------------------------------------------------

def _get_zoom_credentials() -> tuple[str | None, str | None, str | None]:
    """Read Zoom Server-to-Server OAuth credentials from environment variables."""
    return (
        os.environ.get("ZOOM_ACCOUNT_ID"),
        os.environ.get("ZOOM_CLIENT_ID"),
        os.environ.get("ZOOM_CLIENT_SECRET"),
    )


@router.get("/auth/zoom/status")
async def zoom_auth_status():
    """
    Check whether Zoom Server-to-Server OAuth credentials are configured
    in environment variables.  Does NOT attempt a live token fetch to keep
    this endpoint fast and side-effect-free.

    Returns:
        { configured: bool, missing_vars: list[str] }
    """
    account_id, client_id, client_secret = _get_zoom_credentials()
    missing = []
    if not account_id:
        missing.append("ZOOM_ACCOUNT_ID")
    if not client_id:
        missing.append("ZOOM_CLIENT_ID")
    if not client_secret:
        missing.append("ZOOM_CLIENT_SECRET")

    return {
        "configured": len(missing) == 0,
        "missing_vars": missing,
        "message": (
            "All Zoom credentials are configured."
            if not missing
            else f"Missing environment variables: {', '.join(missing)}.  "
                 f"Set them in your .env file and restart the server."
        ),
    }


# ---------------------------------------------------------------------------
# ── Meeting CRUD endpoints ──────────────────────────────────────────────────
# ---------------------------------------------------------------------------

@router.get("")
@router.get("/")
async def list_meetings(db: Session = Depends(get_db)):
    try:
        meetings = db.query(Meeting).all()
        results = []
        for m in meetings:
            
            # parse attendees
            attendees_list = []
            try:
                attendees_list = json.loads(cast(str, m.attendees)) if m.attendees else []
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
                "project_id":    m.project_id,
                "recurrence_rule": m.recurrence_rule,
                "recurrence_group_id": m.recurrence_group_id,
            })
        return {"success": True, "meetings": results}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"[meetings/list] Error: {e}", exc_info=True
        )
        # Return empty list — do not crash. Frontend handles empty gracefully.
        return {"success": True, "meetings": []}


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
        "agenda_text":     req.agenda_text or "",
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

        elif platform == "zoom":
            account_id, client_id, client_secret = _get_zoom_credentials()
            if not account_id or not client_id or not client_secret:
                import random
                mock_id = "".join(random.choices("0123456789", k=11))
                # Use Zoom's official test URL as the join link to prevent the "invalid link (3001)" Zoom page
                join_url = "https://zoom.us/test"
                meeting_code = mock_id
            else:
                try:
                    creator = ZoomMeetingCreator(account_id, client_id, client_secret)
                    result = creator.create_meeting(meeting_data)
                    join_url     = result.get("join_url")
                    meeting_code = result.get("meeting_code")
                except Exception as e:
                    logger.error(f"Real Zoom creation failed, falling back to mock: {e}")
                    import random
                    mock_id = "".join(random.choices("0123456789", k=11))
                    join_url = "https://zoom.us/test"
                    meeting_code = mock_id

        else:
            # For other platforms (Zoho, etc.), we don't have automated creators yet.
            # We skip link generation and just save the meeting record.
            logger.info(f"Skipping link generation for platform: {platform}")

        # ── Database Persistence ──────────────────────────────────────────
        # Defensive session reset: GoogleTokenService may have committed inside
        # this session (to persist a fresh access token). On Supabase PgBouncer
        # transaction mode, calling expire_all() ensures the session is in a
        # clean state before we start the Meeting insert transaction.
        # This is a no-op when no prior commits occurred.
        db.expire_all()
        
        recurrence_group_id = None
        if req.recurrence_rule and req.recurrence_rule.lower() != "none":
            recurrence_group_id = str(uuid.uuid4())
            
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
            project_id=req.project_id,
            reminder_minutes=req.reminder_minutes,
            reminder_notify_attendees=req.reminder_notify_attendees,
            recurrence_rule=req.recurrence_rule,
            recurrence_group_id=recurrence_group_id,
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        if recurrence_group_id:
            try:
                future_dates = generate_recurring_dates(req.date, req.recurrence_rule)
                for date_str in future_dates:
                    cloned = Meeting(
                        title=req.title,
                        description=req.description,
                        date=date_str,
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
                        project_id=req.project_id,
                        reminder_minutes=req.reminder_minutes,
                        reminder_notify_attendees=req.reminder_notify_attendees,
                        recurrence_rule=req.recurrence_rule,
                        recurrence_group_id=recurrence_group_id,
                    )
                    db.add(cloned)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to generate future recurring instances: {e}")

        background_tasks.add_task(send_invites_background, meeting_data, cast(str, join_url))

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
                "project_id":   meeting.project_id,
            },
        }

    except Exception as e:
        import traceback
        error_detail = str(e)
        
        logger.error(f"Meeting creation failed: {error_detail}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": error_detail,
                "trace": traceback.format_exc()
            }
        )


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    # Handle placeholder IDs from frontend to prevent DB errors and 404 logs
    if meeting_id in ("unscheduled", "unscheduled-session") or meeting_id.startswith("sync-"):
        from app.models.mom import MOMSession
        session = db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id).first()
        return {
            "success": True,
            "meeting": {
                "id": meeting_id,
                "title": session.meeting_name if session else "Unscheduled Session",
                "description": "This meeting was captured without a schedule." if not meeting_id.startswith("sync-") else "This standalone meeting was saved and captured.",
                "date": str(session.created_at.date()) if session and session.created_at else str(datetime.now().date()),
                "time": session.created_at.strftime("%I:%M %p") if session and session.created_at else datetime.now().strftime("%I:%M %p"),
                "duration": 0,
                "platform": "manual",
                "join_url": None,
                "joinUrl": None,
                "meeting_code": None,
                "meetingCode": None,
                "attendees": [],
                "agenda": [],
                "agenda_text": "",
                "status": "completed",
                "project_id": session.project_id if session else None,
                "project_name": session.project_name if session else "No Project",
                "transcript": [],
                "intelligence_data": None,
            }
        }

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    attendees_list = []
    try:
        attendees_list = json.loads(cast(str, meeting.attendees)) if meeting.attendees else []
    except Exception:
        import ast
        try:
            attendees_list = ast.literal_eval(cast(str, meeting.attendees)) if meeting.attendees else []
        except:
             attendees_list = [meeting.attendees] if meeting.attendees else []

    agenda_list = []
    if meeting.agenda_text:
        try:
            # Try to parse as JSON first (for rich agenda items)
            parsed = json.loads(cast(str, meeting.agenda_text))
            if isinstance(parsed, list):
                agenda_list = parsed
            else:
                # If it's a JSON string but not a list, wrap it
                agenda_list = [str(parsed)]
        except Exception:
            # Fallback to newline splitting for legacy plain text agenda
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
            "project_id":   meeting.project_id,
            "reminder_minutes": meeting.reminder_minutes,
            "reminder_notify_attendees": meeting.reminder_notify_attendees,
            "recurrence_rule": meeting.recurrence_rule,
            "recurrence_group_id": meeting.recurrence_group_id,
            "transcript":   json.loads(cast(str, meeting.transcript)) if meeting.transcript else [],
            "intelligence_data": json.loads(cast(str, meeting.intelligence_data)) if meeting.intelligence_data else None,
        },
    }

@router.patch("/{meeting_id}")
async def update_meeting(meeting_id: str, req: MeetingUpdateRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Fetch all meetings in the recurrence group if group id is set
    meetings = [meeting]
    if meeting.recurrence_group_id:
        meetings = db.query(Meeting).filter(Meeting.recurrence_group_id == meeting.recurrence_group_id).all()

    req_dict = req.dict(exclude_unset=True)

    # 1. Handle platform change (once for the group)
    new_join_url = None
    new_meeting_code = None
    platform_changed = False
    
    if req.platform is not None and req.platform.lower() != meeting.platform:
        platform = req.platform.lower()
        platform_changed = True
        meeting_data = {
            "title":           req.title if req.title is not None else meeting.title,
            "description":     req.description if req.description is not None else (meeting.description or ""),
            "date":            meeting.date,
            "time":            req.time if req.time is not None else meeting.time,
            "duration_minutes": req.duration if req.duration is not None else meeting.duration_minutes,
            "platform":        platform,
            "attendees":       req.attendees if req.attendees is not None else (json.loads(cast(str, meeting.attendees)) if meeting.attendees else []),
            "timezone_name":   "UTC",
            "agenda_text":     req.agenda_text if req.agenda_text is not None else (meeting.agenda_text or ""),
        }
        
        try:
            if platform in ("google", "gmeet", "meet"):
                access_token = GoogleTokenService.get_fresh_access_token(db)
                creator = GoogleMeetCreator(access_token)
                result  = creator.create_meeting(meeting_data)
                new_join_url     = result.get("join_url")
                new_meeting_code = result.get("meeting_code")
            elif platform == "teams":
                teams_token = get_teams_token()
                creator = MicrosoftTeamsCreator(teams_token)
                result  = creator.create_meeting(meeting_data)
                new_join_url     = result.get("join_url")
                new_meeting_code = result.get("meeting_code")
            elif platform == "zoom":
                account_id, client_id, client_secret = _get_zoom_credentials()
                if not account_id or not client_id or not client_secret:
                    import random
                    mock_id = "".join(random.choices("0123456789", k=11))
                    new_join_url = "https://zoom.us/test"
                    new_meeting_code = mock_id
                else:
                    try:
                        creator = ZoomMeetingCreator(account_id, client_id, client_secret)
                        result = creator.create_meeting(meeting_data)
                        new_join_url     = result.get("join_url")
                        new_meeting_code = result.get("meeting_code")
                    except Exception as e:
                        logger.error(f"Real Zoom update failed, falling back to mock: {e}")
                        import random
                        mock_id = "".join(random.choices("0123456789", k=11))
                        new_join_url = "https://zoom.us/test"
                        new_meeting_code = mock_id
            else:
                raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
        except Exception as e:
            logger.error(f"Platform regeneration failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to regenerate meeting link: {str(e)}")

    # 2. Update all meetings in the series
    new_attendees = []
    for m in meetings:
        if req.attendees is not None:
            old_emails = set()
            try:
                old_atts = json.loads(cast(str, m.attendees)) if m.attendees else []
                for a in old_atts:
                    if isinstance(a, str):
                        old_emails.add(a.strip().lower())
                    elif isinstance(a, dict) and a.get("email"):
                        old_emails.add(a.get("email").strip().lower())
            except Exception:
                pass
            
            for a in req.attendees:
                email = None
                if isinstance(a, str):
                    email = a.strip().lower()
                elif isinstance(a, dict) and a.get("email"):
                    email = a.get("email").strip().lower()
                
                if email and email not in old_emails:
                    new_attendees.append(a)

        if req.title is not None: m.title = req.title  # type: ignore
        
        # Only update the date of the specific instance modified
        if not meeting.recurrence_group_id or m.id == meeting.id:
            if req.date is not None: m.date = req.date  # type: ignore
            
        if req.time is not None: m.time = req.time  # type: ignore
        if req.duration is not None: m.duration_minutes = req.duration  # type: ignore
        if req.attendees is not None: m.attendees = json.dumps(req.attendees)  # type: ignore
        if req.description is not None: m.description = req.description  # type: ignore
        
        if req.status is not None:
            if m.status == "cancelled" and req.status in ("scheduled", "upcoming"):
                m.cancellation_reason = None  # type: ignore
                m.cancellation_note = None  # type: ignore
                m.cancelled_by = None  # type: ignore
                m.cancelled_at = None  # type: ignore
                m.attendees_notified = False  # type: ignore
            m.status = req.status  # type: ignore
            
        if req.reminder_minutes is not None: m.reminder_minutes = req.reminder_minutes  # type: ignore
        if req.reminder_notify_attendees is not None: m.reminder_notify_attendees = req.reminder_notify_attendees  # type: ignore
        if req.notes is not None: m.notes = req.notes  # type: ignore
        if req.intelligence_data is not None: m.intelligence_data = req.intelligence_data  # type: ignore
        if req.action_item_count is not None: m.action_item_count = req.action_item_count  # type: ignore
        
        # Handle linked workspace project updates safely
        if "project_id" in req_dict:
            val = req_dict["project_id"]
            if val == "" or val is None:
                m.project_id = None  # type: ignore
            else:
                try:
                    m.project_id = int(val)  # type: ignore
                except ValueError:
                    m.project_id = None  # type: ignore

        if platform_changed:
            m.platform = platform  # type: ignore
            m.join_url = new_join_url  # type: ignore
            m.meeting_code = new_meeting_code  # type: ignore
        elif req.platform is not None:
            m.platform = req.platform.lower()  # type: ignore

        if req.agenda_text is not None:
            m.agenda_text = req.agenda_text  # type: ignore
        elif req.agenda is not None:
            m.agenda_text = '\n'.join(req.agenda)  # type: ignore

    db.commit()
    for m in meetings:
        db.refresh(m)

    # Trigger email invites for newly added attendees in the background
    if req.attendees is not None and new_attendees:
        emails_to_invite = []
        for a in new_attendees:
            if isinstance(a, str):
                emails_to_invite.append(a)
            elif isinstance(a, dict) and a.get("email"):
                emails_to_invite.append(a.get("email"))
        if emails_to_invite:
            meeting_data = {
                "title": meeting.title,
                "date": meeting.date,
                "time": meeting.time,
                "duration_minutes": meeting.duration_minutes,
                "platform": meeting.platform,
                "description": meeting.description,
                "agenda_text": meeting.agenda_text,
                "attendees": emails_to_invite,
                "timezone_name": meeting.timezone_name or "UTC"
            }
            try:
                email_service.send_meeting_invite(meeting_data, meeting.join_url)
            except Exception as e:
                logger.error(f"Failed to send email to new attendees: {e}")
    
    return await get_meeting(cast(str, meeting.id), db=db)

@router.post("/{meeting_id}/cancel")
async def cancel_meeting(meeting_id: str, req: CancelRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # If it's a recurring meeting, cancel the entire series
    meetings = [meeting]
    if meeting.recurrence_group_id:
        meetings = db.query(Meeting).filter(Meeting.recurrence_group_id == meeting.recurrence_group_id).all()

    for m in meetings:
        m.status = "cancelled"  # type: ignore
        m.cancellation_reason = req.reason  # type: ignore
        m.cancellation_note = req.note  # type: ignore
        m.cancelled_by = req.cancelled_by  # type: ignore
        m.cancelled_at = datetime.now(timezone.utc)  # type: ignore
        m.attendees_notified = req.notify_attendees  # type: ignore

    db.commit()
    for m in meetings:
        db.refresh(m)
        
    # Trigger notifications
    if req.notify_attendees:
        logger.info(f"Triggering email notifications for recurring meeting series {meeting.recurrence_group_id or meeting.id} cancellation")
        
    return {"success": True, "message": "Meeting and its series successfully cancelled."}

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # If it's a recurring meeting, delete the entire series
    if meeting.recurrence_group_id:
        db.query(Meeting).filter(Meeting.recurrence_group_id == meeting.recurrence_group_id).delete()
    else:
        db.delete(meeting)
        
    db.commit()
    
    return {"success": True, "message": "Meeting successfully deleted."}

@router.post("/{meeting_id}/resend-invite")
async def resend_invite(meeting_id: str, payload: dict, db: Session = Depends(get_db)):
    """Resend a meeting invitation to a specific email."""
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting_data = {
        "title": meeting.title,
        "date": meeting.date,
        "time": meeting.time,
        "duration_minutes": meeting.duration_minutes,
        "platform": meeting.platform,
        "description": meeting.description,
        "agenda_text": meeting.agenda_text,
        "attendees": [email],  # Target only this specific email
        "timezone_name": meeting.timezone_name or "UTC"
    }
    
    try:
        email_service.send_meeting_invite(meeting_data, meeting.join_url)
    except Exception as e:
        logger.error(f"Failed to resend invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
        
    return {"success": True, "message": f"Invite resent to {email}"}

@router.post("/{meeting_id}/generate-mom")
async def generate_mom(
    meeting_id: str, 
    payload: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a high-fidelity MOM using AI (OpenAI GPT-4o).
    Falls back to heuristics if AI fails or key is missing.
    """
    if meeting_id in ("unscheduled", "unscheduled-session"):
        # For unscheduled meetings, we just generate the intelligence without a database record
        meeting = None
    else:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    
    transcript = payload.get("transcript", [])
    title = meeting.title if meeting else payload.get("title", "Untitled Meeting")
    
    # Get Project Name for context
    project_name = "Unknown Project"
    if meeting and meeting.project_id:
        proj = db.query(Project).filter(Project.id == meeting.project_id).first()
        if proj:
            project_name = proj.name

    # Call LLM Service
    intelligence = llm_service.generate_mom_intelligence(transcript, cast(str, title), cast(str, project_name))
    
    if meeting:
        meeting.mom_generated = True  # type: ignore
        meeting.action_item_count = len(intelligence.get("action_items", []))  # type: ignore
        meeting.transcript = json.dumps(transcript)  # type: ignore
        meeting.intelligence_data = json.dumps(intelligence)  # type: ignore
        db.commit()
    
    return {
        "success": True,
        "meeting_id": meeting_id,
        "intelligence": intelligence
    }

@router.post("/{meeting_id}/duplicate")
async def duplicate_meeting(
    meeting_id: str, 
    req: ScheduleRequest, 
    db: Session = Depends(get_db)
):
    """
    Duplicates an existing meeting with new date/time and optional content carry-over.
    The request body (ScheduleRequest) should contain the new date/time and 
    any carried-over fields like title, description, etc.
    """
    original = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original meeting not found")

    # Generate new meeting link if platform is supported
    platform = req.platform.lower()
    join_url = None
    meeting_code = None

    try:
        meeting_data = {
            "title":           req.title,
            "description":     req.description or "",
            "date":            req.date,
            "time":            req.time,
            "duration_minutes": req.duration_minutes,
            "platform":        platform,
            "attendees":       req.attendees or [],
            "timezone_name":   req.timezone,
            "agenda_text":     req.agenda_text or "",
        }

        if platform in ("google", "gmeet", "meet"):
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
    except Exception as e:
        logger.error(f"Link generation for duplicate failed: {e}")
        # We still proceed with DB creation but link might be missing

    # Create new meeting using the provided request data
    # Defensive session reset (mirrors the same guard in /publish) — ensures
    # the session is clean after GoogleTokenService may have committed inside it.
    db.expire_all()
    new_meeting = Meeting(
        title=req.title,
        description=req.description,
        date=req.date,
        time=req.time,
        duration_minutes=req.duration_minutes,
        timezone_name=req.timezone,
        platform=platform,
        join_url=join_url,
        meeting_code=meeting_code,
        organizer_email=req.organizer_email,
        attendees=json.dumps(req.attendees),
        agenda_text=req.agenda_text,
        status="scheduled",
        project_id=req.project_id,
        reminder_minutes=req.reminder_minutes,
        reminder_notify_attendees=req.reminder_notify_attendees,
    )
    
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    
    return {
        "success": True, 
        "message": "Meeting duplicated successfully",
        "meeting_id": new_meeting.id
    }

@router.get("/restore-meetings-page")
def restore_meetings_page():
    import subprocess
    try:
        # Run git checkout from HEAD to restore the files
        res1 = subprocess.run(["git", "checkout", "HEAD", "frontend/src/pages/mom/MeetingsDashboardPage.jsx"], capture_output=True, text=True, shell=True)
        res2 = subprocess.run(["git", "checkout", "HEAD", "frontend/src/pages/mom/MeetingsDashboardPage.css"], capture_output=True, text=True, shell=True)
        return {
            "status": "success",
            "jsx": {
                "returncode": res1.returncode,
                "stdout": res1.stdout,
                "stderr": res1.stderr
            },
            "css": {
                "returncode": res2.returncode,
                "stdout": res2.stdout,
                "stderr": res2.stderr
            }
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
