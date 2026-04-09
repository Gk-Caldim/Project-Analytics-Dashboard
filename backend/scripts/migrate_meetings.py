import os
import sys

# Add backend directory to sys path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import SessionLocal, engine

# Columns to add
COLUMNS = [
    ("cancellation_reason", "VARCHAR(100)"),
    ("cancellation_note", "TEXT"),
    ("cancelled_by", "VARCHAR(100)"),
    ("cancelled_at", "TIMESTAMP"),
    ("attendees_notified", "BOOLEAN DEFAULT FALSE"),
    ("agenda_text", "TEXT"),
    ("actual_duration_minutes", "INTEGER"),
    ("attendance_rate", "INTEGER"),
    ("mom_generated", "BOOLEAN DEFAULT FALSE"),
    ("action_item_count", "INTEGER DEFAULT 0")
]

def migrate():
    with engine.begin() as connection:
        for column_name, column_type in COLUMNS:
            try:
                # Basic ALTER TABLE approach
                query = text(f"ALTER TABLE meetings ADD COLUMN {column_name} {column_type};")
                connection.execute(query)
                print(f"Successfully added {column_name}")
            except Exception as e:
                # Usually means column already exists
                print(f"Skipped {column_name} (might already exist): {e}")

if __name__ == "__main__":
    migrate()
