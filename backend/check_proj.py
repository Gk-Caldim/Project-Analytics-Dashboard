import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.project import Project

db = SessionLocal()
projs = db.query(Project).all()
for p in projs:
    print(f"Project: {p.name}")
