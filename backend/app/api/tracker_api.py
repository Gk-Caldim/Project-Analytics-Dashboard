"""
tracker_api.py
Endpoints:
  POST /upload-tracker            — upload an Excel tracker file
  GET  /uploads                   — list all uploads (for UploadTrackers page)
  GET  /uploads/{project_id}      — list uploads for one project
  GET  /import-errors/{upload_id} — list failed rows for an upload
  GET  /trackers/{project_id}/modules — list distinct modules for a project (DB only)

Strict rules:
  - Upload REJECTED if project not found (no orphan rows with project_id=NULL)
  - Every Excel row must have Module and Milestone; invalid rows logged to import_errors
"""

import datetime
import logging
import re


from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request
from app.core.limiter import limiter

from sqlalchemy.orm import Session, defer
from sqlalchemy import func, or_
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.crud import project as crud_project
from app.models.import_error import ImportError as ImportErrorModel
from app.models.project import Project
from app.models.upload import Upload
from app.models.tracker_ingestion import TrackerIngestion

from app.services.tracker_service import process_tracker_upload
from app.utils.analytics_utils import standardize_records, compute_tracker_summary

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_project_id(db: Session, project_name: str | None) -> int | None:
    """
    Case-insensitive project name lookup.
    Returns project.id if found, None otherwise.
    NEVER silently swallows a lookup failure — callers must check the return value.
    """
    if not project_name or not project_name.strip():
        return None
    match = (
        db.query(Project)
        .filter(func.lower(Project.name) == project_name.strip().lower())
        .first()
    )
    if match:
        logger.info("[tracker_api] Resolved project %r → id=%s", project_name, match.id)
        return match.id
    logger.warning(
        "[tracker_api] Project not found in DB for name=%r — upload will be REJECTED",
        project_name,
    )
    return None


class ManualTrackerCreateRequest(BaseModel):
    project_id: int
    tracker_name: str
    status: Optional[str] = "Completed"


class TrackerIngestionUpdateRequest(BaseModel):
    schema: List[dict]
    rows: List[dict]
    status: Optional[str] = None


def validate_tracker_rows(schema: List[dict], rows: List[dict]) -> List[str]:
    errors = []
    
    def validate_phone(v):
        v_str = str(v).strip()
        return bool(re.match(r"^\+?\d{10,14}$", v_str))
        
    for r_idx, row in enumerate(rows):
        for col in schema:
            col_name = col.get("column_name")
            data_type = col.get("data_type", "text").lower()
            val = row.get(col_name)
            
            if val is None or val == "":
                continue
                
            if data_type == "integer":
                try:
                    int(val)
                except (ValueError, TypeError):
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be an integer (whole number)")
            elif data_type == "decimal" or data_type == "currency":
                try:
                    float(val)
                except (ValueError, TypeError):
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be a decimal (float)")
            elif data_type == "email":
                if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", str(val)):
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be a valid email address")
            elif data_type == "phone":
                if not validate_phone(val):
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be a valid phone number")
            elif data_type == "date":
                try:
                    datetime.date.fromisoformat(str(val).split("T")[0])
                except (ValueError, TypeError):
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be a valid ISO date (YYYY-MM-DD)")
            elif data_type == "boolean":
                if str(val).lower() not in ["true", "false", "1", "0", "yes", "no"]:
                    errors.append(f"Row {r_idx + 1}: '{col_name}' must be true or false")
                    
    return errors


@router.get("/trackers/manual")
def get_manual_trackers(
    db: Session = Depends(get_db)
):
    """List all manual trackers that are NOT drafts"""
    uploads = db.query(Upload).filter(
        Upload.industry == "MANUAL",
        Upload.status != "Draft"
    ).order_by(Upload.uploaded_at.desc()).all()
    
    projects = db.query(Project).all()
    proj_map = {p.id: p.name for p in projects}
    
    return [
        {
            "id": u.id,
            "upload_id": u.id,
            "project_name": proj_map.get(u.project_id, "-"),
            "project_id": u.project_id,
            "tracker_name": u.file_name,
            "department": u.department,
            "uploaded_by": u.uploaded_by,
            "uploaded_at": u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
            "status": u.status,
            "row_count": u.row_count or 0
        }
        for u in uploads
    ]


