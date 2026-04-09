import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.begin() as conn:
            # Add new columns
            conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR"))
            conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS department VARCHAR"))
            conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            
            # Remove old column
            conn.execute(text("ALTER TABLE budget_summaries DROP COLUMN IF EXISTS currency"))
            
        print("Successfully migrated budget_summaries table")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
