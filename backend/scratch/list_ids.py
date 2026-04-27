
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def list_ids():
    with engine.connect() as conn:
        print("Dataset IDs:")
        res = conn.execute(text("SELECT id FROM datasets ORDER BY id DESC LIMIT 10")).fetchall()
        for r in res:
            print(r[0])
            
        print("\nUpload IDs:")
        res = conn.execute(text("SELECT id FROM uploads ORDER BY id DESC LIMIT 10")).fetchall()
        for r in res:
            print(r[0])

if __name__ == "__main__":
    list_ids()
