import sys
import os
from unittest.mock import MagicMock, patch

# Add the backend directory to sys.path dynamically
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(backend_dir)

# Create results list to write to file
results = []
def log(msg):
    print(msg)
    results.append(msg)

# 1. Override app.core.config to use SQLite in-memory database
import app.core.config
app.core.config.DATABASE_URL = "sqlite:///:memory:"
app.core.config.IS_CLOUD_DB = False
app.core.config.ASYNC_DATABASE_URL = None

# Set mock SMTP env vars so the function runs without warnings
os.environ["SMTP_USERNAME"] = "test-smtp-user@gmail.com"
os.environ["SMTP_PASSWORD"] = "mockpass123"
os.environ["SENDER_EMAIL"] = "test-sender@gmail.com"

# Now import database and other modules
from app.core.database import Base, engine, SessionLocal
from app.models.application_access import ApplicationAccess
from app.models.employee import Employee
from app.models.user import User
from app.models.role import Role
from app.models.password_reset_token import PasswordResetToken
from app.api.auth import forgot_password, _send_reset_email_background
from fastapi import Request

class MockRequest(Request):
    def __init__(self):
        self.scope = {
            "type": "http",
            "client": ("127.0.0.1", 12345),
            "headers": [],
            "path": "/forgot-password"
        }

def run_test():
    log("=" * 60)
    log("  Running Mock Auth & SMTP Verification Test")
    log("=" * 60)

    try:
        # Create tables in the in-memory SQLite database
        Base.metadata.create_all(bind=engine)
        log("[Test] In-memory SQLite tables created successfully.")

        db = SessionLocal()
        
        # Create a mock user/employee/access record
        test_email = "pradeepravikumar64@gmail.com"
        
        # Add access record
        access = ApplicationAccess(
            email=test_email,
            hashed_password="mockhashedpassword"
        )
        db.add(access)
        db.commit()
        log(f"[Test] Inserted mock ApplicationAccess record for: {test_email}")

        # Set up SMTP Mock
        mock_smtp_instance = MagicMock()
        
        with patch('smtplib.SMTP') as mock_smtp_class:
            mock_smtp_class.return_value = mock_smtp_instance
            
            # Call forgot_password endpoint directly
            log("[Test] Calling forgot_password endpoint handler...")
            req = MockRequest()
            response = forgot_password(request=req, data={"email": test_email}, db=db)
            log(f"[Test] Endpoint Response: {response}")

            # Commit changes to ensure database is updated
            db.commit()

            # Verify PasswordResetToken has been written
            token_record = db.query(PasswordResetToken).filter(
                PasswordResetToken.email == test_email
            ).first()
            
            if not token_record:
                log("❌ FAIL: PasswordResetToken record not found in the database!")
                return False
            
            log("✅ SUCCESS: PasswordResetToken successfully written to the database!")
            log(f"  - Token: {token_record.token}")
            log(f"  - Expires At: {token_record.expires_at}")
            log(f"  - Used: {token_record.used}")

            # Verify that _send_reset_email_background is triggered and can send the email
            reset_link = f"http://localhost:5173/reset-password?token={token_record.token}&email={test_email}"
            log("[Test] Running _send_reset_email_background synchronously for verification...")
            _send_reset_email_background(test_email, reset_link)

            # Check SMTP connection calls
            mock_smtp_class.assert_called_once_with("smtp.gmail.com", 587, timeout=10)
            mock_smtp_instance.ehlo.assert_called()
            mock_smtp_instance.starttls.assert_called_once()
            mock_smtp_instance.login.assert_called_once_with("test-smtp-user@gmail.com", "mockpass123")
            mock_smtp_instance.sendmail.assert_called_once()
            mock_smtp_instance.quit.assert_called_once()

            # Retrieve sent email string
            sent_args = mock_smtp_instance.sendmail.call_args[0]
            from_email, to_email, msg_str = sent_args
            log("✅ SUCCESS: SMTP commands invoked correctly!")
            log(f"  - From: {from_email}")
            log(f"  - To: {to_email}")
            
            # Check for reset link and HTML components in sent message
            assert reset_link in msg_str, "Reset link missing from sent email!"
            assert "Password Reset Request" in msg_str, "Subject/Header missing from sent email!"
            assert "Industrial Analytics Workspace" in msg_str, "Branding footer missing from sent email!"
            log("✅ SUCCESS: Email content templates verified successfully!")
            
            db.close()
            return True

    except Exception as e:
        log(f"❌ FAIL: Test encountered unexpected error: {e}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = run_test()
    if success:
        log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")
    else:
        log("\n❌ SOME TESTS FAILED!")
    
    # Write to results file
    output_path = os.path.join(backend_dir, 'scratch', 'mock_verify_results.txt')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print(f"Results written to {output_path}")
