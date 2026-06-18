import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet, Mic, Wallet, CalendarDays, CheckCircle2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppShellMockup from "./AppShellMockup";

const TABS = [
  { id: "excel",    label: "Excel Sync",       icon: FileSpreadsheet },
  { id: "mom",      label: "MOM Capture",       icon: Mic },
  { id: "budget",   label: "Budget Governance", icon: Wallet },
  { id: "calendar", label: "Team Calendar",     icon: CalendarDays },
];

const COPY = {
  excel: {
    title: "Excel design release sync, finally automated",
    desc: "Connect engineering spreadsheets and CALDIM mirrors every release code in real time — no more version drift between teams.",
    points: ["Two-way cell-level sync", "Status pills per release code", "Engineer ownership mapping"],
  },
  mom: {
    title: "AI voice capture for every program review",
    desc: "Record meetings and CALDIM transcribes, sorts by speaker, and auto-assigns action tasks the moment the call ends.",
    points: ["Speaker-sorted transcripts", "Auto-extracted action items", "Searchable meeting archive"],
  },
  budget: {
    title: "Govern budgets against strategic targets",
    desc: "Map spend to master budgets and instantly see positive or negative variance on every program line.",
    points: ["Budget masters per platform", "Live variance indicators", "Drill-down spend trails"],
  },
  calendar: {
    title: "Plan SOP gates on a living calendar",
    desc: "Week and month views with colored event blocks, time-slot scheduling, and drag-and-drop rescheduling — built for program teams.",
    points: ["Week / Month / Day views", "Color-coded event categories", "Drag-and-drop rescheduling"],
  },
};

/* ════════════════════════════════════════════════════════════════════
   Mockup Components — Faithful replicas of actual CALDIM UI modules.
   Same column names, same status chips, same color palette.
   ════════════════════════════════════════════════════════════════════ */

const StatusPill = ({ s }) => {
  const map = {
    Synced: "bg-emerald-50 text-emerald-600 border border-emerald-100/60",
    Review: "bg-amber-50 text-amber-600 border border-amber-100/60",
    Drift:  "bg-rose-50 text-rose-600 border border-rose-100/60",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", map[s])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {s}
    </span>
  );
};

/* ── Excel Design Release Table (mirrors ExcelTableViewer) ── */
const ExcelMockup = () => {
  const rows = [
    ["DR-1042", "Front Subframe",   "Synced", "A. Mehta"],
    ["DR-1043", "Battery Tray",     "Review", "L. Ortega"],
    ["DR-1044", "Cooling Duct",     "Synced", "S. Iyer"],
    ["DR-1045", "Wiring Harness",   "Drift",  "R. Voss"],
    ["DR-1046", "Door Module",      "Synced", "K. Adeyemi"],
  ];
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="grid grid-cols-[90px_1fr_90px_90px] bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
        {["Code", "Release Item", "Status", "Owner"].map((h) => (
          <div key={h} className="px-3 py-2.5 border-r border-slate-200 last:border-0">{h}</div>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[90px_1fr_90px_90px] border-b border-slate-100 last:border-0 text-[12.5px]">
          <div className="px-3 py-2.5 font-mono font-semibold text-blue-600 border-r border-slate-100">{r[0]}</div>
          <div className="px-3 py-2.5 text-slate-700 border-r border-slate-100">{r[1]}</div>
          <div className="px-3 py-2.5 border-r border-slate-100"><StatusPill s={r[2]} /></div>
          <div className="px-3 py-2.5 text-slate-500 text-[11px] font-semibold flex items-center">{r[3]}</div>
        </div>
      ))}
    </div>
  );
};

