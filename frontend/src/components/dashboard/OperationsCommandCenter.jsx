import React, { useState, useMemo } from 'react';
import { AlertCircle, Clock, CheckSquare, FileText, AlertTriangle, UserCheck, ShieldAlert, CornerDownRight, Check, X, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

const OperationsCommandCenter = ({
  escalations = [],
  delays = [],
  revisions = [],
  commodityAlerts = [],
  momActions = [],
  onRefresh = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('escalations');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  // ── Analytics: derive from all available alert arrays ──────────────────
  const allAlerts = useMemo(() => [
    ...escalations.map(i => ({ ...i, _cat: 'escalations' })),
    ...delays.map(i => ({ ...i, _cat: 'delays' })),
    ...momActions.map(i => ({ ...i, _cat: 'mom' })),
  ], [escalations, delays, momActions]);

  const priorityDonutOption = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    allAlerts.forEach(i => { const p = i.priority || 'Low'; counts[p] = (counts[p] || 0) + 1; });
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' } },
      legend: { show: false },
      series: [{
        type: 'pie', radius: ['50%', '76%'], center: ['50%', '50%'],
        avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
        emphasis: { label: { show: false } },
        data: [
          { value: counts.High, name: 'High', itemStyle: { color: '#ef4444' } },
          { value: counts.Medium, name: 'Medium', itemStyle: { color: '#f59e0b' } },
          { value: counts.Low, name: 'Low', itemStyle: { color: '#6366f1' } },
        ].filter(d => d.value > 0)
      }]
    };
  }, [allAlerts]);

  const deptBarOption = useMemo(() => {
    const deptCounts = {};
    allAlerts.forEach(i => { const d = i.department || 'General'; deptCounts[d] = (deptCounts[d] || 0) + 1; });
    const sorted = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' } },
      grid: { left: 8, right: 12, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' }, splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: sorted.map(([k]) => k), axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif', width: 70, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 12, itemStyle: { color: '#6366f1', borderRadius: [0, 3, 3, 0] }, data: sorted.map(([, v]) => v) }]
    };
  }, [allAlerts]);

  const getList = () => {
    switch (activeTab) {
      case 'escalations': return escalations;
      case 'delays': return delays;
      case 'revisions': return revisions;
      case 'commodity': return commodityAlerts;
      case 'mom': return momActions;
      default: return [];
    }
  };

  const handleResolveEscalation = async (issueId, closeIssue = false) => {
    setActionLoading(true);
    try {
      if (closeIssue) {
        await API.put(`/issues/${issueId}`, { status: 'Closed', action_taken: resolutionNote });
        toast.success('Issue closed successfully');
      } else {
        await API.put(`/issues/${issueId}`, { action_taken: resolutionNote });
        toast.success('Resolution note added');
      }
      setResolutionNote('');
      setSelectedItem(null);
      onRefresh();
    } catch (e) {
      toast.error('Failed to resolve escalation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRevision = async (revisionId, status) => {
    setActionLoading(true);
    try {
      await API.post(`/budget/revisions/${revisionId}/approve`, {
        status: status,
        comments: resolutionNote
      });
      toast.success(`Budget revision ${status.toLowerCase()}ed`);
      setResolutionNote('');
      setSelectedItem(null);
      onRefresh();
    } catch (e) {
      toast.error('Failed to update revision status');
    } finally {
      setActionLoading(false);
    }
  };

  const items = getList();

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg overflow-hidden flex flex-col mb-6 min-h-[360px] shadow-sm">
      
      {/* Header Tabs */}
      <div className="bg-[var(--bg)] border-b border-[var(--border-subtle)] flex flex-wrap text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px] select-none shrink-0">
        <button
          onClick={() => { setActiveTab('escalations'); setSelectedItem(null); }}
          className={`flex items-center gap-2 px-4 py-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-t-0 border-l-0 border-b-0 outline-none ${activeTab === 'escalations' ? 'bg-[var(--surface)] text-rose-500 border-b-2 border-b-rose-500' : ''}`}
        >
          <ShieldAlert size={14} />
          <span>Escalations ({escalations.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('delays'); setSelectedItem(null); }}
          className={`flex items-center gap-2 px-4 py-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-t-0 border-l-0 border-b-0 outline-none ${activeTab === 'delays' ? 'bg-[var(--surface)] text-amber-500 border-b-2 border-b-amber-500' : ''}`}
        >
          <Clock size={14} />
          <span>Delays ({delays.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('revisions'); setSelectedItem(null); }}
          className={`flex items-center gap-2 px-4 py-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-t-0 border-l-0 border-b-0 outline-none ${activeTab === 'revisions' ? 'bg-[var(--surface)] text-blue-500 border-b-2 border-b-blue-500' : ''}`}
        >
          <FileText size={14} />
          <span>Budget Revisions ({revisions.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('commodity'); setSelectedItem(null); }}
          className={`flex items-center gap-2 px-4 py-3 border-r border-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-t-0 border-l-0 border-b-0 outline-none ${activeTab === 'commodity' ? 'bg-[var(--surface)] text-orange-500 border-b-2 border-b-orange-500' : ''}`}
        >
          <AlertTriangle size={14} />
          <span>Commodity Alerts ({commodityAlerts.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('mom'); setSelectedItem(null); }}
          className={`flex items-center gap-2 px-4 py-3 hover:text-[var(--text-primary)] transition-colors cursor-pointer border-t-0 border-l-0 border-r-0 border-b-0 outline-none ${activeTab === 'mom' ? 'bg-[var(--surface)] text-emerald-500 border-b-2 border-b-emerald-500' : ''}`}
        >
          <CheckSquare size={14} />
          <span>MOM Due ({momActions.length})</span>
        </button>
      </div>

      {/* Workspace Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0 bg-[var(--surface)]">
        
        {/* Left Side: Alerts List (Monitor Area) */}
        <div className="border-r border-[var(--border-subtle)] overflow-y-auto max-h-[300px] p-2 flex flex-col gap-1.5 bg-[var(--surface)]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] text-xs italic select-none">
              <Check size={20} className="text-emerald-500 mb-1" />
              <span>No alerts in this category</span>
            </div>
          ) : (
            items.map((item, idx) => {
              const key = item.id || `alert-${idx}`;
              const isSelected = selectedItem && (selectedItem.id === item.id || selectedItem.name === item.name);
              
              let title = item.title || item.name || item.message || 'Alert';
              let subText = item.owner || item.project_name || item.category || '';
              let badgeText = item.priority || item.status || item.severity || '';
              let badgeColor = 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--text-secondary)]';

              if (activeTab === 'escalations') {
                badgeColor = 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400';
              } else if (activeTab === 'delays') {
                badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400';
              } else if (activeTab === 'revisions') {
                badgeColor = 'bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400';
              } else if (activeTab === 'commodity') {
                badgeColor = 'bg-orange-500/10 border-orange-500/20 text-orange-500 dark:text-orange-400';
              } else if (activeTab === 'mom') {
                badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400';
              }

              return (
                <div
                  key={key}
                  onClick={() => setSelectedItem(item)}
                  className={`p-2.5 rounded border transition-all duration-200 cursor-pointer flex flex-col gap-1 hover:bg-[var(--table-hover)] ${isSelected ? 'bg-[var(--table-hover)] border-blue-500/40 shadow-sm' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-semibold text-[var(--text-primary)] text-[11px] leading-tight truncate">{title}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-medium">
                    <span>{subText}</span>
                    {item.due_date && <span>Due: {item.due_date}</span>}
                    {item.waiting_until && <span>Wait: {item.waiting_until}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Analytics when idle, Action Inspector when selected */}
        <div className="p-3 bg-[var(--bg)]/10 flex flex-col min-h-0 gap-2">
          {!selectedItem ? (
            <>
              <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-bold select-none flex items-center gap-1.5">
                <BarChart3 size={11} className="text-[var(--text-muted)]" /> Active Alerts Analytics
              </h4>
              {allAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-muted)] text-xs italic py-4 select-none">
                  <Check size={18} className="text-emerald-500 mb-1" />
                  <span>No active operational alerts</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 flex-1">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{l:'Escalations',v:escalations.length,c:'text-rose-500'},{l:'Overdue',v:delays.length,c:'text-amber-500'},{l:'MOM Due',v:momActions.length,c:'text-emerald-500'}].map(kpi=>(
                      <div key={kpi.l} className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-1.5 flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{kpi.l}</span>
                        <span className={`text-base font-black leading-none ${kpi.c}`}>{kpi.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-1.5 flex flex-col">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Priority Distribution</span>
                    <div className="relative" style={{ height: 90 }}>
                      <ReactECharts option={priorityDonutOption} style={{ height: 90, width: '100%' }} opts={{ renderer: 'svg' }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base font-black text-[var(--text-primary)]">{allAlerts.length}</span>
                        <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase">Total</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-1.5 flex flex-col flex-1">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Issues by Department</span>
                    <ReactECharts option={deptBarOption} style={{ height: 100, width: '100%' }} opts={{ renderer: 'svg' }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col gap-3 min-h-0 text-[11px] justify-between">
              
              {/* Investigate Section */}
              <div className="flex flex-col gap-1.5">
                <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wide text-[9px] font-bold select-none">Investigate Details</h4>
                <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-2.5 rounded flex flex-col gap-1.5 shadow-sm">
                  <div className="font-bold text-[var(--text-primary)] text-xs">
                    {selectedItem.title || selectedItem.name || selectedItem.message}
                  </div>
                  {selectedItem.description && (
                    <p className="text-[var(--text-secondary)] m-0 leading-normal">{selectedItem.description}</p>
                  )}
                  {selectedItem.reasons && (
                    <p className="text-[var(--text-secondary)] m-0 leading-normal italic">Reason: {selectedItem.reasons}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 border-t border-[var(--border-subtle)] pt-1.5 text-[var(--text-muted)]">
                    {selectedItem.owner && <div>Owner: <span className="text-[var(--text-primary)] font-semibold">{selectedItem.owner}</span></div>}
                    {selectedItem.department && <div>Dept: <span className="text-[var(--text-primary)] font-semibold">{selectedItem.department}</span></div>}
                    {selectedItem.previous_budget !== undefined && <div>Prev Budget: <span className="text-[var(--text-primary)] font-semibold">${selectedItem.previous_budget.toLocaleString()}</span></div>}
                    {selectedItem.revised_budget !== undefined && <div>Revised Budget: <span className="text-[var(--text-primary)] font-semibold">${selectedItem.revised_budget.toLocaleString()}</span></div>}
                    {selectedItem.severity_score !== undefined && <div>Severity: <span className="text-[var(--text-primary)] font-semibold">{selectedItem.severity_score}/100</span></div>}
                  </div>
                </div>
              </div>

              {/* Resolve Section */}
              <div className="flex flex-col gap-1.5 justify-end mt-auto">
                <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wide text-[9px] font-bold select-none">Resolve Actions</h4>
                
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Enter resolution notes, action taken, or revision remarks..."
                  rows={2}
                  className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs focus:border-blue-500/40 transition-colors"
                />

                <div className="flex justify-end gap-2 mt-1">
                  {activeTab === 'escalations' && (
                    <>
                      <button
                        onClick={() => handleResolveEscalation(selectedItem.id, false)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] font-bold rounded cursor-pointer transition-all active:scale-95"
                      >
                        Add Remarks
                      </button>
                      <button
                        onClick={() => handleResolveEscalation(selectedItem.id, true)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      >
                        <X size={12} /> Close Issue
                      </button>
                    </>
                  )}

                  {activeTab === 'revisions' && (
                    <>
                      <button
                        onClick={() => handleApproveRevision(selectedItem.id, 'Declined')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      >
                        <X size={12} /> Decline
                      </button>
                      <button
                        onClick={() => handleApproveRevision(selectedItem.id, 'Approved')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      >
                        <Check size={12} /> Approve
                      </button>
                    </>
                  )}

                  {activeTab === 'mom' && (
                    <button
                      onClick={() => handleResolveEscalation(selectedItem.id, true)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                    >
                      <Check size={12} /> Mark Completed
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default OperationsCommandCenter;
