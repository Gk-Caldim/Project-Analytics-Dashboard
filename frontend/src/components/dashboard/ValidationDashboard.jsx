import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle2, Clock, XCircle, ChevronRight, RefreshCw, Award, FileCheck, AlertTriangle } from 'lucide-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';
import ValidationChecklist from './ValidationChecklist';
import PPAPTracker from './PPAPTracker';
import DVResultsPanel from './DVResultsPanel';

const TABS = [
  { id: 'checklist', label: 'DV/PV Checklist', icon: CheckCircle2 },
  { id: 'ppap',      label: 'PPAP Tracker',    icon: Award },
  { id: 'dv',        label: 'Test Results',    icon: FileCheck },
];

const ValidationDashboard = ({ projectId, projectName }) => {
  const [activeTab, setActiveTab] = useState('checklist');
  const [checklists, setChecklists] = useState([]);
  const [ppapStages, setPpapStages] = useState([]);
  const [dvResults, setDvResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [clRes, ppapRes, dvRes] = await Promise.all([
        API.get(`/quality/validation-checklist/${projectId}`),
        API.get(`/quality/ppap/${projectId}`),
        API.get(`/quality/dv-results/${projectId}`),
      ]);
      setChecklists(clRes.data || []);
      setPpapStages(ppapRes.data?.levels || []);
      setDvResults(dvRes.data || []);
    } catch (e) {
      // Silent — show empty state
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Summary stats
  const totalItems = checklists.reduce((s, c) => s + (c.checklist_items?.length || 0), 0);
  const doneItems = checklists.reduce((s, c) =>
    s + (c.checklist_items?.filter(i => i.complete)?.length || 0), 0);
  const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const ppapApproved = ppapStages.filter(s => s.status === 'approved').length;
  const dvPassed = dvResults.filter(r => r.pass_fail).length;
  const dvFailed = dvResults.filter(r => !r.pass_fail).length;

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/50 flex justify-between items-center">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={13} className="text-purple-400" /> Validation Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
            {projectName}
          </span>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
        {[
          {
            label: 'Checklist', value: `${overallPct}%`,
            sub: `${doneItems}/${totalItems} items`, color: overallPct >= 80 ? 'text-emerald-400' : overallPct >= 50 ? 'text-amber-400' : 'text-rose-400'
          },
          {
            label: 'PPAP Levels', value: `${ppapApproved}/4`,
            sub: 'approved', color: ppapApproved === 4 ? 'text-emerald-400' : 'text-indigo-400'
          },
          {
            label: 'Test Results', value: `${dvPassed} pass`,
            sub: dvFailed > 0 ? `${dvFailed} fail` : 'no failures', color: dvFailed > 0 ? 'text-rose-400' : 'text-emerald-400'
          },
        ].map(stat => (
          <div key={stat.label} className="p-2.5 flex flex-col items-center">
            <span className={`text-base font-black leading-none ${stat.color}`}>{stat.value}</span>
            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-0.5">{stat.label}</span>
            <span className="text-[9px] text-[var(--text-muted)]">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg)]/30">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-0 cursor-pointer
                ${active
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent'
                }`}
            >
              <Icon size={10} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'checklist' && (
          <ValidationChecklist
            projectId={projectId}
            checklists={checklists}
            onRefresh={fetchAll}
          />
        )}
        {activeTab === 'ppap' && (
          <PPAPTracker
            projectId={projectId}
            stages={ppapStages}
            onRefresh={fetchAll}
          />
        )}
        {activeTab === 'dv' && (
          <DVResultsPanel
            projectId={projectId}
            results={dvResults}
            onRefresh={fetchAll}
          />
        )}
      </div>
    </div>
  );
};

export default ValidationDashboard;
