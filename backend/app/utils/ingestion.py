import pandas as pd
import re
import datetime
from io import BytesIO
from openpyxl import load_workbook
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class IngestionEngine:
    """
    Advanced Logic Engine for "Effective Ingestion" of Excel/CSV files.
    Follows a 4-stage protocol:
    1. Merged Cell Propagation
    2. Ratio-Based Header Detection
    3. Multi-Row Header Concatenation
    4. Self-Healing Data Cleaning
    """

    def __init__(self, max_header_scan: int = 20, min_header_cols: int = 2, text_ratio_threshold: float = 0.7):
        self.max_header_scan = max_header_scan
        self.min_header_cols = min_header_cols
        self.text_ratio_threshold = text_ratio_threshold

    def ingest(self, file_content: bytes, file_name: str) -> List[Dict[str, Any]]:
        """Main entry point for ingestion from raw file."""
        if file_name.lower().endswith('.csv'):
            return self._ingest_csv(file_content)
        else:
            return self._ingest_excel(file_content)

    def ingest_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Re-process an existing DataFrame. 
        Useful for the 'Optimize' button where data is already in memory/DB.
        """
        # Convert DF to a 2D list of values to scan for headers
        data_list = []
        current_cols = list(df.columns)
        
        # When optimizing, we ALWAYS treat current columns as data to see if we can find a BETTER header row.
        # This allows "Stage 2" to skip a previous bad header (like a Title row) and find the real one.
        data_list.append(current_cols)
        data_list.extend(df.values.tolist())
        
        # Create a cells_dict for the detection logic
        cells_dict = {}
        for r, row in enumerate(data_list):
            for c, val in enumerate(row):
                if val is not None and str(val).strip() != "":
                    cells_dict[(r + 1, c + 1)] = val
        
        if not cells_dict:
            return df.to_dict(orient='records')

        max_r = len(data_list)
        max_c = len(current_cols)
        
        # Stage 2: Header Detection (Improved with Scoring)
        try:
            header_info = self._detect_header_row(cells_dict, 1, max_r, 1, max_c)
            if header_info:
                start_row = header_info['start_row']
                depth = header_info['depth']
                headers = self._concatenate_headers(cells_dict, start_row, depth, 1, max_c)
                
                # Extract Data
                data_start_row = start_row + depth
                records = []
                for r in range(data_start_row, max_r + 1):
                    row_obj = {}
                    is_empty = True
                    for i, c in enumerate(range(1, max_c + 1)):
                        val = cells_dict.get((r, c))
                        if val is not None and str(val).strip() != "":
                            is_empty = False
                        if i < len(headers):
                            row_obj[headers[i]] = val
                    if not is_empty:
                        records.append(row_obj)
                
                df = pd.DataFrame(records)
        except Exception as e:
            logger.warning(f"Header detection failed during optimization: {e}")
            # Continue to cleaning even if header detection fails

        # Stage 4: Self-Healing Cleaning
        df = self._clean_data(df)
        return df.to_dict(orient='records')

    def _ingest_csv(self, file_content: bytes) -> List[Dict[str, Any]]:
        """Simplified ingestion for CSV (no merged cells)."""
        df = pd.read_csv(BytesIO(file_content))
        # For CSV, we still apply header detection if the first row doesn't look like a header
        # but usually CSVs have headers on the first row.
        # We will apply self-healing cleaning though.
        df = self._clean_data(df)
        return df.to_dict(orient='records')

    def _ingest_excel(self, file_content: bytes) -> List[Dict[str, Any]]:
        wb = load_workbook(filename=BytesIO(file_content), data_only=True)
        sheet = wb.active

        # ---------- 1. HANDLE MERGED CELLS ----------
        merged_data = {}
        for merged_range in sheet.merged_cells.ranges:
            min_col, min_row, max_col, max_row = merged_range.bounds
            value = sheet.cell(row=min_row, column=min_col).value

            for r in range(min_row, max_row + 1):
                for c in range(min_col, max_col + 1):
                    merged_data[(r, c)] = value

        # ---------- 2. EXTRACT ACTIVE DATA REGION ----------
        cells = {}
        min_r, max_r = float('inf'), -1
        min_c, max_c = float('inf'), -1

        for r in range(1, sheet.max_row + 1):
            for c in range(1, sheet.max_column + 1):
                val = merged_data.get((r, c), sheet.cell(row=r, column=c).value)

                if val is not None and str(val).strip() != "":
                    cells[(r, c)] = val
                    min_r = min(min_r, r)
                    max_r = max(max_r, r)
                    min_c = min(min_c, c)
                    max_c = max(max_c, c)

        if not cells:
            return []

        # ---------- 3. DETECT HEADER ROW ----------
        header_row = None

        for r in range(min_r, min(min_r + 10, max_r + 1)):
            row_vals = [cells.get((r, c)) for c in range(min_c, max_c + 1)]

            text_count = sum(isinstance(v, str) for v in row_vals if v)
            num_count = sum(isinstance(v, (int, float)) for v in row_vals if v)

            if text_count > num_count:
                header_row = r
                break

        if header_row is None:
            raise ValueError("Header row not detected")

        # ---------- 4. BUILD HEADERS (L1 + L2) ----------
        headers = []
        next_row = header_row + 1

        for c in range(min_c, max_c + 1):
            l1 = str(cells.get((header_row, c), "")).strip()
            l2 = str(cells.get((next_row, c), "")).strip()

            if l1 and l2:
                name = f"{l1}_{l2}"
            elif l2:
                name = l2
            else:
                name = l1

            # normalize column name
            name = name.lower()
            name = re.sub(r"[^\w\s]", "", name)
            name = re.sub(r"\s+", "_", name).strip("_")

            if not name:
                name = f"column_{c}"

            headers.append(name)

        # ---------- 5. EXTRACT ROW DATA ----------
        jsonb_data = []

        for r in range(next_row + 1, max_r + 1):
            row_obj = {}
            empty = True

            for idx, c in enumerate(range(min_c, max_c + 1)):
                val = cells.get((r, c))

                # normalize types
                if isinstance(val, (datetime.date, datetime.datetime)):
                    val = val.isoformat()

                if val is not None:
                    empty = False

                row_obj[headers[idx]] = val

            if not empty:
                jsonb_data.append(row_obj)

        return jsonb_data

    def _propagate_merged_cells(self, sheet):
        """Stage 1: Identify merged ranges and map values."""
        merged_data = {}
        for merged_range in sheet.merged_cells.ranges:
            min_col, min_row, max_col, max_row = merged_range.bounds
            top_left_val = sheet.cell(row=min_row, column=min_col).value
            for row in range(min_row, max_row + 1):
                for col in range(min_col, max_col + 1):
                    merged_data[(row, col)] = top_left_val

        cells_dict = {}
        min_r, max_r, min_c, max_c = float('inf'), -1, float('inf'), -1
        
        for row in range(1, sheet.max_row + 1):
            for col in range(1, sheet.max_column + 1):
                cell_val = sheet.cell(row=row, column=col).value
                val = merged_data.get((row, col), cell_val)
                
                if val is not None and str(val).strip() != "":
                    cells_dict[(row, col)] = val
                    min_r = min(min_r, row)
                    max_r = max(max_r, row)
                    min_c = min(min_c, col)
                    max_c = max(max_c, col)
        
        return cells_dict, min_r, max_r, min_c, max_c

    def _detect_header_row(self, cells_dict, min_r, max_r, min_c, max_c):
        """
        Stage 2: Scan for header row based on text-to-numeric ratio and column density.
        Uses a scoring system to pick the BEST header row in the scan range.
        """
        best_row = None
        max_score = -1
        
        # Scan range: from min_r up to max_header_scan rows
        scan_limit = min(min_r + self.max_header_scan, max_r + 1)
        
        for r in range(min_r, scan_limit):
            non_null_cells = 0
            text_cells = 0
            numeric_cells = 0
            row_vals = []
            
            for c in range(min_c, max_c + 1):
                val = cells_dict.get((r, c))
                if val is not None and str(val).strip() != "":
                    non_null_cells += 1
                    row_vals.append(str(val).strip().lower())
                    if isinstance(val, (int, float)) and not isinstance(val, bool):
                        numeric_cells += 1
                    else:
                        text_cells += 1
            
            # Adjust min_required if the sheet is narrow
            min_required = min(self.min_header_cols, max_c - min_c + 1)
            
            if non_null_cells >= min_required:
                text_ratio = text_cells / non_null_cells
                
                # Protocol: mostly text cells (threshold usually 0.7)
                if text_ratio >= self.text_ratio_threshold:
                    # Score calculation: density * uniqueness
                    unique_count = len(set(row_vals))
                    uniqueness_ratio = unique_count / non_null_cells if non_null_cells > 0 else 0
                    
                    # Heuristic score: favors more columns and more unique names
                    # This prevents picking a "Title" row (e.g. 1 or 2 merged cells) over the real header (e.g. 20 cells)
                    score = non_null_cells * uniqueness_ratio
                    
                    if score > max_score:
                        max_score = score
                        best_row = r
        
        if best_row:
            # Found potential header start. Now check depth (Stage 3 logic part 1)
            depth = self._determine_header_depth(cells_dict, best_row, max_r, min_c, max_c)
            return {'start_row': best_row, 'depth': depth}
            
        return None

    @staticmethod
    def _is_label_value(val) -> bool:
        """
        Returns True if 'val' looks like a column label (header-like text).
        Returns False if it looks like data (number, date, datetime).

        This is the key predicate for _determine_header_depth: we only extend
        the header span while subsequent rows still look like label rows, not
        data rows.  Critically, openpyxl returns Excel date cells as
        datetime.datetime objects — these MUST be treated as data, not text.
        """
        if isinstance(val, bool):
            return True          # TRUE/FALSE cells in headers are text-like
        if isinstance(val, (int, float)):
            return False         # plain numbers → data
        if isinstance(val, (datetime.date, datetime.datetime)):
            return False         # dates/datetimes from openpyxl → data
        return True              # strings → label

    def _determine_header_depth(self, cells_dict, start_row, max_r, min_c, max_c):
        """
        Determine if the header spans multiple rows (multi-row / sub-header scenario).

        Primary gate — unique-value check:
          If the detected header row already has ALL-UNIQUE non-empty values,
          it is definitively a final, single-row header.  Return depth=1 immediately.
          No need to inspect subsequent rows at all.

          Real single-row headers always have unique column names.
          The only situation where the header row contains REPEATED values is
          when merged cells from a parent-header row have been propagated (Stage 1)
          into adjacent columns — e.g.:

            Row A (after propagation): "Scope" | "Scope" | "Dates" | "Dates"
            Row B:                     "Name"  | "Type"  | "Start" | "End"

          In that case unique_ratio < threshold, so we proceed to sub-row inspection.

        Secondary gate — text-ratio + label-value check:
          Used only when the primary gate allows extending (repeated header values).
          Extend depth while the NEXT row is also all-text labels.
          Stop the moment a row contains numbers, datetimes, or mixed data.

        This two-gate design fixes two historical bugs:
          Bug 1: scoring formula always preferred higher depth (unique strings grew).
          Bug 2: datetime objects counted as 'text', so date-heavy data rows looked
                 like header rows and depth kept growing.
          Bug 3 (new): text-heavy data rows (names, status strings) also passed the
                 text-ratio gate, absorbing data rows into the header for issues
                 trackers and similar text-dominant sheets.
        """
        # --- Primary gate: check uniqueness of the header row itself ---
        header_vals = []
        for c in range(min_c, max_c + 1):
            val = cells_dict.get((start_row, c))
            if val is not None and str(val).strip() != "":
                header_vals.append(str(val).strip())

        if not header_vals:
            return 1

        unique_ratio = len(set(header_vals)) / len(header_vals)
        # Threshold 0.85 allows 1 duplicate in ~7 columns without triggering
        # (handles edge cases) but rejects clearly merged-cell parent rows.
        if unique_ratio > 0.85:
            # All unique labels → clean single-row header, no multi-row structure
            return 1

        # --- Secondary gate: merged-cell parent detected, check sub-rows ---
        depth = 1
        for extra in range(1, min(4, max_r - start_row + 1)):
            next_row = start_row + extra
            non_null = 0
            text_cells = 0

            for c in range(min_c, max_c + 1):
                val = cells_dict.get((next_row, c))
                if val is not None and str(val).strip() != "":
                    non_null += 1
                    if self._is_label_value(val):
                        text_cells += 1

            if non_null == 0:
                break   # empty row — stop

            text_ratio = text_cells / non_null
            if text_ratio >= self.text_ratio_threshold:
                depth += 1   # next row also all-text labels → sub-header, extend
            else:
                break        # next row has numbers / dates → data, stop

        return depth

    def _concatenate_headers(self, cells_dict, start_row, depth, min_c, max_c):
        """Stage 3: Concatenate and sanitize headers."""
        final_headers = []
        for c in range(min_c, max_c + 1):
            col_parts = []
            for hr in range(start_row, start_row + depth):
                val = cells_dict.get((hr, c))
                if val is not None and str(val).strip() != "":
                    text = str(val).strip()
                    # Avoid repeating same text from merged cells in vertical concatenation
                    if not col_parts or col_parts[-1] != text:
                        col_parts.append(text)
            
            raw_header = " ".join(col_parts)
            sanitized = self._sanitize_name(raw_header)
            if not sanitized:
                sanitized = f"column_{c}"
            final_headers.append(sanitized)
        
        # Handle duplicates
        unique_headers = []
        counts = {}
        for h in final_headers:
            if h in counts:
                counts[h] += 1
                unique_headers.append(f"{h}_{counts[h]}")
            else:
                counts[h] = 0
                unique_headers.append(h)
        
        return unique_headers

    def _sanitize_name(self, name: str) -> str:
        """Sanitize into lowercase_underscore_format."""
        s = name.lower().strip()
        s = re.sub(r'[^a-z0-9]+', '_', s)
        return s.strip('_')

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Stage 4: Self-Healing Data Cleaning."""
        if df.empty:
            return df

        for col in df.columns:
            # 1. Standardize nulls and strip strings
            # We want to keep actual numeric/date objects if they exist, but normalize strings
            def normalize(x):
                if pd.isna(x): return ""
                if isinstance(x, (datetime.date, datetime.datetime)):
                    return x # Keep as is
                if isinstance(x, (int, float)):
                    return x # Keep as is
                s = str(x).strip()
                if s.lower() in ['nan', 'null', 'none', 'n/a', '-']: return ""
                return s

            if df[col].dtype == 'object':
                df[col] = df[col].apply(normalize)

            # 2. Skip empty columns
            non_empty_mask = df[col].apply(lambda x: str(x).strip() != "")
            non_empty_count = non_empty_mask.sum()
            if non_empty_count == 0:
                continue

            # --- Date Cleaning ---
            is_likely_numeric = False
            
            # Helper to check if a series is mostly numeric digits
            def is_digit_string(s):
                s_str = str(s).strip()
                return s_str != "" and s_str.replace('.','',1).replace('-','',1).isdigit()

            # Avoid parsing small integers as dates (common in S.No / Quantity columns).
            # Excel date serials start at ~25569 (Jan 1, 1970 in Excel is 25569).
            # Any column whose max numeric value is below 25000 is definitively NOT a date.
            if pd.api.types.is_numeric_dtype(df[col]) or all(is_digit_string(x) for x in df[col][non_empty_mask]):
                try:
                    temp_numeric = pd.to_numeric(df[col][non_empty_mask], errors='coerce')
                    if not temp_numeric.dropna().empty and temp_numeric.dropna().max() < 25000:
                        is_likely_numeric = True
                except:
                    pass
            
            col_lower = str(col).lower()
            # is_date_col is purely informational now — used for the validity threshold below,
            # NOT to override is_likely_numeric.  A column named 'planned_quantity' that
            # contains integers like 10, 5, 15 must NOT be date-parsed just because its
            # name contains 'planned'.
            is_date_col = any(k in col_lower for k in ['date', 'start', 'end', 'plan_date',
                              'actual_date', 'target_date', 'closure', 'completion_date'])

            if not is_likely_numeric:
                try:
                    # 1. Try parsing as Excel serial date if it's a number
                    def parse_excel_date(x):
                        try:
                            if isinstance(x, (int, float)) and x > 30000 and x < 60000:
                                return pd.to_datetime(x, unit='D', origin='1899-12-30')
                            if isinstance(x, str) and x.replace('.','',1).isdigit():
                                x_num = float(x)
                                if x_num > 30000 and x_num < 60000:
                                    return pd.to_datetime(x_num, unit='D', origin='1899-12-30')
                        except:
                            pass
                        return x

                    temp_col = df[col].apply(parse_excel_date)
                    
                    date_series_default = pd.to_datetime(temp_col, errors='coerce')
                    valid_default = date_series_default.notna().sum()
                    
                    date_series_df = pd.to_datetime(temp_col, errors='coerce', dayfirst=True)
                    valid_df = date_series_df.notna().sum()
                    
                    # Apply the one that yields the most valid dates
                    if non_empty_count > 0 and (max(valid_default, valid_df) / non_empty_count > 0.6 or is_date_col): 
                        date_series = date_series_df if valid_df > valid_default else date_series_default
                        # Normalize to YYYY-MM-DD
                        df[col] = date_series.dt.strftime('%Y-%m-%d').fillna(df[col])
                        continue 
                except:
                    pass

            # --- Number Cleaning ---
            try:
                # Remove commas for numeric check
                temp_col = df[col].apply(lambda x: str(x).replace(',', '') if isinstance(x, str) else x)
                numeric_series = pd.to_numeric(temp_col, errors='coerce')
                valid_numeric = numeric_series.notna().sum()
                
                if non_empty_count > 0 and valid_numeric / non_empty_count > 0.8:
                    # Check if it should be an integer
                    numeric_vals = numeric_series.dropna()
                    if not numeric_vals.empty and all(val == float(int(val)) for val in numeric_vals):
                        df[col] = numeric_series.round().astype('Int64')
                    else:
                        df[col] = numeric_series
            except:
                pass

        return df
