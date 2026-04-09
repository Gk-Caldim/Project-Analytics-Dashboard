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
"""

import json
import pandas as pd

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


def parse_tracker_excel(file_path: str) -> dict:
    # ------------------------------------------------------------------
    # 1. Load file
    # ------------------------------------------------------------------
    try:
        df = pd.read_excel(file_path)
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

    missing = []
    if not col_module:
        missing.append(f"Module (accepted: {ALIASES['module']})")
    if not col_mile:
        missing.append(f"Milestone (accepted: {ALIASES['milestone']})")
    if not col_planned:
        missing.append(f"Planned Date (accepted: {ALIASES['planned_date']})")

    if missing:
        raise ValueError(
            f"Missing required columns: {'; '.join(missing)}. "
            f"Found columns: {cols}"
        )

    # ------------------------------------------------------------------
    # 3. Process rows
    # ------------------------------------------------------------------
    records = []
    errors  = []

    total_rows = len(df)
    print(f"[parser] File loaded: {total_rows} data rows, "
          f"columns resolved → module={col_module}, milestone={col_mile}, "
          f"planned={col_planned}, actual={col_actual or 'NOT FOUND (optional)'}")

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

            # ---- Mandatory field check ----
            if pd.isna(module) or str(module).strip() == "":
                raise ValueError("Module is empty")
            if pd.isna(milestone) or str(milestone).strip() == "":
                raise ValueError("Milestone is empty")
            if pd.isna(planned) or str(planned).strip() == "":
                raise ValueError("Planned Date is empty")

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
            print(f"[parser] Row {index} FAILED: {err_msg}")
            errors.append({
                "row_number":    int(index),
                "error_message": err_msg,
                "raw_payload":   json.dumps(raw, default=str),
            })

    print(f"[parser] Done — valid={len(records)}, invalid={len(errors)}, total={total_rows}")
    return {"records": records, "errors": errors}
