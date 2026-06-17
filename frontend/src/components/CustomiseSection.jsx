import { motion } from "framer-motion";
import { Sliders, GitBranch, ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const BULLETS = [
  { icon: GitBranch,   title: "Map APQP / SOP phase-gates",    desc: "Model every gate from kickoff to job-one with custom fields." },
  { icon: Sliders,     title: "Configurable program fields",    desc: "Add platform, risk and date attributes without code." },
  { icon: ShieldCheck, title: "Governance guardrails",          desc: "Lock approvals so gates can't be skipped under pressure." },
];

const GATES = [
  { l: "Concept Freeze",  g: "G0", done: true },
  { l: "Design Release",  g: "G1", done: true },
  { l: "Proto Build",     g: "G2", active: true },
  { l: "SOP Gate",        g: "G3" },
];

/* Stagger container for children */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const Customise = ({ onRequestDemo }) => {
  return (
    /* ── Full-bleed vivid blue — Zoho's boldest section treatment ── */
    <section
      id="customise"
      data-testid="customise"
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)" }}
    >
      {/* Subtle dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      />
      {/* Glowing orb top-right */}
      <div className="absolute -top-24 right-0 h-[460px] w-[460px] rounded-full bg-blue-400/20 blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* ── Left ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p variants={fadeSlide} className="text-[13px] font-bold uppercase tracking-[0.18em] text-blue-200 mb-3">
            Customise
          </motion.p>
          <motion.h2 variants={fadeSlide} className="font-heading font-extrabold tracking-tight text-white text-3xl md:text-5xl leading-tight">
            Shape CALDIM around your program governance
          </motion.h2>
          <motion.p variants={fadeSlide} className="mt-5 text-[15px] text-blue-100/80 max-w-lg">
            Map automotive phase-gates, add the fields your PMO actually tracks,
            and enforce the approval flow your quality system demands.
          </motion.p>

          <motion.div variants={staggerContainer} className="mt-8 space-y-5">
            {BULLETS.map((b) => (
              <motion.div key={b.title} variants={fadeSlide} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 border border-white/20 text-blue-100">
                  <b.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-heading font-bold text-white text-[15.5px]">{b.title}</p>
                  <p className="text-[14px] text-blue-100/70">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonial */}
          <motion.figure variants={fadeSlide} className="mt-9 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-5">
            <div className="flex gap-0.5 mb-2 text-yellow-300">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <blockquote className="text-[14.5px] text-blue-50 font-medium">
              "We mapped our entire APQP flow into CALDIM in an afternoon. Our SOP
              gates have never been this visible to leadership."
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="h-9 w-9 rounded-full bg-white/20 text-white text-[11px] font-bold grid place-items-center">PN</span>
              <div>
                <p className="text-[13px] font-bold text-white">Priya Nair</p>
                <p className="text-[12px] text-blue-200">PMO Director · Early Access</p>
              </div>
            </figcaption>
          </motion.figure>
        </motion.div>

        {/* ── Right — White card pops against blue ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="rounded-2xl bg-white shadow-2xl shadow-blue-950/40 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <span className="text-[13px] font-bold text-slate-700">Program: Atlas VX</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">Custom Fields</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Vehicle Platform", "VX-EV / Skateboard"],
                ["SOP Date",         "14 Mar 2027"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
                  <p className="mt-1 text-[14px] font-semibold text-slate-800 font-mono">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Risk Level</p>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] font-bold text-brand-amber">Medium · Review</span>
            </div>

            {/* Phase-gate timeline */}
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-[12px] font-bold text-slate-600 mb-4">APQP Phase-Gates</p>
              <div className="relative flex justify-between">
                <div className="absolute left-0 right-0 top-2.5 h-0.5 bg-slate-100" />
                <div className="absolute left-0 top-2.5 h-0.5 bg-brand" style={{ width: "62%" }} />
                {GATES.map((g) => (
                  <div key={g.g} className="relative flex flex-col items-center gap-2 w-1/4">
                    <span className={cn(
                      "h-5 w-5 rounded-full grid place-items-center text-[9px] font-bold ring-4 ring-white",
                      g.done ? "bg-brand text-white" : g.active ? "bg-brand-amber text-white" : "bg-slate-200 text-slate-500"
                    )}>
                      {g.done ? "✓" : ""}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{g.g}</span>
                    <span className="text-[9.5px] text-slate-400 text-center leading-tight">{g.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              data-testid="customise-cta"
              onClick={() => onRequestDemo && onRequestDemo("Customise Inquiry")}
              className="w-full rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-hover transition-colors cursor-pointer"
            >
              Configure your program
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export const CustomizeSection = Customise;
export default Customise;
