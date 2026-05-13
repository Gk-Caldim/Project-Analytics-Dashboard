import os
import sys
import uuid
from datetime import datetime, timedelta

# Add parent directory to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.mom_sync_history import MomSyncHistory
from app.models.issue import Issue
from app.models.mom import MOMSession

def backfill():
    db = SessionLocal()
    try:
        # 1. Fetch history records without sync_id
        records = db.query(MomSyncHistory).filter(MomSyncHistory.sync_id == None).all()
        print(f"Found {len(records)} records to backfill.")

        for rec in records:
            new_sync_id = str(uuid.uuid4())
            print(f"Processing History ID {rec.id} ({rec.meeting_name}) -> Sync ID: {new_sync_id}")
            
            # Update history record
            rec.sync_id = new_sync_id
            rec.status = "success"
            rec.backfilled = True
            
            # 2. Update Issues
            # Match by meeting_id and created_at +/- 2 minutes
            if rec.meeting_id and rec.synced_at:
                start_time = rec.synced_at - timedelta(minutes=2)
                end_time = rec.synced_at + timedelta(minutes=2)
                
                issues = db.query(Issue).filter(
                    Issue.meeting_id == rec.meeting_id,
                    Issue.source == "MOM",
                    Issue.created_at >= start_time,
                    Issue.created_at <= end_time
                ).all()
                
                print(f"  Found {len(issues)} matching issues.")
                for issue in issues:
                    issue.sync_id = new_sync_id
            
            # 3. Update MOMSession
            if rec.meeting_id:
                session = db.query(MOMSession).filter(MOMSession.meeting_id == rec.meeting_id).first()
                if session:
                    print(f"  Found matching MOMSession.")
                    session.sync_id = new_sync_id
            
            db.commit()
            print(f"  Backfilled History {rec.id} successfully.")

    except Exception as e:
        print(f"Error during backfill: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