/* ── MOM Table (mirrors actual MOM table — S.No, Function, Discussion, Status columns) ── */
const MomMockup = () => {
  const rows = [
    { sno: 1, fn: "Engineering", disc: "Freeze cooling spec before G3 gate.", who: "S. Iyer",    status: "pending" },
    { sno: 2, fn: "Quality",     disc: "Validate harness routing — DR-1045.",  who: "R. Voss",    status: "in-progress" },
    { sno: 3, fn: "PMO",         disc: "Update timeline for SOP validation.",  who: "P. Nair",    status: "completed" },
    { sno: 4, fn: "Production",  disc: "Confirm tooling lead time for G4.",    who: "K. Adeyemi", status: "pending" },
  ];
  const statusMap = {
    "pending":     { label: "Pending",     c: "bg-amber-50 text-amber-700 border border-amber-100/60" },
    "in-progress": { label: "In Progress", c: "bg-blue-50 text-blue-700 border border-blue-100/60" },
    "completed":   { label: "Completed",   c: "bg-emerald-50 text-emerald-700 border border-emerald-100/60" },
  };
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Meeting Minutes — Atlas VX Review</span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-600">
          <Mic className="h-3 w-3" /> AI Captured
        </span>
      </div>
      <div className="grid grid-cols-[36px_80px_1fr_78px_88px] bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
        {["#", "Function", "Discussion Point", "Owner", "Status"].map((h) => (
          <div key={h} className="px-2 py-2 border-r border-slate-200 last:border-0">{h}</div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.sno} className="grid grid-cols-[36px_80px_1fr_78px_88px] border-b border-slate-100 last:border-0 text-[11.5px]">
          <div className="px-2 py-2 font-mono text-slate-400 border-r border-slate-100">{r.sno}</div>
          <div className="px-2 py-2 text-slate-600 font-semibold border-r border-slate-100 text-[10px]">{r.fn}</div>
          <div className="px-2 py-2 text-slate-700 border-r border-slate-100">{r.disc}</div>
          <div className="px-2 py-2 text-slate-500 text-[10px] font-semibold border-r border-slate-100">{r.who}</div>
          <div className="px-2 py-2 flex items-center">
            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", statusMap[r.status].c)}>
              {statusMap[r.status].label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Budget Variance View (mirrors BudgetSummaryView) ── */
const BudgetMockup = () => {
  const rows = [
    { l: "Body & Trim",  spent: 78, target: 70, v: "+8%",  neg: true },
    { l: "Powertrain",   spent: 54, target: 65, v: "-11%", neg: false },
    { l: "Electrical",   spent: 91, target: 85, v: "+6%",  neg: true },
    { l: "Tooling",      spent: 40, target: 60, v: "-20%", neg: false },
  ];
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.l}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-slate-700">{r.l}</span>
            <span className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border",
              r.neg ? "bg-rose-50 text-rose-600 border-rose-100/60" : "bg-emerald-50 text-emerald-650 border-emerald-100/60"
            )}>
              {r.v} variance
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", r.neg ? "bg-rose-500" : "bg-emerald-500")}
              style={{ width: `${r.spent}%` }}
            />
            <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `${r.target}%` }} title="target" />
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] font-mono text-slate-400">
            <span>Spent {r.spent}%</span><span>Target {r.target}%</span>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="h-2 w-0.5 bg-slate-900 inline-block" /> Strategic target marker
      </div>
    </div>
  );
};

