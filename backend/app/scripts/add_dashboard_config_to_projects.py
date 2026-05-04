import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Running migration to add dashboard_config field to projects table...")
    
    # We use raw SQL to add columns because Alembic is not set up
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Check if column already exists to avoid errors
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='projects' AND column_name = 'dashboard_config';
            """)
            result = conn.execute(check_sql).fetchone()
            
            if not result:
                print("Adding dashboard_config column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN dashboard_config JSONB DEFAULT '{}'::jsonb;"))
                print("dashboard_config column added successfully.")
            else:
                print("dashboard_config column already exists.")
            
            trans.commit()
            print("Migration completed successfully.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
