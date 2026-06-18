import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LeadModal } from '../components/LeadModal';
import {
  CheckCircle2, ArrowRight, Star, Users, Clock, Target, Layout, Brain,
  BookOpen, Video, GitBranch, Mail, Phone, Globe, Award, Briefcase,
  Lock, FileText, Shield, Building2, Handshake, Layers, TrendingUp,
  Bell, Archive, Code, CheckSquare, Filter, RefreshCw, Mic, Database,
  Server, Key, UserCheck, Edit3, Download, BarChart2, PieChart,
  ShieldCheck, BarChart, Zap, ChevronRight, MapPin, Heart, Package,
  MessageSquare, Headphones, LifeBuoy, FileCode, Newspaper, Calendar,
  AlertTriangle, Settings, Eye, HelpCircle, Sparkles
} from 'lucide-react';
import '../pages/LandingPage.css';

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE PAGES — rich content
// ─────────────────────────────────────────────────────────────────────────────
const FEATURE_DATA = {
  "task-management": {
    badge: "CORE FEATURE",
    icon: CheckSquare,
    title: "Engineering-Grade Task Management",
    subtitle: "Coordinate complex workflows, track part statuses, and keep every program milestone on schedule — across every team and supplier.",
    desc: "CALDIM task management is purpose-built for engineering teams managing physical product development. From concept freeze to SOP validation, every task, dependency, and escalation is tracked in a single, auditable workspace.",
    howItWorks: [
      { step: "01", icon: Edit3, title: "Define Tasks & Milestones", desc: "Break programs into phase-gates, create tasks linked to specific parts or deliverables, and set gate milestones aligned with APQP or SOP timelines." },
      { step: "02", icon: Users, title: "Assign & Delegate", desc: "Assign tasks to team members across design, procurement, quality, and supplier functions with clear owners and due dates." },
      { step: "03", icon: RefreshCw, title: "Track Progress in Real Time", desc: "Monitor completion through live dashboards. Receive automatic alerts when tasks slip, dependencies break, or milestones are at risk." },
      { step: "04", icon: Archive, title: "Close, Sign Off & Archive", desc: "Mark milestones complete, generate sign-off records, and store task history for future audits or program retrospectives." },
    ],
    capabilities: [
      { icon: Layers, title: "Phase-Gate Milestones", desc: "Pre-configured APQP, PPAP, and SOP gate structures tailored to automotive and industrial program phases." },
      { icon: GitBranch, title: "Task Dependencies", desc: "Link tasks sequentially to prevent cascading design lock bottlenecks and highlight critical-path risks automatically." },
      { icon: Bell, title: "Smart Escalation Alerts", desc: "Configurable notification rules for approaching deadlines, status regressions, and ownership gaps." },
      { icon: Filter, title: "Custom Views & Filters", desc: "Filter by status, owner, part number, or phase. Switch between list, kanban board, and Gantt timeline views." },
      { icon: Users, title: "Bulk Assignment Tools", desc: "Assign or re-assign multiple tasks simultaneously during sprint planning or release kickoff ceremonies." },
      { icon: Shield, title: "Full Audit Trail", desc: "Every task change is logged — who updated what and when — for compliance reviews and traceability reports." },
    ],
    stats: [
      { value: "40%", label: "Faster average task completion" },
      { value: "3×", label: "Fewer missed program milestones" },
      { value: "100%", label: "Action audit traceability" },
    ],
    testimonial: {
      quote: "\u201cCALDIM task management helped us coordinate harness routing reviews across two plant locations, eliminating assembly delays entirely.\u201d",
      author: "Preeti Nair", role: "PMO Director", company: "Tata Motors",
    },
  },
  "excel-analytics": {
    badge: "ANALYTICS ENGINE",
    icon: BarChart2,
    title: "Advanced Spreadsheet Analytics",
    subtitle: "Turn static Excel trackers into a live, interactive engineering database with bi-directional sync and instant visual reporting.",
    desc: "CALDIM's sync engine connects your existing desktop workbooks directly to the cloud. Track cell-level changes, version histories, and owner edits — then generate visual telemetry, cost variance charts, and part readiness reports instantly.",
    howItWorks: [
      { step: "01", icon: Download, title: "Upload or Sync Your Workbooks", desc: "Drag-and-drop your Excel files or connect via the desktop sync agent for automatic background updates as engineers save their trackers." },
      { step: "02", icon: Database, title: "Parse & Normalize", desc: "CALDIM automatically maps columns, detects release codes, and normalizes your part numbers, owners, and status fields into a structured database." },
      { step: "03", icon: BarChart2, title: "Visualize Live", desc: "View color-coded KPIs, variance trend charts, and part readiness heatmaps updated every time a workbook is saved or synced." },
      { step: "04", icon: FileText, title: "Export Board-Ready Reports", desc: "Generate PDF and CSV summaries for gate reviews, stakeholder meetings, or compliance audits in one click." },
    ],
    capabilities: [
      { icon: RefreshCw, title: "Bi-directional Sync Engine", desc: "Cell-level sync between desktop workbooks and the cloud database. Changes made locally appear in the dashboard within seconds." },
      { icon: Archive, title: "Version History & Diffs", desc: "Full history of every cell change with timestamps, owner attribution, and side-by-side diff views." },
      { icon: BarChart, title: "Cost Variance Analytics", desc: "Compare budgeted vs. actual spend by part, supplier, or release phase with configurable alert thresholds." },
      { icon: PieChart, title: "Part Readiness Heatmaps", desc: "Visual status maps showing which parts are on-track, at-risk, or blocked across your entire BOM." },
      { icon: Bell, title: "Conditional Alerts", desc: "Set rules to flag cells that exceed cost targets, miss completion dates, or change status unexpectedly." },
      { icon: FileText, title: "PDF & CSV Exports", desc: "One-click report generation for program reviews, supplier meetings, and management presentations." },
    ],
    stats: [
      { value: "80%", label: "Reduction in manual reporting time" },
      { value: "5 sec", label: "Average sync latency" },
      { value: "10,000+", label: "Parts tracked per program" },
    ],
    testimonial: {
      quote: "\u201cConnecting our design spreadsheets to CALDIM reduced manual tracking errors and helped align our engineering teams and PMO on release statuses.\u201d",
      author: "Sanjay Iyer", role: "Lead Systems Engineer", company: "Mahindra Electric",
    },
  },
  "minutes-of-meeting-mom": {
    badge: "AI-POWERED",
    icon: Mic,
    title: "AI-Assisted Meeting Minutes (MOM)",
    subtitle: "Capture every discussion, decision, and action item automatically — so your team spends less time documenting and more time delivering.",
    desc: "CALDIM's MOM module uses AI transcription to record your status meetings, extract action items, identify speakers, and assign tasks — all without manual note-taking. Every meeting is archived and fully searchable.",
    howItWorks: [
      { step: "01", icon: Mic, title: "Start the Meeting Session", desc: "Open CALDIM's capture interface before your review. The AI begins listening to the live discussion or uploaded recording." },
      { step: "02", icon: Brain, title: "AI Transcribes & Identifies", desc: "Speaker diarization separates voices, attributing each statement to the correct participant. The transcript is generated in real time." },
      { step: "03", icon: Target, title: "Extract Actions & Decisions", desc: "The AI identifies action items, assigns owners from the participant list, and flags open decisions or risks requiring follow-up." },
      { step: "04", icon: Archive, title: "Archive & Search", desc: "All meetings are stored in a searchable archive. Filter by project, date, owner, or keyword to instantly locate past decisions." },
    ],
    capabilities: [
      { icon: Mic, title: "Voice-to-Text Transcription", desc: "High-accuracy transcription for English, Hindi, and regional accents common in automotive program meetings." },
      { icon: Users, title: "Speaker Diarization", desc: "Automatically separate and label different speakers in the recording for clear attribution." },
      { icon: CheckSquare, title: "Automatic Action Extraction", desc: "AI identifies actionable statements, assigns owners, and sets provisional due dates based on context." },
      { icon: Archive, title: "Searchable Archive", desc: "Find any past discussion, decision, or action item across all projects using full-text search." },
      { icon: Bell, title: "Action Item Follow-Up Reminders", desc: "Assigned action owners receive reminders as their deadlines approach, reducing follow-up overhead." },
      { icon: FileText, title: "PDF MOM Export", desc: "Generate formatted minutes-of-meeting documents ready for distribution or stakeholder sign-off." },
    ],
    stats: [
      { value: "2 hrs", label: "Saved per meeting on documentation" },
      { value: "95%+", label: "Action item capture accuracy" },
      { value: "Zero", label: "Manual note-taking required" },
    ],
    testimonial: {
      quote: "\u201cThe automated meeting notes save hours of administrative work. Action items are summarized and assigned immediately after our reviews.\u201d",
      author: "Ravi Voss", role: "Program Manager", company: "Bosch Automotive",
    },
  },
  "time-sheets": {
    badge: "RESOURCE TRACKING",
    icon: Clock,
    title: "Engineering Resource Timesheets",
    subtitle: "Track engineering hours against specific project tasks, phases, and budget codes — with built-in approval workflows.",
    desc: "Log hours by project, task, and phase. CALDIM aligns resource costs with your program budget tracking modules so you always know where hours are going and how they impact your targets.",
    howItWorks: [
      { step: "01", icon: Clock, title: "Log Hours Daily", desc: "Engineers log time against specific tasks, projects, or budget codes from any device. Quick-entry forms take under 30 seconds." },
      { step: "02", icon: UserCheck, title: "Manager Approval Workflow", desc: "Supervisors review and approve submitted timesheets. Disputes are flagged for easy resolution before payroll or billing." },
      { step: "03", icon: BarChart2, title: "Aggregate Against Budget", desc: "Logged hours are automatically mapped to your program budget. Compare actual labor costs against planned allocations by phase." },
      { step: "04", icon: FileText, title: "Compliance Reports", desc: "Generate labor allocation reports by employee, project, or department — formatted for client billing, audits, or HR reviews." },
    ],
    capabilities: [
      { icon: Clock, title: "Project-Based Time Logging", desc: "Tag every hour to a specific project, phase, and task for full allocation visibility." },
      { icon: UserCheck, title: "Multi-Level Approval Workflow", desc: "Configurable approval chains from team lead to department head with comment threads." },
      { icon: BarChart2, title: "Budget Integration", desc: "Labor costs flow directly into program budget dashboards, giving real-time actuals against targets." },
      { icon: FileText, title: "Compliance-Ready Reports", desc: "Formatted reports for labor audits, client invoicing, and statutory compliance submissions." },
      { icon: Calendar, title: "Overtime & Leave Tracking", desc: "Track overtime flags, compensatory leave, and attendance records alongside project hours." },
      { icon: Globe, title: "Multi-Currency Support", desc: "Log and report hours in local currencies with automatic conversion for global program reporting." },
    ],
    stats: [
      { value: "60%", label: "Reduction in manual timesheet errors" },
      { value: "100%", label: "Budget-to-actuals visibility" },
      { value: "<30 sec", label: "Average daily log entry time" },
    ],
    testimonial: {
      quote: "\u201cTracking engineering hours against specific gate releases gave us the exact data we needed to optimize our R&D resource allocations.\u201d",
      author: "Kemi Adeyemi", role: "Operations Head", company: "Volvo Trucks",
    },
  },
  "team-collaboration": {
    badge: "COLLABORATION",
    icon: Users,
    title: "Cross-Functional Collaboration Hub",
    subtitle: "Unify PMO, engineering, procurement, and plant operations on a single workspace — eliminating email chains and version drift.",
    desc: "CALDIM provides a shared context layer for all functions touching a vehicle program. Real-time activity feeds, thread-based discussions, and granular permissions ensure every stakeholder sees what they need — and nothing they shouldn't.",
    howItWorks: [
      { step: "01", icon: Building2, title: "Set Up Your Workspace", desc: "Create your workspace and invite team members from design, procurement, quality, and supplier organizations." },
      { step: "02", icon: Settings, title: "Define Roles & Permissions", desc: "Assign role-based access so each function sees only the projects and data relevant to their responsibilities." },
      { step: "03", icon: MessageSquare, title: "Collaborate in Context", desc: "Comment directly on tasks, parts, and spreadsheet cells. Thread discussions are linked to the exact item they reference." },
      { step: "04", icon: Bell, title: "Stay Updated Automatically", desc: "Personalized activity feeds surface the updates most relevant to each user, replacing daily status email floods." },
    ],
    capabilities: [
      { icon: Globe, title: "Shared Workspace", desc: "One consolidated workspace for all project stakeholders — eliminating siloed files and version conflicts." },
      { icon: MessageSquare, title: "In-Context Discussions", desc: "Thread-based comments attached directly to tasks, parts, spreadsheet rows, or meeting minutes." },
      { icon: Bell, title: "Real-Time Activity Feed", desc: "Personalized feed showing updates relevant to each user — status changes, new assignments, and replies." },
      { icon: Shield, title: "Granular Role Permissions", desc: "Control read, write, and admin access by user, team, or project for precise data governance." },
      { icon: Users, title: "Guest & Supplier Access", desc: "Invite external suppliers with limited, read-only or scoped access to relevant project data only." },
      { icon: Archive, title: "Document Version Control", desc: "All attachments and file uploads are versioned with timestamps and owner attribution." },
    ],
    stats: [
      { value: "70%", label: "Reduction in status email volume" },
      { value: "2×", label: "Faster design iteration cycles" },
      { value: "50+", label: "Concurrent users per workspace" },
    ],
    testimonial: {
      quote: "\u201cBy keeping all departments in a single workspace, we reduced communication gaps and accelerated design iterations significantly.\u201d",
      author: "Sanjay Iyer", role: "Lead Systems Engineer", company: "Mahindra Electric",
    },
  },
  "goal-tracking": {
    badge: "STRATEGIC PLANNING",
    icon: Target,
    title: "Strategic Goal & OKR Tracking",
    subtitle: "Align engineering milestones with high-level corporate targets — and track progress automatically as tasks and releases are updated.",
    desc: "Define key results per project phase and SOP gate. CALDIM automatically maps task completions and release updates to your strategic goals, giving leadership real-time confidence in program health without manual reporting.",
    howItWorks: [
      { step: "01", icon: Target, title: "Define Objectives & Key Results", desc: "Create OKRs aligned to program phases, annual plans, or cost-reduction targets. Nest goals hierarchically by team or function." },
      { step: "02", icon: GitBranch, title: "Link to Tasks & Milestones", desc: "Connect specific tasks and milestones to each key result so progress is captured automatically as work is completed." },
      { step: "03", icon: TrendingUp, title: "Track Progress in Real Time", desc: "As tasks are closed, goal completion percentages update automatically. No manual reporting or update meetings required." },
      { step: "04", icon: BarChart2, title: "Review & Adjust", desc: "Quarterly review dashboards show goal performance trends, helping leadership realign priorities before programs fall behind." },
    ],
    capabilities: [
      { icon: Target, title: "OKR Framework", desc: "Define Objectives and Key Results at program, team, and individual levels with configurable review cycles." },
      { icon: GitBranch, title: "Milestone Linkage", desc: "Automatically derive goal progress from task completions and program gate achievements." },
      { icon: BarChart2, title: "Performance Trend Analytics", desc: "Track goal completion velocity over time and compare against baseline targets or previous quarters." },
      { icon: AlertTriangle, title: "At-Risk Flags", desc: "Automated flags when key results fall behind schedule, giving teams early warning to course-correct." },
      { icon: Users, title: "Cross-Team Alignment", desc: "Cascade goals from executive OKRs down to individual engineer task lists for full vertical alignment." },
      { icon: FileText, title: "Board-Ready Summaries", desc: "Generate PDF goal status summaries for quarterly business reviews and leadership presentations." },
    ],
    stats: [
      { value: "3×", label: "Improvement in goal completion rate" },
      { value: "100%", label: "Auto-reported progress" },
      { value: "Q1–Q4", label: "Full-year OKR visibility" },
    ],
    testimonial: {
      quote: "\u201cAligning engineering milestones with our product launch targets has significantly improved program accountability across all functions.\u201d",
      author: "Preeti Nair", role: "PMO Director", company: "Tata Motors",
    },
  },
  "portfolio-view": {
    badge: "EXECUTIVE OVERSIGHT",
    icon: Layout,
    title: "Program Portfolio Command Center",
    subtitle: "Monitor every active vehicle platform, program, and project on a single, live executive dashboard.",
    desc: "CALDIM's portfolio view aggregates status, cost, and risk signals from all active programs into one command-center view. Engineering leadership can immediately identify which programs need attention — without drilling into individual project details.",
    howItWorks: [
      { step: "01", icon: Building2, title: "Consolidate All Programs", desc: "All active projects and programs automatically appear in the portfolio view. No manual aggregation or dashboard configuration required." },
      { step: "02", icon: BarChart2, title: "Visualize Status at a Glance", desc: "Traffic-light indicators, cost variance bars, and schedule health scores give instant program health signals at the portfolio level." },
      { step: "03", icon: Eye, title: "Drill Down On Demand", desc: "Click any program to zoom into project-level detail — tasks, risks, budget, and resource allocation — without leaving the portfolio context." },
      { step: "04", icon: FileText, title: "Export Executive Reports", desc: "Generate board-ready portfolio summaries in PDF and PowerPoint formats, pre-formatted for leadership review meetings." },
    ],
    capabilities: [
      { icon: Layout, title: "Multi-Program Dashboard", desc: "Consolidated view of all programs with status, cost, schedule, and risk indicators in a single screen." },
      { icon: TrendingUp, title: "Aggregate Cost Tracking", desc: "Portfolio-level budget vs. actual spend trends across all active programs and cost centers." },
      { icon: AlertTriangle, title: "Risk Heatmap", desc: "Color-coded risk indicators highlighting which programs have open blockers, overdue milestones, or escalated issues." },
      { icon: Eye, title: "One-Click Drill-Down", desc: "Navigate from portfolio view to individual project detail in a single click without context switching." },
      { icon: BarChart2, title: "Schedule Variance Analysis", desc: "SPI and CPI metrics for each program showing how schedule and cost performance compare to baseline plans." },
      { icon: FileText, title: "Board-Ready Export", desc: "Export portfolio status reports in PDF or PPTX for quarterly reviews and steering committee presentations." },
    ],
    stats: [
      { value: "15+", label: "Programs monitored simultaneously" },
      { value: "Real-time", label: "Status data refresh" },
      { value: "90%", label: "Reduction in portfolio status meetings" },
    ],
    testimonial: {
      quote: "\u201cThe portfolio dashboard gives us clear, real-time visibility into all active program tracks from a single console — a game changer for leadership reviews.\u201d",
      author: "Kemi Adeyemi", role: "Operations Head", company: "Volvo Trucks",
    },
  },
  "dashboards": {
    badge: "ANALYTICS",
    icon: BarChart2,
    title: "Executive Analytics Dashboards",
    subtitle: "Real-time KPIs, cost variance charts, and part readiness metrics — customizable for every stakeholder from engineer to board member.",
    desc: "CALDIM dashboards transform raw project data into clear, actionable visual intelligence. Configure widgets, apply filters, and save views tailored to each team's priorities — from procurement cost summaries to engineering gate readiness heatmaps.",
    howItWorks: [
      { step: "01", icon: Settings, title: "Choose Your Widget Library", desc: "Select from 20+ pre-built dashboard widgets — cost variance charts, task burndowns, part readiness gauges, OKR progress rings, and more." },
      { step: "02", icon: Filter, title: "Apply Filters & Segments", desc: "Filter any dashboard by project, date range, team, supplier, or part family. Create saved filter presets for common views." },
      { step: "03", icon: Eye, title: "View Live Data", desc: "All dashboard widgets refresh automatically as underlying task, budget, and spreadsheet data updates — no manual refresh needed." },
      { step: "04", icon: FileText, title: "Export & Share", desc: "Export any dashboard view as a PDF or CSV. Schedule automatic email delivery to stakeholders at weekly or monthly intervals." },
    ],
    capabilities: [
      { icon: BarChart2, title: "20+ Pre-Built Widgets", desc: "Cost variance, schedule health, part readiness, OKR progress, and team velocity widgets available out of the box." },
      { icon: Settings, title: "Fully Customizable Layout", desc: "Drag-and-drop widget arrangement. Save multiple named dashboard views for different audiences." },
      { icon: PieChart, title: "Budget Deviation Analytics", desc: "Visual comparison of planned vs. actual spend by program, phase, part family, or supplier." },
      { icon: RefreshCw, title: "Auto-Refresh Data", desc: "Dashboards update in near-real-time as task completions, budget updates, and file syncs occur." },
      { icon: FileText, title: "Scheduled PDF Reports", desc: "Set up automated weekly or monthly report delivery to executive distribution lists." },
      { icon: Globe, title: "Multi-Currency Reporting", desc: "View cost dashboards in any configured currency with live exchange rate conversion." },
    ],
    stats: [
      { value: "20+", label: "Pre-built dashboard widgets" },
      { value: "<5 min", label: "Dashboard setup time" },
      { value: "Zero", label: "Manual report compilation needed" },
    ],
    testimonial: {
      quote: "\u201cThe budget tracking features give us clear visibility into project spend and help us identify cost variances before they impact the schedule.\u201d",
      author: "Preeti Nair", role: "PMO Director", company: "Tata Motors",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE PAGES — rich content
// ─────────────────────────────────────────────────────────────────────────────
const RESOURCE_DATA = {
  "help-center": {
    badge: "SUPPORT",
    icon: LifeBuoy,
    title: "CALDIM Help Center",
    subtitle: "Comprehensive guides, tutorials, and direct support to help your team get the most from CALDIM.",
    desc: "Whether you're onboarding your first workspace or configuring advanced budget rules, the CALDIM Help Center has step-by-step documentation, video walkthroughs, and live support to keep you moving forward.",
    sections: [
      {
        title: "Getting Started",
        icon: Zap,
        items: ["Creating your first workspace", "Importing a design release spreadsheet", "Inviting team members and assigning roles", "Configuring phase-gates and milestone templates"],
      },
      {
        title: "Core Features",
        icon: CheckSquare,
        items: ["Setting up the spreadsheet sync engine", "Using AI meeting minutes (MOM)", "Building budget masters and tracking spend", "Creating and assigning tasks across teams"],
      },
      {
        title: "Administration",
        icon: Settings,
        items: ["Managing user roles and permissions", "Configuring SSO and SAML authentication", "Setting up audit logs and data retention policies", "Workspace backup and data export options"],
      },
      {
        title: "Troubleshooting",
        icon: HelpCircle,
        items: ["Sync agent connectivity issues", "Spreadsheet column mapping errors", "Meeting transcription accuracy tips", "Dashboard widget configuration problems"],
      },
    ],
    support: [
      { icon: Mail, label: "Email Support", value: "support@caldim.com", note: "Response within 4 business hours" },
      { icon: MessageSquare, label: "Live Chat", value: "Available on Business & Enterprise plans", note: "Mon–Fri, 9 AM – 6 PM IST" },
      { icon: Headphones, label: "Dedicated CSM", value: "Enterprise accounts only", note: "Direct line to your Customer Success Manager" },
    ],
  },
  "quick-start-guide": {
    badge: "ONBOARDING",
    icon: Zap,
    title: "Quick Start Guide",
    subtitle: "Get your CALDIM workspace running in three simple steps — from signup to first live dashboard in under 30 minutes.",
    desc: "This guide walks new workspace administrators through the essential setup: importing your first design release spreadsheet, configuring your phase-gate milestones, inviting your team, and going live with your first analytics dashboard.",
    sections: [
      {
        title: "Step 1 — Create Your Workspace",
        icon: Building2,
        items: ["Sign up and name your workspace", "Choose your industry template (Automotive, Aerospace, General Engineering)", "Set your base currency and fiscal calendar", "Configure company branding and workspace settings"],
      },
      {
        title: "Step 2 — Import Your First Tracker",
        icon: Download,
        items: ["Upload your Excel design release tracker via drag-and-drop", "Map columns: Part Number, Description, Owner, Status, Target Date", "Review CALDIM's auto-detected release codes and milestone flags", "Run the first sync and verify data in the live dashboard"],
      },
      {
        title: "Step 3 — Invite Your Team",
        icon: Users,
        items: ["Send role-based invites to PMO, design, procurement, and quality teams", "Assign admin, editor, or viewer permissions per project", "Walk each new member through the 5-minute orientation tour", "Enable email and in-app notifications for their assigned tasks"],
      },
      {
        title: "Step 4 — Go Live",
        icon: TrendingUp,
        items: ["Create your first executive dashboard with key program widgets", "Schedule your first AI-assisted status review meeting", "Set up budget masters and link to tracker data", "Invite your first supplier with scoped guest access"],
      },
    ],
    support: [
      { icon: Video, label: "Video Walkthrough", value: "Interactive video guide available in-app", note: "~12 minutes total" },
      { icon: LifeBuoy, label: "Onboarding Call", value: "Book a free 45-minute setup call", note: "Available for all new workspaces" },
      { icon: FileText, label: "Download PDF Guide", value: "Full quick-start PDF with screenshots", note: "Available in English and Hindi" },
    ],
  },
  "api-documentation": {
    badge: "DEVELOPERS",
    icon: FileCode,
    title: "API Documentation",
    subtitle: "Integrate CALDIM with your internal engineering systems, ERP platforms, and reporting tools using our REST API.",
    desc: "The CALDIM REST API provides programmatic access to project data, release statuses, budget figures, and action items. Webhook support enables real-time event-driven integrations with downstream systems.",
    sections: [
      {
        title: "Authentication",
        icon: Key,
        items: ["API Key generation and management in workspace settings", "OAuth 2.0 authorization code flow for user-context requests", "SAML 2.0 / OpenID Connect for enterprise SSO integration", "Token expiry, rotation policies, and rate limits"],
      },
      {
        title: "Core Endpoints",
        icon: Server,
        items: ["/api/v1/projects — List, create, update, delete projects", "/api/v1/tasks — Task CRUD with filter and sort options", "/api/v1/trackers — Retrieve sync statuses and upload tracker data", "/api/v1/budgets — Fetch budget masters and cost variance data"],
      },
      {
        title: "Webhooks",
        icon: Bell,
        items: ["task.completed — Triggered when a task is marked complete", "tracker.synced — Triggered when a new spreadsheet sync is processed", "budget.alert — Triggered when spend crosses a configured threshold", "mom.published — Triggered when meeting minutes are finalized"],
      },
      {
        title: "Integration Guides",
        icon: Package,
        items: ["Connecting to SAP or Oracle ERP for budget synchronization", "Power BI connector for advanced external dashboard building", "Jira sync bridge for software-side task mirroring", "REST API Postman collection — downloadable from developer portal"],
      },
    ],
    support: [
      { icon: Code, label: "Developer Portal", value: "api.caldim.com", note: "Full OpenAPI spec and Postman collection" },
      { icon: MessageSquare, label: "Developer Slack Community", value: "community.caldim.com", note: "700+ API integration developers" },
      { icon: Mail, label: "API Support", value: "api-support@caldim.com", note: "Dedicated line for integration issues" },
    ],
  },
  "video-tutorials": {
    badge: "LEARNING",
    icon: Video,
    title: "Video Tutorial Library",
    subtitle: "Short, focused walkthroughs of every CALDIM feature — from first-time setup to advanced analytics configuration.",
    desc: "Our tutorial library covers the complete CALDIM feature set. Each video is designed to be under 10 minutes, practical, and directly applicable to your engineering program management workflows.",
    sections: [
      {
        title: "Getting Started Series",
        icon: Zap,
        items: ["01 — Workspace setup and first import (8 min)", "02 — Inviting your team and assigning roles (5 min)", "03 — Your first program dashboard (7 min)", "04 — Running your first AI meeting minutes session (6 min)"],
      },
      {
        title: "Core Feature Deep-Dives",
        icon: BarChart2,
        items: ["Excel sync engine — advanced column mapping (10 min)", "Budget masters — setting targets and tracking variance (9 min)", "AI MOM — configuring action extraction rules (8 min)", "Portfolio view — executive dashboard customization (7 min)"],
      },
      {
        title: "Administration & Security",
        icon: Shield,
        items: ["Configuring role-based access controls (6 min)", "Setting up SSO and SAML integration (8 min)", "Audit log review and export (5 min)", "Data retention and workspace backup settings (6 min)"],
      },
      {
        title: "Integration & API",
        icon: Code,
        items: ["API authentication and first request (8 min)", "Setting up your first webhook integration (7 min)", "Power BI connector walkthrough (10 min)", "SAP budget sync configuration guide (9 min)"],
      },
    ],
    support: [
      { icon: Video, label: "Video Library", value: "50+ tutorials and counting", note: "New videos added monthly" },
      { icon: Globe, label: "Language Availability", value: "English, Hindi, German (coming soon)", note: "" },
      { icon: LifeBuoy, label: "Request a Tutorial", value: "tutorials@caldim.com", note: "We build tutorials based on user requests" },
    ],
  },
  "webinars": {
    badge: "LIVE EVENTS",
    icon: Calendar,
    title: "Live Webinars & Product Demos",
    subtitle: "Join our solutions engineers for live product walkthroughs, industry Q&A sessions, and customer panel discussions.",
    desc: "CALDIM hosts live webinars every month covering new feature launches, industry best practices in automotive program management, and customer success stories. All sessions are recorded and available on demand.",
    sections: [
      {
        title: "Upcoming Webinars",
        icon: Calendar,
        items: ["July 10 — AI Meeting Minutes: Getting Maximum Value (60 min)", "July 17 — Portfolio Dashboards for Engineering Leadership (45 min)", "July 24 — Integrating CALDIM with SAP & Oracle ERP (60 min)", "August 7 — APQP Phase-Gate Governance with CALDIM (60 min)"],
      },
      {
        title: "On-Demand Recordings",
        icon: Video,
        items: ["Introduction to CALDIM for Automotive OEM Teams", "Excel Tracker to Live Database: The Sync Engine Explained", "AI MOM in Action: Real Meeting Case Study", "Managing Multi-Program Portfolios at Scale"],
      },
      {
        title: "Webinar Types",
        icon: Users,
        items: ["Feature Deep-Dives — 45-minute focused walkthroughs of specific modules", "Industry Roundtables — Panels with automotive PMO leaders", "Customer Case Studies — Live Q&A with CALDIM customers", "Technical Integration Sessions — Developer-focused implementation guides"],
      },
      {
        title: "How to Join",
        icon: Globe,
        items: ["Register free at caldim.com/webinars", "Receive calendar invite and dial-in link after registration", "Submit questions in advance for Q&A prioritization", "Access recordings within 48 hours if you miss the live session"],
      },
    ],
    support: [
      { icon: Calendar, label: "Register Now", value: "caldim.com/webinars", note: "Free for all users and prospects" },
      { icon: Mail, label: "Host a Private Session", value: "events@caldim.com", note: "Custom private demos for your team" },
      { icon: Video, label: "On-Demand Library", value: "30+ recordings available", note: "No registration required for recordings" },
    ],
  },
  "blog": {
    badge: "INSIGHTS",
    icon: Newspaper,
    title: "Engineering Excellence Blog",
    subtitle: "Expert insights, best practices, and case studies for engineering project management and program governance teams.",
    desc: "The CALDIM blog publishes weekly articles on automotive program management, engineering analytics, AI applications in project tracking, and lessons from real customer deployments across automotive, aerospace, and industrial sectors.",
    sections: [
      {
        title: "Program Management",
        icon: Target,
        items: ["How to Run APQP Phase-Gates Without Spreadsheet Chaos", "The Hidden Cost of Design Freeze Delays in Automotive Programs", "5 Signs Your PMO Needs a Real-Time Portfolio Dashboard", "OKRs for Engineering Teams: A Practical Implementation Guide"],
      },
      {
        title: "Engineering Analytics",
        icon: BarChart2,
        items: ["From Excel to Live Database: A Tier 1 Supplier Case Study", "How to Measure Part Readiness Across a 10,000-Part BOM", "Budget Variance Analytics: Catching Cost Drift Before It Compounds", "Building a Cost Intelligence System for Vehicle Programs"],
      },
      {
        title: "AI in Engineering",
        icon: Brain,
        items: ["How AI Meeting Minutes Save 2+ Hours Per Review Session", "Action Item Extraction: What AI Gets Right (and Wrong)", "The Future of Engineering Documentation: AI-Assisted MOM", "Using AI to Predict Program Schedule Risk Before It Happens"],
      },
      {
        title: "Customer Stories",
        icon: Building2,
        items: ["How Mahindra Electric Reduced Tracker Version Conflicts by 90%", "Bosch Automotive's Journey to Zero Manual Meeting Minutes", "Tata Motors: Real-Time Portfolio Governance at Program Scale", "Volvo Trucks: Bridging Plant Operations and Engineering PMO"],
      },
    ],
    support: [
      { icon: Newspaper, label: "Subscribe to Weekly Digest", value: "blog.caldim.com/subscribe", note: "New articles every Tuesday" },
      { icon: Mail, label: "Write for the Blog", value: "editorial@caldim.com", note: "We welcome industry expert contributors" },
      { icon: Globe, label: "Read the Blog", value: "blog.caldim.com", note: "Free access, no login required" },
    ],
  },
  "changelog": {
    badge: "PRODUCT UPDATES",
    icon: GitBranch,
    title: "Product Changelog",
    subtitle: "Every new feature, improvement, and fix — documented transparently and delivered continuously.",
    desc: "CALDIM ships product updates every two weeks. This changelog documents what's new, what's improved, and what's been fixed — so your team always knows exactly what version of the platform they're using and what's coming next.",
    sections: [
      {
        title: "June 2026 — Release 4.2",
        icon: Sparkles,
        items: ["NEW: AI action item extraction now supports Hindi and regional language transcriptions", "NEW: Portfolio view — multi-currency budget aggregation across programs", "IMPROVED: Excel sync engine — 3× faster processing for workbooks over 50,000 rows", "FIX: Resolved intermittent notification delivery failures on shared workspace plans"],
      },
      {
        title: "May 2026 — Release 4.1",
        icon: Zap,
        items: ["NEW: Dashboard widget — OKR progress ring with drill-down to linked tasks", "NEW: API v1.4 — webhook support for budget.alert and mom.published events", "IMPROVED: Meeting transcription — speaker diarization accuracy improved by 18%", "IMPROVED: Task dependency engine — now supports circular dependency detection"],
      },
      {
        title: "April 2026 — Release 4.0",
        icon: TrendingUp,
        items: ["NEW: Full portfolio view module — executive multi-program dashboard", "NEW: Power BI connector — direct data feed from CALDIM to external BI tools", "NEW: SAML 2.0 SSO support for enterprise identity providers", "SECURITY: TLS 1.3 enforced across all API endpoints and dashboard connections"],
      },
      {
        title: "Upcoming — Q3 2026 Roadmap",
        icon: Target,
        items: ["German and French language support for transcription and UI", "Mobile app (iOS & Android) — task management and timesheet logging", "Salesforce CRM integration for opportunity-to-project pipeline tracking", "Advanced risk forecasting module using historical program data patterns"],
      },
    ],
    support: [
      { icon: Bell, label: "Subscribe to Changelog", value: "changelog.caldim.com", note: "Get notified with every release" },
      { icon: MessageSquare, label: "Feature Requests", value: "feedback.caldim.com", note: "Vote on features and submit ideas" },
      { icon: LifeBuoy, label: "Report an Issue", value: "support@caldim.com", note: "We respond within 4 business hours" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY PAGES — unique rich content
// ─────────────────────────────────────────────────────────────────────────────
const COMPANY_DATA = {
  "about-us": null,
  "careers": null,
  "partner-program": null,
  "security-compliance": null,
  "privacy-policy": null,
  "terms-of-service": null,
  "contact": null,
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY SETS
// ─────────────────────────────────────────────────────────────────────────────
const FEATURE_SLUGS = new Set(['task-management','excel-analytics','minutes-of-meeting-mom','time-sheets','team-collaboration','goal-tracking','portfolio-view','dashboards']);
const RESOURCE_SLUGS = new Set(['help-center','quick-start-guide','api-documentation','video-tutorials','webinars','blog','changelog']);
const COMPANY_SLUGS = new Set(['about-us','careers','partner-program','security-compliance','privacy-policy','terms-of-service','contact']);

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/* ── Feature Page ── */
function FeaturePage({ data, openModal }) {
  const Icon = data.icon;
  return (
    <>
      {/* Hero */}
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Icon className="h-3.5 w-3.5" />
            {data.badge}
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">{data.title}</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">{data.subtitle}</p>
          <p className="mt-5 text-[15px] text-slate-600 max-w-3xl mx-auto leading-relaxed">{data.desc}</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <button onClick={() => openModal('demo')} className="zoho-btn-red cursor-pointer shadow-md inline-flex items-center gap-2">
              REQUEST DEMO <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => openModal('sales')} className="zoho-btn-outline cursor-pointer">
              SPEAK WITH SALES
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            {data.stats.map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-[13px] font-semibold text-blue-100 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-3">
              <span className="h-1 w-6 bg-blue-600 rounded" /> How It Works
            </div>
            <h2 className="zoho-h2 text-3xl md:text-4xl">From setup to results in four steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.howItWorks.map((step, i) => {
              const SIcon = step.icon;
              return (
                <div key={i} className="relative">
                  <div className="text-[11px] font-black text-blue-200 tracking-[0.2em] mb-3">{step.step}</div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <SIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-[13.5px] text-slate-500 leading-relaxed">{step.desc}</p>
                  {i < data.howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-14 right-0 translate-x-1/2 -translate-y-1/2">
                      <ChevronRight className="h-5 w-5 text-blue-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-3">
              <span className="h-1 w-6 bg-blue-600 rounded" /> Capabilities
            </div>
            <h2 className="zoho-h2 text-3xl md:text-4xl">Everything your team needs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.capabilities.map((cap, i) => {
              const CIcon = cap.icon;
              return (
                <div key={i} className="bg-white border border-slate-150 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <CIcon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 mb-2">{cap.title}</h3>
                  <p className="text-[13.5px] text-slate-500 leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      {data.testimonial && (
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="flex justify-center gap-1 text-amber-400 mb-6">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="text-xl italic text-slate-700 leading-relaxed font-sans">{data.testimonial.quote}</p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white text-sm font-bold grid place-items-center uppercase">
                {data.testimonial.author.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[13px] font-bold text-slate-900">{data.testimonial.author}</p>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {data.testimonial.role} &middot; {data.testimonial.company}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Feature CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to see it in action?</h2>
          <p className="text-blue-100 text-[15px] mb-8">Join engineering teams at Tata Motors, Bosch, Mahindra, and Volvo who rely on CALDIM every day.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => openModal('demo')} className="px-6 py-3 text-[14px] font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-lg shadow-md transition-all cursor-pointer active:scale-95">
              Book a Free Demo
            </button>
            <button onClick={() => openModal('sales')} className="px-6 py-3 text-[14px] font-bold text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all cursor-pointer active:scale-95">
              Talk to Sales
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Resource Page ── */
function ResourcePage({ data, openModal }) {
  const Icon = data.icon;
  return (
    <>
      {/* Hero */}
      <section className="relative pt-20 pb-16 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Icon className="h-3.5 w-3.5" />
            {data.badge}
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">{data.title}</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">{data.subtitle}</p>
          <p className="mt-5 text-[15px] text-slate-600 max-w-3xl mx-auto leading-relaxed">{data.desc}</p>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {data.sections.map((section, i) => {
              const SIcon = section.icon;
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-7 bg-slate-50/40 hover:bg-slate-50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <SIcon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-900">{section.title}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-[13.5px] text-slate-600 leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support / Access Info */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-bold text-slate-900 mb-8 text-center">Get Direct Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.support.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <SIcon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-[14px] font-bold text-slate-900 mb-1">{s.value}</div>
                  {s.note && <div className="text-[12px] text-slate-400">{s.note}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resource CTA */}
      <section className="py-14 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">Still have questions?</h2>
          <p className="text-slate-400 text-[14px] mb-7">Our team is happy to help — book a call or reach out directly.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => openModal('demo')} className="px-5 py-2.5 text-[14px] font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all cursor-pointer active:scale-95">
              Book a Demo
            </button>
            <button onClick={() => openModal('sales')} className="px-5 py-2.5 text-[14px] font-bold text-white border border-slate-700 hover:bg-slate-800 rounded-lg transition-all cursor-pointer active:scale-95">
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Company: About Us ── */
function AboutUsPage({ openModal }) {
  const values = [
    { icon: Target, title: "Engineering-First", desc: "Every feature is designed for the realities of physical product development — not adapted from generic project management software." },
    { icon: Shield, title: "Data Integrity", desc: "Your program data is your competitive advantage. We treat accuracy, security, and auditability as non-negotiable foundations." },
    { icon: Users, title: "Team Empowerment", desc: "CALDIM makes every team member — from PMO to plant floor — equally informed, accountable, and effective." },
    { icon: TrendingUp, title: "Continuous Improvement", desc: "We ship meaningful updates every two weeks, driven by feedback from the engineering teams who use CALDIM daily." },
  ];
  const milestones = [
    { year: "2020", event: "CALDIM founded by engineers frustrated with spreadsheet-based program tracking in automotive development." },
    { year: "2021", event: "First customer deployment — a Tier 1 supplier managing PPAP documentation for three vehicle programs simultaneously." },
    { year: "2022", event: "Launched Excel Sync Engine — bi-directional cell-level sync connecting desktop workbooks to cloud databases in real time." },
    { year: "2023", event: "AI Meeting Minutes (MOM) module launched. 2,000+ meetings processed in the first month of availability." },
    { year: "2024", event: "Portfolio View and OKR tracking modules released. First OEM-level customer deployments at major automotive manufacturers." },
    { year: "2025", event: "Reached 10,000 active users across 200+ engineering programs in automotive, aerospace, and industrial sectors." },
    { year: "2026", event: "CALDIM 4.0 launched — Power BI connector, multi-language support, and enterprise SSO. Expanding globally." },
  ];
  return (
    <>
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Building2 className="h-3.5 w-3.5" /> COMPANY
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">We build the platform engineering teams deserve</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">CALDIM was founded by engineers who lived the pain of managing complex vehicle programs through spreadsheets, email chains, and disconnected tools. We built the platform we always wished existed.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-3">Our Mission</div>
              <h2 className="zoho-h2 text-3xl mb-5">Bring real-time intelligence to every engineering program</h2>
              <p className="text-slate-600 text-[15px] leading-relaxed mb-4">Engineering teams managing physical products — vehicles, aircraft, industrial machinery — have always operated in complexity. Thousands of parts, dozens of suppliers, multi-year timelines, and regulatory gates that can't be missed.</p>
              <p className="text-slate-600 text-[15px] leading-relaxed mb-6">CALDIM exists to give these teams a purpose-built platform that replaces fragmented Excel files, disconnected systems, and manual status meetings with live, intelligent program governance.</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "200+", label: "Active programs managed" },
                  { value: "10,000+", label: "Engineers on the platform" },
                  { value: "50+", label: "Customer organizations" },
                  { value: "15", label: "Industries served" },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="text-2xl font-extrabold text-blue-600">{s.value}</div>
                    <div className="text-[12px] text-slate-500 font-semibold mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {values.map((v, i) => {
                const VIcon = v.icon;
                return (
                  <div key={i} className="flex items-start gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                    <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <VIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[14.5px]">{v.title}</div>
                      <div className="text-slate-500 text-[13px] leading-relaxed mt-1">{v.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-3">Our Journey</div>
            <h2 className="zoho-h2 text-3xl">Built milestone by milestone</h2>
          </div>
          <div className="relative">
            <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-blue-100 hidden md:block" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-6 md:gap-10">
                  <div className="w-12 text-right">
                    <span className="text-[12px] font-extrabold text-blue-600">{m.year}</span>
                  </div>
                  <div className="hidden md:flex h-6 w-6 rounded-full bg-blue-600 border-4 border-blue-50 flex-shrink-0 mt-0.5 relative z-10" />
                  <div className="flex-1 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <p className="text-[13.5px] text-slate-700 leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to join our growing customer community?</h2>
          <p className="text-blue-100 text-[14px] mb-7">See why engineering teams at leading OEMs and Tier 1 suppliers choose CALDIM.</p>
          <button onClick={() => openModal('demo')} className="px-7 py-3 text-[14px] font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-lg shadow-md cursor-pointer transition-all active:scale-95">
            Book a Demo
          </button>
        </div>
      </section>
    </>
  );
}

/* ── Company: Careers ── */
function CareersPage({ openModal }) {
  const benefits = [
    { icon: Globe, title: "Remote-First Work", desc: "Work from anywhere. We have team members across India, Germany, and the US with no mandatory office days." },
    { icon: TrendingUp, title: "Learning Stipend", desc: "₹50,000 / year for courses, certifications, books, or conferences that help you grow professionally." },
    { icon: Heart, title: "Comprehensive Health Cover", desc: "Medical, dental, and vision coverage for you and your immediate family from day one." },
    { icon: Clock, title: "Flexible Hours", desc: "Flexible start and end times around core collaboration hours. We care about output, not clock-watching." },
    { icon: Award, title: "Performance Equity", desc: "ESOPs for all full-time employees with a 4-year vesting schedule and annual review grants." },
    { icon: Users, title: "Inclusive Culture", desc: "Regular all-hands, team offsites, and an internal mentorship program. 40% of leadership roles are held by women." },
  ];
  const openings = [
    { role: "Senior Backend Engineer — Python / Django", team: "Engineering", location: "Remote (India)", type: "Full-time" },
    { role: "Product Manager — Analytics & Dashboards", team: "Product", location: "Pune / Remote", type: "Full-time" },
    { role: "Enterprise Sales Executive", team: "Sales", location: "Mumbai / Delhi", type: "Full-time" },
    { role: "Customer Success Manager — Automotive", team: "Customer Success", location: "Remote (India)", type: "Full-time" },
    { role: "AI/ML Engineer — NLP & Transcription", team: "Engineering", location: "Remote (India / EU)", type: "Full-time" },
  ];
  return (
    <>
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Briefcase className="h-3.5 w-3.5" /> CAREERS
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">Build the future of engineering project management</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">Join a team solving complex, real-world problems for engineering teams at some of the world's most ambitious manufacturing organizations.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="zoho-h2 text-3xl mb-3">Benefits & Perks</h2>
            <p className="text-slate-500 text-[15px]">We invest in the people who build CALDIM.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-6 hover:border-blue-100 hover:shadow-md transition-all">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                    <BIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-[14.5px] mb-2">{b.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="zoho-h2 text-3xl mb-3">Open Positions</h2>
            <p className="text-slate-500 text-[15px]">We're growing — come build with us.</p>
          </div>
          <div className="space-y-4">
            {openings.map((o, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div>
                  <div className="font-bold text-slate-900 text-[15px]">{o.role}</div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">{o.team}</span>
                    <span className="flex items-center gap-1 text-[12px] text-slate-400"><MapPin className="h-3.5 w-3.5" />{o.location}</span>
                    <span className="text-[12px] text-slate-400">{o.type}</span>
                  </div>
                </div>
                <button onClick={() => openModal('sales')} className="px-4 py-2 text-[13px] font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all cursor-pointer whitespace-nowrap flex-shrink-0">
                  Apply Now →
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-[13px] mt-6">Don't see a fit? Send your CV to <span className="text-blue-600 font-semibold">careers@caldim.com</span> — we're always looking for great talent.</p>
        </div>
      </section>
    </>
  );
}

/* ── Company: Partner Program ── */
function PartnerProgramPage({ openModal }) {
  const tiers = [
    {
      name: "Authorized Partner", color: "border-slate-300", badge: "bg-slate-100 text-slate-700",
      benefits: ["Access to partner sales toolkit and product training", "20% referral commission on first-year subscription", "Co-branded proposals and presentation templates", "Partner listing on caldim.com/partners directory"],
      requirement: "Ideal for consulting firms and individual solution advisors.",
    },
    {
      name: "Gold Partner", color: "border-amber-400", badge: "bg-amber-100 text-amber-700",
      benefits: ["25% referral commission + 10% on renewals", "Dedicated Partner Success Manager", "Joint go-to-market co-marketing opportunities", "Early access to new features and beta programs", "Custom implementation support resources"],
      requirement: "Requires 3+ active customer deployments and partner certification.",
    },
    {
      name: "Platinum Partner", color: "border-blue-500", badge: "bg-blue-100 text-blue-700",
      benefits: ["30% referral commission + 15% on renewals", "Named account collaboration with CALDIM Sales team", "Co-funded marketing development funds (MDF)", "Priority access to product roadmap briefings", "Dedicated technical implementation support", "Custom white-label licensing options available"],
      requirement: "Requires 10+ active deployments and passed solution architect certification.",
    },
  ];
  return (
    <>
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Handshake className="h-3.5 w-3.5" /> PARTNER PROGRAM
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">Grow your business with the CALDIM Partner Ecosystem</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">Implementation partners, resellers, and system integrators — join a growing ecosystem delivering engineering program governance to manufacturing organizations worldwide.</p>
          <button onClick={() => openModal('sales')} className="mt-8 zoho-btn-red cursor-pointer shadow-md inline-flex items-center gap-2">
            APPLY NOW <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="zoho-h2 text-3xl mb-3">Partner Tiers</h2>
            <p className="text-slate-500 text-[15px]">Choose the partnership level that fits your business model and growth ambitions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <div key={i} className={`border-2 ${tier.color} rounded-2xl p-7 hover:shadow-lg transition-all`}>
                <div className={`inline-block text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-4 ${tier.badge}`}>{tier.name}</div>
                <ul className="space-y-3 mb-6">
                  {tier.benefits.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[13px] text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[12px] text-slate-400 border-t border-slate-100 pt-4">{tier.requirement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to become a CALDIM Partner?</h2>
          <p className="text-blue-100 text-[14px] mb-7">Complete the application form and our partnerships team will reach out within 2 business days.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={() => openModal('sales')} className="px-6 py-3 text-[14px] font-bold text-blue-700 bg-white hover:bg-blue-50 rounded-lg cursor-pointer transition-all active:scale-95">
              Apply for Partnership
            </button>
            <a href="mailto:partners@caldim.com" className="px-6 py-3 text-[14px] font-bold text-white border border-white/40 hover:bg-white/10 rounded-lg cursor-pointer transition-all">
              partners@caldim.com
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Company: Security & Compliance ── */
function SecurityPage() {
  const standards = [
    { icon: ShieldCheck, title: "SOC 2 Type II", desc: "Annual independent audit of security, availability, and confidentiality controls." },
    { icon: Globe, title: "GDPR Compliant", desc: "Full compliance with EU General Data Protection Regulation for all European customer data." },
    { icon: Lock, title: "ISO 27001 Aligned", desc: "Information security management controls aligned to ISO 27001 best practices." },
    { icon: FileText, title: "ITAR-Aware Design", desc: "Architecture designed to support deployment requirements for defense and aerospace customers." },
  ];
  const technical = [
    { title: "Encryption in Transit", value: "TLS 1.3 on all connections — no older TLS versions accepted." },
    { title: "Encryption at Rest", value: "AES-256 encryption for all database records and file storage." },
    { title: "Authentication", value: "MFA required for admin accounts. SAML 2.0 and OpenID Connect SSO supported." },
    { title: "Access Control", value: "Role-based access control (RBAC) with project-level and row-level permissions." },
    { title: "Audit Logging", value: "Immutable audit log of every user action — searchable and exportable for compliance reviews." },
    { title: "Data Residency", value: "Dedicated data hosting available in India (Mumbai), EU (Frankfurt), and US (Virginia)." },
    { title: "Penetration Testing", value: "Annual third-party penetration testing with results shared with enterprise customers on request." },
    { title: "Backup & Recovery", value: "Daily automated backups with 30-day retention. RTO < 4 hours, RPO < 1 hour." },
  ];
  return (
    <>
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Shield className="h-3.5 w-3.5" /> SECURITY & COMPLIANCE
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">Enterprise-grade security for your program data</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">Your engineering program data is among your most sensitive competitive assets. CALDIM is built from the ground up to protect it.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="zoho-h2 text-3xl mb-3">Compliance Standards</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {standards.map((s, i) => {
              const SIcon = s.icon;
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-6 text-center hover:border-blue-100 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                    <SIcon className="h-6 w-6" />
                  </div>
                  <div className="font-bold text-slate-900 text-[14.5px] mb-2">{s.title}</div>
                  <p className="text-[12.5px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
          <h2 className="zoho-h2 text-3xl mb-8 text-center">Technical Security Specifications</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {technical.map((t, i) => (
              <div key={i} className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100 last:border-0`}>
                <div className="font-bold text-slate-900 text-[13.5px] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  {t.title}
                </div>
                <div className="md:col-span-2 text-[13.5px] text-slate-600">{t.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-white mb-3">Request our Security Documentation Pack</h2>
          <p className="text-slate-400 text-[14px] mb-6">Get our full SOC 2 Type II report, penetration test summary, and data processing agreement (DPA) by contacting our security team.</p>
          <a href="mailto:security@caldim.com" className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
            <Mail className="h-4 w-4" /> security@caldim.com
          </a>
        </div>
      </section>
    </>
  );
}

/* ── Company: Privacy Policy ── */
function PrivacyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us when creating your account (name, email address, job title, company name), information generated by your use of the platform (project data, task records, meeting transcripts, file uploads, and usage analytics), and technical information collected automatically (IP address, browser type, device identifiers, and session data for security and performance monitoring). We do not sell your personal information to third parties.",
    },
    {
      title: "2. How We Use Your Information",
      content: "We use collected information to provide and improve the CALDIM platform services you have subscribed to, to authenticate your identity and maintain the security of your account, to send transactional communications including service notifications, billing receipts, and security alerts, to provide customer support and respond to your inquiries, and to develop new features based on aggregated, anonymized usage patterns. We will always ask for your explicit consent before using your information for marketing communications.",
    },
    {
      title: "3. Data Storage & Retention",
      content: "Your project data is stored in encrypted cloud databases hosted in your selected data residency region (India, EU, or US). We retain your account data for the duration of your active subscription plus 90 days following cancellation, during which you may export all your data. After this period, all personal and project data is permanently deleted from our systems. Anonymized, aggregated analytics data may be retained for product improvement purposes.",
    },
    {
      title: "4. Data Sharing",
      content: "We share your data only with service providers necessary to operate the platform (hosting providers, email delivery services, payment processors) under strict data processing agreements. We do not share your data with your competitors, advertising networks, or data brokers. We may disclose information when legally required by a valid court order or government authority, in which case we will notify you to the extent permitted by law.",
    },
    {
      title: "5. Your Rights",
      content: "You have the right to access a complete export of all personal data we hold about you, to correct inaccurate personal information, to request permanent deletion of your data (subject to legal retention requirements), to restrict or object to certain data processing activities, and to data portability. To exercise any of these rights, contact our Data Protection Officer at privacy@caldim.com. We will respond within 30 days.",
    },
    {
      title: "6. Contact Our DPO",
      content: "Our Data Protection Officer can be reached at privacy@caldim.com for any privacy-related questions, concerns, or requests. For EU residents, CALDIM's EU Representative can be contacted at eu-privacy@caldim.com. This Privacy Policy was last updated on June 1, 2026, and applies to all CALDIM products and services.",
    },
  ];
  return (
    <>
      <section className="relative pt-20 pb-16 overflow-hidden zoho-hero-bg">
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <Lock className="h-3.5 w-3.5" /> PRIVACY POLICY
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-400 text-[14px]">Last updated: June 1, 2026 &bull; Effective for all CALDIM products and services</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="prose prose-slate max-w-none">
            {sections.map((s, i) => (
              <div key={i} className="mb-10 pb-10 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                <h2 className="text-[18px] font-bold text-slate-900 mb-3">{s.title}</h2>
                <p className="text-[14.5px] text-slate-600 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[14px] text-blue-800 font-semibold">Questions about this policy?</p>
            <p className="text-[13px] text-blue-600 mt-1">Contact our Data Protection Officer at <a href="mailto:privacy@caldim.com" className="underline">privacy@caldim.com</a></p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Company: Terms of Service ── */
function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using the CALDIM platform (the \"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you are entering these Terms on behalf of a company or organization, you represent and warrant that you have authority to bind that entity. If you do not agree with any part of these Terms, you may not access the Service.",
    },
    {
      title: "2. Subscription & Billing",
      content: "CALDIM offers subscription-based access billed monthly or annually as selected during signup. Annual subscriptions are billed upfront and are non-refundable after the first 14 days. Monthly subscriptions may be cancelled at any time with effect at the end of the current billing period. Pricing is exclusive of applicable taxes (GST, VAT, etc.) which will be added to invoices as required by law. We reserve the right to change subscription pricing with 60 days' written notice.",
    },
    {
      title: "3. Acceptable Use",
      content: "You may use the Service only for lawful engineering project management purposes within your organization. You may not share login credentials across unauthorized users, attempt to reverse-engineer, decompile, or extract source code, use the Service to store, transmit, or process unlawful content or malware, use automated scraping tools or bots against our platform, or resell or sublicense access to the Service without written partner authorization from CALDIM.",
    },
    {
      title: "4. Data Ownership & Portability",
      content: "You retain full ownership of all project data, files, and content you upload to the Service. CALDIM does not claim any intellectual property rights over your data. You may export all your data at any time in CSV, PDF, or JSON formats through the workspace settings. Upon subscription cancellation, your data remains accessible for 90 days before being permanently deleted.",
    },
    {
      title: "5. Service Availability & SLA",
      content: "CALDIM targets 99.9% monthly uptime for all paid subscription tiers (excluding scheduled maintenance windows, which are communicated at least 48 hours in advance). Enterprise plan customers are entitled to a service credit equal to 10% of monthly fees for each hour of downtime beyond the monthly SLA. Business plan customers are entitled to 5% credit per incident. Free tier access has no SLA guarantees.",
    },
    {
      title: "6. Limitation of Liability",
      content: "To the maximum extent permitted by applicable law, CALDIM's total cumulative liability to you for any claim arising from these Terms or use of the Service shall not exceed the total fees paid by you in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages including loss of profits or business opportunities. This limitation applies regardless of the theory of liability.",
    },
    {
      title: "7. Governing Law & Disputes",
      content: "These Terms are governed by the laws of India. Any dispute arising from these Terms shall first be subject to good-faith negotiation for 30 days. If unresolved, disputes shall be submitted to binding arbitration under the Arbitration and Conciliation Act, 1996, conducted in Pune, Maharashtra. Class action proceedings are not permitted under these Terms. Enterprise customers may negotiate alternative jurisdiction clauses in their Master Service Agreements.",
    },
  ];
  return (
    <>
      <section className="relative pt-20 pb-16 overflow-hidden zoho-hero-bg">
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <FileText className="h-3.5 w-3.5" /> LEGAL
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-4">Terms of Service</h1>
          <p className="text-slate-400 text-[14px]">Last updated: June 1, 2026 &bull; Effective for all CALDIM subscriptions</p>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="prose prose-slate max-w-none">
            {sections.map((s, i) => (
              <div key={i} className="mb-10 pb-10 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                <h2 className="text-[18px] font-bold text-slate-900 mb-3">{s.title}</h2>
                <p className="text-[14.5px] text-slate-600 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[14px] text-amber-800 font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Legal questions?</p>
            <p className="text-[13px] text-amber-700 mt-1">Contact our legal team at <a href="mailto:legal@caldim.com" className="underline">legal@caldim.com</a> or reach out to your Account Manager for enterprise MSA negotiation.</p>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Company: Contact ── */
function ContactPage({ openModal }) {
  const contacts = [
    { icon: Mail, label: "General Support", value: "support@caldim.com", note: "Response within 4 business hours" },
    { icon: Briefcase, label: "Sales & Demos", value: "sales@caldim.com", note: "Mon–Fri, 9 AM – 6 PM IST" },
    { icon: Handshake, label: "Partnerships", value: "partners@caldim.com", note: "Partner applications & inquiries" },
    { icon: Shield, label: "Security Team", value: "security@caldim.com", note: "Vulnerability disclosures & DPA requests" },
    { icon: FileText, label: "Billing & Invoices", value: "billing@caldim.com", note: "Subscription, upgrades, and invoice queries" },
    { icon: Lock, label: "Data Protection Officer", value: "privacy@caldim.com", note: "GDPR & data rights requests" },
  ];
  const offices = [
    { city: "Pune", address: "CALDIM Technologies Pvt. Ltd., Level 4, Commerzone IT Park, Yerwada, Pune 411006, India", phone: "+91 20 4892 XXXX" },
    { city: "Mumbai", address: "CALDIM Technologies Pvt. Ltd., One BKC, Bandra Kurla Complex, Mumbai 400051, India", phone: "+91 22 6821 XXXX" },
  ];
  return (
    <>
      <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1 text-[13px] font-semibold text-blue-600 mb-6">
            <MessageSquare className="h-3.5 w-3.5" /> CONTACT US
          </div>
          <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">We're here to help</h1>
          <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">Whether you're exploring CALDIM for the first time, need implementation support, or have a billing question — reach out to the right team and we'll respond promptly.</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <button onClick={() => openModal('demo')} className="zoho-btn-red cursor-pointer shadow-md inline-flex items-center gap-2">
              BOOK A DEMO <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => openModal('sales')} className="zoho-btn-outline cursor-pointer">
              SPEAK WITH SALES
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="zoho-h2 text-3xl mb-3">Contact the Right Team</h2>
            <p className="text-slate-500 text-[15px]">Get your question to the person best equipped to answer it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {contacts.map((c, i) => {
              const CIcon = c.icon;
              return (
                <a key={i} href={`mailto:${c.value}`} className="group block border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <CIcon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{c.label}</div>
                      <div className="text-[13.5px] font-bold text-blue-600">{c.value}</div>
                      <div className="text-[12px] text-slate-400 mt-1">{c.note}</div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="zoho-h2 text-2xl mb-2">Office Locations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {offices.map((o, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-[16px]">{o.city}</span>
                </div>
                <p className="text-[13.5px] text-slate-600 leading-relaxed mb-2">{o.address}</p>
                <p className="text-[13px] text-blue-600 font-semibold">{o.phone}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-slate-400 text-[13px]">Support hours: Monday to Friday, 9 AM – 6 PM IST. Enterprise customers have 24/7 escalation access.</p>
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN InfoPage COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const InfoPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('sales');

  const openModal = (mode = 'sales') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const renderContent = () => {
    // Feature pages
    if (FEATURE_SLUGS.has(slug) && FEATURE_DATA[slug]) {
      return <FeaturePage data={FEATURE_DATA[slug]} openModal={openModal} />;
    }

    // Resource pages
    if (RESOURCE_SLUGS.has(slug) && RESOURCE_DATA[slug]) {
      return <ResourcePage data={RESOURCE_DATA[slug]} openModal={openModal} />;
    }

    // Company pages — unique per page
    if (slug === 'about-us') return <AboutUsPage openModal={openModal} />;
    if (slug === 'careers') return <CareersPage openModal={openModal} />;
    if (slug === 'partner-program') return <PartnerProgramPage openModal={openModal} />;
    if (slug === 'security-compliance') return <SecurityPage />;
    if (slug === 'privacy-policy') return <PrivacyPage />;
    if (slug === 'terms-of-service') return <TermsPage />;
    if (slug === 'contact') return <ContactPage openModal={openModal} />;

    // Fallback — clean generic page
    const rawTitle = slug
      ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : "Information Page";

    return (
      <>
        <section className="relative pt-20 pb-20 overflow-hidden zoho-hero-bg">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h1 className="zoho-h1 text-4xl sm:text-5xl tracking-tight leading-tight mb-5">{rawTitle}</h1>
            <p className="text-[17px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Enterprise project governance and analytics — built for engineering teams managing complex physical programs.
            </p>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              <button onClick={() => openModal('demo')} className="zoho-btn-red cursor-pointer shadow-md inline-flex items-center gap-2">
                REQUEST DEMO <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => openModal('sales')} className="zoho-btn-outline cursor-pointer">
                SPEAK WITH SALES
              </button>
            </div>
          </div>
        </section>
        <section className="py-20 bg-slate-50 border-y border-slate-100">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-slate-500 text-[15px] mb-6">This page is coming soon. Contact us to learn more about this topic.</p>
            <a href="mailto:support@caldim.com" className="inline-flex items-center gap-2 text-blue-600 font-semibold text-[14px] hover:text-blue-700 transition-colors">
              <Mail className="h-4 w-4" /> support@caldim.com
            </a>
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="zoho-font-sans bg-white min-h-screen text-[#0F172A] antialiased selection:bg-blue-500 selection:text-white">
      <Navbar
        onSignIn={() => navigate('/login')}
        onRequestDemo={() => openModal('demo')}
        onAccessProjects={() => navigate('/login')}
      />

      <main className="pt-[72px]">
        {renderContent()}
      </main>

      <Footer onRequestDemo={(mode) => openModal(mode || 'sales')} />

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialUseCase="General Inquiry"
        mode={modalMode}
      />
    </div>
  );
};

export default InfoPage;
