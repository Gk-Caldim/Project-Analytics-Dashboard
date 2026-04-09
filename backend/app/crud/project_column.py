# app/crud/project_column.py
from sqlalchemy.orm import Session
from app.models.project_column import ProjectColumn
from app.schemas.project_column import ProjectColumnCreate, ProjectColumnUpdate
from typing import List, Optional

def get_columns(db: Session) -> List[ProjectColumn]:
    """Get all custom column definitions"""
    return db.query(ProjectColumn).order_by(ProjectColumn.id).all()

def get_column(db: Session, column_id: int) -> Optional[ProjectColumn]:
    """Get a single column by ID"""
    return db.query(ProjectColumn).filter(ProjectColumn.id == column_id).first()

def get_column_by_name(db: Session, column_name: str) -> Optional[ProjectColumn]:
    """Get column by name"""
    return db.query(ProjectColumn).filter(ProjectColumn.column_name == column_name).first()

def create_column(db: Session, column: ProjectColumnCreate) -> ProjectColumn:
    """Create a new custom column"""
    db_column = ProjectColumn(**column.model_dump())
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column

def update_column(db: Session, column_id: int, column: ProjectColumnUpdate) -> Optional[ProjectColumn]:
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