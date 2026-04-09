from app.core.database import SessionLocal
from app.crud.project import get_projects

db = SessionLocal()
try:
    projects = get_projects(db)
    print("Projects fetched successfully:", len(projects))
    print(projects[0].__dict__ if projects else "No projects")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
