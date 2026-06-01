import sys
from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.application_access import ApplicationAccess

db = SessionLocal()
try:
    print("EMPLOYEES:", flush=True)
    for emp in db.query(Employee).all():
        print(f"Emp - Name: {emp.name}, Email: {emp.email}", flush=True)

    print("APPLICATION ACCESS:", flush=True)
    for access in db.query(ApplicationAccess).all():
        print(f"Access - Email: {access.email}", flush=True)
finally:
    db.close()
