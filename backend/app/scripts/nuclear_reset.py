import os
import sys
from sqlalchemy import text

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine

def nuclear_reset():
    """
    Nuclear Rearchitecture Reset:
    1. Wipes all MOM Sync History.
    2. Wipes all MOM Sessions.
    3. Wipes all Issues sourced from MOM.
    4. Resets auto-increment sequences for clean IDs.
    """
    print("☢️ Starting Nuclear MOM Reset...")
    
    confirm = input("This will PERMANENTLY DELETE all MOM history and associated issues. Type 'RESET' to confirm: ")
    if confirm != 'RESET':
        print("Aborted.")
        return

    with engine.connect() as conn:
        try:
            # 1. Delete Issues sourced from MOM
            print("Deleting MOM-sourced issues...")
            res = conn.execute(text("DELETE FROM issues WHERE source = 'MOM';"))
            print(f"  Deleted {res.rowcount} issues.")

            # 2. Delete MOM Sync History
            print("Deleting sync history...")
            res = conn.execute(text("DELETE FROM mom_sync_history;"))
            print(f"  Deleted {res.rowcount} sync records.")

            # 3. Delete MOM Sessions
            print("Deleting MOM sessions...")
            res = conn.execute(text("DELETE FROM mom_sessions;"))
            print(f"  Deleted {res.rowcount} session records.")

            # 4. Reset Sequences (PostgreSQL)
            print("Resetting sequences...")
            sequences = ['issues_id_seq', 'mom_sync_history_id_seq']
            for seq in sequences:
                try:
                    conn.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1;"))
                    print(f"  Sequence {seq} reset to 1.")
                except:
                    # SQLite or different sequence name
                    pass

            conn.commit()
            print("\n✅ Reset complete. System is now in a clean, atomic state.")
            print("Please run apply_migrations.py now to ensure all new columns exist.")
            
        except Exception as e:
            print(f"❌ Error during reset: {e}")
            conn.rollback()

if __name__ == "__main__":
    nuclear_reset()
