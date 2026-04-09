from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project_sub_category import ProjectSubCategory
from app.models.project import Project
from app.schemas.project_sub_category import SubCategoryCreate, SubCategoryUpdate

def sync_project_budget(db: Session, project_id: str):
    """
    Recalculate project and department totals based on sub-categories.
    """
    # 1. Fetch project details
    db_project = db.query(Project).filter(Project.project_id == project_id).first()
    if not db_project:
        return

    # 2. Sum up all utilized_value for this project (Global)
    total_utilized = db.query(func.sum(ProjectSubCategory.utilized_value)).filter(
        ProjectSubCategory.project_id == project_id
    ).scalar() or 0.0
    
    # 3. Update the parent Project
    db_project.utilized_budget = total_utilized
    db_project.balance_budget = (db_project.budget or 0.0) - total_utilized

    db.commit()

def get_sub_categories_by_project(db: Session, project_id: str):
    return db.query(ProjectSubCategory).filter(ProjectSubCategory.project_id == project_id).all()

def create_sub_category(db: Session, sub_category: SubCategoryCreate):
    db_sub_category = ProjectSubCategory(**sub_category.dict())
    db.add(db_sub_category)
    db.commit()
    db.refresh(db_sub_category)
    
    # Sync project budget after creation
    sync_project_budget(db, db_sub_category.project_id)
    
    return db_sub_category

def update_sub_category(db: Session, sub_category_id: int, sub_category_data: SubCategoryUpdate):
    db_sub_category = db.query(ProjectSubCategory).filter(ProjectSubCategory.id == sub_category_id).first()
    if db_sub_category:
        update_dict = sub_category_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(db_sub_category, key, value)
        db.commit()
        db.refresh(db_sub_category)
        
        # Sync project budget after update
        sync_project_budget(db, db_sub_category.project_id)
        
    return db_sub_category

def delete_sub_category(db: Session, sub_category_id: int):
    try:
        db_sub_category = db.query(ProjectSubCategory).filter(ProjectSubCategory.id == sub_category_id).first()
        if db_sub_category:
            project_id = db_sub_category.project_id
            db.delete(db_sub_category)
            db.commit()
            
            # Sync project budget after deletion
            sync_project_budget(db, project_id)
            
            return True
        return False
    except Exception as e:
        db.rollback()
        raise Exception(f"Error deleting sub-category {sub_category_id}: {str(e)}") from e
