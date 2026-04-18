import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import SessionLocal
from app.models.project import Project
from app.models.issue import Issue
from app.models.employee import Employee
from app.models.department import Department
from app.models.meeting import Meeting
from sqlalchemy import text

def main():
    db = SessionLocal()
    
    try:
        # 1. Create a dummy project
        import random
        random_id = f"TEST-DEL-{random.randint(1000, 9999)}"
        test_project = Project(
            name="Delete Verification Project",
            project_id=random_id,
            status="Planning"
        )
        db.add(test_project)
        db.commit()
        db.refresh(test_project)
        p_id = test_project.id
        print(f"Created test project with ID: {p_id}")

        # 2. Create a dummy issue for this project
        test_issue = Issue(
            project_id=p_id,
            title="Test Deletion Issue",
            owner="Tester",
            source="Manual",
            status="Open"
        )
        db.add(test_issue)
        db.commit()
        db.refresh(test_issue)
        i_id = test_issue.id
        print(f"Created test issue with ID: {i_id} referencing project {p_id}")

        # 3. Delete the project
        print(f"Attempting to delete project {p_id}...")
        db.delete(test_project)
        db.commit()
        print("Project deleted successfully.")

        # 4. Check if issue still exists
        remaining_issue = db.query(Issue).filter(Issue.id == i_id).first()
        if remaining_issue is None:
            print("SUCCESS: Issue was automatically deleted via CASCADE.")
        else:
            print("FAILURE: Issue still exists in database!")

    except Exception as e:
        print(f"Error during verification: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    main()
