import os
import sys
import time
from sqlalchemy import text, or_

# Set up path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.employee import Employee
from app.models.project import Project
from app.models.employee_project import EmployeeProjectMap
from app.models.department import Department
from scratch.benchmark_employee_master import (
    get_employees_original,
    get_employees_optimized_memory,
    get_employees_pagination_aware
)

def run_simulation(scale_employees, scale_projects, scale_allocations):
    db = SessionLocal()
    # Ensure everything is rolled back at the end
    try:
        print(f"\n==================================================")
        print(f"SIMULATING SCALE: {scale_employees} Employees, {scale_projects} Projects, {scale_allocations} Allocations")
        print(f"==================================================")
        
        # 1. Clean run within transaction (uncommitted)
        db.begin()
        
        print("Inserting transient benchmark data (will be rolled back)...")
        # Bulk insert employees
        mock_employees = [
            Employee(
                employee_id=f"MOCK_EMP_{i}",
                name=f"Mock Employee Name {i}",
                email=f"mock_emp_{i}@example.com",
                role="Employee",
                status="Active"
            ) for i in range(scale_employees)
        ]
        db.bulk_save_objects(mock_employees)
        
        # Bulk insert projects
        mock_projects = [
            Project(
                project_id=f"MOCK_PRJ_{i}",
                name=f"Mock Project Name {i}",
                project_manager=f"Mock Employee Name {i % scale_employees}" if i % 2 == 0 else None,
                employee_id=f"MOCK_EMP_{(i + 1) % scale_employees}" if i % 3 == 0 else None,
                assigned_to_id=f"MOCK_EMP_{(i + 2) % scale_employees}" if i % 4 == 0 else None,
                assigned_to_name=f"Mock Employee Name {(i + 3) % scale_employees}, Mock Employee Name {(i + 4) % scale_employees}" if i % 5 == 0 else None,
                status="Planning"
            ) for i in range(scale_projects)
        ]
        db.bulk_save_objects(mock_projects)
        
        # Bulk insert allocations
        mock_allocations = [
            EmployeeProjectMap(
                employee_id=f"MOCK_EMP_{i % scale_employees}",
                project_id=f"MOCK_PRJ_{i % scale_projects}",
                role="Developer",
                allocation_percentage=100.0
            ) for i in range(scale_allocations)
        ]
        db.bulk_save_objects(mock_allocations)
        
        db.flush()
        print("Transient data flushed to database session.")

        # 2. Benchmarking the loops
        limit = 100
        print(f"\n--- Running CPU Benchmarks (Page Limit = {limit}) ---")
        
        start = time.perf_counter()
        get_employees_original(db, limit=limit)
        time_orig = (time.perf_counter() - start) * 1000
        print(f"Original logic: {time_orig:.2f} ms")

        start = time.perf_counter()
        get_employees_optimized_memory(db, limit=limit)
        time_opt = (time.perf_counter() - start) * 1000
        print(f"Optimized memory logic: {time_opt:.2f} ms (Speedup: {time_orig/time_opt:.2f}x)")

        start = time.perf_counter()
        get_employees_pagination_aware(db, limit=limit)
        time_pag = (time.perf_counter() - start) * 1000
        print(f"Pagination-aware logic: {time_pag:.2f} ms (Speedup vs Original: {time_orig/time_pag:.2f}x)")

        # 3. Running EXPLAIN ANALYZE on aggregate joins
        print("\n--- Capturing Database EXPLAIN (ANALYZE, BUFFERS) ---")
        explain_sql = """
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT 
            e.id, 
            e.employee_id, 
            e.name, 
            COALESCE(
                string_agg(DISTINCT p.name, ', ' ORDER BY p.name), 
                'not assigned'
            ) AS project_name
        FROM employees e
        LEFT JOIN employee_project_map epm ON e.employee_id = epm.employee_id
        LEFT JOIN projects p ON 
            p.project_id = epm.project_id
            OR p.employee_id = e.employee_id
            OR p.assigned_to_id = e.employee_id
            OR trim(p.project_manager) = trim(e.name)
            OR trim(e.name) = ANY(string_to_array(regexp_replace(p.assigned_to_name, '\\s*,\\s*', ',', 'g'), ','))
        WHERE e.employee_id LIKE 'MOCK_EMP_%'
        GROUP BY e.id
        LIMIT 100;
        """
        
        try:
            res = db.execute(text(explain_sql))
            plan = [row[0] for row in res.fetchall()]
            print("\n".join(plan))
        except Exception as query_err:
            print(f"Failed to generate EXPLAIN PLAN: {query_err}")

    except Exception as e:
        print(f"Error during simulation: {e}")
    finally:
        print("\nRolling back transaction... Database is completely clean.")
        db.rollback()
        db.close()

if __name__ == "__main__":
    # Test scale of 100 employees / 200 projects / 150 allocations
    run_simulation(100, 200, 150)
    
    # Test scale of 500 employees / 1000 projects / 800 allocations
    run_simulation(500, 1000, 800)
