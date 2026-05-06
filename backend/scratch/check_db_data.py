from app.core.database import SessionLocal
from app.models.project import Project
from app.models.tracker_ingestion import TrackerIngestion
from app.models.upload import Upload
from app.models.upload_tracker import UploadTracker
from app.models.project_sub_category import ProjectSubCategory # Import this to fix the error
# Import other models if needed
from app.models import *

db = SessionLocal()

print("--- TrackerIngestion ---")
ingestions = db.query(TrackerIngestion).all()
for ing in ingestions:
    print(f"ID: {ing.id}, ProjectID: {ing.project_id}, UploadID: {ing.upload_id}, FileName: {ing.file_name}")

print("\n--- Uploads ---")
uploads = db.query(Upload).all()
for u in uploads:
    print(f"ID: {u.id}, ProjectID: {u.project_id}, FileName: {u.file_name}, Dept: {u.department}, Industry: {u.industry}")

print("\n--- UploadTrackers ---")
trackers = db.query(UploadTracker).all()
for t in trackers:
    print(f"ID: {t.id}, ProjectID: {t.project_id}, FileName: {t.file_name}, FileType: {t.file_type}, Status: {t.status}")

db.close()
