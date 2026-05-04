from app.core.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_constraints():
    db = SessionLocal()
    try:
        # Drop old constraint
        logger.info("Dropping old constraint uq_department_filename...")
        db.execute(text('ALTER TABLE datasets DROP CONSTRAINT IF EXISTS uq_department_filename'))
        
        # Add new constraint including project
        logger.info("Adding new constraint uq_project_dept_filename...")
        db.execute(text('ALTER TABLE datasets ADD CONSTRAINT uq_project_dept_filename UNIQUE (project, department, name)'))
        
        db.commit()
        logger.info("Database constraint updated successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update database constraint: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_constraints()
