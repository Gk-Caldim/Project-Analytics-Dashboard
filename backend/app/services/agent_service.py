from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from app.models.project import Project
from app.models.tracker import TrackerData
from app.models.upload import Upload
from app.models.issue import Issue
from app.models.meeting import Meeting
from app.models.employee import Employee
from app.models.mom import MOMSession
from app.models.audit_log import AuditLog
from app.models.project_permission import ProjectPermission
from typing import List, Optional
from datetime import datetime, date

class AgentService:
    @staticmethod
    async def process_chat(db: Session, message: str, context: Optional[dict] = None, current_user: Optional[dict] = None, chat_history: Optional[List[dict]] = None):
        msg = message.lower()
        
        # 1. Identity the projects with ANY activity (Tracker data OR Uploads)
        tracker_project_ids = db.query(TrackerData.project_id).filter(TrackerData.project_id.isnot(None)).distinct()
        upload_project_ids = db.query(Upload.project_id).filter(Upload.project_id.isnot(None)).distinct()
        
        # Combine IDs from both sources
        active_ids_query = tracker_project_ids.union(upload_project_ids)
        active_ids = [r[0] for r in active_ids_query.all()]
        
        # 2. Fetch projects that are active AND visible to the user
        from app.api.project import check_project_permission
        
        all_active_projects = db.query(Project).filter(Project.id.in_(active_ids)).all()

        # Filter by permissions
        projects = []
        user_role = (current_user or {}).get("role", "User")
        user_employee_id = (current_user or {}).get("employee_id")

        if user_role in ["Admin", "Super Admin"]:
            projects = all_active_projects
        else:
            for p in all_active_projects:
                if user_employee_id and str(p.employee_id) == str(user_employee_id):
                    projects.append(p)
                elif check_project_permission(p, current_user, "view"):
                    projects.append(p)

        project_count = len(projects)
        
        # Helper for intent detection
        def check_intent(msg, keywords):
            return any(k in msg for k in keywords)

        # Dashboard Relevance Check (Expanded)
        DASHBOARD_KEYWORDS = ["project", "budget", "cost", "money", "tracker", "upload", "status", "summary", "master", "employee", "milestone", "mom", "meeting", "update", "navigate", "go to", "show", "list", "how is", "progress", "spent", "utilized", "settings", "issue", "problem", "health", "risk", "who", "manager", "team", "leader", "discuss", "takeaway", "history", "activity", "last", "compare", "most", "search", "find"]
        is_relevant = any(k in msg for k in DASHBOARD_KEYWORDS)

        # Intent Buckets (Expanded)
        INTENT_LIST = ["what are", "which projects", "list", "show projects", "active projects", "tell me about projects", "what projects", "see projects"]
        INTENT_BUDGET = ["money", "cost", "budget", "spent", "utilized", "price", "financial", "funds"]
        INTENT_NAVIGATE = ["go to", "take me", "navigate", "open", "switch", "show me"]
        INTENT_ISSUES = ["issue", "problem", "critical", "blocking", "bugs", "fix", "open items"]
        INTENT_MEETINGS = ["meeting", "agenda", "call", "schedule", "when is"]
        INTENT_HEALTH = ["health", "how is", "performance", "risk", "status of", "doing well"]
        INTENT_TEAM = ["who", "manager", "leader", "team", "managed by", "in charge", "responsible"]
        INTENT_HISTORY = ["history", "activity", "last update", "last upload", "when was", "updated"]

        # --- DEEP PROJECT AWARENESS ---
        words = msg.replace('/', ' ').replace('-', ' ').split()
        mentioned_project = None
        
        # 1. Try to find project name in the message
        for p in projects:
            if p.name.lower() in words:
                mentioned_project = p
                break
        
        # 2. If not in message, check context (sent from frontend)
        if not mentioned_project and context and context.get("activeProject"):
            ctx_name = context["activeProject"].lower()
            for p in projects:
                if p.name.lower() == ctx_name:
                    mentioned_project = p
                    break

        # 3. MULTI-TURN MEMORY: Check chat_history if none found yet
        if not mentioned_project and chat_history:
            for entry in reversed(chat_history):
                prev_text = entry.get("content", "").lower()
                prev_words = prev_text.replace('/', ' ').replace('-', ' ').split()
                for p in projects:
                    if p.name.lower() in prev_words:
                        mentioned_project = p
                        break
                if mentioned_project: break
        
        if mentioned_project:
            # 1. Navigation within project
            if check_intent(msg, ["detail", "view", "show", "go to"]):
                action = {"type": "NAVIGATE", "target": f"/dashboard/budget-summary/{mentioned_project.name}"}
                return f"Taking you to the detailed budget summary for {mentioned_project.name}.", action
            
            # 2. Team Intelligence
            if check_intent(msg, INTENT_TEAM):
                pm_name = mentioned_project.employee_name or "Not assigned"
                managers = mentioned_project.manager or []
                mgr_str = pm_name if not managers else ", ".join(managers) if isinstance(managers, list) else str(managers)
                t_lead = mentioned_project.team_lead or []
                tl_str = ", ".join(t_lead) if isinstance(t_lead, list) else str(t_lead)
                res = f"The **{mentioned_project.name}** project is managed by **{mgr_str}**."
                if tl_str: res += f" Team Lead: **{tl_str}**."
                return res, None

            # 3. Meeting Content (MOM) - UPDATED TO LIST POINTS
            if check_intent(msg, ["discuss", "takeaway", "summary", "mom", "point"]):
                last_mom = db.query(MOMSession).filter(MOMSession.project_id == mentioned_project.id).order_by(MOMSession.created_at.desc()).first()
                if not last_mom:
                    return f"I couldn't find any recorded meeting minutes (MOM) for {mentioned_project.name} yet.", None
                
                # Extract discussion points from the JSON data
                points = last_mom.mom_data if isinstance(last_mom.mom_data, list) else []
                if not points:
                    return f"The meeting for {mentioned_project.name} was recorded, but no specific discussion points were listed.", None
                
                # Show top points
                point_summaries = []
                for p_data in points[:5]:
                    dp = p_data.get('discussion_point') or p_data.get('Action Points') or "No details"
                    point_summaries.append(f"- {dp}")
                
                response = f"Here are the key points discussed for **{mentioned_project.name}** on {last_mom.created_at.strftime('%Y-%m-%d')}:\n"
                response += "\n".join(point_summaries)
                if len(points) > 5:
                    response += f"\n\n...and {len(points) - 5} more. View full MOM in the meeting history."
                return response, None

            # 4. Activity & Audit History
            if check_intent(msg, INTENT_HISTORY) or "who changed" in msg:
                # Check formal audit logs first for budget/manager changes
                audit = db.query(AuditLog).filter(AuditLog.entity_id == str(mentioned_project.id)).order_by(AuditLog.timestamp.desc()).first()
                # Also check upload history
                last_upload = db.query(Upload).filter(Upload.project_id == mentioned_project.id).order_by(Upload.created_at.desc()).first()
                
                res = ""
                if audit:
                    res += f"Latest system change: **{audit.action}** in **{audit.module}** on {audit.timestamp.strftime('%Y-%m-%d %H:%M')}. "
                if last_upload:
                    res += f"Last data sync: on {last_upload.created_at.strftime('%Y-%m-%d')} (File: {last_upload.filename})."
                
                return res if res else f"No recent activity history found for {mentioned_project.name}.", None

            # 5. Project Health Check
            if check_intent(msg, INTENT_HEALTH):
                open_issues = db.query(Issue).filter(Issue.project_id == mentioned_project.id, Issue.status == "Open").count()
                critical_issues = db.query(Issue).filter(Issue.project_id == mentioned_project.id, Issue.priority == "High", Issue.status == "Open").count()
                delays = db.query(TrackerData).filter(TrackerData.project_id == mentioned_project.id, TrackerData.delay_days > 0).count()
                budget_util = (mentioned_project.utilized_budget / mentioned_project.budget * 100) if mentioned_project.budget > 0 else 0
                
                health = "Healthy"
                if critical_issues > 0 or delays > 5 or budget_util > 100: health = "Critical"
                elif open_issues > 3 or delays > 0 or budget_util > 90: health = "At Risk"
                
                return (
                    f"Health Status for {mentioned_project.name}: **{health}**.\n"
                    f"- **Issues**: {open_issues} open ({critical_issues} critical)\n"
                    f"- **Trackers**: {delays} milestones delayed\n"
                    f"- **Budget**: {budget_util:.1f}% utilized\n"
                    "Would you like me to open the trackers or issue list?"
                ), None

            # 6. Project Specific Issues
            if check_intent(msg, INTENT_ISSUES):
                issues = db.query(Issue).filter(Issue.project_id == mentioned_project.id, Issue.status == "Open").order_by(Issue.priority.desc(), Issue.severity_score.desc()).limit(3).all()
                if not issues:
                    return f"Great news! There are no open issues for {mentioned_project.name}.", None
                issue_list = "\n".join([f"- [{i.priority}] {i.title}" for i in issues])
                return f"Currently tracking {len(issues)} open issues for {mentioned_project.name}:\n{issue_list}", None

            # Fallback for project mentions
            milestone_count = db.query(TrackerData).filter(TrackerData.project_id == mentioned_project.id).count()
            return (
                f"{mentioned_project.name} is in the '{mentioned_project.status}' phase with {milestone_count} tracked milestones. "
                f"Budget: ${mentioned_project.budget:,.2f} total, ${mentioned_project.utilized_budget:,.2f} utilized."
            ), None

        # --- GLOBAL SEARCH & ANALYTICS ---
        
        # 1. Global Search across MOM Points
        if "search for" in msg or "find discussions" in msg:
            search_query = msg.split("for")[-1].split("discussions")[-1].strip()
            all_moms = db.query(MOMSession).filter(MOMSession.project_id.in_([p.id for p in projects])).all()
            matches = []
            for m in all_moms:
                for point in (m.mom_data or []):
                    text = (point.get('discussion_point') or point.get('Action Points') or "").lower()
                    if search_query in text:
                        matches.append(f"Project **{m.project_name}** ({m.created_at.strftime('%Y-%m-%d')}): {text}")
            
            if not matches:
                return f"I searched through your project meetings but couldn't find any discussions about '{search_query}'.", None
            results = "\n".join(matches[:3])
            return f"I found several discussions matching your search:\n{results}\n\nWould you like more results?", None

        # 2. Comparative Analytics (Leaderboard)
        if "which project" in msg or "most" in msg or "highest" in msg or "compare" in msg:
            if not projects: return "You don't have any active projects to compare.", None
            if "budget" in msg or "expensive" in msg or "utilized" in msg:
                top_p = max(projects, key=lambda p: p.utilized_budget)
                util_pct = (top_p.utilized_budget/top_p.budget*100) if top_p.budget > 0 else 0
                return f"The project with the highest utilized budget is **{top_p.name}** at ${top_p.utilized_budget:,.2f} ({util_pct:.1f}%).", None
            if "issue" in msg or "problem" in msg:
                top_p = max(projects, key=lambda p: db.query(Issue).filter(Issue.project_id == p.id, Issue.status == "Open").count())
                issue_count = db.query(Issue).filter(Issue.project_id == top_p.id, Issue.status == "Open").count()
                return f"**{top_p.name}** currently has the most open issues ({issue_count}).", None
            if "delayed" in msg or "risk" in msg:
                top_p = max(projects, key=lambda p: db.query(TrackerData).filter(TrackerData.project_id == p.id, TrackerData.delay_days > 0).count())
                delay_count = db.query(TrackerData).filter(TrackerData.project_id == top_p.id, TrackerData.delay_days > 0).count()
                return f"**{top_p.name}** has the most delayed milestones ({delay_count}). View Health Check for details.", None

        # --- NAVIGATION LOGIC ---
        if check_intent(msg, INTENT_NAVIGATE):
            if "project" in msg and "dashboard" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/projects"}
                return "Taking you back to the main Project Dashboard.", action
            elif "project" in msg and "master" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/masters/project-master"}
                return "Sure! I'm taking you to the Project Master list.", action
            elif "tracker" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/trackers"}
                return "Opening the Trackers section for you.", action
            elif "budget" in msg and "summary" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/budget-summary"}
                return "Navigating to the Budget Summary overview.", action
            elif "employee" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/masters/employees"}
                return "Heading over to the Employee Master.", action
            elif "mom" in msg or "meeting" in msg:
                if "history" in msg or "view" in msg:
                    action = {"type": "NAVIGATE", "target": "/dashboard/meetings"}
                    return "Opening your meeting history and analytics.", action
                action = {"type": "NAVIGATE", "target": "/dashboard/mom"}
                return "Taking you to the Minutes of Meetings (MOM) section.", action
            elif "setting" in msg:
                action = {"type": "NAVIGATE", "target": "/dashboard/settings"}
                return "Opening your dashboard settings.", action

        # --- GLOBAL INTELLIGENCE ---
        
        # 1. Global Audit / Search for 'Who Changed'
        if "who" in msg and ("change" in msg or "update" in msg or "edit" in msg or "add" in msg):
            filters = [AuditLog.module.ilike("%Project%")]
            if "budget" in msg or "cost" in msg: filters.append(AuditLog.module.ilike("%Budget%"))
            
            latest_audit = db.query(AuditLog).filter(*filters).order_by(AuditLog.timestamp.desc()).first()
            if latest_audit:
                # Resolve name
                user_name = latest_audit.user_id
                emp = db.query(Employee).filter(Employee.employee_id == latest_audit.user_id).first()
                if emp: user_name = emp.name
                
                # Try to find project name if present in details
                p_name_hint = latest_audit.details.get("project_name") or latest_audit.details.get("name") if isinstance(latest_audit.details, dict) else None
                hint_str = f" for **{p_name_hint}**" if p_name_hint else ""
                
                return f"The last change{hint_str} was made by **{user_name}** (**{latest_audit.action}** in {latest_audit.module}) on {latest_audit.timestamp.strftime('%Y-%m-%d %H:%M')}.", None
            
            return "I couldn't find any recent audit logs for system changes. It's possible no manual edits have been recorded yet.", None

        # 2. Global Search across MOM Points
        if "search for" in msg or "find discussions" in msg:
            search_query = msg.split("for")[-1].split("discussions")[-1].strip()
            all_moms = db.query(MOMSession).filter(MOMSession.project_id.in_([p.id for p in projects])).all()
            matches = []
            for m in all_moms:
                for point in (m.mom_data or []):
                    text = (point.get('discussion_point') or point.get('Action Points') or "").lower()
                    if search_query in text:
                        matches.append(f"Project **{m.project_name}** ({m.created_at.strftime('%Y-%m-%d')}): {text}")
            
            if not matches:
                return f"I searched through your project meetings but couldn't find any discussions about '{search_query}'.", None
            results = "\n".join(matches[:3])
            return f"I found several discussions matching your search:\n{results}\n\nWould you like more results?", None
        if check_intent(msg, ["discuss", "point", "takeaway", "mom"]):
            project_ids = [p.id for p in projects]
            last_mom = db.query(MOMSession).filter(MOMSession.project_id.in_(project_ids)).order_by(MOMSession.created_at.desc()).first()
            if last_mom:
                p_obj = next((p for p in projects if p.id == last_mom.project_id), None)
                p_name = p_obj.name if p_obj else "Unknown Project"
                points = last_mom.mom_data[:3] if isinstance(last_mom.mom_data, list) else []
                ps = [f"- {pd.get('discussion_point') or pd.get('Action Points') or 'No details'}" for pd in points]
                res = f"I found the most recent meeting for **{p_name}** ({last_mom.created_at.strftime('%Y-%m-%d')}). Key points:\n"
                res += "\n".join(ps)
                return res + f"\n\nWould you like the full breakdown for {p_name}?", None
            
            return "I couldn't find any recorded meeting minutes (MOM) across your active projects. Have they been uploaded yet?", None

        # 2. Global Meetings
        if check_intent(msg, INTENT_MEETINGS):
            today = date.today().isoformat()
            upcoming_meetings = db.query(Meeting).filter(Meeting.project_id.in_([p.id for p in projects]), Meeting.date >= today).order_by(Meeting.date.asc(), Meeting.time.asc()).limit(3).all()
            if not upcoming_meetings:
                return "I don't see any upcoming meetings scheduled for your projects.", None
            meeting_list = "\n".join([f"- {m.date} {m.time}: {m.title}" for m in upcoming_meetings])
            return f"Here are your next 3 meetings:\n{meeting_list}", None

        # --- DATA QUERIES ---
        if check_intent(msg, INTENT_LIST) or ("how many" in msg and "project" in msg):
            if project_count == 0:
                return "I'm currently seeing 0 active projects with your credentials. Try uploading a tracker to get started.", None
            names = [p.name for p in projects[:5]]
            response = f"I've found {project_count} active projects: {', '.join(names)}"
            if project_count > 5: response += f" and {project_count - 5} others."
            return response + ". Which one would you like to explore in detail?", None

        if check_intent(msg, INTENT_BUDGET):
            total_budget = sum([p.budget for p in projects])
            total_utilized = sum([p.utilized_budget for p in projects])
            return f"The total budget across your {project_count} visible projects is ${total_budget:,.2f}, with ${total_utilized:,.2f} utilized so far.", None

        if check_intent(msg, ["hello", "hi", "hey", "good morning", "good afternoon"]):
            # PROACTIVE RISK CHECK
            risky_projects = []
            for p in projects:
                budget_util = (p.utilized_budget / p.budget * 100) if p.budget > 0 else 0
                critical_issues = db.query(Issue).filter(Issue.project_id == p.id, Issue.priority == "High", Issue.status == "Open").count()
                if budget_util > 100 or critical_issues > 2:
                    risky_projects.append(p.name)
            
            alert = ""
            if risky_projects:
                alert = f"\n\n🚨 **Attention**: I've detected high risk (budget or issues) in: **{', '.join(risky_projects)}**. Would you like a health check for one of them?"
            
            return f"Hello! I'm your Project Assistant. I have total access to your dashboard (Teams, MOMs, Issues, Budgets, Audit Logs). How can I help?{alert}", None

        # --- SOCIAL & COMMON RESPONSES ---
        if check_intent(msg, ["thank", "thanks", "thx", "appreciate"]):
            return "You're very welcome! I'm here to make your project management easier. Anything else I can help you with?", None
        
        if check_intent(msg, ["ok", "okay", "cool", "nice", "got it", "great"]):
            return "Great! Let me know if you need any data analysis or if you want to navigate to another section.", None
            
        if check_intent(msg, ["bye", "goodbye", "see ya", "exit"]):
            return "Goodbye! Have a productive day. I'll be here if you need any more dashboard insights.", None

        # --- FINAL STRICT FALLBACK ---
        if not is_relevant:
            return "I'm sorry, I am specifically designed to assist with your Project Dashboard (Teams, Issues, MOMs, Budgets, Trackers). I don't have information on that topic, but I'm happy to answer any questions about your projects!", None

        return f"I'm here to help! I can answer questions about your {project_count} projects or navigate you to any section like Trackers, Budgets, or Masters.", None

    @staticmethod
    def get_suggestions(message: str) -> List[str]:
        return [
            "What's my project status?",
            "Show recent uploads",
            "Help with trackers",
            "Export report"
        ]
