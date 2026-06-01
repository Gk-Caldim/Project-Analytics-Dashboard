import sys
import os

# Add the backend directory to sys.path dynamically
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(backend_dir)

from app.core.database import SessionLocal
from app.models.application_access import ApplicationAccess
from app.models.password_reset_token import PasswordResetToken
from app.api.auth import forgot_password
from fastapi import Request

class MockRequest(Request):
    def __init__(self):
        # minimal scope mock to satisfy slowapi/limiter check
        self.scope = {
            "type": "http",
            "client": ("127.0.0.1", 12345),
            "headers": [],
            "path": "/forgot-password"
        }

def main():
    db = SessionLocal()
    try:
        user_access = db.query(ApplicationAccess).first()
        if not user_access:
            print("No users in ApplicationAccess.")
            return
        
        email = user_access.email
        print(f"Testing direct endpoint call for: {email}")

        # Call forgot_password directly
        req = MockRequest()
        res = forgot_password(request=req, data={"email": email}, db=db)
        print(f"Endpoint result: {res}")
        
        # Verify the database has the new token
        db.commit()
        token_record = db.query(PasswordResetToken).filter(
            PasswordResetToken.email == email.strip().lower()
        ).order_by(PasswordResetToken.id.desc()).first()
        
        if token_record:
            print("\n✅ DIRECT VERIFICATION SUCCESS!")
            print(f"  Token      : {token_record.token}")
            print(f"  Expires At : {token_record.expires_at}")
            print(f"  Used       : {token_record.used}")
        else:
            print("\n❌ DIRECT VERIFICATION FAILURE: No token record found!")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
