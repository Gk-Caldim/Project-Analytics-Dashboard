import React from "react";
import { LayoutGrid, Calendar, FileSpreadsheet, DollarSign, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { id: "grid",     Icon: LayoutGrid,      label: "Dashboard" },
  { id: "excel",    Icon: FileSpreadsheet, label: "Excel Sync" },
  { id: "calendar", Icon: Calendar,        label: "Timeline / Calendar" },
  { id: "budget",   Icon: DollarSign,      label: "Budget" },
  { id: "mom",      Icon: Mic,             label: "AI MOM" },
];

export const AppShellMockup = ({ children, activePath = "/timeline", activeIcon = "calendar", statusText = "Atlas VX · G2 Active" }) => {
  return (
    <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 overflow-hidden border border-slate-100">
      {/* Browser chrome header */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        
        {/* URL Path Box */}
        <div className="ml-3 flex items-center bg-white px-3 py-1 rounded-md border border-slate-200/60 shadow-sm min-w-[240px] max-w-sm">
          <span className="text-[10px] font-mono text-slate-400 select-none">caldim.app</span>
          <span className="text-[10px] font-mono text-slate-400 px-1 select-none">/</span>
          <span className="text-[10px] font-mono text-slate-700 font-semibold truncate transition-all duration-300">
            {activePath.replace(/^\//, "")}
          </span>
        </div>

        {/* Status indicator badge */}
        {statusText && (
          <span className="ml-auto rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
            {statusText}
          </span>
        )}
      </div>

      <div className="flex">
        {/* Left Sidebar Navigation */}
        <div className="w-12 border-r border-slate-100 bg-slate-50/60 flex flex-col items-center py-4 gap-3 shrink-0">
          {SIDEBAR_ITEMS.map(({ id, Icon, label }) => {
            const isActive = activeIcon === id;
            return (
              <div
                key={id}
                title={label}
                className={cn(
                  "h-8 w-8 grid place-items-center rounded-lg transition-all duration-300 select-none",
                  isActive
                    ? "bg-brand text-white shadow-md shadow-blue-500/10 scale-105"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 cursor-default"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            );
          })}
        </div>

        {/* Content Workspace Slot */}
        <div className="flex-1 bg-white min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppShellMockup;
