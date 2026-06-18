import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Plus, CornerDownRight, ShieldAlert, BarChart2, Grid3x3, RefreshCw } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';
import DefectPareto from './DefectPareto';
import QualityHeatmap from './QualityHeatmap';

const QualityHealthCenter = ({
  projectMilestones = [],
  projectId = null,
  projectName = '',
  onRefresh = () => {}
}) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  // Sub-tabs for Quality Analytics
  const [activeSubTab, setActiveSubTab] = useState('validation');
  const [paretoData, setParetoData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [paretoLoading, setParetoLoading] = useState(false);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const fetchPareto = useCallback(async () => {
    if (!projectId) return;
    setParetoLoading(true);
    try {
      const res = await API.get(`/quality/defect-analysis/patterns?project_id=${projectId}`);
      setParetoData(res.data);
    } catch (e) {
      toast.error('Failed to load defect Pareto data');
    } finally {
      setParetoLoading(false);
    }
  }, [projectId]);

  const fetchHeatmap = useCallback(async () => {
    if (!projectId) return;
    setHeatmapLoading(true);
    try {
      const res = await API.get(`/quality/heatmap/${projectId}`);
      setHeatmapData(res.data);
    } catch (e) {
      toast.error('Failed to load quality heatmap data');
    } finally {
      setHeatmapLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeSubTab === 'pareto' && !paretoData) {
      fetchPareto();
    } else if (activeSubTab === 'heatmap' && !heatmapData) {
      fetchHeatmap();
    }
  }, [activeSubTab, projectId, fetchPareto, fetchHeatmap]);

  useEffect(() => {
    setParetoData(null);
    setHeatmapData(null);
    if (activeSubTab === 'pareto') {
      fetchPareto();
    } else if (activeSubTab === 'heatmap') {
      fetchHeatmap();
    }
  }, [projectId, fetchPareto, fetchHeatmap]);

  const qualityChecks = projectMilestones.filter(m =>
    String(m.department).toLowerCase().includes('quality') ||
    String(m.activity_name).toLowerCase().includes('quality') ||
    String(m.activity_name).toLowerCase().includes('validation') ||
    String(m.activity_name).toLowerCase().includes('test')
  );

  const openChecks = qualityChecks.filter(q => q.status !== 'Completed');
  const completedChecks = qualityChecks.filter(q => q.status === 'Completed');
  const inProgressChecks = qualityChecks.filter(q => q.status === 'In Progress');

  const handleMarkCompleted = async (taskId) => {
    setActionLoading(true);
    try {
      await API.put(`/projects/milestones/${taskId}`, { status: 'Completed', complete_percent: 100 });
      toast.success('Validation task marked completed');
      setSelectedTask(null);
      onRefresh();
    } catch (e) {
      toast.error('Failed to update task status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseIssue = async () => {
    if (!issueTitle || !projectId) return;
    setActionLoading(true);
    try {
      await API.post('/issues/', {
        project_id: projectId,
        title: `Quality Alert: ${issueTitle}`,
        description: issueDesc || `Raised from Quality Check validation gate for project ${projectName}`,
        owner: selectedTask?.assigned_to?.[0] || 'Quality Lead',
        department: selectedTask?.department || 'Quality Control',
        priority: 'High',
        status: 'Open'
      });
      toast.success('High-priority Quality Alert issue raised');
      setSelectedTask(null); setIssueTitle(''); setIssueDesc('');
      onRefresh();
    } catch (e) {
      toast.error('Failed to raise Quality Alert issue');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Analytics ──────────────────────────────────────────────────────────
  const completionRate = qualityChecks.length > 0 ? Math.round((completedChecks.length / qualityChecks.length) * 100) : 0;

  const gaugeOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { show: false },
    series: [{
      type: 'gauge',
      startAngle: 210, endAngle: -30,
      min: 0, max: 100,
      radius: '90%',
      center: ['50%', '58%'],
      pointer: { show: false },
      progress: { show: true, width: 10, itemStyle: { color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444' } },
      axisLine: { lineStyle: { width: 10, color: [[1, 'var(--border-subtle)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { show: true, offsetCenter: [0, '10%'], formatter: `${completionRate}%`, fontSize: 18, fontWeight: 'bold', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' },
      title: { show: true, offsetCenter: [0, '38%'], fontSize: 9, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)', formatter: 'COMPLETION' },
      data: [{ value: completionRate, name: 'Completion' }]
    }]
  }), [completionRate]);

  const statusBarOption = useMemo(() => {
    // Group by department
    const depts = {};
    qualityChecks.forEach(m => {
      const d = m.department || 'Quality';
      if (!depts[d]) depts[d] = { open: 0, inprog: 0, done: 0 };
      if (m.status === 'Completed') depts[d].done++;
      else if (m.status === 'In Progress') depts[d].inprog++;
      else depts[d].open++;
    });
    const labels = Object.keys(depts);
    if (labels.length === 0) return {};
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' } },
      legend: { data: ['Completed', 'In Progress', 'Open'], bottom: 0, textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' }, itemWidth: 10, itemHeight: 10 },
      grid: { left: 8, right: 8, top: 4, bottom: 26, containLabel: true },
      xAxis: { type: 'category', data: labels.map(l => l.length > 8 ? l.slice(0, 8) + '…' : l), axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' }, splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
      series: [
        { name: 'Completed', type: 'bar', stack: 'total', barMaxWidth: 20, itemStyle: { color: '#10b981' }, data: labels.map(l => depts[l].done) },
        { name: 'In Progress', type: 'bar', stack: 'total', barMaxWidth: 20, itemStyle: { color: '#6366f1' }, data: labels.map(l => depts[l].inprog) },
        { name: 'Open', type: 'bar', stack: 'total', barMaxWidth: 20, itemStyle: { color: '#ef4444', borderRadius: [3, 3, 0, 0] }, data: labels.map(l => depts[l].open) },
      ]
    };
  }, [qualityChecks]);

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/50 flex justify-between items-center">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={13} className="text-[var(--green)]" /> Quality Health Center
        </h3>
        <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">Validation & Quality</span>
      </div>

      {/* Sub-tab Bar */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg)]/30">
        {[
          { id: 'validation', label: 'Validation Gates', icon: Shield },
          { id: 'pareto',     label: 'Defect Pareto',    icon: BarChart2 },
          { id: 'heatmap',    label: 'Line Heatmap',     icon: Grid3x3 },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-0 cursor-pointer
                ${active
                  ? 'text-[var(--green)] border-b border-[var(--green)] bg-[var(--green)]/5'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent'
                }`}
            >
              <Icon size={10} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'validation' && (
        <>
          {/* Analytics Strip */}
          {qualityChecks.length > 0 && (
            <div className="grid grid-cols-12 gap-0 border-b border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
              {/* Gauge */}
              <div className="col-span-4 p-2 flex flex-col items-center justify-center">
                <ReactECharts option={gaugeOption} style={{ height: 110, width: '100%' }} opts={{ renderer: 'svg' }} />
                <div className="flex justify-around w-full text-center mt-0.5">
                  {[
                    { l: 'Done', v: completedChecks.length, c: 'text-emerald-500' },
                    { l: 'Open', v: openChecks.length, c: 'text-rose-500' },
                    { l: 'In Prog', v: inProgressChecks.length, c: 'text-indigo-500' },
                  ].map(s => (
                    <div key={s.l} className="flex flex-col">
                      <span className={`text-sm font-black leading-none ${s.c}`}>{s.v}</span>
                      <span className="text-[8px] text-[var(--text-muted)] font-bold uppercase">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Department status bar */}
              <div className="col-span-8 p-2 flex flex-col">
                <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-0.5">Status by Department</span>
                {Object.keys(statusBarOption).length > 0 ? (
                  <ReactECharts option={statusBarOption} style={{ height: 130, width: '100%' }} opts={{ renderer: 'svg' }} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-[10px] italic">No department data</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] bg-[var(--surface)]/20">

            {/* Left: Quality Checklist */}
            <div className="p-3 overflow-y-auto max-h-[220px] flex flex-col gap-1.5 custom-scrollbar">
              <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-bold flex items-center gap-1.5 mb-0.5">
                <Clock size={11} className="text-[var(--text-muted)]" /> Validation Targets ({qualityChecks.length})
              </h4>
              {qualityChecks.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] text-xs italic py-4">No validation milestones configured</div>
              ) : (
                qualityChecks.map(task => {
                  const isSelected = selectedTask?.id === task.id;
                  const isOpen = task.status !== 'Completed';
                  return (
                    <div key={task.id} onClick={() => setSelectedTask(task)}
                      className={`p-2 rounded border transition-all cursor-pointer flex justify-between items-center hover:bg-[var(--elevated-card)]/40 ${isSelected ? 'bg-[var(--elevated-card)] border-[var(--blue)]/40 shadow-sm' : 'bg-[var(--bg)]/40 border-[var(--border-subtle)]'}`}>
                      <div className="flex flex-col gap-0.5 truncate mr-2">
                        <span className="font-semibold text-[var(--text-primary)] text-[11px] truncate">{task.activity_name}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">{task.department || 'Quality'} · Due: {task.end_date?.split('T')[0] || 'N/A'}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${isOpen ? 'bg-[var(--amber)]/10 border-[var(--amber)]/20 text-[var(--amber)]' : 'bg-[var(--green)]/10 border-[var(--green)]/20 text-[var(--green)]'}`}>
                        {task.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Action panel */}
            <div className="p-3 bg-[var(--bg)]/10 flex flex-col gap-2 min-h-0">
              <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-bold">Verification Actions</h4>
              {!selectedTask ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs italic py-4 select-none gap-1">
                  <CornerDownRight size={15} /><span>Select a target to resolve</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2 text-[11px]">
                  <div className="flex flex-col gap-1 bg-[var(--bg)]/60 border border-[var(--border-subtle)] p-2 rounded shadow-sm">
                    <div className="font-bold text-[var(--text-primary)] text-xs leading-normal">{selectedTask.activity_name}</div>
                    <div className="text-[var(--text-secondary)]">Status: <span className="text-[var(--text-primary)] font-semibold">{selectedTask.status}</span></div>
                    <div className="text-[var(--text-secondary)]">Complete: <span className="text-[var(--text-primary)] font-semibold">{selectedTask.complete_percent || 0}%</span></div>
                  </div>
                  {selectedTask.status !== 'Completed' && (
                    <div className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-2">
                      <div className="text-[var(--text-secondary)] uppercase tracking-wider text-[8px] font-bold flex items-center gap-1">
                        <ShieldAlert size={11} className="text-[var(--red)]" /> Raise Critical Quality Alert
                      </div>
                      <input type="text" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)}
                        placeholder="Defect description (e.g. Panel gap fail)..."
                        className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[var(--text-primary)] outline-none text-[11px] focus:border-[var(--blue)]/40 font-bold" />
                      <textarea value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)}
                        placeholder="Failure details and recovery actions..." rows={1}
                        className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[var(--text-primary)] outline-none text-[11px] focus:border-[var(--blue)]/40" />
                      <div className="flex justify-end gap-2">
                        <button onClick={handleRaiseIssue} disabled={actionLoading || !issueTitle.trim()}
                          className="px-2 py-1 text-[10px] bg-[var(--red)] hover:opacity-90 text-white font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1">
                          <Plus size={10} /> Raise Alert
                        </button>
                        <button onClick={() => handleMarkCompleted(selectedTask.id)} disabled={actionLoading}
                          className="px-2 py-1 text-[10px] bg-[var(--green)] hover:opacity-90 text-white font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1">
                          <CheckCircle size={10} /> Confirm Pass
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'pareto' && (
        <div className="p-3">
          {paretoLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-[var(--text-muted)] animate-duration-1000" />
            </div>
          ) : (
            <DefectPareto
              patterns={paretoData?.patterns?.map((p, i) => ({
                ...p,
                is_vital_few: p.cumulative_pct <= 80 || i === 0
              })) || []}
              totalDefects={paretoData?.patterns?.reduce((sum, p) => sum + p.count, 0) || 0}
            />
          )}
        </div>
      )}

      {activeSubTab === 'heatmap' && (
        <div className="p-3 overflow-hidden">
          {heatmapLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-[var(--text-muted)] animate-duration-1000" />
            </div>
          ) : (
            <QualityHeatmap
              lines={heatmapData?.lines || []}
              metrics={heatmapData?.metrics || []}
              grid={heatmapData?.grid || []}
              healthGrid={heatmapData?.health_grid || []}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default QualityHealthCenter;
