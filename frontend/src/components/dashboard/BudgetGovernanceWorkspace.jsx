import React, { useState, useMemo } from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, ArrowRight, CornerDownRight, Check, X, FileUp, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

// Format currency: round to integer, use compact for large numbers
const fmtCurrency = (val) => {
  const n = Math.round(val || 0);
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `$${n.toLocaleString()}`;
  }
  return `$${n}`;
};

// Compact delta label for charts (e.g. +$14k, -$2k)
const fmtDeltaCompact = (val) => {
  const n = Math.round(val || 0);
  const sign = n >= 0 ? '+' : '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs}`;
};

const BudgetGovernanceWorkspace = ({
  revisions = [], // GET /budget/revisions
  onRefresh = () => {}
}) => {
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'analytics'

  const pendingQueue = revisions.filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance');
  const decisionHistory = revisions.filter(r => r.status !== 'Pending Head' && r.status !== 'Pending Finance');

  const getPriorityScore = (rev) => {
    let score = 0;
    if (rev.status === 'Pending Head') score += 50;
    if (rev.status === 'Pending Finance') score += 30;
    const delta = Math.abs((rev.revised_budget || 0) - (rev.previous_budget || 0));
    score += Math.min(20, Math.floor(delta / 100000));
    return score;
  };

  const prioritizedQueue = [...pendingQueue].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  const handleApprove = async (statusVal) => {
    if (!selectedRevision) return;
    setActionLoading(true);
    try {
      await API.post(`/budget/revisions/${selectedRevision.id}/approve`, { status: statusVal, comments });
      toast.success(`Budget revision ${statusVal.toLowerCase()}ed`);
      setSelectedRevision(null);
      setComments('');
      onRefresh();
    } catch (e) {
      toast.error('Failed to submit approval choice');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400';
      case 'Declined': return 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400';
      default: return 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]';
    }
  };

  // ── Analytics Chart Options ─────────────────────────────────────────────
  const statusDonutOption = useMemo(() => {
    const counts = {};
    revisions.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const colorMap = {
      'Approved': '#10b981',
      'Declined': '#ef4444',
      'Pending Head': '#f59e0b',
      'Pending Finance': '#6366f1',
      'Cancelled': '#64748b',
      'In Waiting Period': '#94a3b8',
    };
    const total = revisions.length;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['48%', '74%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'inside',
          formatter: (params) => params.percent > 12 ? `${params.percent.toFixed(0)}%` : '',
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        },
        labelLine: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' } },
        data: Object.entries(counts).map(([k, v]) => ({
          name: k,
          value: v,
          itemStyle: { color: colorMap[k] || '#64748b' }
        }))
      }]
    };
  }, [revisions]);

  // Group revisions by project_name and sum deltas to avoid duplicate entries
  const revisionImpactOption = useMemo(() => {
    // Group by project_name, summing deltas
    const grouped = {};
    revisions.forEach(r => {
      const name = r.project_name?.split(' ').slice(0, 2).join(' ') || r.project_name || 'Unknown';
      const delta = (r.revised_budget || 0) - (r.previous_budget || 0);
      grouped[name] = (grouped[name] || 0) + delta;
    });

    const entries = Object.entries(grouped)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 7);

    const names = entries.map(([name]) => name);
    const deltas = entries.map(([, delta]) => Math.round(delta));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>Budget Δ: <b>${fmtDeltaCompact(p.value)}</b>`;
        }
      },
      grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'USD Δ',
        nameLocation: 'end',
        nameTextStyle: { color: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          fontFamily: 'Inter, sans-serif',
          formatter: v => fmtDeltaCompact(v)
        },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif', width: 80, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          fontSize: 9,
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
          formatter: (p) => fmtDeltaCompact(p.value)
        },
        data: deltas.map(d => ({
          value: d,
          itemStyle: {
            color: d >= 0 ? '#ef4444' : '#10b981',
            borderRadius: d >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]
          }
        }))
      }]
    };
  }, [revisions]);

  const timelineOption = useMemo(() => {
    const monthly = {};
    revisions.forEach(r => {
      if (!r.created_at) return;
      const month = r.created_at.substring(0, 7);
      if (!monthly[month]) monthly[month] = { Approved: 0, Declined: 0, Pending: 0 };
      if (r.status === 'Approved') monthly[month].Approved++;
      else if (r.status === 'Declined') monthly[month].Declined++;
      else monthly[month].Pending++;
    });
    const months = Object.keys(monthly).sort().slice(-6);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: {
        data: ['Approved', 'Declined', 'Pending'],
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      grid: { left: 8, right: 8, top: 8, bottom: 32, containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        { name: 'Approved', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#10b981' }, data: months.map(m => monthly[m]?.Approved || 0) },
        { name: 'Declined', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#ef4444' }, data: months.map(m => monthly[m]?.Declined || 0) },
        { name: 'Pending', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] }, data: months.map(m => monthly[m]?.Pending || 0) },
      ]
    };
  }, [revisions]);

  const renderAnalytics = () => {
    if (revisions.length === 0) return <div className="text-center text-[var(--text-muted)] py-6 italic text-xs">No revision data available</div>;

    const totalDelta = revisions.reduce((a, r) => a + ((r.revised_budget || 0) - (r.previous_budget || 0)), 0);
    const approvedCount = revisions.filter(r => r.status === 'Approved').length;
    const pendingCount = pendingQueue.length;

    return (
      <div className="p-3 flex flex-col gap-3">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total Revisions', value: revisions.length, color: 'text-[var(--text-primary)]' },
            { label: 'Pending Approval', value: pendingCount, color: 'text-amber-500' },
            { label: 'Approved', value: approvedCount, color: 'text-emerald-500' },
            {
              label: 'Net Budget Impact',
              value: fmtDeltaCompact(totalDelta),
              color: totalDelta >= 0 ? 'text-rose-500' : 'text-emerald-500'
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">{kpi.label}</span>
              <span className={`text-xl font-black leading-none tabular-nums ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Approval Status</span>
            <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 130 }}>
              <ReactECharts key="status-donut-analytics" option={statusDonutOption} notMerge={true} style={{ height: 130, width: '100%' }} opts={{ renderer: 'svg' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[var(--text-primary)]">{revisions.length}</span>
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Total</span>
              </div>
            </div>
          </div>
          <div className="col-span-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Budget Impact by Project (USD Δ)</span>
            <ReactECharts key="revision-impact-analytics" option={revisionImpactOption} notMerge={true} style={{ height: 155, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
          <div className="col-span-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Revision Activity (Monthly)</span>
            <ReactECharts key="timeline-analytics" option={timelineOption} notMerge={true} style={{ height: 155, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
        </div>

        {/* Compact pending queue */}
        {pendingQueue.length > 0 && (
          <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-[var(--elevated-card)] border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider font-bold text-amber-500 flex items-center gap-1.5">
              <AlertTriangle size={10} /> Pending Approvals ({pendingQueue.length})
            </div>
            {prioritizedQueue.slice(0, 5).map(rev => {
              const delta = (rev.revised_budget || 0) - (rev.previous_budget || 0);
              const isLargeDelta = Math.abs(delta) > 50000;
              return (
                <div key={rev.id} className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-hover)] text-xs transition-colors">
                  <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{rev.project_name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-[var(--text-secondary)]">{rev.status.replace('Pending ', '')}</span>
                    <span className={`font-bold text-[10px] tabular-nums ${delta >= 0 ? (isLargeDelta ? 'text-rose-500' : 'text-amber-500') : 'text-emerald-500'}`}>
                      {fmtDeltaCompact(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex justify-between items-center shrink-0">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Budget Governance Workspace</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            {pendingQueue.length} Pending
          </span>
          <div className="flex border border-[var(--border-subtle)] rounded overflow-hidden">
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer border-0 outline-none transition-colors ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
            >
              <BarChart3 size={10} /> Analytics
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer border-0 outline-none transition-colors ${viewMode === 'split' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
            >
              <FileText size={10} /> Approvals
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'analytics' ? renderAnalytics() : (
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] bg-[var(--surface)]">
          {/* Col 1: Pending Approvals Queue */}
          <div className="lg:col-span-4 p-3 overflow-y-auto max-h-[280px] flex flex-col gap-2">
            <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 mb-1 select-none">
              <AlertTriangle size={12} className="text-amber-500" /> Prioritized Approvals Queue
            </h4>
            {prioritizedQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-[var(--text-muted)] text-xs italic select-none">
                <CheckCircle size={16} className="text-emerald-500 mb-1" />
                <span>Approval queue is clear</span>
              </div>
            ) : (
              prioritizedQueue.map(rev => {
                const isSelected = selectedRevision?.id === rev.id;
                const delta = (rev.revised_budget || 0) - (rev.previous_budget || 0);
                const isLargeDelta = Math.abs(delta) > 50000;
                return (
                  <div
                    key={rev.id}
                    onClick={() => setSelectedRevision(rev)}
                    className={`p-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 hover:bg-[var(--table-hover)] ${isSelected ? 'bg-[var(--table-hover)] border-blue-500/40 shadow-sm' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-[var(--text-primary)] text-[11px] truncate leading-tight">{rev.project_name}</span>
                      <span className="text-[9px] font-bold bg-amber-500/10 border-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded border shrink-0">
                        {rev.status.replace('Pending ', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-primary)] font-bold bg-[var(--bg)] p-1.5 rounded border border-[var(--border-subtle)] justify-center tabular-nums">
                      <span>{fmtCurrency(rev.previous_budget)}</span>
                      <ArrowRight size={10} className="text-[var(--text-muted)]" />
                      <span>{fmtCurrency(rev.revised_budget)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-medium">
                      <span>PM: {rev.pm_name || 'Unassigned'}</span>
                      <span className={`font-bold tabular-nums ${delta >= 0 ? (isLargeDelta ? 'text-rose-500' : 'text-amber-500') : 'text-emerald-500'}`}>
                        {fmtDeltaCompact(delta)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Col 2: Action Inspector */}
          <div className="lg:col-span-4 p-4 bg-[var(--bg)]/10 flex flex-col gap-3 min-h-0">
            <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold select-none">Approval Resolution</h4>
            {!selectedRevision ? (
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Status Distribution</span>
                <ReactECharts key="status-donut-split" option={statusDonutOption} notMerge={true} style={{ height: 160, width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 text-[11px] justify-between">
                <div className="flex flex-col gap-2">
                  <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-3 rounded-lg flex flex-col gap-1.5 shadow-sm">
                    <div className="font-bold text-[var(--text-primary)] text-xs">{selectedRevision.project_name}</div>
                    <div className="flex justify-between text-[10px] border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="text-[var(--text-secondary)]">Previous Budget</span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">{fmtCurrency(selectedRevision.previous_budget)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] border-b border-[var(--border-subtle)] pb-1.5">
                      <span className="text-[var(--text-secondary)]">Revised Budget</span>
                      <span className={`font-bold tabular-nums ${(selectedRevision.revised_budget || 0) > (selectedRevision.previous_budget || 0) ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {fmtCurrency(selectedRevision.revised_budget)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[var(--text-secondary)]">Net Change</span>
                      <span className={`font-bold tabular-nums ${(selectedRevision.revised_budget || 0) >= (selectedRevision.previous_budget || 0) ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {fmtDeltaCompact((selectedRevision.revised_budget || 0) - (selectedRevision.previous_budget || 0))}
                      </span>
                    </div>
                    <div className="text-[var(--text-secondary)] leading-normal mt-1 pt-1 border-t border-[var(--border-subtle)]">
                      <span className="font-bold text-[var(--text-primary)]">Justification: </span>
                      {selectedRevision.reasons || 'No remarks provided.'}
                    </div>
                    {selectedRevision.attachment_name && (
                      <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-semibold mt-1">
                        <FileUp size={12} /><span className="underline truncate">{selectedRevision.attachment_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter evaluation remarks..."
                    rows={2}
                    className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] outline-none text-xs focus:border-blue-500/40 transition-colors"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleApprove('Declined')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs disabled:opacity-50"
                    >
                      <X size={11} /> Decline
                    </button>
                    <button
                      onClick={() => handleApprove('Approved')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs disabled:opacity-50"
                    >
                      <Check size={11} /> Approve
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Budget Impact Chart */}
          <div className="lg:col-span-4 p-3 flex flex-col gap-2">
            <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 mb-1 select-none">
              <BarChart3 size={12} className="text-[var(--text-muted)]" /> Budget Impact (Δ by Project)
            </h4>
            {revisions.length > 0 ? (
              <ReactECharts key="revision-impact-split" option={revisionImpactOption} notMerge={true} style={{ height: 200, width: '100%' }} opts={{ renderer: 'svg' }} />
            ) : (
              <div className="text-center text-[var(--text-muted)] py-4 italic text-xs">No revision data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetGovernanceWorkspace;
