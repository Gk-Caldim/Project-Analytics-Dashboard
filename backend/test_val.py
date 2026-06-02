import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_invalid_validation():
    # 1. Create a custom column "Personal Phone" of type "phone"
    col_payload = {
        "column_name": "personal_phone",
        "column_label": "Personal Phone",
        "data_type": "phone",
        "is_required": True,
        "validation_rules": {}
    }
    requests.post(f"{BASE_URL}/employees/columns/create", json=col_payload)
    
    # 2. Try to create an employee with invalid phone (letters)
    emp_payload = {
        "employee_id": "EMP_TEST_VAL",
        "name": "Validation Test",
        "email": "val@test.com",
        "department": "IT",
        "status": "Active",
        "custom_fields": {
            "personal_phone": "INVALID123" # Should fail phone validation (requires 10 digits)
        }
    }
    
    response = requests.post(f"{BASE_URL}/employees", json=emp_payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")

if __name__ == "__main__":
    test_invalid_validation()
