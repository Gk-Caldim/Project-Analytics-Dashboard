"""
excel_parser.py
Strict, alias-aware Excel parser for tracker uploads.

Returns:
    {
        "records": [{ module, milestone_name, planned_date, actual_date,
                       status, delay_days, source_row_number }],
        "errors":  [{ row_number, error_message, raw_payload }]
    }

Rules:
- Accepts alias column headers (Module/Function/Phase, etc.)
- Every skipped row produces an entry in errors[] — nothing disappears silently
- actual_date is optional; if missing: status=Pending, delay_days=None
- source_row_number = 0-based pandas index (so row 0 = first data row)
- All logging uses the Python logging module (no bare print calls)

Validation:
- If required columns are missing → raise ValueError with exact message:
  "Missing required columns: Module, Milestone"
- If a row has empty Module → row is invalid, logged to errors
- If a row has empty Milestone → row is invalid, logged to errors
"""

import json
import logging
from io import BytesIO
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Column alias maps: first match wins
# ---------------------------------------------------------------------------
ALIASES = {
    "module":       ["Module", "Function", "Phase", "Category"],
    "milestone":    ["Milestone", "Task", "Activity", "Deliverable"],
    "planned_date": ["Planned Date", "Target Date", "Plan Date", "Baseline Date"],
    "actual_date":  ["Actual Date", "Closure Date", "Close Date", "Completion Date"],
}


def _resolve_column(df_columns: list[str], field: str) -> str | None:
    """Return the first alias that actually exists in the DataFrame."""
    for alias in ALIASES[field]:
        if alias in df_columns:
            return alias
    return None


def parse_tracker_excel(source) -> dict:
    """
    Accept either:
      - a file path (str) — legacy / backward compatible
      - raw bytes       — for in-memory processing without disk writes
    """
    # ------------------------------------------------------------------
    # 1. Load file
    # ------------------------------------------------------------------
    try:
        if isinstance(source, (bytes, bytearray)):
            df = pd.read_excel(BytesIO(source))
        else:
            df = pd.read_excel(source)
    except Exception as e:
        raise ValueError(f"Cannot open Excel file: {e}")

    df.columns = [str(c).strip() for c in df.columns]   # trim whitespace in headers
    cols = list(df.columns)

    # ------------------------------------------------------------------
    # 2. Resolve required columns (mandatory: module, milestone, planned)
    # ------------------------------------------------------------------
    col_module   = _resolve_column(cols, "module")
    col_mile     = _resolve_column(cols, "milestone")
    col_planned  = _resolve_column(cols, "planned_date")
    col_actual   = _resolve_column(cols, "actual_date")   # optional

    # Collect human-readable missing column names for the error message
    missing_labels = []
    if not col_module:
        missing_labels.append("Module")
    if not col_mile:
        missing_labels.append("Milestone")
    if not col_planned:
        missing_labels.append("Planned Date")

    if missing_labels:
        # Return the exact format required: "Missing required columns: Module, Milestone"
        joined = ", ".join(missing_labels)
        detail = (
            f"Missing required columns: {joined}. "
            f"Accepted aliases — Module: {ALIASES['module']}, "
            f"Milestone: {ALIASES['milestone']}, "
            f"Planned Date: {ALIASES['planned_date']}. "
            f"Found columns in file: {cols}"
        )
        logger.error("[parser] %s", detail)
        raise ValueError(detail)

    # ------------------------------------------------------------------
    # 3. Process rows
    # ------------------------------------------------------------------
    records = []
    errors  = []

    total_rows = len(df)
    logger.info(
        "[parser] File loaded: %d data rows, columns resolved → "
        "module=%s, milestone=%s, planned=%s, actual=%s",
        total_rows, col_module, col_mile, col_planned,
        col_actual or "NOT FOUND (optional)",
    )

    for index, row in df.iterrows():
        raw = {}
        try:
            raw = {
                "module":       str(row.get(col_module,  "")),
                "milestone":    str(row.get(col_mile,    "")),
                "planned_date": str(row.get(col_planned, "")),
                "actual_date":  str(row.get(col_actual,  "")) if col_actual else None,
            }

            module    = row.get(col_module)
            milestone = row.get(col_mile)
            planned   = row.get(col_planned)
            actual    = row.get(col_actual) if col_actual else None

            # ---- Mandatory field check: Module ----
            if module is None or (hasattr(module, '__class__') and str(type(module).__name__) == 'float') or pd.isna(module) or str(module).strip() == "":
                raise ValueError("Module is empty — row skipped (required field)")

            # ---- Mandatory field check: Milestone ----
            if milestone is None or pd.isna(milestone) or str(milestone).strip() == "":
                raise ValueError("Milestone is empty — row skipped (required field)")

            # ---- Mandatory field check: Planned Date ----
            if planned is None or pd.isna(planned) or str(planned).strip() == "":
                raise ValueError("Planned Date is empty — row skipped (required field)")

            # ---- Date parsing ----
            planned_date = pd.to_datetime(planned, dayfirst=False, errors="raise").date()

            if actual is None or pd.isna(actual) or str(actual).strip() in ("", "nan", "NaT"):
                actual_date = None
                status      = "Pending"
                delay_days  = None
            else:
                actual_date = pd.to_datetime(actual, dayfirst=False, errors="raise").date()
                delay_days  = (actual_date - planned_date).days
                status      = "Delayed" if delay_days > 0 else "On Track"

            records.append({
                "module":            str(module).strip(),
                "milestone_name":    str(milestone).strip(),
                "planned_date":      planned_date,
                "actual_date":       actual_date,
                "status":            status,
                "delay_days":        delay_days,
                "source_row_number": int(index),
            })

        except Exception as e:
            err_msg = str(e)
            logger.warning("[parser] Row %d FAILED: %s | raw=%s", index, err_msg, raw)
            errors.append({
                "row_number":    int(index),
                "error_message": err_msg,
                "raw_payload":   json.dumps(raw, default=str),
            })

    # ------------------------------------------------------------------
    # 4. Summary audit log
    # ------------------------------------------------------------------
    logger.info(
        "[parser] DONE — total_rows=%d | inserted=%d | skipped=%d",
        total_rows, len(records), len(errors),
    )

    if errors:
        logger.warning(
            "[parser] Skipped row reasons: %s",
            [{"row": e["row_number"], "reason": e["error_message"]} for e in errors],
        )

    return {"records": records, "errors": errors}
