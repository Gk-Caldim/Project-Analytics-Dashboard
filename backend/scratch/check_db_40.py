
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")

engine = create_engine(DATABASE_URL)

def check_dataset(dataset_id):
    with engine.connect() as conn:
        # Check datasets table
        res = conn.execute(text(f"SELECT * FROM datasets WHERE id = {dataset_id}")).fetchone()
        if res:
            print(f"Dataset {dataset_id} found in 'datasets' table:")
            print(res._asdict())
        else:
            print(f"Dataset {dataset_id} NOT found in 'datasets' table.")

        # Check uploads table
        res = conn.execute(text(f"SELECT * FROM uploads WHERE id = {dataset_id}")).fetchone()
        if res:
            print(f"Upload {dataset_id} found in 'uploads' table:")
            print(res._asdict())
        else:
            print(f"Upload {dataset_id} NOT found in 'uploads' table.")

if __name__ == "__main__":
    check_dataset(40)
