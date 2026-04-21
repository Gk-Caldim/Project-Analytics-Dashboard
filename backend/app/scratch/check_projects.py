from app.core.database import SessionLocal
from app.models.project import Project

db = SessionLocal()
projects = db.query(Project).all()
for p in projects:
    print(f"ID: {p.id} | Name: {p.name} | PID: {p.project_id}")
db.close()
