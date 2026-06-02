
from app.core.database import SessionLocal
from app.models.employee import Employee

db = SessionLocal()
employees = db.query(Employee).all()
for emp in employees:
    print(f"Name: {emp.name}, Email: {emp.email}, Role: {emp.role}")
db.close()
