import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import text
from app.core.database import engine

def run_migration():
    print("Running migration to add employee fields to projects table...")
    
    # We use raw SQL to add columns because Alembic is not set up
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Check if columns already exist to avoid errors
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='projects' AND column_name IN ('employee_id', 'employee_name');
            """)
            result = conn.execute(check_sql).fetchall()
            existing_columns = [row[0] for row in result]
            
            if 'employee_id' not in existing_columns:
                print("Adding employee_id column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN employee_id VARCHAR;"))
                # Add foreign key constraint
                # Note: This assumes employees table has employee_id column with unique constraint
                conn.execute(text("ALTER TABLE projects ADD CONSTRAINT fk_project_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id);"))
            else:
                print("employee_id column already exists.")

            if 'employee_name' not in existing_columns:
                print("Adding employee_name column...")
                conn.execute(text("ALTER TABLE projects ADD COLUMN employee_name VARCHAR;"))
            else:
                print("employee_name column already exists.")
            
            trans.commit()
            print("Migration completed successfully.")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
