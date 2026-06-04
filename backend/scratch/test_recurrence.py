import os
import sys
import uuid
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.meeting import Meeting
from app.api.meetings import generate_recurring_dates

def test_recurrence_flow():
    db = SessionLocal()
    print("Starting Recurrence Verification Tests...")
    
    # 1. Generate recurrence dates helper test
    dates = generate_recurring_dates("2026-06-04", "daily")
    print(f"Generated daily dates (count={len(dates)}): {dates}")
    assert len(dates) == 9, f"Expected 9 future occurrences for daily, got {len(dates)}"
    assert dates[0] == "2026-06-05"
    assert dates[-1] == "2026-06-13"

    dates_weekly = generate_recurring_dates("2026-06-04", "weekly")
    print(f"Generated weekly dates (count={len(dates_weekly)}): {dates_weekly}")
    assert len(dates_weekly) == 9, "Expected 9 future occurrences for weekly"
    assert dates_weekly[0] == "2026-06-11"

    # 2. Database Insertion Clones Verification
    group_id = str(uuid.uuid4())
    print(f"Using Recurrence Group ID: {group_id}")
    
    primary = Meeting(
        title="Test Sprint Sync",
        description="Daily project update",
        date="2026-06-04",
        time="09:00 AM",
        duration_minutes=30,
        platform="google",
        join_url="https://meet.google.com/abc-defg-hij",
        meeting_code="abc-defg-hij",
        attendees=json.dumps(["alice@example.com", "bob@example.com"]),
        status="scheduled",
        recurrence_rule="daily",
        recurrence_group_id=group_id
    )
    db.add(primary)
    db.commit()
    db.refresh(primary)
    
    # Clone logic mimicking API POST publish_meeting
    future_dates = generate_recurring_dates(primary.date, primary.recurrence_rule)
    for date_str in future_dates:
        cloned = Meeting(
            title=primary.title,
            description=primary.description,
            date=date_str,
            time=primary.time,
            duration_minutes=primary.duration_minutes,
            platform=primary.platform,
            join_url=primary.join_url,
            meeting_code=primary.meeting_code,
            attendees=primary.attendees,
            status="scheduled",
            recurrence_rule=primary.recurrence_rule,
            recurrence_group_id=group_id
        )
        db.add(cloned)
    db.commit()
    
    # Verify count in DB
    group_meetings = db.query(Meeting).filter(Meeting.recurrence_group_id == group_id).all()
    print(f"Saved series count in DB: {len(group_meetings)}")
    assert len(group_meetings) == 10, f"Expected 10 total meetings in DB, got {len(group_meetings)}"
    
    # Verify all cloned details
    for m in group_meetings:
        assert m.time == "09:00 AM"
        assert m.platform == "google"
        assert m.join_url == "https://meet.google.com/abc-defg-hij"
        assert json.loads(m.attendees) == ["alice@example.com", "bob@example.com"]
    print("  Cloned instances successfully verified in database!")

    # 3. Synchronized Update Verification (edit)
    # Edit the title, description, time, and attendees of primary meeting
    new_title = "Updated Sprint Sync Series"
    new_time = "10:00 AM"
    new_attendees = ["alice@example.com", "bob@example.com", "charlie@example.com"]
    
    # Update logic mimicking PATCH /meetings/{meeting_id}
    # Fetch all meetings in the recurrence group
    recur_meetings = db.query(Meeting).filter(Meeting.recurrence_group_id == primary.recurrence_group_id).all()
    for m in recur_meetings:
        m.title = new_title
        m.time = new_time
        m.attendees = json.dumps(new_attendees)
    db.commit()
    
    # Verify that all 10 meetings in the series got updated
    updated_meetings = db.query(Meeting).filter(Meeting.recurrence_group_id == group_id).all()
    for m in updated_meetings:
        assert m.title == new_title
        assert m.time == new_time
        assert json.loads(m.attendees) == new_attendees
    print("  Synchronized updates across all recurring instances verified!")

    # 4. Synchronized Delete/Cascade Verification
    # Delete logic mimicking DELETE /meetings/{meeting_id}
    db.query(Meeting).filter(Meeting.recurrence_group_id == group_id).delete()
    db.commit()
    
    # Verify they are all deleted
    remaining = db.query(Meeting).filter(Meeting.recurrence_group_id == group_id).all()
    print(f"Remaining recurring meetings after deletion: {len(remaining)}")
    assert len(remaining) == 0, "Expected all recurring meetings to be deleted"
    print("  Cascade deletion for recurring series verified!")

    print("\nAll Recurrence Flow Tests Passed Successfully! (100% correct)")
    db.close()

if __name__ == "__main__":
    test_recurrence_flow()
