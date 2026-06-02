import requests
r = requests.get('http://localhost:8000/api/projects/all/structures')
data = r.json()
print("Type of data:", type(data))
if isinstance(data, dict):
    print("Keys:", data.keys())
    if 'data' in data:
        print("Data type:", type(data['data']))
        if isinstance(data['data'], list) and len(data['data']) > 0:
            for proj in data['data']:
                for u in proj.get('uploads', []):
                    if u.get('upload_id') == 40:
                        print("Found upload_id=40 in project:", proj.get('project_name'))
                        print("Upload:", u)
