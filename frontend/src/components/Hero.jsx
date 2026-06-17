import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ArrowRight, Activity, Mic, TrendingUp, Timer,
  LayoutGrid, Calendar, FileSpreadsheet, DollarSign,
} from "lucide-react";

/* ── Rotating headline phrases (Zoho pattern) ── */
const HERO_PHRASES = [
  "automotive programs",
  "real-time oversight",
  "every SOP gate",
  "your team",
];

const VALUE_PROPS = [
  "Excel Design Release Sync",
  "AI Voice MOM Capture",
  "Budget Masters & Variance",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1 } }),
};

/* ── Faithful CALDIM Gantt Chart Mockup ─────────────────────────────────
   Mirrors the exact visual language of the actual ProjectDashboard —
   same sidebar icons, same colored phase bars, same status chips.
── */
const GANTT_TASKS = [
  { id: "ZS-T102", name: "Project Planning",   color: "#8B5CF6", start: 0,  width: 32, phase: "G0" },
  { id: "ZS-T103", name: "Design Release",     color: "#2563EB", start: 20, width: 38, phase: "G1" },
  { id: "ZS-T104", name: "Proto Build",        color: "#10B981", start: 42, width: 30, phase: "G2" },
  { id: "ZS-T105", name: "SOP Validation",     color: "#F59E0B", start: 62, width: 28, phase: "G3" },
  { id: "ZS-T106", name: "Job-One Launch",     color: "#06B6D4", start: 78, width: 20, phase: "G4" },
];

const MONTHS = ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];

