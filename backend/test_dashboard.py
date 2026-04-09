"""Quick smoke-test writing output to file."""
from app.core.database import SessionLocal
from app.services.dashboard_service import get_dashboard_data, get_all_projects_summary
import json

db = SessionLocal()
try:
    summary = get_all_projects_summary(db)
    detail = get_dashboard_data(db, summary[0]["project_id"]) if summary else {}
    detail_preview = {k: v for k, v in detail.items() if k != "milestones"}
    detail_preview["milestones_count"] = len(detail.get("milestones", []))
    output = {
        "all_projects_summary": summary,
        "detail_project": detail_preview,
    }
    with open("test_dashboard_out.json", "w") as f:
        json.dump(output, f, indent=2, default=str)
except Exception as e:
    import traceback
    with open("test_dashboard_out.json", "w") as f:
        f.write(traceback.format_exc())
finally:
    db.close()
