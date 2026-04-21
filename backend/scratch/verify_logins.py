import requests
import json

def test_login(email, password):
    url = "http://localhost:8000/api/auth/login"
    payload = {"email": email, "password": password}
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Testing login for {email}:")
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            print(f"  ✅ SUCCESS")
            print(f"  User ID: {user.get('id')}")
            print(f"  Role: {user.get('role')}")
            print(f"  Employee ID: {user.get('employee_id')}")
            return True
        else:
            print(f"  ❌ FAILED ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    # Test cases based on database exploration
    test_cases = [
        ("superadmin@caldim.com", "Caldim@2026"),
        ("sujitha250204@gmail.com", "Caldim@2026"),
        ("gokulcaldim@gmail.com", "Caldim@2026"),
    ]
    
    for email, password in test_cases:
        test_login(email, password)
