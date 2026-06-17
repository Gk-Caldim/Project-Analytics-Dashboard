import { CheckCircle, ArrowRight } from "lucide-react";

const ganttRows = [
  { label: "Excel Data Sync", start: 0, width: 45, color: "bg-blue-500" },
  { label: "MOM Transcription", start: 25, width: 35, color: "bg-emerald-500" },
  { label: "Budget Governance", start: 40, width: 30, color: "bg-purple-500" },
  { label: "Calendar Timeline", start: 55, width: 28, color: "bg-orange-500" },
  { label: "Activity Logging", start: 65, width: 20, color: "bg-teal-500" },
  { label: "SOP Sign-off", start: 75, width: 20, color: "bg-rose-500" },
];

const sidebarItems = [
  { label: "Dashboard", active: false },
  { label: "Project Tracker", active: false },
  { label: "Excel Sheets", active: true },
  { label: "Minutes (MOM)", active: false },
  { label: "Budget Masters", active: false },
  { label: "Team Masters", active: false },
];

function DashboardMockup() {
  return (
    <div className="relative group hover:scale-[1.01] transition-transform duration-500 ease-out">
      {/* Main dashboard panel */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-xl border border-gray-100/80 transition-all duration-300">
        {/* Window chrome */}
        <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="text-xs text-gray-300 ml-2 font-mono">
            CALDIM Workspace — India Center
          </div>
        </div>

        <div className="flex" style={{ height: "280px" }}>
          {/* Sidebar */}
          <div className="w-36 bg-gray-900 p-3 flex flex-col gap-0.5 flex-shrink-0">
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 px-2">
              CALDIM Suite
            </div>
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={`px-2 py-1.5 rounded text-[11px] cursor-pointer transition-colors ${
                  item.active
                    ? "bg-blue-600 text-white font-medium shadow-sm"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                {item.label}
              </div>
            ))}
            <div className="mt-auto">
              <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 px-2 mt-4">
                Active Leads
              </div>
              <div className="flex px-2 gap-1">
                {["PK", "AM", "SR"].map((initials) => (
                  <div
                    key={initials}
                    className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[8px] font-bold"
                  >
                    {initials}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-700">Design Release Analytics</div>
              <div className="flex gap-1">
                <div className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-semibold">Live Excel Sync</div>
              </div>
            </div>

            {/* Month headers */}
            <div className="flex ml-24 mb-1">
              {["Jul", "Aug", "Sep", "Oct", "Nov"].map((m) => (
                <div key={m} className="flex-1 text-[8px] text-gray-400 text-center font-medium">
                  {m}
                </div>
              ))}
            </div>

            {/* Gantt rows */}
            <div className="space-y-1.5">
              {ganttRows.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <div className="text-[9px] text-gray-500 w-24 truncate flex-shrink-0 font-medium">
                    {row.label}
                  </div>
                  <div className="flex-1 bg-gray-200 h-3.5 rounded-sm relative">
                    <div
                      className={`absolute top-0 h-full rounded-sm ${row.color} opacity-85 hover:opacity-100 transition-opacity`}
                      style={{ left: `${row.start}%`, width: `${row.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating overlay card — Task Progress */}
      <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 w-40 border border-gray-100/80 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="text-[10px] font-bold text-gray-700 mb-2">Excel Sheet Telemetry</div>
        <div className="space-y-1.5">
          {[
            { label: "Design Sync", value: 92, color: "bg-emerald-500" },
            { label: "MOM Actions", value: 76, color: "bg-blue-500" },
            { label: "Budget Variance", value: 14, color: "bg-rose-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[8px] text-gray-500 mb-0.5 font-medium">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
              <div className="bg-gray-100 h-1 rounded-full">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating overlay card — Recent activity */}
      <div className="absolute -bottom-6 -left-4 bg-white rounded-xl shadow-lg p-3 w-48 border border-gray-100/80 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="text-[10px] font-bold text-gray-700 mb-2">AI MOM Live Log</div>
        {[
          { user: "PK", text: "AI generated MOM for Body Validation", time: "Just now" },
          { user: "SR", text: "Synced latest sheet release", time: "12m ago" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[8px] text-emerald-600 font-bold flex-shrink-0 mt-0.5">
              {item.user}
            </div>
            <div>
              <div className="text-[9px] text-gray-700 leading-snug">{item.text}</div>
              <div className="text-[8px] text-gray-400">{item.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero({ onAccessWorkspace, onRequestDemo }) {
  return (
    <section
      className="pt-16 min-h-screen relative overflow-hidden flex items-center"
      style={{
        background:
          "linear-gradient(135deg, #e8faf0 0%, #e0f7fa 30%, #f0f9ff 60%, #ffffff 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 w-full z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — text */}
          <div className="flex-1 text-center lg:text-left animate-in fade-in slide-in-from-bottom duration-700">
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
              Real-time engineering
              <br />
              governance for
              <br />
              <span className="text-blue-600">CALDIM Analytics</span>
            </h1>
            <p className="text-gray-600 text-lg mb-8 max-w-lg leading-relaxed">
              Sync design release Excel sheets directly, capture meeting minutes with voice-to-text AI transcription, and manage multi-currency program budgets with live telemetry alerts.
            </p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 text-sm text-gray-600 mb-8 lg:justify-start justify-center">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Excel Design Release Sync
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                AI Voice MOM Capture
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Budget Masters & Variance
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button 
                onClick={onAccessWorkspace}
                className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg text-white px-7 py-3.5 rounded font-semibold text-sm tracking-wide transition-all cursor-pointer active:scale-95"
              >
                ACCESS PROJECT DASHBOARD
              </button>
              <button 
                onClick={() => onRequestDemo && onRequestDemo("demo", "Hero Request")}
                className="border border-gray-400 text-gray-700 hover:border-gray-600 hover:bg-gray-50/50 px-7 py-3.5 rounded font-semibold text-sm transition-all cursor-pointer active:scale-95"
              >
                REQUEST DEMO
              </button>
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="flex-1 flex justify-center lg:justify-end animate-in fade-in zoom-in duration-700">
            <div className="relative w-full max-w-xl mt-10 lg:mt-0">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Social proof bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            <div className="flex items-start gap-3">
              <div className="text-3xl font-bold text-gray-700 leading-none">"</div>
              <p className="text-sm text-gray-600 italic max-w-sm">
                CALDIM's direct Excel synchronization and Minutes of Meeting audio capture has transformed our team governance.
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200 hidden md:block" />
            <div className="flex items-center gap-8">
              {["G2 Leader", "Capterra Top Pick", "Product Hunt #1"].map((badge) => (
                <div
                  key={badge}
                  className="text-center opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default"
                >
                  <div className="text-xs font-bold text-gray-700 whitespace-nowrap">{badge}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
