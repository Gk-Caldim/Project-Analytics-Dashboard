from app.core.database import SessionLocal
from app.models.application_access import ApplicationAccess
from app.core.security import hash_password, verify_password

def test():
    db = SessionLocal()
    access = db.query(ApplicationAccess).filter(ApplicationAccess.email == 'deepak@gmail.com').first()
    if access:
        print(f"Old hash: {repr(access.hashed_password)}")
        # Simulate update_access
        new_password = "password123"
        access.hashed_password = hash_password(new_password)
        db.commit()
        db.refresh(access)
        print(f"New hash: {repr(access.hashed_password)}")
        # Simulate login
        is_valid = verify_password(new_password, access.hashed_password)
        print(f"Login valid? {is_valid}")
    else:
        print("Not found")
    db.close()

if __name__ == "__main__":
    test()
