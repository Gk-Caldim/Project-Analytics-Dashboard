from app.core.database import SessionLocal
from app.models.project import Project
from app.models.issue import Issue
import json

db = SessionLocal()
try:
    p = db.query(Project).filter(Project.name.ilike('%ZOHO%')).first()
    if p:
        print(f"Project: {p.name} (ID: {p.id})")
        issues = db.query(Issue).filter(Issue.project_id == p.id).all()
        print(f"Total Issues for Project: {len(issues)}")
        for i in issues:
            print(f" - ID: {i.id}, Title: {i.title}, Source: {getattr(i, 'source', 'N/A')}")
        
        mom_issues = db.query(Issue).filter(Issue.project_id == p.id, Issue.source == 'MOM').all()
        print(f"MOM Issues: {len(mom_issues)}")
    else:
        print("Project ZOHO not found")
finally:
    db.close()
