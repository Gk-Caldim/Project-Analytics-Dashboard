import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_manual_test_plan():
    # 1. Create workbook
    wb = openpyxl.Workbook()
    
    # Define color schemes (Modern Enterprise Slate Theme)
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    
    title_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    title_font = Font(name="Segoe UI", size=16, bold=True, color="FFFFFF")
    
    section_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    section_font = Font(name="Segoe UI", size=12, bold=True, color="0F172A")
    
    # Status styling
    pass_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    pass_font = Font(name="Segoe UI", size=10, color="15803D", bold=True)
    
    fail_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    fail_font = Font(name="Segoe UI", size=10, color="B91C1C", bold=True)
    
    blocked_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    blocked_font = Font(name="Segoe UI", size=10, color="B45309", bold=True)
    
    regular_font = Font(name="Segoe UI", size=10, color="000000")
    bold_font = Font(name="Segoe UI", size=10, color="000000", bold=True)
    
    # Borders
    thin_border_side = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    thick_bottom = Border(bottom=Side(border_style="medium", color="1E293B"))
    double_bottom = Border(bottom=Side(border_style="double", color="1E293B"), top=Side(border_style="thin", color="CBD5E1"))
    
    # Alignments
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    center_align = Alignment(horizontal="center", vertical="center")
    right_align = Alignment(horizontal="right", vertical="center")
    
    # ── SHEET 1: SUMMARY DASHBOARD ──
    ws_summary = wb.active
    ws_summary.title = "Summary Dashboard"
    ws_summary.views.sheetView[0].showGridLines = True
    
    # Title Block
    ws_summary.merge_cells("A1:G2")
    title_cell = ws_summary["A1"]
    title_cell.value = "CALDIM Project Analytics Dashboard - QA Manual Testing Summary"
    title_cell.font = title_font
    title_cell.fill = title_fill
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Section Header: Overall Statistics
    ws_summary.merge_cells("A4:C4")
    stats_hdr = ws_summary["A4"]
    stats_hdr.value = "Overall Execution Statistics"
    stats_hdr.font = section_font
    stats_hdr.fill = section_fill
    stats_hdr.alignment = left_align
    
    # Execution Stats Labels and Formulas
    metrics = [
        ("Total Test Cases", "=B7+B8+B9+B10+B11"),
        ("Total Passed", "=C7+C8+C9+C10+C11"),
        ("Total Failed", "=D7+D8+D9+D10+D11"),
        ("Total Blocked", "=E7+E8+E9+E10+E11"),
        ("Pass Rate (%)", "=IF(B5=0, 0, C5/B5)")
    ]
    
    for idx, (label, val) in enumerate(metrics, start=5):
        ws_summary[f"A{idx}"] = label
        ws_summary[f"A{idx}"].font = bold_font
        ws_summary[f"A{idx}"].fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        ws_summary[f"A{idx}"].border = cell_border
        
        ws_summary[f"B{idx}"] = val
        ws_summary[f"B{idx}"].font = bold_font
        ws_summary[f"B{idx}"].border = cell_border
        ws_summary[f"B{idx}"].alignment = center_align
        if label == "Pass Rate (%)":
            ws_summary[f"B{idx}"].number_format = '0.0%'
    
    # Section Header: Module Breakdown Table
    ws_summary.merge_cells("A13:E13")
    breakdown_hdr = ws_summary["A13"]
    breakdown_hdr.value = "Test Execution Module Breakdown"
    breakdown_hdr.font = section_font
    breakdown_hdr.fill = section_fill
    breakdown_hdr.alignment = left_align
    
    # Table headers for Module Breakdown
    breakdown_headers = ["Module Sheet Name", "Total Cases", "Passed", "Failed", "Blocked", "Pass Rate (%)"]
    for col_idx, text in enumerate(breakdown_headers, start=1):
        cell = ws_summary.cell(row=14, column=col_idx)
        cell.value = text
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
    
    # Module names and formulas linking to other tabs
    modules_list = [
        ("Core Business Flows", "'Core Business Flows'"),
        ("Access Control & RBAC Matrix", "'Access Control & RBAC Matrix'"),
        ("Audit Trails & Security Logs", "'Audit Trails & Security Logs'"),
        ("Settings & Global Configurations", "'Settings & Global Configurations'"),
        ("Reports & Analytics Dashboards", "'Reports & Analytics Dashboards'")
    ]
    
    for row_idx, (name, ref) in enumerate(modules_list, start=15):
        # Name
        c1 = ws_summary.cell(row=row_idx, column=1, value=name)
        c1.font = regular_font
        c1.border = cell_border
        
        # Total
        c2 = ws_summary.cell(row=row_idx, column=2, value=f"=COUNTA({ref}!B:B)-1")
        c2.font = regular_font
        c2.border = cell_border
        c2.alignment = center_align
        
        # Pass
        c3 = ws_summary.cell(row=row_idx, column=3, value=f'=COUNTIF({ref}!G:G, "Pass")')
        c3.font = regular_font
        c3.border = cell_border
        c3.alignment = center_align
        
        # Fail
        c4 = ws_summary.cell(row=row_idx, column=4, value=f'=COUNTIF({ref}!G:G, "Fail")')
        c4.font = regular_font
        c4.border = cell_border
        c4.alignment = center_align
        
        # Blocked
        c5 = ws_summary.cell(row=row_idx, column=5, value=f'=COUNTIF({ref}!G:G, "Blocked")')
        c5.font = regular_font
        c5.border = cell_border
        c5.alignment = center_align
        
        # Pass Rate
        c6 = ws_summary.cell(row=row_idx, column=6, value=f"=IF(B{row_idx}=0, 0, C{row_idx}/B{row_idx})")
        c6.font = bold_font
        c6.border = cell_border
        c6.alignment = center_align
        c6.number_format = '0.0%'
        
    # Write summary cells for statistical block to point to Module Breakdown sums
    ws_summary["B5"] = "=SUM(B15:B19)"
    ws_summary["B6"] = "=SUM(C15:C19)"
    ws_summary["B7"] = "=SUM(D15:D19)"
    ws_summary["B8"] = "=SUM(E15:E19)"
    ws_summary["B9"] = "=IF(B5=0, 0, B6/B5)"
    
    # Section Header: QA Tester Allocation
    ws_summary.merge_cells("A22:E22")
    tester_hdr = ws_summary["A22"]
    tester_hdr.value = "QA Resource Allocation"
    tester_hdr.font = section_font
    tester_hdr.fill = section_fill
    tester_hdr.alignment = left_align
    
    tester_headers = ["Tester Name", "QA Role", "Allocated Modules", "Status"]
    for col_idx, text in enumerate(tester_headers, start=1):
        cell = ws_summary.cell(row=23, column=col_idx)
        cell.value = text
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
        
    testers = [
        ("Sarah Jenkins", "Lead QA Engineer", "Core Business Flows, Audit Trails", "Active / Executed"),
        ("David K.", "Senior Security QA", "Access Control & RBAC Matrix", "Active / Executed"),
        ("Elena Rostova", "UI/UX QA Automation", "Settings, Reports & Analytics", "Active / Executed")
    ]
    for row_idx, (t_name, t_role, t_mods, t_stat) in enumerate(testers, start=24):
        ws_summary.cell(row=row_idx, column=1, value=t_name).font = regular_font
        ws_summary.cell(row=row_idx, column=1).border = cell_border
        ws_summary.cell(row=row_idx, column=2, value=t_role).font = regular_font
        ws_summary.cell(row=row_idx, column=2).border = cell_border
        ws_summary.cell(row=row_idx, column=3, value=t_mods).font = regular_font
        ws_summary.cell(row=row_idx, column=3).border = cell_border
        ws_summary.cell(row=row_idx, column=4, value=t_stat).font = regular_font
        ws_summary.cell(row=row_idx, column=4).border = cell_border
        ws_summary.cell(row=row_idx, column=4).alignment = center_align

    # ── SHEET WRITER HELPER FOR TEST MODULES ──
    def write_test_sheet(sheet_title, test_cases):
        ws = wb.create_sheet(title=sheet_title)
        ws.views.sheetView[0].showGridLines = True
        
        # Write Headers
        headers = ["Date", "Test Case ID", "Test Case Type", "Steps to Execute", "Expected Value", "Actual Value", "Status", "Completed Date"]
        for col_idx, text in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx)
            cell.value = text
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align
            cell.border = cell_border
            
        # Write Data
        for row_idx, tc in enumerate(test_cases, start=2):
            for col_idx, val in enumerate(tc, start=1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.value = val
                cell.font = regular_font
                cell.border = cell_border
                
                # Format Dates
                if col_idx in (1, 8):
                    cell.alignment = center_align
                # Format ID
                elif col_idx == 2:
                    cell.alignment = center_align
                    cell.font = bold_font
                # Format Type
                elif col_idx == 3:
                    cell.alignment = center_align
                # Format Status
                elif col_idx == 7:
                    cell.alignment = center_align
                    if val == "Pass":
                        cell.fill = pass_fill
                        cell.font = pass_font
                    elif val == "Fail":
                        cell.fill = fail_fill
                        cell.font = fail_font
                    elif val == "Blocked":
                        cell.fill = blocked_fill
                        cell.font = blocked_font
                # Steps, Expected, Actual
                else:
                    cell.alignment = left_align
                    
        # Auto-adjust column widths with some padding
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or '')
                # If there are linebreaks, find the longest line
                lines = val_str.split('\n')
                for line in lines:
                    if len(line) > max_len:
                        max_len = len(line)
            # Bound column widths for readability
            if col_letter in ('A', 'H'): # Dates
                ws.column_dimensions[col_letter].width = 13
            elif col_letter == 'B': # ID
                ws.column_dimensions[col_letter].width = 15
            elif col_letter == 'C': # Type
                ws.column_dimensions[col_letter].width = 15
            elif col_letter == 'D': # Steps
                ws.column_dimensions[col_letter].width = 50
            elif col_letter in ('E', 'F'): # Expected, Actual
                ws.column_dimensions[col_letter].width = 45
            elif col_letter == 'G': # Status
                ws.column_dimensions[col_letter].width = 12
            else:
                ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
                
    # ── CORE BUSINESS FLOWS TEST CASES ──
    core_cases = [
        [
            "2026-06-12", "ST-CORE-001", "Functionality",
            "1. Log in as Super Admin (admin@caldim.com).\n2. Navigate to 'Trackers' page.\n3. Upload 'Design_Release_Expanded.xlsx'.\n4. Submit for ingestion.",
            "Ingestion parser successfully processes all worksheets, extracts columns (e.g., planned_date, actual_date), and populates tracker_ingestion table with zero database errors.",
            "Ingestion parsed successfully; 140 project rows inserted into database, no schema errors.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-002", "Negative",
            "1. Upload 'Design_Release_Expanded.xlsx' with renamed primary columns (e.g. rename 'Planned Date' to 'Target Date').\n2. Attempt ingestion.",
            "Ingestion fails immediately, displaying a clear validation error: 'Missing required column: Planned Date. Ingestion aborted.'",
            "Ingestion aborted, displaying error modal 'Schema validation error: column Planned Date not found.'",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-003", "Functionality",
            "1. Navigate to 'MOM' page.\n2. Start meeting capture and upload meeting transcript ('sample_transcript.txt' containing 40 alignment points).\n3. Click 'Generate MOM'.",
            "Meeting transcript is parsed, generating action items with designated owners and sync times with high-accuracy summary.",
            "Summary generated and 5 action items auto-allocated to employees.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-004", "Functionality",
            "1. Schedule meeting on CALDIM calendar.\n2. Connect Google Calendar credentials.\n3. Sync meeting.",
            "Meeting syncs with Google Meet link and description.",
            "Meeting syncs correctly and creates event on Google Calendar.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-005", "Concurrency",
            "1. Tester A (Manager) and Tester B (Manager) open project milestone 'M-102' edit page concurrently.\n2. Tester A updates status to 'Completed' and clicks Save.\n3. Tester B updates status to 'On Hold' and clicks Save.",
            "Tester A's update succeeds. Tester B's update fails with an Optimistic Concurrency Control (OCC) alert: 'Version mismatch: This record has been updated by another user.'",
            "Tester B's update overwrites Tester A's update silently (Lost Update anomaly; missing version check in backend controller).",
            "Fail", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-006", "Functionality",
            "1. Navigate to 'Masters' -> 'Budget Master'.\n2. Add budget row for 'Automotive Division' of value $150,000.\n3. Click save.",
            "Row created, base currency value saved as USD $150,000, and audit log entries logged.",
            "Budget allocation added successfully.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-007", "Negative",
            "1. Try to revise 'Automotive Division' budget from $150,000 to $200,000 without filling required justification details.\n2. Click save.",
            "UI shows red error: 'Justification is required for budget revision updates.'",
            "Form rejects submission, focusing on 'Revision Justification' field.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-CORE-008", "Functionality",
            "1. Under project 'PROJ-772', attempt to mark 'Milestone 2' (Production Ready) as 'Completed' before dependent 'Milestone 1' (SOP Gate Review) is complete.",
            "System blocks status change, showing alert 'Blocked: Dependent milestone SOP Gate Review is incomplete.'",
            "Blocked status popup is displayed correctly.",
            "Pass", "2026-06-12"
        ]
    ]
    
    # ── ACCESS CONTROL & RBAC MATRIX TEST CASES ──
    rbac_cases = [
        [
            "2026-06-12", "ST-AUTH-001", "Security",
            "1. Log in as Super Admin (admin@caldim.com).\n2. Navigate to 'System Settings' (/dashboard/settings).\n3. Try to create a new role and edit system configurations.",
            "Access is granted. Settings page loads and changes save successfully.",
            "Super admin has access to settings; modifications successfully persisted.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-002", "Negative",
            "1. Log in as Employee (employee@caldim.com).\n2. Verify sidebar menu items.\n3. Attempt direct URL navigation to /dashboard/settings.",
            "'System Settings' menu is hidden in sidebar. Direct URL navigation redirects to /dashboard/projects with unauthorized access toast warning.",
            "Dashboard redirects and shows 'Access Denied: Admin role required.'",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-003", "Functionality",
            "1. On login page, click 'Request access'.\n2. Fill request form with email 'auditor@caldim.com' and role 'Auditor'.\n3. Log in as Super Admin and navigate to requests.\n4. Click 'Approve'.",
            "Auditor receives approval notification, account is created, and user can now log in.",
            "Request approved and login successfully verified.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-004", "Security",
            "1. Log in as Admin.\n2. Leave browser idle for 30 minutes.\n3. Attempt to click any dashboard route or endpoint.",
            "Inactivity hook activates after 30 minutes, invalidates JWT token, logs out the user, and redirects to /login with session expired toast.",
            "Hook triggers, log-out completes, and redirects safely.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-005", "Negative",
            "1. Go to 'Reset Password' or 'Request Access'.\n2. Enter weak password '12345'.",
            "UI strength meter indicates 'Weak' in red, and the 'Submit' button remains disabled with warning 'Password is too weak.'",
            "Strength meter displays 'Weak' and submit is disabled.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-006", "Security",
            "1. Send direct fetch request to /api/projects/all/structures from origin http://malicious-site.com.",
            "API blocks request with standard CORS policy error: origin not allowed.",
            "Request succeeds; wildcard CORS header allows origin '*' on backend API route (CORS config contains preview URL leaks).",
            "Fail", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-007", "Functionality",
            "1. Go to /login and select 'Forgot Password'.\n2. Input email 'admin@caldim.com' and click send.\n3. Retrieve OTP from inbox and enter incorrect 6-digit OTP code.",
            "Error displayed: 'Invalid OTP code. 2 attempts remaining.'",
            "Invalid OTP warning displayed; counter tracks failed attempts correctly.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUTH-008", "Negative",
            "1. Attempt OTP verification 5 times with incorrect codes.",
            "OTP verification disabled; email account temporarily locked for 15 minutes, security warning sent.",
            "Account locked and alert message sent to email.",
            "Pass", "2026-06-12"
        ]
    ]
    
    # ── AUDIT TRAILS & SECURITY LOGS TEST CASES ──
    audit_cases = [
        [
            "2026-06-12", "ST-AUD-001", "Functionality",
            "1. Log in as Manager.\n2. Edit budget row in 'Budget Master' for Project A.\n3. Log in as Admin, navigate to 'Audit Logs' page.",
            "A new audit log is present containing Manager's ID, action 'UPDATED', module 'BudgetMaster', and timestamp.",
            "Log record verified with correct user and action type.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUD-002", "Security",
            "1. Perform project creation from IP address 192.168.1.55.\n2. Check corresponding audit log details column.",
            "The details JSON contains the client IP metadata 192.168.1.55 and exact server timestamp.",
            "Log records action but does NOT capture client IP address in audit log details database table.",
            "Fail", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUD-003", "Security",
            "1. Log in as Admin.\n2. Attempt to send a DELETE request to /api/audit_logs/ endpoint or delete logs via UI.",
            "Endpoint is read-only. Delete request returns HTTP 405 Method Not Allowed or HTTP 403 Forbidden.",
            "Delete request returns HTTP 405 Method Not Allowed; database schema restricts deletion.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUD-004", "Functionality",
            "1. Create a project milestone and record its DB transaction entry.\n2. Compare audit log entry timestamp with projects table created_at timestamp.",
            "Timestamps match within 1 second.",
            "Audit log timestamp matches table creation within 100ms.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUD-005", "Security",
            "1. Attempt 3 failed login attempts on /login.\n2. Log in as Super Admin and check Audit Logs.",
            "Failed login activity logged as 'LOGIN_FAILED' with target email and IP metadata.",
            "Log entries recorded for unauthorized attempts.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-AUD-006", "Security",
            "1. Create a user request containing password field.\n2. Read audit log details for the creation action.",
            "Password value is masked with asterisks (e.g. ********) in details payload.",
            "Password field masked correctly.",
            "Pass", "2026-06-12"
        ]
    ]
    
    # ── SETTINGS & GLOBAL CONFIGURATIONS TEST CASES ──
    settings_cases = [
        [
            "2026-06-12", "ST-SET-001", "UI/UX",
            "1. Navigate to 'System Settings'.\n2. Click Theme switch toggle to 'Dark Mode'.\n3. Refresh the browser page.",
            "Background changes immediately. Setting is stored in local storage and persisted after page refresh.",
            "Background toggles instantly; dark mode theme class remains in index.html on refresh.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-SET-002", "Functionality",
            "1. Go to 'Settings' -> 'Branding Settings'.\n2. Upload a custom .png logo file.\n3. Click Save.",
            "Logo is saved to static/uploads/logos, and header brand logo updates dynamically.",
            "Logo updates in header and references the uploaded static image path.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-SET-003", "Functionality",
            "1. Go to 'Settings' -> 'Exchange Rates'.\n2. Modify USD to INR conversion rate to 83.5.\n3. Click Save and navigate to project dashboard.",
            "Exchange rates update and numbers reflect conversions in real-time on dashboard charts.",
            "Rates update successfully and values convert on the fly.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-SET-004", "UI/UX",
            "1. Navigate between dashboard views.\n2. Repeatedly click light/dark theme toggle rapidly.",
            "UI theme changes smoothly without flashing or sidebar alignment breakdown.",
            "Rapid toggling causes sidebar chart canvas to collapse and slide out of view.",
            "Fail", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-SET-005", "Functionality",
            "1. In settings, set 'Sidebar Dashboard Limit' to 0.\n2. Click save.",
            "Input validation restricts value to range 1-50, showing error 'Limit must be greater than 0.'",
            "Input field rejects 0 and displays error validation message.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-SET-006", "Negative",
            "1. In branding settings, change 'Base Currency' to an invalid string 'XYZ'.",
            "Field validates against standard ISO currency codes, showing error 'Invalid ISO currency code.'",
            "UI validates and displays currency constraint warning.",
            "Pass", "2026-06-12"
        ]
    ]
    
    # ── REPORTS & ANALYTICS DASHBOARDS TEST CASES ──
    reports_cases = [
        [
            "2026-06-12", "ST-REP-001", "UI/UX",
            "1. Open Project Dashboard.\n2. Check 'Budget Utilization' bar chart.",
            "Chart displays exact matching values from the database (utilized budget vs balance budget) for selected department.",
            "Chart renders correctly and values tooltips match data grid numbers.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-REP-002", "Functionality",
            "1. Go to Project Detail page.\n2. Click 'Export to PDF'.",
            "PDF document downloads containing project summary, gantt chart screenshot, and milestones table in clean layout.",
            "PDF downloads successfully; document matches styling guidelines.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-REP-003", "Functionality",
            "1. Go to Trackers page.\n2. Click 'Export CSV'.",
            "CSV file downloads containing milestone name, planned date, actual date, status, and owner.",
            "CSV file downloaded, values formatted correctly with correct CSV delimiters.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-REP-004", "Functionality",
            "1. Toggle base currency in header from USD to INR.\n2. View dashboard total budget cards and reports.",
            "Values are updated on the charts and cards using local exchange rates (e.g. multiplied by 83.5).",
            "Value changes are calculated and displayed correctly with new symbol.",
            "Pass", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-REP-005", "Negative",
            "1. On Reports page, set start date 2026-06-01 and end date 2026-05-01 (end date before start date).",
            "Dashboard displays error: 'Start date cannot be after end date' and does not query backend.",
            "API query occurs with dates reversed and returns empty dashboard charts instead of validation blocker.",
            "Fail", "2026-06-12"
        ],
        [
            "2026-06-12", "ST-REP-006", "Functionality",
            "1. Ingest 'Design_Release_Expanded.xlsx' in one browser window.\n2. Keep dashboard open in another window.",
            "WebSocket connection receives status sync trigger, and dashboard charts update live without manual page refresh.",
            "WebSocket notification received and charts re-render automatically.",
            "Pass", "2026-06-12"
        ]
    ]
    
    # Generate Sheets
    write_test_sheet("Core Business Flows", core_cases)
    write_test_sheet("Access Control & RBAC Matrix", rbac_cases)
    write_test_sheet("Audit Trails & Security Logs", audit_cases)
    write_test_sheet("Settings & Global Configurations", settings_cases)
    write_test_sheet("Reports & Analytics Dashboards", reports_cases)
    
    # Save Workbook
    filename = "CALDIM_Manual_Testing_Plan_QA_Report.xlsx"
    wb.save(filename)
    print(f"SUCCESS: Created workbook '{filename}' with formulas and styled test cases!")

if __name__ == "__main__":
    create_manual_test_plan()
