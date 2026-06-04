# app/crud/employee.py
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.core.security import hash_password
from typing import List, Optional
from sqlalchemy import func
from app.models.employee_project import EmployeeProjectMap
from app.models.project import Project
from app.models.project_permission import ProjectPermission
from app.models.application_access import ApplicationAccess

def get_employees(db: Session, skip: int = 0, limit: int = 1000) -> List[Employee]:
    """
    Get all employees with their assigned project names.
    
    NOTE ON NAME-BASED RESOLUTION:
    Due to database schema constraints, Project Manager (project_manager) and
    Assigned Employees (assigned_to_name) are stored as text/names rather than
    foreign key IDs. Consequently, associations are resolved using exact name matching
    in application memory.
    
    LIMITATION:
    If multiple employees share the same name, this matching can be ambiguous.
    """
    employees = db.query(Employee).offset(skip).limit(limit).all()
    if not employees:
        return []

    # Fetch all project fields needed for assignment mapping
    projects = db.query(
        Project.project_id,
        Project.name,
        Project.project_manager,
        Project.employee_id,
        Project.assigned_to_id,
        Project.assigned_to_name
    ).all()

    # Fetch allocations from EmployeeProjectMap
    allocations = db.query(
        EmployeeProjectMap.employee_id,
        EmployeeProjectMap.project_id
    ).all()

    # Map allocations by employee_id -> set of project_ids
    alloc_map = {}
    for alloc in allocations:
        if alloc.employee_id:
            alloc_map.setdefault(alloc.employee_id, set()).add(alloc.project_id)

    for emp in employees:
        assigned_projects = set()

        # Match 1: Junction allocations (EmployeeProjectMap)
        if emp.employee_id and emp.employee_id in alloc_map:
            for pid in alloc_map[emp.employee_id]:
                proj_name = next((p.name for p in projects if p.project_id == pid), None)
                if proj_name:
                    assigned_projects.add(proj_name)

        # Match 2-5: Direct field assignments in Project records
        for proj in projects:
            # Match 2: Team Lead by ID
            if emp.employee_id and proj.employee_id == emp.employee_id:
                assigned_projects.add(proj.name)
                continue

            # Match 3: Assigned Employee by ID
            if emp.employee_id and proj.assigned_to_id == emp.employee_id:
                assigned_projects.add(proj.name)
                continue

            # Match 4: Project Manager by name (exact match)
            if emp.name and proj.project_manager == emp.name:
                assigned_projects.add(proj.name)
                continue

            # Match 5: Assigned Employee by name (exact match in comma-separated list)
            if emp.name and proj.assigned_to_name:
                names = [n.strip() for n in proj.assigned_to_name.split(",") if n.strip()]
                if emp.name in names:
                    assigned_projects.add(proj.name)

        sorted_proj_names = sorted(list(assigned_projects))
        emp.project_name = ", ".join(sorted_proj_names) if sorted_proj_names else "not assigned"

    return employees

def get_employee(db: Session, employee_id: int) -> Optional[Employee]:
    """
    Get a single employee by ID with project name.
    
    NOTE ON NAME-BASED RESOLUTION:
    Resolves project associations using exact name matching in application memory.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return None

    # Fetch all project fields needed for assignment mapping
    projects = db.query(
        Project.project_id,
        Project.name,
        Project.project_manager,
        Project.employee_id,
        Project.assigned_to_id,
        Project.assigned_to_name
    ).all()

    # Fetch allocations for this employee
    alloc_project_ids = set()
    if emp.employee_id:
        allocs = db.query(EmployeeProjectMap.project_id).filter(EmployeeProjectMap.employee_id == emp.employee_id).all()
        alloc_project_ids = {a.project_id for a in allocs}

    assigned_projects = set()

    # Match 1: Junction allocations (EmployeeProjectMap)
    for pid in alloc_project_ids:
        proj_name = next((p.name for p in projects if p.project_id == pid), None)
        if proj_name:
            assigned_projects.add(proj_name)

    # Match 2-5: Direct field assignments in Project records
    for proj in projects:
        # Match 2: Team Lead by ID
        if emp.employee_id and proj.employee_id == emp.employee_id:
            assigned_projects.add(proj.name)
            continue

        # Match 3: Assigned Employee by ID
        if emp.employee_id and proj.assigned_to_id == emp.employee_id:
            assigned_projects.add(proj.name)
            continue

        # Match 4: Project Manager by name (exact match)
        if emp.name and proj.project_manager == emp.name:
            assigned_projects.add(proj.name)
            continue

        # Match 5: Assigned Employee by name (exact match in comma-separated list)
        if emp.name and proj.assigned_to_name:
            names = [n.strip() for n in proj.assigned_to_name.split(",") if n.strip()]
            if emp.name in names:
                assigned_projects.add(proj.name)

    sorted_proj_names = sorted(list(assigned_projects))
    emp.project_name = ", ".join(sorted_proj_names) if sorted_proj_names else "not assigned"
    return emp

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get employee by email"""
    return db.query(Employee).filter(Employee.email == email).first()

def get_employee_by_employee_id(db: Session, employee_id: str) -> Optional[Employee]:
    """Get employee by custom employee_id"""
    return db.query(Employee).filter(Employee.employee_id == employee_id).first()

from app.utils.validators import validate_custom_fields

