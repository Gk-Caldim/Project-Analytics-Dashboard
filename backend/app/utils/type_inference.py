# utils/type_inference.py
import pandas as pd

def infer_column_type(series):
    if pd.api.types.is_integer_dtype(series):
        return "integer"
    if pd.api.types.is_float_dtype(series):
        return "float"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "date"
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
        
    # Check if object/string column is actually dates
    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        non_nulls = series.dropna()
        if not non_nulls.empty:
            # We don't want to parse purely numeric strings (e.g. "2023", "45000") as dates implicitly here,
            # wait, if they are numeric strings, `pd.to_numeric` might work, but let's check if they look like dates.
            # Usually date strings have hyphens, slashes, or alphabets (e.g., "Jan").
            # Simple heuristic: if most strings are numeric, it's not a date.
            is_mostly_numeric = non_nulls.astype(str).str.isnumeric().mean() > 0.5
            if not is_mostly_numeric:
                try:
                    date_series_default = pd.to_datetime(non_nulls, errors='coerce')
                    valid_default = date_series_default.notna().sum()
                    
                    date_series_df = pd.to_datetime(non_nulls, errors='coerce', dayfirst=True)
                    valid_df = date_series_df.notna().sum()
                    
                    best_valid = max(valid_default, valid_df)
                    
                    if best_valid / len(non_nulls) >= 0.4:
                        return "date"
                except:
                    pass
    
    return "string"
