import { Sparkles, TrendingUp, MessageSquare, BarChart3, ChevronRight } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    label: "Maximize Productivity",
    desc: "AI surfaces blockers before they delay milestones, so your teams stay ahead of program gates.",
  },
  {
    icon: MessageSquare,
    label: "Communicate Effectively",
    desc: "Auto-generate status reports, meeting summaries, and stakeholder updates from your project data.",
  },
  {
    icon: BarChart3,
    label: "Smart Analytics",
    desc: "Predictive risk scoring and resource utilization insights trained on automotive program patterns.",
  },
];

function AIChatMockup() {
  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <div className="text-sm font-semibold text-white">AI Assistant</div>
        <div className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Active</div>
      </div>
      <div className="p-5 space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-blue-600 text-white text-xs rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xs">
            Which tasks on Atlas VX are at risk of missing the Q4 gate?
          </div>
        </div>

        {/* AI response */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="bg-gray-800 text-gray-200 text-xs rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm leading-relaxed">
            <div className="font-semibold text-white mb-2">3 tasks at risk for Q4 gate:</div>
            <div className="space-y-1.5">
              {[
                { task: "SW Integration Testing", risk: "High", days: "-12d" },
                { task: "Interior Trim Validation", risk: "Medium", days: "-5d" },
                { task: "FMEA Sign-off", risk: "Medium", days: "-3d" },
              ].map((item) => (
                <div key={item.task} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.risk === "High" ? "bg-red-400" : "bg-orange-400"
                    }`}
                  />
                  <span>{item.task}</span>
                  <span
                    className={`ml-auto text-[10px] font-medium ${
                      item.risk === "High" ? "text-red-400" : "text-orange-400"
                    }`}
                  >
                    {item.days}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-700 text-gray-400">
              Recommend reassigning T. Ramirez from Horizon EV to unblock SW Integration. Want
              me to draft the reallocation?
            </div>
          </div>
        </div>

        {/* Suggested replies */}
        <div className="flex flex-wrap gap-2 pl-10">
          {["Draft reallocation", "View all risks", "Export report"].map((s) => (
            <button
              key={s}
              className="text-[11px] border border-gray-600 text-gray-300 px-3 py-1.5 rounded-full hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-700">
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-2.5">
          <input
            className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
            placeholder="Ask about your programs..."
            readOnly
          />
          <button className="text-blue-500 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AISection() {
  return (
    <section
      className="py-24"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in duration-300">
          <div className="inline-flex items-center gap-2 text-purple-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by AI
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 animate-in fade-in duration-500">
            AI that works hand-in-hand
            <br />
            with your engineering team
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Get more done with AI that fully understands the context of your automotive programs,
            from APQP to SOP.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left — feature list */}
          <div className="flex-1 space-y-8 animate-in fade-in duration-500">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.label}
                  className="flex items-start gap-5 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-colors bg-white/5"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-semibold mb-1.5">{feat.label}</div>
                    <div className="text-gray-400 text-sm leading-relaxed">{feat.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — AI chat mockup */}
          <div className="flex-1 w-full max-w-lg mx-auto lg:mx-0 animate-in fade-in duration-500">
            <AIChatMockup />
          </div>
        </div>

        {/* Bottom label */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Connected Intelligence — AI insights across your entire program portfolio
          </p>
        </div>
      </div>
    </section>
  );
}
