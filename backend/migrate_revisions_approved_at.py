"""
migrate_revisions_approved_at.py — Safely adds approved_at column to budget_revisions table.
Run with: python migrate_revisions_approved_at.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
from sqlalchemy import text, inspect

def column_exists(conn, table_name, column_name):
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns

def table_exists(conn, table_name):
    inspector = inspect(conn)
    return table_name in inspector.get_table_names()

def run_migration():
    print("[Migration] Connecting to database...")
    with engine.connect() as conn:
        if table_exists(conn, 'budget_revisions'):
            if not column_exists(conn, 'budget_revisions', 'approved_at'):
                print("[Migration] Adding column approved_at to budget_revisions...")
                conn.execute(text("ALTER TABLE budget_revisions ADD COLUMN approved_at TIMESTAMP WITHOUT TIME ZONE"))
                conn.commit()
                print("[Migration] ADDED: approved_at to budget_revisions")
            else:
                print("[Migration] OK: approved_at already exists in budget_revisions")
        else:
            print("[Migration] NOTE: budget_revisions table does not exist yet. It will be created on next startup.")
    
    print("[Migration] Migration check complete!")

if __name__ == "__main__":
    run_migration()
