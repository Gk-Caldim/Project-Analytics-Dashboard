import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import inspect
from app.core.database import engine

def main():
    inspector = inspect(engine)
    columns = inspector.get_columns('project_sub_categories')
    for col in columns:
        print(f"Column: {col['name']}, Type: {col['type']}")

if __name__ == '__main__':
    main()
