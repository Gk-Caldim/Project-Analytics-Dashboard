import os, sys
sys.path.append(os.getcwd())

from app.core.database import engine, Base
from sqlalchemy import text, inspect

def migrate():
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('issues')]
        
        # 1. Rename source_type to source
        if 'source_type' in columns and 'source' not in columns:
            print("Renaming issues.source_type to issues.source...")
            conn.execute(text("ALTER TABLE issues RENAME COLUMN source_type TO source"))
            conn.commit()
        
        # 2. Add indexes if they don't exist
        indexes = [i['name'] for i in inspector.get_indexes('issues')]
        if 'ix_issues_status' not in indexes:
            print("Creating index ix_issues_status...")
            conn.execute(text("CREATE INDEX ix_issues_status ON issues (status)"))
            conn.commit()
        if 'ix_issues_due_date' not in indexes:
            print("Creating index ix_issues_due_date...")
            conn.execute(text("CREATE INDEX ix_issues_due_date ON issues (due_date)"))
            conn.commit()

    # 3. Create any missing tables (including issue_audit_logs)
    print("Creating missing tables...")
    from app.models.issue import Issue, IssueAuditLog  # Ensure models are registered
    Base.metadata.create_all(bind=engine)
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
