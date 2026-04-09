# app/api/employees.py
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut
from app.schemas.employee_column import EmployeeColumnCreate, EmployeeColumnUpdate, EmployeeColumnOut
from app.crud import employee as employee_crud
from app.crud import employee_column as column_crud
from app.core.security import get_current_user
from app.utils.audit import log_activity, generate_diff_summary

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/version_check")
def version_check():
    return {"version": "v2_custom_columns", "status": "active"}

# ============================================================================
# EMPLOYEE ENDPOINTS
# ============================================================================

@router.get("", response_model=List[EmployeeOut])
def get_all_employees(
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """Get all employees with their custom fields"""
    employees = employee_crud.get_employees(db, skip=skip, limit=limit)
    return employees

@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get a single employee by ID"""
    employee = employee_crud.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with id {employee_id} not found"
        )
    return employee

@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    employee: EmployeeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new employee"""
    # Check if email already exists
    existing_employee = employee_crud.get_employee_by_email(db, employee.email)
    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with email {employee.email} already exists"
        )
    
    try:
        new_employee = employee_crud.create_employee(db, employee)
        
        # Audit Logging
        log_activity(
            db=db,
            user_id=current_user.get("employee_id") or current_user.get("id"),
            action="CREATE EMPLOYEE",
            module="Employees",
            entity_id=str(new_employee.id),
            details={
                "targetRole": new_employee.role,
                "summary": f"Added employee: {new_employee.name}",
                "details": f"Created employee record with ID: {new_employee.id}"
            }
        )
        return new_employee
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating employee: {str(e)}"
        )

@router.post("/bulk", response_model=List[EmployeeOut], status_code=status.HTTP_201_CREATED)
def bulk_create_employees(
    employees: List[EmployeeCreate],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk create employees (useful for Excel imports)"""
    created_employees = []
    errors = []
    
    for emp in employees:
        existing = employee_crud.get_employee_by_email(db, emp.email)
        if existing:
            errors.append(f"Email {emp.email} already exists")
            continue
            
        try:
            new_emp = employee_crud.create_employee(db, emp)
            created_employees.append(new_emp)
        except Exception as e:
            errors.append(f"Error creating {emp.email}: {str(e)}")
            
    if errors and len(created_employees) == 0:
        raise HTTPException(status_code=400, detail="All imports failed: " + ", ".join(errors))
        
    return created_employees


@router.put("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an existing employee"""
    # If email is being updated, check if it's already taken
    if employee.email:
        existing_employee = employee_crud.get_employee_by_email(db, employee.email)
        if existing_employee and existing_employee.id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with email {employee.email} already exists"
            )
    
    try:
        # Get old state for diff
        old_employee = employee_crud.get_employee(db, employee_id)
        if not old_employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found"
            )
            
        diff_summary = generate_diff_summary(old_employee, employee)
        
        updated_employee = employee_crud.update_employee(db, employee_id, employee)
        
        # Audit Logging
        log_activity(
            db=db,
            user_id=current_user.get("employee_id") or current_user.get("id"),
            action="UPDATE EMPLOYEE",
            module="Employees",
            entity_id=str(employee_id),
            details={
                "targetRole": updated_employee.role,
                "summary": f"Updated {updated_employee.name}: {diff_summary}",
                "details": f"Modified employee record ID: {employee_id}"
            }
        )
        return updated_employee
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating employee: {str(e)}"
        )

@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee"""
    try:
        # Get employee info before deletion for logging
        employee = employee_crud.get_employee(db, employee_id)
        
        success = employee_crud.delete_employee(db, employee_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found"
            )
            
        # Audit Logging
        if employee:
            log_activity(
                db=db,
                user_id=current_user.get("employee_id") or current_user.get("id"),
                action="DELETE EMPLOYEE",
                module="Employees",
                entity_id=str(employee_id),
                details={
                    "targetRole": employee.role,
                    "summary": f"Terminated/Deleted employee: {employee.name}",
                    "details": f"Removed employee record ID: {employee_id}"
                }
            )
        return None
    except Exception as e:
        # Handle foreign key constraint violation
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete employee because it is being referenced by other records. Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting employee: {error_msg}"
            )

@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_employees(
    employee_ids: List[int], 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Bulk delete employees"""
    try:
        success = employee_crud.bulk_delete_employees(db, employee_ids)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more employees not found"
            )
        return None
    except Exception as e:
        # Handle foreign key constraint violation
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some employees cannot be deleted because they are referenced by other records. Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error bulk deleting employees: {error_msg}"
            )

# ============================================================================
# CUSTOM COLUMN ENDPOINTS
# ============================================================================

@router.get("/columns/all", response_model=List[EmployeeColumnOut])
def get_all_columns(db: Session = Depends(get_db)):
    """Get all custom column definitions"""
    columns = column_crud.get_columns(db)
    return columns

@router.post("/columns/create", response_model=EmployeeColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(column: EmployeeColumnCreate, db: Session = Depends(get_db)):
    """Create a new custom column"""
    # Check if column name already exists
    existing_column = column_crud.get_column_by_name(db, column.column_name)
    if existing_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Column with name '{column.column_name}' already exists"
        )
    
    try:
        new_column = column_crud.create_column(db, column)
        return new_column
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating column: {str(e)}"
        )

@router.put("/columns/{column_id}", response_model=EmployeeColumnOut)
def update_column(
    column_id: int,
    column: EmployeeColumnUpdate,
    db: Session = Depends(get_db)
):
    """Update a custom column"""
    try:
        updated_column = column_crud.update_column(db, column_id, column)
        if not updated_column:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Column with id {column_id} not found"
            )
        return updated_column
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating column: {str(e)}"
        )

@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: int, db: Session = Depends(get_db)):
    """Delete a custom column"""
    success = column_crud.delete_column(db, column_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Column with id {column_id} not found"
        )
    return None
