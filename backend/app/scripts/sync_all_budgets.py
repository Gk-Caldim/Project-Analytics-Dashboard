import os
import sys

# Add the project root to sys.path so we can import 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", "..")) # backend/app/scripts -> backend
if project_root not in sys.path:
    sys.path.append(project_root)

from app.core.database import SessionLocal
from app.models.project import Project
from app.crud.project_sub_category import sync_project_budget

def sync_all():
    db = SessionLocal()
    try:
        print("Starting budget synchronization for all projects...")
        projects = db.query(Project).all()
        count = 0
        for project in projects:
            if project.project_id:
                sync_project_budget(db, project.project_id)
                count += 1
        print(f"Successfully synchronized {count} projects.")
    except Exception as e:
        print(f"Error during synchronization: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sync_all()
