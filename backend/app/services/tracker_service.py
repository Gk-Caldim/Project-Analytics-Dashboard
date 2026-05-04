"""
tracker_service.py
Orchestrates the full upload pipeline (NO LOCAL FILE STORAGE):
  1. Read file bytes in-memory from the upload stream
  2. Apply IngestionEngine → produces cleaned JSONB records
  3. Insert Upload record (status=Processing) with file_data as JSONB
  4. Try to parse tracker-specific columns (Module / Milestone / Dates)
     → Insert TrackerData rows
     → Insert ImportError rows for every failed row
  5. Update Upload with final counts and status=Completed
  6. On crash → mark Upload status=Failed

Strict rules:
  - project_id is REQUIRED — callers must pass a valid integer
  - upload_id is REQUIRED on every TrackerData row
  - No local files written to disk (bytes processed purely in-memory)
  - Full audit log: total / inserted / skipped / error reasons
"""

import json
import logging
import re

from fastapi import UploadFile
from sqlalchemy.orm import Session

import datetime
import pandas as pd
from io import BytesIO

from app.models.upload import Upload
from app.models.tracker_ingestion import TrackerIngestion
from app.utils.ingestion import IngestionEngine
from app.utils.analytics_utils import standardize_records

logger = logging.getLogger(__name__)


def _serialize_for_json(records: list) -> list:
    """
    Walk the record list and convert any non-JSON-serialisable types
    to plain strings / None so the data can be stored as JSONB.
    """
    cleaned = []
    for row in records:
        clean_row = {}
        for k, v in row.items():
            if v is None:
                clean_row[k] = None
            elif isinstance(v, (datetime.date, datetime.datetime)):
                clean_row[k] = v.strftime("%Y-%m-%d")
            elif hasattr(v, "isoformat"):          # pandas Timestamp etc.
                clean_row[k] = v.isoformat()
            elif isinstance(v, float) and (v != v):  # NaN check
                clean_row[k] = None
            else:
                try:
                    json.dumps(v)          # test serialisability
                    clean_row[k] = v
                except (TypeError, ValueError):
                    clean_row[k] = str(v)
        cleaned.append(clean_row)
    return cleaned


def process_tracker_upload(
    db: Session,
    file: UploadFile,
    project_id: int,               
    uploaded_by: str | None = None,
    department: str | None = None,
) -> tuple[dict, Upload]:
    """
    Refined end-to-end upload pipeline:
    1. Read and apply IngestionEngine logic in-memory.
    2. Apply Standardization (Alias Mapping) to the cleaned data.
    3. Check for duplicates in the same department/project.
    4. Save to DB ONLY after successful processing.
    """

    if project_id is None:
        raise ValueError("project_id is required.")

    # 1. Read file bytes
    contents: bytes = file.file.read()
    
    # 2. Check for duplicate upload in the same department (Business Rule)
    if department:
        existing = db.query(Upload).filter(
            Upload.project_id == project_id,
            Upload.department == department,
            Upload.file_name == file.filename,
            Upload.status == "Completed"
        ).first()
        if existing:
            raise ValueError(f"A file with name '{file.filename}' has already been uploaded for this department.")

    # 3. Apply IngestionEngine logic (Merged cells, multi-row headers, cleaning)
    engine_inst = IngestionEngine()
    try:
        raw_ingested_records = engine_inst.ingest(contents, file.filename)
    except Exception as e:
        logger.error("[tracker_service] IngestionEngine failed: %s", e)
        raise ValueError(f"Ingestion logic failed to parse file: {e}")

    if not raw_ingested_records:
        raise ValueError("IngestionEngine returned no records. File might be empty or improperly formatted.")

    # 4. Apply Standardization (Alias Mapping) - THIS IS THE ANALYTICS PREP
    # This ensures the JSONB has 'module', 'milestone_name', 'planned_date', 'actual_date'
    standardized_records = standardize_records(raw_ingested_records)
    
    # Sanitise for JSON-serialisability
    file_data_jsonb = _serialize_for_json(standardized_records)
    total_rows = len(file_data_jsonb)

    # 5. Save to Database (Atomic Transaction)
    try:
        # Create Upload record (audit/history)
        new_upload = Upload(
            project_id=project_id,
            file_name=file.filename,
            uploaded_by=uploaded_by,
            department=department,
            status="Processing", # Will be updated to Completed in same transaction
            row_count=total_rows,
            valid_row_count=total_rows,
            invalid_row_count=0
        )
        db.add(new_upload)
        db.flush() # Get ID
        upload_id = new_upload.id

        # Create TrackerIngestion record (analytics data)
        ingestion_record = TrackerIngestion(
            project_id=project_id,
            upload_id=upload_id,
            file_name=file.filename,
            data=file_data_jsonb,
            uploaded_by=uploaded_by
        )
        db.add(ingestion_record)
        
        # Finalize Upload status
        new_upload.status = "Completed"
        db.commit()
        db.refresh(new_upload)

        logger.info(
            "[tracker_service] upload_id=%s COMPLETED — Ingestion logic applied and saved as standardized JSONB.",
            upload_id
        )

        return {
            "total_rows":    total_rows,
            "valid_rows":    total_rows,
            "invalid_rows":  0,
            "inserted_rows": total_rows,
        }, new_upload

    except Exception as exc:
        db.rollback()
        logger.exception("[tracker_service] DB transaction failed: %s", exc)
        raise ValueError(f"Failed to save ingested data to database: {exc}")


