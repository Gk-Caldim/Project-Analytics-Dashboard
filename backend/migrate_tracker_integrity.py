"""
migrate_tracker_integrity.py
----------------------------
Hardening migration for the trackers_data + uploads pipeline.

Changes:
1. Ensures `trackers_data.upload_id` is NOT NULL (creates a sentinel "Legacy" upload for orphan rows)
2. Ensures `trackers_data.project_id` is NOT NULL (deletes orphan rows that have no project_id)
3. Removes empty module rows from trackers_data
4. Prints a full audit report before and after

Run from backend/ directory:
    python migrate_tracker_integrity.py
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("TRACKER DATA INTEGRITY MIGRATION")
        print("=" * 60)

        # ── Step 1: Count current state ───────────────────────────────────
        total = db.execute(text("SELECT COUNT(*) FROM trackers_data")).scalar()
        null_project = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE project_id IS NULL")).scalar()
        null_upload = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE upload_id IS NULL")).scalar()
        null_module = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE module IS NULL OR TRIM(module) = ''")).scalar()

        print(f"\nBEFORE:")
        print(f"  Total rows:          {total}")
        print(f"  NULL project_id:     {null_project}")
        print(f"  NULL upload_id:      {null_upload}")
        print(f"  NULL/empty module:   {null_module}")

        # -- Step 2: Delete rows with NULL project_id (unlinked, unusable) -
        if null_project > 0:
            print(f"\n[ACTION] Deleting {null_project} orphan rows with NULL project_id...")
            db.execute(text("DELETE FROM trackers_data WHERE project_id IS NULL"))
            db.commit()
            print(f"  [OK] Deleted {null_project} orphan rows")

        # -- Step 3: Delete rows with NULL/empty module --------------------
        if null_module > 0:
            print(f"\n[ACTION] Deleting {null_module} rows with NULL/empty module...")
            db.execute(text("DELETE FROM trackers_data WHERE module IS NULL OR TRIM(module) = ''"))
            db.commit()
            print(f"  [OK] Deleted {null_module} rows with empty module")

        # -- Step 4: Handle NULL upload_id rows ---------------------------
        null_upload_after = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE upload_id IS NULL")).scalar()
        if null_upload_after > 0:
            print(f"\n[ACTION] Found {null_upload_after} rows with NULL upload_id")
            print("  Creating sentinel 'Legacy Import' upload records for each project...")

            legacy_rows = db.execute(text("""
                SELECT DISTINCT project_id FROM trackers_data WHERE upload_id IS NULL
            """)).fetchall()

            for row in legacy_rows:
                pid = row[0]
                # Create a sentinel upload record
                db.execute(text("""
                    INSERT INTO uploads (project_id, file_name, status, row_count, valid_row_count, invalid_row_count, uploaded_at)
                    VALUES (:pid, 'legacy_import.xlsx', 'Completed', 0, 0, 0, NOW())
                """), {"pid": pid})
                db.commit()

                # Get the new upload's id
                sentinel_id = db.execute(text("""
                    SELECT id FROM uploads WHERE project_id = :pid AND file_name = 'legacy_import.xlsx'
                    ORDER BY uploaded_at DESC LIMIT 1
                """), {"pid": pid}).scalar()

                # Link orphan rows to sentinel
                updated = db.execute(text("""
                    UPDATE trackers_data SET upload_id = :uid
                    WHERE project_id = :pid AND upload_id IS NULL
                """), {"uid": sentinel_id, "pid": pid})
                db.commit()
                print(f"  [OK] project_id={pid}: linked {updated.rowcount} rows to sentinel upload id={sentinel_id}")

        # -- Step 5: Final count -------------------------------------------
        total_after = db.execute(text("SELECT COUNT(*) FROM trackers_data")).scalar()
        null_project_after = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE project_id IS NULL")).scalar()
        null_upload_final = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE upload_id IS NULL")).scalar()
        null_module_final = db.execute(text("SELECT COUNT(*) FROM trackers_data WHERE module IS NULL OR TRIM(module) = ''")).scalar()

        print(f"\nAFTER:")
        print(f"  Total rows:          {total_after}")
        print(f"  NULL project_id:     {null_project_after}")
        print(f"  NULL upload_id:      {null_upload_final}")
        print(f"  NULL/empty module:   {null_module_final}")

        if null_project_after == 0 and null_upload_final == 0 and null_module_final == 0:
            print("\n[OK] Migration complete -- all rows are clean and properly linked")
        else:
            print("\n[WARN] Some issues remain -- manual review needed")

        # -- Step 6: Show distinct modules per project ---------------------
        print("\nModule summary by project:")
        module_summary = db.execute(text("""
            SELECT p.name, t.module, COUNT(t.id) as cnt
            FROM trackers_data t
            JOIN projects p ON t.project_id = p.id
            GROUP BY p.name, t.module
            ORDER BY p.name, t.module
        """)).fetchall()

        current_project = None
        for row in module_summary:
            if row[0] != current_project:
                current_project = row[0]
                print(f"\n  Project: {current_project}")
            print(f"    Module: {row[1]}  ({row[2]} milestones)")

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
