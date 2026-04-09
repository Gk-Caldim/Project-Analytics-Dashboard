import React, { useState } from 'react';
import { 
  ClipboardList, Activity, Map, Package, CheckCircle2, Circle, 
  Search, Plus, ShieldCheck, Globe, Info, AlertCircle, Save, X, ToggleLeft as ToggleIcon
} from 'lucide-react';

const TrackerControl = () => {
  const [selectedTracker, setSelectedTracker] = useState('Logistics Hub');
  
  const trackers = [
    { 
      name: 'Logistics Hub', 
      status: 'Active', 
      devices: 24, 
      icon: Map, 
      description: 'Fleet and inventory tracking across regional warehouses.',
      location: 'Hub 4, Sector 12',
    },
    { 
      name: 'Assembly Line A', 
      status: 'Active', 
      devices: 12, 
      icon: Activity, 
      description: 'Real-time telemetry for robotic assembly arm units.' 
    },
    { 
      name: 'Cold Storage', 
      status: 'Warning', 
      devices: 8, 
      icon: ShieldCheck, 
      description: 'Temperature and humidity monitoring for perishables.' 
    },
    { 
      name: 'Final Inspection', 
      status: 'Standby', 
      devices: 4, 
      icon: ClipboardList, 
      description: 'Quality gated tracking for finished goods.' 
    },
  ];

  const trackerModules = [
    {
      id: 'telemetry',
      label: 'TELEMETRY MODULES',
      features: [
        { name: 'Live GPS Tracking', description: 'Real-time coordinate updates every 5 seconds', enabled: true },
        { name: 'Hardware Diagnostic', description: 'Internal sensor health and battery monitoring', enabled: true },
        { name: 'Remote Reboot', description: 'Permission to restart tracker hardware from dashboard', enabled: false },
      ]
    },
    {
      id: 'data',
      label: 'DATA PERSISTENCE',
      features: [
        { name: 'Offline Storage', description: 'Store data locally when cellular signal is lost', enabled: true },
        { name: 'Encrypted Transmission', description: 'AES-256 encryption for all outgoing data packets', enabled: true },
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
          <h2 className="text-4xl font-bold text-[#1E293B]">Tracker Control</h2>
        </div>
        <button className="flex items-center gap-2 h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#1e2e6b] transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Assign New Tracker
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Trackers List */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-800">Active Trackers</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">{trackers.length} Systems</span>
           </div>
           
           <div className="space-y-4">
              {trackers.map((tracker) => (
                <button
                  key={tracker.name}
                  onClick={() => setSelectedTracker(tracker.name)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                    selectedTracker === tracker.name 
                    ? 'bg-white border-[#1E3A8A] shadow-xl shadow-indigo-100/50' 
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  {selectedTracker === tracker.name && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                  )}
                  
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl shadow-sm border ${
                        selectedTracker === tracker.name ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                     }`}>
                        <tracker.icon className="h-5 w-5" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-base font-bold text-[#1E293B]">{tracker.name}</h4>
                           <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${
                             tracker.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                             tracker.status === 'Warning' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                           }`}>{tracker.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                           {tracker.location || 'Central Facility'}
                        </p>
                        <div className="flex items-center gap-2">
                           <Globe className="h-3 w-3 text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{tracker.devices} Connected Nodes</span>
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
                    <Activity className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#1E293B]">{selectedTracker} Modules</h3>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all">Apply to System</button>
              </div>
           </div>

           <div className="p-8 space-y-12">
              {trackerModules.map((group) => (
                <div key={group.id} className="space-y-6">
                   <div className="flex items-center gap-4">
                      <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">{group.label}</h4>
                      <div className="flex-1 h-px bg-slate-100" />
                   </div>

                   <div className="space-y-4">
                      {group.features.map((feature) => (
                        <div 
                          key={feature.name} 
                          className="p-6 rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 hover:bg-white hover:border-slate-200 transition-all"
                        >
                           <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-2">
                                 <h5 className="text-[15px] font-bold text-[#1E293B]">{feature.name}</h5>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {feature.description}
                                 </p>
                              </div>
                              <Toggle enabled={feature.enabled} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest inline-flex items-center gap-2">
                 <ShieldCheck className="h-3 w-3 text-emerald-500" />
                 Global Tracker Security Protocols Active
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerControl;
