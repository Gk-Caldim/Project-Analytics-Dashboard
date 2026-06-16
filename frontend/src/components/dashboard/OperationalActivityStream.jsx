import React, { useState, useMemo } from 'react';
import { Database, Calendar, FileText, Activity, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, ArrowRight, GitCommit } from 'lucide-react';

const OperationalActivityStream = ({
  uploads = [],
  meetings = [],
  revisions = [],
  milestones = []
}) => {
  const [activeTab, setActiveTab] = useState('ingestions');

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) { return dateStr; }
  };

  const tabs = [
    { id: 'ingestions', label: 'Ingestions', shortLabel: 'Data', count: uploads.length, color: 'var(--blue)', icon: Database },
    { id: 'governance', label: 'Governance', shortLabel: 'Gov', count: meetings.length, color: 'var(--green)', icon: Calendar },
    { id: 'budget', label: 'Budget', shortLabel: 'Budget', count: revisions.length, color: 'var(--amber)', icon: FileText },
    { id: 'scheduling', label: 'Schedule', shortLabel: 'Schedule', count: milestones.filter(m => m.status === 'Delayed' || m.complete_percent > 0).length, color: 'var(--indigo)', icon: Activity },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeTab);

  const renderStream = () => {
    if (activeTab === 'ingestions') {
      const list = uploads.slice(0, 12);
      if (list.length === 0) return <EmptyState label="No recent tracker ingestions" />;
      return list.map((item, i) => (
        <TimelineEntry
          key={item.id || item.upload_id || i}
          dotColor="#6366f1"
          isLast={i === list.length - 1}
          time={getRelativeTime(item.uploaded_at)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Database size={10} className="text-indigo-400 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Dataset Ingested</span>
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                {(item.file_name || '').replace(/\.[^/.]+$/, '')}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--text-muted)]">
                <span>{item.project_name || 'Unknown project'}</span>
                <span>·</span>
                <span className="font-bold text-[var(--text-secondary)]">{(item.row_count || 0).toLocaleString()} rows</span>
                <span>·</span>
                <span>{item.uploaded_by || 'PMO'}</span>
              </div>
            </div>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-400 uppercase">Synced</span>
          </div>
        </TimelineEntry>
      ));
    }

    if (activeTab === 'governance') {
      const list = meetings.slice(0, 12);
      if (list.length === 0) return <EmptyState label="No recent governance syncs" />;
      return list.map((item, i) => (
        <TimelineEntry
          key={item.id || i}
          dotColor="#10b981"
          isLast={i === list.length - 1}
          time={getRelativeTime(item.created_at || item.date)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Calendar size={10} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">MOM Synced</span>
            </div>
            <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">{item.title}</div>
            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--text-muted)]">
              <span>{item.date}</span>
              {item.time && <><span>·</span><span>{item.time}</span></>}
              {item.action_item_count > 0 && (
                <><span>·</span>
                <span className="font-bold text-amber-400">{item.action_item_count} action items</span></>
              )}
            </div>
          </div>
        </TimelineEntry>
      ));
    }

    if (activeTab === 'budget') {
      const list = [...revisions].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 12);
      if (list.length === 0) return <EmptyState label="No recent budget decisions" />;
      return list.map((item, i) => {
        const delta = (item.revised_budget || 0) - (item.previous_budget || 0);
        const isApproved = item.status === 'Approved';
        const isDeclined = item.status === 'Declined';
        const isPending = !isApproved && !isDeclined;
        const dotColor = isApproved ? '#10b981' : isDeclined ? '#ef4444' : '#f59e0b';
        const statusBg = isApproved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isDeclined ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400';
        return (
          <TimelineEntry
            key={item.id || i}
            dotColor={dotColor}
            isLast={i === list.length - 1}
            time={getRelativeTime(item.updated_at || item.created_at)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileText size={10} style={{ color: dotColor }} className="shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: dotColor }}>Budget Revision</span>
                </div>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{item.project_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[var(--text-muted)]">
                  <span className="font-mono">${(item.previous_budget || 0).toLocaleString()}</span>
                  <ArrowRight size={8} />
                  <span className="font-mono">${(item.revised_budget || 0).toLocaleString()}</span>
                  <span>·</span>
                  <span className={`font-bold ${delta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {delta >= 0 ? <TrendingUp size={9} className="inline mr-0.5" /> : <TrendingDown size={9} className="inline mr-0.5" />}
                    {delta >= 0 ? '+' : ''}${Math.abs(delta).toLocaleString()}
                  </span>
                </div>
                {item.pm_name && (
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">PM: {item.pm_name}</div>
                )}
              </div>
              <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase ${statusBg}`}>{item.status}</span>
            </div>
          </TimelineEntry>
        );
      });
    }

    if (activeTab === 'scheduling') {
      const list = milestones.filter(m => m.status === 'Delayed' || m.complete_percent > 0).slice(0, 12);
      if (list.length === 0) return <EmptyState label="No scheduling updates to display" />;
      return list.map((item, i) => {
        const isDelayed = item.status === 'Delayed';
        const dotColor = isDelayed ? '#f59e0b' : '#6366f1';
        return (
          <TimelineEntry
            key={item.id || i}
            dotColor={dotColor}
            isLast={i === list.length - 1}
            time={item.end_date?.split('T')[0] || 'N/A'}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <GitCommit size={10} style={{ color: dotColor }} className="shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: dotColor }}>
                    {isDelayed ? 'Milestone Delayed' : 'Progress Update'}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{item.activity_name}</div>
                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[var(--text-muted)]">
                  {item.department && <span>{item.department}</span>}
                  {item.department && <span>·</span>}
                  <span>Progress: <span className="font-bold text-[var(--text-secondary)]">{item.complete_percent || 0}%</span></span>
                  {item.status && <><span>·</span><span className={isDelayed ? 'text-amber-400 font-bold' : ''}>{item.status}</span></>}
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="shrink-0 flex flex-col items-end gap-0.5 w-12">
                <span className="text-[9px] font-bold text-[var(--text-secondary)]">{item.complete_percent || 0}%</span>
                <div className="w-12 h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.complete_percent || 0}%`, backgroundColor: dotColor }} />
                </div>
              </div>
            </div>
          </TimelineEntry>
        );
      });
    }

    return null;
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col shadow-sm" style={{ height: 380 }}>

      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-[var(--text-muted)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Activity Stream</span>
        </div>
        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg)]/30 shrink-0 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-wider
                cursor-pointer whitespace-nowrap transition-all border-0 outline-none flex-1 justify-center
                ${isActive
                  ? 'text-[var(--text-primary)] bg-[var(--surface)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface)]/40'
                }
              `}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: tab.color }} />
              )}
              <Icon size={10} style={{ color: isActive ? tab.color : 'currentColor' }} />
              <span>{tab.shortLabel}</span>
              {tab.count > 0 && (
                <span className="text-[8px] font-black px-1 rounded" style={{ color: tab.color, backgroundColor: `${tab.color}18` }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stream content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="flex flex-col">
          {renderStream()}
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const TimelineEntry = ({ children, dotColor, isLast, time }) => (
  <div className="flex gap-2.5 relative pb-3 last:pb-0 group">
    {/* Timeline spine */}
    <div className="flex flex-col items-center shrink-0" style={{ width: 16 }}>
      <div
        className="size-2.5 rounded-full shrink-0 mt-0.5 ring-2 ring-[var(--surface)] transition-transform duration-150 group-hover:scale-125"
        style={{ backgroundColor: dotColor }}
      />
      {!isLast && <div className="w-px flex-1 mt-1" style={{ backgroundColor: 'var(--border-subtle)' }} />}
    </div>

    {/* Content + time */}
    <div className="flex-1 min-w-0 pb-0.5">
      <div className="text-[8px] font-bold text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">{time}</div>
      {children}
    </div>
  </div>
);

const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)] gap-2">
    <Activity size={20} className="opacity-30" />
    <span className="text-xs italic">{label}</span>
  </div>
);

export default OperationalActivityStream;
