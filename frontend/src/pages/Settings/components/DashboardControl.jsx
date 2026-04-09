import React, { useState } from 'react';
import { 
  LayoutDashboard, PieChart, BarChart3, LineChart, Layers, 
  Eye, EyeOff, CheckCircle2, Circle, Search, Plus, 
  Settings2, Monitor, Info, AlertCircle, Save, X, RefreshCw
} from 'lucide-react';

const DashboardControl = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('Project Overview');
  
  const dashboardViews = [
    { 
      name: 'Project Overview', 
      type: 'Executive', 
      widgets: 8, 
      icon: LayoutDashboard, 
      description: 'High-level summary of all active projects and budgets.',
    },
    { 
      name: 'Financial Analytics', 
      type: 'Fiscal', 
      widgets: 12, 
      icon: PieChart, 
      description: 'Detailed budget utilization and cost variance tracking.' 
    },
    { 
      name: 'Operational KPIs', 
      type: 'Performance', 
      widgets: 6, 
      icon: BarChart3, 
      description: 'Real-time efficiency and throughput metrics.' 
    },
    { 
      name: 'Resource Allocation', 
      type: 'Management', 
      widgets: 5, 
      icon: Layers, 
      description: 'Personnel and equipment distribution across sites.' 
    },
  ];

  const dashboardModules = [
    {
      id: 'widgets',
      label: 'PROJECT WIDGET VISIBILITY',
      items: [
        { name: 'Budget Rollup Card', description: 'Show total estimated vs utilized budget', enabled: true },
        { name: 'Project Timeline', description: 'Gantt style view of project progressions', enabled: true },
        { name: 'Sub-Category Breakdown', description: 'Detailed list of project sub-categories', enabled: true },
        { name: 'Recent Activity Feed', description: 'Live log of changes made to the project', enabled: false },
      ]
    },
    {
      id: 'performance',
      label: 'DATA REFRESH & PERFORMANCE',
      items: [
        { name: 'Auto-Refresh', description: 'Automatically update project data every 60 seconds', enabled: true },
        { name: 'Cache Pre-fetching', description: 'Pre-load sub-category data for faster navigation', enabled: true },
      ]
    }
  ];

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button 
      onClick={() => !disabled && onChange && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#1E3A8A]' : 'bg-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-[#1E293B]">Dashboard Control</h2>
        </div>
        <button className="flex items-center gap-2 h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#1e2e6b] transition-all shadow-lg active:scale-95">
          <Settings2 className="h-4 w-4" />
          Global Widgets
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dashboard Views List */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-800">Project Dashboard Views</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">{dashboardViews.length} Layouts</span>
           </div>
           
           <div className="space-y-4">
              {dashboardViews.map((view) => (
                <button
                  key={view.name}
                  onClick={() => setSelectedDashboard(view.name)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                    selectedDashboard === view.name 
                    ? 'bg-white border-[#1E3A8A] shadow-xl shadow-indigo-100/50' 
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  {selectedDashboard === view.name && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                  )}
                  
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl shadow-sm border ${
                        selectedDashboard === view.name ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                     }`}>
                        <view.icon className="h-5 w-5" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-base font-bold text-[#1E293B]">{view.name}</h4>
                           <span className="text-[8px] font-black text-indigo-600 tracking-widest uppercase">{view.type}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                           {view.description}
                        </p>
                        <div className="flex items-center gap-2">
                           <Monitor className="h-3 w-3 text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{view.widgets} Widgets Active</span>
                        </div>
                     </div>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Right Column: Module Dashboard */}
        <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Monitor className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#1E293B]">{selectedDashboard} Modules</h3>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all">Update Layout</button>
              </div>
           </div>

           <div className="p-8 space-y-12">
              {dashboardModules.map((group) => (
                <div key={group.id} className="space-y-6">
                   <div className="flex items-center gap-4">
                      <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">{group.label}</h4>
                      <div className="flex-1 h-px bg-slate-100" />
                   </div>

                   <div className="space-y-4">
                      {group.items.map((item) => (
                        <div 
                          key={item.name} 
                          className="p-6 rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 hover:bg-white hover:border-slate-200 transition-all"
                        >
                           <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-2">
                                 <h5 className="text-[15px] font-bold text-[#1E293B]">{item.name}</h5>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {item.description}
                                 </p>
                              </div>
                              <Toggle enabled={item.enabled} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest inline-flex items-center gap-2">
                 <RefreshCw className="h-3 w-3 text-indigo-400" />
                 Last layout sync: 1st Apr 2026 at 3:30 PM
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardControl;
