import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from app.models.mom_sync_history import MomSyncHistory
from sqlalchemy import text

def fix_schema():
    print("Connecting to database...")
    with engine.connect() as conn:
        print("Dropping existing mom_sync_history table...")
        conn.execute(text("DROP TABLE IF EXISTS mom_sync_history CASCADE;"))
        conn.commit()
        print("Table dropped successfully.")
        
    print("Recreating tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("mom_sync_history table recreated with the correct columns!")

if __name__ == "__main__":
    fix_schema()
