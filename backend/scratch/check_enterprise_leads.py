import os
import sys
from sqlalchemy import inspect, text

# Add parent directory to sys.path to allow importing app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine, SessionLocal

def check_table():
    print("Checking database connection and table...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Available tables: {tables}")
    
    if "enterprise_leads" in tables:
        print("\n'enterprise_leads' table exists!")
        columns = inspector.get_columns("enterprise_leads")
        print("\nColumns:")
        for col in columns:
            print(f"  - {col['name']}: {col['type']} (Nullable: {col['nullable']})")
            
        # Check current rows
        db = SessionLocal()
        try:
            res = db.execute(text("SELECT count(*) FROM enterprise_leads")).scalar()
            print(f"\nTotal leads in table: {res}")
            if res > 0:
                rows = db.execute(text("SELECT * FROM enterprise_leads LIMIT 5")).fetchall()
                print("\nSample leads:")
                for r in rows:
                    print(r)
        except Exception as e:
            print(f"Error querying table: {e}")
        finally:
            db.close()
    else:
        print("\nWARNING: 'enterprise_leads' table DOES NOT exist in database!")

if __name__ == "__main__":
    check_table()
