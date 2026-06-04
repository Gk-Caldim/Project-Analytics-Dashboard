import os
import sys
import time
import datetime
import pandas as pd

# Add the parent directory (backend) to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.services.dashboard_service import get_dashboard_data, dashboard_cache, STATUS_ON_TRACK, STATUS_DELAYED, STATUS_PENDING, _determine_health, _safe_pct
from app.services.issue_service import enrich_issue, compute_health_status, _days_overdue, compute_urgency_score
from app.utils.analytics_utils import standardize_records
from app.models.project import Project
from app.models.tracker_ingestion import TrackerIngestion
from app.models.issue import Issue, IssueEscalation
from sqlalchemy import func

db = SessionLocal()
project_id = 15

# Clear cache to guarantee cache miss
dashboard_cache.clear()

try:
    print("--- DETAILED PROFILING START ---")
    
    timings = {}
    db_queries = []
    
    # 1. Total Dashboard Execution (Full wrapper)
    start_total_db = time.perf_counter()
    
    # --- STEP 1: Project Lookup Query ---
    start_step = time.perf_counter()
    project = db.query(Project).filter(Project.id == project_id).first()
    q1_time = (time.perf_counter() - start_step) * 1000
    project_name = project.name if project else f"Project {project_id}"
    timings["Project Lookup Query (DB)"] = q1_time
    db_queries.append({
        "name": "Query 1: Project Lookup",
        "time": q1_time,
        "rows": 1 if project else 0
    })
    
    # --- STEP 2: Latest Ingestion Query ---
    start_step = time.perf_counter()
    subq = db.query(
        TrackerIngestion.file_name,
        func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()

    ingestions = db.query(TrackerIngestion).join(
        subq, 
        (TrackerIngestion.file_name == subq.c.file_name) & 
        (TrackerIngestion.created_at == subq.c.max_created)
    ).filter(TrackerIngestion.project_id == project_id).all()
    q2_time = (time.perf_counter() - start_step) * 1000
    timings["Latest Ingestion Query (DB)"] = q2_time
    db_queries.append({
        "name": "Query 2: Latest Tracker Ingestion JOIN",
        "time": q2_time,
        "rows": len(ingestions)
    })
    
    # --- STEP 3: Raw Record Aggregation ---
    start_step = time.perf_counter()
    all_raw_records = []
    for ing in ingestions:
        if isinstance(ing.data, list):
            all_raw_records.extend(ing.data)
    agg_time = (time.perf_counter() - start_step) * 1000
    timings["Raw Record Aggregation"] = agg_time
    
    # --- STEP 4: standardize_records ---
    start_step = time.perf_counter()
    records = standardize_records(all_raw_records)
    std_time = (time.perf_counter() - start_step) * 1000
    timings["standardize_records"] = std_time
    
    # --- STEP 5: Module Filtering ---
    start_step = time.perf_counter()
    module_filter = None  # None for typical GET call
    if module_filter:
        records = [r for r in records if r["module"] == module_filter]
    filt_time = (time.perf_counter() - start_step) * 1000
    timings["Module Filtering"] = filt_time
    
    # --- STEP 6: Milestone Status Calculations ---
    start_step = time.perf_counter()
    total      = len(records)
    submodules = len({r["module"] for r in records if r["module"]})
    completed  = sum(1 for r in records if r["status"] == STATUS_ON_TRACK)
    delayed    = sum(1 for r in records if r["status"] == STATUS_DELAYED)
    pending    = sum(1 for r in records if r["status"] == STATUS_PENDING)
    status_time = (time.perf_counter() - start_step) * 1000
    timings["Milestone Status Calculations"] = status_time
    
    # --- STEP 7: Delay Statistics Calculations ---
    start_step = time.perf_counter()
    delay_days_list = [
        r["delay_days"] for r in records
        if r["delay_days"] is not None and r["delay_days"] > 0
    ]
    avg_delay = round(sum(delay_days_list) / len(delay_days_list)) if delay_days_list else 0
    max_delay = max(delay_days_list, default=0)
    delay_time = (time.perf_counter() - start_step) * 1000
    timings["Delay Statistics Calculations"] = delay_time
    
    # --- STEP 8: Module Breakdown Generation ---
    start_step = time.perf_counter()
    module_map = {}
    for r in records:
        mod = r["module"] or "Unknown"
        if mod not in module_map:
            module_map[mod] = {"module": mod, "total": 0, "completed": 0, "delayed": 0, "pending": 0}
        module_map[mod]["total"] += 1
        if r["status"] == STATUS_ON_TRACK:
            module_map[mod]["completed"] += 1
        elif r["status"] == STATUS_DELAYED:
            module_map[mod]["delayed"] += 1
        else:
            module_map[mod]["pending"] += 1
    modules = list(module_map.values())
    breakdown_time = (time.perf_counter() - start_step) * 1000
    timings["Module Breakdown Generation"] = breakdown_time
    
    # --- STEP 9: compute_analytics (Instrumented) ---
    start_analytics = time.perf_counter()
    
    # Q3A: Issue query execution
    start_step = time.perf_counter()
    all_issues = db.query(Issue).filter(Issue.project_id == project_id).all()
    q3a_time = (time.perf_counter() - start_step) * 1000
    db_queries.append({
        "name": "Query 3A: Issues List",
        "time": q3a_time,
        "rows": len(all_issues)
    })
    
    # Q3B: Escalations loading
    start_step = time.perf_counter()
    issue_ids = [iss.id for iss in all_issues]
    if issue_ids:
        escalations = db.query(IssueEscalation).filter(IssueEscalation.issue_id.in_(issue_ids)).all()
        esc_map = {}
        for esc in escalations:
            esc_map.setdefault(esc.issue_id, []).append(esc)
        for iss in all_issues:
            iss.escalations = esc_map.get(iss.id, [])
    q3b_time = (time.perf_counter() - start_step) * 1000 if issue_ids else 0.0
    db_queries.append({
        "name": "Query 3B: Issue Escalations List",
        "time": q3b_time,
        "rows": len(escalations) if issue_ids else 0
    })
    
    # enrich_issue loop
    start_step = time.perf_counter()
    for iss in all_issues:
        enrich_issue(iss)
    enrich_loop_time = (time.perf_counter() - start_step) * 1000
    
    # Health calculations
    start_step = time.perf_counter()
    total_open        = sum(1 for i in all_issues if i.status != "Closed")
    total_overdue     = sum(1 for i in all_issues if i.health_status == "Overdue")
    total_at_risk     = sum(1 for i in all_issues if i.health_status == "At Risk")
    total_closed      = sum(1 for i in all_issues if i.status == "Closed")
    total_in_progress = sum(1 for i in all_issues if i.status == "In Progress")
    health_calc_time = (time.perf_counter() - start_step) * 1000
    
    # Department & Priority statistics
    start_step = time.perf_counter()
    by_department = {}
    by_priority = {}
    for iss in all_issues:
        if iss.status == "Closed":
            continue
        dept = iss.department or "Unassigned"
        by_department[dept] = by_department.get(dept, 0) + 1
        by_priority[iss.priority] = by_priority.get(iss.priority, 0) + 1
    stats_time = (time.perf_counter() - start_step) * 1000
    
    # Overdue ranking sort
    start_step = time.perf_counter()
    overdue_issues = sorted(
        [i for i in all_issues if i.health_status == "Overdue"],
        key=lambda i: -i.urgency_score,
    )[:5]
    sort_time = (time.perf_counter() - start_step) * 1000
    
    analytics_total_time = (time.perf_counter() - start_analytics) * 1000
    
    timings["compute_analytics total"] = analytics_total_time
    timings["  - Issue Query Execution (DB)"] = q3a_time
    timings["  - Escalation Loading Query (DB)"] = q3b_time
    timings["  - enrich_issue loop"] = enrich_loop_time
    timings["  - Health calculations"] = health_calc_time
    timings["  - Department & Priority statistics"] = stats_time
    timings["  - Overdue ranking sort"] = sort_time
    
    # --- STEP 10: Cache Write ---
    start_step = time.perf_counter()
    health             = _determine_health(total_overdue)
    on_track_pct       = _safe_pct(completed, total)
    delay_pct          = _safe_pct(delayed,   total)
    pending_pct        = _safe_pct(pending,   total)
    milestones = []
    
    result = {
        "project_id":     project_id,
        "project_name":   project_name,
        "project_health": health,
        "total_milestones": total,
        "submodules": submodules,
        "completed": completed,
        "delayed":   delayed,
        "pending":   pending,
        "milestones": milestones,
        "modules":    modules,
        "summary": {
            "on_track_percentage": on_track_pct,
            "delay_percentage":    delay_pct,
            "pending_percentage":  pending_pct,
            "avg_delay_days":      avg_delay,
            "max_delay_days":      max_delay,
        },
    }
    cache_key = f"dashboard_{project_id}_None"
    dashboard_cache[cache_key] = result
    cache_time = (time.perf_counter() - start_step) * 1000
    timings["Cache write & packaging"] = cache_time
    
    total_db_time = (time.perf_counter() - start_total_db) * 1000
    
    print("\n--- RESULTS ---")
    print(f"Total processed milestones: {total}")
    print(f"Total processed issues: {len(all_issues)}")
    print(f"Total Dashboard Execution Time: {total_db_time:.2f}ms\n")
    
    # Print DB Queries Info
    print("Database Queries Execution Summary:")
    print("-" * 75)
    print(f"{'Query Name':<40} | {'Time (ms)':<12} | {'Rows Returned':<15}")
    print("-" * 75)
    for q in db_queries:
        print(f"{q['name']:<40} | {q['time']:>10.2f}ms | {q['rows']:>13}")
    print("-" * 75)
    print()
    
    # Export timing metrics for display
    print("Step-by-step Execution Timings:")
    print("-" * 75)
    print(f"{'Step / Operation':<40} | {'Time (ms)':<12} | {'% of Total Request':<20}")
    print("-" * 75)
    
    sorted_steps = sorted(timings.items(), key=lambda x: -x[1])
    for step, duration in sorted_steps:
        # Avoid double-counting nested compute_analytics tasks in percentages
        pct = (duration / total_db_time) * 100
        print(f"{step:<40} | {duration:>10.2f}ms | {pct:>18.2f}%")
    print("-" * 75)

finally:
    db.close()