/* ── Week Calendar (mirrors actual CalendarGrid week view) ── */
const CalendarMockup = () => {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const DATES = [16, 17, 18, 19, 20];
  const HOURS = ["9 am", "10 am", "11 am", "12 pm", "1 pm", "2 pm"];

  /* Events positioned in the grid — mirrors actual CalendarGrid colored blocks */
  const events = [
    { day: 0, start: 0, span: 1.5, title: "Atlas VX Sync",     color: "#2563EB" },
    { day: 1, start: 1, span: 1,   title: "Budget Review",     color: "#F59E0B" },
    { day: 2, start: 0, span: 2,   title: "G3 Gate Review",    color: "#8B5CF6" },
    { day: 2, start: 3, span: 1,   title: "Harness Routing",   color: "#EF4444" },
    { day: 3, start: 2, span: 1.5, title: "Design Freeze",     color: "#10B981" },
    { day: 4, start: 0, span: 1,   title: "Sprint Planning",   color: "#06B6D4" },
    { day: 4, start: 3, span: 2,   title: "SOP Validation",    color: "#2563EB" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Day header — mirrors CalendarGrid .day-column-header */}
      <div className="grid grid-cols-[48px_repeat(5,1fr)] border-b border-slate-200 bg-slate-50">
        <div className="px-1 py-2 text-[8px] font-bold text-slate-400 uppercase text-center border-r border-slate-200">
          GMT+5:30
        </div>
        {DAYS.map((d, i) => {
          const isToday = i === 2;
          return (
            <div key={d} className={cn("px-2 py-2 text-center border-r border-slate-200 last:border-0", isToday && "bg-blue-50")}>
              <span className="block text-[9px] font-bold text-slate-400 uppercase">{d}</span>
              <span className={cn(
                "inline-block mt-0.5 text-[13px] font-bold",
                isToday ? "bg-blue-600 text-white h-6 w-6 rounded-full leading-6 text-center" : "text-slate-700"
              )}>
                {DATES[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid — mirrors CalendarGrid scrollable time body */}
      <div className="grid grid-cols-[48px_repeat(5,1fr)]">
        {HOURS.map((h, hourIdx) => (
          <div key={h} className="contents">
            {/* Time gutter label */}
            <div className="px-1 py-0 border-r border-b border-slate-100 flex items-start justify-end pr-2 pt-0.5">
              <span className="text-[9px] font-medium text-slate-400">{h}</span>
            </div>
            {/* Day columns */}
            {DAYS.map((d, dayIdx) => {
              const evt = events.find((e) => e.day === dayIdx && e.start === hourIdx);
              return (
                <div
                  key={`${d}-${h}`}
                  className={cn(
                    "relative border-r border-b border-slate-50 last:border-r-0",
                    dayIdx === 2 && "bg-blue-50/30"
                  )}
                  style={{ height: 36 }}
                >
                  {evt && (
                    <div
                      className="absolute inset-x-[3px] rounded-md px-1.5 py-1 text-[9px] font-bold text-white leading-tight overflow-hidden z-10"
                      style={{
                        top: 2,
                        height: `${evt.span * 36 - 4}px`,
                        backgroundColor: evt.color,
                        opacity: 0.92,
                      }}
                    >
                      {evt.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const TESTIMONIALS = {
  excel: {
    quote: "“By automating design release sync from Excel to CALDIM, we eliminated 100% of our manual tracking errors. Our engineering team and PMO are finally on the same page.”",
    author: "Sanjay Iyer",
    role: "Lead Systems Engineer",
    company: "Mahindra Electric"
  },
  mom: {
    quote: "“The voice capture is pure magic. It captures every action item from our SOP reviews and assigns it instantly. No more typing up minutes after meetings.”",
    author: "Ravi Voss",
    role: "Program Manager",
    company: "Bosch Automotive"
  },
  budget: {
    quote: "“CALDIM's budget variance tracking gave us clear visibility into cost overruns on body tooling. We caught a 6% deviation before it became a crisis.”",
    author: "Preeti Nair",
    role: "PMO Director",
    company: "Tata Motors"
  },
  calendar: {
    quote: "“We run our entire vehicle launch schedule off the CALDIM calendar. Drag-and-drop SOP gate changes make tracking shifts easy for the team.”",
    author: "Kemi Adeyemi",
    role: "Operations Head",
    company: "Volvo Trucks"
  }
};

const MOCK_CONFIGS = {
  excel:    { path: "/excel",    icon: "excel" },
  mom:      { path: "/mom",      icon: "mom" },
  budget:   { path: "/budget",   icon: "budget" },
  calendar: { path: "/calendar", icon: "calendar" },
};

const MOCKS = { excel: ExcelMockup, mom: MomMockup, budget: BudgetMockup, calendar: CalendarMockup };
const TAB_IDS = TABS.map((t) => t.id);
const AUTO_INTERVAL = 5000;

/* ════════════════════════════════════════════════════════════════════
   Section Component
   ════════════════════════════════════════════════════════════════════ */

export const Features = ({ onRequestDemo }) => {
  const [active, setActive] = useState("excel");
  const [progressKey, setProgressKey] = useState(0);
  const paused = useRef(false);

  const copy = COPY[active];
  const Mock = MOCKS[active];

  const advance = () => {
    if (paused.current) return;
    setActive((cur) => {
      const idx = TAB_IDS.indexOf(cur);
      return TAB_IDS[(idx + 1) % TAB_IDS.length];
    });
    setProgressKey((k) => k + 1);
  };

  useEffect(() => {
    const id = setInterval(advance, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = (id) => {
    setActive(id);
    setProgressKey((k) => k + 1);
  };

  return (
    <section id="features" data-testid="features" className="py-24 md:py-32 zoho-section-slate zoho-font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-blue-600 mb-3">Platform</p>
          <h2 className="zoho-h2 text-3xl md:text-5xl">
            Every program discipline in one workspace
          </h2>
        </motion.div>

        {/* ── Tabs with auto-progress ── */}
        <div
          className="flex flex-wrap gap-2 mb-10"
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; }}
        >
          {TABS.map((t) => {
            const on = active === t.id;
            return (
              <button
                key={t.id}
                data-testid={`tab-${t.id}`}
                onClick={() => handleTabClick(t.id)}
                className={cn(
                  "relative flex flex-col items-start gap-0 rounded-xl px-4 pt-2.5 pb-1.5 text-[13.5px] font-semibold transition-colors cursor-pointer overflow-hidden",
                  on ? "text-white animate-in fade-in duration-205" : "text-slate-650 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50"
                )}
              >
                {on && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-xl bg-blue-600"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </span>
                {on && (
                  <span className="relative w-full mt-1.5 h-0.5 rounded-full bg-white/30 overflow-hidden">
                    <motion.span
                      key={progressKey}
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTO_INTERVAL / 1000, ease: "linear" }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={active + "-copy"}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="lg:sticky lg:top-28"
            >
              <h3 className="zoho-h3 text-2xl md:text-3xl leading-snug">{copy.title}</h3>
              <p className="mt-4 zoho-body text-[15px] leading-relaxed max-w-lg font-normal">{copy.desc}</p>
              <ul className="mt-6 space-y-3">
                {copy.points.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    className="flex items-center gap-3 zoho-body-sm text-[14.5px] font-semibold text-slate-700"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> {p}
                  </motion.li>
                ))}
              </ul>
              <button
                data-testid="features-learn-more"
                onClick={() => onRequestDemo && onRequestDemo("sales", `Learn More: ${active}`)}
                className="mt-7 inline-flex items-center gap-2 text-[14.5px] font-bold zoho-text-blue hover:gap-3 transition-all cursor-pointer"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </button>

              {/* Dynamic testimonial block matching Zoho Projects pattern */}
              <div className="mt-8 p-5 rounded-xl border border-slate-200 bg-slate-50/50 relative shadow-sm">
                <p className="text-[13.5px] italic text-slate-600 leading-relaxed font-sans">
                  {TESTIMONIALS[active].quote}
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold grid place-items-center uppercase border border-blue-100">
                    {TESTIMONIALS[active].author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[11.5px] font-bold text-slate-800 leading-none">{TESTIMONIALS[active].author}</p>
                    <p className="text-[9.5px] font-semibold text-slate-400 mt-1">
                      {TESTIMONIALS[active].role} &middot; {TESTIMONIALS[active].company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Static AppShellMockup wrapping dynamic views */}
          <div className="w-full">
            <AppShellMockup
              activePath={MOCK_CONFIGS[active].path}
              activeIcon={MOCK_CONFIGS[active].icon}
            >
              <div className="min-h-[350px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="p-5"
                  >
                    <Mock />
                  </motion.div>
                </AnimatePresence>
              </div>
            </AppShellMockup>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FeaturesSection = Features;
export default Features;
