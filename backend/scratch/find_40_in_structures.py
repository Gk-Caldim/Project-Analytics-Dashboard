
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from dotenv import load_dotenv

sys.path.append(os.getcwd())

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_structures():
    from app.api.project import get_all_project_structures
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        current_user = {"role": "Admin", "employee_id": "ADMIN001"}
        res = get_all_project_structures(db, current_user)
        
        found = False
        for proj in res:
            for upload in proj.get("uploads", []):
                if upload.get("upload_id") == 40 or upload.get("dataset_id") == 40:
                    print(f"FOUND ID 40 in project: {proj['project_name']}")
                    import json
                    print(json.dumps(upload, indent=2))
                    found = True
            
            for mod in proj.get("modules", []):
                # The frontend builds submodule from modules too, but it needs an upload_id.
                # In backend, 'modules' list doesn't have upload_id. 
                # The frontend maps it using moduleMap.
                pass

        if not found:
            print("ID 40 not found in any project structure.")

    finally:
        db.close()

if __name__ == "__main__":
    run_structures()
