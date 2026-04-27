from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
result = db.execute(text("SELECT id, project_id, name FROM projects")).fetchall()
print("Projects:", result)

result2 = db.execute(text("SELECT id, file_name, department, project_id FROM uploads")).fetchall()
print("Uploads:", result2)

result3 = db.execute(text("SELECT id, name, department, project FROM datasets")).fetchall()
print("Datasets:", result3)
