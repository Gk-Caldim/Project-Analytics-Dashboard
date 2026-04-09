"""
migrate_hardening.py
Applies DB schema changes for Day 2 hardening.
Safe to run multiple times — uses IF NOT EXISTS / ALTER IF NOT EXISTS patterns.
"""
from app.core.database import engine
from sqlalchemy import text

def run():
    stmts = [
        # uploads table: new audit columns
        "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Completed';",
        "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS valid_row_count INTEGER;",
        "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS invalid_row_count INTEGER;",
        # trackers_data: traceability column
        "ALTER TABLE trackers_data ADD COLUMN IF NOT EXISTS source_row_number INTEGER;",
        # import_errors: new table for failed rows
        """
        CREATE TABLE IF NOT EXISTS import_errors (
            id SERIAL PRIMARY KEY,
            upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
            project_id INTEGER,
            row_number INTEGER NOT NULL,
            error_message VARCHAR NOT NULL,
            raw_payload TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_import_errors_upload_id ON import_errors(upload_id);",
    ]

    with engine.connect() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
                conn.commit()
                short = stmt.strip().splitlines()[0][:80]
                print(f"  OK: {short}")
            except Exception as e:
                print(f"  WARN: {e}")

    print("\nMigration complete.")

if __name__ == "__main__":
    run()
