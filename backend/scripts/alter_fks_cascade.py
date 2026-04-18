import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.core.database import SessionLocal

def alter_fk(db, table_name, constraint_name, fkey_col, ref_col='id'):
    try:
        # Drop constraint
        db.execute(text(f"ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name};"))
        # Add constraint with ON DELETE CASCADE
        db.execute(text(f"ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({fkey_col}) REFERENCES projects({ref_col}) ON DELETE CASCADE;"))
        print(f"Updated {table_name} FK to CASCADE.")
    except Exception as e:
        print(f"Failed on {table_name}: {e}")

def main():
    db = SessionLocal()
    
    alter_fk(db, 'employee_project_map', 'employee_project_map_project_id_fkey', 'project_id', 'project_id')
    alter_fk(db, 'project_permissions', 'project_permissions_project_id_fkey', 'project_id', 'project_id')
    alter_fk(db, 'upload_trackers', 'upload_trackers_project_id_fkey', 'project_id', 'id')
    alter_fk(db, 'meetings', 'meetings_project_id_fkey', 'project_id', 'id')
    alter_fk(db, 'project_sub_categories', 'project_sub_categories_project_id_fkey', 'project_id', 'project_id')
    alter_fk(db, 'uploads', 'uploads_project_id_fkey', 'project_id', 'id')
    alter_fk(db, 'trackers_data', 'trackers_data_project_id_fkey', 'project_id', 'id')
    alter_fk(db, 'issues', 'issues_project_id_fkey', 'project_id', 'id')
    
    db.commit()
    db.close()

if __name__ == '__main__':
    main()
