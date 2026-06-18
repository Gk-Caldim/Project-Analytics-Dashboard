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
      className="relative py-24 md:py-32 overflow-hidden bg-[#0A1628] text-white"
    >
      {/* Repeating diagonal line texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #F59E0B 0px, #F59E0B 2px, transparent 2px, transparent 12px)',
        }}
      />
      {/* Soft amber glow orb behind chat */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-[#F59E0B]/5 blur-[120px] pointer-events-none" />

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
            className="inline-flex items-center gap-2 rounded-none border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-semibold mb-6"
          >
            <Sparkles className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-slate-350 font-mono text-[11px] uppercase tracking-wider">CALDIM Intelligence</span>
          </motion.span>
          <motion.h2
            variants={fadeSlide}
            className="font-heading font-extrabold tracking-tight text-white text-3xl md:text-[48px] leading-[1.1]"
          >
            Your AI co-pilot for engineering programs
          </motion.h2>
          <motion.p variants={fadeSlide} className="mt-5 text-[15.5px] text-slate-300 leading-relaxed max-w-lg font-sans">
            CALDIM AI reads your synced data, meeting minutes and budgets to answer
            anything about program health — instantly.
          </motion.p>

          <motion.div variants={staggerChildren} className="mt-9 space-y-6">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeSlide} className="border-l-3 border-[#F59E0B] pl-4">
                <p className="font-heading font-bold text-[16.5px] text-white">{f.title}</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed font-sans">{f.desc}</p>
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
          className="rounded-none bg-white/[0.04] backdrop-blur-2xl border border-white/10 overflow-hidden relative"
          style={{
            boxShadow: "0 0 60px rgba(245, 158, 11, 0.08)"
          }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-[#0F1B3D]/40">
            <span className="grid h-9 w-9 place-items-center rounded-none bg-[#F59E0B]">
              <Sparkles className="h-4.5 w-4.5 text-[#0F1B3D]" />
            </span>
            <div>
              <p className="text-[14px] font-bold tracking-wide">CALDIM Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE · CONTEXT-AWARE
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
                    "max-w-[85%] rounded-none px-4 py-3 text-[13.5px] whitespace-pre-line leading-relaxed",
                    m.role === "user"
                      ? "bg-[#F59E0B] text-[#0F1B3D] font-semibold shadow-md"
                      : "bg-white/[0.06] border border-white/10 text-slate-100"
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
                className="rounded-none border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-slate-350 hover:bg-white/10 hover:text-white transition-colors cursor-pointer font-mono"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-4 border-t border-white/10 bg-[#0A1628]/80 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask CALDIM Assistant..."
              className="flex-1 bg-transparent border-0 text-[13.5px] text-white placeholder-slate-500 focus:outline-none"
              readOnly
            />
            <button
              onClick={() => onRequestDemo && onRequestDemo("AI Query Inquiry")}
              className="grid h-9 w-9 place-items-center rounded-none bg-[#F59E0B] hover:bg-[#D97706] text-[#0F1B3D] transition-colors cursor-pointer"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom label */}
      <div className="mt-16 text-center relative z-10">
        <p className="text-[#F59E0B] font-mono text-[11px] uppercase tracking-[0.2em]">
          Connected Intelligence — AI insights across your entire program portfolio
        </p>
      </div>
    </section>
  );
};

export default AISection;
