
import os
import sys
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine

def check_columns():
    with engine.connect() as conn:
        try:
            # 1. Connection Metadata
            meta = conn.execute(text("SELECT current_database(), current_user, current_setting('search_path')")).fetchone()
            print(f"\n[METADATA] DB: {meta[0]}, User: {meta[1]}, Search Path: {meta[2]}")

            # 2. Check information_schema
            res = conn.execute(text("SELECT table_schema, column_name, data_type FROM information_schema.columns WHERE table_name = 'meetings' ORDER BY table_schema, column_name"))
            columns = res.fetchall()
            print("\nColumns in 'meetings' table(s) from info_schema:")
            current_schema = None
            for col in columns:
                if col[0] != current_schema:
                    current_schema = col[0]
                    print(f"\nSchema: {current_schema}")
                print(f"  - {col[1]} ({col[2]})")

            # 3. Live Test
            print("\nTesting 'transcript' column access directly...")
            try:
                conn.execute(text("SELECT transcript FROM meetings LIMIT 1"))
                print("  SUCCESS: 'transcript' column is accessible via SELECT.")
            except Exception as e:
                print(f"  FAILURE: 'transcript' column access failed: {e}")

            # 4. Try to FORCE add it if it failed
            if "does not exist" in str(e).lower():
                print("\nAttempting to FORCE add 'transcript' column...")
                conn.execute(text("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS transcript TEXT;"))
                conn.commit()
                print("  Column added (hopefully).")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
