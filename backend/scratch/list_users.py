import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.abspath('c:/Users/user/Desktop/Projects/deep project analytics/Project-Analytics-Dashboard/backend'))

from app.core.database import SessionLocal
from app.models.application_access import ApplicationAccess
from app.models.employee import Employee

db = SessionLocal()
try:
    users = db.query(ApplicationAccess).all()
    print("Application Access Users:")
    for u in users:
        emp = db.query(Employee).filter(Employee.id == u.employee_id).first()
        print(f"Email: {u.email}, Employee Name: {emp.name if emp else 'N/A'}")
finally:
    db.close()
