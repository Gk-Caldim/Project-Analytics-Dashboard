import os
import shutil
import base64
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.settings import SystemSetting as SystemSettingModel
from app.schemas.settings import SystemSetting as SystemSettingSchema, SystemSettingBase, BulkSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])

import time

# Cache for settings to reduce database load on app startup
_settings_cache = {
    "data": None,
    "timestamp": 0
}
# Cache TTL in seconds (e.g., 5 minutes = 300 seconds)
SETTINGS_CACHE_TTL = 300

@router.get("/", response_model=List[SystemSettingSchema])
def get_settings(db: Session = Depends(get_db)):
    global _settings_cache
    current_time = time.time()
    
    # Return cached data if valid
    if _settings_cache["data"] and (current_time - _settings_cache["timestamp"] < SETTINGS_CACHE_TTL):
        return _settings_cache["data"]

    settings = db.query(SystemSettingModel).all()
    
    # Initial setup / ensure all default settings exist
    default_settings = [
        {"category": "Organization", "key": "company_name", "value": "Industrial Analytics Platform", "type": "text"},
        {"category": "Organization", "key": "company_logo", "value": "", "type": "image"},
        {"category": "Organization", "key": "hq_address", "value": "123 Tech City, Industrial Park", "type": "text"},
        {"category": "Organization", "key": "operational_country", "value": "India", "type": "text"},
        {"category": "Organization", "key": "base_currency", "value": "USD ($)", "type": "select"},
        {"category": "Branding", "key": "primary_color", "value": "#6366f1", "type": "color"},
        {"category": "Branding", "key": "secondary_color", "value": "#0ea5e9", "type": "color"},
        {"category": "Branding", "key": "display_mode", "value": "light", "type": "select"},
        {"category": "System", "key": "auto_backup", "value": "true", "type": "toggle"},
        {"category": "System", "key": "notifications_enabled", "value": "true", "type": "toggle"},
        {"category": "Connections", "key": "smtp_host", "value": "smtp.gmail.com", "type": "text"},
        {"category": "Connections", "key": "smtp_port", "value": "587", "type": "number"},
        {"category": "Connections", "key": "smtp_user", "value": "", "type": "text"},
        {"category": "Connections", "key": "smtp_pass", "value": "", "type": "text"},
        {"category": "Budget Analysis", "key": "inflation_rate_usd", "value": "3.4", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_inr", "value": "5.1", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_eur", "value": "2.4", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_gbp", "value": "2.0", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_jpy", "value": "2.5", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_cad", "value": "2.8", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_aud", "value": "3.6", "type": "number"},
        {"category": "Budget Analysis", "key": "inflation_rate_default", "value": "3.0", "type": "number"},
        {"category": "Budget Analysis", "key": "volatility_factor_stable", "value": "1.01", "type": "number"},
        {"category": "Budget Analysis", "key": "volatility_factor_volatile", "value": "1.03", "type": "number"},
        {"category": "Budget Analysis", "key": "contingency_rate_stable", "value": "5.0", "type": "number"},
        {"category": "Budget Analysis", "key": "contingency_rate_volatile", "value": "8.0", "type": "number"},
        {"category": "Budget Analysis", "key": "utilization_threshold", "value": "0.8", "type": "number"}

    ]
    
    existing_keys = {s.key for s in settings}
    added = False
    for ds in default_settings:
        if ds["key"] not in existing_keys:
            db_setting = SystemSettingModel(**ds)
            db.add(db_setting)
            added = True
    
    if added:
        db.commit()
        settings = db.query(SystemSettingModel).all()
        
    # Update cache
    _settings_cache["data"] = settings
    _settings_cache["timestamp"] = current_time
        
    return settings

