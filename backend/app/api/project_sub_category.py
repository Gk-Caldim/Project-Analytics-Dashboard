from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.project_sub_category import SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
from app.crud import project_sub_category as crud
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.audit import log_activity

router = APIRouter(
    prefix="/project-sub-categories",
    tags=["Project Sub Categories"]
)

@router.get("/{project_id}", response_model=List[SubCategoryResponse])
def list_sub_categories(project_id: str, db: Session = Depends(get_db)):
    """List all sub-categories for a given project_id (string)"""
    return crud.get_sub_categories_by_project(db, project_id)

@router.post("/", response_model=SubCategoryResponse)
def add_sub_category(
    sub_category: SubCategoryCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new sub-category"""
    db_sub = crud.create_sub_category(db, sub_category)
    
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="CREATE SUB CATEGORY",
        module="Sub Category",
        entity_id=str(db_sub.project_id),
        details={
            "targetRole": "Budget",
            "summary": f"Added sub-category: {db_sub.sub_category}",
            "details": f"Project ID: {db_sub.project_id} | Est. Value: {db_sub.estimated_value}"
        }
    )
    db.commit()
    
    return db_sub

@router.put("/{sub_category_id}", response_model=SubCategoryResponse)
def update_sub_category(
    sub_category_id: int, 
    sub_category: SubCategoryUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a sub-category"""
    db_sub = crud.update_sub_category(db, sub_category_id, sub_category)
    if db_sub is None:
        raise HTTPException(status_code=404, detail="Sub-category not found")
        
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="UPDATE SUB CATEGORY",
        module="Sub Category",
        entity_id=str(db_sub.project_id),
        details={
            "targetRole": "Budget",
            "summary": f"Updated sub-category: {db_sub.sub_category}",
            "details": f"Project ID: {db_sub.project_id} | Utilized Value: {db_sub.utilized_value}"
        }
    )
    db.commit()
    
    return db_sub

@router.delete("/{sub_category_id}")
def delete_sub_category(
    sub_category_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a sub-category"""
    db_sub = db.query(crud.ProjectSubCategory).filter(crud.ProjectSubCategory.id == sub_category_id).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Sub-category not found")
        
    project_id = db_sub.project_id
    sub_cat_name = db_sub.sub_category

    success = crud.delete_sub_category(db, sub_category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sub-category not found")
        
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="DELETE SUB CATEGORY",
        module="Sub Category",
        entity_id=str(project_id),
        details={
            "targetRole": "Budget",
            "summary": f"Deleted sub-category: {sub_cat_name}",
            "details": f"Removed from project ID: {project_id}"
        }
    )
    db.commit()
        
    return {"message": "Sub-category deleted successfully"}
