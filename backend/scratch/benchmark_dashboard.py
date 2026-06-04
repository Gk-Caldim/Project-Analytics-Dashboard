import os
import sys
import time

# Dynamically add the parent directory (backend) to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.services.dashboard_service import get_dashboard_data, dashboard_cache
from app.services.issue_service import compute_analytics
from app.utils.analytics_utils import standardize_records, standardize_record
from app.models.tracker_ingestion import TrackerIngestion
from sqlalchemy import func

# Clear cache to guarantee full execution flow
dashboard_cache.clear()

db = SessionLocal()
project_id = 15

try:
    print("--- BENCHMARK START ---")
    
    # 1. Total Dashboard Data Timing
    start_total = time.perf_counter()
    dashboard_data = get_dashboard_data(db, project_id)
    total_time = (time.perf_counter() - start_total) * 1000
    print(f"dashboard total: {total_time:.2f}ms")
    
    # 2. Compute Analytics Timing
    start_analytics = time.perf_counter()
    issue_data = compute_analytics(db, project_id)
    analytics_time = (time.perf_counter() - start_analytics) * 1000
    print(f"compute_analytics: {analytics_time:.2f}ms")
    
    # 3. Retrieve raw records to measure standardize_records independently
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
            
    print(f"\nLoaded {len(all_raw_records)} raw records for independent profiling.")
    
    # 4. Standardize Records Timing
    start_std = time.perf_counter()
    records = standardize_records(all_raw_records)
    std_time = (time.perf_counter() - start_std) * 1000
    print(f"standardize_records: {std_time:.2f}ms")
    
    # 5. Profile sub-components on a subset (1,000 records) to isolate CPU bottlenecks
    subset = all_raw_records[:1000]
    
    # Measure Key Normalization (dictionary comprehension)
    start_norm = time.perf_counter()
    for r in subset:
        norm_record = {str(k).lower().strip().replace(" ", "_"): v for k, v in r.items()}
    norm_time_1k = (time.perf_counter() - start_norm) * 1000
    
    # Measure pandas to_datetime
    import pandas as pd
    planned_vals = []
    actual_vals = []
    for r in subset:
        norm_record = {str(k).lower().strip().replace(" ", "_"): v for k, v in r.items()}
        # Simulate planned_date alias resolution
        for alias in ["planned_date", "target_date", "plan_date", "baseline_date", "start_date"]:
            if alias in norm_record and norm_record[alias]:
                planned_vals.append(norm_record[alias])
                break
        # Simulate actual_date alias resolution
        for alias in ["actual_date", "closure_date", "close_date", "completion_date"]:
            if alias in norm_record and norm_record[alias]:
                actual_vals.append(norm_record[alias])
                break
                
    start_pd = time.perf_counter()
    for val in planned_vals:
        pd.to_datetime(val, errors='coerce').date()
    for val in actual_vals:
        pd.to_datetime(val, errors='coerce').date()
    pd_time_1k = (time.perf_counter() - start_pd) * 1000
    
    # Print sub-component breakdowns
    print(f"\nSub-components micro-benchmarks (per 1,000 records):")
    print(f"  - Key normalization comprehension: {norm_time_1k:.2f}ms")
    print(f"  - pandas to_datetime conversions: {pd_time_1k:.2f}ms")
    
    # 6. Exact counts calculations
    total_records = len(all_raw_records)
    normalizations_count = total_records # 1 dict-comprehension per record
    dictionary_creations = total_records * 2 # 1 norm_record + 1 standard dict per record
    
    pd_calls_count = 0
    for r in all_raw_records:
        norm_record = {str(k).lower().strip().replace(" ", "_"): v for k, v in r.items()}
        for alias in ["planned_date", "target_date", "plan_date", "baseline_date", "start_date", "scheduled_date", "cae_analysis_plan", "l0_drawing_release_plan", "l1_drawing_release_plan", "l2_drawing_release_plan"]:
            if alias in norm_record and norm_record[alias]:
                pd_calls_count += 1
                break
        for alias in ["actual_date", "closure_date", "close_date", "completion_date", "finish_date", "end_date", "cae_analysis_actual", "l0_drawing_release_actual", "l1_drawing_release_actual", "l2_drawing_release_actual"]:
            if alias in norm_record and norm_record[alias]:
                pd_calls_count += 1
                break
                
    print(f"\nExecution Event Counts (for {total_records} records):")
    print(f"  - pd.to_datetime calls: {pd_calls_count}")
    print(f"  - Dictionary creations: {dictionary_creations}")
    print(f"  - Key normalizations: {normalizations_count}")

finally:
    db.close()
