from app.core.database import SessionLocal
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_jsonb_column():
    db = SessionLocal()
    try:
        logger.info("Adding file_data JSONB column to uploads table...")
        db.execute(text('ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_data JSONB'))
        db.commit()
        logger.info("Column added successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to add column: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_jsonb_column()
