# Azure App Registration required:
# 1. portal.azure.com → Entra ID → App registrations → New
# 2. Redirect URI: http://localhost:8000/api/teams/callback  (type: Web)
# 3. API permissions → Microsoft Graph → Delegated:
#       OnlineMeetings.ReadWrite, User.Read, offline_access
# 4. Grant admin consent for your tenant
# 5. Copy client_id, tenant_id, client_secret → .env (TEAMS_CLIENT_ID, etc.)

"""
routers/teams.py
================
Delegated Microsoft Teams OAuth + meeting creation endpoints.

Routes
------
GET  /api/teams/auth            — return the Microsoft login URL (JSON)
GET  /api/teams/callback        — exchange code, redirect to frontend
GET  /api/teams/status          — is a valid token present?
POST /api/teams/create-meeting  — create a Teams meeting and persist to DB
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.meeting import Meeting
from app.services.teams_meeting import (
    get_auth_url,
    exchange_code_for_token,
    is_authenticated,
    create_teams_meeting,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/teams", tags=["Teams"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateMeetingRequest(BaseModel):
    title: str
    start: str   # ISO-8601 with timezone, e.g. "2025-06-10T10:00:00+05:30"
    end:   str


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/auth")
async def teams_auth():
    """
    Return the Microsoft OAuth2 authorization URL as JSON.
    React handles the redirect so the frontend remains in control.
    """
    try:
        auth_url = get_auth_url()
        return {"auth_url": auth_url}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback")
async def teams_callback(code: str):
    """
    Microsoft redirects here with ?code= after user approves.
    Exchanges the code for tokens, then redirects to the frontend.
    """
    try:
        exchange_code_for_token(code)
        logger.info("Teams OAuth callback: token exchanged and saved.")
    except RuntimeError as e:
        logger.error("Teams callback failed: %s", e)
        return RedirectResponse(
            url="http://localhost:5173/dashboard/schedule-meeting?teams_auth=error"
        )

    return RedirectResponse(
        url="http://localhost:5173/dashboard/schedule-meeting?teams_auth=success"
    )


@router.get("/status")
async def teams_status():
    """Check whether a valid (or refreshable) Teams token exists."""
    return {"authenticated": is_authenticated()}


@router.post("/create-meeting")
async def teams_create_meeting(
    req: CreateMeetingRequest,
    db: Session = Depends(get_db),
):
    """
    Create a Microsoft Teams meeting via the Graph API (delegated).

    On success:
      - Persists the meeting to the DB (platform="teams").
      - Returns join_url, meeting_id, subject, start, end,
        and redirect_url (same as join_url — frontend should window.open it).
    """
    try:
        result = create_teams_meeting(
            subject=req.title,
            start=req.start,
            end=req.end,
        )
    except RuntimeError as e:
        logger.error("Teams meeting creation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    join_url   = result["join_url"]
    meeting_id = result["meeting_id"]

    # ── Parse start into date / time strings for the Meeting model ───────────
    try:
        # Handle ISO strings with or without timezone offset
        dt_str = req.start.replace("Z", "+00:00")
        # Strip offset for simple parsing
        dt_bare = dt_str[:19]  # "YYYY-MM-DDTHH:MM:SS"
        dt_obj  = datetime.fromisoformat(dt_bare)
        date_str = dt_obj.strftime("%Y-%m-%d")
        time_str = dt_obj.strftime("%I:%M %p")
    except Exception:
        date_str = req.start[:10]
        time_str = req.start[11:16]

    meeting = Meeting(
        title=req.title,
        date=date_str,
        time=time_str,
        duration_minutes=60,          # default; can be computed from start/end
        platform="teams",
        join_url=join_url,
        meeting_code=meeting_id,
        organizer_email="",
        attendees="[]",
        status="scheduled",
        invites_sent=False,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return {
        "success":      True,
        "join_url":     join_url,
        "redirect_url": join_url,   # frontend does window.open(redirect_url)
        "meeting_id":   meeting.id,
        "ms_meeting_id": meeting_id,
        "subject":      req.title,
        "start":        req.start,
        "end":          req.end,
    }
