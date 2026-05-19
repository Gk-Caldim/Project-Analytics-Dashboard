import sys
import os

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.database import engine
from sqlalchemy import text
from app.core.config import DATABASE_URL, DB_TYPE

def migrate():
    print(f"\n[MIGRATION] Target: {DB_TYPE.upper()}")
    
    with engine.begin() as conn:
        try:
            print("Checking/Adding column notes...")
            conn.execute(text("ALTER TABLE meetings ADD COLUMN notes TEXT;"))
            print("Column notes added successfully.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                print("Column notes already exists.")
            else:
                print(f"Error adding notes: {e}")

if __name__ == "__main__":
    migrate()
