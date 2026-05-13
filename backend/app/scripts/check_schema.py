
import os
import sys
from sqlalchemy import text, create_engine

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.core.database import engine

def check_schema():
    with engine.connect() as conn:
        try:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'meetings'"))
            columns = [row[0] for row in res.fetchall()]
            print(f"Columns in 'meetings' table: {columns}")
            
            if 'transcript' in columns:
                print("Column 'transcript' exists.")
            else:
                print("Column 'transcript' is MISSING!")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
