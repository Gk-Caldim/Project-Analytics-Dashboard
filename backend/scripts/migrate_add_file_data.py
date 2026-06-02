"""
Migration: Add file_data JSONB column to uploads table.
Run with: venv\Scripts\python.exe -m scripts.migrate_add_file_data
"""

import sys
from app.core.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run():
    db = SessionLocal()
    try:
        # Step 1: Check current columns
        result = db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'uploads'
            ORDER BY ordinal_position
        """))
        cols = {row[0]: row[1] for row in result}
        logger.info("Current uploads columns: %s", list(cols.keys()))

        # Step 2: Add file_data if not present
        if "file_data" not in cols:
            logger.info("Adding file_data JSONB column...")
            db.execute(text("ALTER TABLE uploads ADD COLUMN file_data JSONB"))
            db.commit()
            logger.info("✅ file_data column added successfully.")
        else:
            logger.info("✅ file_data column already exists (type: %s).", cols["file_data"])

        # Step 3: Verify it's there
        result2 = db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'uploads' AND column_name = 'file_data'
        """))
        row = result2.fetchone()
        if row:
            logger.info("✅ VERIFIED: uploads.file_data exists with type '%s'", row[1])
        else:
            logger.error("❌ FAILED: file_data column not found after migration!")
            sys.exit(1)

    except Exception as e:
        db.rollback()
        logger.exception("❌ Migration failed: %s", e)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run()
