import os
import sys
import time
import json
import datetime
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.project import Project
from app.models.tracker_ingestion import TrackerIngestion
from app.services.dashboard_service import get_dashboard_data, dashboard_cache
from app.services.issue_service import compute_analytics

db = SessionLocal()
project_id = 15

# Clear cache to guarantee cache miss
dashboard_cache.clear()

try:
    print("--- FINAL PROFILING & MEASUREMENT ---")
    
    # 1. Total Dashboard Execution (Warm state)
    # Run once to warm connection/ORM cache
    get_dashboard_data(db, project_id)
    dashboard_cache.clear()
    
    start_dash = time.perf_counter()
    get_dashboard_data(db, project_id)
    total_dashboard_time = (time.perf_counter() - start_dash) * 1000
    
    # 2. Database Query Execution Time (PG engine only)
    sql_explain = """
    EXPLAIN ANALYZE 
    SELECT projects.id, projects.name, tracker_ingestions.data
    FROM projects 
    LEFT OUTER JOIN tracker_ingestions ON tracker_ingestions.project_id = projects.id 
    AND tracker_ingestions.created_at = (
        SELECT max(tracker_ingestions.created_at) 
        FROM tracker_ingestions 
        WHERE tracker_ingestions.project_id = 15 
        AND tracker_ingestions.file_name = tracker_ingestions.file_name
    )
    WHERE projects.id = 15;
    """
    explain_res = db.execute(text(sql_explain))
    explain_output = [row[0] for row in explain_res.fetchall()]
    postgres_exec_time = 0.0
    for line in explain_output:
        if "Execution Time:" in line or "Execution time:" in line:
            # Parse e.g. "Execution Time: 0.123 ms"
            parts = line.split(":")
            postgres_exec_time = float(parts[1].strip().replace("ms", ""))
            break
            
    # 3. Retrieve JSONB Cast to Text (measures RTT + Network Transfer Time without parsing)
    sql_text = """
    SELECT tracker_ingestions.data::text 
    FROM tracker_ingestions 
    WHERE tracker_ingestions.project_id = 15;
    """
    start_net = time.perf_counter()
    res_text = db.execute(text(sql_text))
    rows_text = res_text.fetchall()
    network_and_rtt_time = (time.perf_counter() - start_net) * 1000
    
    # Measure string length to verify size
    total_chars = sum(len(row[0]) for row in rows_text if row[0] is not None)
    payload_size_mb = total_chars / (1024 * 1024)
    
    # 4. Measure pure Python JSON Deserialization Time
    raw_json_strings = [row[0] for row in rows_text if row[0] is not None]
    start_json = time.perf_counter()
    deserialized_data = []
    for s in raw_json_strings:
        deserialized_data.append(json.loads(s))
    json_deser_time = (time.perf_counter() - start_json) * 1000
    
    # 5. Measure SQLAlchemy ORM Hydration overhead
    sql_orm_equivalent = """
    SELECT projects.id, tracker_ingestions.id, tracker_ingestions.data 
    FROM projects 
    LEFT OUTER JOIN tracker_ingestions ON tracker_ingestions.project_id = projects.id 
    WHERE projects.id = 15;
    """
    # Raw SQL execution (psycopg2 parses json automatically)
    start_raw = time.perf_counter()
    raw_res = db.execute(text(sql_orm_equivalent))
    raw_rows = raw_res.fetchall()
    raw_sql_time = (time.perf_counter() - start_raw) * 1000
    
    # ORM execution of the same query
    start_orm = time.perf_counter()
    orm_rows = db.query(Project, TrackerIngestion).outerjoin(
        TrackerIngestion, TrackerIngestion.project_id == Project.id
    ).filter(Project.id == 15).all()
    orm_sql_time = (time.perf_counter() - start_orm) * 1000
    orm_hydration_time = max(0, orm_sql_time - raw_sql_time)
    
    # 6. Measure standardize_records and compute_analytics (Warm)
    # Get raw records
    ingestions = db.query(TrackerIngestion).filter(TrackerIngestion.project_id == 15).all()
    all_raw_records = []
    for ing in ingestions:
        if isinstance(ing.data, list):
            all_raw_records.extend(ing.data)
            
    from app.utils.analytics_utils import standardize_records
    start_std = time.perf_counter()
    records = standardize_records(all_raw_records)
    std_time = (time.perf_counter() - start_std) * 1000
    
    start_analytics = time.perf_counter()
    compute_analytics(db, project_id)
    analytics_time = (time.perf_counter() - start_analytics) * 1000
    
    # Output the breakdown
    print("\n--- MEASURED METRICS ---")
    print(f"Total payload character size : {total_chars} ({payload_size_mb:.2f} MB)")
    print(f"PostgreSQL engine execution   : {postgres_exec_time:.2f} ms")
    print(f"Network RTT + WAN Transfer    : {network_and_rtt_time:.2f} ms")
    print(f"JSONB Deserialization (CPU)   : {json_deser_time:.2f} ms")
    print(f"ORM Hydration overhead (CPU)  : {orm_hydration_time:.2f} ms")
    print(f"standardize_records (CPU)     : {std_time:.2f} ms")
    print(f"compute_analytics total       : {analytics_time:.2f} ms")
    print(f"Total Dashboard execution time: {total_dashboard_time:.2f} ms")
    
finally:
    db.close()
