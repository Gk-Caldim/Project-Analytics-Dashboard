import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.budget import BudgetSummary

db = SessionLocal()
try:
    budgets = db.query(BudgetSummary).all()
    print(f"Total budget records found: {len(budgets)}")
    for i, b in enumerate(budgets):
        print(f"{i+1}. Project: {b.project_name}")
        if b.budget_data:
            print("   Keys:", list(b.budget_data[0].keys()))
        else:
            print("   No budget_data")
finally:
    db.close()
