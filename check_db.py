import sys
import os

# Add project root directory to Python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from backend.app.core.database import SessionLocal
from backend.app.models.issue import Issue
from backend.app.models.project import Project


def check():
    db = SessionLocal()
    try:
        print("Checking Projects...")
        projects = db.query(Project).all()
        
        if not projects:
            print("No projects found.")
        else:
            for p in projects:
                print(f"Project: ID={p.id}, Name={p.name}")
        
        print("\nChecking MOM Issues...")
        issues = db.query(Issue).filter(Issue.source == 'MOM').all()
        
        print(f"Total MOM Issues found: {len(issues)}")
        
        if not issues:
            print("No MOM issues found.")
        else:
            for i in issues:
                print(
                    f"Issue: ID={i.id}, ProjectID={i.project_id}, "
                    f"Title={i.title}, CreatedAt={i.created_at}"
                )

    except Exception as e:
        print("Error occurred:", e)

    finally:
        db.close()


if __name__ == "__main__":
    check()