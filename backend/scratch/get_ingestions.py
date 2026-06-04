import os
import sys
# Dynamically add the parent directory (backend) to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.tracker_ingestion import TrackerIngestion
import json

db = SessionLocal()
try:
    ingestions = db.query(TrackerIngestion).all()
    if not ingestions:
        print("No tracker ingestions found in database.")
        sys.exit(0)
    
    print(f"{'ID':<5} | {'Project ID':<10} | {'File Name':<30} | {'Records':<8} | {'JSONB Length (Chars)':<20}")
    print("-" * 80)
    for ing in ingestions:
        rec_count = len(ing.data) if isinstance(ing.data, list) else 0
        json_len = len(json.dumps(ing.data))
        print(f"{ing.id:<5} | {ing.project_id:<10} | {ing.file_name:<30} | {rec_count:<8} | {json_len:<20}")
finally:
    db.close()
