import os
import sys
from fastapi.testclient import TestClient

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

def test_lead_endpoint():
    client = TestClient(app)
    
    # Payload for the POST request
    payload = {
        "full_name": "Test User",
        "work_email": "test@mycompany.com",
        "company": "Test Company",
        "team_size": "51-200",
        "use_case": "General Inquiry",
        "message": "This is a test message from automated test suite."
    }
    
    print("Sending POST request to /api/enterprise/lead...")
    try:
        response = client.post("/api/enterprise/lead", json=payload)
        print(f"Response Status Code: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS!")
            print(response.json())
        else:
            print("FAILED!")
            print(response.text)
    except Exception as e:
        print(f"Exception raised: {e}")

if __name__ == "__main__":
    test_lead_endpoint()
