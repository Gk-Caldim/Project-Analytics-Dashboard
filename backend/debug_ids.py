from app.core.database import engine
from sqlalchemy import text

def debug():
    with engine.connect() as conn:
        # Check all datasets
        all_d = conn.execute(text("SELECT id FROM datasets ORDER BY id DESC LIMIT 5")).fetchall()
        print(f"Latest 5 datasets: {all_d}")

        # Check latest 10 uploads
        latest_u = conn.execute(text("SELECT id, file_name, status, dataset_id FROM uploads ORDER BY id DESC LIMIT 10")).fetchall()
        print(f"Latest 10 uploads: {latest_u}")
        
        # Check errors for failed uploads
        failed_ids = [u[0] for u in latest_u if u[2] == 'Failed']
        if failed_ids:
            errs = conn.execute(text(f"SELECT upload_id, error_message FROM import_errors WHERE upload_id IN ({','.join(map(str, failed_ids))})")).fetchall()
            print(f"Errors for failed uploads: {errs}")

if __name__ == "__main__":
    debug()