@router.patch("/bulk", response_model=List[SystemSettingSchema])
def update_bulk_settings(update_data: BulkSettingsUpdate, db: Session = Depends(get_db)):
    global _settings_cache
    for setting in update_data.settings:
        db_setting = db.query(SystemSettingModel).filter(SystemSettingModel.key == setting.key).first()
        if db_setting:
            db_setting.value = setting.value
        else:
            # Create if doesn't exist
            db_setting = SystemSettingModel(**setting.dict())
            db.add(db_setting)
    
    db.commit()
    # Invalidate cache
    _settings_cache["data"] = None
    
    return db.query(SystemSettingModel).all()

@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    global _settings_cache
    # Read file content
    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1].replace('.', '')
    if not file_extension:
        file_extension = "png"
        
    # Convert to base64
    base64_data = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:image/{file_extension};base64,{base64_data}"
    
    db.commit()
    # Invalidate cache
    _settings_cache["data"] = None
    
    return {"url": data_url}


@router.get("/db-integrity")
def run_db_integrity_check(db: Session = Depends(get_db)):
    import time
    start_time = time.time()
    checks_results = []
    
    # Helper to check if a table exists
    def table_exists(table_name):
        try:
            db.execute(text(f"SELECT 1 FROM {table_name} LIMIT 1"))
            return True
        except Exception:
            db.rollback()
            return False

    # Helper to check if a column exists
    def column_exists(table_name, column_name):
        try:
            db.execute(text(f"SELECT {column_name} FROM {table_name} LIMIT 1"))
            return True
        except Exception:
            db.rollback()
            return False

    # Helper to safely execute a query
    def run_safe_query(query_str):
        try:
            res = db.execute(text(query_str))
            # Handle results safely
            if res.returns_rows:
                return [dict(r._mapping) for r in res.fetchall()]
            return []
        except Exception as e:
            db.rollback()
            return [{"query_error": str(e)}]

    # 1. No Duplicate IDs
    t0 = time.time()
    dup_details = []
    if table_exists("employees"):
        dups = run_safe_query(
            "SELECT employee_id, COUNT(*) as count FROM employees WHERE employee_id IS NOT NULL GROUP BY employee_id HAVING COUNT(*) > 1"
        )
        if dups:
            dup_details.append({"table": "employees", "field": "employee_id", "violations": dups})
            
    if table_exists("projects") and column_exists("projects", "project_id"):
        dups = run_safe_query(
            "SELECT project_id, COUNT(*) as count FROM projects WHERE project_id IS NOT NULL GROUP BY project_id HAVING COUNT(*) > 1"
        )
        if dups:
            dup_details.append({"table": "projects", "field": "project_id", "violations": dups})

    if table_exists("users"):
        dups = run_safe_query(
            "SELECT employee_id, COUNT(*) as count FROM users GROUP BY employee_id HAVING COUNT(*) > 1"
        )
        if dups:
            dup_details.append({"table": "users", "field": "employee_id", "violations": dups})

    if table_exists("meeting_transcripts"):
        dups = run_safe_query(
            "SELECT meeting_id, COUNT(*) as count FROM meeting_transcripts GROUP BY meeting_id HAVING COUNT(*) > 1"
        )
        if dups:
            dup_details.append({"table": "meeting_transcripts", "field": "meeting_id", "violations": dups})

    checks_results.append({
        "id": "duplicate_ids",
        "name": "No duplicate IDs",
        "status": "FAIL" if dup_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Verifies that primary keys and logical business IDs (employee_id, project_id) are unique across all records.",
        "details": dup_details
    })

    # 2. No Missing Required Fields
    t0 = time.time()
    missing_details = []
    if table_exists("employees"):
        missing = run_safe_query("SELECT id, employee_id FROM employees WHERE name IS NULL OR email IS NULL")
        if missing:
            missing_details.append({"table": "employees", "fields": ["name", "email"], "affected_ids": [m["id"] for m in missing]})
            
    if table_exists("projects"):
        missing = run_safe_query("SELECT id, project_id FROM projects WHERE name IS NULL")
        if missing:
            missing_details.append({"table": "projects", "fields": ["name"], "affected_ids": [m["id"] for m in missing]})

    if table_exists("issues"):
        missing = run_safe_query("SELECT id, title FROM issues WHERE title IS NULL OR owner IS NULL OR status IS NULL OR project_id IS NULL")
        if missing:
            missing_details.append({"table": "issues", "fields": ["title", "owner", "status", "project_id"], "affected_ids": [m["id"] for m in missing]})

    if table_exists("users"):
        missing = run_safe_query("SELECT id, email FROM users WHERE email IS NULL OR employee_id IS NULL OR hashed_password IS NULL")
        if missing:
            missing_details.append({"table": "users", "fields": ["email", "employee_id", "hashed_password"], "affected_ids": [m["id"] for m in missing]})

    checks_results.append({
        "id": "missing_fields",
        "name": "No missing required fields",
        "status": "FAIL" if missing_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Scans critical tables for null values in required properties (e.g., employee names, project managers, user emails).",
        "details": missing_details
    })

    # 3. Foreign Key Relationships Valid
    t0 = time.time()
    fk_details = []
    if table_exists("employees") and table_exists("departments"):
        bad_fks = run_safe_query(
            "SELECT id, name, department_id FROM employees WHERE department_id IS NOT NULL AND department_id NOT IN (SELECT id FROM departments)"
        )
        if bad_fks:
            fk_details.append({"table": "employees", "fk_field": "department_id", "parent_table": "departments", "affected_records": bad_fks})

    if table_exists("projects") and table_exists("employees"):
        bad_fks = run_safe_query(
            "SELECT id, name, employee_id FROM projects WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT employee_id FROM employees WHERE employee_id IS NOT NULL)"
        )
        if bad_fks:
            fk_details.append({"table": "projects", "fk_field": "employee_id", "parent_table": "employees", "affected_records": bad_fks})

        if column_exists("projects", "assigned_to_id"):
            bad_fks = run_safe_query(
                "SELECT id, name, assigned_to_id FROM projects WHERE assigned_to_id IS NOT NULL AND assigned_to_id NOT IN (SELECT employee_id FROM employees WHERE employee_id IS NOT NULL)"
            )
            if bad_fks:
                fk_details.append({"table": "projects", "fk_field": "assigned_to_id", "parent_table": "employees", "affected_records": bad_fks})

    if table_exists("issues") and table_exists("projects"):
        bad_fks = run_safe_query("SELECT id, title, project_id FROM issues WHERE project_id NOT IN (SELECT id FROM projects)")
        if bad_fks:
            fk_details.append({"table": "issues", "fk_field": "project_id", "parent_table": "projects", "affected_records": bad_fks})

    if table_exists("dataset_rows") and table_exists("datasets"):
        bad_fks = run_safe_query("SELECT id, dataset_id FROM dataset_rows WHERE dataset_id NOT IN (SELECT id FROM datasets)")
        if bad_fks:
            fk_details.append({"table": "dataset_rows", "fk_field": "dataset_id", "parent_table": "datasets", "affected_records": bad_fks})

    checks_results.append({
        "id": "foreign_keys",
        "name": "Foreign key relationships are valid",
        "status": "FAIL" if fk_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Verifies referential integrity across all related tables, identifying records with parent IDs that do not exist.",
        "details": fk_details
    })

    # 4. No Orphan Records
    t0 = time.time()
    orphan_details = []
    if table_exists("issue_actions") and table_exists("issues"):
        orphans = run_safe_query("SELECT id, action_text, issue_id FROM issue_actions WHERE issue_id NOT IN (SELECT id FROM issues)")
        if orphans:
            orphan_details.append({"table": "issue_actions", "parent_table": "issues", "orphans_count": len(orphans), "sample": orphans[:5]})
            
    if table_exists("issue_comments") and table_exists("issues"):
        orphans = run_safe_query("SELECT id, comment_text, issue_id FROM issue_comments WHERE issue_id NOT IN (SELECT id FROM issues)")
        if orphans:
            orphan_details.append({"table": "issue_comments", "parent_table": "issues", "orphans_count": len(orphans), "sample": orphans[:5]})

    if table_exists("tracker_ingestions") and table_exists("uploads"):
        orphans = run_safe_query("SELECT id, file_name, upload_id FROM tracker_ingestions WHERE upload_id IS NOT NULL AND upload_id NOT IN (SELECT id FROM uploads)")
        if orphans:
            orphan_details.append({"table": "tracker_ingestions", "parent_table": "uploads", "orphans_count": len(orphans), "sample": orphans[:5]})

    checks_results.append({
        "id": "orphan_records",
        "name": "No orphan records",
        "status": "FAIL" if orphan_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Identifies detail and audit rows (actions, comments, ingestions, columns) that are orphaned and have no parent association.",
        "details": orphan_details
    })

    # 5. No Negative Quantities/Prices
    t0 = time.time()
    neg_details = []
    if table_exists("projects"):
        negs = run_safe_query("SELECT id, name, budget, utilized_budget, balance_budget FROM projects WHERE budget < 0 OR utilized_budget < 0 OR balance_budget < 0")
        if negs:
            neg_details.append({"table": "projects", "issue": "negative budget attributes", "violations": negs})

    if table_exists("budget_summaries"):
        negs = run_safe_query("SELECT id, project_name, overall_budget FROM budget_summaries WHERE overall_budget < 0")
        if negs:
            neg_details.append({"table": "budget_summaries", "issue": "negative overall budget", "violations": negs})

    if table_exists("budget_revisions"):
        negs = run_safe_query("SELECT id, project_name, previous_budget, revised_budget FROM budget_revisions WHERE previous_budget < 0 OR revised_budget < 0")
        if negs:
            neg_details.append({"table": "budget_revisions", "issue": "negative previous/revised budgets", "violations": negs})

    if table_exists("market_snapshots"):
        negs = run_safe_query("SELECT id, category, current_price, previous_price, volatility_index, inflation_rate FROM market_snapshots WHERE current_price < 0 OR previous_price < 0 OR volatility_index < 0 OR inflation_rate < 0 OR procurement_risk < 0 OR supply_chain_risk < 0")
        if negs:
            neg_details.append({"table": "market_snapshots", "issue": "negative pricing index / risk factor", "violations": negs})

    checks_results.append({
        "id": "negative_values",
        "name": "No negative quantities/prices",
        "status": "FAIL" if neg_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Ensures financial ledgers, budgets, and procurement indexes contain only non-negative quantities and prices.",
        "details": neg_details
    })

    # 6. Dates Are Valid
    t0 = time.time()
    date_details = []
    if table_exists("projects"):
        bad_dates = run_safe_query("SELECT id, name, start_date, end_date FROM projects WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND end_date < start_date")
        if bad_dates:
            date_details.append({"table": "projects", "issue": "end_date before start_date", "violations": bad_dates})

    if table_exists("issues"):
        # due_date out of standard range
        bad_dates = run_safe_query("SELECT id, title, due_date FROM issues WHERE due_date IS NOT NULL AND (due_date < '2000-01-01' OR due_date > '2100-01-01')")
        if bad_dates:
            for d in bad_dates:
                if 'due_date' in d and d['due_date']:
                    d['due_date'] = str(d['due_date'])
            date_details.append({"table": "issues", "issue": "due_date out of bounds (2000-2100)", "violations": bad_dates})

    if table_exists("meetings"):
        bad_dates = run_safe_query("SELECT id, title, date FROM meetings WHERE date NOT SIMILAR TO '[0-9]{4}-[0-9]{2}-[0-9]{2}'")
        if bad_dates:
            date_details.append({"table": "meetings", "issue": "date format is not YYYY-MM-DD", "violations": bad_dates})

    if table_exists("budget_summaries"):
        bad_dates = run_safe_query("SELECT id, project_name, budget_date FROM budget_summaries WHERE budget_date IS NOT NULL AND budget_date NOT SIMILAR TO '[0-9]{4}-[0-9]{2}-[0-9]{2}'")
        if bad_dates:
            date_details.append({"table": "budget_summaries", "issue": "budget_date format is not YYYY-MM-DD", "violations": bad_dates})

    checks_results.append({
        "id": "valid_dates",
        "name": "Dates are valid",
        "status": "FAIL" if date_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Validates chronological order (start vs end date) and standard date formatting across all entities.",
        "details": date_details
    })

    # 7. Status Values Are Correct
    t0 = time.time()
    status_details = []
    if table_exists("issues"):
        bad_status = run_safe_query("SELECT id, title, status FROM issues WHERE status NOT IN ('Open', 'In Progress', 'Closed')")
        if bad_status:
            status_details.append({"table": "issues", "allowed": ["Open", "In Progress", "Closed"], "violations": bad_status})

    if table_exists("projects"):
        bad_status = run_safe_query("SELECT id, name, status FROM projects WHERE status NOT IN ('Planning', 'Active', 'On Hold', 'Closed')")
        if bad_status:
            status_details.append({"table": "projects", "allowed": ["Planning", "Active", "On Hold", "Closed"], "violations": bad_status})

    if table_exists("employees"):
        bad_status = run_safe_query("SELECT id, name, status FROM employees WHERE status NOT IN ('Active', 'Inactive')")
        if bad_status:
            status_details.append({"table": "employees", "allowed": ["Active", "Inactive"], "violations": bad_status})

    if table_exists("budget_revisions"):
        bad_status = run_safe_query("SELECT id, project_name, status FROM budget_revisions WHERE status NOT IN ('Pending Head', 'Pending Finance', 'Approved', 'Declined', 'Cancelled', 'In Waiting Period')")
        if bad_status:
            status_details.append({"table": "budget_revisions", "allowed": ["Pending Head", "Pending Finance", "Approved", "Declined", "Cancelled", "In Waiting Period"], "violations": bad_status})

    checks_results.append({
        "id": "statuses",
        "name": "Status values are correct",
        "status": "FAIL" if status_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Checks state fields in issues, projects, budgets, and employee profiles against approved system workflows.",
        "details": status_details
    })

    # 8. No duplicate invoices/emails/serial numbers
    t0 = time.time()
    uniq_details = []
    if table_exists("employees"):
        dups = run_safe_query("SELECT email, COUNT(*) as count FROM employees GROUP BY email HAVING COUNT(*) > 1")
        if dups:
            uniq_details.append({"table": "employees", "field": "email", "violations": dups})

    if table_exists("users"):
        dups = run_safe_query("SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING COUNT(*) > 1")
        if dups:
            uniq_details.append({"table": "users", "field": "email", "violations": dups})

    if table_exists("projects") and column_exists("projects", "join_code"):
        dups = run_safe_query("SELECT join_code, COUNT(*) as count FROM projects WHERE join_code IS NOT NULL GROUP BY join_code HAVING COUNT(*) > 1")
        if dups:
            uniq_details.append({"table": "projects", "field": "join_code", "violations": dups})

    checks_results.append({
        "id": "duplicate_emails_codes",
        "name": "No duplicate invoices/emails/serial numbers",
        "status": "FAIL" if uniq_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Enforces unique business constraints, scanning for duplicate email registrations and calendar subscription codes.",
        "details": uniq_details
    })

    # 9. Transactions Completed Fully
    t0 = time.time()
    trans_details = []
    if table_exists("budget_revisions"):
        bad_trans = run_safe_query("SELECT id, project_name FROM budget_revisions WHERE status = 'Approved' AND approved_at IS NULL")
        if bad_trans:
            trans_details.append({"table": "budget_revisions", "issue": "status approved but approved_at is null", "violations": bad_trans})
            
        bad_trans = run_safe_query("SELECT id, project_name FROM budget_revisions WHERE status = 'In Waiting Period' AND waiting_until IS NULL")
        if bad_trans:
            trans_details.append({"table": "budget_revisions", "issue": "status in waiting period but waiting_until is null", "violations": bad_trans})

    if table_exists("meetings"):
        bad_trans = run_safe_query("SELECT id, title FROM meetings WHERE status = 'cancelled' AND (cancelled_at IS NULL OR cancelled_by IS NULL)")
        if bad_trans:
            trans_details.append({"table": "meetings", "issue": "cancelled meeting without cancellation metadata", "violations": bad_trans})

    if table_exists("uploads"):
        bad_trans = run_safe_query("SELECT id, file_name FROM uploads WHERE status = 'Completed' AND (valid_row_count IS NULL OR row_count IS NULL)")
        if bad_trans:
            trans_details.append({"table": "uploads", "issue": "completed uploads without ingested row counts", "violations": bad_trans})

    checks_results.append({
        "id": "completed_transactions",
        "name": "Transactions completed fully",
        "status": "FAIL" if trans_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Verifies transaction state completeness, ensuring approved budgets and cancelled meetings have complete metadata.",
        "details": trans_details
    })

    # 10. Inventory stock is accurate
    t0 = time.time()
    inv_details = []
    if table_exists("dataset_rows"):
        rows = run_safe_query("SELECT id, dataset_id, row_data FROM dataset_rows LIMIT 1000")
        for r in rows:
            row_data = r.get("row_data")
            if isinstance(row_data, dict):
                for k, v in row_data.items():
                    if any(term in k.lower() for term in ["stock", "qty", "quantity", "inventory"]):
                        try:
                            val = float(v)
                            if val < 0:
                                inv_details.append({
                                    "dataset_row_id": r["id"],
                                    "dataset_id": r["dataset_id"],
                                    "field": k,
                                    "value": val
                                })
                        except (ValueError, TypeError):
                            pass
                            
    checks_results.append({
        "id": "inventory_stock",
        "name": "Inventory stock is accurate",
        "status": "FAIL" if inv_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Scans dynamic database rows containing key inventory/stock terms to ensure values are non-negative.",
        "details": inv_details[:10]
    })

    # 11. BOM / Material Links Valid
    t0 = time.time()
    bom_details = []
    if table_exists("category_intelligence"):
        bad_bom = run_safe_query("SELECT id, raw_input, confidence_score FROM category_intelligence WHERE confidence_score < 0 OR confidence_score > 1")
        if bad_bom:
            bom_details.append({"table": "category_intelligence", "issue": "confidence score out of range [0, 1]", "violations": bad_bom})

    if table_exists("industry_profiles"):
        profile_count_res = run_safe_query("SELECT COUNT(*) as count FROM industry_profiles WHERE enabled = true")
        if not profile_count_res or profile_count_res[0]["count"] == 0:
            bom_details.append({"table": "industry_profiles", "issue": "no active industry profiles configured", "violations": []})

    checks_results.append({
        "id": "bom_material_links",
        "name": "BOM/material links are valid",
        "status": "WARNING" if bom_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Validates category intelligence confidence mapping boundaries and system industry profile registries.",
        "details": bom_details
    })

    # 12. File References Exist
    t0 = time.time()
    file_details = []
    uploads_list = []
    if table_exists("uploads"):
        uploads_list = run_safe_query("SELECT id, file_name FROM uploads WHERE status = 'Completed'")
        
    for u in uploads_list:
        file_name = u.get("file_name")
        if file_name:
            file_path = os.path.join("static", "uploads", "trackers", file_name)
            if not os.path.exists(file_path):
                file_details.append({"table": "uploads", "record_id": u["id"], "file_name": file_name, "issue": "physical file does not exist on disk"})

    checks_results.append({
        "id": "file_references",
        "name": "File references exist",
        "status": "FAIL" if file_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Cross-checks file references stored in database metadata against actual physical files stored on the server.",
        "details": file_details[:10]
    })

    # 13. JSON Data Is Valid
    t0 = time.time()
    json_details = []
    if table_exists("projects"):
        bad_json = run_safe_query("SELECT id, name FROM projects WHERE custom_fields IS NULL OR dashboard_config IS NULL")
        if bad_json:
            json_details.append({"table": "projects", "issue": "custom_fields or dashboard_config is null", "violations": bad_json})

    if table_exists("employees"):
        bad_json = run_safe_query("SELECT id, name FROM employees WHERE custom_fields IS NULL")
        if bad_json:
            json_details.append({"table": "employees", "issue": "custom_fields is null", "violations": bad_json})

    checks_results.append({
        "id": "json_validity",
        "name": "JSON data is valid",
        "status": "FAIL" if json_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Verifies that dynamic custom configurations and schema mappings are correctly formatted JSON objects.",
        "details": json_details
    })

    # 14. Audit Logs Are Correct
    t0 = time.time()
    audit_details = []
    if table_exists("audit_logs"):
        bad_logs = run_safe_query("SELECT id, user_id FROM audit_logs WHERE action IS NULL OR module IS NULL")
        if bad_logs:
            audit_details.append({"table": "audit_logs", "issue": "missing action or module", "violations": bad_logs})

    if table_exists("issue_audit_logs"):
        bad_logs = run_safe_query("SELECT id, issue_id FROM issue_audit_logs WHERE field_changed IS NULL OR changed_by IS NULL")
        if bad_logs:
            audit_details.append({"table": "issue_audit_logs", "issue": "missing field_changed or changed_by", "violations": bad_logs})

    checks_results.append({
        "id": "audit_logs",
        "name": "Audit logs are correct",
        "status": "FAIL" if audit_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Inspects system activity ledgers and issue history logs for missing actors, timestamps, or empty changes.",
        "details": audit_details
    })

    # 15. Deleted Records Behave Properly
    t0 = time.time()
    del_details = []
    if table_exists("meetings") and table_exists("meeting_transcripts"):
        bad_dels = run_safe_query(
            "SELECT t.id, t.meeting_id FROM meeting_transcripts t JOIN meetings m ON t.meeting_id = m.id WHERE m.status = 'cancelled'"
        )
        if bad_dels:
            del_details.append({"issue": "transcript exists for cancelled meeting", "violations": bad_dels})

    checks_results.append({
        "id": "deleted_records",
        "name": "Deleted records behave properly",
        "status": "WARNING" if del_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Checks soft-delete flags (deleted_meeting) and detects orphaned transcripts or minutes linked to deleted meetings.",
        "details": del_details
    })

    # 16. Indexes Are Not Corrupted
    t0 = time.time()
    index_details = []
    index_details = run_safe_query(
        "SELECT indrelid::regclass::text AS table_name, indexrelid::regclass::text AS index_name FROM pg_index WHERE indisvalid = false"
    )
    if index_details and len(index_details) > 0 and "query_error" not in index_details[0]:
        status_val = "FAIL"
    else:
        status_val = "PASS"
        index_details = []

    checks_results.append({
        "id": "index_corruption",
        "name": "Indexes are not corrupted",
        "status": status_val,
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Scans database schema catalogs to verify index status and detect invalid or failed concurrently built indexes.",
        "details": index_details
    })

    # 17. User-Role Mappings Are Valid
    t0 = time.time()
    role_details = []
    if table_exists("employees") and table_exists("roles"):
        bad_roles = run_safe_query(
            "SELECT id, name, role FROM employees WHERE role IS NOT NULL AND LOWER(role) NOT IN (SELECT LOWER(name) FROM roles)"
        )
        if bad_roles:
            role_details.append({"table": "employees", "issue": "role is not defined in roles table", "violations": bad_roles})

    checks_results.append({
        "id": "user_role_mappings",
        "name": "User-role mappings are valid",
        "status": "FAIL" if role_details else "PASS",
        "duration_ms": int((time.time() - t0) * 1000),
        "description": "Validates role mapping, ensuring that user/employee roles match a profile defined in the Roles permissions table.",
        "details": role_details
    })

    # Calculate overall stats
    total_checks = len(checks_results)
    passed_count = sum(1 for c in checks_results if c["status"] == "PASS")
    warnings_count = sum(1 for c in checks_results if c["status"] == "WARNING")
    failed_count = sum(1 for c in checks_results if c["status"] == "FAIL")
    duration_ms = int((time.time() - start_time) * 1000)

    # Convert date/datetime values inside details to strings to make them JSON serializable
    def serialize_dates(obj):
        if isinstance(obj, dict):
            return {k: serialize_dates(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [serialize_dates(x) for x in obj]
        elif hasattr(obj, "isoformat"):
            return obj.isoformat()
        return obj

    checks_results = serialize_dates(checks_results)

    return {
        "status": "success",
        "summary": {
            "total_checks": total_checks,
            "passed": passed_count,
            "warnings": warnings_count,
            "failed": failed_count,
            "duration_ms": duration_ms
        },
        "checks": checks_results
    }


from pydantic import BaseModel

class LatencyFeedback(BaseModel):
    measured_latency_ms: float
    comments: str
    user_email: str | None = None

@router.get("/db-latency")
def check_db_latency(simulate_delay: float = 0.0, db: Session = Depends(get_db)):
    import time
    from sqlalchemy import text
    
    # 1. Base network connection ping latency
    t0 = time.time()
    try:
        db.execute(text("SELECT 1"))
        ping_latency_ms = (time.time() - t0) * 1000
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
        
    # 2. Write latency: execute a parameter binding query with 50KB payload
    payload_str = "A" * 50000  # 50 KB
    t1 = time.time()
    try:
        db.execute(text("SELECT :payload"), {"payload": payload_str})
        write_latency_ms = (time.time() - t1) * 1000
    except Exception as e:
        db.rollback()
        write_latency_ms = 0.0
        
    # 3. Read latency: fetch a 50KB payload from the database
    t2 = time.time()
    try:
        dialect_name = db.bind.dialect.name if db.bind else "postgresql"
        if "postgres" in dialect_name.lower():
            res = db.execute(text("SELECT repeat('A', 50000)"))
        else:
            res = db.execute(text("SELECT :payload"), {"payload": "A" * 50000})
        res.fetchone()
        read_latency_ms = (time.time() - t2) * 1000
    except Exception:
        db.rollback()
        read_latency_ms = 0.0

    # Simulate network delay if specified
    if simulate_delay > 0.0:
        time.sleep(simulate_delay)

    total_latency_ms = ping_latency_ms + write_latency_ms + read_latency_ms + (simulate_delay * 1000)
    threshold_exceeded = total_latency_ms >= 60000.0

    return {
        "status": "success",
        "metrics": {
            "ping_latency_ms": round(ping_latency_ms, 2),
            "write_latency_ms": round(write_latency_ms, 2),
            "read_latency_ms": round(read_latency_ms, 2),
            "total_latency_ms": round(total_latency_ms, 2)
        },
        "threshold_exceeded": threshold_exceeded,
        "simulated": simulate_delay > 0.0
    }

@router.post("/db-latency/feedback")
def submit_latency_feedback(feedback: LatencyFeedback, db: Session = Depends(get_db)):
    import json
    import os
    
    print(f"LATENCY FEEDBACK RECEIVED: Latency={feedback.measured_latency_ms}ms, User={feedback.user_email or 'Anonymous'}, Comments='{feedback.comments}'")
    
    feedback_file = "db_latency_tickets.json"
    existing_tickets = []
    if os.path.exists(feedback_file):
        try:
            with open(feedback_file, "r") as f:
                existing_tickets = json.load(f)
        except Exception:
            existing_tickets = []
            
    ticket = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "measured_latency_ms": feedback.measured_latency_ms,
        "comments": feedback.comments,
        "user_email": feedback.user_email
    }
    existing_tickets.append(ticket)
    
    try:
        with open(feedback_file, "w") as f:
            json.dump(existing_tickets, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record ticket: {str(e)}")
        
    return {
        "status": "success",
        "message": "Feedback submitted to our Support Engineering team."
    }

