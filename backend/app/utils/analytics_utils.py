"""
analytics_utils.py
Utility to map flexible JSONB keys to standard tracker metrics.
Used by Dashboard Service to process IngestionEngine output.
"""
import logging
import datetime
import pandas as pd
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

total_date_parsing_time = 0.0

def fast_parse_date(val) -> datetime.date | None:
    global total_date_parsing_time
    import time
    start = time.perf_counter()
    
    res = _fast_parse_date_impl(val)
    
    total_date_parsing_time += (time.perf_counter() - start) * 1000
    return res

def _fast_parse_date_impl(val) -> datetime.date | None:
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

# Standard Aliases (must match excel_parser.py for consistency)
ALIASES = {
    "module":       ["module", "function", "phase", "category", "dept", "department", "system", "commodity", "part_category"],
    "milestone":    ["milestone", "task", "activity", "deliverable", "description", "item", "part_description", "part_number"],
    "planned_date": ["planned_date", "target_date", "plan_date", "baseline_date", "start_date", "scheduled_date", "cae_analysis_plan", "l0_drawing_release_plan", "l1_drawing_release_plan", "l2_drawing_release_plan"],
    "actual_date":  ["actual_date", "closure_date", "close_date", "completion_date", "finish_date", "end_date", "cae_analysis_actual", "l0_drawing_release_actual", "l1_drawing_release_actual", "l2_drawing_release_actual"],
}

def standardize_record(raw_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maps a raw dict from JSONB to a standardized tracker object.
    Uses alias-matching to find relevant 'axes'.
    """
    standard = {
        "module":         None,
        "milestone_name": None,
        "planned_date":   None,
        "actual_date":    None,
        "status":         "Pending",
        "delay_days":     0,
        "raw":            raw_record # Keep raw for debugging
    }

    # Normalize keys to lowercase underscores for matching
    norm_record = {str(k).lower().strip().replace(" ", "_"): v for k, v in raw_record.items()}
    keys = norm_record.keys()

    # 1. Resolve Module
    for alias in ALIASES["module"]:
        if alias in keys:
            standard["module"] = str(norm_record[alias]).strip()
            break
    
    # 2. Resolve Milestone
    for alias in ALIASES["milestone"]:
        if alias in keys:
            standard["milestone_name"] = str(norm_record[alias]).strip()
            break

    # 3. Resolve Planned Date
    planned_val = None
    for alias in ALIASES["planned_date"]:
        if alias in keys:
            planned_val = norm_record[alias]
            break
    
    if planned_val:
        standard["planned_date"] = fast_parse_date(planned_val)

    # 4. Resolve Actual Date
    actual_val = None
    for alias in ALIASES["actual_date"]:
        if alias in keys:
            actual_val = norm_record[alias]
            break
    
    if actual_val:
        standard["actual_date"] = fast_parse_date(actual_val)

    # 5. Compute Status & Delay
    if standard["planned_date"]:
        if not standard["actual_date"]:
            standard["status"] = "Pending"
            standard["delay_days"] = 0
        else:
            delay = (standard["actual_date"] - standard["planned_date"]).days
            standard["delay_days"] = delay
            standard["status"] = "Delayed" if delay > 0 else "On Track"
    
    return standard

def standardize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Standardizes a whole list of records."""
    global total_date_parsing_time
    total_date_parsing_time = 0.0
    res = [standardize_record(r) for r in records]
    print(f"date parsing time: {total_date_parsing_time:.2f}ms")
    return res

def compute_tracker_summary(raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Groups and precomputes static milestone/module stats for a tracker upload.
    This avoids standardizing thousands of raw records on read requests.
    """
    records = standardize_records(raw_records)
    module_map = {}
    for r in records:
        mod = r["module"] or "Unknown"
        if mod not in module_map:
            module_map[mod] = {
                "module": mod,
                "total": 0,
                "completed": 0,
                "delayed": 0,
                "pending": 0,
                "total_delay_days": 0,
                "max_delay_days": 0
            }
        m_stat = module_map[mod]
        m_stat["total"] += 1
        status = r["status"]
        if status == "On Track":
            m_stat["completed"] += 1
        elif status == "Delayed":
            m_stat["delayed"] += 1
            delay = r["delay_days"] or 0
            m_stat["total_delay_days"] += delay
            if delay > m_stat["max_delay_days"]:
                m_stat["max_delay_days"] = delay
        else:
            m_stat["pending"] += 1
    return {"modules": module_map}
