"""
join_code_migration.py
──────────────────────────────────────────────────────────────────────────────
Idempotent startup migration that:
  1. Adds the `join_code` column to the `projects` table if it does not exist.
  2. Generates and persists a unique XXXX-XXXX join code for every project row
     that currently has join_code = NULL.

This script is called once from main.py's startup_event().
It is safe to run repeatedly — no-ops if the column and codes already exist.

Format: XXXX-XXXX  (4 uppercase alphanumeric chars, hyphen, 4 more)
Example: TATA-8A3F
"""

import random
import string
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Character set: uppercase letters + digits, excluding visually ambiguous chars
# (O, 0, I, 1, L) to make codes easy to read and transcribe accurately.
_CODE_ALPHABET = [
    c for c in (string.ascii_uppercase + string.digits)
    if c not in {"O", "0", "I", "1", "L"}
]


def _generate_code() -> str:
    """Generate a single XXXX-XXXX join code from the safe alphabet."""
    part = lambda: "".join(random.choices(_CODE_ALPHABET, k=4))
    return f"{part()}-{part()}"


def _generate_unique_code(existing_codes: set) -> str:
    """
    Keep generating until we produce a code not already in the database.
    Collision probability: ~1 in 26^8 per attempt — practically zero even at scale.
    Guard loop caps at 100 attempts to avoid infinite loops (would only trigger at
    extremely high project counts, which is outside current scope).
    """
    for _ in range(100):
        code = _generate_code()
        if code not in existing_codes:
            existing_codes.add(code)
            return code
    # Should never happen in practice. Logged as a critical warning.
    raise RuntimeError("[join_code_migration] Could not generate a unique join code after 100 attempts.")


def run_join_code_migration(db: Session) -> None:
    """
    Entry point called from main.py startup_event().
    Wraps all DB work in a try/except so a migration failure never crashes the server.
    """
    try:
        # ── Step 1: Add column if it doesn't exist ──────────────────────────
        # `IF NOT EXISTS` makes this fully idempotent across restarts.
        db.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS join_code VARCHAR(9)"
        ))
        db.commit()
        logger.info("[join_code_migration] Column 'join_code' ensured on projects table.")

        # ── Step 2: Add unique index if it doesn't exist ──────────────────
        db.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_projects_join_code ON projects(join_code)"
        ))
        db.commit()
        logger.info("[join_code_migration] Unique index on join_code ensured.")

        # ── Step 3: Backfill NULL rows ─────────────────────────────────────
        # Fetch all rows that need a code.
        rows_needing_code = db.execute(
            text("SELECT id, name FROM projects WHERE join_code IS NULL")
        ).fetchall()

        if not rows_needing_code:
            logger.info("[join_code_migration] All projects already have join codes. Nothing to backfill.")
            return

        # Fetch existing codes to ensure uniqueness during generation.
        existing_codes = set(
            row[0] for row in db.execute(
                text("SELECT join_code FROM projects WHERE join_code IS NOT NULL")
            ).fetchall()
        )

        codes_assigned = []
        for project_id, project_name in rows_needing_code:
            code = _generate_unique_code(existing_codes)
            db.execute(
                text("UPDATE projects SET join_code = :code WHERE id = :id"),
                {"code": code, "id": project_id}
            )
            codes_assigned.append((project_name, code))

        db.commit()

        # Log all generated codes for dev convenience.
        # In production, this log line should be suppressed or sent to a secure audit log.
        logger.info(
            f"[join_code_migration] Backfilled {len(codes_assigned)} project join codes:\n"
            + "\n".join(f"  {name:<40} → {code}" for name, code in codes_assigned)
        )

    except Exception as exc:
        logger.error(f"[join_code_migration] Migration failed (non-fatal): {exc}")
        db.rollback()
        # Do NOT re-raise — the server must still start even if migration fails.
        # The endpoints that need join_code will handle NULL gracefully.
