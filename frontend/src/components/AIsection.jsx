import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { title: "Maximize Productivity",    desc: "Let AI draft minutes, flag risks and prep your next gate review automatically." },
  { title: "Communicate Effectively",  desc: "Ask plain-language questions and get program answers sourced from live data." },
  { title: "Smart Analytics",          desc: "Surface variance, blockers and trends across every platform in seconds." },
];

const CHAT = [
  { role: "user", text: "What are the top Atlas VX program risks right now?" },
  {
    role: "ai",
    text: "3 active risks for Atlas VX:\n1. Cooling spec unfrozen (G3 in 9 days)\n2. Electrical budget +6% over target\n3. Wiring harness DR-1045 in drift state.",
  },
];

const QUICK = ["Show variance trend", "Draft a mitigation plan", "Notify owners"];

const staggerChildren = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const AISection = ({ onRequestDemo }) => {
  const chatRef = useRef(null);
  const isInView = useInView(chatRef, { once: true, margin: "-100px" });
  const [visibleMessages, setVisibleMessages] = useState([]);

  /* Stagger-reveal chat messages once section enters viewport */
  useEffect(() => {
    if (!isInView) return;
    CHAT.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg]);
      }, i * 700 + 200);
    });
  }, [isInView]);

  return (
    <section
      id="ai"
      data-testid="ai-section"
      className="relative py-24 md:py-32 overflow-hidden bg-white text-slate-800 border-t border-slate-100"
    >
      {/* Repeating diagonal line texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none" 
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #2563EB 0px, #2563EB 2px, transparent 2px, transparent 12px)',
        }}
      />
      {/* Soft blue glow orb behind chat */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-blue-600/3 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* Left Column */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.span
            variants={fadeSlide}
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-[13px] font-semibold mb-6 text-blue-600"
          >
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-blue-650 font-mono text-[11px] uppercase tracking-wider">CALDIM Intelligence</span>
          </motion.span>
          <motion.h2
            variants={fadeSlide}
            className="font-heading font-extrabold tracking-tight text-slate-900 text-3xl md:text-[48px] leading-[1.1]"
          >
            Your AI co-pilot for engineering programs
          </motion.h2>
          <motion.p variants={fadeSlide} className="mt-5 text-[15.5px] text-slate-600 leading-relaxed max-w-lg font-sans">
            CALDIM AI reads your synced data, meeting minutes and budgets to answer
            anything about program health — instantly.
          </motion.p>

          <motion.div variants={staggerChildren} className="mt-9 space-y-6">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeSlide} className="border-l-3 border-blue-600 pl-4">
                <p className="font-heading font-bold text-[16.5px] text-slate-900">{f.title}</p>
                <p className="text-[14px] text-slate-500 mt-1 leading-relaxed font-sans">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Column: AI Chat Card Mockup */}
        <motion.div
          ref={chatRef}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-xl bg-white border border-slate-200/80 overflow-hidden relative shadow-xl shadow-slate-200/40"
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </span>
            <div>
              <p className="text-[14.5px] font-bold tracking-wide text-slate-800">CALDIM Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE · CONTEXT-AWARE
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 space-y-4 min-h-[220px]">
            {visibleMessages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-3 text-[13.5px] whitespace-pre-line leading-relaxed",
                    m.role === "user"
                      ? "bg-blue-600 text-white font-medium rounded-2xl rounded-tr-none shadow-md shadow-blue-500/10"
                      : "bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none"
                  )}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick replies */}
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => onRequestDemo && onRequestDemo(`AI Query: ${q}`)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer font-mono"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask CALDIM Assistant..."
              className="flex-1 bg-transparent border-0 text-[13.5px] text-slate-800 placeholder-slate-400 focus:outline-none"
              readOnly
            />
            <button
              onClick={() => onRequestDemo && onRequestDemo("AI Query Inquiry")}
              className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom label */}
      <div className="mt-16 text-center relative z-10">
        <p className="text-blue-600 font-mono text-[11px] uppercase tracking-[0.2em] font-semibold">
          Connected Intelligence — AI insights across your entire program portfolio
        </p>
      </div>
    </section>
  );
};

export default AISection;
