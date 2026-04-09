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

No silent data loss at any stage.
"""

import json
import logging
import os
import shutil

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.import_error import ImportError as ImportErrorModel
from app.models.tracker import TrackerData
from app.models.upload import Upload
from app.utils.excel_parser import parse_tracker_excel

logger = logging.getLogger(__name__)

UPLOAD_DIR = "static/uploads/trackers"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_tracker_upload(
    db: Session,
    file: UploadFile,
    project_id: int | None = None,
    uploaded_by: str | None = None,
    department: str | None = None,
) -> tuple[dict, Upload]:
    """
    Returns:
        (stats_dict, Upload ORM object)

        stats_dict = {
            "total_rows": int,
            "valid_rows": int,
            "invalid_rows": int,
            "inserted_rows": int,
        }
    """

    # ------------------------------------------------------------------
    # 1. Persist file to disk
    # ------------------------------------------------------------------
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    logger.info("[upload] Saved to disk: %s  project_id=%s", file_path, project_id)

    # ------------------------------------------------------------------
    # 2. Create Upload record immediately (status=Processing)
    #    so it's visible even if parsing fails later.
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
    logger.info("[upload] Upload record created  id=%s", upload_id)

    try:
        # --------------------------------------------------------------
        # 3. Parse Excel
        # --------------------------------------------------------------
        result   = parse_tracker_excel(file_path)
        records  = result["records"]
        errors   = result["errors"]
        total    = len(records) + len(errors)

        logger.info(
            "[upload] id=%s  parsed: total_excel_rows=%s  valid=%s  invalid=%s",
            upload_id, total, len(records), len(errors),
        )

        # --------------------------------------------------------------
        # 4. Insert TrackerData rows
        # --------------------------------------------------------------
        tracker_items = [
            TrackerData(
                project_id=project_id,
                upload_id=upload_id,
                module=r["module"],
                milestone_name=r["milestone_name"],
                planned_date=r["planned_date"],
                actual_date=r["actual_date"],
                status=r["status"],
                delay_days=r["delay_days"],
                source_row_number=r["source_row_number"],
            )
            for r in records
        ]

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
        new_upload.row_count        = total
        new_upload.valid_row_count  = len(records)
        new_upload.invalid_row_count = len(errors)
        new_upload.status           = "Completed"
        db.commit()
        db.refresh(new_upload)

        logger.info(
            "[upload] id=%s  COMPLETED — inserted=%s  errors=%s",
            upload_id, len(tracker_items), len(error_items),
        )

        return {
            "total_rows":    total,
            "valid_rows":    len(records),
            "invalid_rows":  len(errors),
            "inserted_rows": len(tracker_items),
        }, new_upload

    except Exception as exc:
        # Mark the upload as failed so the UI can surface it
        try:
            new_upload.status = "Failed"
            db.commit()
        except Exception:
            pass

        db.rollback()
        logger.exception("[upload] id=%s FAILED: %s", upload_id, exc)
        raise
