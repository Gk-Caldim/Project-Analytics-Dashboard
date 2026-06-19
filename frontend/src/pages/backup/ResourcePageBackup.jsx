import React from 'react';
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

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE DATA (Original Backup)
// ─────────────────────────────────────────────────────────────────────────────
export const RESOURCE_DATA = {
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
    subtitle: "Expert insights, best practices, and case studies for software project management and engineering governance teams.",
    desc: "The CALDIM blog publishes weekly articles on software engineering practices, project analytics, AI applications in task tracking, and lessons from scale deployments.",
    sections: [
      {
        title: "Project Management",
        icon: Target,
        items: ["How to Manage Release Gates Without Spreadsheet Chaos", "The Hidden Cost of Feature Creep in Engineering Programs", "5 Signs Your Team Needs a Real-Time Engineering Dashboard", "OKRs for Engineering Teams: A Practical Implementation Guide"],
      },
      {
        title: "Project Analytics",
        icon: BarChart2,
        items: ["From Excel to Live Database: A Case Study in Spreadsheet Sync", "How to Measure Feature Readiness Across a Large Codebase", "Budget Variance Analytics: Catching Cost Drift Before It Compounds", "Building a Budget Tracking System for Engineering Infrastructure"],
      },
      {
        title: "AI in Engineering",
        icon: Brain,
        items: ["How AI Meeting Minutes Save 2+ Hours Per Review Session", "Action Item Extraction: What AI Gets Right (and Wrong)", "The Future of Team Documentation: AI-Assisted Meeting Minutes", "Using AI to Predict Sprint and Release Risks"],
      },
      {
        title: "Success Stories",
        icon: Building2,
        items: ["Reducing Version Conflicts in Shared Trackers by 90%", "A Software Team's Journey to Automated Meeting Minutes", "Real-Time Portfolio Governance at Enterprise Scale", "Bridging Production Infrastructure and Project Management"],
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
// RESOURCE PAGE COMPONENT (Original Backup)
// ─────────────────────────────────────────────────────────────────────────────
export function ResourcePage({ data, openModal }) {
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
