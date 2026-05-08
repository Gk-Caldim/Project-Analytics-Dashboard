
import sys
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.issue import Issue

def check_mom_issues():
    db = SessionLocal()
    try:
        mom_issues = db.query(Issue).filter(Issue.source == 'MOM').all()
        print(f"Total MOM Issues: {len(mom_issues)}")
        for i in mom_issues:
            print(f"ID: {i.id}, ProjectID: {i.project_id}, Title: {i.title}, Status: {i.status}")
    finally:
        db.close()

if __name__ == "__main__":
    # Add the backend directory to sys.path
    sys.path.append(os.getcwd())
    check_mom_issues()
