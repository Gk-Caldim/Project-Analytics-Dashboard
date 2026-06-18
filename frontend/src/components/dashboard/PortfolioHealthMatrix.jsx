import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, CheckCircle, Clock, Calendar, Users, Wallet, LayoutGrid, TableProperties, BarChart3, Info } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const PortfolioHealthMatrix = ({
  projectsSummary = [],      // GET /dashboard/summary
  structures = [],           // GET /projects/all/structures (for submodules/uploads details)
  onProjectSelect = () => {},
  issuesMap = {},            // Maps project_id to its list of issues
  budgetsMap = {},           // Maps project_name to its budget summaries
  onActionClick = () => {},  // Custom callbacks for inline actions
  analyticsData = null,
  isPM = false
}) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [viewMode, setViewMode] = useState('analytics'); // 'table' | 'cards' | 'analytics'

  const toggleRow = (projectId) => {
    setExpandedRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // ── Analytics Data Derivations ──────────────────────────────────────────
  const healthCounts = useMemo(() => {
    const counts = { Red: 0, Yellow: 0, Green: 0, Unknown: 0 };
    projectsSummary.forEach(p => {
      const h = p.project_health || 'Unknown';
      counts[h] = (counts[h] || 0) + 1;
    });
    return counts;
  }, [projectsSummary]);

  const healthDonutOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} projects ({d}%)',
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12, fontFamily: 'Inter, sans-serif' }
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: true,
      label: {
        show: true,
        position: 'inside',
        formatter: (params) => params.percent > 10 ? `${params.percent.toFixed(0)}%` : '',
        fontSize: 10,
        fontWeight: 700,
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif'
      },
      labelLine: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text-primary)'
        }
      },
      data: [
        { value: healthCounts.Red, name: 'Critical', itemStyle: { color: '#ef4444' } },
        { value: healthCounts.Yellow, name: 'At Risk', itemStyle: { color: '#f59e0b' } },
        { value: healthCounts.Green, name: 'On Track', itemStyle: { color: '#10b981' } },
      ].filter(d => d.value > 0)
    }]
  }), [healthCounts]);

  const delayBarOption = useMemo(() => {
    const sorted = [...projectsSummary].sort((a, b) => (b.delayed || 0) - (a.delayed || 0)).slice(0, 8);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => `${params[0].name}<br/>Delayed Milestones: <b>${params[0].value}</b>`
      },
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Milestones',
        nameLocation: 'end',
        nameTextStyle: { color: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        minInterval: 1,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(p => p.project_name?.split(' ').slice(0, 2).join(' ') || p.project_name),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif', width: 90, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        name: 'Delayed Milestones',
        type: 'bar',
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          fontSize: 9,
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
          formatter: (p) => p.value > 0 ? `${p.value}` : ''
        },
        data: sorted.map(p => ({
          value: p.delayed || 0,
          itemStyle: {
            color: (p.delayed || 0) > 5 ? '#ef4444' : (p.delayed || 0) > 2 ? '#f59e0b' : '#6366f1',
            borderRadius: [0, 3, 3, 0]
          }
        }))
      }]
    };
  }, [projectsSummary]);

  const scheduleStackOption = useMemo(() => {
    const projects = [...projectsSummary].slice(0, 8);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: {
        data: ['On Track', 'Delayed', 'Pending'],
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      grid: { left: 8, right: 8, top: 8, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: projects.map(p => p.project_name?.split(' ').slice(0, 2).join(' ') || ''),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, rotate: 20, fontFamily: 'Inter, sans-serif', interval: 0 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, formatter: '{value}%', fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        { name: 'On Track', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#10b981', borderRadius: 0 }, data: projects.map(p => Math.round(p.on_track_pct || 0)) },
        { name: 'Delayed', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#ef4444', borderRadius: 0 }, data: projects.map(p => Math.round(p.delay_pct || 0)) },
        { name: 'Pending', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { color: '#64748b', borderRadius: [3, 3, 0, 0] }, data: projects.map(p => Math.max(0, 100 - Math.round(p.on_track_pct || 0) - Math.round(p.delay_pct || 0))) },
      ]
    };
  }, [projectsSummary]);

  // --- New Non-PM Analytics Options ---

  const totalProjectsForStatus = useMemo(() => {
    if (!analyticsData || !analyticsData.project_status_summary) return 0;
    return analyticsData.project_status_summary.reduce((sum, item) => sum + item.count, 0);
  }, [analyticsData]);

  const statusPieOption = useMemo(() => {
    if (!analyticsData || !analyticsData.project_status_summary) return {};
    const list = analyticsData.project_status_summary;
    const statusColors = {
      'In Progress': '#3b82f6',
      'Planning': '#64748b',
      'Completed': '#10b981',
      'Delayed': '#ef4444',
      'On Hold': '#f59e0b',
      'Cancelled': '#94a3b8'
    };

    const chartData = list.map(item => ({
      value: item.count,
      name: item.status,
      itemStyle: { color: statusColors[item.status] || '#94a3b8' }
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} projects ({d}%)',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: { show: false },
      series: [{
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '48%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'inside',
          formatter: (params) => params.percent > 10 ? `${params.percent.toFixed(0)}%` : '',
          fontSize: 10,
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif'
        },
        labelLine: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-primary)'
          }
        },
        data: chartData.filter(d => d.value > 0)
      }]
    };
  }, [analyticsData]);

  const deptBreakdownOption = useMemo(() => {
    if (!analyticsData || !analyticsData.department_breakdown) return {};
    const db = analyticsData.department_breakdown;
    const depts = Object.keys(db);
    const statuses = ['Completed', 'In Progress', 'Delayed', 'Not Started', 'Pending', 'Open'];
    const statusColors = {
      'Completed': '#10b981',
      'In Progress': '#3b82f6',
      'Delayed': '#ef4444',
      'Not Started': '#64748b',
      'Pending': '#f59e0b',
      'Open': '#a855f7'
    };

    const series = statuses.map(status => ({
      name: status,
      type: 'bar',
      stack: 'status',
      barMaxWidth: 18,
      itemStyle: { color: statusColors[status] || '#94a3b8' },
      data: depts.map(d => db[d][status] || 0)
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: {
        data: statuses,
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 6
      },
      grid: { left: 8, right: 8, top: 12, bottom: 32, containLabel: true },
      xAxis: {
        type: 'category',
        data: depts.map(d => d.split(' ').slice(0, 2).join(' ')),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, rotate: 15, fontFamily: 'Inter, sans-serif', interval: 0 },
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
      series
    };
  }, [analyticsData]);

  const resourceUtilOption = useMemo(() => {
    if (!analyticsData || !analyticsData.resource_utilization) return {};
    const list = analyticsData.resource_utilization;
    const names = list.map(r => r.name);
    const avail = list.map(r => r.availability);
    const util = list.map(r => r.utilization);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: {
        data: ['Availability', 'Utilization'],
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 10
      },
      grid: { left: 8, right: 8, top: 12, bottom: 32, containLabel: true },
      xAxis: {
        type: 'category',
        data: names.map(n => n.split(' ').slice(0, 2).join(' ')),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, rotate: 20, fontFamily: 'Inter, sans-serif', interval: 0, width: 60, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'hrs/day',
        nameTextStyle: { color: 'var(--text-muted)', fontSize: 8 },
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        { name: 'Availability', type: 'bar', data: avail, itemStyle: { color: '#10b981', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 10 },
        { name: 'Utilization', type: 'bar', data: util, itemStyle: { color: '#6366f1', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 10 }
      ]
    };
  }, [analyticsData]);

  const renderAnalyticsMode = () => {
    const totalProjects = projectsSummary.length;
    const redCount = healthCounts.Red;
    const yellowCount = healthCounts.Yellow;
    const greenCount = healthCounts.Green;
    const avgDelay = totalProjects > 0
      ? (projectsSummary.reduce((a, p) => a + (p.avg_delay_days || 0), 0) / totalProjects).toFixed(1)
      : 0;

    if (totalProjects === 0) {
      return <div className="text-center text-[var(--text-muted)] py-10 italic text-xs">No project data available</div>;
    }

    return (
      <div className="p-3 flex flex-col gap-3">
        {/* KPI Summary Row — 12px labels, right-aligned numbers */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total Projects', value: totalProjects, unit: '', color: 'text-[var(--text-primary)]' },
            { label: 'Critical (Red)', value: redCount, unit: '', color: 'text-rose-500' },
            { label: 'At Risk (Yellow)', value: yellowCount, unit: '', color: 'text-amber-500' },
            { label: 'Avg Delay', value: `${avgDelay}d`, unit: '', color: 'text-[var(--text-secondary)]' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">{kpi.label}</span>
              <span className={`text-xl font-black leading-none ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-12 gap-3">
          {isPM ? (
            <>
              {/* Health Donut */}
              <div className="col-span-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Health Distribution</span>
                <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 140 }}>
                  <ReactECharts option={healthDonutOption} style={{ height: 140, width: '100%' }} opts={{ renderer: 'svg' }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-[var(--text-primary)]">{totalProjects}</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Projects</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col gap-1 mt-2">
                  {[
                    { c: '#ef4444', l: 'Critical', v: redCount },
                    { c: '#f59e0b', l: 'At Risk', v: yellowCount },
                    { c: '#10b981', l: 'On Track', v: greenCount }
                  ].map(i => (
                    <div key={i.l} className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.c }} />
                        <span className="text-[var(--text-secondary)]">{i.l}</span>
                      </span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">{i.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delay Ranking Bar */}
              <div className="col-span-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Delayed Milestones by Project</span>
                <ReactECharts option={delayBarOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>

              {/* Schedule Stack */}
              <div className="col-span-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Schedule Status Distribution (%)</span>
                <ReactECharts option={scheduleStackOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </>
          ) : (
            <>
              {/* Project Status Summary Donut */}
              <div className="col-span-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Project Status Summary</span>
                <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 140 }}>
                  <ReactECharts option={statusPieOption} style={{ height: 140, width: '100%' }} opts={{ renderer: 'svg' }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-[var(--text-primary)]">{totalProjectsForStatus}</span>
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Projects</span>
                  </div>
                </div>
                {/* Legend for Project Status Summary */}
                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 justify-center">
                  {analyticsData?.project_status_summary?.map(item => {
                    const statusColors = {
                      'In Progress': '#3b82f6',
                      'Planning': '#64748b',
                      'Completed': '#10b981',
                      'Delayed': '#ef4444',
                      'On Hold': '#f59e0b',
                      'Cancelled': '#94a3b8'
                    };
                    return (
                      <div key={item.status} className="flex items-center gap-1 text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColors[item.status] || '#94a3b8' }} />
                        <span className="text-[var(--text-secondary)]">{item.status}:</span>
                        <span className="font-bold text-[var(--text-primary)]">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department wise task breakdown of milestones */}
              <div className="col-span-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Department wise task breakdown of milestones</span>
                <ReactECharts option={deptBreakdownOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>

              {/* Resource availability Vs Utilization of milestone */}
              <div className="col-span-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Resource availability Vs Utilization of milestone</span>
                <ReactECharts option={resourceUtilOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
              </div>
            </>
          )}
        </div>

        {/* Quick Table — compact, below charts */}
        <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--elevated-card)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2 text-center">Health</th>
                <th className="px-3 py-2 text-right">Completed</th>
                <th className="px-3 py-2 text-right">Delayed</th>
                <th className="px-3 py-2 text-right">Pending</th>
                <th className="px-3 py-2 text-right">Avg Delay</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {projectsSummary.map(proj => {
                // Data consistency check: Critical health but zero delay → flag it
                const hasInconsistency = proj.project_health === 'Red' && (proj.avg_delay_days || 0) === 0;
                return (
                  <tr key={proj.project_id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-hover)] transition-colors">
                    <td className="px-3 py-2 font-semibold text-[var(--text-primary)] max-w-[160px] truncate">{proj.project_name}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getHealthColor(proj.project_health)}`}>
                          {proj.project_health === 'Red' ? 'Critical' : proj.project_health === 'Yellow' ? 'At Risk' : proj.project_health || '—'}
                        </span>
                        {hasInconsistency && (
                          <span title="Status reflects non-schedule issues (budget, quality, etc.)" className="text-amber-500 cursor-help">
                            <Info size={11} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-500 tabular-nums">{proj.completed ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-rose-500 tabular-nums">{proj.delayed ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-[var(--text-secondary)] tabular-nums">{proj.pending ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[var(--text-primary)] tabular-nums">{proj.avg_delay_days || 0}d</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onProjectSelect(proj)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 rounded transition-all cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'Red': return 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:text-rose-400';
      case 'Yellow': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:text-amber-400';
      case 'Green': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:text-emerald-400';
      default: return 'bg-[var(--border-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  const renderCardsMode = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {projectsSummary.map(proj => {
          const struct = structures.find(s => String(s.project_id) === String(proj.project_id));
          const projectIssues = issuesMap[proj.project_id] || [];
          const projectBudget = budgetsMap[proj.project_name] || null;

          const approved = proj.budgetApproved || projectBudget?.overall_budget || 0;
          const utilized = proj.budgetUtilized || 0;
          const utilizationPct = approved > 0 ? Math.min(100, Math.round((utilized / approved) * 100)) : 0;
          const onTrackPct = Math.round(proj.on_track_pct || 0);
          const delayPct = Math.round(proj.delay_pct || 0);
          const pendingPct = Math.max(0, 100 - onTrackPct - delayPct);

          return (
            <div
              key={proj.project_id}
              onClick={() => onProjectSelect(proj)}
              className="group flex flex-col justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-blue-500/40 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer text-xs"
            >
              {/* Card Title & Health Header */}
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h4 className="m-0 text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors truncate">
                    {proj.project_name}
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    Avg delay: <span className="font-bold text-[var(--text-primary)]">{proj.avg_delay_days || 0}d</span>
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border shrink-0 ${getHealthColor(proj.project_health)}`}>
                  {proj.project_health === 'Red' ? 'Critical' : proj.project_health === 'Yellow' ? 'At Risk' : proj.project_health || '—'}
                </span>
              </div>

              {/* Milestones Progress */}
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)]">
                  <span>Milestones Progress</span>
                  <span className="font-extrabold text-[var(--text-primary)] tabular-nums">{onTrackPct}%</span>
                </div>

                {/* Stacked Progress Bar */}
                <div className="h-2.5 bg-[var(--bg)] rounded-full overflow-hidden flex border border-[var(--border-subtle)]">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${onTrackPct}%` }} title={`On Track: ${onTrackPct}%`} />
                  <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${delayPct}%` }} title={`Delayed: ${delayPct}%`} />
                  <div className="h-full bg-[var(--border-strong)] opacity-40 transition-all duration-500" style={{ width: `${pendingPct}%` }} title={`Pending: ${pendingPct}%`} />
                </div>

                {/* Counter badges */}
                <div className="flex justify-between items-center mt-0.5">
                  <div className="flex gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                      {proj.completed} Done
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[9px] font-bold">
                      {proj.delayed} Late
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] text-[9px] font-bold">
                      {proj.pending} Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="border-t border-[var(--border-subtle)] pt-2.5 mb-3 flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] flex items-center justify-between">
                  <span>Critical Issues ({projectIssues.length})</span>
                  {projectIssues.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                </span>
                {projectIssues.length > 0 ? (
                  <div className="bg-[var(--bg)] p-2 rounded border border-[var(--border-subtle)] flex flex-col gap-0.5">
                    <div className="font-bold text-[var(--text-primary)] truncate">{projectIssues[0].title}</div>
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                      <span>Owner: {projectIssues[0].owner || 'Unassigned'}</span>
                      <span>Due: {projectIssues[0].due_date || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)] italic">No open priority issues</span>
                )}
              </div>

              {/* Budget Allocation */}
              <div className="border-t border-[var(--border-subtle)] pt-2.5 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                  <span>Budget Allocation</span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{utilizationPct}% Spent</span>
                </div>
                <div className="flex justify-between font-semibold text-[var(--text-secondary)] text-[10px] my-0.5">
                  <span>Spent: ${Math.round(utilized).toLocaleString()}</span>
                  <span>Approved: ${Math.round(approved).toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${utilizationPct > 90 ? 'bg-rose-500' : utilizationPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${utilizationPct}%` }}
                  />
                </div>
              </div>

              {/* Open Workspace Action */}
              <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)] mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onProjectSelect(proj); }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  Workspace →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableMode = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--bg)] border-b border-[var(--border-strong)] text-[var(--text-secondary)] font-bold uppercase tracking-wider text-[10px] select-none">
              <th className="p-3 w-8"></th>
              <th className="p-3">Project Name</th>
              <th className="p-3 text-center">Health</th>
              <th className="p-3 text-center">Progress</th>
              <th className="p-3 text-right">Completed</th>
              <th className="p-3 text-right">Delayed</th>
              <th className="p-3 text-right">Pending</th>
              <th className="p-3 text-right">Avg Delay</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {projectsSummary.map(proj => {
              const isExpanded = !!expandedRows[proj.project_id];
              const struct = structures.find(s => String(s.project_id) === String(proj.project_id));
              const projectIssues = issuesMap[proj.project_id] || [];
              const projectBudget = budgetsMap[proj.project_name] || null;
              const hasInconsistency = proj.project_health === 'Red' && (proj.avg_delay_days || 0) === 0;

              return (
                <React.Fragment key={proj.project_id}>
                  <tr className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-hover)] transition-colors ${isExpanded ? 'bg-[var(--table-hover)]' : ''}`}>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleRow(proj.project_id)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 rounded hover:bg-[var(--bg)] transition-all cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-[var(--text-primary)]">
                      <button onClick={() => onProjectSelect(proj)} className="hover:underline hover:text-blue-500 text-left font-bold cursor-pointer">
                        {proj.project_name}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getHealthColor(proj.project_health)}`}>
                          {proj.project_health === 'Red' ? 'Critical' : proj.project_health === 'Yellow' ? 'At Risk' : proj.project_health || '—'}
                        </span>
                        {hasInconsistency && (
                          <span title="Non-schedule critical status" className="text-amber-500 cursor-help">
                            <Info size={11} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 max-w-[120px] mx-auto">
                        <div className="flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border-subtle)] flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${proj.on_track_pct}%` }} />
                          <div className="h-full bg-rose-500" style={{ width: `${proj.delay_pct || 0}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] tabular-nums w-8 text-right">{proj.on_track_pct}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-500 tabular-nums">{proj.completed}</td>
                    <td className="p-3 text-right font-bold text-rose-500 tabular-nums">{proj.delayed}</td>
                    <td className="p-3 text-right font-bold text-[var(--text-secondary)] tabular-nums">{proj.pending}</td>
                    <td className="p-3 text-right font-semibold text-[var(--text-primary)] tabular-nums">{proj.avg_delay_days || 0}d</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onProjectSelect(proj)}
                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 rounded transition-all cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-[var(--bg)]/40 border-b border-[var(--border-strong)]">
                      <td colSpan="9" className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[var(--text-primary)]">
                          {/* Col 1: Schedule Timeline & Datasets */}
                          <div className="border border-[var(--border-subtle)] bg-[var(--surface)] p-3 rounded-lg flex flex-col gap-2">
                            <h4 className="m-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                              <Calendar size={12} className="text-[var(--text-secondary)]" />
                              Milestones & Schedule Timeline
                            </h4>
                            <div className="flex flex-col gap-1 my-1">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Milestone status allocation</span>
                              <div className="h-3 bg-[var(--bg)] rounded border border-[var(--border-subtle)] overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${proj.on_track_pct}%` }} title="On Track" />
                                <div className="h-full bg-rose-500" style={{ width: `${proj.delay_pct || 0}%` }} title="Delayed" />
                                <div className="h-full bg-[var(--border-strong)] opacity-40" style={{ width: `${100 - proj.on_track_pct - (proj.delay_pct || 0)}%` }} title="Pending" />
                              </div>
                              <div className="flex justify-between text-[9px] text-[var(--text-muted)] mt-0.5">
                                <span>On Track: {proj.on_track_pct}%</span>
                                <span>Delayed: {proj.delay_pct || 0}%</span>
                              </div>
                            </div>
                            {struct?.uploads && struct.uploads.length > 0 ? (
                              <div className="flex flex-col gap-1.5 mt-1">
                                {struct.uploads.slice(0, 3).map(u => (
                                  <div
                                    key={u.upload_id}
                                    className="flex justify-between items-center text-[11px] bg-[var(--bg)] p-2 rounded border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] hover:border-blue-500/20 transition-colors cursor-pointer"
                                    onClick={() => onActionClick('open-tracker', { trackerId: u.upload_id, struct })}
                                  >
                                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[150px]">
                                      {u.file_name.replace(/\.[^/.]+$/, '')}
                                    </span>
                                    <span className="text-[9px] text-[var(--text-secondary)] font-bold bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                      {u.row_count || 0} rows
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[var(--text-muted)] italic m-2">No datasets ingested yet</p>
                            )}
                          </div>

                          {/* Col 2: Critical Issues */}
                          <div className="border border-[var(--border-subtle)] bg-[var(--surface)] p-3 rounded-lg flex flex-col gap-2">
                            <h4 className="m-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                              <AlertTriangle size={12} className="text-rose-500" />
                              Critical Open Issues ({projectIssues.length})
                            </h4>
                            {projectIssues.length > 0 ? (
                              <div className="flex flex-col gap-1.5 mt-1 overflow-y-auto max-h-[120px]">
                                {projectIssues.slice(0, 3).map(issue => (
                                  <div key={issue.id} className="text-[11px] bg-[var(--bg)] p-2 rounded border border-[var(--border-subtle)] flex flex-col gap-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="font-semibold text-[var(--text-primary)] truncate">{issue.title}</span>
                                      <span className="text-[9px] bg-rose-500/10 text-rose-500 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase border border-rose-500/20 shrink-0">
                                        {issue.priority}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                                      <span>Owner: {issue.owner || 'Unassigned'}</span>
                                      <span>Due: {issue.due_date || 'N/A'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-4 text-[var(--text-muted)]">
                                <CheckCircle size={16} className="text-emerald-500 mb-1" />
                                <span className="text-[11px] italic">No active issues detected</span>
                              </div>
                            )}
                          </div>

                          {/* Col 3: Budget Allocation */}
                          <div className="border border-[var(--border-subtle)] bg-[var(--surface)] p-3 rounded-lg flex flex-col gap-2">
                            <h4 className="m-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                              <Wallet size={12} className="text-[var(--text-secondary)]" />
                              Budget Allocation (USD)
                            </h4>
                            <div className="flex flex-col gap-2.5 mt-1 text-[11px]">
                              {[
                                { label: 'Capex Approved', val: proj.budgetApproved || projectBudget?.overall_budget || 0, color: 'text-[var(--text-primary)]' },
                                { label: 'Spent', val: proj.budgetUtilized || 0, color: 'text-emerald-500' },
                                { label: 'Balance Reserve', val: proj.budgetBalance || 0, color: 'text-amber-500' },
                              ].map((row, i) => (
                                <div key={row.label} className={`flex justify-between ${i < 2 ? 'border-b border-[var(--border-subtle)] pb-1.5' : ''}`}>
                                  <span className="text-[var(--text-secondary)]">{row.label}:</span>
                                  <span className={`font-bold tabular-nums ${row.color}`}>${Math.round(row.val).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg overflow-hidden mb-6 shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex justify-between items-center gap-4">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Portfolio Health Matrix</h3>
        <div className="flex border border-[var(--border-subtle)] rounded overflow-hidden">
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 outline-none transition-colors ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
          >
            <BarChart3 size={11} />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 outline-none transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
          >
            <TableProperties size={11} />
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 outline-none transition-colors ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
          >
            <LayoutGrid size={11} />
            Cards
          </button>
        </div>
      </div>
      {viewMode === 'analytics' ? renderAnalyticsMode() : viewMode === 'table' ? renderTableMode() : renderCardsMode()}
    </div>
  );
};

export default PortfolioHealthMatrix;
