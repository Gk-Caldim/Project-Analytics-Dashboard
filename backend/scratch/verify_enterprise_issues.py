import sys
import os
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path (assuming script is run from backend/ directory)
import os, sys
sys.path.append(os.getcwd())

from app.core.database import Base, engine
from pydantic import ValidationError
from app.models.issue import Issue, IssueAuditLog
from app.schemas.issue import IssueCreate, IssueUpdate
from app.services import issue_service
from app.models.project import Project

# Setup test DB (using SQLite for verification if possible, or same engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def test_enterprise_features():
    print("--- Starting Enterprise Issue System Verification ---")
    
    # 0. Setup dummy project if needed
    project = db.query(Project).first()
    if not project:
        project = Project(name="Test Project", description="Test")
        db.add(project)
        db.commit()
        db.refresh(project)
    
    project_id = project.id
    print(f"Using Project ID: {project_id}")

    # 1. Test Duplicate Prevention
    print("\n1. Testing Duplicate Prevention...")
    title = "Duplicate Test Issue"
    owner = "Test Owner"
    due_date = date.today() + timedelta(days=5)
    
    payload = IssueCreate(
        project_id=project_id,
        title=title,
        owner=owner,
        due_date=due_date,
        priority="Medium",
        source="Manual"
    )
    
    try:
        issue1 = issue_service.create_issue(db, payload)
        print(f"Created first issue: ID={issue1.id}")
        
        try:
            issue_service.create_issue(db, payload)
            print("FAILED: Allowed creating duplicate issue")
        except Exception as e:
            db.rollback()
            print(f"SUCCESS: Rejected duplicate issue (Service Level): {str(e)}")
    except Exception as e:
        db.rollback()
        print(f"SUCCESS: Rejected duplicate issue (Schema/Initial): {str(e)}")

    # 2. Test Validation: High priority without due_date
    print("\n2. Testing High Priority Validation...")
    try:
        payload_high = IssueCreate(
            project_id=project_id,
            title="High Priority No Date",
            owner=owner,
            due_date=None,
            priority="High",
            source="Manual"
        )
        issue_service.create_issue(db, payload_high)
        print("FAILED: Allowed High priority without due_date")
    except (Exception, ValidationError) as e:
        db.rollback()
        print(f"SUCCESS: Rejected High priority without due_date: {str(e)}")



    # 3. Test Health Status
    print("\n3. Testing Health Status Logic...")
    # Overdue
    issue_overdue = Issue(project_id=project_id, title="Overdue", owner=owner, due_date=date.today() - timedelta(days=1), status="Open", source="Manual")
    issue_service.enrich_issue(issue_overdue)
    print(f"Overdue Health: {issue_overdue.health_status} (Expected: Overdue)")
    
    # At Risk
    issue_at_risk = Issue(project_id=project_id, title="At Risk", owner=owner, due_date=date.today() + timedelta(days=1), status="Open", source="Manual")
    issue_service.enrich_issue(issue_at_risk)
    print(f"At Risk Health: {issue_at_risk.health_status} (Expected: At Risk)")
    
    # On Track
    issue_on_track = Issue(project_id=project_id, title="On Track", owner=owner, due_date=date.today() + timedelta(days=5), status="Open", source="Manual")
    issue_service.enrich_issue(issue_on_track)
    print(f"On Track Health: {issue_on_track.health_status} (Expected: On Track)")

    # 4. Test Audit Logging
    print("\n4. Testing Audit Logging...")
    issue_to_update = db.query(Issue).filter(Issue.title == title).first()
    if issue_to_update:
        update_payload = IssueUpdate(status="In Progress", owner="New Owner")
        updated_issue = issue_service.update_issue(db, issue_to_update.id, update_payload, changed_by="Tester")
        
        logs = db.query(IssueAuditLog).filter(IssueAuditLog.issue_id == issue_to_update.id).all()
        print(f"Audit Logs Created: {len(logs)}")
        for log in logs:
            print(f" - Field: {log.field_changed}, Old: {log.old_value}, New: {log.new_value}, Changed By: {log.changed_by}")
        
        if len(logs) >= 2:
            print("SUCCESS: Audit logs created correctly")
        else:
            print("FAILED: Audit logs missing")

    # 5. Test Sorting: Overdue first
    print("\n5. Testing Filter & Sorting...")
    db.add(issue_overdue)
    db.add(issue_at_risk)
    db.add(issue_on_track)
    db.commit()
    
    issues = issue_service.list_issues(db, project_id=project_id)
    print("Sorted Health Order:")
    for i in issues:
        print(f" - {i.title}: {i.health_status} (Due: {i.due_date})")
    
    if issues[0].health_status == "Overdue":
        print("SUCCESS: Overdue items are listed first")
    else:
        print("FAILED: Overdue items not first")

    # Cleanup
    print("\n--- Cleanup ---")
    db.query(IssueAuditLog).filter(IssueAuditLog.changed_by == "Tester").delete()
    db.query(Issue).filter(Issue.owner == "Test Owner").delete()
    db.query(Issue).filter(Issue.title.in_(["Overdue", "At Risk", "On Track", "Duplicate Test Issue"])).delete()
    db.commit()
    print("Done.")

if __name__ == "__main__":
    test_enterprise_features()
