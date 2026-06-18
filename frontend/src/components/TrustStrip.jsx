/**
 * TrustStrip — Infinite horizontal marquee of trusted company names.
 * Zoho-style social proof ticker placed between Hero and Features.
 */

const COMPANIES = [
  { name: "Tata Motors",       abbr: "TM" },
  { name: "Airbus",            abbr: "AB" },
  { name: "Bosch",             abbr: "BS" },
  { name: "Mahindra",          abbr: "MA" },
  { name: "John Deere",        abbr: "JD" },
  { name: "Volvo Group",       abbr: "VG" },
  { name: "Cummins",           abbr: "CU" },
  { name: "Daimler Trucks",    abbr: "DT" },
  { name: "Bajaj Auto",        abbr: "BA" },
  { name: "KUKA Robotics",     abbr: "KR" },
];

/** Double the list so the CSS marquee has a seamless loop */
const ITEMS = [...COMPANIES, ...COMPANIES];

export const TrustStrip = () => {
  return (
    <section
      aria-label="Trusted by engineering teams worldwide"
      className="relative py-8 border-y border-slate-100 bg-white overflow-hidden"
    >
      {/* Fade edges left */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-white to-transparent" />
      {/* Fade edges right */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-white to-transparent" />

      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 mb-6">
        Trusted by engineering teams at
      </p>

      <div className="overflow-hidden">
        <div className="animate-marquee">
          {ITEMS.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 mx-10 shrink-0 select-none"
            >
              {/* Mini avatar-style brand mark */}
              <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-extrabold grid place-items-center shrink-0 tracking-wide">
                {c.abbr}
              </span>
              <span className="text-[15px] font-semibold text-slate-400 whitespace-nowrap">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
