import sys
import os

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.database import engine
from sqlalchemy import text

from app.core.config import DATABASE_URL, DB_TYPE

def migrate():
    print(f"\n[MIGRATION] Target: {DB_TYPE.upper()}")
    # Masking password for safety
    masked_url = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL
    print(f"[MIGRATION] DB URL (host/db): ...@{masked_url}")

    columns_to_add = [
        ("project_id", "INTEGER"),
        ("user_id", "VARCHAR"),
        ("timezone_name", "VARCHAR(50) DEFAULT 'UTC'"),
        ("google_calendar_event_id", "VARCHAR(100)"),
        ("cancellation_reason", "VARCHAR(100)"),
        ("cancellation_note", "TEXT"),
        ("cancelled_by", "VARCHAR(100)"),
        ("cancelled_at", "TIMESTAMP WITH TIME ZONE"),
        ("attendees_notified", "BOOLEAN DEFAULT FALSE"),
        ("actual_duration_minutes", "INTEGER"),
        ("attendance_rate", "INTEGER"),
        ("mom_generated", "BOOLEAN DEFAULT FALSE"),
        ("action_item_count", "INTEGER DEFAULT 0"),
        ("transcript", "TEXT"),
        ("intelligence_data", "TEXT"),
        ("reminder_minutes", "INTEGER"),
        ("reminder_notify_attendees", "BOOLEAN DEFAULT TRUE")
    ]
    
    for col_name, col_type in columns_to_add:
        # Use a fresh connection/transaction for each column
        with engine.begin() as conn:
            try:
                print(f"Checking/Adding column {col_name}...")
                conn.execute(text(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_type};"))
                print(f"Column {col_name} added successfully.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                    print(f"Column {col_name} already exists.")
                else:
                    print(f"Error adding {col_name}: {e}")

if __name__ == "__main__":
    migrate()