def create_employee(db: Session, employee: EmployeeCreate) -> Employee:
    """Create a new employee and synchronized application access"""
    # Check if employee_id already exists
    if employee.employee_id:
        existing = get_employee_by_employee_id(db, employee.employee_id)
        if existing:
            raise ValueError(f"Employee with ID {employee.employee_id} already exists")
            
    # Validate custom fields
    validation_errors = validate_custom_fields(db, 'employee', employee.custom_fields)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))

    data = employee.model_dump(exclude={"id"})
    password = data.pop("password", None)
    
    # Still keep hashed_password in employee for now as per user request
    if password:
        data["hashed_password"] = hash_password(password)
        
    db_employee = Employee(**data)
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)

    # Create ApplicationAccess record
    if password or db_employee.email:
        access_data = {
            "employee_id": db_employee.id,
            "email": db_employee.email,
            "hashed_password": hash_password(password) if password else ""
        }
        db_access = ApplicationAccess(**access_data)
        db.add(db_access)
        db.commit()

    return db_employee

def update_employee(db: Session, employee_id: int, employee: EmployeeUpdate) -> Optional[Employee]:
    """Update an existing employee and sync with application access"""
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return None
    
    update_data = employee.model_dump(exclude_unset=True)
    
    # Validate custom fields if they are being updated
    if "custom_fields" in update_data:
        validation_errors = validate_custom_fields(db, 'employee', update_data["custom_fields"])
        if validation_errors:
            raise ValueError("; ".join(validation_errors))

    # Check if email is being updated
    old_email = db_employee.email
    new_email = update_data.get('email')

    # Handle employee_id and id checks (existing logic)
    if 'id' in update_data and update_data['id'] != employee_id:
        existing_id = get_employee(db, update_data['id'])
        if existing_id:
            raise ValueError(f"Employee with id {update_data['id']} already exists")

    if 'employee_id' in update_data and update_data['employee_id'] != db_employee.employee_id:
        if update_data['employee_id']:
            existing = get_employee_by_employee_id(db, update_data['employee_id'])
            if existing and existing.id != employee_id:
                raise ValueError(f"Employee with ID {update_data['employee_id']} already exists")
    
    # Handle password update
    password = update_data.pop("password", None)
    if password:
        update_data["hashed_password"] = hash_password(password)
            
    for field, value in update_data.items():
        setattr(db_employee, field, value)
    
    db.commit()
    db.refresh(db_employee)

    # Sync with ApplicationAccess
    access = db.query(ApplicationAccess).filter(ApplicationAccess.employee_id == db_employee.id).first()
    if access:
        if new_email:
            access.email = new_email
        if password:
            access.hashed_password = hash_password(password)
        db.commit()
    elif new_email or db_employee.email:
        # Create it if it doesn't exist for some reason
        new_access = ApplicationAccess(
            employee_id=db_employee.id,
            email=new_email or db_employee.email,
            hashed_password=hash_password(password) if password else ""
        )
        db.add(new_access)
        db.commit()

    return db_employee

def delete_employee(db: Session, employee_id: int) -> bool:
    """Delete an employee"""
    db_employee = get_employee(db, employee_id)
    if not db_employee:
        return False
    
    try:
        # Manually cascade deletes
        if db_employee.employee_id:
            db.query(EmployeeProjectMap).filter(EmployeeProjectMap.employee_id == db_employee.employee_id).delete(synchronize_session=False)
            db.query(ProjectPermission).filter(ProjectPermission.employee_id == db_employee.employee_id).delete(synchronize_session=False)
            db.query(Project).filter(Project.employee_id == db_employee.employee_id).update({"employee_id": None}, synchronize_session=False)
            
        db.query(ApplicationAccess).filter(ApplicationAccess.employee_id == db_employee.id).delete(synchronize_session=False)
        
        db.delete(db_employee)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e

def bulk_delete_employees(db: Session, employee_ids: List[int]) -> bool:
    """Bulk delete employees"""
    try:
        employees = db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        emp_str_ids = [e.employee_id for e in employees if e.employee_id]
        
        if emp_str_ids:
            db.query(EmployeeProjectMap).filter(EmployeeProjectMap.employee_id.in_(emp_str_ids)).delete(synchronize_session=False)
            db.query(ProjectPermission).filter(ProjectPermission.employee_id.in_(emp_str_ids)).delete(synchronize_session=False)
            db.query(Project).filter(Project.employee_id.in_(emp_str_ids)).update({"employee_id": None}, synchronize_session=False)
            
        db.query(ApplicationAccess).filter(ApplicationAccess.employee_id.in_(employee_ids)).delete(synchronize_session=False)
        
        db.query(Employee).filter(Employee.id.in_(employee_ids)).delete(synchronize_session=False)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e

def get_employees_by_role(db: Session, role: str) -> List[Employee]:
    """Get all employees with a specific role"""
    return db.query(Employee).filter(Employee.role.ilike(f"%{role}%")).all()

def get_employee_statistics(db: Session) -> dict:
    """Get employee count statistics grouped by role"""
    results = db.query(Employee.role, func.count(Employee.id).label('count')).group_by(Employee.role).all()
    
    stats = {}
    for role, count in results:
        if role:  # Only include roles that are not null
            stats[role] = count
    
    return stats
