import os
import sys

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.enterprise_lead import EnterpriseLead

def test_insert():
    print("Testing direct DB insertion...")
    db = SessionLocal()
    try:
        new_lead = EnterpriseLead(
            full_name="Direct Test User",
            work_email="direct_test@company.com",
            company="Direct Test Co",
            team_size="1-50",
            use_case="General Inquiry",
            message="This is a direct database write test."
        )
        db.add(new_lead)
        db.commit()
        db.refresh(new_lead)
        print(f"SUCCESS! Created lead with ID: {new_lead.id}")
        
        # Verify we can query it
        queried = db.query(EnterpriseLead).filter_by(id=new_lead.id).first()
        print(f"Queried Name: {queried.full_name}, Email: {queried.work_email}")
        
        # Clean up the test lead
        db.delete(queried)
        db.commit()
        print("Cleaned up the test lead successfully.")
        
    except Exception as e:
        print(f"DB Operation FAILED: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_insert()
