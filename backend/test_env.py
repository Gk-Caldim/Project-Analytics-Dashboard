import os
from dotenv import load_dotenv

print("--- BEFORE load_dotenv() ---")
print("ZOOM_ACCOUNT_ID:", repr(os.environ.get("ZOOM_ACCOUNT_ID")))
print("ZOOM_CLIENT_ID:", repr(os.environ.get("ZOOM_CLIENT_ID")))
print("ZOOM_CLIENT_SECRET:", repr(os.environ.get("ZOOM_CLIENT_SECRET")))

load_dotenv()

print("\n--- AFTER load_dotenv() ---")
print("ZOOM_ACCOUNT_ID:", repr(os.environ.get("ZOOM_ACCOUNT_ID")))
print("ZOOM_CLIENT_ID:", repr(os.environ.get("ZOOM_CLIENT_ID")))
print("ZOOM_CLIENT_SECRET:", repr(os.environ.get("ZOOM_CLIENT_SECRET")))
