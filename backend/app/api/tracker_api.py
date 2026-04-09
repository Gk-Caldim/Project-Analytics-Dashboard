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

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.core.database import get_db
from app.crud import project as crud_project
from app.models.import_error import ImportError as ImportErrorModel
from app.models.project import Project
from app.models.upload import Upload
from app.services.tracker_service import process_tracker_upload

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


# ---------------------------------------------------------------------------
# POST /upload-tracker
# ---------------------------------------------------------------------------

@router.post("/upload-tracker")
async def upload_tracker(
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

    return {
        "upload_id":     new_upload.id,
        "id":            new_upload.id,
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
    uploads = db.query(Upload).filter(Upload.project_id == project_id).order_by(Upload.uploaded_at.desc()).all()
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
        uploads  = db.query(Upload).order_by(Upload.uploaded_at.desc()).all()
        projects = db.query(Project).all()
        proj_map = {p.id: p.name for p in projects}

        return [
            {
                "id":               u.id,
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
# ONLY from DB — never hardcoded
# ---------------------------------------------------------------------------

@router.get("/trackers/{project_id}/modules")
async def get_project_modules(project_id: int, db: Session = Depends(get_db)):
    """
    Returns distinct module names for a project from trackers_data table.
    Used by sidebar and frontend to build dynamic module lists.
    Only returns modules that have actual data — no hardcoded entries.
    """
    from app.models.tracker import TrackerData as TrackerDataModel
    from sqlalchemy import distinct

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    rows = (
        db.query(distinct(TrackerDataModel.module))
        .filter(
            TrackerDataModel.project_id == project_id,
            TrackerDataModel.module != None,
            TrackerDataModel.module != "",
        )
        .order_by(TrackerDataModel.module)
        .all()
    )

    modules = [r[0] for r in rows if r[0]]

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
