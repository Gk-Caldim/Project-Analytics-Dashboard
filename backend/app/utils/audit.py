from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

def log_activity(
    db: Session,
    user_id: Optional[str],
    action: str,
    module: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Standardized utility to log system activity to the audit_logs table.
    """
    try:
        new_log = AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            entity_id=entity_id,
            details=details or {}
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to log audit activity: {str(e)}")
        # We don't raise as audit logging shouldn't crash the main transaction
        return None

def generate_diff_summary(old_obj: Any, new_data: Dict[str, Any]) -> str:
    """
    Compares an existing SQLAlchemy object with a dictionary of new data
    and returns a human-readable summary of the changes.
    """
    changes = []
    
    # Handle Pydantic objects or dictionaries
    if hasattr(new_data, 'dict'):
        new_data_dict = new_data.dict(exclude_unset=True)
    elif hasattr(new_data, 'model_dump'):
        new_data_dict = new_data.model_dump(exclude_unset=True)
    else:
        new_data_dict = new_data
        
    for key, value in new_data_dict.items():
        if value is None:
            continue
            
        old_val = getattr(old_obj, key, None)
        
        # Skip internal SQLAlchemy or identity fields
        if key.startswith('_') or key == 'id' or key.endswith('_at') or key == 'employee_id':
            continue
            
        # Stringify comparison to handle different types safely
        if str(old_val) != str(value):
            # Mask sensitive fields
            display_val = "********" if "password" in key.lower() else str(value)
            
            field_name = key.replace('_', ' ').title()
            changes.append(f"{field_name} set to '{display_val}'")
            
    if not changes:
        return "No specific field changes recorded"
        
    return "; ".join(changes)
