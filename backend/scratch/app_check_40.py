
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.upload import Upload
from app.models.dataset import Dataset

def check_db_config():
    print(f"DB_TYPE: {settings.DB_TYPE}")
    db = SessionLocal()
    try:
        up40 = db.query(Upload).filter(Upload.id == 40).first()
        ds40 = db.query(Dataset).filter(Dataset.id == 40).first()
        print(f"Upload 40: {up40}")
        print(f"Dataset 40: {ds40}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db_config()
