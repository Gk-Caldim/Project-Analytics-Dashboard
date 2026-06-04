import os
import sys
import time
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.issue import Issue

db = SessionLocal()

# Helper to execute EXPLAIN ANALYZE and retrieve execution details
def profile_query(query_name, sql_str, params=None):
    print(f"\n========================================\nPROFILING: {query_name}\n========================================")
    print(f"SQL:\n{sql_str}\n")
    
    # 1. Measure Application-level timing (including network RTT)
    start_app = time.perf_counter()
    res = db.execute(text(sql_str), params or {})
    rows = res.fetchall()
    app_time = (time.perf_counter() - start_app) * 1000
    
    # 2. Run EXPLAIN ANALYZE to get Postgres internal execution time
    explain_sql = f"EXPLAIN ANALYZE {sql_str}"
    explain_res = db.execute(text(explain_sql), params or {})
    explain_output = [row[0] for row in explain_res.fetchall()]
    
    # Extract execution time from EXPLAIN output
    postgres_time = None
    for line in explain_output:
        if "Execution Time:" in line or "Execution time:" in line:
            # e.g., "Execution Time: 0.123 ms"
            postgres_time = line
            break
            
    print("EXPLAIN ANALYZE Output:")
    print("\n".join(explain_output))
    print("-" * 50)
    print(f"PostgreSQL Execution Time: {postgres_time}")
    print(f"Application-Measured Time (with Network RTT): {app_time:.2f}ms")
    print(f"Rows Returned: {len(rows)}")
    return app_time, postgres_time

try:
    project_id = 15
    
    # Query 1: Project Lookup
    sql_q1 = """
    SELECT projects.id AS projects_id, projects.project_id AS projects_project_id, 
           projects.name AS projects_name, projects.description AS projects_description, 
           projects.status AS projects_status, projects.budget AS projects_budget, 
           projects.utilized_budget AS projects_utilized_budget, projects.balance_budget AS projects_balance_budget, 
           projects.project_manager AS projects_project_manager, projects.start_date AS projects_start_date, 
           projects.end_date AS projects_end_date, projects.timeline_months AS projects_timeline_months, 
           projects.department AS projects_department, projects.employee_id AS projects_employee_id, 
           projects.employee_name AS projects_employee_name, projects.assigned_to_id AS projects_assigned_to_id, 
           projects.assigned_to_name AS projects_assigned_to_name, projects.custom_fields AS projects_custom_fields, 
           projects.dashboard_config AS projects_dashboard_config, projects.created_at AS projects_created_at, 
           projects.join_code AS projects_join_code 
    FROM projects 
    WHERE projects.id = :project_id 
    LIMIT 1;
    """
    profile_query("Query 1: Project Lookup", sql_q1, {"project_id": project_id})
    
    # Query 2: Latest Ingestion Query
    sql_q2 = """
    SELECT tracker_ingestions.id AS tracker_ingestions_id, tracker_ingestions.project_id AS tracker_ingestions_project_id, 
           tracker_ingestions.upload_id AS tracker_ingestions_upload_id, tracker_ingestions.file_name AS tracker_ingestions_file_name, 
           tracker_ingestions.data AS tracker_ingestions_data, tracker_ingestions.uploaded_by AS tracker_ingestions_uploaded_by, 
           tracker_ingestions.created_at AS tracker_ingestions_created_at 
    FROM tracker_ingestions 
    JOIN (
        SELECT tracker_ingestions.file_name AS file_name, max(tracker_ingestions.created_at) AS max_created 
        FROM tracker_ingestions 
        WHERE tracker_ingestions.project_id = :project_id 
        GROUP BY tracker_ingestions.file_name
    ) AS anon_1 
    ON tracker_ingestions.file_name = anon_1.file_name 
    AND tracker_ingestions.created_at = anon_1.max_created 
    WHERE tracker_ingestions.project_id = :project_id;
    """
    profile_query("Query 2: Latest Tracker Ingestion JOIN", sql_q2, {"project_id": project_id})
    
    # Query 3A: Issues Query
    sql_q3a = """
    SELECT issues.id AS issues_id, issues.project_id AS issues_project_id, issues.upload_id AS issues_upload_id, 
           issues.source AS issues_source, issues.title AS issues_title, issues.description AS issues_description, 
           issues.owner AS issues_owner, issues.department AS issues_department, issues.created_by AS issues_created_by, 
           issues.priority AS issues_priority, issues.severity_score AS issues_severity_score, issues.status AS issues_status, 
           issues.due_date AS issues_due_date, issues.meeting_id AS issues_meeting_id, issues.sync_id AS issues_sync_id, 
           issues.action_taken AS issues_action_taken, issues.milestone_name AS issues_milestone_name, 
           issues.created_at AS issues_created_at, issues.updated_at AS issues_updated_at, issues.resolved_at AS issues_resolved_at 
    FROM issues 
    WHERE issues.project_id = :project_id;
    """
    profile_query("Query 3A: Issues List", sql_q3a, {"project_id": project_id})
    
    # Query 3B: Escalations Query (requires issue IDs first)
    issues = db.query(Issue).filter(Issue.project_id == project_id).all()
    issue_ids = [iss.id for iss in issues]
    
    if issue_ids:
        # Construct list for SQL format e.g. (1, 2, 3)
        issue_ids_placeholder = ", ".join(str(i) for i in issue_ids)
        sql_q3b = f"""
        SELECT issue_escalations.id AS issue_escalations_id, 
               issue_escalations.issue_id AS issue_escalations_issue_id, 
               issue_escalations.escalation_level AS issue_escalations_escalation_level, 
               issue_escalations.escalated_to AS issue_escalations_escalated_to, 
               issue_escalations.escalated_at AS issue_escalations_escalated_at, 
               issue_escalations.reason AS issue_escalations_reason, 
               issue_escalations.is_active AS issue_escalations_is_active 
        FROM issue_escalations 
        WHERE issue_escalations.issue_id IN ({issue_ids_placeholder});
        """
        profile_query("Query 3B: Issue Escalations List", sql_q3b)
    else:
        print("\nNo issues found to query escalations.")
        
finally:
    db.close()
