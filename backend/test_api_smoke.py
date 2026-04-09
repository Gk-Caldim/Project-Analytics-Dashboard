"""Quick API smoke test"""
import requests

base = 'http://localhost:8000/api'

# Try login
login = requests.post(f'{base}/auth/login', json={'email': 'admin@caldim.com', 'password': 'Admin@123'}, timeout=5)
if login.status_code != 200:
    login = requests.post(f'{base}/auth/login', json={'email': 'admin@example.com', 'password': 'admin123'}, timeout=5)
print('Login status:', login.status_code)

if login.status_code != 200:
    print('Login response:', login.text[:300])
else:
    token = login.json().get('access_token') or login.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}

    # Test /projects/all/structures
    r = requests.get(f'{base}/projects/all/structures', headers=headers, timeout=5)
    print('Structures status:', r.status_code)
    if r.status_code == 200:
        data = r.json()
        print(f'Projects with data: {len(data)}')
        for proj in data:
            modules = [m['module_name'] for m in proj.get('modules', [])]
            print(f'  {proj["project_name"]} -> modules: {modules}')
    else:
        print('Error:', r.text[:300])
