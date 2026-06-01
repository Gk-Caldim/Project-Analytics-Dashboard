import requests
import json

try:
    print("Pinging health check endpoint...")
    r = requests.get("http://127.0.0.1:8000/healthz", timeout=5)
    result = {
        "status_code": r.status_code,
        "body": r.json()
    }
    print(f"Server is alive: {result}")
except Exception as e:
    result = {"error": str(e)}
    print(f"Server is unreachable: {e}")

with open("ping_result.txt", "w") as f:
    f.write(json.dumps(result, indent=2))
