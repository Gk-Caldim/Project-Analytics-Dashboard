from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Dict
from pydantic import BaseModel

from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.project_column import ProjectColumnCreate, ProjectColumnUpdate, ProjectColumnOut
from app.crud import project as crud_project
from app.crud import project_column as column_crud
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.audit import log_activity, generate_diff_summary

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

def check_project_permission(db_project, current_user, permission_type: str):
    """
    Check if the current user has permission for the project.
    Permissions are checked in:
    1. Global user role (Admin has all)
    2. Project's manager list
    3. Project's team_lead list
    """
    # 1. Global Admin Check
    if current_user.get("role") in ["Admin", "Super Admin", "Project Manager", "Finance", "Head"]:
        return True
    
    employee_id = current_user.get("employee_id")
    if not employee_id:
        return False
        
    # 2. Check EmployeeProjectMap
    if hasattr(db_project, "allocations") and db_project.allocations:
        for alloc in db_project.allocations:
            if str(alloc.employee_id) == str(employee_id):
                return True
                
    return False

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all projects, filtered by user permissions"""
    projects = crud_project.get_projects(db)
    
    # 1. Admin returns all
    if current_user.get("role") in ["Admin", "Super Admin", "Project Manager", "Finance", "Head"]:
        return projects
        
    # 2. Others filter by "view" permission
    return [p for p in projects if check_project_permission(p, current_user, "view")]

@router.post("/", response_model=ProjectResponse)
def add_project(
    project: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add a new project - Restricted to Admins"""
    if current_user.get("role") not in ["Admin", "Super Admin", "Project Manager", "Finance", "Head"]:
        raise HTTPException(status_code=403, detail="Only Admins can create projects")
    db_project = crud_project.create_project(db, project)
    
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="CREATE PROJECT",
        module="Project Master",
        entity_id=str(db_project.project_id),
        details={
            "targetRole": "Project",
            "summary": f"Created new project: {db_project.name}",
            "details": f"Initialized project with ID: {db_project.project_id}"
        }
    )
    db.commit()
    
    return db_project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a single project with permission check"""
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_project_permission(db_project, current_user, "view"):
        raise HTTPException(status_code=403, detail="You do not have permission to view this project")
        
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int, 
    project: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_permission(db_project, current_user, "edit"):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this project")
        
    # Generate diff before update
    diff_summary = generate_diff_summary(db_project, project)
    
    updated_project = crud_project.update_project(db, project_id, project)
    
    # Audit Log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="UPDATE PROJECT",
        module="Project Master",
        entity_id=str(updated_project.project_id),
        details={
            "targetRole": "Project",
            "summary": f"Updated {updated_project.name}: {diff_summary}",
            "details": f"Modified project ID: {updated_project.project_id} | Name: {updated_project.name}"
        }
    )
    db.commit()
    
    return updated_project

@router.delete("/{project_id}")
def delete_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    db_project = crud_project.get_project(db, project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_permission(db_project, current_user, "delete"):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this project")

    try:
        project_id_str = db_project.project_id
        success = crud_project.delete_project(db, project_id)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
            
        # Audit Log
        log_activity(
            db=db,
            user_id=current_user.get("employee_id") or "System",
            action="DELETE PROJECT",
            module="Project Master",
            entity_id=str(project_id_str),
            details={
                "targetRole": "Project",
                "summary": f"Deleted project: {db_project.name}",
                "details": f"Removed project record ID: {project_id_str}"
            }
        )
        db.commit()
        
        return {"message": "Project deleted successfully"}
    except Exception as e:
        # Handle foreign key constraint violation specifically
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project because it is being referenced by other records (like Trackers). Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting project: {error_msg}"
            )

@router.post("/bulk-delete")
def bulk_delete_projects(
    project_ids: List[int], 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Check permissions for all projects first
    for pid in project_ids:
        db_project = crud_project.get_project(db, pid)
        if db_project and not check_project_permission(db_project, current_user, "delete"):
            raise HTTPException(
                status_code=403, 
                detail=f"You do not have permission to delete project with ID {pid}"
            )

    try:
        success = crud_project.bulk_delete_projects(db, project_ids)
        if not success:
            raise HTTPException(status_code=404, detail="One or more projects not found")
        return {"message": f"{len(project_ids)} projects deleted successfully"}
    except Exception as e:
        # Handle foreign key constraint violation
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower() or "violates foreign key constraint" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some projects cannot be deleted because they are referenced by other records (like Trackers). Please delete those records first."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error bulk deleting projects: {error_msg}"
            )

# ============================================================================
# CUSTOM COLUMN ENDPOINTS
# ============================================================================

@router.get("/columns/all", response_model=List[ProjectColumnOut])
def get_all_columns(db: Session = Depends(get_db)):
    """Get all custom column definitions"""
    columns = column_crud.get_columns(db)
    return columns

@router.post("/columns/create", response_model=ProjectColumnOut, status_code=status.HTTP_201_CREATED)
def create_column(column: ProjectColumnCreate, db: Session = Depends(get_db)):
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

@router.put("/columns/{column_id}", response_model=ProjectColumnOut)
def update_column(
    column_id: int,
    column: ProjectColumnUpdate,
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


class DashboardConfigUpdate(BaseModel):
    dashboard_config: Dict[str, Any]

@router.patch("/{project_id}/config")
def update_dashboard_config(
    project_id: int,
    config_update: DashboardConfigUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Updates only the dashboard configuration JSON for a project"""
    db_project = crud_project.get_project(db, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if not check_project_permission(db_project, current_user, "edit"):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this project")
        
    # The frontend sends { "dashboard_config": { ... } }
    db_project.dashboard_config = config_update.dashboard_config
    db.commit()
    db.refresh(db_project)
    return {"message": "Dashboard configuration updated", "config": db_project.dashboard_config}

# ---------------------------------------------------------------------------
# GET /projects/{project_id}/structure
# Real hierarchy: Project → Modules → milestone count
# Modules come ONLY from DB — never hardcoded.
# ---------------------------------------------------------------------------
@router.get("/{project_id}/structure")
def get_project_structure(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the project structure with all modules and their milestone counts.
    Modules are derived exclusively from the trackers_data table — no hardcoding.

    Response:
    {
        "project_id": 1,
        "project_name": "...",
        "dashboard_config": {...},
        "modules": [{ "module_name": "...", "milestones_count": N }],
        "uploads": [...]
    }
    """
    from sqlalchemy import func as sqlfunc
    from app.models.upload import Upload
    from app.models.tracker import TrackerData

    project = db.query(crud_project.Project).filter(crud_project.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Flat distinct modules for this project (deduped across all uploads)
    flat_modules_rows = (
        db.query(TrackerData.module, sqlfunc.count(TrackerData.id).label("cnt"))
        .filter(
            TrackerData.project_id == project_id,
            TrackerData.module != None,
            TrackerData.module != "",
        )
        .group_by(TrackerData.module)
        .order_by(TrackerData.module)
        .all()
    )
    flat_modules = [
        {"module_name": r.module, "milestones_count": r.cnt}
        for r in flat_modules_rows
        if r.module
    ]

    uploads = (
        db.query(Upload)
        .filter(Upload.project_id == project_id)
        .order_by(Upload.uploaded_at.desc())
        .all()
    )

    uploads_out = []
    for u in uploads:
        # Group milestones by module for this specific upload
        rows = (
            db.query(TrackerData.module, sqlfunc.count(TrackerData.id).label("cnt"))
            .filter(
                TrackerData.upload_id == u.id,
                TrackerData.module != None,
                TrackerData.module != "",
            )
            .group_by(TrackerData.module)
            .all()
        )
        upload_modules = [
            {"module_name": r.module, "milestones_count": r.cnt}
            for r in rows
            if r.module
        ]

        uploads_out.append({
            "upload_id":         u.id,
            "file_name":         u.file_name,
            "uploaded_at":       u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
            "status":            u.status,
            "row_count":         u.row_count,
            "valid_row_count":   u.valid_row_count,
            "invalid_row_count": u.invalid_row_count,
            "modules":           upload_modules,
        })

    return {
        "project_id":   project_id,
        "project_name": project.name,
        "dashboard_config": project.dashboard_config,
        "modules":      flat_modules,   # ← flat list — sidebar uses this
        "uploads":      uploads_out,
    }


@router.get("/all/structures")
def get_all_project_structures(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns structure for ALL projects that have tracker data.
    Each project entry contains a flat deduplicated module list
    (across all uploads) so the sidebar can render without any hardcoding.
    """
    from sqlalchemy import func as sqlfunc
    from app.models.upload import Upload
    from app.models.tracker import TrackerData

    projects = db.query(crud_project.Project).all()
    all_uploads = db.query(Upload).all()

    # Build per-upload module map
    all_rows = (
        db.query(TrackerData.upload_id, TrackerData.module, sqlfunc.count(TrackerData.id).label("cnt"))
        .filter(
            TrackerData.module != None,
            TrackerData.module != "",
        )
        .group_by(TrackerData.upload_id, TrackerData.module)
        .all()
    )

    upload_modules: dict = {}
    for r in all_rows:
        if r.upload_id not in upload_modules:
            upload_modules[r.upload_id] = []
        if r.module:
            upload_modules[r.upload_id].append({"module_name": r.module, "milestones_count": r.cnt})

    # Build flat project → modules map (deduplicated across all uploads)
    flat_rows = (
        db.query(TrackerData.project_id, TrackerData.module, sqlfunc.count(TrackerData.id).label("cnt"))
        .filter(
            TrackerData.project_id != None,
            TrackerData.module != None,
            TrackerData.module != "",
        )
        .group_by(TrackerData.project_id, TrackerData.module)
        .order_by(TrackerData.module)
        .all()
    )

    project_flat_modules: dict = {}
    for r in flat_rows:
        if r.project_id not in project_flat_modules:
            project_flat_modules[r.project_id] = []
        if r.module:
            project_flat_modules[r.project_id].append(
                {"module_name": r.module, "milestones_count": r.cnt}
            )

    result = []
    for p in projects:
        proj_uploads = [u for u in all_uploads if u.project_id == p.id]
        flat_mods = project_flat_modules.get(p.id, [])

        # Only include projects that actually have tracker data
        if not proj_uploads and not flat_mods:
            continue

        uploads_out = []
        for u in proj_uploads:
            uploads_out.append({
                "upload_id":         u.id,
                "file_name":         u.file_name,
                "uploaded_at":       u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
                "status":            u.status,
                "row_count":         u.row_count,
                "valid_row_count":   u.valid_row_count,
                "invalid_row_count": u.invalid_row_count,
                "modules":           upload_modules.get(u.id, []),
            })

        result.append({
            "project_id":   p.id,
            "project_name": p.name,
            "dashboard_config": p.dashboard_config,
            "modules":      flat_mods,      # ← flat deduplicated module list
            "uploads":      uploads_out,
        })

    return result
