from app.core.database import SessionLocal
from app.models.upload import Upload
db = SessionLocal()
print("Total uploads:", db.query(Upload).count())
u = db.query(Upload).filter(Upload.id == 40).first()
if u:
    print("Found Upload:", u.id, u.file_name)
else:
    print("Upload 40 not found by SQLAlchemy!")

from sqlalchemy import text
print("Raw SQL row count:", db.execute(text("SELECT count(*) FROM uploads")).scalar())
print("Raw SQL fetch id=40:", db.execute(text("SELECT id, file_name FROM uploads WHERE id=40")).fetchone())
