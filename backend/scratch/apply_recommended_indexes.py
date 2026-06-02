import sys
import os
sys.path.append(os.getcwd())
from app.core.database import engine
from sqlalchemy import text

def apply_indexes():
    indexes = [
        ("idx_uploads_project_id", "uploads", "project_id"),
        ("idx_datasets_project_id", "datasets", "project_id"),
        ("idx_employee_projects_project_id", "employee_projects", "project_id"),
        ("idx_employee_projects_employee_id", "employee_projects", "employee_id"),
        ("idx_meetings_project_id", "meetings", "project_id")
    ]
    
    print("[INDEX ENGINE] Checking existing tables in the public schema...")
    with engine.connect() as conn:
        try:
            tables_query = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).fetchall()
            existing_tables = [r[0] for r in tables_query]
            print(f"    - Existing tables: {existing_tables}")
        except Exception as e:
            print(f"    - Failed to list tables: {e}")
            existing_tables = []

    # Map our planned checks to actual existing tables if names differ
    indexes = []
    
    # Uploads (project_id)
    if "uploads" in existing_tables:
        indexes.append(("idx_uploads_project_id", "uploads", "project_id"))
    
    # Datasets (project_id)
    if "datasets" in existing_tables:
        indexes.append(("idx_datasets_project_id", "datasets", "project_id"))
        
    # Employee Projects Map
    if "employee_project_map" in existing_tables:
        indexes.append(("idx_emp_proj_map_project", "employee_project_map", "project_id"))
        indexes.append(("idx_emp_proj_map_employee", "employee_project_map", "employee_id"))
    elif "employee_projects" in existing_tables:
        indexes.append(("idx_emp_proj_project", "employee_projects", "project_id"))
        indexes.append(("idx_emp_proj_employee", "employee_projects", "employee_id"))

    # Issues (project_id)
    if "issues" in existing_tables:
        indexes.append(("idx_issues_project_id", "issues", "project_id"))

    # Meetings (project_id)
    if "meetings" in existing_tables:
        indexes.append(("idx_meetings_project_id", "meetings", "project_id"))

    # MOM Sessions / Details
    if "mom_sessions" in existing_tables:
        indexes.append(("idx_mom_sessions_meeting", "mom_sessions", "meeting_id"))
    
    print("[INDEX ENGINE] Starting database index optimization...")
    for idx_name, table, column in indexes:
        # Open a fresh connection per index creation to avoid InFailedSqlTransaction issues
        with engine.connect() as conn:
            try:
                print(f"[+] Creating index '{idx_name}' on '{table}({column})'...")
                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column});"
                conn.execute(text(sql))
                conn.commit()
                print(f"    - Success: Index '{idx_name}' verified.")
            except Exception as e:
                print(f"    - [WARN] Failed to create index '{idx_name}': {e}")
                
    print("[INDEX ENGINE] Database index optimization complete!")

if __name__ == "__main__":
    apply_indexes()
