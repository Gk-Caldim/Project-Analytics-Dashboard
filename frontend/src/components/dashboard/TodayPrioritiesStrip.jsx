import React, { useMemo } from 'react';
import { ShieldAlert, Clock, FileText, AlertTriangle, CheckCircle2, Activity, TrendingUp, Zap } from 'lucide-react';

const TodayPrioritiesStrip = ({
  escalationsCount = 0,
  criticalPathDelaysCount = 0,
  revisionsCount = 0,
  commodityAlertsCount = 0,
  onAlertClick = () => {}
}) => {
  const totalAlerts = escalationsCount + (criticalPathDelaysCount > 0 ? 1 : 0) + revisionsCount + commodityAlertsCount;
  const isAllClear = totalAlerts === 0;

  const metrics = useMemo(() => [
    {
      id: 'escalations',
      label: 'Escalations',
      sublabel: 'High priority · Unresolved',
      count: escalationsCount,
      icon: ShieldAlert,
      severity: escalationsCount > 5 ? 'critical' : escalationsCount > 0 ? 'high' : 'clear',
      accentColor: '#ef4444',
      bgClass: 'border-rose-500/25 hover:border-rose-500/50',
      countClass: 'text-rose-500',
      labelClass: 'text-rose-400/70',
      dotClass: 'bg-rose-500',
      pulse: escalationsCount > 0,
    },
    {
      id: 'delays',
      label: 'Path Delays',
      sublabel: 'Critical milestones · Overdue',
      count: criticalPathDelaysCount,
      icon: Clock,
      severity: criticalPathDelaysCount > 10 ? 'critical' : criticalPathDelaysCount > 0 ? 'high' : 'clear',
      accentColor: '#f59e0b',
      bgClass: 'border-amber-500/25 hover:border-amber-500/50',
      countClass: 'text-amber-400',
      labelClass: 'text-amber-400/70',
      dotClass: 'bg-amber-400',
      pulse: criticalPathDelaysCount > 0,
    },
    {
      id: 'revisions',
      label: 'Budget Revisions',
      sublabel: 'Pending finance approval',
      count: revisionsCount,
      icon: FileText,
      severity: revisionsCount > 3 ? 'high' : revisionsCount > 0 ? 'medium' : 'clear',
      accentColor: '#6366f1',
      bgClass: 'border-indigo-500/25 hover:border-indigo-500/50',
      countClass: 'text-indigo-400',
      labelClass: 'text-indigo-400/70',
      dotClass: 'bg-indigo-400',
      pulse: revisionsCount > 0,
    },
    {
      id: 'commodity',
      label: 'Commodity Spikes',
      sublabel: 'Material volatility alerts',
      count: commodityAlertsCount,
      icon: TrendingUp,
      severity: commodityAlertsCount > 2 ? 'high' : commodityAlertsCount > 0 ? 'medium' : 'clear',
      accentColor: '#f97316',
      bgClass: 'border-orange-500/25 hover:border-orange-500/50',
      countClass: 'text-orange-400',
      labelClass: 'text-orange-400/70',
      dotClass: 'bg-orange-400',
      pulse: commodityAlertsCount > 0,
    },
  ], [escalationsCount, criticalPathDelaysCount, revisionsCount, commodityAlertsCount]);

  const activeAlerts = metrics.filter(m => m.count > 0);

  if (isAllClear) {
    return (
      <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Operations Status</span>
          </div>
          <span className="w-px h-3 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-emerald-500">All Clear — No critical bottlenecks detected</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <Activity size={11} />
          <span>Live</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg shadow-sm overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/40">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Operational Alerts</span>
          <span className="ml-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            {activeAlerts.length} Active
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <Activity size={10} />
          <span>Live · Requires Action</span>
        </div>
      </div>

      {/* Alert metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--border-subtle)]">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isActive = m.count > 0;
          return (
            <button
              key={m.id}
              onClick={() => isActive && onAlertClick(m.id)}
              disabled={!isActive}
              className={`
                relative flex items-center gap-3 px-4 py-3 text-left transition-all duration-200
                ${isActive
                  ? `cursor-pointer hover:bg-[var(--table-hover)] border-b-2 ${m.bgClass}`
                  : 'cursor-default opacity-40 border-b-2 border-transparent'
                }
              `}
            >
              {/* Severity indicator bar on left edge */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r" style={{ backgroundColor: m.accentColor }} />
              )}

              {/* Icon */}
              <div className={`shrink-0 p-1.5 rounded ${isActive ? 'bg-[var(--bg)]' : ''}`}>
                <Icon size={14} style={{ color: isActive ? m.accentColor : 'var(--text-muted)' }} />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-0 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black leading-none tabular-nums ${isActive ? m.countClass : 'text-[var(--text-muted)]'}`}>
                    {m.count}
                  </span>
                  {isActive && m.pulse && (
                    <span className={`size-1.5 rounded-full animate-pulse shrink-0 ${m.dotClass}`} />
                  )}
                </div>
                <span className={`text-[10px] font-bold leading-tight truncate ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                  {m.label}
                </span>
                <span className={`text-[9px] leading-tight truncate ${isActive ? m.labelClass : 'text-[var(--text-muted)]'}`}>
                  {m.sublabel}
                </span>
              </div>

              {/* Click hint */}
              {isActive && (
                <div className="ml-auto shrink-0">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-60">→</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TodayPrioritiesStrip;
