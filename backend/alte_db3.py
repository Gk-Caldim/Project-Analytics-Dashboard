from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("Missing DATABASE_URL")

engine = create_engine(DATABASE_URL)

alter_statements = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_lead JSONB;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager JSONB;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget FLOAT;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS utilized_budget FLOAT;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS balance_budget FLOAT;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS timeline VARCHAR;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS employee_id VARCHAR;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS employee_name VARCHAR;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_fields JSONB;"
]

with engine.begin() as conn:
    for stmt in alter_statements:
        try:
            conn.execute(text(stmt))
            print(f"Successfully executed: {stmt}")
        except Exception as e:
            print(f"Error executing {stmt}: {e}")
