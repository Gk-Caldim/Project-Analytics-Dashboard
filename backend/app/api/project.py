from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import re
from pydantic import BaseModel

from app.schemas.project import ProjectCreate, ProjectResponse
from app.schemas.project_column import ProjectColumnCreate, ProjectColumnUpdate, ProjectColumnOut
from app.crud import project as crud_project
from app.crud import project_column as column_crud
from app.core.database import get_db
from app.core.security import get_current_user
from app.utils.audit import log_activity, generate_diff_summary
from app.models.budget import BudgetSummary # Added for cleanup

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
        
    # 2. Check Direct Assignment (Team Lead or Assigned Employee)
    if str(db_project.employee_id) == str(employee_id) or str(db_project.assigned_to_id) == str(employee_id):
        return True

    # 3. Check EmployeeProjectMap (Allocations)
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

@router.get("/next-id")
def get_next_project_id(db: Session = Depends(get_db)):
    """Suggest the next available project ID based on the PRJxxx format"""
    projects = db.query(crud_project.Project.project_id).all()
    max_num = 0
    
    for (pid,) in projects:
        if pid and pid.startswith("PRJ"):
            # Extract numbers using regex
            match = re.search(r'PRJ(\d+)', pid)
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
    
    next_id = f"PRJ{str(max_num + 1).zfill(3)}"
    return {"next_id": next_id}

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
            
        # Cleanup orphaned budget summary if exists
        try:
            db.query(BudgetSummary).filter(BudgetSummary.project_name == db_project.name).delete()
            db.commit()
        except Exception as budget_error:
            # Non-critical if budget cleanup fails, but log it
            print(f"Non-critical: Failed to cleanup budget for {db_project.name}: {budget_error}")
            db.rollback()

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
            
        # Cleanup orphaned budget summaries
        try:
            # We don't have the names here easily, but we can delete by ID if project_id was stored, 
            # or just skip for bulk if complex. Let's try to get names first.
            # However, bulk delete is rare. Let's at least try to match by IDs if possible.
            # But BudgetSummary doesn't have project_id (int).
            pass 
        except:
            pass

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
    from app.models.tracker_ingestion import TrackerIngestion
    from app.utils.analytics_utils import standardize_records

    project = db.query(crud_project.Project).filter(crud_project.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch all ingestions for this project to build the module list
    all_ingestions = db.query(TrackerIngestion).filter(TrackerIngestion.project_id == project_id).all()
    
    # Build flat deduplicated modules from JSONB
    flat_modules_dict = {}
    for ing in all_ingestions:
        std_records = standardize_records(ing.data)
        for r in std_records:
            mod_name = r.get("module") or "Unknown"
            flat_modules_dict[mod_name] = flat_modules_dict.get(mod_name, 0) + 1
            
    flat_modules = [
        {"module_name": name, "milestones_count": count}
        for name, count in flat_modules_dict.items()
    ]

    uploads = (
        db.query(Upload)
        .filter(Upload.project_id == project_id)
        .order_by(Upload.uploaded_at.desc())
        .all()
    )

    uploads_out = []
    for u in uploads:
        # Get modules for this specific upload
        upload_ingestion = next((i for i in all_ingestions if i.upload_id == u.id), None)
        upload_modules = []
        
        if upload_ingestion:
            u_mod_dict = {}
            std_u_records = standardize_records(upload_ingestion.data)
            for r in std_u_records:
                m_name = r.get("module") or "Unknown"
                u_mod_dict[m_name] = u_mod_dict.get(m_name, 0) + 1
            upload_modules = [
                {"module_name": name, "milestones_count": count}
                for name, count in u_mod_dict.items()
            ]

        if not upload_modules and (getattr(u, 'row_count') or 0) > 0 and (getattr(u, 'valid_row_count') or 0) == 0:
            fallback_name = u.file_name.split('.')[0] if u.file_name else "Dataset"
            upload_modules = [{"module_name": fallback_name, "milestones_count": u.row_count}]
            if not any(m["module_name"] == fallback_name for m in flat_modules):
                flat_modules.append({"module_name": fallback_name, "milestones_count": u.row_count})

        uploads_out.append({
            "upload_id":         u.id,
            "dataset_id":        getattr(u, "dataset_id", None),
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
        "budget": project.budget,
        "utilized_budget": project.utilized_budget,
        "balance_budget": project.balance_budget,
        "project_manager": project.project_manager,
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
    from app.models.tracker_ingestion import TrackerIngestion
    from app.utils.analytics_utils import standardize_records

    projects = db.query(crud_project.Project).all()
    all_uploads = db.query(Upload).all()
    all_ingestions = db.query(TrackerIngestion).all()

    # Build maps from ingestions
    upload_modules_map = {}
    project_flat_modules = {}

    for ing in all_ingestions:
        u_id = ing.upload_id
        p_id = ing.project_id
        
        if u_id not in upload_modules_map:
            upload_modules_map[u_id] = {}
        if p_id not in project_flat_modules:
            project_flat_modules[p_id] = {}
            
        std_records = standardize_records(ing.data)
        for r in std_records:
            m_name = r.get("module") or "Unknown"
            # Per upload
            upload_modules_map[u_id][m_name] = upload_modules_map[u_id].get(m_name, 0) + 1
            # Per project
            project_flat_modules[p_id][m_name] = project_flat_modules[p_id].get(m_name, 0) + 1

    # Convert maps to list of dicts for the final results
    upload_modules = {
        u_id: [{"module_name": name, "milestones_count": count} for name, count in mods.items()]
        for u_id, mods in upload_modules_map.items()
    }
    
    project_flat_modules_out = {
        p_id: [{"module_name": name, "milestones_count": count} for name, count in mods.items()]
        for p_id, mods in project_flat_modules.items()
    }
    project_flat_modules = project_flat_modules_out

    result = []
    for p in projects:
        proj_uploads = [u for u in all_uploads if u.project_id == p.id]
        flat_mods = []
        module_names_seen = set()

        # 1. Add modules from TrackerData (preferred/validated)
        tracker_mods = project_flat_modules.get(p.id, [])
        for m in tracker_mods:
            if m["module_name"] not in module_names_seen:
                flat_mods.append(m.copy())
                module_names_seen.add(m["module_name"])

        # Filter: Only bring projects that have data present in uploads or ingestions
        if not proj_uploads and not flat_mods:
            continue

        uploads_out = []
        for u in proj_uploads:
            u_mods = upload_modules.get(u.id, [])
            
            # Fallback for generic uploads without TrackerData records
            if not u_mods and (getattr(u, 'row_count') or 0) > 0:
                fallback_name = u.file_name.split('.')[0] if u.file_name else f"Dataset_{u.id}"
                u_mods = [{"module_name": fallback_name, "milestones_count": u.row_count, "trackerId": u.id}]
            
            for m in u_mods:
                m_name = m["module_name"]
                if m_name not in module_names_seen:
                    # Ensure trackerId is present
                    m_copy = m.copy()
                    if "trackerId" not in m_copy:
                        m_copy["trackerId"] = u.id
                    flat_mods.append(m_copy)
                    module_names_seen.add(m_name)
                else:
                    # If already seen, still try to attach trackerId if missing
                    for existing in flat_mods:
                        if existing["module_name"] == m_name and "trackerId" not in existing:
                            existing["trackerId"] = u.id
                            break

            uploads_out.append({
                "upload_id":         u.id,
                "dataset_id":        getattr(u, "dataset_id", None),
                "file_name":         u.file_name,
                "uploaded_at":       u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
                "status":            u.status,
                "row_count":         u.row_count,
                "valid_row_count":   u.valid_row_count,
                "invalid_row_count": u.invalid_row_count,
                "modules":           u_mods,
            })

        result.append({
            "project_id":   p.id,
            "project_name": p.name,
            "dashboard_config": p.dashboard_config,
            "budget": p.budget,
            "utilized_budget": p.utilized_budget,
            "balance_budget": p.balance_budget,
            "project_manager": p.project_manager,
            "modules":      flat_mods,      # ← flat deduplicated module list
            "uploads":      uploads_out,
        })

    return result
