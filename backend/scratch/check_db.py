import os
from fastapi.testclient import TestClient
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Set path environment to ensure app is findable
import sys
sys.path.append(os.path.abspath("."))

from app.main import app

client = TestClient(app)

# Bypass get_current_user dependency
from app.api.auth import get_current_user
app.dependency_overrides[get_current_user] = lambda: {"employee_id": "SA001", "role": "Super Admin"}

response = client.get("/api/projects/all/structures")
print("STATUS CODE:", response.status_code)
if response.status_code == 200:
    data = response.json()
    for item in data:
        print(f"Project: {item.get('project_name')} | PM: {item.get('project_manager')} | TL/Employee Name: {item.get('employee_name')}")
else:
    print(response.text)
