import sys
import os

sys.path.append(os.getcwd())

from app.core.database import engine
from sqlalchemy import text
from app.core.config import DATABASE_URL, DB_TYPE

def migrate():
    print(f"\n[MIGRATION] Target: {DB_TYPE.upper()}")
    
    with engine.begin() as conn:
        try:
            print("Checking/Adding column deleted_meeting...")
            # For PostgreSQL, SQLite, etc.
            conn.execute(text("ALTER TABLE meetings ADD COLUMN deleted_meeting BOOLEAN DEFAULT FALSE;"))
            print("Column deleted_meeting added successfully.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                print("Column deleted_meeting already exists.")
            else:
                print(f"Error adding deleted_meeting: {e}")

if __name__ == "__main__":
    migrate()
