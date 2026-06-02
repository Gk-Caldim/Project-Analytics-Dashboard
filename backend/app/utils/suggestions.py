def suggest_data_type(column_name: str) -> str:
    """
    Suggests a data type based on the column name.
    """
    name = column_name.lower()
    
    if any(k in name for k in ["phone", "mobile", "contact"]):
        return "phone"
    if "email" in name:
        return "email"
    if any(k in name for k in ["date", "time", "deadline", "started", "ended"]):
        return "date"
    if any(k in name for k in ["amount", "price", "cost", "budget", "currency", "salary"]):
        return "currency"
    if "percent" in name:
        return "percentage"
    if any(k in name for k in ["count", "total", "quantity", "integer"]):
        return "integer"
    if any(k in name for k in ["score", "rating", "decimal", "float"]):
        return "decimal"
    if any(k in name for k in ["is_", "has_", "active", "enabled", "boolean", "check"]):
        return "boolean"
    if any(k in name for k in ["url", "link", "website"]):
        return "url"
    if any(k in name for k in ["desc", "note", "comment", "long"]):
        return "long_text"
    if any(k in name for k in ["file", "attachment", "image", "pdf"]):
        return "file"
    if any(k in name for k in ["status", "state"]):
        return "status"
    if any(k in name for k in ["priority", "level"]):
        return "priority"
    if any(k in name for k in ["user", "member", "owner", "assignee"]):
        return "user"
        
    return "text"
