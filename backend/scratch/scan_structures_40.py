
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
        
        for p in res:
            for u in p.get("uploads", []):
                if u.get("upload_id") == 40:
                    print(f"!!! FOUND UPLOAD 40 in project {p['project_name']} !!!")
                if u.get("dataset_id") == 40:
                    print(f"!!! FOUND DATASET 40 in project {p['project_name']} !!!")
        
        print("Done scanning structures.")
    finally:
        db.close()

if __name__ == "__main__":
    run_structures()
