import sys
import os

# Add backend to path so we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.core.database import SessionLocal

def main():
    db = SessionLocal()
    
    try:
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN phase VARCHAR;"))
        db.commit()
        print("Added phase column")
    except Exception as e:
        db.rollback()
        print("Could not add phase column:", e)

    try:
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN category VARCHAR;"))
        db.commit()
        print("Added category column")
    except Exception as e:
        db.rollback()
        print("Could not add category column:", e)

    try:
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN assigned_employees JSONB DEFAULT '[]'::jsonb;"))
        db.commit()
        print("Added assigned_employees column")
    except Exception as e:
        db.rollback()
        print("Could not add assigned_employees column:", e)

    try:
        db.execute(text("ALTER TABLE project_sub_categories ADD COLUMN department VARCHAR;"))
        db.commit()
        print("Added department column")
    except Exception as e:
        db.rollback()
        print("Could not add department column:", e)

    db.close()

if __name__ == '__main__':
    main()
