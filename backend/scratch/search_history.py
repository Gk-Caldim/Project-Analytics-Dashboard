import os

dashboard_path = r"c:\Users\user\Desktop\Projects\deep project analytics\Project-Analytics-Dashboard\frontend\src\pages\ProjectDashboard.jsx"

if os.path.exists(dashboard_path):
    print("ProjectDashboard.jsx found.")
    with open(dashboard_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if "milestones" in line.lower() and "set" in line.lower() and "state" in line.lower():
                print(f"Line {idx+1}: {line.strip()}")
            elif "const [milestones" in line:
                print(f"Line {idx+1}: {line.strip()}")
else:
    print("ProjectDashboard.jsx not found.")
