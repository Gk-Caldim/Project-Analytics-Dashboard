import sys
import os
sys.path.append(os.getcwd())
from app.core.database import engine
from sqlalchemy import text

def fix_index():
    with engine.connect() as conn:
        print("Dropping unique index...")
        conn.execute(text('DROP INDEX IF EXISTS ix_budget_summaries_project_name'))
        print("Creating non-unique index...")
        conn.execute(text('CREATE INDEX ix_budget_summaries_project_name ON budget_summaries (project_name)'))
        conn.commit()
        print("Index updated successfully!")

if __name__ == "__main__":
    fix_index()
