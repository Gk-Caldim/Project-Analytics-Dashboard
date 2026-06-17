import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Zap, MessagesSquare, LineChart, Sparkles, Send } from "lucide-react";

const FEATURES = [
  { icon: Zap,            title: "Maximize Productivity",    desc: "Let AI draft minutes, flag risks and prep your next gate review automatically." },
  { icon: MessagesSquare, title: "Communicate Effectively",  desc: "Ask plain-language questions and get program answers sourced from live data." },
  { icon: LineChart,      title: "Smart Analytics",          desc: "Surface variance, blockers and trends across every platform in seconds." },
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
      className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white"
    >
      {/* Grain overlay */}
      <div className="absolute inset-0 grain opacity-60" />
      {/* Glow blobs */}
      <div className="absolute top-10 right-10 h-80 w-80 rounded-full bg-brand-purple/20 blur-[130px]" />
      <div className="absolute bottom-0 left-10 h-72 w-72 rounded-full bg-brand/20 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* ── Left ── */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.span
            variants={fadeSlide}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-purple-200 mb-6"
          >
            <Sparkles className="h-4 w-4 text-brand-purple" /> CALDIM Intelligence
          </motion.span>
          <motion.h2
            variants={fadeSlide}
            className="font-heading font-extrabold tracking-tight text-3xl md:text-5xl leading-tight"
          >
            Your AI co-pilot for engineering programs
          </motion.h2>
          <motion.p variants={fadeSlide} className="mt-5 text-[15px] text-slate-300 max-w-lg">
            CALDIM AI reads your synced data, meeting minutes and budgets to answer
            anything about program health — instantly.
          </motion.p>

          <motion.div variants={staggerChildren} className="mt-9 space-y-6">
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={fadeSlide} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 border border-white/10 text-brand-purple">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-heading font-bold text-[16px]">{f.title}</p>
                  <p className="text-[14px] text-slate-400">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right — AI chat card ── */}
        <motion.div
          ref={chatRef}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Chat header with pulsing glow */}
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-purple to-brand animate-glow-pulse">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <div>
              <p className="text-[14px] font-bold">CALDIM Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · context-aware
              </p>
            </div>
          </div>

          {/* Messages — stagger-revealed on viewport entry */}
          <div className="p-5 space-y-4 min-h-[180px]">
            {visibleMessages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-brand text-white rounded-br-sm"
                      : "bg-white/[0.06] border border-white/10 text-slate-100 rounded-bl-sm"
                  }`}
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
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask CALDIM Assistant..."
              className="flex-1 bg-transparent border-0 text-[13.5px] text-white placeholder-slate-500 focus:outline-none"
              readOnly
            />
            <button
              onClick={() => onRequestDemo && onRequestDemo("AI Query Inquiry")}
              className="grid h-8 w-8 place-items-center rounded-lg bg-brand hover:bg-brand-hover text-white transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom label */}
      <div className="mt-16 text-center relative z-10">
        <p className="text-slate-400 text-sm">
          Connected Intelligence — AI insights across your entire program portfolio
        </p>
      </div>
    </section>
  );
};

export default AISection;
