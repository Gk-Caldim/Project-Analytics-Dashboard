"""
GoogleTokenService
==================
Single source of truth for Google OAuth tokens.

Priority order:
  1. DB row  (google_tokens table, id='default')
  2. .env / os.environ  (GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET)

On every access:
  - Load either from DB or env
  - Immediately call Google's token endpoint to get a fresh access_token
  - Persist the fresh access_token back to DB (if row exists) or os.environ
"""

import os
import logging
import requests
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.google_token import GoogleToken

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleTokenService:
    """Manages loading, refreshing, and saving Google OAuth tokens."""

    # ------------------------------------------------------------------ #
    #  Load                                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def load(db: Session) -> dict | None:
        """
        Return a dict with keys:
          access_token, refresh_token, client_id, client_secret

        Returns None if no credentials are configured at all.
        """
        row = db.query(GoogleToken).filter_by(id="default").first()

        if row:
            return {
                "access_token": row.access_token or "",
                "refresh_token": row.refresh_token,
                "client_id": row.client_id,
                "client_secret": row.client_secret,
                "source": "db",
            }

        # Fallback: read from env
        refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

        if not refresh_token or not client_id or not client_secret:
            return None

        return {
            "access_token": os.environ.get("GOOGLE_OAUTH_TOKEN", ""),
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "source": "env",
        }

    # ------------------------------------------------------------------ #
    #  Save                                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def save(
        db: Session,
        *,
        access_token: str,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> GoogleToken:
        """Upsert the single-row token record."""
        row = db.query(GoogleToken).filter_by(id="default").first()
        if row:
            row.access_token = access_token
            row.refresh_token = refresh_token
            row.client_id = client_id
            row.client_secret = client_secret
            row.updated_at = datetime.now(timezone.utc)
        else:
            row = GoogleToken(
                id="default",
                access_token=access_token,
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
            )
            db.add(row)
        db.commit()
        db.refresh(row)
        logger.info("Google tokens saved/updated in DB.")
        return row

    # ------------------------------------------------------------------ #
    #  Clear (force re-auth)                                               #
    # ------------------------------------------------------------------ #

    @staticmethod
    def clear(db: Session) -> bool:
        """Delete stored tokens to force re-authentication."""
        deleted = db.query(GoogleToken).filter_by(id="default").delete()
        db.commit()
        # Also clear env vars in-process
        for key in ("GOOGLE_OAUTH_TOKEN", "GOOGLE_REFRESH_TOKEN"):
            os.environ.pop(key, None)
        logger.info(f"Google tokens cleared (rows deleted: {deleted}).")
        return deleted > 0

    # ------------------------------------------------------------------ #
    #  Refresh                                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def refresh(creds: dict, db: Session | None = None) -> str | None:
        """
        Exchange refresh_token for a new access_token.
        If db is provided and the token row exists, persists the new access_token.
        Returns the new access_token or None on failure.
        """
        data = {
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "refresh_token": creds["refresh_token"],
            "grant_type": "refresh_token",
        }
        try:
            resp = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=10)
            if resp.status_code == 200:
                new_token = resp.json().get("access_token")
                if new_token:
                    # Persist in-process
                    os.environ["GOOGLE_OAUTH_TOKEN"] = new_token

                    # Persist in DB if we have a session
                    if db:
                        row = db.query(GoogleToken).filter_by(id="default").first()
                        if row:
                            row.access_token = new_token
                            row.updated_at = datetime.now(timezone.utc)
                            db.commit()
                    logger.info("Google access token refreshed successfully.")
                    return new_token
            logger.warning(
                f"Google token refresh failed ({resp.status_code}): {resp.text}"
            )
        except Exception as exc:
            logger.warning(f"Google token refresh exception: {exc}")
        return None

    # ------------------------------------------------------------------ #
    #  get_fresh_access_token  (main entry point)                          #
    # ------------------------------------------------------------------ #

    @classmethod
    def get_fresh_access_token(cls, db: Session) -> str:
        """
        Load credentials, refresh to get a valid access_token, and return it.
        Raises RuntimeError if not configured or refresh fails.
        """
        creds = cls.load(db)
        if not creds:
            raise RuntimeError(
                "Google credentials not configured. "
                "Set GOOGLE_REFRESH_TOKEN / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env "
                "or visit /api/meetings/auth/google/start to authenticate."
            )

        new_token = cls.refresh(creds, db=db)
        if not new_token:
            raise RuntimeError(
                "Failed to refresh Google access token. "
                "The refresh token may be revoked. "
                "Visit /api/meetings/auth/google/clear then /api/meetings/auth/google/start to re-authenticate."
            )
        return new_token
