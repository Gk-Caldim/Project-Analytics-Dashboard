
import os
import sys
from sqlalchemy import text

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import engine

def check_schema():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'meetings'"))
        columns = [r[0] for r in res.fetchall()]
        print(f"Columns in 'meetings' table: {columns}")

if __name__ == "__main__":
    check_schema()
