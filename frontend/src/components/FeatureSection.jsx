import { useState } from "react";
import { ArrowRight, FileSpreadsheet, Mic, DollarSign, Calendar } from "lucide-react";

function ExcelMockup() {
  const releases = [
    { code: "CR-102", name: "Chassis Mount Design v3", status: "Synced", engineer: "Pradeep K.", date: "17-Jun" },
    { code: "TR-890", name: "Powertrain Thermal Spec", status: "Review", engineer: "Anoop M.", date: "16-Jun" },
    { code: "EL-542", name: "Battery Pack Cable Layout", status: "Synced", engineer: "Srinivas R.", date: "15-Jun" },
    { code: "BD-098", name: "Door Panel Gap Specs", status: "Draft", engineer: "Pradeep K.", date: "15-Jun" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-700">Design_Release_Expanded.xlsx</div>
        <div className="flex gap-2">
          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-semibold">Active Filter</span>
        </div>
      </div>
      <div className="p-4">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Sheet Row Item</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Engineer</th>
              <th className="pb-2 font-medium text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((row) => (
              <tr key={row.code} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2.5 font-mono text-gray-500">{row.code}</td>
                <td className="py-2.5 font-medium text-gray-800 truncate max-w-[140px]">{row.name}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${row.status === "Synced" ? "bg-emerald-50 text-emerald-600" : row.status === "Review" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-600"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-2.5 text-gray-600">{row.engineer}</td>
                <td className="py-2.5 text-gray-400 text-right">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MOMMockup() {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          AI Meeting Transcription
        </div>
        <div className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded font-semibold animate-pulse">02:34:18 Recording</div>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 font-medium">
            <span>Speaker: Anoop M. (MOM Lead)</span>
            <span>11:15 AM</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed italic">
            "We will lock the Chassis Mount design by Thursday. Srinivas, please ensure the battery pack cable layouts are verified before the SOP review."
          </p>
        </div>
        <div className="border-t border-dashed border-gray-100 pt-3 space-y-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Generated Action Items</div>
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-emerald-50/40 p-2 rounded border border-emerald-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Verify battery layouts (Assign to Srinivas R.)</span>
            <span className="ml-auto text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Auto-Assigned</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetMockup() {
  const projects = [
    { name: "Atlas EV-3 Platform", budget: "₹48.2Cr", spent: "68%", variance: "+2.4%" },
    { name: "Horizon Thermal", budget: "₹12.5Cr", spent: "82%", variance: "-1.2%" },
    { name: "Safety Validation", budget: "₹6.8Cr", spent: "45%", variance: "+4.1%" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-700">Budget Master Overview</div>
        <div className="text-[10px] text-blue-600 font-semibold cursor-pointer">Currency: INR (₹)</div>
      </div>
      <div className="p-4 space-y-3">
        {projects.map((p) => (
          <div key={p.name} className="border border-gray-50 p-2.5 rounded-lg hover:bg-gray-50/50 transition-colors">
            <div className="flex justify-between text-xs font-semibold text-gray-800 mb-1.5">
              <span>{p.name}</span>
              <span>{p.budget}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: p.spent }} />
              </div>
              <span className="text-[10px] text-gray-500 w-8 text-right font-medium">{p.spent}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${p.variance.startsWith("+") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                {p.variance}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarMockup() {
  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-700">Team Planner Calendar</div>
        <div className="text-[10px] text-gray-400 font-medium">Drag-and-Drop Enabled</div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-gray-400 font-bold mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const dayNum = i + 14;
            const hasTask = dayNum === 16 || dayNum === 17 || dayNum === 18;
            return (
              <div key={i} className="aspect-square bg-gray-50 border border-gray-100 rounded p-1 flex flex-col justify-between relative hover:border-blue-400 transition-colors cursor-grab">
                <span className="text-[9px] text-gray-400 font-bold leading-none">{dayNum}</span>
                {hasTask && dayNum === 16 && (
                  <div className="absolute inset-x-1 bottom-1 bg-blue-500 text-white rounded text-[7px] p-0.5 font-bold truncate leading-none z-10">
                    SOP Gate
                  </div>
                )}
                {hasTask && dayNum === 17 && (
                  <div className="absolute inset-x-1 bottom-1 bg-emerald-500 text-white rounded text-[7px] p-0.5 font-bold truncate leading-none z-10">
                    Excel Sync
                  </div>
                )}
                {hasTask && dayNum === 18 && (
                  <div className="absolute inset-x-1 bottom-1 bg-purple-500 text-white rounded text-[7px] p-0.5 font-bold truncate leading-none z-10">
                    MOM Lock
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const tabs = [
  {
    id: "excel",
    label: "Excel Sync",
    icon: FileSpreadsheet,
    headline: "Import and sync Design Releases instantly",
    body: "Interact with your Design Release Sheets and Excel trackers directly inside the browser. CALDIM Project Dashboard offers inline sorting, advanced column filters, and telemetry charts mapped to your actual cells.",
    link: "Explore design release tracker",
    mockup: <ExcelMockup />,
  },
  {
    id: "mom",
    label: "Minutes of Meetings (MOM)",
    icon: Mic,
    headline: "AI-powered Minutes of Meetings",
    body: "Record audio meetings directly in your browser. Our integrated transcription engine converts voice to text, highlights critical project logs, automatically creates task allocations, and logs the history.",
    link: "Learn more about minutes & meetings",
    mockup: <MOMMockup />,
  },
  {
    id: "budget",
    label: "Budget Governance",
    icon: DollarSign,
    headline: "Control global program expenditures",
    body: "Track budgets against strategic programs with automatic variance alerts. Manage multiple currency conversions, employee pay records, and allocate resources efficiently across engineering projects.",
    link: "Learn more about budget master",
    mockup: <BudgetMockup />,
  },
  {
    id: "calendar",
    label: "Team Calendar",
    icon: Calendar,
    headline: "Interactive calendar with drag-and-drop tiles",
    body: "Coordinate cross-plant deadlines easily. Resize, drag, extend, and shrink task tiles directly on the timeline view. Your team schedules, holidays, and milestones sync in real-time.",
    link: "Learn more about interactive calendar",
    mockup: <CalendarMockup />,
  },
];

export function FeaturesSection({ onRequestDemo }) {
  const [activeTab, setActiveTab] = useState("excel");
  const active = tabs.find((t) => t.id === activeTab);

  const handleLinkClick = (e, label) => {
    e.preventDefault();
    if (onRequestDemo) {
      onRequestDemo("sales", `Inquiry: ${label}`);
    }
  };

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tab nav */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center min-h-[360px]">
          {/* Left — description */}
          <div className="flex-1 max-w-md animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{active.headline}</h2>
            <p className="text-gray-600 leading-relaxed mb-6">{active.body}</p>
            <a
              href="#"
              onClick={(e) => handleLinkClick(e, active.label)}
              className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:gap-2.5 transition-all"
            >
              {active.link} <ArrowRight className="w-4 h-4" />
            </a>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold text-gray-900">40%</div>
                <div className="text-sm text-gray-500 mt-1">faster program delivery</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">3×</div>
                <div className="text-sm text-gray-500 mt-1">better cross-team visibility</div>
              </div>
            </div>
          </div>

          {/* Right — mockup */}
          <div className="flex-1 w-full animate-in fade-in duration-500">{active.mockup}</div>
        </div>

        {/* Trusted by bar */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest text-[11px] font-bold">
            Trusted by engineering teams across
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-50 grayscale hover:opacity-75 transition-opacity">
            {["OEM Programs", "Tier 1 Suppliers", "R&D Labs", "EV Startups", "Defense & Aero"].map(
              (label) => (
                <div
                  key={label}
                  className="text-xs font-bold text-gray-600 border border-gray-300 px-4 py-2 rounded"
                >
                  {label}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
