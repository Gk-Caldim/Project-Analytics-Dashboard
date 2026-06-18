import { motion } from "framer-motion";
import { Sliders, GitBranch, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BULLETS = [
  { title: "Define project phases", desc: "Track every stage from kick-off to completion with custom milestones." },
  { title: "Custom fields and attributes", desc: "Add tags, risk levels, and date fields relevant to your team." },
  { title: "Structured approval steps",     desc: "Set up gates that require manager sign-offs before proceeding." },
];

const GATES = [
  { l: "Concept Freeze",  g: "G0", done: true },
  { l: "Design Release",  g: "G1", done: true },
  { l: "Proto Build",     g: "G2", active: true },
  { l: "SOP Gate",        g: "G3" },
];

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
    <section
      id="customise"
      data-testid="customise"
      className="relative py-24 md:py-32 overflow-hidden zoho-section-white zoho-font-sans"
    >
      {/* Subtle dot grid overlay in amber/navy tones */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #F59E0B 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />
      {/* Soft amber glow top-right */}
      <div className="absolute -top-24 right-0 h-[460px] w-[460px] rounded-full bg-[#F59E0B]/3 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* Left Column */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p variants={fadeSlide} className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 mb-3 font-mono">
            CUSTOMISE
          </motion.p>
          <motion.h2 variants={fadeSlide} className="zoho-h2 text-3xl md:text-5xl">
            Adapt the workspace to your project standards
          </motion.h2>
          <motion.p variants={fadeSlide} className="mt-5 zoho-body text-[15px] leading-relaxed max-w-lg">
            Set up custom workflows, configure fields specific to your industry,
            and define approval processes that match your organization's standards.
          </motion.p>

          <motion.div variants={staggerContainer} className="mt-8 space-y-6">
            {BULLETS.map((b) => (
              <motion.div key={b.title} variants={fadeSlide} className="flex gap-4">
                <span className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900 text-[15.5px]">{b.title}</p>
                  <p className="zoho-body text-[14px] leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonial / Early Access CTA card */}
          <motion.div
            variants={fadeSlide}
            className="mt-9 rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-blue-600 font-bold text-[14.5px]">
              <span>🚀</span> Early Access Program
            </div>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed font-sans">
              We are accepting partner inquiries from engineering and manufacturing organizations.
            </p>
            <button
              onClick={() => onRequestDemo && onRequestDemo("Early Access Inquiry")}
              className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              Contact us to learn more <span className="text-base leading-none">→</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Right Column: Custom Field Mockup Card */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="rounded-2xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <span className="text-[13px] font-bold text-slate-700">Program: Atlas VX</span>
            <span className="rounded-md bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-[11px] font-bold text-slate-800 tracking-wide font-mono">
              CUSTOM FIELDS
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Vehicle Platform", "VX-EV / Skateboard"],
                ["SOP Date",         "14 Mar 2027"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-slate-150 p-3 bg-slate-50/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">{l}</p>
                  <p className="mt-1 text-[13px] font-bold text-slate-800 font-mono">{v}</p>
                </div>
              ))}
            </div>
            
            <div className="rounded-xl border border-slate-150 p-3 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 font-mono">Risk Level</p>
              <span className="rounded-md bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                Medium · Review
              </span>
            </div>

            {/* APQP phase-gate timeline */}
            <div className="rounded-xl border border-slate-155 p-4 bg-white">
              <p className="text-[12px] font-bold text-slate-600 mb-4 font-heading">Project Phase-Gates</p>
              <div className="relative flex justify-between">
                <div className="absolute left-0 right-0 top-2.5 h-0.5 bg-slate-100" />
                <div className="absolute left-0 top-2.5 h-0.5 bg-blue-600" style={{ width: "62%" }} />
                {GATES.map((g) => (
                  <div key={g.g} className="relative flex flex-col items-center gap-2 w-1/4">
                    <span className={cn(
                      "h-5 w-5 rounded-full grid place-items-center text-[9px] font-bold ring-4 ring-white",
                      g.done ? "bg-blue-600 text-white" : g.active ? "bg-amber-500 text-white animate-pulse" : "bg-slate-200 text-slate-500"
                    )}>
                      {g.done ? "✓" : ""}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{g.g}</span>
                    <span className="text-[9.5px] text-slate-400 text-center leading-tight font-medium">{g.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              data-testid="customise-cta"
              onClick={() => onRequestDemo && onRequestDemo("Customise Inquiry")}
              className="zoho-btn-red w-full justify-center text-center cursor-pointer shadow-md"
            >
              Configure Workspace
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export const CustomizeSection = Customise;
export default Customise;
