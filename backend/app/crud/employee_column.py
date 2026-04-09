# app/crud/employee_column.py
from sqlalchemy.orm import Session
from app.models.employee_column import EmployeeColumn
from app.schemas.employee_column import EmployeeColumnCreate, EmployeeColumnUpdate
from typing import List, Optional

def get_columns(db: Session) -> List[EmployeeColumn]:
    """Get all custom column definitions"""
    return db.query(EmployeeColumn).order_by(EmployeeColumn.id).all()

def get_column(db: Session, column_id: int) -> Optional[EmployeeColumn]:
    """Get a single column by ID"""
    return db.query(EmployeeColumn).filter(EmployeeColumn.id == column_id).first()

def get_column_by_name(db: Session, column_name: str) -> Optional[EmployeeColumn]:
    """Get column by name"""
    return db.query(EmployeeColumn).filter(EmployeeColumn.column_name == column_name).first()

def create_column(db: Session, column: EmployeeColumnCreate) -> EmployeeColumn:
    """Create a new custom column"""
    db_column = EmployeeColumn(**column.model_dump())
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column

def update_column(db: Session, column_id: int, column: EmployeeColumnUpdate) -> Optional[EmployeeColumn]:
    """Update a custom column"""
    db_column = get_column(db, column_id)
    if not db_column:
        return None
    
    update_data = column.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_column, field, value)
    
    db.commit()
    db.refresh(db_column)
    return db_column

def delete_column(db: Session, column_id: int) -> bool:
    """Delete a custom column"""
    db_column = get_column(db, column_id)
    if not db_column:
        return False
    
    db.delete(db_column)
    db.commit()
    return True
