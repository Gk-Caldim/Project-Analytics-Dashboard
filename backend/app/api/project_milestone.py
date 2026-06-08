from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
from app.models.project_milestone import (
    ProjectMilestone, ProjectDependency, ProjectBaseline,
    ProjectTaskFollowup, ProjectRelease, ProjectMilestoneColumn,
    MilestoneAssignment
)
from app.schemas.project_milestone import (
    MilestoneResponse, MilestoneCreate, DependencyBase, DependencyResponse,
    MilestoneColumnResponse, MilestoneColumnCreate, ReleaseResponse, ReleaseCreate,
    FollowupResponse, FollowupCreate, BaselineResponse, BulkSaveMilestonesRequest
)
from app.services.project_milestone_service import recalculate_project_schedule
from app.utils.audit import log_activity

router = APIRouter(
    prefix="/projects",
    tags=["Project Milestones"]
)

@router.get("/{project_id}/milestones", response_model=List[MilestoneResponse])
def get_project_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve all milestones/tasks for a project, sorted by row_order."""
    tasks = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).order_by(ProjectMilestone.row_order.asc()).all()
    return tasks

@router.post("/{project_id}/milestones/recalculate", response_model=List[MilestoneResponse])
def recalculate_schedule(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Trigger manual recalculation of WBS numbers, rollups, and critical path."""
    tasks = recalculate_project_schedule(db, project_id)
    return tasks

@router.post("/{project_id}/milestones/bulk-save", response_model=List[MilestoneResponse])
def bulk_save_milestones(
    project_id: str,
    req: BulkSaveMilestonesRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Saves milestones and dependencies in bulk.
    Handles inserting new tasks (which have negative temp IDs), updating existing tasks,
    and mapping temporary IDs in dependencies to real database IDs.
    """
    incoming_milestones = req.milestones
    incoming_dependencies = req.dependencies

    # 1. Fetch existing tasks
    existing_tasks = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).all()
    existing_tasks_dict = {t.id: t for t in existing_tasks}

    # Track incoming IDs to detect deletions
    incoming_real_ids = {m.id for m in incoming_milestones if m.id and m.id > 0}

    # --- Application-level Parent Deletion Validation ---
    deleted_ids = {ext_task.id for ext_task in existing_tasks if ext_task.id not in incoming_real_ids}
    
    # Verify no deleted task has children in the database
    for ext_task in existing_tasks:
        if ext_task.id in deleted_ids:
            # Check if this task has children in the DB
            has_children = any(t.parent_id == ext_task.id for t in existing_tasks)
            if has_children:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete task '{ext_task.activity_name}' because it has child tasks. Please remove or reassign child tasks first."
                )

    # Delete milestones not in the incoming list
    for ext_task in existing_tasks:
        if ext_task.id not in incoming_real_ids:
            db.delete(ext_task)

    id_map = {}  # Map of client-side ID -> real database ID

    # 2. Add/Update milestones (Pass 1 - save attributes without parent_id to avoid FK constraint errors)
    for m in incoming_milestones:
        if m.id and m.id > 0:
            # Update existing
            db_task = existing_tasks_dict.get(m.id)
            if db_task:
                db_task.activity_name = m.activity_name
                db_task.item_type = m.item_type
                db_task.task_type = m.task_type
                db_task.row_order = m.row_order
                db_task.indent_level = m.indent_level
                db_task.department = m.department
                db_task.start_date = m.start_date
                db_task.end_date = m.end_date
                db_task.actual_start = m.actual_start
                db_task.actual_end = m.actual_end
                db_task.complete_percent = m.complete_percent
                db_task.status = m.status
                db_task.custom_values = m.custom_values
                
                # Rebuild assignments
                db_task.assignments = [
                    MilestoneAssignment(task_id=db_task.id, employee_id=emp_id)
                    for emp_id in m.assigned_to
                ]
                
                id_map[m.id] = db_task.id
        else:
            # Insert new
            new_task = ProjectMilestone(
                project_id=project_id,
                activity_name=m.activity_name,
                item_type=m.item_type,
                task_type=m.task_type,
                row_order=m.row_order,
                indent_level=m.indent_level,
                department=m.department,
                start_date=m.start_date,
                end_date=m.end_date,
                actual_start=m.actual_start,
                actual_end=m.actual_end,
                complete_percent=m.complete_percent,
                status=m.status,
                custom_values=m.custom_values
            )
            db.add(new_task)
            db.flush()  # Flush to generate real ID
            
            # Save assignments
            new_task.assignments = [
                MilestoneAssignment(task_id=new_task.id, employee_id=emp_id)
                for emp_id in m.assigned_to
            ]
            
            id_map[m.id] = new_task.id  # Map negative temp ID to generated DB ID

    # Pass 2: Resolve parent_id references
    db.flush()
    for m in incoming_milestones:
        db_id = id_map.get(m.id)
        if db_id:
            db_task = db.query(ProjectMilestone).get(db_id)
            if db_task:
                if m.parent_id:
                    db_task.parent_id = id_map.get(m.parent_id, m.parent_id)
                else:
                    db_task.parent_id = None

    # 3. Save dependencies
    # First, delete all old dependencies for this project
    db.query(ProjectDependency).filter(ProjectDependency.project_id == project_id).delete()

    for dep in incoming_dependencies:
        pred_db_id = id_map.get(dep.predecessor_task_id)
        succ_db_id = id_map.get(dep.successor_task_id)

        if pred_db_id and succ_db_id:
            new_dep = ProjectDependency(
                project_id=project_id,
                predecessor_task_id=pred_db_id,
                successor_task_id=succ_db_id,
                type=dep.type,
                lag_days=dep.lag_days
            )
            db.add(new_dep)

    db.commit()

    # 4. Trigger WBS numbering, scheduling engine, and rollup
    tasks = recalculate_project_schedule(db, project_id)

    # Audit log
    log_activity(
        db=db,
        user_id=current_user.get("employee_id") or "System",
        action="BULK SAVE MILESTONES",
        module="Project Master",
        entity_id=str(project_id),
        details={"summary": f"Saved WBS nodes for project: {project_id}"}
    )
    db.commit()

    return tasks

# ============================================================================
# BASELINE ENDPOINTS
# ============================================================================

class CreateBaselineRequest(BaseModel):
    version_name: str

@router.post("/{project_id}/baselines/create", response_model=List[BaselineResponse])
def create_project_baseline(
    project_id: str,
    req: CreateBaselineRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Snapshots the active start and end dates of all milestones into a new baseline."""
    tasks = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).all()
    if not tasks:
        raise HTTPException(status_code=404, detail="No milestones found to baseline.")

    # Remove any existing baseline records of the same version name
    task_ids = [t.id for t in tasks]
    db.query(ProjectBaseline).filter(ProjectBaseline.task_id.in_(task_ids), ProjectBaseline.baseline_version == req.version_name).delete(synchronize_session=False)

    baseline_records = []
    for t in tasks:
        if t.start_date and t.end_date:
            b = ProjectBaseline(
                task_id=t.id,
                baseline_version=req.version_name,
                baseline_start=t.start_date,
                baseline_end=t.end_date
            )
            db.add(b)
            baseline_records.append(b)

    db.commit()
    return [
        BaselineResponse(
            id=b.id,
            task_id=b.task_id,
            baseline_version=b.baseline_version,
            baseline_start=b.baseline_start,
            baseline_end=b.baseline_end
        )
        for b in baseline_records
    ]

