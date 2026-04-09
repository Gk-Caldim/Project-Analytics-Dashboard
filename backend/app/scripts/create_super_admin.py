import sys
import os

# Add the backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.employee import Employee
from app.core.security import hash_password

def create_super_admin():
    db = SessionLocal()
    
    # All modules as per MODULE_LIST in frontend
    all_modules = [
        'Dashboard', 'MOM', 'Employee Master', 'Project Master', 
        'Department Master', 'Upload Trackers', 
        'Budget Upload', 'Settings'
    ]
    
    employee_id = "SA001"
    email = "superadmin@caldim.com"
    password = "Caldim@2026"
    name = "Super Admin"
    department = "IT Administration"

    try:
        # Check if user already exists
        existing_user = db.query(Employee).filter(Employee.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists. Updating permissions...")
            existing_user.modules = all_modules
            existing_user.role = "Super Admin"
            existing_user.hashed_password = hash_password(password)
            db.commit()
            print(f"Successfully updated super admin user: {email}")
            return

        employee = Employee(
            employee_id=employee_id,
            name=name,
            email=email,
            department=department,
            role="Super Admin",
            status="Active",
            modules=all_modules,
            hashed_password=hash_password(password),
        )

        db.add(employee)
        db.commit()
        print(f"Successfully created super admin user: {email} (ID: {employee_id})")
    except Exception as e:
        db.rollback()
        print(f"Error creating super admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
