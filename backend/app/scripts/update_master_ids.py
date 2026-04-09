import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Running migration to add project_id and department_id columns...")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Projects Table
            print("Checking projects table...")
            check_projects = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='projects' AND column_name='project_id';
            """)
            if not conn.execute(check_projects).fetchone():
                print("Adding project_id to projects table...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN project_id VARCHAR UNIQUE;"))
            else:
                print("project_id already exists in projects table.")

            # 2. Departments Table
            print("Checking departments table...")
            check_depts = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='departments' AND column_name='department_id';
            """)
            if not conn.execute(check_depts).fetchone():
                print("Adding department_id to departments table...")
                conn.execute(text("ALTER TABLE departments ADD COLUMN department_id VARCHAR UNIQUE;"))
            else:
                print("department_id already exists in departments table.")
            
            trans.commit()
            print("Migration completed successfully.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
