"""
migrate_issues_created_by.py
============================
Adds the `created_by` column to the `issues` table (if it doesn't already exist).

Run once from the backend directory:
    python migrate_issues_created_by.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine

MIGRATION_SQL = """
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'System';
"""


def run():
    with engine.connect() as conn:
        try:
            conn.execute(text(MIGRATION_SQL))
            conn.commit()
            print("[migration] issues.created_by column added (or already exists).")
        except Exception as e:
            print(f"[migration] ERROR: {e}")
            raise


if __name__ == "__main__":
    run()
