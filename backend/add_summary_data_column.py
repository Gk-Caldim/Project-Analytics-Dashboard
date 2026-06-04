import sys
import os

sys.path.append(os.getcwd())

from app.core.database import engine, SessionLocal
from app.models.tracker_ingestion import TrackerIngestion
from app.utils.analytics_utils import compute_tracker_summary
from sqlalchemy import text
from app.core.config import DB_TYPE

def migrate():
    print(f"\n[MIGRATION] Target: {DB_TYPE.upper()}")
    
    # 1. Add Column
    with engine.begin() as conn:
        try:
            print("Checking/Adding column summary_data...")
            col_type = "JSONB" if DB_TYPE.lower() == "postgresql" else "JSON"
            conn.execute(text(f"ALTER TABLE tracker_ingestions ADD COLUMN summary_data {col_type};"))
            print("Column summary_data added successfully.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower() or "already exist" in str(e).lower():
                print("Column summary_data already exists.")
            else:
                print(f"Error adding summary_data column: {e}")
                
    # 2. Backfill existing rows
    db = SessionLocal()
    try:
        rows_to_backfill = db.query(TrackerIngestion).filter(TrackerIngestion.summary_data.is_(None)).all()
        print(f"Found {len(rows_to_backfill)} rows needing backfill.")
        for row in rows_to_backfill:
            if row.data and isinstance(row.data, list):
                print(f"Backfilling row ID {row.id} ({row.file_name}) for project {row.project_id} with {len(row.data)} records...")
                summary = compute_tracker_summary(row.data)
                row.summary_data = summary
        db.commit()
        print("Backfill completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during backfill: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
