"""
meeting_color_migration.py
──────────────────────────────────────────────────────────────────────────────
Idempotent startup migration that:
  Adds the `color` column to the `meetings` table if it does not exist.

This script is called once from main.py's startup_event().
It is safe to run repeatedly.
"""

import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def run_meeting_color_migration(db: Session) -> None:
    """
    Entry point called from main.py startup_event().
    Wraps DB work in a try/except so a migration failure never crashes the server.
    """
    try:
        # ── Step 1: Add column if it doesn't exist ──────────────────────────
        # `IF NOT EXISTS` makes this fully idempotent across restarts.
        db.execute(text(
            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS color VARCHAR(7)"
        ))
        db.commit()
        logger.info("[meeting_color_migration] Column 'color' ensured on meetings table.")

    except Exception as exc:
        logger.error(f"[meeting_color_migration] Migration failed (non-fatal): {exc}")
        db.rollback()
        # Do NOT re-raise — the server must still start even if migration fails.
