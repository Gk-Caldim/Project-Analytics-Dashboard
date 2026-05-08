import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import engine
from sqlalchemy import text

def migrate():
    columns_to_add = [
        ("project_id", "INTEGER"),
        ("actual_duration_minutes", "INTEGER"),
        ("attendance_rate", "INTEGER"),
        ("mom_generated", "BOOLEAN DEFAULT FALSE"),
        ("action_item_count", "INTEGER DEFAULT 0"),
        ("transcript", "TEXT"),
        ("intelligence_data", "TEXT")
    ]
    
    with engine.begin() as conn:
        for col_name, col_type in columns_to_add:
            try:
                print(f"Adding column {col_name}...")
                conn.execute(text(f"ALTER TABLE meetings ADD COLUMN {col_name} {col_type};"))
                print(f"Column {col_name} added successfully.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                    print(f"Column {col_name} already exists.")
                else:
                    print(f"Error adding {col_name}: {e}")

if __name__ == "__main__":
    migrate()
