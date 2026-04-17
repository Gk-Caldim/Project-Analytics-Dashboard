from app.core.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE issues ADD COLUMN milestone_name VARCHAR(200);"))
    print("milestone_name added successfully")
except Exception as e:
    print("Error or already exists:", e)
