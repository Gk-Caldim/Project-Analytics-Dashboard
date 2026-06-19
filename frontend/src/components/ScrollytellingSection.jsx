import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, FileSpreadsheet, Mic, Wallet, CalendarDays, LayoutGrid, DollarSign } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import AppShellMockup from "./AppShellMockup";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/* ── MOCKUPS ────────────────────────────────────────────────────────── */

const GANTT_TASKS = [
  { id: "ZS-T102", name: "Project Planning", color: "#8B5CF6", start: 0,  width: 32, phase: "G0" },
  { id: "ZS-T103", name: "Design Release",   color: "#2563EB", start: 20, width: 38, phase: "G1" },
  { id: "ZS-T104", name: "Proto Build",      color: "#10B981", start: 42, width: 30, phase: "G2" },
];

const GanttMockup = () => (
  <div className="flex w-full text-slate-800">
    <div className="w-28 border-r border-slate-100 shrink-0">
      <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[8.5px] font-bold uppercase tracking-wide text-slate-400">
        <span>ID</span><span>Phase</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-slate-50">
        <span className="text-[8.5px] font-mono text-slate-400 shrink-0">ZS-T102</span>
        <span className="h-4 px-1.5 rounded text-[8px] font-bold text-white shrink-0 bg-[#8B5CF6]">G0</span>
      </div>
      {/* Labeled row 2 - Design Release (Our traveling bar sits here) */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-slate-50 h-[36px]">
        {/* Placeholder badge where traveling card will sit */}
        <div className="w-[46px] h-[18px] bg-slate-100 rounded border border-dashed border-slate-200 flex items-center justify-center text-[7px] text-slate-350 font-bold uppercase font-mono">
          [ZS-103]
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-slate-50">
        <span className="text-[8.5px] font-mono text-slate-400 shrink-0">ZS-T104</span>
        {/* Placeholder where traveling circle will sit */}
        <div className="w-5 h-5 bg-slate-100 rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[7px] text-slate-350 font-bold uppercase font-mono">
          [Ring]
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-hidden">
      <div className="flex border-b border-slate-100 bg-slate-50">
        {["OCT", "NOV", "DEC", "JAN"].map((m) => (
          <div key={m} className="flex-1 text-center text-[8.5px] font-bold text-slate-400 py-1.5 border-r border-slate-100 last:border-0">
            {m}
          </div>
        ))}
      </div>
      {/* Row 1 timeline */}
      <div className="relative flex h-8 border-b border-slate-50 items-center">
        <div className="absolute inset-y-1.5 rounded-md bg-[#8B5CF6] text-[8px] font-bold text-white flex items-center px-1.5 left-[4%] w-[32%]" style={{ zIndex: 5 }}>
          Project Planning
        </div>
      </div>
      {/* Row 2 timeline - DESIGN RELEASE (Placeholder where traveling bar sits) */}
      <div className="relative flex h-[36px] border-b border-slate-50 items-center">
        <div className="absolute left-[20%] w-[38%] h-[22px] bg-slate-50/50 rounded-md border border-dashed border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-300 uppercase font-mono">
          [Gantt Bar Placeholder]
        </div>
      </div>
      {/* Row 3 timeline */}
      <div className="relative flex h-8 border-b border-slate-50 items-center">
        <div className="absolute inset-y-1.5 rounded-md bg-[#10B981] text-[8px] font-bold text-white flex items-center px-1.5 left-[42%] w-[30%]" style={{ zIndex: 5 }}>
          Proto Build
        </div>
      </div>
    </div>
  </div>
);

const CalendarMockup = () => (
  <div className="rounded-xl border border-slate-150 overflow-hidden bg-white text-slate-800 text-[10px]">
    <div className="grid grid-cols-[48px_repeat(5,1fr)] border-b border-slate-200 bg-slate-50 text-center font-bold text-slate-400 uppercase py-1">
      <div className="text-[8px]">GMT+5:30</div>
      <div>Mon</div><div>Tue</div>
      <div className="bg-blue-50 text-brand relative">
        Wed
        {/* Placeholder where traveling circle date highlight sits */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-100/80 rounded-full border border-dashed border-slate-200 text-[7px] text-slate-350 leading-5 text-center font-mono">
          [18]
        </div>
      </div>
      <div>Thu</div><div>Fri</div>
    </div>
    <div className="grid grid-cols-[48px_repeat(5,1fr)] h-28 relative">
      {/* Mon */}
      <div className="border-r border-b border-slate-50" />
      <div className="border-r border-b border-slate-50 p-1">
        <div className="rounded bg-amber-500/90 text-white p-1 text-[8px] font-bold leading-tight">Budget Review</div>
      </div>
      {/* Tue */}
      <div className="border-r border-b border-slate-50" /><div className="border-r border-b border-slate-50" />
      {/* Wed */}
      <div className="border-r border-b border-slate-50 bg-blue-50/20" />
      <div className="border-r border-b border-slate-50 bg-blue-50/20 p-1 relative">
        {/* Wednesday 9:00 AM placeholder for traveling bar */}
        <div className="w-full h-[60px] bg-slate-50/50 rounded-md border border-dashed border-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-300 uppercase font-mono">
          [Bar]
        </div>
      </div>
      {/* Thu */}
      <div className="border-r border-b border-slate-50" />
      <div className="border-r border-b border-slate-50 p-1">
        {/* Thursday placeholder for traveling card */}
        <div className="w-full h-[36px] bg-slate-50/50 rounded-md border border-dashed border-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-300 uppercase font-mono">
          [Card]
        </div>
      </div>
      {/* Fri */}
      <div className="border-b border-slate-50" /><div className="border-b border-slate-50" />
    </div>
  </div>
);

const BudgetMockup = () => (
  <div className="space-y-4 text-slate-800 text-[11px] bg-white p-5 rounded-xl border border-slate-200/80">
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
      <span className="font-bold text-slate-800 font-heading">Program Budget Masters</span>
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 font-mono">LIVE VARIANCE</span>
    </div>
    
    <div>
      <div className="flex justify-between mb-1.5 text-[10px] font-semibold">
        <span>Body & Trim</span><span className="text-red-500 font-bold">+8% variance</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden relative">
        {/* Placeholder where traveling bar fits as department spent */}
        <div className="absolute inset-y-0 left-0 bg-slate-55 rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[7px] text-slate-300 font-mono uppercase" style={{ width: "78%" }}>
          [Bar Placeholder]
        </div>
      </div>
    </div>

    <div>
      <div className="flex justify-between mb-1.5 text-[10px] font-semibold">
        <span>Electrical Systems</span>
        <span className="text-emerald-500 font-bold">-11% variance</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden relative">
        <div className="h-full bg-emerald-400" style={{ width: "54%" }} />
      </div>
    </div>

    {/* Placeholder area for critical risk list and donut checks */}
    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Program Health</p>
        <div className="mt-1 flex items-center gap-2">
          {/* Circular donut check orb placeholder */}
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[7px] text-slate-300 font-bold uppercase font-mono">
            [Circle]
          </div>
          <div className="text-[10px] font-semibold text-slate-500 leading-tight">
            2 platform risks resolved this week
          </div>
        </div>
      </div>
      {/* Placeholder card */}
      <div className="w-1/2 h-[58px] bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[7px] text-slate-300 font-bold uppercase font-mono">
        [Card Placeholder]
      </div>
    </div>
  </div>
);

/* ── SCROLLYTELLING CONTAINER ────────────────────────────────────────── */

const SECTIONS = [
  {
    id: "hero",
    tag: "CALDIM PLANNER",
    title: "Your programs, fully synchronized",
    desc: "A single workspace that keeps design checklists, gate approvals, and live program timelines unified across your entire team.",
    highlight: "Zero manual cross-referencing between tools.",
  },
  {
    id: "gantt",
    tag: "TIMELINE",
    title: "See the big picture with Gantt charts",
    desc: "Build your project plan, set dependencies, and automatically track release gates. Immediately detect version drift between release lines.",
    highlight: "Dependencies, owners, and gate status in one view.",
  },
  {
    id: "calendar",
    tag: "CALENDAR",
    title: "Plan milestones on a shared calendar",
    desc: "Dynamic weekly view with color-coded event categories and drag-and-drop rescheduling built specifically for cross-functional teams.",
    highlight: "Gate scheduling that the whole team stays in sync with.",
  },
  {
    id: "budget",
    tag: "BUDGETS",
    title: "Govern budgets against strategic targets",
    desc: "Track program variance, department spend, and parts release costs in real time. Flag risk alerts before gates close.",
    highlight: "Variance detected early — before it hits your schedule.",
  },
];

export const ScrollytellingSection = ({ onRequestDemo }) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const elementsRef = useRef([]);
  const [activeSec, setActiveSec] = useState(0);

  // Mappings of mock shell states
  const SHELL_PATHS = ["/timeline", "/timeline", "/calendar", "/budget"];
  const SHELL_ICONS = ["calendar", "calendar", "calendar", "budget"];

  useGSAP(() => {
    // 1. Idle Floating Animation (Animate inner div, separating ScrollTrigger coordinate scrubbing)
    elementsRef.current.forEach((el, i) => {
      if (!el) return;
      const inner = el.querySelector(".floating-inner");
      if (!inner) return;

      gsap.to(inner, {
        y: "+=12",
        x: i % 2 === 0 ? "+=6" : "-=6",
        duration: 3 + Math.random() * 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    // 2. ScrollTrigger Scroll Timeline (Morping & Traveling coordinates)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
      },
    });

    // Elements array indices:
    // 0: travel-bar, 1: travel-circle, 2: travel-card

    // Setup initial coordinates (Section 1: Hero/Testimonial state)
    gsap.set(elementsRef.current[0], {
      left: "8%", top: "72vh", width: "120px", height: "8px", borderRadius: "4px",
      background: "linear-gradient(90deg, #8B5CF6, #EC4899)", opacity: 1,
    });
    gsap.set(elementsRef.current[1], {
      left: "30%", top: "25vh", width: "48px", height: "48px", borderRadius: "50%",
      background: "linear-gradient(135deg, #2563EB, #06B6D4)", opacity: 1,
    });
    gsap.set(elementsRef.current[2], {
      left: "58%", top: "20vh", width: "140px", height: "76px", borderRadius: "12px",
      background: "rgba(255, 255, 255, 0.95)", opacity: 1,
    });

    // Animate view index for background shell path/icon states
    tl.to({}, { duration: 0.5 }) // Initial scroll padding
      .call(() => setActiveSec(0), null, 0.1)

      // ── SECTION 1 -> 2 (Scroll 0% to 33%)
      // Elements travel to Gantt Mockup inside App Shell
      .add("sec1")
      .call(() => setActiveSec(1), null, "sec1+=0.2")
      .to(elementsRef.current[0], {
        left: "59vw", top: "35vh", width: "18vw", height: "22px", borderRadius: "6px",
        background: "linear-gradient(90deg, #2563EB, #3B82F6)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec1")
      .to(elementsRef.current[1], {
        left: "49.6vw", top: "42.5vh", width: "20px", height: "20px", borderRadius: "50%",
        background: "linear-gradient(135deg, #10B981, #059669)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec1")
      .to(elementsRef.current[2], {
        left: "49.6vw", top: "35vh", width: "46px", height: "18px", borderRadius: "4px",
        background: "rgba(37, 99, 235, 1)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec1")

      // ── SECTION 2 -> 3 (Scroll 33% to 66%)
      // Elements travel to Calendar Mockup
      .add("sec2")
      .call(() => setActiveSec(2), null, "sec2+=0.2")
      .to(elementsRef.current[0], {
        left: "70.7vw", top: "40.5vh", width: "6.5vw", height: "60px", borderRadius: "8px",
        background: "linear-gradient(135deg, #10B981, #059669)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec2")
      .to(elementsRef.current[1], {
        left: "71.6vw", top: "27.5vh", width: "22px", height: "22px", borderRadius: "50%",
        background: "linear-gradient(135deg, #EF4444, #F87171)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec2")
      .to(elementsRef.current[2], {
        left: "81vw", top: "40.5vh", width: "6.5vw", height: "36px", borderRadius: "6px",
        background: "rgba(139, 92, 246, 1)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec2")

      // ── SECTION 3 -> 4 (Scroll 66% to 100%)
      // Elements travel to Dashboard Widgets
      .add("sec3")
      .call(() => setActiveSec(3), null, "sec3+=0.2")
      .to(elementsRef.current[0], {
        left: "50.5vw", top: "45.5vh", width: "35vw", height: "12px", borderRadius: "6px",
        background: "linear-gradient(90deg, #EF4444, #F87171)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec3")
      .to(elementsRef.current[1], {
        left: "52vw", top: "67.5vh", width: "40px", height: "40px", borderRadius: "50%",
        background: "linear-gradient(135deg, #2563EB, #3B82F6)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec3")
      .to(elementsRef.current[2], {
        left: "73vw", top: "66.5vh", width: "14vw", height: "58px", borderRadius: "10px",
        background: "rgba(248, 250, 252, 1)",
        duration: 1.5, ease: "power2.inOut",
      }, "sec3")
      .to({}, { duration: 0.5 }); // Final scroll padding

    // Support prefers-reduced-motion media query
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      tl.kill();
      setActiveSec(3); // Render final dashboard coordinates statically
      elementsRef.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { x: 0, y: 0, scale: 1, opacity: 1 });
      });
    }

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative bg-[#f8fafc]">
      <div ref={triggerRef} className="relative w-full h-[400vh]">
        <div className="sticky-viewport sticky top-0 h-screen w-full overflow-hidden flex items-center justify-between px-6 md:px-16">
          
          {/* LEFT COLUMN: Contextual Text Panel (Cross-fades on scroll) */}
          <div className="w-[32%] shrink-0 h-[480px] flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSec}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute inset-x-0 space-y-6 text-slate-800"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-brand uppercase tracking-wider font-mono">
                  {SECTIONS[activeSec].tag}
                </span>
                <h2 className="font-heading font-extrabold text-slate-900 text-3xl md:text-[42px] tracking-tight leading-[1.08]">
                  {SECTIONS[activeSec].title}
                </h2>
                <p className="text-[14.5px] text-slate-500 font-sans leading-relaxed">
                  {SECTIONS[activeSec].desc}
                </p>

                {/* Feature highlight block — replaces fake testimonials */}
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-start gap-3 rounded-xl bg-blue-50/60 border border-blue-100/60 p-4">
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">→</span>
                    <p className="text-[13.5px] font-semibold text-slate-700 leading-snug">
                      {SECTIONS[activeSec].highlight}
                    </p>
                  </div>
                </div>

                {/* Show CTA buttons only on final section */}
                {activeSec === 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-3 pt-2"
                  >
                    <button
                      onClick={() => onRequestDemo && onRequestDemo("demo", "Workspace Launch")}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 text-[13.5px] font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer"
                    >
                      Access Workspace <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onRequestDemo && onRequestDemo("sales", "Dashboard Demo")}
                      className="inline-flex items-center justify-center px-5 py-3 text-[13.5px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer"
                    >
                      Request Demo
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT COLUMN: Reusable App Shell Mockup Container */}
          <div className="w-[50vw] h-[60vh] max-h-[500px] shrink-0 relative mr-6 z-0">
            <AppShellMockup
              activePath={SHELL_PATHS[activeSec]}
              activeIcon={SHELL_ICONS[activeSec]}
              statusText={activeSec === 3 ? "Program Governance" : "Atlas VX · G2 Active"}
            >
              <div className="p-4 bg-white h-full overflow-hidden flex flex-col justify-center relative">
                {/* Cross-fade views inside the stable App Shell wrapper */}
                {activeSec === 0 && (
                  <motion.div
                    key="hero-intro"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/50 rounded-xl border border-slate-100"
                  >
                    <LayoutGrid className="h-12 w-12 text-slate-300 mb-4" />
                    <h4 className="font-heading font-extrabold text-slate-700 text-lg">CALDIM Program Workspace</h4>
                    <p className="text-slate-400 text-[11.5px] mt-2 max-w-xs font-sans">
                      Scroll down to see our live mockups load and synchronize your automotive timeline data.
                    </p>
                  </motion.div>
                )}
                {activeSec === 1 && (
                  <motion.div key="gantt-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <GanttMockup />
                  </motion.div>
                )}
                {activeSec === 2 && (
                  <motion.div key="calendar-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CalendarMockup />
                  </motion.div>
                )}
                {activeSec === 3 && (
                  <motion.div key="budget-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <BudgetMockup />
                  </motion.div>
                )}
              </div>
            </AppShellMockup>
          </div>

          {/* ── TRAVELING ELEMENTS (Positioned absolutely above mockup layers) ── */}

          {/* Element 1: Dynamic Morphing Bar */}
          <div
            ref={(el) => { elementsRef.current[0] = el; }}
            className="absolute z-40 will-change-[transform,width,height] cursor-default"
          >
            <div className="floating-inner w-full h-full relative rounded-[inherit] overflow-hidden shadow-md flex items-center justify-center">
              {/* Contextual inner content swaps */}
              <div className={cn(
                "w-full h-full flex items-center justify-center text-white text-[8px] font-bold select-none font-mono tracking-wider transition-opacity duration-300",
                activeSec === 0 ? "opacity-100" : "opacity-0 absolute"
              )}>
                72% COMPLETE
              </div>
              <div className={cn(
                "w-full h-full flex items-center px-3 text-white text-[8.5px] font-sans font-bold truncate select-none transition-opacity duration-300",
                activeSec === 1 ? "opacity-100" : "opacity-0 absolute"
              )}>
                Design Release Freeze
              </div>
              <div className={cn(
                "w-full h-full flex flex-col text-left p-1.5 text-white select-none transition-opacity duration-300 justify-center",
                activeSec === 2 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <span className="font-bold text-[8.5px] leading-tight">G3 Gate Review</span>
                <span className="text-[7.5px] opacity-90 font-medium">9:00 AM - 11:30 AM</span>
              </div>
              <div className={cn(
                "w-full h-full flex items-center px-3 text-white text-[8.5px] font-bold select-none font-mono transition-opacity duration-300 justify-between",
                activeSec === 3 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <span>Body & Trim spent 78%</span>
                <span className="bg-red-600/30 px-1 rounded text-[7px] border border-red-500/10">+8% variance</span>
              </div>
            </div>
          </div>

          {/* Element 2: Dynamic Morphing Circle Date / Donut Segment */}
          <div
            ref={(el) => { elementsRef.current[1] = el; }}
            className="absolute z-45 will-change-[transform,width,height] cursor-default"
          >
            <div className="floating-inner w-full h-full rounded-full shadow-md flex items-center justify-center overflow-hidden">
              <div className={cn(
                "text-white text-[10px] font-bold uppercase tracking-wider text-center flex flex-col select-none transition-opacity duration-300 leading-none",
                activeSec === 0 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <span className="text-[7px]">SOP</span>
                <span>G2</span>
              </div>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full bg-white transition-opacity duration-300",
                activeSec === 1 ? "opacity-100" : "opacity-0 absolute"
              )} />
              <div className={cn(
                "text-white text-[9px] font-extrabold select-none leading-none transition-opacity duration-300",
                activeSec === 2 ? "opacity-100" : "opacity-0 absolute"
              )}>
                18
              </div>
              <div className={cn(
                "text-white text-[11px] font-bold select-none leading-none transition-opacity duration-300",
                activeSec === 3 ? "opacity-100" : "opacity-0 absolute"
              )}>
                ✓
              </div>
            </div>
          </div>

          {/* Element 3: Traveling & Recontextualized Card */}
          <div
            ref={(el) => { elementsRef.current[2] = el; }}
            className="absolute z-40 will-change-[transform,width,height] cursor-default border border-slate-200/50 shadow-lg flex items-center justify-center"
          >
            <div className="floating-inner w-full h-full relative rounded-[inherit] overflow-hidden flex items-center justify-center">
              <div className={cn(
                "p-3 text-slate-800 text-left font-sans flex flex-col justify-center transition-opacity duration-300 h-full w-full",
                activeSec === 0 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide font-mono">Recent Activity</span>
                <span className="text-[10px] font-bold text-slate-700 mt-1 leading-tight">PPAP Level-3 checklist released</span>
              </div>
              <div className={cn(
                "text-white text-[8px] font-bold font-mono tracking-wide uppercase select-none transition-opacity duration-300 leading-none text-center",
                activeSec === 1 ? "opacity-100" : "opacity-0 absolute"
              )}>
                ZS-T103
              </div>
              <div className={cn(
                "p-1.5 text-white text-left font-sans flex flex-col justify-center transition-opacity duration-300 h-full w-full",
                activeSec === 2 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <span className="text-[8.5px] font-bold leading-tight">Sprint Planning</span>
                <span className="text-[7px] opacity-80 leading-none mt-0.5">Thursday 2:00 PM</span>
              </div>
              <div className={cn(
                "p-2.5 text-slate-800 text-left font-sans flex flex-col justify-center transition-opacity duration-300 h-full w-full bg-slate-50",
                activeSec === 3 ? "opacity-100" : "opacity-0 absolute"
              )}>
                <div className="flex justify-between items-center">
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-red-500 font-mono">CRITICAL DRIFT</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
                <p className="text-[9.5px] font-bold text-slate-700 leading-tight mt-1">Wiring harness DR-1045 drift status</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScrollytellingSection;
