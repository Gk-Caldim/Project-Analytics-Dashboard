import os
import sys
from sqlalchemy import text

# Set up path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal

def inspect_schema():
    db = SessionLocal()
    try:
        print("--- Inspecting Database Tables for Indexes ---")
        tables = ['employees', 'projects', 'employee_project_map', 'project_permissions', 'application_access']
        
        # Query PG Indexes
        for table in tables:
            sql = f"""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = '{table}' AND schemaname = 'public';
            """
            res = db.execute(text(sql)).fetchall()
            print(f"\nTable: '{table}'")
            if not res:
                print("  (No indexes found)")
            for row in res:
                print(f"  - Index: {row[0]}")
                print(f"    Definition: {row[1]}")

        print("\n" + "="*50 + "\n")
        print("--- Inspecting Foreign Key Deletion Cascades ---")
        
        # Query foreign key constraints and their delete rule (cascade, set null, restrict, etc.)
        fk_sql = """
        SELECT
            tc.table_name AS constrained_table,
            kcu.column_name AS constrained_column,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column,
            rc.delete_rule AS on_delete_action,
            tc.constraint_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON rc.unique_constraint_name = ccu.constraint_name
              AND rc.unique_constraint_schema = ccu.table_schema
        WHERE
            tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND (tc.table_name IN ('projects', 'employee_project_map', 'project_permissions', 'application_access') 
                 OR ccu.table_name = 'employees');
        """
        fks = db.execute(text(fk_sql)).fetchall()
        if not fks:
            print("No foreign key constraints found matching employees/projects tables.")
        for row in fks:
            print(f"FK Constraint: {row[5]}")
            print(f"  - Column: {row[0]}.{row[1]}")
            print(f"  - References: {row[2]}.{row[3]}")
            print(f"  - On Delete Action: {row[4]}")
            print()

    except Exception as e:
        print(f"Error during inspection: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_schema()
