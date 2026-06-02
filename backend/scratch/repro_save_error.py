import json
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.budget import BudgetSummary
from app.models.project import Project

def test_save_budget():
    db = SessionLocal()
    try:
        project_name = "ZOHO"
        budget_data = [
            {"Category": "CAPEX", "Item Name": "Test", "Total utilization": 100, "Balance": 400}
        ]
        
        print(f"Testing save for project: {project_name}")
        
        # 1. Check if table exists (simplified)
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if not inspector.has_table("budget_summaries"):
            print("ERROR: Table 'budget_summaries' does not exist!")
            return

        # 2. Simulate save_budget_summary logic
        budget = db.query(BudgetSummary).filter(BudgetSummary.project_name == project_name).first()
        if budget:
            print("Updating existing budget")
            budget.budget_data = budget_data
        else:
            print("Creating new budget")
            budget = BudgetSummary(
                project_name=project_name,
                budget_data=budget_data,
                overall_budget=500.0
            )
            db.add(budget)
        
        # 3. Sync logic
        total_utilized = 0.0
        total_balance = 0.0
        for row in budget_data:
            total_utilized += float(row.get('Total utilization') or 0)
            total_balance += float(row.get('Balance') or 0)
            
        proj = db.query(Project).filter(Project.name == project_name).first()
        if proj:
            print(f"Syncing to project: {project_name}")
            proj.budget = 500.0
            proj.utilized_budget = total_utilized
            proj.balance_budget = total_balance
        else:
            print(f"Project '{project_name}' not found for sync.")
            
        db.commit()
        print("Save successful!")
    except Exception as e:
        print(f"Save failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_save_budget()

