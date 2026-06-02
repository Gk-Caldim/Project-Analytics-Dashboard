import sys
import os
sys.path.append(os.getcwd())

from app.core.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'meetings';"))
        columns = result.fetchall()
        print("\n--- Current Columns in 'meetings' table ---")
        for col in columns:
            print(f"{col[0]}: {col[1]}")
        print("-------------------------------------------\n")

if __name__ == "__main__":
    check()
