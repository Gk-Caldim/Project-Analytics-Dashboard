"""
tracker_service.py
Orchestrates the full upload pipeline:
  1. Save file to disk
  2. Parse Excel → records + errors
  3. Insert Upload record (status=Processing)
  4. Insert TrackerData rows (with upload_id + source_row_number)
  5. Insert ImportError rows for every failed Excel row
  6. Update Upload with final counts and status=Completed
  7. On crash → mark Upload status=Failed

Strict rules:
  - project_id is REQUIRED — callers must pass a valid integer
  - upload_id is REQUIRED on every TrackerData row
  - No silent data loss at any stage
  - Full audit log: total / inserted / skipped / error reasons
"""

import json
import logging
import os
import shutil

from fastapi import UploadFile
from sqlalchemy.orm import Session

import re
import datetime
import pandas as pd
from app.core.database import engine
from app.models.import_error import ImportError as ImportErrorModel
from app.models.tracker import TrackerData
from app.models.upload import Upload
from app.models.dataset import Dataset
from app.models.dataset_column import DatasetColumn
from app.utils.excel_parser import parse_tracker_excel
from app.utils.type_inference import infer_column_type
from app.utils.ingestion import IngestionEngine

logger = logging.getLogger(__name__)

UPLOAD_DIR = "static/uploads/trackers"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_tracker_upload(
    db: Session,
    file: UploadFile,
    project_id: int,               # ← required (caller validated)
    uploaded_by: str | None = None,
    department: str | None = None,
) -> tuple[dict, Upload]:
    """
    Full end-to-end upload pipeline.

    Args:
        project_id  – MUST be a valid integer FK to projects.id
                      The caller (tracker_api.py) is responsible for
                      resolving and validating this before calling us.

    Returns:
        (stats_dict, Upload ORM object)

        stats_dict = {
            "total_rows":    int,   # Excel rows (excl. header)
            "valid_rows":    int,   # Rows parsed successfully
            "invalid_rows":  int,   # Rows that failed validation/parsing
            "inserted_rows": int,   # Rows actually written to DB
        }
    """

    # Guard — should never be None at this point (the API layer enforces it)
    if project_id is None:
        raise ValueError(
            "project_id is None — upload rejected. "
            "Only uploads linked to a known project are accepted."
        )

    # ------------------------------------------------------------------
    # 1. Persist file to disk
    # ------------------------------------------------------------------
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    logger.info(
        "[tracker_service] Saved to disk: %s  project_id=%s  uploaded_by=%s",
        file_path, project_id, uploaded_by,
    )

    # ------------------------------------------------------------------
    # 2. Parse Excel structurally first
    #    If required columns are missing, we don't fail immediately,
    #    we just treat it as a generic dataset (0 tracker records).
    # ------------------------------------------------------------------
    try:
        result = parse_tracker_excel(file_path)
        records = result["records"]
        errors = result["errors"]
        total = len(records) + len(errors)
    except ValueError as e:
        if "Cannot open Excel file" in str(e):
            raise e
        logger.warning("[tracker_service] Not a valid tracker schema, treating as generic dataset: %s", e)
        records = []
        errors = []
        df_temp = pd.read_excel(file_path)
        total = len(df_temp)

    # ------------------------------------------------------------------
    # 3. Create Upload record (status=Processing)
    # ------------------------------------------------------------------
    new_upload = Upload(
        project_id=project_id,
        file_name=file.filename,
        uploaded_by=uploaded_by,
        department=department,
        status="Processing",
    )
    db.add(new_upload)
    db.commit()
    db.refresh(new_upload)
    upload_id = new_upload.id
    logger.info("[tracker_service] Upload record created  id=%s", upload_id)

    # ------------------------------------------------------------------
    # 3.5 Create corresponding Dataset record (System B) for viewing
    # ------------------------------------------------------------------
    try:
        # Load full Excel content using IngestionEngine for System B
        with open(file_path, "rb") as f:
            contents = f.read()
        
        engine_inst = IngestionEngine()
        processed_data = engine_inst.ingest(contents, file.filename)
        
        if not processed_data:
            # Fallback to simple read if ingestion engine returns nothing
            df = pd.read_excel(file_path).fillna("")
        else:
            df = pd.DataFrame(processed_data).fillna("")

        # Create Dataset metadata
        # Get project name for metadata
        from app.models.project import Project
        project_obj = db.query(Project).filter(Project.id == project_id).first()
        project_name = project_obj.name if project_obj else "Unknown"

        # Check for existing dataset with same name, department, and project for overwrite
        existing_ds = db.query(Dataset).filter(
            Dataset.name == file.filename,
            Dataset.department == department,
            Dataset.project == project_name
        ).first()

        if existing_ds:
            logger.info("[tracker_service] Overwriting existing dataset id=%s", existing_ds.id)
            # 1. Drop dynamic table
            if existing_ds.table_name:
                from sqlalchemy import text
                try:
                    db.execute(text(f'DROP TABLE IF EXISTS "{existing_ds.table_name}"'))
                except Exception as e:
                    logger.error(f"Error dropping table {existing_ds.table_name}: {e}")
            
            # 2. Cleanup associated TrackerData and ImportErrors linked to the OLD upload
            # We find the old upload record that pointed to this dataset
            old_upload = db.query(Upload).filter(Upload.dataset_id == existing_ds.id).first()
            if old_upload:
                db.query(TrackerData).filter(TrackerData.upload_id == old_upload.id).delete()
                db.query(ImportErrorModel).filter(ImportErrorModel.upload_id == old_upload.id).delete()
                db.delete(old_upload)
            
            # 3. Delete Dataset columns and Dataset record itself
            db.query(DatasetColumn).filter(DatasetColumn.dataset_id == existing_ds.id).delete()
            db.delete(existing_ds)
            db.commit() # Commit deletion before creating new one to avoid unique constraint issues

        dataset = Dataset(
            name=file.filename,
            project=project_name,
            department=department,
            uploaded_by=uploaded_by,
            file_type=file.filename.split(".")[-1].upper() if "." in file.filename else "XLSX",
            row_count=len(df)
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        # Generate and create dynamic table
        sanitized_project = re.sub(r'[^a-zA-Z0-9_]', '_', project_name).lower()
        sanitized_file = re.sub(r'[^a-zA-Z0-9_]', '_', file.filename.rsplit('.', 1)[0]).lower()
        table_name = f"{sanitized_project}_{sanitized_file}_{dataset.id}"[:63]

        df.to_sql(table_name, engine, if_exists='replace', index=False)
        
        dataset.table_name = table_name
        
        # Link Dataset back to Upload
        new_upload.dataset_id = dataset.id
        db.commit()

        # Store column metadata
        for col in df.columns:
            db.add(DatasetColumn(
                dataset_id=dataset.id,
                column_name=str(col),
                data_type=infer_column_type(df[col])
            ))
        db.commit()
        logger.info("[tracker_service] Unified Dataset created id=%s table=%s", dataset.id, table_name)
        
    except Exception as e:
        db.rollback() # CRITICAL: Reset session after failure
        logger.error("[tracker_service] Failed to create unified Dataset: %s", e)
        # We don't fail the whole upload if System B fails, but we log it.
        # But since we rolled back, the new_upload record might need to be re-added or handled.
        # Actually, new_upload was already committed at line 120, so it's safe in DB.

    try:
        logger.info(
            "[tracker_service] upload_id=%s  PROCESSING BLOB: total_excel_rows=%s  valid=%s  invalid=%s",
            upload_id, total, len(records), len(errors),
        )

        # Log every skipped row reason for auditability
        if errors:
            logger.warning(
                "[tracker_service] upload_id=%s  SKIPPED ROWS (%d): %s",
                upload_id,
                len(errors),
                [{"row": e["row_number"], "reason": e["error_message"]} for e in errors],
            )

        # --------------------------------------------------------------
        # 4. Insert TrackerData rows
        #    Strict: every row MUST have project_id AND upload_id AND module
        # --------------------------------------------------------------
        tracker_items = []
        skipped_no_module = 0

        for r in records:
            module_val = (r.get("module") or "").strip()
            if not module_val:
                # Extra safety net — should have been caught by parser
                logger.error(
                    "[tracker_service] upload_id=%s row=%s: module is empty after parsing — SKIPPING",
                    upload_id, r.get("source_row_number"),
                )
                skipped_no_module += 1
                errors.append({
                    "row_number":    r.get("source_row_number", -1),
                    "error_message": "Module field is empty — row rejected before DB insert",
                    "raw_payload":   json.dumps(r, default=str),
                })
                continue

            tracker_items.append(
                TrackerData(
                    project_id=project_id,
                    upload_id=upload_id,
                    module=module_val,
                    milestone_name=r["milestone_name"],
                    planned_date=r["planned_date"],
                    actual_date=r["actual_date"],
                    status=r["status"],
                    delay_days=r["delay_days"],
                    source_row_number=r["source_row_number"],
                )
            )

        if tracker_items:
            db.bulk_save_objects(tracker_items)
            db.flush()

        # --------------------------------------------------------------
        # 5. Insert ImportError rows for every bad row
        # --------------------------------------------------------------
        error_items = [
            ImportErrorModel(
                upload_id=upload_id,
                project_id=project_id,
                row_number=e["row_number"],
                error_message=e["error_message"],
                raw_payload=e["raw_payload"],
            )
            for e in errors
        ]

        if error_items:
            db.bulk_save_objects(error_items)
            db.flush()

        # --------------------------------------------------------------
        # 6. Update Upload record with final stats
        # --------------------------------------------------------------
        inserted_count = len(tracker_items)
        invalid_count  = len(errors)

        new_upload.row_count         = total
        new_upload.valid_row_count   = inserted_count
        new_upload.invalid_row_count = invalid_count
        new_upload.status            = "Completed"
        db.commit()
        db.refresh(new_upload)

        logger.info(
            "[tracker_service] upload_id=%s  COMPLETED — "
            "total=%s | inserted=%s | skipped=%s | error_records=%s",
            upload_id, total, inserted_count, invalid_count, len(error_items),
        )

        return {
            "total_rows":    total,
            "valid_rows":    inserted_count,     # originally parsed valid rows
            "invalid_rows":  invalid_count,
            "inserted_rows": inserted_count,
        }, new_upload

    except Exception as exc:
        # Mark the upload as failed so the UI can surface it
        try:
            new_upload.status = "Failed"
            db.commit()
        except Exception:
            pass

        db.rollback()
        logger.exception(
            "[tracker_service] upload_id=%s PIPELINE FAILED: %s",
            upload_id, exc,
        )
        raise
