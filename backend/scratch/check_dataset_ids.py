
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
engine = create_engine(DATABASE_URL)

def check_dataset_ids():
    with engine.connect() as conn:
        print("Dataset IDs in uploads table:")
        res = conn.execute(text("SELECT DISTINCT dataset_id FROM uploads WHERE dataset_id IS NOT NULL")).fetchall()
        for r in res:
            print(r[0])

if __name__ == "__main__":
    check_dataset_ids()
