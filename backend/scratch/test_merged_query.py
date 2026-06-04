import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.project import Project
from app.models.tracker_ingestion import TrackerIngestion
from sqlalchemy import func

db = SessionLocal()
project_id = 15

try:
    print("--- PURE SQLALCHEMY MERGED QUERY ---")
    
    start_merged = time.perf_counter()
    
    subq_merged = db.query(
        TrackerIngestion.file_name,
        func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()
    
    # Use select_from and Project.id == Project.id as join condition
    results = (
        db.query(Project, TrackerIngestion)
        .select_from(Project)
        .outerjoin(
            subq_merged,
            Project.id == Project.id
        )
        .outerjoin(
            TrackerIngestion,
            (TrackerIngestion.project_id == Project.id) &
            (TrackerIngestion.file_name == subq_merged.c.file_name) &
            (TrackerIngestion.created_at == subq_merged.c.max_created)
        )
        .filter(Project.id == project_id)
        .all()
    )
    
    if results:
        project_obj = results[0][0]
        project_name_merged = project_obj.name
        ingestions_merged = [row[1] for row in results if row[1] is not None]
    else:
        project_name_merged = f"Project {project_id}"
        ingestions_merged = []
        
    merged_time = (time.perf_counter() - start_merged) * 1000
    
    print(f"Merged: Project Name: {project_name_merged}, Ingestions count: {len(ingestions_merged)}")
    print(f"Merged total time: {merged_time:.2f}ms")
    
finally:
    db.close()
