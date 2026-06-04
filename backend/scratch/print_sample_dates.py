import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.tracker_ingestion import TrackerIngestion
from app.utils.analytics_utils import ALIASES

db = SessionLocal()
try:
    ing = db.query(TrackerIngestion).filter(TrackerIngestion.file_name == "Design_Release_Expanded.xlsx").first()
    if ing and ing.data:
        print("Keys present in first row:")
        first_row = ing.data[0]
        print(list(first_row.keys()))
        
        print("\nSample values for date-like fields:")
        date_aliases = ALIASES["planned_date"] + ALIASES["actual_date"]
        
        count = 0
        for row in ing.data:
            if count >= 10:
                break
            # Find any date-like key and print its value
            row_dates = {}
            for k, v in row.items():
                k_norm = str(k).lower().strip().replace(" ", "_")
                if k_norm in date_aliases:
                    row_dates[k] = v
            if row_dates:
                print(f"Row {count}: {row_dates}")
                count += 1
finally:
    db.close()
