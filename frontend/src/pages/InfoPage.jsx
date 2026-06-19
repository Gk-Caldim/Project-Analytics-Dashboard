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
    title: "Enterprise-Grade Task Management",
    subtitle: "Coordinate complex workflows, track project milestones, and keep every release cycle on schedule — across every team and service.",
    desc: "CALDIM task management is purpose-built for software engineering and product teams. From architecture design to production deployment, every task, dependency, and escalation is tracked in a single, auditable workspace.",
    howItWorks: [
      { step: "01", icon: Edit3, title: "Define Tasks & Milestones", desc: "Break programs into release cycles, create tasks linked to specific modules or deliverables, and set milestones aligned with sprint or roadmap timelines." },
      { step: "02", icon: Users, title: "Assign & Delegate", desc: "Assign tasks to team members across engineering, QA, product, and devops functions with clear owners and due dates." },
      { step: "03", icon: RefreshCw, title: "Track Progress in Real Time", desc: "Monitor completion through live dashboards. Receive automatic alerts when tasks slip, dependencies break, or milestones are at risk." },
      { step: "04", icon: Archive, title: "Close, Sign Off & Archive", desc: "Mark milestones complete, generate sign-off records, and store task history for future audits or program retrospectives." },
    ],
    capabilities: [
      { icon: Layers, title: "Release Milestones", desc: "Pre-configured milestone and sprint structures tailored to modern software development lifecycles." },
      { icon: GitBranch, title: "Task Dependencies", desc: "Link tasks sequentially to prevent cascading integration bottlenecks and highlight critical-path risks automatically." },
      { icon: Bell, title: "Smart Escalation Alerts", desc: "Configurable notification rules for approaching deadlines, status regressions, and ownership gaps." },
      { icon: Filter, title: "Custom Views & Filters", desc: "Filter by status, owner, repository, or sprint. Switch between list, kanban board, and Gantt timeline views." },
      { icon: Users, title: "Bulk Assignment Tools", desc: "Assign or re-assign multiple tasks simultaneously during sprint planning or release kickoff ceremonies." },
      { icon: Shield, title: "Full Audit Trail", desc: "Every task change is logged — who updated what and when — for compliance reviews and traceability reports." },
    ],
    stats: [
      { value: "40%", label: "Faster average task completion" },
      { value: "3×", label: "Fewer missed program milestones" },
      { value: "100%", label: "Action audit traceability" },
    ],
  },
  "excel-analytics": {
    badge: "ANALYTICS ENGINE",
    icon: BarChart2,
    title: "Advanced Spreadsheet Analytics",
    subtitle: "Turn static spreadsheet trackers into a live, interactive engineering database with bi-directional sync and instant visual reporting.",
    desc: "CALDIM's sync engine connects your team's tracking spreadsheets directly to the platform. Track row-level changes, version histories, and edits — then generate visual telemetry, burn-rate charts, and feature readiness reports instantly.",
    howItWorks: [
      { step: "01", icon: Download, title: "Upload or Sync Your Workbooks", desc: "Drag-and-drop your Excel files or connect via the desktop sync agent for automatic background updates as engineers save their trackers." },
      { step: "02", icon: Database, title: "Parse & Normalize", desc: "CALDIM automatically maps columns, detects release codes, and normalizes your module names, owners, and status fields into a structured database." },
      { step: "03", icon: BarChart2, title: "Visualize Live", desc: "View color-coded KPIs, variance trend charts, and part readiness heatmaps updated every time a workbook is saved or synced." },
      { step: "04", icon: FileText, title: "Export Board-Ready Reports", desc: "Generate PDF and CSV summaries for gate reviews, stakeholder meetings, or compliance audits in one click." },
    ],
    capabilities: [
      { icon: RefreshCw, title: "Bi-directional Sync Engine", desc: "Cell-level sync between desktop workbooks and the cloud database. Changes made locally appear in the dashboard within seconds." },
      { icon: Archive, title: "Version History & Diffs", desc: "Full history of every cell change with timestamps, owner attribution, and side-by-side diff views." },
      { icon: BarChart, title: "Spend & Budget Analytics", desc: "Compare budgeted vs. actual cloud and project spend with configurable alert thresholds." },
      { icon: PieChart, title: "Feature Readiness Heatmaps", desc: "Visual status maps showing which modules are on-track, at-risk, or blocked across your codebase." },
      { icon: Bell, title: "Conditional Alerts", desc: "Set rules to flag cells that exceed cost targets, miss completion dates, or change status unexpectedly." },
      { icon: FileText, title: "PDF & CSV Exports", desc: "One-click report generation for program reviews, supplier meetings, and management presentations." },
    ],
    stats: [
      { value: "80%", label: "Reduction in manual reporting time" },
      { value: "5 sec", label: "Average sync latency" },
      { value: "10,000+", label: "Items tracked per program" },
    ],
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
      { icon: Mic, title: "Voice-to-Text Transcription", desc: "High-accuracy transcription for multiple accents common in global engineering program meetings." },
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
  },
  "time-sheets": {
    badge: "RESOURCE TRACKING",
    icon: Clock,
    title: "Engineering Resource Timesheets",
    subtitle: "Track engineering hours against specific project tasks, sprints, and budget codes — with built-in approval workflows.",
    desc: "Log hours by project, task, and phase. CALDIM aligns resource costs with your program budget tracking modules so you always know where engineering hours are going and how they impact your targets.",
    howItWorks: [
      { step: "01", icon: Clock, title: "Log Hours Daily", desc: "Engineers log time against specific tasks, projects, or budget codes from any device. Quick-entry forms take under 30 seconds." },
      { step: "02", icon: UserCheck, title: "Manager Approval Workflow", desc: "Supervisors review and approve submitted timesheets. Disputes are flagged for easy resolution before payroll or billing." },
      { step: "03", icon: BarChart2, title: "Aggregate Against Budget", desc: "Logged hours are automatically mapped to your program budget. Compare actual labor costs against planned allocations by phase." },
      { step: "04", icon: FileText, title: "Compliance Reports", desc: "Generate labor allocation reports by employee, project, or department — formatted for client billing, audits, or HR reviews." },
    ],
    capabilities: [
      { icon: Clock, title: "Project-Based Time Logging", desc: "Tag every hour to a specific project, phase, and task for full allocation visibility." },
      { icon: UserCheck, title: "Multi-Level Approval Workflow", desc: "Configurable approval chains from team lead to department head with comment threads." },
      { icon: BarChart2, title: "Budget Integration", desc: "Labor costs flow directly into program budget dashboards, giving real-time actuals against target allocations." },
      { icon: FileText, title: "Compliance-Ready Reports", desc: "Formatted reports for labor audits, client invoicing, and statutory compliance submissions." },
      { icon: Calendar, title: "Overtime & Leave Tracking", desc: "Track overtime flags, compensatory leave, and attendance records alongside project hours." },
      { icon: Globe, title: "Multi-Currency Support", desc: "Log and report hours in local currencies with automatic conversion for global program reporting." },
    ],
    stats: [
      { value: "60%", label: "Reduction in manual timesheet errors" },
      { value: "100%", label: "Budget-to-actuals visibility" },
      { value: "<30 sec", label: "Average daily log entry time" },
    ],
  },
  "team-collaboration": {
    badge: "COLLABORATION",
    icon: Users,
    title: "Cross-Functional Collaboration Hub",
    subtitle: "Unify product management, engineering, QA, and DevOps on a single workspace — eliminating email chains and version drift.",
    desc: "CALDIM provides a shared context layer for all functions touching a software program. Real-time activity feeds, thread-based discussions, and granular permissions ensure every stakeholder sees what they need — and nothing they shouldn't.",
    howItWorks: [
      { step: "01", icon: Building2, title: "Set Up Your Workspace", desc: "Create your workspace and invite team members from development, QA, product management, and operations teams." },
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
  },
  "goal-tracking": {
    badge: "STRATEGIC PLANNING",
    icon: Target,
    title: "Strategic Goal & OKR Tracking",
    subtitle: "Align engineering milestones with high-level corporate targets — and track progress automatically as tasks and releases are updated.",
    desc: "Define key results per project phase and release gate. CALDIM automatically maps task completions and release updates to your strategic goals, giving leadership real-time confidence in program health without manual reporting.",
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
  },
  "portfolio-view": {
    badge: "EXECUTIVE OVERSIGHT",
    icon: Layout,
    title: "Program Portfolio Command Center",
    subtitle: "Monitor every active software platform, release track, and project on a single, live executive dashboard.",
    desc: "CALDIM's portfolio view aggregates status, cost, and risk signals from all active engineering tracks into one command-center view. Engineering leadership can immediately identify which tracks need attention.",
    howItWorks: [
      { step: "01", icon: Building2, title: "Consolidate All Programs", desc: "All active projects and programs automatically appear in the portfolio view. No manual aggregation or dashboard configuration required." },
      { step: "02", icon: BarChart2, title: "Visualize Status at a Glance", desc: "Traffic-light indicators, cost variance bars, and schedule health scores give instant program health signals at the portfolio level." },
      { step: "03", icon: Eye, title: "Drill Down On Demand", desc: "Click any program to zoom into project-level detail — tasks, risks, budget, and resource allocation — without leaving the portfolio context." },
      { step: "04", icon: FileText, title: "Export Executive Reports", desc: "Generate board-ready portfolio summaries in PDF and PowerPoint formats, pre-formatted for leadership review meetings." },
    ],
    capabilities: [
      { icon: Layout, title: "Multi-Program Dashboard", desc: "Consolidated view of all active programs with status, cost, schedule, and risk indicators in a single screen." },
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
  },
  "dashboards": {
    badge: "ANALYTICS",
    icon: BarChart2,
    title: "Executive Analytics Dashboards",
    subtitle: "Real-time KPIs, budget variances, and feature readiness metrics — customizable for every stakeholder from developer to board member.",
    desc: "CALDIM dashboards transform raw project data into clear, actionable visual intelligence. Configure widgets, apply filters, and save views tailored to each team's priorities — from cloud spend summaries to engineering release readiness heatmaps.",
    howItWorks: [
      { step: "01", icon: Settings, title: "Choose Your Widget Library", desc: "Select from 20+ pre-built dashboard widgets — cost variance charts, task burndowns, part readiness gauges, OKR progress rings, and more." },
      { step: "02", icon: Filter, title: "Apply Filters & Segments", desc: "Filter any dashboard by project, date range, team, supplier, or part family. Create saved filter presets for common views." },
      { step: "03", icon: Eye, title: "View Live Data", desc: "All dashboard widgets refresh automatically as underlying task, budget, and spreadsheet data updates — no manual refresh needed." },
      { step: "04", icon: FileText, title: "Export & Share", desc: "Export any dashboard view as a PDF or CSV. Schedule automatic email delivery to stakeholders at weekly or monthly intervals." },
    ],
    capabilities: [
      { icon: BarChart2, title: "20+ Pre-Built Widgets", desc: "Cost variance, schedule health, part readiness, OKR progress, and team velocity widgets available out of the box." },
      { icon: Settings, title: "Fully Customizable Layout", desc: "Drag-and-drop widget arrangement. Save multiple named dashboard views for different audiences." },
      { icon: PieChart, title: "Budget Deviation Analytics", desc: "Visual comparison of planned vs. actual spend by program, phase, module family, or vendor." },
      { icon: RefreshCw, title: "Auto-Refresh Data", desc: "Dashboards update in near-real-time as task completions, budget updates, and file syncs occur." },
      { icon: FileText, title: "Scheduled PDF Reports", desc: "Set up automated weekly or monthly report delivery to executive distribution lists." },
      { icon: Globe, title: "Multi-Currency Reporting", desc: "View cost dashboards in any configured currency with live exchange rate conversion." },
    ],
    stats: [
      { value: "20+", label: "Pre-built dashboard widgets" },
      { value: "<5 min", label: "Dashboard setup time" },
      { value: "Zero", label: "Manual report compilation needed" },
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

      {/* Feature CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to see it in action?</h2>
          <p className="text-blue-100 text-[15px] mb-8">Join engineering and product teams at leading technology organizations relying on CALDIM every day.</p>
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

    // Resource pages and Company pages — rendered as "Coming Soon" screen
    if (RESOURCE_SLUGS.has(slug) || COMPANY_SLUGS.has(slug)) {
      return (
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center bg-slate-50/50">
          <p className="text-[17px] text-slate-600 mb-6 leading-relaxed">
            This page is coming soon. Contact us to learn more about this topic.
          </p>
          <a
            href="mailto:support@caldim.com"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-blue-600 font-bold hover:text-blue-800 hover:border-blue-300 transition-all active:scale-95 cursor-pointer text-[15px]"
          >
            <Mail className="h-4.5 w-4.5 text-blue-600" />
            support@caldim.com
          </a>
        </div>
      );
    }


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
