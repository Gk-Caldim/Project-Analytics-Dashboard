import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.api.budget import get_budget_summary
from app.schemas.budget import BudgetSummaryResponse

def repro_get_error():
    db = SessionLocal()
    try:
        project_name = "Ashok Leyland"
        print(f"Testing GET for project: {project_name}")
        budget_obj = get_budget_summary(project_name, db)
        
        # Simulate FastAPI's response_model validation
        print("Validating with BudgetSummaryResponse...")
        validated = BudgetSummaryResponse.model_validate(budget_obj)
        print("Validation successful!")
        print(f"Result: {validated.model_dump_json(indent=2)}")
    except Exception as e:
        print(f"GET failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    repro_get_error()
