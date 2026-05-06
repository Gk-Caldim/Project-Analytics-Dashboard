"""Test fixes for: 1) quantity cols parsed as 1970-01-01, 2) NaT in raw dict becomes string"""
import sys, json, datetime
sys.path.insert(0, r'C:\Users\user\Desktop\Projects\deep project analytics\Project-Analytics-Dashboard\backend')

import pandas as pd
from app.utils.ingestion import IngestionEngine
from app.services.tracker_service import _serialize_for_json, _clean_value

# ── Test 1: planned_quantity / actual_quantity must stay as numbers ──────────
print("TEST 1: Numeric quantity columns not parsed as dates")
engine = IngestionEngine()
df = pd.DataFrame({
    'build_phase': ['EP', 'Gen1', 'PP1'],
    'location':    ['MRV', 'Nagpur', 'Nagpur'],
    'planned_quantity': [10, 15, 20],
    'actual_quantity':  [5, None, None],
    'plan_dates':  [datetime.datetime(2026,6,1), datetime.datetime(2026,6,8), None],
    'actual_dates': [datetime.datetime(2026,6,4), None, None],
    'status': ['Completed', 'In Progress', 'Yet to Start']
})
cleaned = engine._clean_data(df.copy())
pq = cleaned['planned_quantity'].tolist()
aq = [x for x in cleaned['actual_quantity'].tolist() if x is not None and str(x) not in ('', 'None', '<NA>')]
print(f"  planned_quantity values: {pq}")
print(f"  actual_quantity values (non-null): {aq}")
assert all(isinstance(v, (int, float)) or str(v).isdigit() for v in pq if v is not None), "FAIL: quantity parsed as date!"
print("  PASS: quantities remain numeric")

# ── Test 2: NaT inside raw dict must become None, not crash into str() ───────
print()
print("TEST 2: NaT/nan inside nested raw dict serializes to null")
import pandas as _pd
nat_record = {
    "raw": {
        "build_phase": "EP",
        "location": "MRV",
        "planned_quantity": 10,
        "actual_quantity": float('nan'),
        "plan_dates": "2026-06-08",
        "actual_dates": _pd.NaT,
        "status": "In Progress"
    },
    "module": None,
    "status": "Pending",
    "delay_days": 0
}
result = _serialize_for_json([nat_record])
serialized_json = json.dumps(result)  # must not raise
raw_out = result[0]["raw"]
print(f"  raw type: {type(raw_out).__name__}")
print(f"  raw['actual_dates']: {raw_out.get('actual_dates')}")
print(f"  raw['actual_quantity']: {raw_out.get('actual_quantity')}")
assert isinstance(raw_out, dict), "FAIL: raw is not a dict!"
assert raw_out.get('actual_dates') is None, "FAIL: NaT not converted to None!"
assert raw_out.get('actual_quantity') is None, "FAIL: nan not converted to None!"
print("  PASS: NaT -> null, nan -> null, raw stays a dict")
print()
print("ALL TESTS PASSED")
