
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SQLALCHEMY_DATABASE_URL
from app.models.project import Project
from app.models.issue import Issue

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- PROJECTS ---")
projects = db.query(Project).all()
for p in projects:
    print(f"ID: {p.id}, Name: {p.name}")

print("\n--- ISSUES for ZOHO ---")
# Find ZOHO project
zoho = db.query(Project).filter(Project.name.ilike("%ZOHO%")).first()
if zoho:
    issues = db.query(Issue).filter(Issue.project_id == zoho.id).all()
    for i in issues:
        print(f"ID: {i.id}, Title: {i.title}, Source: {i.source}, Status: {i.status}")
else:
    print("Project ZOHO not found")

db.close()
