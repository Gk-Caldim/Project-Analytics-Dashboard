
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add current directory to path so we can import 'app'
sys.path.append(os.getcwd())

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_structures():
    from app.api.project import get_all_project_structures
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        # We need to mock current_user
        current_user = {"role": "Admin", "employee_id": "ADMIN001"}
        res = get_all_project_structures(db, current_user)
        import json
        print(json.dumps(res, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    run_structures()
