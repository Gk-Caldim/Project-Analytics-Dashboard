import requests
import os

url = "http://localhost:8000/api/upload-tracker"
file_path = "tracker_critical_test.xlsx"

# Check if file exists, if not just skip the real file test
if not os.path.exists(file_path):
    print("Test file not found locally, skipping upload.")
    exit(0)

with open(file_path, "rb") as f:
    files = {"file": (file_path, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"project": "Ashok Leyland"}
    response = requests.post(url, files=files, data=data)

print(response.status_code)
print(response.json())
