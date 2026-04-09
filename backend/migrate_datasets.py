from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Missing DATABASE_URL")

engine = create_engine(DATABASE_URL)

alter_statements = [
    "ALTER TABLE uploads ALTER COLUMN project_id DROP NOT NULL;",
    "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS department VARCHAR;",
    "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS industry VARCHAR;",
    "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS row_count INTEGER;"
]

# Migration query mapping columns properly
migration_query = """
INSERT INTO uploads (file_name, industry, row_count, uploaded_at, project_id, department, uploaded_by)
SELECT name, industry, row_count, created_at, project_id, department, uploaded_by
FROM datasets
WHERE NOT EXISTS (
    SELECT 1 FROM uploads WHERE uploads.file_name = datasets.name AND uploads.department = datasets.department
);
"""

with engine.begin() as conn:
    print("Altering uploads table schema...")
    for stmt in alter_statements:
        try:
            conn.execute(text(stmt))
            print(f"Successfully executed: {stmt}")
        except Exception as e:
            print(f"Error executing {stmt}: {e}")
            
    print("Migrating dataset records to uploads...")
    try:
        result = conn.execute(text(migration_query))
        print(f"Data migration finished. Rows inserted: {result.rowcount}")
    except Exception as e:
        print(f"Error during data migration: {e}")

