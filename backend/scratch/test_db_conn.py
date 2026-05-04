import os
import sys
from sqlalchemy import create_engine, text

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.core.config import DATABASE_URL

print(f"Attempting to connect to: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print(f"Connection successful! Result: {result.scalar()}")
except Exception as e:
    print(f"Connection failed: {e}")
    import traceback
    traceback.print_exc()
