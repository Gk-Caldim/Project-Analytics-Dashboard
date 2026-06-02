from app.core.database import SessionLocal, engine, Base
from app.models.access_request import AccessRequest
from app.models.employee import Employee
from app.models.application_access import ApplicationAccess

def test_approve():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        req_id = 2
        req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
        if not req:
            print("Request not found")
            return
            
        print(f"Request: {req.email}, {req.name}, {req.role}")
        
        emp = db.query(Employee).filter(
            Employee.email == req.email,
            Employee.name == req.name,
            Employee.role == req.role
        ).first()
        
        if not emp:
            print("Employee not found")
            return
            
        print(f"Employee found: {emp.id}")
        
        new_access = ApplicationAccess(
            employee_id=emp.id,
            email=req.email,
            hashed_password=req.hashed_password
        )
        db.add(new_access)
        db.commit()
        print("Success")
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_approve()
