import threading
import requests
import time

def fetch(url):
    print(f"Requesting {url}...")
    try:
        response = requests.get(url, timeout=10)
        print(f"Response from {url}: Status {response.status_code}, body length {len(response.text)}")
        if response.status_code == 500:
            print(f"\n--- 500 ERROR DETAILS FOR {url} ---")
            print(response.text[:1000])
            print("---------------------------------\n")
    except Exception as e:
        print(f"Error requesting {url}: {e}")

def main():
    urls = [
        "http://127.0.0.1:8000/api/roles/",
        "http://127.0.0.1:8000/api/settings/",
        "http://127.0.0.1:8000/api/employees",
        "http://127.0.0.1:8000/api/projects/",
        "http://127.0.0.1:8000/api/notifications/"
    ]
    
    threads = []
    start = time.time()
    for url in urls:
        t = threading.Thread(target=fetch, args=(url,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    end = time.time()
    print(f"\nDone in {end - start:.2f} seconds.")

if __name__ == "__main__":
    main()
