import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import inspect
from app.core.database import engine

def main():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Foreign Keys to 'projects':")
    for table_name in tables:
        fks = inspector.get_foreign_keys(table_name)
        for fk in fks:
            if fk['referred_table'] == 'projects':
                print(f"Table: {table_name}, FK constraint: {fk['name']}, Columns: {fk['constrained_columns']} -> {fk['referred_columns']}")

if __name__ == '__main__':
    main()
