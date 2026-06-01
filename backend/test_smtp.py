"""
Quick SMTP test — run with:  python test_smtp.py
Reads credentials from .env and verifies Gmail App Password is working.
"""
import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

user = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
pwd  = os.getenv("SMTP_PASSWORD")
host = os.getenv("SMTP_SERVER", "smtp.gmail.com")
port = int(os.getenv("SMTP_PORT", 587))

print("=" * 55)
print("  SMTP Credential Check")
print("=" * 55)
print(f"  Host     : {host}:{port}")
print(f"  Username : {user}")

if not pwd or "placeholder" in pwd:
    print("  Password : ❌ NOT SET (still placeholder)")
    print()
    print("  → Open .env and replace SMTP_PASSWORD=your_gmail_app_password_here")
    print("    with the 16-character App Password from Google Account → Security.")
else:
    print(f"  Password : ✅ SET ({len(pwd.replace(' ', ''))} chars without spaces)")

print()

if not user or not pwd or "placeholder" in pwd:
    print("Cannot test — credentials incomplete.")
    exit(1)

print("Connecting to Gmail SMTP…")
try:
    s = smtplib.SMTP(host, port, timeout=10)
    s.ehlo()
    s.starttls()
    s.ehlo()
    s.login(user, pwd)
    s.quit()
    print()
    print("✅  SUCCESS — Gmail App Password is valid.")
    print("    Password reset emails will be sent automatically.")

except smtplib.SMTPAuthenticationError:
    print()
    print("❌  AUTHENTICATION FAILED")
    print("    Possible causes:")
    print("    1. App Password is wrong — regenerate it from Google Account → Security → App Passwords")
    print("    2. 2-Step Verification is NOT enabled on this Gmail account (required)")
    print("    3. 'Less secure app access' is irrelevant — use App Passwords only")

except smtplib.SMTPConnectError as e:
    print(f"❌  Cannot connect to {host}:{port} — {e}")

except Exception as e:
    print(f"❌  Error: {e}")
