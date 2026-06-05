import os
import sys
import time
from sqlalchemy import or_

# Set up path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.project import Project
from app.models.employee_project import EmployeeProjectMap
from app.models.department import Department

def get_employees_original(db, skip=0, limit=1000):
    employees = db.query(Employee).offset(skip).limit(limit).all()
    if not employees:
        return []

    projects = db.query(
        Project.project_id,
        Project.name,
        Project.project_manager,
        Project.employee_id,
        Project.assigned_to_id,
        Project.assigned_to_name
    ).all()

    allocations = db.query(
        EmployeeProjectMap.employee_id,
        EmployeeProjectMap.project_id
    ).all()

    alloc_map = {}
    for alloc in allocations:
        if alloc.employee_id:
            alloc_map.setdefault(alloc.employee_id, set()).add(alloc.project_id)

    for emp in employees:
        assigned_projects = set()

        if emp.employee_id and emp.employee_id in alloc_map:
            for pid in alloc_map[emp.employee_id]:
                proj_name = next((p.name for p in projects if p.project_id == pid), None)
                if proj_name:
                    assigned_projects.add(proj_name)

        for proj in projects:
            if emp.employee_id and proj.employee_id == emp.employee_id:
                assigned_projects.add(proj.name)
                continue

            if emp.employee_id and proj.assigned_to_id == emp.employee_id:
                assigned_projects.add(proj.name)
                continue

            if emp.name and proj.project_manager == emp.name:
                assigned_projects.add(proj.name)
                continue

            if emp.name and proj.assigned_to_name:
                names = [n.strip() for n in proj.assigned_to_name.split(",") if n.strip()]
                if emp.name in names:
                    assigned_projects.add(proj.name)

        sorted_proj_names = sorted(list(assigned_projects))
        emp.project_name = ", ".join(sorted_proj_names) if sorted_proj_names else "not assigned"

    return employees

def get_employees_optimized_memory(db, skip=0, limit=1000):
    employees = db.query(Employee).offset(skip).limit(limit).all()
    if not employees:
        return []

    projects = db.query(
        Project.project_id,
        Project.name,
        Project.project_manager,
        Project.employee_id,
        Project.assigned_to_id,
        Project.assigned_to_name
    ).all()

    allocations = db.query(
        EmployeeProjectMap.employee_id,
        EmployeeProjectMap.project_id
    ).all()

    # Pre-index allocations (O(Allocations) time)
    alloc_map = {}
    for alloc in allocations:
        if alloc.employee_id:
            alloc_map.setdefault(alloc.employee_id, set()).add(alloc.project_id)

    project_id_to_name = {p.project_id: p.name for p in projects if p.project_id}

    # Pre-index projects by match keys (O(Projects) time)
    team_lead_projects = {}
    assigned_id_projects = {}
    pm_projects = {}
    assigned_name_projects = {}

    for proj in projects:
        if proj.employee_id:
            team_lead_projects.setdefault(proj.employee_id, set()).add(proj.name)
        if proj.assigned_to_id:
            assigned_id_projects.setdefault(proj.assigned_to_id, set()).add(proj.name)
        if proj.project_manager:
            pm_projects.setdefault(proj.project_manager.strip(), set()).add(proj.name)
        if proj.assigned_to_name:
            names = [n.strip() for n in proj.assigned_to_name.split(",") if n.strip()]
            for name in names:
                assigned_name_projects.setdefault(name, set()).add(proj.name)

    # Match in O(1) dictionary lookups
    for emp in employees:
        assigned_projects = set()

        if emp.employee_id and emp.employee_id in alloc_map:
            for pid in alloc_map[emp.employee_id]:
                proj_name = project_id_to_name.get(pid)
                if proj_name:
                    assigned_projects.add(proj_name)

        if emp.employee_id and emp.employee_id in team_lead_projects:
            assigned_projects.update(team_lead_projects[emp.employee_id])

        if emp.employee_id and emp.employee_id in assigned_id_projects:
            assigned_projects.update(assigned_id_projects[emp.employee_id])

        if emp.name:
            emp_name_clean = emp.name.strip()
            if emp_name_clean in pm_projects:
                assigned_projects.update(pm_projects[emp_name_clean])
            if emp_name_clean in assigned_name_projects:
                assigned_projects.update(assigned_name_projects[emp_name_clean])

        sorted_proj_names = sorted(list(assigned_projects))
        emp.project_name = ", ".join(sorted_proj_names) if sorted_proj_names else "not assigned"

    return employees

