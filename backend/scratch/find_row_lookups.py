import re

with open("d:/Caldim/Project Analytics dashboard v/Project-Analytics-Dashboard/frontend/src/pages/Masters/BudgetMaster.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "row[" in line or "r[" in line or "src[" in line:
        print(f"Line {i+1}: {line.strip()}")
