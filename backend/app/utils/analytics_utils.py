"""
analytics_utils.py
Utility to map flexible JSONB keys to standard tracker metrics.
Used by Dashboard Service to process IngestionEngine output.
"""
import logging
import pandas as pd
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

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
        try:
            standard["planned_date"] = pd.to_datetime(planned_val, errors='coerce').date()
        except:
            pass

    # 4. Resolve Actual Date
    actual_val = None
    for alias in ALIASES["actual_date"]:
        if alias in keys:
            actual_val = norm_record[alias]
            break
    
    if actual_val:
        try:
            standard["actual_date"] = pd.to_datetime(actual_val, errors='coerce').date()
        except:
            pass

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
    return [standardize_record(r) for r in records]
