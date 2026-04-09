from app.core.database import SessionLocal
from app.crud.project import get_projects

db = SessionLocal()
try:
    projects = get_projects(db)
    with open("test_out2.txt", "w") as f:
        f.write("Projects fetched successfully")
except Exception as e:
    import traceback
    with open("test_out2.txt", "w") as f:
        f.write(traceback.format_exc())
finally:
    db.close()