def get_employees_pagination_aware(db, skip=0, limit=1000):
    # 1. Fetch paginated employees first
    employees = db.query(Employee).offset(skip).limit(limit).all()
    if not employees:
        return []

    # 2. Extract employee_ids and names for the batch
    emp_ids = [e.employee_id for e in employees if e.employee_id]
    emp_names = [e.name for e in employees if e.name]

    if not emp_ids and not emp_names:
        for emp in employees:
            emp.project_name = "not assigned"
        return employees

    # 3. Query ONLY projects matching the batch
    # Using simple substring filters to filter projects before memory mapping
    project_filters = [
        Project.employee_id.in_(emp_ids),
        Project.assigned_to_id.in_(emp_ids),
        Project.project_manager.in_(emp_names)
    ]
    for name in emp_names:
        project_filters.append(Project.assigned_to_name.like(f"%{name}%"))

    projects = db.query(
        Project.project_id,
        Project.name,
        Project.project_manager,
        Project.employee_id,
        Project.assigned_to_id,
        Project.assigned_to_name
    ).filter(or_(*project_filters)).all()

    # 4. Query ONLY allocations matching the batch
    allocations = db.query(
        EmployeeProjectMap.employee_id,
        EmployeeProjectMap.project_id
    ).filter(EmployeeProjectMap.employee_id.in_(emp_ids)).all()

    # 5. Build lookup maps for the batch
    alloc_map = {}
    for alloc in allocations:
        alloc_map.setdefault(alloc.employee_id, set()).add(alloc.project_id)

    project_id_to_name = {p.project_id: p.name for p in projects if p.project_id}

    team_lead_projects = {}
    assigned_id_projects = {}
    pm_projects = {}
    assigned_name_projects = {}

    for proj in projects:
        if proj.employee_id:
            team_lead_projects.setdefault(proj.employee_id, set()).add(proj.name)
        if proj.assigned_to_id:
            assigned_id_projects.setdefault(proj.assigned_to_id, set()).add(proj.name)
        if proj.project_manager:
            pm_projects.setdefault(proj.project_manager.strip(), set()).add(proj.name)
        if proj.assigned_to_name:
            names = [n.strip() for n in proj.assigned_to_name.split(",") if n.strip()]
            for name in names:
                assigned_name_projects.setdefault(name, set()).add(proj.name)

    # 6. Map results
    for emp in employees:
        assigned_projects = set()

        if emp.employee_id and emp.employee_id in alloc_map:
            for pid in alloc_map[emp.employee_id]:
                proj_name = project_id_to_name.get(pid)
                if proj_name:
                    assigned_projects.add(proj_name)

        if emp.employee_id and emp.employee_id in team_lead_projects:
            assigned_projects.update(team_lead_projects[emp.employee_id])

        if emp.employee_id and emp.employee_id in assigned_id_projects:
            assigned_projects.update(assigned_id_projects[emp.employee_id])

        if emp.name:
            emp_name_clean = emp.name.strip()
            if emp_name_clean in pm_projects:
                assigned_projects.update(pm_projects[emp_name_clean])
            if emp_name_clean in assigned_name_projects:
                assigned_projects.update(assigned_name_projects[emp_name_clean])

        sorted_proj_names = sorted(list(assigned_projects))
        emp.project_name = ", ".join(sorted_proj_names) if sorted_proj_names else "not assigned"

    return employees

def run_benchmarks():
    db = SessionLocal()
    try:
        # Check current row counts
        emp_count = db.query(Employee).count()
        proj_count = db.query(Project).count()
        alloc_count = db.query(EmployeeProjectMap).count()
        print(f"--- Database Stats ---")
        print(f"Employees: {emp_count}")
        print(f"Projects: {proj_count}")
        print(f"Allocations (EmployeeProjectMap): {alloc_count}\n")

        # Warmup
        print("Warming up database connection...")
        db.query(Employee).limit(10).all()

        limit = 100
        print(f"--- Benchmarking list_employees (limit={limit}) ---")

        # 1. Original Logic
        start = time.perf_counter()
        res_orig = get_employees_original(db, limit=limit)
        time_orig = (time.perf_counter() - start) * 1000
        print(f"Original logic: {time_orig:.2f} ms")

        # 2. Optimized Loop Logic (Full load queries)
        start = time.perf_counter()
        res_opt = get_employees_optimized_memory(db, limit=limit)
        time_opt = (time.perf_counter() - start) * 1000
        print(f"Optimized memory logic: {time_opt:.2f} ms (Speedup: {time_orig/time_opt:.2f}x)")

        # 3. Pagination-aware Logic (Filtered queries)
        start = time.perf_counter()
        res_pag = get_employees_pagination_aware(db, limit=limit)
        time_pag = (time.perf_counter() - start) * 1000
        print(f"Pagination-aware logic: {time_pag:.2f} ms (Speedup vs Original: {time_orig/time_pag:.2f}x)")

        # Verify results match
        match = True
        for o, p in zip(res_orig, res_pag):
            if o.project_name != p.project_name:
                print(f"Mismatch for employee {o.name} (id={o.id}): Original='{o.project_name}', Optimized='{p.project_name}'")
                match = False
                break
        if match:
            print("\nVerification: SUCCESS! All implementation results match perfectly.")
        else:
            print("\nVerification: FAILURE! Mismatched outputs detected.")

    finally:
        db.close()

if __name__ == "__main__":
    run_benchmarks()
