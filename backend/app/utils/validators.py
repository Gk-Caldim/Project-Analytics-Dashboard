import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from sqlalchemy.orm import Session
from app.models.employee_column import EmployeeColumn
from app.models.project_column import ProjectColumn

def validate_text(value: Any, rules: Dict) -> bool:
    if value is None: return True
    return isinstance(value, str)

def validate_integer(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    try:
        int_val = int(value)
        return True
    except (ValueError, TypeError):
        return False

def validate_decimal(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False

def validate_currency(value: Any, rules: Dict) -> bool:
    return validate_decimal(value, rules)

def validate_phone(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    str_val = str(value)
    # allow only digits, reject float values, reject text/special characters, allow exactly 10 digits
    return bool(re.match(r"^\d{10}$", str_val))

def validate_email(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    str_val = str(value)
    return bool(re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", str_val))

def validate_date(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    if isinstance(value, datetime): return True
    try:
        datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        return True
    except (ValueError, TypeError):
        try:
            datetime.strptime(str(value), "%Y-%m-%d")
            return True
        except ValueError:
            return False

def validate_boolean(value: Any, rules: Dict) -> bool:
    if value is None: return True
    return isinstance(value, bool) or str(value).lower() in ['true', 'false', '1', '0']

def validate_url(value: Any, rules: Dict) -> bool:
    if value is None or value == "": return True
    str_val = str(value)
    return bool(re.match(r"^https?://", str_val))

def validate_json(value: Any, rules: Dict) -> bool:
    if value is None: return True
    return isinstance(value, (dict, list))

VALIDATORS: Dict[str, Callable[[Any, Dict], bool]] = {
    "text": validate_text,
    "long_text": validate_text,
    "integer": validate_integer,
    "decimal": validate_decimal,
    "currency": validate_currency,
    "percentage": validate_decimal,
    "phone": validate_phone,
    "email": validate_email,
    "date": validate_date,
    "datetime": validate_date,
    "boolean": validate_boolean,
    "url": validate_url,
    "json": validate_json,
    "dropdown": lambda v, r: True, # Logic depends on options in rules
    "multi_select": lambda v, r: True,
    "status": lambda v, r: True,
    "priority": lambda v, r: True,
    "user": lambda v, r: True,
    "file": lambda v, r: True,
}

def validate_custom_fields(db: Session, model_type: str, custom_fields: Dict) -> List[str]:
    """
    Validates custom fields against the stored schema in the database.
    model_type: 'employee' or 'project'
    """
    if not custom_fields:
        return []

    errors = []
    
    if model_type == 'employee':
        columns = db.query(EmployeeColumn).all()
    else:
        columns = db.query(ProjectColumn).all()
        
    col_map = {col.column_name: col for col in columns}
    
    for field_name, value in custom_fields.items():
        if field_name not in col_map:
            # Maybe allow unknown fields or log them? For now, just skip.
            continue
            
        col = col_map[field_name]
        data_type = col.data_type
        rules = col.validation_rules or {}
        
        # Check required
        if col.is_required and (value is None or value == ""):
            errors.append(f"Field '{col.column_label}' is required.")
            continue
            
        # Check data type validation
        validator = VALIDATORS.get(data_type)
        if validator:
            if not validator(value, rules):
                errors.append(f"Invalid value for '{col.column_label}'. Expected type: {data_type}.")
                
        # Regex validation if present in rules
        if rules.get("regex") and value:
            if not bool(re.match(rules["regex"], str(value))):
                errors.append(f"Field '{col.column_label}' does not match the required pattern.")
                
    return errors
