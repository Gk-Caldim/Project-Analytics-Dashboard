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
    logger.info("[tracker_service] Upload record created  id=%s", upload_id)

    try:
        # --------------------------------------------------------------
        # 3. Parse Excel
        # --------------------------------------------------------------
        result  = parse_tracker_excel(file_path)
        records = result["records"]
        errors  = result["errors"]
        total   = len(records) + len(errors)

        logger.info(
            "[tracker_service] upload_id=%s  PARSED: total_excel_rows=%s  valid=%s  invalid=%s",
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
            "valid_rows":    len(result["records"]),     # originally parsed valid rows
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
