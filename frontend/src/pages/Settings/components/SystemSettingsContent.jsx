import React from 'react';
import { Bell, Database, Repeat, Cloud, Lock, Server, Share2, Info, Cpu, Radio, ShieldCheck, Activity } from 'lucide-react';

const SystemSettingsContent = ({ settings, onUpdate }) => {
  const getToggle = (key) => settings.find(s => s.key === key)?.value === 'true';

  const Toggle = ({ id, label, description, checked, onChange, icon: Icon }) => (
    <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-200/60 hover:bg-slate-50 transition-all shadow-sm group">
      <div className="flex items-start gap-4 max-w-[80%]">
        {Icon && (
          <div className="p-2.5 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl shadow-sm transition-colors mt-0.5">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-black text-slate-800 tracking-tight uppercase">{label}</p>
          <p className="text-[11px] text-slate-400 font-bold leading-tight mt-1 uppercase tracking-tight">{description}</p>
        </div>
      </div>
      <div className="relative inline-block w-14 h-8 shrink-0 ml-4">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer" 
          id={id} 
        />
        <label 
          htmlFor={id} 
          className="absolute cursor-pointer inset-0 bg-slate-200 rounded-full peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-6 after:h-6 after:rounded-full after:shadow-sm after:transition-all peer-checked:after:translate-x-6" 
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Infrastructure</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-tighter">Configure backend automation, industrial IoT bridges and triggers</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100">
           ALL SYSTEMS: <span className="font-bold">OPERATIONAL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notifications & Automation */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/20">
                  <Activity className="h-6 w-6" />
               </div>
               <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Communication & Triggers</h3>
            </div>
            
            <div className="space-y-4">
              <Toggle 
                id="notif-1"
                label="System Alerts"
                icon={Bell}
                description="Push notifications for critical downtime or budget breaches"
                checked={getToggle('notifications_enabled')}
                onChange={(val) => onUpdate('notifications_enabled', val.toString())}
              />
              <Toggle 
                id="auto-1"
                label="Industrial Cloud Backup"
                icon={Database}
                description="Real-time syncing of project logs to private S3 bucket"
                checked={getToggle('auto_backup')}
                onChange={(val) => onUpdate('auto_backup', val.toString())}
              />
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-1000">
               <Repeat className="h-32 w-32 text-indigo-500" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
               <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl shadow-sm border border-indigo-500/20">
                  <Repeat className="h-6 w-6" />
               </div>
               <h3 className="font-black text-white text-sm tracking-widest uppercase">Engine Scheduling</h3>
            </div>
            
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center relative z-10 backdrop-blur-sm">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Internal Cron</p>
               <p className="text-lg font-black text-white leading-tight">Weekly Production Summary</p>
               <p className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Next run: 01 Apr 2026 • 09:00 AM</p>
               <button className="mt-8 h-11 px-6 bg-white text-slate-900 rounded-xl font-black text-[10px] tracking-widest hover:bg-slate-100 transition-all uppercase shadow-lg shadow-white/5 active:scale-95">
                  Manage Schedules
               </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/20">
                     <Cpu className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Industrial Ecosystem</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">Bridge to SaaS and Shop Floor Hardware</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4 flex-1">
               {[
                 { name: 'Hardware Gateway', status: 'ACTIVE', icon: Radio, desc: 'Bridge to shop floor sensor array (Edge)', color: 'text-emerald-500 bg-emerald-50' },
                 { name: 'SAP S/4HANA', status: 'SYNCED', icon: Server, desc: 'Real-time ERP synchronization', color: 'text-blue-500 bg-blue-50' },
                 { name: 'Microsoft Azure', status: 'LINKED', icon: Cloud, desc: 'Compute and Blob Storage connection', color: 'text-sky-500 bg-sky-50' },
                 { name: 'IoT Hub', status: 'ERROR', icon: Activity, desc: 'Aggregated machinery data feed', color: 'text-red-500 bg-red-50' }
               ].map((int) => (
                 <div key={int.name} className="p-5 bg-slate-50 border border-slate-200/60 rounded-3xl flex items-center gap-5 hover:bg-white group transition-all cursor-pointer hover:shadow-md ring-0 hover:ring-1 ring-indigo-100">
                    <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-slate-100 font-black">
                       <int.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                       <div className="flex items-center justify-between">
                         <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{int.name}</p>
                         <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${int.color}`}>
                           {int.status}
                         </span>
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{int.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-8 bg-indigo-50 p-6 rounded-3xl border border-indigo-100/50 flex flex-col gap-4">
               <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  <p className="text-[11px] text-indigo-700 font-black uppercase tracking-widest leading-snug">
                    Security Version 2.4.1 Active
                  </p>
               </div>
               <p className="text-[10px] text-indigo-400 font-medium leading-relaxed italic">
                 New API version available for Edge devices. Upgrading recommended for machinery concurrency.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsContent;
