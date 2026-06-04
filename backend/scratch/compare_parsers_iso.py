import os
import sys
import time
import datetime
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.tracker_ingestion import TrackerIngestion
from sqlalchemy import func

def parse_isoformat(val):
    if val is None:
        return None
    if isinstance(val, datetime.datetime):
        return val.date()
    if isinstance(val, datetime.date):
        return val
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        # Attempt ISO format parsing directly
        try:
            return datetime.datetime.fromisoformat(val_str).date()
        except ValueError:
            pass
    # Fallback to pandas
    try:
        parsed = pd.to_datetime(val, errors='coerce')
        if pd.isna(parsed):
            return None
        return parsed.date()
    except:
        return None

db = SessionLocal()
try:
    project_id = 15
    subq = db.query(
        TrackerIngestion.file_name,
        func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()

    ingestions = db.query(TrackerIngestion).join(
        subq, 
        (TrackerIngestion.file_name == subq.c.file_name) & 
        (TrackerIngestion.created_at == subq.c.max_created)
    ).filter(TrackerIngestion.project_id == project_id).all()

    all_raw_records = []
    for ing in ingestions:
        if isinstance(ing.data, list):
            all_raw_records.extend(ing.data)
            
    # Extract all date values
    date_values = []
    from app.utils.analytics_utils import ALIASES
    date_aliases = ALIASES["planned_date"] + ALIASES["actual_date"]
    
    for r in all_raw_records:
        norm_record = {str(k).lower().strip().replace(" ", "_"): v for k, v in r.items()}
        for k, v in norm_record.items():
            if k in date_aliases and v is not None:
                date_values.append(v)
                
    print(f"Profiling {len(date_values)} date strings using fromisoformat()...")
    
    start_fast = time.perf_counter()
    fast_results = []
    for val in date_values:
        fast_results.append(parse_isoformat(val))
    fast_time = (time.perf_counter() - start_fast) * 1000
    print(f"fromisoformat() parser: {fast_time:.2f}ms")
    
    # Check correctness against pandas
    mismatches = 0
    for idx, val in enumerate(date_values):
        o = pd.to_datetime(val, errors='coerce').date()
        f = parse_isoformat(val)
        if o != f:
            print(f"Mismatch at index {idx}: original={o}, fast={f}, input={val}")
            mismatches += 1
            if mismatches >= 10:
                break
                
    if mismatches == 0:
        print("SUCCESS: fromisoformat() produced identical results to pandas!")
    else:
        print("FAILED: Found mismatches.")
        
finally:
    db.close()
