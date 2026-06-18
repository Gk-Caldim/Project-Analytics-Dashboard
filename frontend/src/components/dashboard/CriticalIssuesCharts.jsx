import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

const CriticalIssuesCharts = ({ issues = [], projects = [] }) => {
  // Aggregate data
  const { projectNames, statusSeries, criticalitySeries } = useMemo(() => {
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.dbProjectId || p.id] = p.name;
    });

    const counts = {};
    
    // Initialize map for all projects that have at least one issue or all active projects
    projects.forEach(p => {
      counts[p.name] = {
        statuses: { 'Open': 0, 'In Progress': 0, 'Closed': 0 },
        criticalities: { 'High': 0, 'Medium': 0, 'Low': 0 }
      };
    });

    issues.forEach(issue => {
      const pid = issue.project_id;
      const projName = projectMap[pid] || `Project ${pid}`;
      const status = issue.status || 'Open';
      const priority = issue.priority || 'Medium';

      if (!counts[projName]) {
        counts[projName] = {
          statuses: { 'Open': 0, 'In Progress': 0, 'Closed': 0 },
          criticalities: { 'High': 0, 'Medium': 0, 'Low': 0 }
        };
      }

      if (counts[projName].statuses[status] !== undefined) {
        counts[projName].statuses[status]++;
      } else {
        counts[projName].statuses[status] = 1;
      }

      if (counts[projName].criticalities[priority] !== undefined) {
        counts[projName].criticalities[priority]++;
      } else {
        counts[projName].criticalities[priority] = 1;
      }
    });

    // Filter out projects with zero issues so the charts are readable
    const pNames = Object.keys(counts).filter(name => {
      const s = counts[name].statuses;
      return (s['Open'] + s['In Progress'] + s['Closed']) > 0;
    });

    const sSeries = [
      {
        name: 'Open',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: { color: '#ef4444' }, // red
        data: pNames.map(name => counts[name].statuses['Open'] || 0)
      },
      {
        name: 'In Progress',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: { color: '#3b82f6' }, // blue
        data: pNames.map(name => counts[name].statuses['In Progress'] || 0)
      },
      {
        name: 'Closed',
        type: 'bar',
        stack: 'status',
        barMaxWidth: 16,
        itemStyle: { color: '#10b981' }, // green
        data: pNames.map(name => counts[name].statuses['Closed'] || 0)
      }
    ];

    const cSeries = [
      {
        name: 'High / Critical',
        type: 'bar',
        stack: 'criticality',
        barMaxWidth: 16,
        itemStyle: { color: '#ef4444' }, // red
        data: pNames.map(name => counts[name].criticalities['High'] || 0)
      },
      {
        name: 'Medium',
        type: 'bar',
        stack: 'criticality',
        barMaxWidth: 16,
        itemStyle: { color: '#f59e0b' }, // amber
        data: pNames.map(name => counts[name].criticalities['Medium'] || 0)
      },
      {
        name: 'Low',
        type: 'bar',
        stack: 'criticality',
        barMaxWidth: 16,
        itemStyle: { color: '#64748b' }, // slate
        data: pNames.map(name => counts[name].criticalities['Low'] || 0)
      }
    ];

    return { projectNames: pNames, statusSeries: sSeries, criticalitySeries: cSeries };
  }, [issues, projects]);

  const statusOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
    },
    legend: {
      data: ['Open', 'In Progress', 'Closed'],
      bottom: 0,
      textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10
    },
    grid: { left: 8, right: 8, top: 12, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: projectNames.map(name => name.split(' ').slice(0, 2).join(' ')),
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
    series: statusSeries
  }), [projectNames, statusSeries]);

  const criticalityOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
    },
    legend: {
      data: ['High / Critical', 'Medium', 'Low'],
      bottom: 0,
      textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10
    },
    grid: { left: 8, right: 8, top: 12, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: projectNames.map(name => name.split(' ').slice(0, 2).join(' ')),
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
    series: criticalitySeries
  }), [projectNames, criticalitySeries]);

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex justify-between items-center shrink-0">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle size={13} className="text-rose-500" /> Critical Issues Analytics Center
        </h3>
        <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
          {issues.length} Active Issues
        </span>
      </div>
      {issues.length === 0 ? (
        <div className="text-center text-[var(--text-muted)] py-10 italic text-xs">
          No issues found in database.
        </div>
      ) : (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2.5 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
              Issues by Project and Status
            </span>
            <ReactECharts option={statusOption} style={{ height: 180, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
          <div className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2.5 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
              Issues by Project and Criticality
            </span>
            <ReactECharts option={criticalityOption} style={{ height: 180, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalIssuesCharts;