const GanttMockup = () => (
  <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
    {/* Window chrome */}
    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <span className="ml-3 text-[11px] font-mono text-slate-400">caldim.app / atlas-vx / timeline</span>
      <span className="ml-auto rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-brand">Atlas VX · G2 Active</span>
    </div>

    <div className="flex">
      {/* Sidebar nav — exact mirror of real CALDIM sidebar icons */}
      <div className="w-10 border-r border-slate-100 bg-slate-50/60 flex flex-col items-center py-3 gap-3">
        {[
          { Icon: LayoutGrid,      active: false },
          { Icon: FileSpreadsheet, active: false },
          { Icon: Calendar,        active: true  },
          { Icon: DollarSign,      active: false },
          { Icon: Mic,             active: false },
        ].map(({ Icon, active }, i) => (
          <span
            key={i}
            className={`h-7 w-7 grid place-items-center rounded-lg ${
              active ? "bg-brand text-white" : "text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>

      {/* Task list column */}
      <div className="w-36 border-r border-slate-100 shrink-0">
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          <span>ID</span><span>Phase</span>
        </div>
        {GANTT_TASKS.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-2 py-2 border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
            <span className="text-[9px] font-mono text-slate-400 shrink-0">{t.id}</span>
            <span
              className="h-4 px-1.5 rounded text-[8px] font-bold text-white shrink-0"
              style={{ backgroundColor: t.color }}
            >
              {t.phase}
            </span>
          </div>
        ))}
        {/* Add task hint */}
        <div className="px-2 py-1.5 text-[9px] text-slate-300 italic">+ Add Task</div>
      </div>

      {/* Gantt timeline */}
      <div className="flex-1 overflow-hidden">
        {/* Month header */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          {MONTHS.map((m) => (
            <div key={m} className="flex-1 text-center text-[9px] font-bold text-slate-400 py-1.5 border-r border-slate-100 last:border-0">
              {m}
            </div>
          ))}
        </div>

        {/* Grid rows + bars */}
        {GANTT_TASKS.map((t, rowIdx) => (
          <div key={t.id} className="relative flex h-8 border-b border-slate-50">
            {/* Column grid lines */}
            {MONTHS.map((m, i) => (
              <div key={i} className="flex-1 border-r border-slate-50 last:border-0" />
            ))}
            {/* Gantt bar — positioned absolutely */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 + rowIdx * 0.08, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: `${t.start}%`,
                width: `${t.width}%`,
                top: "6px",
                height: "20px",
                backgroundColor: t.color,
                borderRadius: "6px",
                transformOrigin: "left center",
                opacity: 0.88,
              }}
            >
              <span className="absolute inset-0 flex items-center px-2 text-[8.5px] font-bold text-white truncate">
                {t.name}
              </span>
            </motion.div>
          </div>
        ))}

        {/* "Suggestion for Task" chip — exact match to Zoho screenshot */}
        <div className="px-2 py-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-blue-50 px-2 py-0.5 text-[8px] font-semibold text-brand">
            ✦ Suggestion for Task
          </span>
        </div>
      </div>

      {/* Right toolbar — matches actual app toolbar */}
      <div className="w-7 border-l border-slate-100 flex flex-col items-center py-3 gap-2.5">
        {["↩", "↪", "≡", "⊞", "⋮"].map((s, i) => (
          <span key={i} className="text-slate-300 text-[11px] cursor-pointer hover:text-slate-500">{s}</span>
        ))}
      </div>
    </div>
  </div>
);

/* ── Main Hero Section ── */
export const Hero = ({ onRequestDemo, onAccessProjects, onAccessWorkspace }) => {
  const handleAccess = onAccessProjects || onAccessWorkspace;
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % HERO_PHRASES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="top"
      data-testid="hero"
      className="relative pt-36 pb-24 md:pt-40 md:pb-32 overflow-hidden"
    >
      {/* Background accents */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_70%_0%,#eff6ff_0%,#ffffff_55%)]" />
      <div className="absolute -top-24 right-0 -z-10 h-[420px] w-[420px] rounded-full bg-blue-200/40 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[260px] w-[260px] rounded-full bg-purple-100/30 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

        {/* ── Left copy ── */}
        <div>
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Engineering analytics for automotive programs
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="font-heading font-extrabold tracking-tight text-slate-900 text-4xl sm:text-5xl lg:text-[56px] leading-[1.06]"
          >
            Real-time governance{" "}
            <span className="block mt-1">
              built for{" "}
              <span className="inline-block overflow-hidden align-bottom">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phraseIdx}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -28 }}
                    transition={{ duration: 0.42, ease: "easeInOut" }}
                    className="block text-brand"
                  >
                    {HERO_PHRASES[phraseIdx]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-6 text-lg text-slate-500 max-w-xl"
          >
            One cloud workspace to sync design releases, capture meeting minutes
            with AI voice, and govern program budgets across every SOP gate.
          </motion.p>

          <motion.ul
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-7 space-y-3"
          >
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-center gap-3 text-[15px] font-semibold text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-brand-emerald shrink-0" />
                {v}
              </li>
            ))}
          </motion.ul>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-9 flex flex-col sm:flex-row gap-3"
          >
            <button
              data-testid="hero-access-btn"
              onClick={handleAccess}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              Access Workspace <ArrowRight className="h-4 w-4" />
            </button>
            <button
              data-testid="hero-demo-btn"
              onClick={() => onRequestDemo("Request Demo")}
              className="inline-flex items-center justify-center px-6 py-3.5 text-[15px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-all cursor-pointer"
            >
              Request Demo
            </button>
          </motion.div>

          <p className="mt-5 text-[13px] text-slate-400">
            Trusted by program teams running Atlas VX, Orion EV &amp; Falcon platforms.
          </p>
        </div>

        {/* ── Right — real CALDIM Gantt mockup + 2 floating UI cards ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-[580px]"
        >
          {/* The main Gantt chart — exact replica of actual app */}
          <GanttMockup />

          {/* ── Floating card 1: Telemetry Sync (top-right) ── */}
          <div className="absolute -top-6 -right-4 sm:-right-6 w-52 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-900/10 p-3.5 animate-float hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                <Activity className="h-3.5 w-3.5 text-brand-emerald" /> Release Sync
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-brand-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald animate-pulse" /> Live
              </span>
            </div>
            <div className="space-y-1.5">
              {[["DR-1042", "Synced", "#10B981"], ["DR-1043", "Review", "#F59E0B"], ["DR-1045", "Drift", "#EF4444"]].map(([code, status, color]) => (
                <div key={code} className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-semibold text-slate-600">{code}</span>
                  <span className="rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: `${color}18`, color }}>{status}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] font-mono text-slate-400">142 release codes synced</p>
          </div>

          {/* ── Floating card 2: AI MOM Log (bottom-left) ── */}
          <div className="absolute -bottom-6 -left-4 sm:-left-8 w-56 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-900/10 p-3.5 animate-float-rev hover:scale-105 transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-purple/10">
                <span className="absolute inset-0 rounded-full bg-brand-purple/30 animate-pulse-ring" />
                <Mic className="h-3.5 w-3.5 text-brand-purple" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-slate-800">AI MOM Log</p>
                <p className="text-[10px] text-slate-400">Transcribing…</p>
              </div>
            </div>
            <div className="flex items-center gap-[3px] h-5">
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-brand-purple/70 animate-wave"
                  style={{ height: "100%", animationDelay: `${i * 0.07}s` }}
                />
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-brand">
              <TrendingUp className="h-3 w-3" /> 3 action tasks assigned
            </p>
          </div>

          {/* ── Floating card 3: SOP Gate G3 countdown (top-left) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="absolute -top-4 -left-3 sm:-left-6 w-44 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-900/10 p-3 animate-float-c hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="h-6 w-6 grid place-items-center rounded-lg bg-amber-50">
                <Timer className="h-3 w-3 text-brand-amber" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-slate-800">SOP Gate G3</p>
                <p className="text-[9px] text-slate-400">Proto Build</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="32" height="32" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="3.5"
                  strokeDasharray="87.96" strokeDashoffset="31.7" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-[20px] font-extrabold font-heading text-slate-900 leading-none">9</p>
                <p className="text-[9px] font-semibold text-slate-400">days left</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
