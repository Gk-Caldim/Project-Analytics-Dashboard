import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

def run_recurrence_migration(db: Session) -> None:
    """
    Idempotent startup migration that:
      1. Adds `recurrence_group_id` column to the `meetings` table if not exists.
      2. Adds `recurrence_rule` column to the `meetings` table if not exists.
    """
    try:
        db.execute(text(
            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(100)"
        ))
        db.execute(text(
            "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(50) DEFAULT 'none'"
        ))
        db.commit()
        logger.info("[recurrence_migration] Recurrence columns ensured on meetings table.")
    except Exception as exc:
        logger.error(f"[recurrence_migration] Migration failed (non-fatal): {exc}")
        db.rollback()
