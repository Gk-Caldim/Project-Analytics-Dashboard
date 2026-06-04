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

project_id = 15

def run_profile(iteration):
    db = SessionLocal()
    dashboard_cache.clear()
    try:
        print(f"\n--- RUN #{iteration} ---")
        timings = {}
        
        start_total = time.perf_counter()
        
        # Q1: Project Lookup
        start_step = time.perf_counter()
        project = db.query(Project).filter(Project.id == project_id).first()
        timings["Q1: Project Lookup"] = (time.perf_counter() - start_step) * 1000
        
        # Q2: Latest Ingestion
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
        timings["Q2: Latest Ingestion"] = (time.perf_counter() - start_step) * 1000
        
        # Q3A: Issues List
        start_step = time.perf_counter()
        all_issues = db.query(Issue).filter(Issue.project_id == project_id).all()
        timings["Q3A: Issues List"] = (time.perf_counter() - start_step) * 1000
        
        # Q3B: Escalations List
        start_step = time.perf_counter()
        issue_ids = [iss.id for iss in all_issues]
        if issue_ids:
            escalations = db.query(IssueEscalation).filter(IssueEscalation.issue_id.in_(issue_ids)).all()
        timings["Q3B: Escalations List"] = (time.perf_counter() - start_step) * 1000 if issue_ids else 0.0
        
        total_time = (time.perf_counter() - start_total) * 1000
        timings["Total Execution"] = total_time
        
        for step, duration in timings.items():
            print(f"  {step:<25}: {duration:.2f}ms")
            
    finally:
        db.close()

run_profile(1)
run_profile(2)
run_profile(3)
