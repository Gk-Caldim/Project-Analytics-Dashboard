import React from 'react';
import { Calendar, Clock, CreditCard, ShieldCheck, ChevronRight, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

const Policies = () => {
  const policyCategories = [
    {
      id: 'timesheet',
      title: 'Timesheet Policy',
      description: 'Configure entry deadlines, approval workflows and overtime rules for field engineers',
      icon: Clock,
      color: '#6366f1'
    },
    {
      id: 'leave',
      title: 'Leave Policy',
      description: 'Define industrial leave types, accrual rules and mandatory cancellation window',
      icon: Calendar,
      color: '#0ea5e9'
    },
    {
      id: 'payroll',
      title: 'Payroll Policy',
      description: 'Manage tax exemptions, bonus cycles and payout schedules for manufacturing staff',
      icon: CreditCard,
      color: '#10b981'
    }
  ];

  const PolicyCard = ({ category }) => (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group cursor-pointer relative overflow-hidden border-l-8" style={{ borderLeftColor: category.color }}>
       <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <category.icon className="h-32 w-32" />
       </div>
       <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-slate-100 shadow-sm">
          <category.icon className="h-7 w-7 text-indigo-600" />
       </div>
       <h3 className="font-black text-slate-800 text-xl group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{category.title}</h3>
       <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed h-12 overflow-hidden">{category.description}</p>
       
       <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                     V{i}
                  </div>
                ))}
             </div>
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Revisions</span>
          </div>
          <div className="text-indigo-500 font-black text-[10px] tracking-widest flex items-center gap-1 group-hover:translate-x-2 transition-transform uppercase">
            Configure <ChevronRight className="h-4 w-4" />
          </div>
       </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Operational Policies</h2>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-tighter">Define system-wide guardrails for industrial operations and compliance</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> EXPORT HANDBOOK (PDF)
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {policyCategories.map((p) => (
          <PolicyCard key={p.id} category={p} />
        ))}
      </div>

      {/* Detailed Configuration Placeholder */}
      <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="h-48 w-48 text-indigo-500" />
         </div>
         <div className="p-8 border-b border-slate-100/60 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="h-6 w-6" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Global Operational Rule</p>
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Timesheet Submission & Compliance</h3>
               </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-widest">
               <CheckCircle2 className="h-3 w-3" /> ACTIVE POLICY
            </div>
         </div>

         <div className="p-10 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-6">
                  {[
                    { id: 'rule1', label: 'Strict Weekly Deadline', desc: 'Auto-lock all pending timesheets every Monday at 09:00 AM' },
                    { id: 'rule2', label: 'Tier-2 Overtime Approval', desc: 'Require additional manager sign-off for OT > 4 hours/day' },
                    { id: 'rule3', label: 'Site Location Geofencing', desc: 'Validate engineer check-ins within 500m of project site' }
                  ].map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-200/50 hover:bg-white transition-all shadow-sm group">
                      <div className="max-w-[80%]">
                        <p className="text-sm font-black text-slate-800 tracking-tight uppercase">{rule.label}</p>
                        <p className="text-[11px] text-slate-400 font-bold leading-tight mt-1 uppercase tracking-tight">{rule.desc}</p>
                      </div>
                      <div className="relative inline-block w-14 h-8 shrink-0 ml-4">
                        <input type="checkbox" defaultChecked className="sr-only peer" id={rule.id} />
                        <label htmlFor={rule.id} className="absolute cursor-pointer inset-0 bg-slate-200 rounded-full peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:w-6 after:h-6 after:rounded-full after:shadow-sm after:transition-all peer-checked:after:translate-x-6" />
                      </div>
                    </div>
                  ))}
               </div>

               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Compliance Guardrails</h4>
                  <div className="p-8 bg-slate-900 rounded-[32px] border border-slate-800 space-y-8 shadow-2xl relative overflow-hidden">
                     <div className="absolute bottom-0 right-0 p-4 opacity-10">
                        <AlertCircle className="h-24 w-24 text-white" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex justify-between mb-2.5 px-0.5 items-end">
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Min. Weekly Utilization</p>
                           <span className="text-lg font-black text-white">40h</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                           <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full w-[85%] shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                        </div>
                     </div>
                     <div className="relative z-10">
                        <div className="flex justify-between mb-2.5 px-0.5 items-end">
                           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Max. Daily Variance</p>
                           <span className="text-lg font-black text-white">04h</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                           <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full w-[45%]" />
                        </div>
                     </div>

                     <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          Breaching these thresholds will trigger an immediate compliance alert to the Project Manager and HR.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Policies;
