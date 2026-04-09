from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Missing DATABASE_URL")

engine = create_engine(DATABASE_URL)

alter_statements = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS started_date TIMESTAMP;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;",
    "ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER;",
    "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS project_id INTEGER;"
]

with engine.begin() as conn:
    for stmt in alter_statements:
        try:
            conn.execute(text(stmt))
            print(f"Successfully executed: {stmt}")
        except Exception as e:
            print(f"Error executing: {stmt}")
            print(e)
