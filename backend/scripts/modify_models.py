import os
import glob
import re

models_dir = r"c:\Users\user\Desktop\Projects\deep project analytics\Project-Analytics-Dashboard\backend\app\models"

# Exclude list: models that don't need org_id or already have it
exclude = [
    "__init__.py",
    "organization.py",
    "organization_user.py",
    "project.py",
    "issue.py",
    "employee.py",
    "budget.py",
    "role.py",
    "settings.py",
    "user.py"
]

for filepath in glob.glob(os.path.join(models_dir, "*.py")):
    filename = os.path.basename(filepath)
    if filename in exclude:
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "org_id =" in content or "org_id=" in content:
        continue # Already has org_id
        
    # We need to insert it after __tablename__ = "..."
    # or inside the class definition.
    # Let's find __tablename__ and insert after it.
    
    new_content = ""
    lines = content.split('\n')
    for i, line in enumerate(lines):
        new_content += line + "\n"
        if "__tablename__ = " in line:
            # Check if it's already there
            if not any("org_id" in l for l in lines[i:i+10]):
                indent = line[:len(line) - len(line.lstrip())]
                # Also we need to make sure we import Column, Integer, ForeignKey
                new_content += f"{indent}org_id = Column(Integer, ForeignKey(\"organizations.org_id\"), nullable=True, index=True)\n"
    
    # Ensure imports exist
    if "ForeignKey" not in new_content:
        new_content = "from sqlalchemy import ForeignKey\n" + new_content
    if "Integer" not in new_content:
        new_content = "from sqlalchemy import Integer\n" + new_content
    if "Column" not in new_content:
        new_content = "from sqlalchemy import Column\n" + new_content
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
        
print("Models updated.")
