from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate

def get_projects(db: Session):
    return db.query(Project).all()

from app.utils.validators import validate_custom_fields

def create_project(db: Session, project: ProjectCreate):
    # Validate custom fields
    validation_errors = validate_custom_fields(db, 'project', project.custom_fields)
    if validation_errors:
        raise ValueError("; ".join(validation_errors))

    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project_by_name(db: Session, name: str):
    return db.query(Project).filter(Project.name == name).first()

def get_project(db: Session, project_id: int):
    return db.query(Project).filter(Project.id == project_id).first()

def update_project(db: Session, project_id: int, project_data: ProjectCreate):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if db_project:
        update_data = project_data.model_dump()
        
        # Validate custom fields if they are being updated
        if "custom_fields" in update_data:
            validation_errors = validate_custom_fields(db, 'project', update_data["custom_fields"])
            if validation_errors:
                raise ValueError("; ".join(validation_errors))

        for key, value in update_data.items():
            setattr(db_project, key, value)
        db.commit()
        db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    try:
        db_project = db.query(Project).filter(Project.id == project_id).first()
        if db_project:
            db.delete(db_project)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        # Add detailed error information
        error_msg = f"Error deleting project {project_id}: {str(e)} - {type(e).__name__}"
        print(error_msg)  # This will appear in backend logs
        raise Exception(error_msg) from e

def bulk_delete_projects(db: Session, project_ids: list[int]):
    try:
        db.query(Project).filter(Project.id.in_(project_ids)).delete(synchronize_session=False)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        error_msg = f"Error bulk deleting projects {project_ids}: {str(e)} - {type(e).__name__}"
        print(error_msg)
        raise Exception(error_msg) from e
