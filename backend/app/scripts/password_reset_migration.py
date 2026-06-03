"""
password_reset_migration.py
──────────────────────────────────────────────────────────────────────────────
Idempotent startup migration for the `password_reset_tokens` table.

Strategy: EXACT COLUMN MATCH → drop-and-recreate if stale
──────────────────────────────────────────────────────────
Checks whether the live table's column set EXACTLY matches the expected set.

Why exact-match instead of just checking for missing columns:
  The cloud table may have been created with an old schema that included a
  `token` column (NOT NULL). A "missing only" check would miss this extra
  NOT NULL column and declare the schema up-to-date — causing every INSERT
  to fail with a not-null violation.

  By comparing exact sets (expected ↔ actual), we catch both missing AND
  unexpected columns that could break inserts.

Called once from main.py startup_event(). Safe to run on every restart.
"""

import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_TABLE = "password_reset_tokens"

# The EXACT set of columns the current PasswordResetToken model owns.
_EXPECTED_COLUMNS = {
    "id",
    "email",
    "hashed_otp",
    "reset_token",
    "expires_at",
    "is_verified",
    "attempts",
    "created_at",
    "updated_at",
}


def _get_existing_columns(db: Session) -> set:
    """Return the set of column names currently on the live table."""
    rows = db.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table AND table_schema = 'public'"
        ),
        {"table": _TABLE},
    ).fetchall()
    return {row[0] for row in rows}


def run_password_reset_migration(db: Session) -> None:
    """
    Entry point called from main.py startup_event().

    Compares the live table column set against _EXPECTED_COLUMNS.
    • Exact match → no-op (fast path on every normal restart).
    • Any difference (missing OR extra columns) → drop + recreate cleanly.

    Wrapped in try/except so a failure never crashes server startup.
    """
    try:
        existing = _get_existing_columns(db)

        if not existing:
            # Table does not exist yet — create_all() in startup_event handles it.
            logger.info(
                f"[password_reset_migration] Table '{_TABLE}' not found. "
                "create_all() will create it on startup."
            )
            return

        if existing == _EXPECTED_COLUMNS:
            logger.info(
                f"[password_reset_migration] Schema is correct. No migration needed."
            )
            return

        # Schema mismatch — determine what's wrong for the log message.
        missing = _EXPECTED_COLUMNS - existing
        extra   = existing - _EXPECTED_COLUMNS

        logger.warning(
            f"[password_reset_migration] Schema mismatch on '{_TABLE}'.\n"
            f"  Missing columns : {sorted(missing) or 'none'}\n"
            f"  Extra columns   : {sorted(extra) or 'none'}\n"
            f"  → Dropping and recreating the table cleanly..."
        )

        # Drop (CASCADE removes any dependent indexes/constraints).
        db.execute(text(f"DROP TABLE IF EXISTS {_TABLE} CASCADE"))
        db.commit()
        logger.info(f"[password_reset_migration] Table '{_TABLE}' dropped.")

        # Recreate via SQLAlchemy metadata so it always matches the model.
        from app.core.database import engine, Base
        from app.models.password_reset import PasswordResetToken  # noqa: F401 — registers metadata

        Base.metadata.tables[_TABLE].create(bind=engine, checkfirst=True)
        logger.info(
            f"[password_reset_migration] Table '{_TABLE}' recreated with full schema. "
            "Migration complete ✓"
        )

    except Exception as exc:
        logger.error(
            f"[password_reset_migration] Migration failed (non-fatal): {exc}",
            exc_info=True,
        )
        db.rollback()
        # Do NOT re-raise — server must still start even if migration fails.