# ============================================================================
# RELEASE TRACKING ENDPOINTS
# ============================================================================

@router.get("/{project_id}/releases", response_model=List[ReleaseResponse])
def get_project_releases(project_id: str, db: Session = Depends(get_db)):
    """Fetch releases for a project."""
    return db.query(ProjectRelease).filter(ProjectRelease.project_id == project_id).all()

@router.post("/{project_id}/releases", response_model=ReleaseResponse)
def create_project_release(project_id: str, release: ReleaseCreate, db: Session = Depends(get_db)):
    """Create a new release for a project."""
    new_release = ProjectRelease(
        project_id=project_id,
        name=release.name,
        version=release.version,
        status=release.status,
        release_date=release.release_date
    )
    db.add(new_release)
    db.commit()
    db.refresh(new_release)
    return new_release

@router.delete("/{project_id}/releases/{release_id}")
def delete_project_release(project_id: str, release_id: int, db: Session = Depends(get_db)):
    """Delete a release."""
    db.query(ProjectRelease).filter(ProjectRelease.project_id == project_id, ProjectRelease.id == release_id).delete()
    db.commit()
    return {"message": "Release deleted successfully"}

# ============================================================================
# DYNAMIC COLUMNS ENDPOINTS
# ============================================================================

@router.get("/{project_id}/milestones/columns", response_model=List[MilestoneColumnResponse])
def get_milestone_columns(project_id: str, db: Session = Depends(get_db)):
    """Fetch all custom column definitions for project milestones."""
    return db.query(ProjectMilestoneColumn).filter(ProjectMilestoneColumn.project_id == project_id).all()

@router.post("/{project_id}/milestones/columns", response_model=MilestoneColumnResponse)
def create_milestone_column(project_id: str, col: MilestoneColumnCreate, db: Session = Depends(get_db)):
    """Create a custom column definition for project milestones."""
    # Check duplicate
    existing = db.query(ProjectMilestoneColumn).filter(
        ProjectMilestoneColumn.project_id == project_id,
        ProjectMilestoneColumn.column_name == col.column_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Column already exists.")

    new_col = ProjectMilestoneColumn(
        project_id=project_id,
        column_name=col.column_name,
        column_label=col.column_label,
        data_type=col.data_type,
        options=col.options
    )
    db.add(new_col)
    db.commit()
    db.refresh(new_col)
    return new_col

@router.delete("/{project_id}/milestones/columns/{column_id}")
def delete_milestone_column(project_id: str, column_id: int, db: Session = Depends(get_db)):
    """Delete a custom column definition."""
    db.query(ProjectMilestoneColumn).filter(
        ProjectMilestoneColumn.project_id == project_id,
        ProjectMilestoneColumn.id == column_id
    ).delete()
    db.commit()
    return {"message": "Column definition deleted"}
