import sys
import os

# Add the backend directory to sys.path dynamically
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.application_access import ApplicationAccess
from app.models.password_reset_token import PasswordResetToken

def main():
    output_lines = []
    def log(message):
        print(message)
        output_lines.append(message)

    # Instantiate the test client
    client = TestClient(app)
    db = SessionLocal()
    try:
        # Find a valid email in ApplicationAccess
        user_access = db.query(ApplicationAccess).first()
        if not user_access:
            log("No users found in ApplicationAccess to test forgot password.")
            return
        
        email = user_access.email
        log(f"Using registered email for test: {email}")

        # Trigger the forgot-password request in-process using the TestClient
        url = "/api/auth/forgot-password"
        payload = {"email": email}
        
        log(f"Sending in-process POST request to {url} with email {email}...")
        res = client.post(url, json=payload)
        
        log(f"Status Code: {res.status_code}")
        log(f"Response: {res.text}")
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        # Verify the token was written to database
        db.commit()  # refresh session
        token_record = db.query(PasswordResetToken).filter(
            PasswordResetToken.email == email.strip().lower()
        ).order_by(PasswordResetToken.id.desc()).first()
        
        if token_record:
            log("\n✅ SUCCESS: PasswordResetToken successfully written to the database!")
            log(f"  Token      : {token_record.token}")
            log(f"  Expires At : {token_record.expires_at}")
            log(f"  Used       : {token_record.used}")
        else:
            log("\n❌ FAILURE: No PasswordResetToken record found in the database!")
            
    except Exception as e:
        log(f"\n❌ Error during verification: {e}")
    finally:
        db.close()
        # Write output to verification_result.txt
        output_path = os.path.join(backend_dir, 'verification_result.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))
        print(f"Results written to {output_path}")

if __name__ == "__main__":
    main()