@router.get("/trackers/manual/drafts")
def get_draft_manual_trackers(
    db: Session = Depends(get_db)
):
    """List all manual trackers in draft status"""
    uploads = db.query(Upload).filter(
        Upload.industry == "MANUAL",
        Upload.status == "Draft"
    ).order_by(Upload.uploaded_at.desc()).all()
    
    projects = db.query(Project).all()
    proj_map = {p.id: p.name for p in projects}
    
    return [
        {
            "id": u.id,
            "upload_id": u.id,
            "project_name": proj_map.get(u.project_id, "-"),
            "project_id": u.project_id,
            "tracker_name": u.file_name,
            "department": u.department,
            "uploaded_by": u.uploaded_by,
            "uploaded_at": u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
            "status": u.status,
            "row_count": u.row_count or 0
        }
        for u in uploads
    ]


@router.post("/trackers/manual")
def create_manual_tracker(
    payload: ManualTrackerCreateRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    existing = db.query(Upload).filter(
        Upload.project_id == payload.project_id,
        Upload.file_name == payload.tracker_name
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Tracker with name '{payload.tracker_name}' already exists in this project."
        )
        
    new_upload = Upload(
        project_id=payload.project_id,
        file_name=payload.tracker_name,
        department=project.department or "Design Release",
        uploaded_by=project.project_manager or "System",
        status=payload.status or "Completed",
        row_count=0,
        valid_row_count=0,
        invalid_row_count=0,
        industry="MANUAL"
    )
    db.add(new_upload)
    db.flush()
    
    new_ingestion = TrackerIngestion(
        project_id=payload.project_id,
        upload_id=new_upload.id,
        file_name=payload.tracker_name,
        data={"schema": [], "rows": []},
        summary_data={"modules": {}},
        uploaded_by=project.project_manager or "System"
    )
    db.add(new_ingestion)
    
    # Audit Log
    from app.utils.audit import log_activity
    action = "CREATE DRAFT" if payload.status == "Draft" else "CREATE TRACKER"
    log_activity(
        db=db,
        user_id=project.project_manager or "System",
        action=action,
        module="Create Tracker",
        entity_id=str(new_upload.id),
        details={
            "project_name": project.name,
            "tracker_name": payload.tracker_name,
            "summary": f"{action} for manual tracker '{payload.tracker_name}' in project '{project.name}'"
        }
    )
    
    db.commit()
    db.refresh(new_upload)
    
    try:
        from app.api.project import structure_cache
        structure_cache.clear()
    except Exception as cache_err:
        logger.error(f"Failed to clear structure cache: {cache_err}")
        
    return {
        "upload_id":     new_upload.id,
        "id":            new_upload.id,
        "project":       project.name,
        "project_id":    new_upload.project_id,
        "department":    new_upload.department,
        "fileName":      new_upload.file_name,
        "name":          new_upload.file_name,
        "employeeName":  new_upload.uploaded_by,
        "uploadedBy":    new_upload.uploaded_by,
        "uploadDate":    new_upload.uploaded_at.strftime("%Y-%m-%d") if new_upload.uploaded_at else datetime.datetime.now().strftime("%Y-%m-%d"),
        "fileType":      "MANUAL",
        "status":        new_upload.status,
        "total_rows":    0,
        "valid_rows":    0,
        "invalid_rows":  0,
        "inserted_rows": 0,
        "records":       0
    }


@router.patch("/tracker_ingestions/{tracker_id}")
def update_tracker_ingestion(
    tracker_id: int,
    payload: TrackerIngestionUpdateRequest,
    db: Session = Depends(get_db)
):
    ingestion = db.query(TrackerIngestion).filter(
        (TrackerIngestion.upload_id == tracker_id) | (TrackerIngestion.id == tracker_id)
    ).first()
    
    if not ingestion:
        raise HTTPException(status_code=404, detail="Tracker Ingestion not found")
        
    validation_errors = validate_tracker_rows(payload.schema, payload.rows)
    if validation_errors:
        raise HTTPException(status_code=422, detail="; ".join(validation_errors))
        
    ingestion.data = {
        "schema": payload.schema,
        "rows": payload.rows
    }
    
    summary = compute_tracker_summary(payload.rows) or {}
    summary["headers"] = [col["column_name"] for col in payload.schema]
    summary["schema"] = payload.schema
    ingestion.summary_data = summary
    
    upload = db.query(Upload).filter(Upload.id == ingestion.upload_id).first()
    old_status = upload.status if upload else None
    if upload:
        upload.row_count = len(payload.rows)
        upload.valid_row_count = len(payload.rows)
        if payload.status:
            upload.status = payload.status
        
    db.commit()
    
    # Audit Log
    from app.utils.audit import log_activity
    action = "UPDATE TRACKER"
    if payload.status == "Completed" and old_status == "Draft":
        action = "PUBLISH TRACKER"
    log_activity(
        db=db,
        user_id=upload.uploaded_by if upload else "System",
        action=action,
        module="Create Tracker",
        entity_id=str(ingestion.upload_id),
        details={
            "tracker_name": ingestion.file_name,
            "summary": f"{action} for manual tracker '{ingestion.file_name}'"
        }
    )
    
    try:
        from app.api.project import structure_cache
        structure_cache.clear()
    except Exception as cache_err:
        logger.error(f"Failed to clear structure cache: {cache_err}")
        
    from app.api.datasets import global_dataset_cache
    global_dataset_cache.invalidate(ingestion.upload_id)
    if upload:
        global_dataset_cache.invalidate(upload.id)
        
    return {"message": "Tracker updated successfully"}



# ---------------------------------------------------------------------------
# POST /upload-tracker
# ---------------------------------------------------------------------------

@router.post("/upload-tracker")
@limiter.limit("10/minute")
async def upload_tracker(
    request: Request,
    file: UploadFile = File(...),

    project: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    employeeName: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # ── 1. File type validation ────────────────────────────────────────────
    if not file.filename.lower().endswith((".xls", ".xlsx")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload an Excel (.xlsx/.xls) file.",
        )

    # ── 2. Resolve project (MANDATORY) ────────────────────────────────────
    if not project or not project.strip():
        raise HTTPException(
            status_code=422,
            detail="Project name is required. Please select a project before uploading.",
        )

    project_id = _resolve_project_id(db, project)
    if project_id is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Project '{project}' not found in the database. "
                "Please create the project in Project Master first."
            ),
        )

    logger.info(
        "[tracker_api] Upload started  file=%s  project=%r  project_id=%s  uploaded_by=%s",
        file.filename, project, project_id, employeeName,
    )

    try:
        stats, new_upload = process_tracker_upload(
            db=db,
            file=file,
            project_id=project_id,
            uploaded_by=employeeName,
            department=department,
        )
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.exception("[tracker_api] Upload pipeline failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    try:
        from app.api.project import structure_cache
        structure_cache.clear()
    except Exception as cache_err:
        logger.error(f"Failed to clear structure cache: {cache_err}")


    return {
        "upload_id":     new_upload.id,
        "id":            new_upload.dataset_id or new_upload.id, # Prefer dataset_id for frontend viewing
        "dataset_id":    new_upload.dataset_id,
        "project":       project,
        "project_id":    new_upload.project_id,
        "department":    new_upload.department,
        "fileName":      new_upload.file_name,
        "name":          new_upload.file_name,
        "employeeName":  new_upload.uploaded_by,
        "uploadedBy":    new_upload.uploaded_by,
        "uploadDate":    (
            new_upload.uploaded_at.strftime("%Y-%m-%d")
            if new_upload.uploaded_at
            else datetime.datetime.now().strftime("%Y-%m-%d")
        ),
        "fileType":      file.filename.rsplit(".", 1)[-1].upper(),
        "status":        new_upload.status,
        # Row audit
        "total_rows":    stats["total_rows"],
        "valid_rows":    stats["valid_rows"],
        "invalid_rows":  stats["invalid_rows"],
        "inserted_rows": stats["inserted_rows"],
        "records":       stats["inserted_rows"],
    }


# ---------------------------------------------------------------------------
# GET /uploads/{project_id}
# ---------------------------------------------------------------------------

@router.get("/uploads/{project_id}")
async def get_uploads_by_project(project_id: int, db: Session = Depends(get_db)):
    uploads = db.query(Upload).filter(
        Upload.project_id == project_id,
        or_(Upload.industry == None, Upload.industry != "MANUAL")
    ).order_by(Upload.uploaded_at.desc()).all()
    return [
        {
            "upload_id":       u.id,
            "file_name":       u.file_name,
            "status":          u.status,
            "row_count":       u.row_count,
            "valid_row_count": u.valid_row_count,
            "invalid_row_count": u.invalid_row_count,
            "uploaded_at":     u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
        }
        for u in uploads
    ]


# ---------------------------------------------------------------------------
# GET /uploads  (all — for UploadTrackers list page)
# ---------------------------------------------------------------------------

@router.get("/uploads")
async def get_uploads(db: Session = Depends(get_db)):
    try:
        uploads  = db.query(Upload).filter(
            Upload.status != "Draft",
            or_(Upload.industry == None, Upload.industry != "MANUAL")
        ).order_by(Upload.uploaded_at.desc()).all()
        projects = db.query(Project).all()
        proj_map = {p.id: p.name for p in projects}

        return [
            {
                "upload_id":        u.id,
                "id":               u.dataset_id or u.id, # Use dataset_id for frontend viewing
                "dataset_id":       u.dataset_id,
                "project":          proj_map.get(u.project_id, "-"),
                "project_id":       u.project_id,
                "employeeName":     u.uploaded_by or "-",
                "fileName":         u.file_name or "-",
                "name":             u.file_name,
                "department":       u.department,
                "industry":         u.industry,
                "row_count":        u.row_count,
                "valid_row_count":  u.valid_row_count,
                "invalid_row_count": u.invalid_row_count,
                "records":          u.valid_row_count or u.row_count,
                "uploadedBy":       u.uploaded_by,
                "uploadDate":       u.uploaded_at.strftime("%Y-%m-%d") if u.uploaded_at else None,
                "fileType":         u.file_name.rsplit(".", 1)[-1].upper() if u.file_name and "." in u.file_name else "XLSX",
                "status":           u.status or "Completed",
                "created_at":       u.uploaded_at,
            }
            for u in uploads
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


# ---------------------------------------------------------------------------
# GET /import-errors/{upload_id}
# ---------------------------------------------------------------------------

@router.get("/import-errors/{upload_id}")
async def get_import_errors(upload_id: int, db: Session = Depends(get_db)):
    """Returns all rows that failed parsing for a given upload."""
    errors = (
        db.query(ImportErrorModel)
        .filter(ImportErrorModel.upload_id == upload_id)
        .order_by(ImportErrorModel.row_number)
        .all()
    )
    return [
        {
            "id":            e.id,
            "row_number":    e.row_number,
            "error_message": e.error_message,
            "raw_payload":   e.raw_payload,
            "created_at":    e.created_at.isoformat() if e.created_at else None,
        }
        for e in errors
    ]


# ---------------------------------------------------------------------------
# GET /trackers/{project_id}/modules
# Returns distinct module names from DB for a given project
# ---------------------------------------------------------------------------

@router.get("/trackers/{project_id}/modules")
async def get_project_modules(project_id: int, db: Session = Depends(get_db)):
    """
    Returns distinct module names for a project from TrackerIngestion table (JSONB).
    Used by sidebar and frontend to build dynamic module lists.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    # Fetch latest ingestions to get current modules
    subq = db.query(
        TrackerIngestion.file_name,
        db.func.max(TrackerIngestion.created_at).label('max_created')
    ).filter(TrackerIngestion.project_id == project_id).group_by(TrackerIngestion.file_name).subquery()

    ingestions = db.query(TrackerIngestion).options(defer(TrackerIngestion.data)).join(
        subq, 
        (TrackerIngestion.file_name == subq.c.file_name) & 
        (TrackerIngestion.created_at == subq.c.max_created)
    ).filter(TrackerIngestion.project_id == project_id).all()

    modules_set = set()
    for ing in ingestions:
        summary = ing.summary_data
        if summary is None:
            # Fallback/self-healing for legacy rows
            raw_data = ing.data
            if raw_data and isinstance(raw_data, list):
                summary = compute_tracker_summary(raw_data)
                ing.summary_data = summary
                db.add(ing)
                try:
                    db.commit()
                except Exception as commit_err:
                    db.rollback()
                    logger.error(f"Failed to auto-save summary fallback: {commit_err}")
            else:
                summary = {"modules": {}}
        
        modules_dict = summary.get("modules", {})
        for mod in modules_dict.keys():
            if mod:
                modules_set.add(mod)
                
    modules = sorted(list(modules_set))

    logger.info(
        "[tracker_api] project_id=%s modules=%s",
        project_id, modules,
    )

    return {
        "project_id":   project_id,
        "project_name": project.name,
        "modules":      modules,
        "module_count": len(modules),
    }


# ---------------------------------------------------------------------------
# DELETE /uploads/{id}
# Unified cleanup for both Tracker and Dataset systems
# ---------------------------------------------------------------------------

@router.delete("/uploads/{id}")
async def delete_upload(id: int, db: Session = Depends(get_db)):
    """
    Deletes an upload and its associated ingestion/dataset data.
    """
    from app.models.dataset import Dataset
    from sqlalchemy import text

    # 1. Find the Upload record
    upload = db.query(Upload).filter(Upload.id == id).first()
    
    # If not found by Upload ID, try by Dataset ID
    if not upload:
        upload = db.query(Upload).filter(Upload.dataset_id == id).first()
        
    if not upload:
        # Standalone dataset cleanup
        from app.models.dataset_column import DatasetColumn
        dataset = db.query(Dataset).filter(Dataset.id == id).first()
        if dataset:
            db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
            if dataset.table_name:
                # Strictly validate table_name to prevent SQL injection
                if not re.match(r'^[a-zA-Z0-9_]+$', dataset.table_name):
                    logger.error(f"Invalid table name detected: {dataset.table_name}")
                    raise HTTPException(status_code=400, detail="Invalid table name")
                db.execute(text(f'DROP TABLE IF EXISTS "{dataset.table_name}"'))

            db.delete(dataset)
            db.commit()
            return {"message": "Standalone dataset deleted"}
        raise HTTPException(status_code=404, detail="Upload or Dataset not found")

    # 2. Cleanup Dataset system if linked
    if upload.dataset_id:
        from app.models.dataset_column import DatasetColumn
        dataset = db.query(Dataset).filter(Dataset.id == upload.dataset_id).first()
        if dataset:
            db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset.id).delete()
            if dataset.table_name:
                try:
                    # Strictly validate table_name to prevent SQL injection
                    if not re.match(r'^[a-zA-Z0-9_]+$', dataset.table_name):
                        logger.error(f"Invalid table name detected: {dataset.table_name}")
                        raise HTTPException(status_code=400, detail="Invalid table name")
                    db.execute(text(f'DROP TABLE IF EXISTS "{dataset.table_name}"'))
                except Exception as e:
                    logger.error(f"Error dropping table {dataset.table_name}: {e}")

            db.delete(dataset)

    # 3. Cleanup TrackerIngestion system
    # Audit Log
    from app.utils.audit import log_activity
    if upload:
        log_activity(
            db=db,
            user_id=upload.uploaded_by or "System",
            action="DELETE TRACKER",
            module="Create Tracker",
            entity_id=str(id),
            details={
                "tracker_name": upload.file_name,
                "summary": f"Deleted manual tracker '{upload.file_name}'"
            }
        )

    db.query(TrackerIngestion).filter(TrackerIngestion.upload_id == upload.id).delete()
    db.query(ImportErrorModel).filter(ImportErrorModel.upload_id == upload.id).delete()

    db.delete(upload)
    db.commit()
    
    try:
        from app.api.project import structure_cache
        structure_cache.clear()
    except Exception as cache_err:
        logger.error(f"Failed to clear structure cache: {cache_err}")

    print(f"[TrackerAPI] Successfully deleted upload {id}")
    return {"message": "Upload and associated data deleted successfully"}


# ---------------------------------------------------------------------------
# POST /uploads/bulk-delete
# Unified bulk cleanup for both Tracker and Dataset systems
# ---------------------------------------------------------------------------

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.post("/uploads/bulk-delete")
async def bulk_delete_uploads(request: BulkDeleteRequest, db: Session = Depends(get_db)):
    """
    Deletes multiple uploads and their associated ingestion/dataset data.
    """
    from app.models.dataset import Dataset
    from app.models.dataset_column import DatasetColumn
    from sqlalchemy import text
    
    ids = request.ids
    if not ids:
        return {"message": "No IDs provided"}

    # 1. Identify all uploads and datasets to be removed
    # We look for matches in Upload.id OR Upload.dataset_id
    uploads = db.query(Upload).filter(
        (Upload.id.in_(ids)) | (Upload.dataset_id.in_(ids))
    ).all()
    
    upload_ids = [u.id for u in uploads]
    dataset_ids_from_uploads = [u.dataset_id for u in uploads if u.dataset_id]
    
    # 2. Find all unique datasets to delete (linked or standalone)
    all_potential_dataset_ids = set(dataset_ids_from_uploads) | set(ids)
    datasets_to_delete = db.query(Dataset).filter(Dataset.id.in_(list(all_potential_dataset_ids))).all()
    actual_dataset_ids = [ds.id for ds in datasets_to_delete]

    # 3. Drop physical tables (immediate execution)
    for ds in datasets_to_delete:
        if ds.table_name:
            try:
                # Strictly validate table_name to prevent SQL injection
                if re.match(r'^[a-zA-Z0-9_]+$', ds.table_name):
                    db.execute(text(f'DROP TABLE IF EXISTS "{ds.table_name}"'))
            except Exception as e:
                logger.error(f"Error dropping table {ds.table_name} during bulk delete: {e}")

    # 4. Perform bulk deletions using direct queries
    # Using direct query delete is faster and avoids session synchronization issues
    
    # Delete Dataset system first
    if actual_dataset_ids:
        db.query(DatasetColumn).filter(DatasetColumn.dataset_id.in_(actual_dataset_ids)).delete(synchronize_session=False)
        db.query(Dataset).filter(Dataset.id.in_(actual_dataset_ids)).delete(synchronize_session=False)

    # Delete Tracker system
    if upload_ids:
        # Manual deletion of children ensures no FK constraint issues even if cascades are missing
        db.query(TrackerIngestion).filter(TrackerIngestion.upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(ImportErrorModel).filter(ImportErrorModel.upload_id.in_(upload_ids)).delete(synchronize_session=False)
        db.query(Upload).filter(Upload.id.in_(upload_ids)).delete(synchronize_session=False)

    db.commit()
    
    try:
        from app.api.project import structure_cache
        structure_cache.clear()
    except Exception as cache_err:
        logger.error(f"Failed to clear structure cache: {cache_err}")

    logger.info("[TrackerAPI] Bulk delete completed: %d uploads, %d datasets", len(upload_ids), len(actual_dataset_ids))
    return {
        "message": f"Successfully deleted {len(upload_ids)} upload(s) and {len(actual_dataset_ids)} dataset(s).",
        "deleted_ids": ids
    }


