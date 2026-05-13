import json
import requests

def repro_post_error():
    url = "http://127.0.0.1:8000/api/budget/Ashok%20Leyland"
    
    # Simulate the formatted data that might cause issues
    budget_data = [
        {"Category": "Test", "Item Name": "Test Item", "Total utilization": "₹ 1,234.56", "Balance": "10,000.00"}
    ]
    
    data = {
        "overall_budget": 50000.0,
        "uploaded_by": "Admin",
        "budget_data": json.dumps(budget_data),
        "sync_to_project": "true"
    }
    
    print(f"Testing POST for project: Ashok Leyland")
    response = requests.post(url, data=data)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 500:
        print(f"Response Body: {response.text}")
    else:
        print("POST successful!")

if __name__ == "__main__":
    repro_post_error()
