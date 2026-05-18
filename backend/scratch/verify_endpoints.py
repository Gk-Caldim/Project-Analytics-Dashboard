import requests

def test_endpoints():
    endpoints = [
        "http://127.0.0.1:8000/api/roles/",
        "http://127.0.0.1:8000/api/settings/"
    ]
    
    for url in endpoints:
        print(f"\nFetching {url}...")
        try:
            res = requests.get(url, timeout=5)
            print(f"Status Code: {res.status_code}")
            if res.status_code == 200:
                print(f"Success! Fetched {len(res.json())} items.")
            else:
                print(f"Failed: {res.text[:500]}")
        except Exception as e:
            print(f"Exception raised: {e}")

if __name__ == "__main__":
    test_endpoints()
