import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet, Mic, Wallet, CalendarDays, CheckCircle2, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "excel",    label: "Excel Sync",        icon: FileSpreadsheet },
  { id: "mom",      label: "MOM Capture",        icon: Mic },
  { id: "budget",   label: "Budget Governance",  icon: Wallet },
  { id: "calendar", label: "Team Calendar",      icon: CalendarDays },
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
    desc: "Drag-and-drop program tasks across a monthly board. Tiles lift on hover and snap to phase-gate dates.",
    points: ["Drag-and-drop task tiles", "SOP gate milestones", "Cross-team scheduling"],
  },
};

/* ────────────────── Mockup Components ────────────────── */

const StatusPill = ({ s }) => {
  const map = {
    Synced: "bg-emerald-50 text-brand-emerald",
    Review: "bg-amber-50 text-brand-amber",
    Drift:  "bg-red-50 text-red-500",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", map[s])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {s}
    </span>
  );
};

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
        <div key={i} className="grid grid-cols-[90px_1fr_90px_90px] border-b border-slate-100 last:border-0 text-[12.5px] hover:bg-blue-50/40 transition-colors">
          <div className="px-3 py-2.5 font-mono font-semibold text-brand border-r border-slate-100">{r[0]}</div>
          <div className="px-3 py-2.5 text-slate-700 border-r border-slate-100">{r[1]}</div>
          <div className="px-3 py-2.5 border-r border-slate-100"><StatusPill s={r[2]} /></div>
          <div className="px-3 py-2.5 text-slate-500 text-[11px] font-semibold flex items-center">{r[3]}</div>
        </div>
      ))}
    </div>
  );
};

const MomMockup = () => {
  const logs = [
    { who: "Program Lead", color: "bg-brand",         text: "We need the Atlas VX cooling redesign locked before G3." },
    { who: "Thermal Eng.", color: "bg-brand-purple",  text: "Sim results land Thursday, I'll attach the variance sheet." },
    { who: "PMO",          color: "bg-brand-emerald", text: "Logging action: freeze cooling spec by Friday." },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-[13px] font-bold">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/30">
              <span className="absolute inset-0 rounded-full bg-brand-purple/40 animate-pulse-ring" />
              <Mic className="h-3.5 w-3.5 text-brand-purple" />
            </span>
            Recording · 12:48
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono">Live</span>
        </div>
        <div className="flex items-center gap-[3px] h-9">
          {Array.from({ length: 38 }).map((_, i) => (
            <span key={i} className="flex-1 rounded-full bg-brand-purple/70 animate-wave" style={{ height: "100%", animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {logs.map((l, i) => (
          <div key={i} className="flex gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5">
            <span className={cn("h-7 w-7 shrink-0 rounded-full text-white text-[10px] font-bold grid place-items-center", l.color)}>
              {l.who.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <div>
              <p className="text-[11px] font-bold text-slate-500">{l.who}</p>
              <p className="text-[12.5px] text-slate-700">{l.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-[12px] font-semibold text-brand-emerald">
        <CheckCircle2 className="h-4 w-4" /> Auto-assigned: "Freeze cooling spec" → Thermal Eng.
      </div>
    </div>
  );
};

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
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", r.neg ? "bg-red-50 text-red-500" : "bg-emerald-50 text-brand-emerald")}>
              {r.v} variance
            </span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn("absolute inset-y-0 left-0 rounded-full", r.neg ? "bg-red-400" : "bg-brand-emerald")} style={{ width: `${r.spent}%` }} />
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

const CalendarMockup = () => {
  const tiles = {
    3:  { l: "SOP Gate",  c: "bg-blue-100 text-brand" },
    7:  { l: "Excel Sync",c: "bg-emerald-100 text-brand-emerald" },
    12: { l: "MOM Lock",  c: "bg-purple-100 text-brand-purple" },
    18: { l: "SOP Gate",  c: "bg-blue-100 text-brand" },
    23: { l: "Excel Sync",c: "bg-emerald-100 text-brand-emerald" },
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] font-bold text-slate-400">
        {["M","T","W","T","F","S","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_, i) => {
          const day = i + 1;
          const t = tiles[day];
          return (
            <div key={i} className="aspect-square rounded-lg border border-slate-100 p-1 text-[9px] text-slate-300 hover:border-slate-200">
              <span>{day}</span>
              {t && (
                <div className={cn("mt-0.5 rounded px-1 py-0.5 text-[8px] font-bold leading-tight cursor-grab transition-transform hover:-translate-y-0.5 hover:shadow-md", t.c)}>
                  {t.l}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MOCKS = { excel: ExcelMockup, mom: MomMockup, budget: BudgetMockup, calendar: CalendarMockup };
const TAB_IDS = TABS.map((t) => t.id);
const AUTO_INTERVAL = 5000; // ms

/* ────────────────── Section ────────────────── */

export const Features = ({ onRequestDemo }) => {
  const [active, setActive]     = useState("excel");
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

  /* Auto-advance every AUTO_INTERVAL ms */
  useEffect(() => {
    const id = setInterval(advance, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabClick = (id) => {
    setActive(id);
    setProgressKey((k) => k + 1);
  };

  return (
    <section id="features" data-testid="features" className="py-24 md:py-32 bg-[#f8fafc] border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          className="max-w-2xl mb-12"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-brand mb-3">Platform</p>
          <h2 className="font-heading font-extrabold tracking-tight text-slate-900 text-3xl md:text-5xl leading-tight">
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
                  on ? "text-white" : "text-slate-600 bg-white border border-slate-200 hover:border-slate-300"
                )}
              >
                {on && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-xl bg-brand"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </span>
                {/* Progress bar fills over AUTO_INTERVAL when this tab is active */}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active + "-copy"}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="font-heading font-bold text-slate-900 text-2xl md:text-3xl leading-snug">{copy.title}</h3>
              <p className="mt-4 text-[15px] text-slate-500">{copy.desc}</p>
              <ul className="mt-6 space-y-3">
                {copy.points.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                    className="flex items-center gap-3 text-[14.5px] font-semibold text-slate-700"
                  >
                    <CheckCircle2 className="h-5 w-5 text-brand-emerald shrink-0" /> {p}
                  </motion.li>
                ))}
              </ul>
              <button
                data-testid="features-learn-more"
                onClick={() => onRequestDemo && onRequestDemo("sales", `Learn More: ${active}`)}
                className="mt-7 inline-flex items-center gap-2 text-[14.5px] font-semibold text-brand hover:gap-3 transition-all cursor-pointer"
              >
                Learn more <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div
              key={active + "-mock"}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5"
            >
              <Mock />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export const FeaturesSection = Features;
export default Features;
