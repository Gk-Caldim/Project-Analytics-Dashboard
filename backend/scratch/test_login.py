from app.core.database import SessionLocal, engine
from sqlalchemy import text

def test():
    with engine.connect() as conn:
        print("--- ACCESS REQUESTS ---")
        result = conn.execute(text("SELECT id, email, status FROM access_requests WHERE email = 'deepak@gmail.com'"))
        for row in result:
            print(dict(zip(result.keys(), row)))
            
        print("--- APPLICATION ACCESS ---")
        result = conn.execute(text("SELECT id, email, hashed_password FROM application_access WHERE email = 'deepak@gmail.com'"))
        for row in result:
            print(dict(zip(result.keys(), row)))

if __name__ == "__main__":
    test()

if __name__ == "__main__":
    test()
