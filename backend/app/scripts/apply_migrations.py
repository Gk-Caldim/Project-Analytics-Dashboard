import os
import sys
from sqlalchemy import text

# Add parent directory to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine
from app.core.config import DB_TYPE

def migrate():
    print("\n" + "="*50)
    print(f"  TARGET DATABASE: {DB_TYPE.upper()}")
    print("="*50)
    print("\nStarting schema migration...")
    with engine.connect() as conn:
        # 1. Update mom_sync_history
        print("Updating mom_sync_history...")
        try:
            conn.execute(text("ALTER TABLE mom_sync_history ADD COLUMN IF NOT EXISTS sync_id VARCHAR;"))
            conn.execute(text("ALTER TABLE mom_sync_history ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'processing';"))
            conn.execute(text("ALTER TABLE mom_sync_history ADD COLUMN IF NOT EXISTS backfilled BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE mom_sync_history ADD COLUMN IF NOT EXISTS project_name VARCHAR;"))
            conn.commit()
            print("  mom_sync_history updated.")
        except Exception as e:
            print(f"  Error updating mom_sync_history: {e}")
            conn.rollback()

        # 2. Update issues
        print("Updating issues...")
        try:
            conn.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS sync_id VARCHAR;"))
            conn.execute(text("ALTER TABLE issues ADD COLUMN IF NOT EXISTS action_taken TEXT;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_issues_sync_id ON issues (sync_id);"))
            conn.commit()
            print("  issues updated.")
        except Exception as e:
            print(f"  Error updating issues: {e}")
            conn.rollback()

        # 3. Update mom_sessions
        print("Updating mom_sessions...")
        try:
            # Add sync_id and project_name
            conn.execute(text("ALTER TABLE mom_sessions ADD COLUMN IF NOT EXISTS sync_id VARCHAR;"))
            conn.execute(text("ALTER TABLE mom_sessions ADD COLUMN IF NOT EXISTS project_name VARCHAR;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mom_sessions_sync_id ON mom_sessions (sync_id);"))
            
            # If meeting_id is still the primary key, we need to add a new 'id' column and make it PK
            # First check if 'id' exists
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'mom_sessions' AND column_name = 'id'"))
            if not res.fetchone():
                print("  Adding 'id' column to mom_sessions and setting as primary key...")
                # Add id column
                conn.execute(text("ALTER TABLE mom_sessions ADD COLUMN id VARCHAR;"))
                # Populate id with UUIDs
                conn.execute(text("UPDATE mom_sessions SET id = gen_random_uuid()::text WHERE id IS NULL;"))
                # Drop old primary key (usually meeting_id)
                # We find the PK name
                pk_res = conn.execute(text("""
                    SELECT conname FROM pg_constraint 
                    WHERE conrelid = 'mom_sessions'::regclass AND contype = 'p';
                """))
                pk_row = pk_res.fetchone()
                if pk_row:
                    conn.execute(text(f"ALTER TABLE mom_sessions DROP CONSTRAINT {pk_row[0]};"))
                
                # Set new primary key
                conn.execute(text("ALTER TABLE mom_sessions ALTER COLUMN id SET NOT NULL;"))
                conn.execute(text("ALTER TABLE mom_sessions ADD PRIMARY KEY (id);"))
            
            conn.commit()
            print("  mom_sessions updated.")
        except Exception as e:
            print(f"  Error updating mom_sessions: {e}")
            conn.rollback()

    print("Migration finished.")

if __name__ == "__main__":
    migrate()
