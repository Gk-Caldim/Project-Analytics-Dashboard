import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import AppShellMockup from "./AppShellMockup";

/* ── Rotating headline phrases (Zoho pattern) ── */
const HERO_PHRASES = [
  "software engineering",
  "product development",
  "agile teams",
  "release management",
];

const VALUE_PROPS = [
  "Automated data synchronization",
  "AI-driven action items",
  "Resource allocation tracking",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: "easeOut" },
  }),
};

/* ── Faithful CALDIM Gantt Chart Mockup ──────────────────────────────
   Mirrors the actual ProjectDashboard — same sidebar icons, same
   colored phase bars, same ID+phase columns. No embellishments.
── */
const GANTT_TASKS = [
  { id: "ENG-01", name: "Requirements Analysis", color: "#8B5CF6", start: 0,  width: 32, phase: "Phase 1" },
  { id: "ENG-02", name: "Architecture Design",   color: "#2563EB", start: 20, width: 38, phase: "Phase 2" },
  { id: "ENG-03", name: "Active Development",      color: "#10B981", start: 42, width: 30, phase: "Phase 3" },
  { id: "ENG-04", name: "Integration Testing",   color: "#F59E0B", start: 62, width: 28, phase: "Phase 4" },
  { id: "ENG-05", name: "Production Release",   color: "#06B6D4", start: 78, width: 20, phase: "Phase 5" },
];

const MONTHS = ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];

const GanttMockup = () => (
  <div className="flex w-full">
    {/* Task list column */}
    <div className="w-36 border-r border-slate-100 shrink-0">
      <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        <span>ID</span><span>Phase</span>
      </div>
      {GANTT_TASKS.map((t) => (
        <div key={t.id} className="flex items-center gap-2 px-2 py-2 border-b border-slate-50">
          <span className="text-[9px] font-mono text-slate-400 shrink-0">{t.id}</span>
          <span
            className="h-4 px-1.5 rounded text-[8px] font-bold text-white shrink-0"
            style={{ backgroundColor: t.color }}
          >
            {t.phase}
          </span>
        </div>
      ))}
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
          {MONTHS.map((m, i) => (
            <div key={i} className="flex-1 border-r border-slate-50 last:border-0" />
          ))}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + rowIdx * 0.07, ease: "easeOut" }}
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
              zIndex: 10,
            }}
          >
            <span className="absolute inset-0 flex items-center px-2 text-[8.5px] font-bold text-white truncate">
              {t.name}
            </span>
          </motion.div>
        </div>
      ))}
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
      className="relative pt-32 pb-24 md:pt-36 md:pb-28 overflow-hidden zoho-hero-bg zoho-font-sans"
    >
      {/* Floating Gantt Bars */}
      <div className="zoho-float-bar g0 left-[10%] top-[40%] hidden xl:flex">
        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold grid place-items-center">✓</span>
        <span>Design Freeze</span>
      </div>
      <div className="zoho-float-bar g1 right-[12%] top-[35%] hidden xl:flex" style={{ animationDelay: '1s' }}>
        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold grid place-items-center">⚡</span>
        <span>Architecture Approved</span>
      </div>
      <div className="zoho-float-bar g2 right-[15%] bottom-[45%] hidden xl:flex" style={{ animationDelay: '2s' }}>
        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">!</span>
        <span>CI/CD Deployed</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">

        {/* ── Centered headline block ── */}
        <div className="max-w-3xl mx-auto text-center">
          

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="zoho-h1 text-4xl sm:text-5xl lg:text-[56px] tracking-tight leading-[1.15] mb-6"
          >
            Project governance{" "}
            <br className="hidden sm:block" />
            built for{" "}
            <span className="inline-block overflow-hidden align-bottom">
              <AnimatePresence mode="wait">
                <motion.span
                  key={phraseIdx}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.38, ease: "easeInOut" }}
                  className="block zoho-text-blue"
                >
                  {HERO_PHRASES[phraseIdx]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mt-6 zoho-body text-lg leading-relaxed max-w-2xl mx-auto font-normal"
          >
            A unified workspace that integrates your tools, captures action items automatically,
            and monitors project health across every release cycle.
          </motion.p>

          <motion.ul
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2"
          >
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-center gap-2 zoho-body-sm text-[15px] font-semibold text-slate-700">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                {v}
              </li>
            ))}
          </motion.ul>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-8 flex flex-col sm:flex-row justify-center gap-3"
          >
            <button
              data-testid="hero-access-btn"
              onClick={handleAccess}
              className="zoho-btn-red inline-flex items-center gap-2 cursor-pointer shadow-md"
            >
              SIGN UP NOW <ArrowRight className="h-4 w-4" />
            </button>
            <button
              data-testid="hero-demo-btn"
              onClick={() => onRequestDemo("Request Demo")}
              className="zoho-btn-outline inline-flex items-center cursor-pointer"
            >
              REQUEST DEMO
            </button>
          </motion.div>


        </div>

        {/* ── Product screenshot — CALDIM Gantt Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
          className="mt-14 max-w-4xl mx-auto"
        >
          <AppShellMockup activePath="/timeline" activeIcon="calendar">
            <GanttMockup />
          </AppShellMockup>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
