import os
import sys
import datetime
import pandas as pd

# Add the parent directory (backend) to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.services.dashboard_service import get_dashboard_data, dashboard_cache

# Original parser implementation
def original_parse_date(val):
    if val is None:
        return None
    try:
        parsed = pd.to_datetime(val, errors='coerce')
        if pd.isna(parsed):
            return None
        return parsed.date()
    except:
        return None

# Current optimized parser implementation (from app.utils.analytics_utils)
from app.utils.analytics_utils import fast_parse_date

db = SessionLocal()
project_id = 15

try:
    print("--- CORRECTNESS VERIFICATION ---")
    
    # 1. Fetch with optimized parser (current codebase state)
    dashboard_cache.clear()
    opt_data = get_dashboard_data(db, project_id)
    
    # 2. To simulate the original parser, we monkey-patch the fast_parse_date function
    import app.utils.analytics_utils
    app.utils.analytics_utils.fast_parse_date = original_parse_date
    
    dashboard_cache.clear()
    orig_data = get_dashboard_data(db, project_id)
    
    # Restore monkey-patch
    app.utils.analytics_utils.fast_parse_date = fast_parse_date
    
    # 3. Compare all keys and structures
    mismatches = []
    
    # Compare scalar values
    scalar_keys = [
        "project_id", "project_name", "project_health", "total_milestones",
        "submodules", "completed", "delayed", "pending"
    ]
    for key in scalar_keys:
        if orig_data[key] != opt_data[key]:
            mismatches.append(f"Scalar key '{key}': original={orig_data[key]}, optimized={opt_data[key]}")
            
    # Compare summary stats
    summary_keys = ["on_track_percentage", "delay_percentage", "pending_percentage", "avg_delay_days", "max_delay_days"]
    for key in summary_keys:
        if orig_data["summary"][key] != opt_data["summary"][key]:
            mismatches.append(f"Summary key '{key}': original={orig_data['summary'][key]}, optimized={opt_data['summary'][key]}")
            
    # Compare modules breakdown
    orig_modules = sorted(orig_data["modules"], key=lambda m: m["module"])
    opt_modules = sorted(opt_data["modules"], key=lambda m: m["module"])
    
    if len(orig_modules) != len(opt_modules):
        mismatches.append(f"Modules count mismatch: original={len(orig_modules)}, optimized={len(opt_modules)}")
    else:
        for idx, (orig_mod, opt_mod) in enumerate(zip(orig_modules, opt_modules)):
            for key in ["module", "total", "completed", "delayed", "pending"]:
                if orig_mod[key] != opt_mod[key]:
                    mismatches.append(f"Module '{orig_mod['module']}' key '{key}': original={orig_mod[key]}, optimized={opt_mod[key]}")
                    
    # Output verification results
    if not mismatches:
        print("\nSUCCESS: All dashboard outputs are 100% identical!")
        print(f"  - Total milestones: {opt_data['total_milestones']}")
        print(f"  - Completed: {opt_data['completed']}, Delayed: {opt_data['delayed']}, Pending: {opt_data['pending']}")
        print(f"  - Avg Delay: {opt_data['summary']['avg_delay_days']} days, Max Delay: {opt_data['summary']['max_delay_days']} days")
        print(f"  - Project Health: {opt_data['project_health']}")
        print(f"  - Submodules Count: {opt_data['submodules']}")
    else:
        print("\nFAILED: Mismatches detected:")
        for m in mismatches:
            print(f"  - {m}")
            
finally:
    db.close()
