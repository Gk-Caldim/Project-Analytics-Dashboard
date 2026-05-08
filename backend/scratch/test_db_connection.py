import sys
import os

# Add the current directory to sys.path to import app
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.budget import BudgetSummary
from sqlalchemy import text

def test_connection():
    print("Testing database connection...")
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1")).scalar()
        print(f"Connection successful! Result: {result}")
        
        project_name = "ZOHO"
        print(f"Fetching budget for project: {project_name}")
        budget = db.query(BudgetSummary).filter(
            BudgetSummary.project_name == project_name
        ).order_by(BudgetSummary.budget_date.desc()).first()
        
        if budget:
            print(f"Found budget: ID={budget.id}, Overall Budget={budget.overall_budget}")
        else:
            print("No budget found for this project.")
            
        db.close()
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
