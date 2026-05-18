import requests
import threading
import time

def test_flow():
    login_url = "http://127.0.0.1:8000/api/auth/login"
    login_data = {
        "email": "sujitha250204@gmail.com",
        "password": "Caldim@2026"
    }
    
    print("Attempting to log in...")
    try:
        r = requests.post(login_url, json=login_data, timeout=10)
        if r.status_code != 200:
            print(f"Login failed: Status {r.status_code}, Response: {r.text}")
            return
        
        data = r.json()
        token = data.get("access_token")
        user = data.get("user")
        print(f"Login successful! User: {user['full_name']} ({user['role']})")
        
        # Authenticated endpoints
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        endpoints = [
            "http://127.0.0.1:8000/api/employees",
            "http://127.0.0.1:8000/api/projects/",
            "http://127.0.0.1:8000/api/notifications/",
            "http://127.0.0.1:8000/api/budget/",
            "http://127.0.0.1:8000/api/employees/columns/all",
            "http://127.0.0.1:8000/api/projects/columns/all"
        ]
        
        def fetch_authenticated(url):
            start = time.time()
            try:
                res = requests.get(url, headers=headers, timeout=10)
                duration = time.time() - start
                print(f"[{duration:.3f}s] {url} -> Status {res.status_code}, Length: {len(res.text)}")
                if res.status_code == 500:
                    print(f"--- 500 ERROR DETAILS FOR {url} ---")
                    print(res.text[:1000])
                    print("---------------------------------")
            except Exception as e:
                print(f"Error fetching {url}: {e}")

        print("\nSending concurrent, authenticated requests...")
        threads = []
        start_time = time.time()
        for url in endpoints:
            t = threading.Thread(target=fetch_authenticated, args=(url,))
            threads.append(t)
            t.start()
            
        for t in threads:
            t.join()
            
        print(f"\nAll requests completed in {time.time() - start_time:.2f} seconds.")
        
    except Exception as e:
        print(f"Error during flow: {e}")

if __name__ == "__main__":
    test_flow()
