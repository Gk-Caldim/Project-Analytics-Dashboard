"""
teams_meeting.py
================
Delegated OAuth for Microsoft Teams via MSAL.
User authenticates once; token is refreshed automatically from ms_token.json.

Azure App Registration required:
  1. portal.azure.com → Entra ID → App registrations → New
  2. Redirect URI: http://localhost:8000/api/teams/callback (Web type)
  3. API permissions → Microsoft Graph → Delegated:
       OnlineMeetings.ReadWrite, User.Read, offline_access
  4. Grant admin consent for your tenant
  5. Copy client_id, tenant_id, client_secret to .env as shown below
"""

import os
import json
import logging
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

# Path where the delegated token is persisted
TOKEN_FILE = Path(__file__).resolve().parents[3] / "ms_token.json"

SCOPES = [
    "OnlineMeetings.ReadWrite",
    "User.Read",
    "offline_access",
]

GRAPH_API = "https://graph.microsoft.com/v1.0"


def _get_msal_app():
    """Build a ConfidentialClientApplication from env vars."""
    try:
        import msal  # type: ignore
    except ImportError:
        raise RuntimeError("msal is not installed — run: pip install msal")

    client_id     = os.environ.get("TEAMS_CLIENT_ID")
    client_secret = os.environ.get("TEAMS_CLIENT_SECRET")
    tenant_id     = os.environ.get("TEAMS_TENANT_ID")

    if not all([client_id, client_secret, tenant_id]):
        raise RuntimeError(
            "Missing one or more TEAMS_* env vars (TEAMS_CLIENT_ID, "
            "TEAMS_CLIENT_SECRET, TEAMS_TENANT_ID)"
        )

    authority = f"https://login.microsoftonline.com/{tenant_id}"
    return msal.ConfidentialClientApplication(
        client_id,
        authority=authority,
        client_credential=client_secret,
    )


def get_auth_url() -> str:
    """
    Build and return the Microsoft OAuth2 authorization URL.
    React will redirect the user here via window.location.href.
    """
    app = _get_msal_app()
    redirect_uri = os.environ.get(
        "TEAMS_REDIRECT_URI",
        "http://localhost:8000/api/teams/callback",
    )
    auth_url = app.get_authorization_request_url(
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    logger.info("Teams auth URL generated.")
    return auth_url


def exchange_code_for_token(code: str) -> dict:
    """
    Exchange a one-time authorization code for an access + refresh token.
    Persists the token to ms_token.json.
    Returns the full token dict.
    """
    app = _get_msal_app()
    redirect_uri = os.environ.get(
        "TEAMS_REDIRECT_URI",
        "http://localhost:8000/api/teams/callback",
    )
    result = app.acquire_token_by_authorization_code(
        code=code,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )

    if "error" in result:
        raise RuntimeError(
            f"Failed to exchange Teams auth code: "
            f"{result['error']} — {result.get('error_description', '')}"
        )

    # Stamp the retrieval time so we can check expiry later
    result["_ts"] = time.time()
    TOKEN_FILE.write_text(json.dumps(result))
    logger.info("Teams token saved to %s", TOKEN_FILE)
    return result


def get_valid_token() -> str:
    """
    Load the persisted token.  If the access token is expired, refresh it
    automatically via the refresh_token.
    Returns a valid access_token string.
    """
    if not TOKEN_FILE.exists():
        raise RuntimeError(
            "No Teams token found. Authenticate via /api/teams/auth first."
        )

    token = json.loads(TOKEN_FILE.read_text())

    # Check expiry: expires_in is seconds from issuance (_ts)
    ts          = token.get("_ts", 0)
    expires_in  = token.get("expires_in", 3600)
    age         = time.time() - ts
    is_expired  = age >= (expires_in - 60)   # 60-second buffer

    if is_expired:
        logger.info("Teams access token expired — refreshing via refresh_token.")
        app = _get_msal_app()
        result = app.acquire_token_by_refresh_token(
            refresh_token=token["refresh_token"],
            scopes=SCOPES,
        )
        if "error" in result:
            raise RuntimeError(
                f"Teams token refresh failed: "
                f"{result['error']} — {result.get('error_description', '')}"
            )
        result["_ts"] = time.time()
        TOKEN_FILE.write_text(json.dumps(result))
        token = result
        logger.info("Teams token refreshed and saved.")

    return token["access_token"]


def is_authenticated() -> bool:
    """Return True only if a valid (or refreshable) token exists."""
    if not TOKEN_FILE.exists():
        return False
    try:
        token = json.loads(TOKEN_FILE.read_text())
        return bool(token.get("refresh_token"))
    except Exception:
        return False


def create_teams_meeting(subject: str, start: str, end: str) -> dict:
    """
    Create an online Teams meeting via Microsoft Graph (delegated).

    Parameters
    ----------
    subject : str
        Meeting title.
    start : str
        ISO-8601 datetime with timezone, e.g. "2025-06-10T10:00:00+05:30".
    end : str
        ISO-8601 datetime with timezone.

    Returns
    -------
    dict with keys: meeting_id, join_url, subject, start, end
    """
    access_token = get_valid_token()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }

    payload = {
        "subject":       subject,
        "startDateTime": start,
        "endDateTime":   end,
    }

    # ── Step 1: Create the meeting ───────────────────────────────────────────
    resp = requests.post(
        f"{GRAPH_API}/me/onlineMeetings",
        headers=headers,
        json=payload,
        timeout=15,
    )

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to create Teams meeting: [{resp.status_code}] {resp.text}"
        )

    meeting_data = resp.json()
    meeting_id   = meeting_data["id"]
    join_url     = meeting_data.get("joinWebUrl")

    # ── Step 2: Patch lobby bypass so external users can join directly ───────
    try:
        patch_payload = {
            "lobbyBypassSettings": {
                "scope": "everyone",
                "isDialInBypassEnabled": True,
            }
        }
        patch_resp = requests.patch(
            f"{GRAPH_API}/me/onlineMeetings/{meeting_id}",
            headers=headers,
            json=patch_payload,
            timeout=10,
        )
        if patch_resp.status_code not in (200, 204):
            logger.warning(
                "Teams lobby bypass patch returned %s: %s",
                patch_resp.status_code, patch_resp.text,
            )
    except Exception as e:
        logger.warning("Teams lobby bypass patch skipped: %s", e)

    logger.info("Teams meeting created: %s → %s", meeting_id, join_url)

    return {
        "meeting_id": meeting_id,
        "join_url":   join_url,
        "subject":    subject,
        "start":      start,
        "end":        end,
    }
