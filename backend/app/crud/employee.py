# app/crud/employee.py
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.core.security import hash_password
from typing import List, Optional
from sqlalchemy import func
from app.models.employee_project import EmployeeProjectMap
from app.models.project import Project

def get_employees(db: Session, skip: int = 0, limit: int = 1000) -> List[Employee]:
    """Get all employees with their assigned project names"""
    results = (
        db.query(
            Employee,
            func.string_agg(Project.name, ', ').label('project_names')
        )
        .outerjoin(EmployeeProjectMap, Employee.employee_id == EmployeeProjectMap.employee_id)
        .outerjoin(Project, EmployeeProjectMap.project_id == Project.project_id)
        .group_by(Employee.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    employees = []
    for emp, proj_names in results:
        emp.project_name = proj_names if proj_names else "not assigned"
        employees.append(emp)
        
    return employees

def get_employee(db: Session, employee_id: int) -> Optional[Employee]:
    """Get a single employee by ID with project name"""
    result = (
        db.query(
            Employee,
            func.string_agg(Project.name, ', ').label('project_names')
        )
        .outerjoin(EmployeeProjectMap, Employee.employee_id == EmployeeProjectMap.employee_id)
        .outerjoin(Project, EmployeeProjectMap.project_id == Project.project_id)
        .filter(Employee.id == employee_id)
        .group_by(Employee.id)
        .first()
    )
    
    if not result:
        return None
        
    emp, proj_names = result
    emp.project_name = proj_names if proj_names else "not assigned"
    return emp

def get_employee_by_email(db: Session, email: str) -> Optional[Employee]:
    """Get employee by email"""
    return db.query(Employee).filter(Employee.email == email).first()

def get_employee_by_employee_id(db: Session, employee_id: str) -> Optional[Employee]:
    """Get employee by custom employee_id"""
    return db.query(Employee).filter(Employee.employee_id == employee_id).first()

from app.models.application_access import ApplicationAccess

def create_employee(db: Session, employee: EmployeeCreate) -> Employee:
    """Create a new employee and synchronized application access"""
    # Check if employee_id already exists
    if employee.employee_id:
        existing = get_employee_by_employee_id(db, employee.employee_id)
        if existing:
            raise ValueError(f"Employee with ID {employee.employee_id} already exists")
            
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
    
    db.delete(db_employee)
    db.commit()
    return True

def bulk_delete_employees(db: Session, employee_ids: List[int]) -> bool:
    """Bulk delete employees"""
    try:
        db.query(Employee).filter(Employee.id.in_(employee_ids)).delete(synchronize_session=False)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
