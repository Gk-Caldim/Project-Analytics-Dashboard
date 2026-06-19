/**
 * CapabilityStrip — Scrolling marquee of platform capabilities.
 * Replaces fake company social-proof with honest feature highlights.
 */

const CAPABILITIES = [
  { label: "Spreadsheet Sync",          icon: "📊" },
  { label: "AI Meeting Summaries",       icon: "🎙️" },
  { label: "Resource Allocation",        icon: "📈" },
  { label: "Milestone Tracking",         icon: "📅" },
  { label: "Role-Based Access Control",  icon: "🔐" },
  { label: "Real-Time Variance Alerts",  icon: "⚡" },
  { label: "Audit Trail",               icon: "📋" },
  { label: "API Integration",            icon: "🔗" },
  { label: "Cross-Team Dashboards",      icon: "🖥️" },
  { label: "Release Gate Management",    icon: "🚀" },
];

/** Double the list so the CSS marquee has a seamless loop */
const ITEMS = [...CAPABILITIES, ...CAPABILITIES];

export const TrustStrip = () => {
  return (
    <section
      aria-label="Platform capabilities"
      className="relative py-8 border-y border-slate-100 bg-white overflow-hidden"
    >
      {/* Fade edges left */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-white to-transparent" />
      {/* Fade edges right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-white to-transparent" />

      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-6">
        Built-in capabilities
      </p>

      <div className="overflow-hidden">
        <div className="animate-marquee">
          {ITEMS.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 mx-10 shrink-0 select-none"
            >
              <span className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 text-base grid place-items-center shrink-0">
                {c.icon}
              </span>
              <span className="text-[14px] font-semibold text-slate-500 whitespace-nowrap">
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
