"""
migrate_budget.py — Safely adds new columns and creates budget_revisions table.
Run with: python migrate_budget.py
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
    with engine.connect() as conn:
        # 1. Add new columns to budget_summaries
        if table_exists(conn, 'budget_summaries'):
            if not column_exists(conn, 'budget_summaries', 'overall_budget'):
                conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN overall_budget FLOAT DEFAULT 0.0"))
                print("ADDED: overall_budget to budget_summaries")
            else:
                print("OK: overall_budget already exists")

            if not column_exists(conn, 'budget_summaries', 'attachment_name'):
                conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN attachment_name VARCHAR"))
                print("ADDED: attachment_name to budget_summaries")
            else:
                print("OK: attachment_name already exists")

            if not column_exists(conn, 'budget_summaries', 'attachment_data'):
                conn.execute(text("ALTER TABLE budget_summaries ADD COLUMN attachment_data TEXT"))
                print("ADDED: attachment_data to budget_summaries")
            else:
                print("OK: attachment_data already exists")
        else:
            print("NOTE: budget_summaries table does not exist yet -- will be created by FastAPI startup")

        conn.commit()

    # 2. Create budget_revisions table (create_all is idempotent)
    from app.models.budget import BudgetRevision, BudgetSummary  # noqa
    Base.metadata.create_all(bind=engine, checkfirst=True)
    print("OK: budget_revisions table ensured")
    print("Migration complete!")

if __name__ == "__main__":
    run_migration()
