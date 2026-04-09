import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.api.project import get_all_project_structures
from app.api.tracker_api import get_project_modules
import json

def test():
    db = SessionLocal()
    try:
        # Test 1: all/structures
        print("Testing get_all_project_structures...")
        structures = get_all_project_structures(db=db, current_user={'email': 'test'})
        print(f"Found {len(structures)} project structures")
        
        for proj in structures[:2]:
            print(f"- Project: {proj['project_name']}")
            print(f"  Modules: {proj.get('modules')}")
            if proj.get('uploads'):
                print(f"  First upload modules: {proj['uploads'][0].get('modules')}")
                
        # Test 2: trackers/{project_id}/modules
        print("\nTesting get_project_modules for project_id 5...")
        try:
            import asyncio
            modules = asyncio.run(get_project_modules(project_id=5, db=db))
            print(f"Modules for project 5: {modules}")
        except Exception as e:
            print(f"Error in get_project_modules: {e}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test()
