import React, { useState } from 'react';
import { ShieldAlert, Users, Info, Flame, Search, CheckCircle, Award, Check } from 'lucide-react';

const D_STEPS = [
  { id: 'D1', label: 'D1: Form Team', icon: Users, desc: 'Establish a cross-functional team with a leader and sponsor.' },
  { id: 'D2', label: 'D2: Describe Problem', icon: Info, desc: 'Define who, what, where, when, why, how, and how many.' },
  { id: 'D3', label: 'D3: Containment Plan', icon: Flame, desc: 'Implement interim containment actions to isolate the customer.' },
  { id: 'D4', label: 'D4: Root Cause (5 Whys)', icon: Search, desc: 'Identify root causes using 5 Whys / Fishbone analysis.' },
  { id: 'D5', label: 'D5: Verify PCA', icon: ShieldAlert, desc: 'Define and test permanent corrective actions.' },
  { id: 'D6', label: 'D6: Implement PCA', icon: CheckCircle, desc: 'Apply corrective actions and validate their effectiveness.' },
  { id: 'D7', label: 'D7: Prevent Recurrence', icon: ShieldAlert, desc: 'Modify management systems, operating practices, and procedures.' },
  { id: 'D8', label: 'D8: Recognize Team', icon: Award, desc: 'Congratulate the team and document lessons learned.' }
];

const EightDReportPanel = ({ initialData = {}, onSave = () => {}, readOnly = false }) => {
  const [activeStep, setActiveStep] = useState('D1');
  const [formData, setFormData] = useState({
    D1: initialData?.D1 || '',
    D2: initialData?.D2 || '',
    D3: initialData?.D3 || '',
    D4: initialData?.D4 || '',
    D5: initialData?.D5 || '',
    D6: initialData?.D6 || '',
    D7: initialData?.D7 || '',
    D8: initialData?.D8 || '',
    ...initialData
  });
  const [saving, setSaving] = useState(false);

  const handleTextChange = (stepId, text) => {
    setFormData(prev => ({
      ...prev,
      [stepId]: text
    }));
  };

  const handleTriggerSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const getStepStatus = (stepId) => {
    return formData[stepId]?.trim().length > 3;
  };

  const completedCount = D_STEPS.filter(step => getStepStatus(step.id)).length;
  const pctComplete = Math.round((completedCount / D_STEPS.length) * 100);

  const ActiveIcon = D_STEPS.find(s => s.id === activeStep)?.icon || Info;

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col md:flex-row text-xs h-[480px]">
      {/* Sidebar: Navigation List */}
      <div className="w-full md:w-60 border-r border-[var(--border-subtle)] bg-[var(--bg)]/60 p-3 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <div className="mb-2 px-2">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">8D Problem Solving</div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">Discipline Matrix</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-[var(--border-subtle)]/40 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${pctComplete}%` }} />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">{pctComplete}%</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[300px] pr-1">
            {D_STEPS.map(step => {
              const Icon = step.icon;
              const isSelected = activeStep === step.id;
              const isDone = getStepStatus(step.id);
              
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded text-left transition-all border-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border-l-2 border-blue-500 text-blue-400 font-semibold'
                      : 'hover:bg-[var(--table-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-[var(--text-muted)]'}`} />
                    <span className="truncate">{step.label}</span>
                  </div>
                  {isDone && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={handleTriggerSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded cursor-pointer transition-all border-0 flex items-center justify-center gap-1.5 active:scale-95 shadow-lg"
          >
            {saving ? 'Saving 8D...' : 'Save 8D Report'}
          </button>
        )}
      </div>

      {/* Detail Area */}
      <div className="flex-1 p-4 bg-[var(--bg)]/40 flex flex-col justify-between min-w-0">
        <div className="flex flex-col gap-3 h-full">
          <div className="border-b border-[var(--border-subtle)] pb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <ActiveIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">{D_STEPS.find(s => s.id === activeStep)?.label}</h3>
              <p className="m-0 text-[11px] text-[var(--text-muted)] mt-0.5">{D_STEPS.find(s => s.id === activeStep)?.desc}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              value={formData[activeStep]}
              onChange={(e) => handleTextChange(activeStep, e.target.value)}
              readOnly={readOnly}
              placeholder={`Enter details for ${D_STEPS.find(s => s.id === activeStep)?.label}... (e.g. details, action items, dates, owners)`}
              className="w-full flex-1 bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg p-3 outline-none text-xs font-medium focus:border-blue-500/40 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EightDReportPanel;
