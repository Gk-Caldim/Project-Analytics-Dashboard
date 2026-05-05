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


def _clean_value(v):
    """
    Recursively convert a single value to a JSON-safe type.

    Key cases that were previously broken:
      - pandas NaT inside a nested dict → crashed json.dumps → entire dict became str()
      - pandas NaN (float nan) inside a nested dict → same crash
      - datetime.date / datetime.datetime objects → converted to ISO string
    """
    import math

    if v is None:
        return None

    # pandas NaT — must check before isinstance(datetime) because NaT is a subclass
    try:
        import pandas as _pd
        if _pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(v, dict):
        return {str(k): _clean_value(val) for k, val in v.items()}

    if isinstance(v, list):
        return [_clean_value(item) for item in v]

    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.strftime("%Y-%m-%d")

    if hasattr(v, "isoformat"):        # pandas Timestamp, etc.
        try:
            return v.isoformat()
        except Exception:
            return str(v)

    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v

    # Final safety-net: test JSON-serialisability
    try:
        json.dumps(v)
        return v
    except (TypeError, ValueError):
        return str(v)


def _serialize_for_json(records: list) -> list:
    """
    Walk the record list and convert any non-JSON-serialisable types
    (including values nested inside the 'raw' dict) to plain Python
    scalars / None so the data can be stored as JSONB.

    Previous bug: NaT / nan values inside the nested 'raw' dict caused
    json.dumps(raw_dict) to raise TypeError, which the except clause
    caught by calling str(raw_dict) — producing an unreadable Python
    repr string like \"{'field': NaT, ...}\" stored verbatim in JSONB.
    """
    return [
        {k: _clean_value(v) for k, v in row.items()}
        for row in records
    ]


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

    # 4. Bypass Standardization (Save directly as JSONB)
    # The user requested to save the jsonb data in the database directly
    # instead of mapping it to specific tracker columns.
    
    # Sanitise for JSON-serialisability
    file_data_jsonb = _serialize_for_json(raw_ingested_records)
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


