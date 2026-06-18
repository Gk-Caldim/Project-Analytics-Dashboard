from app.core.database import SessionLocal
from app.services.dashboard_service import get_trackers_analytics
import json

db = SessionLocal()
res = get_trackers_analytics(db)
print(json.dumps(res, indent=2))
db.close()
