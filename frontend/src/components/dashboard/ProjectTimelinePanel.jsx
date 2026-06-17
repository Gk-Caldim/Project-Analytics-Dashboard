import React, { useMemo, useState } from 'react';
import { Upload, GanttChartSquare, Wallet, FileText, Clock, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

/**
 * ProjectTimelinePanel
 * ────────────────────
 * Full-width tabbed "Project Timeline" section:
 *   • Tracker Ingestion  → ingestion timeline (recent tracker uploads)
 *   • Projects Milestone → Gantt-style chart (milestone progress per project)
 *   • Budget Timeline    → revision timeline + status pie chart
 */

const TABS = [
  { id: 'tracker', label: 'Tracker Ingestion', icon: Upload },
  { id: 'milestone', label: 'Projects Milestone', icon: GanttChartSquare },
  { id: 'budget', label: 'Budget Timeline', icon: Wallet },
];

const STATUS_COLORS = {
  Completed: '#10b981',
  Approved: '#10b981',
  'On Track': '#10b981',
  Pending: '#f59e0b',
  'Pending Head': '#f59e0b',
  'Pending Finance': '#f59e0b',
  Delayed: '#ef4444',
  Rejected: '#ef4444',
  // Upload statuses
  success: '#10b981',
  Failed: '#ef4444',
  error: '#ef4444',
};

// Project dot colors — cycle through for visual differentiation
const PROJECT_DOT_PALETTE = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#14b8a6', '#f43f5e', '#3b82f6',
];

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtCurrency = (val) => {
  const n = Math.round(val || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${n.toLocaleString()}`;
  return `$${n}`;
};

const ProjectTimelinePanel = ({ projects = [], uploads = [], revisions = [] }) => {
  const [active, setActive] = useState('tracker');

  // Project name → dot color map for tracker ingestion
  const projectColorMap = useMemo(() => {
    const names = Array.from(new Set((uploads || []).map(u => u.project_name).filter(Boolean)));
    const map = {};
    names.forEach((name, i) => { map[name] = PROJECT_DOT_PALETTE[i % PROJECT_DOT_PALETTE.length]; });
    return map;
  }, [uploads]);

  // ── Tab 2: Milestone Gantt-style chart ──────────────────────────────────
  const milestoneOption = useMemo(() => {
    const data = (projects || []).filter((p) => p.project_name);
    if (data.length === 0) return {};
    const names = data.map((p) => p.project_name);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const proj = params[0]?.axisValue;
          const lines = params.filter(p => p.value > 0).map(p => `${p.marker} ${p.seriesName}: <b>${p.value}</b> milestones`).join('<br/>');
          return `${proj}<br/>${lines}`;
        }
      },
      legend: {
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      grid: { left: 6, right: 24, top: 8, bottom: 36, containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        name: 'Milestones',
        nameLocation: 'end',
        nameTextStyle: { color: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          width: 110,
          overflow: 'truncate',
          fontFamily: 'Inter, sans-serif'
        },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Completed',
          type: 'bar',
          stack: 't',
          barMaxWidth: 20,
          itemStyle: { color: '#10b981' },
          label: { show: false },
          data: data.map((p) => p.completed || 0)
        },
        {
          name: 'Pending',
          type: 'bar',
          stack: 't',
          barMaxWidth: 20,
          itemStyle: { color: '#f59e0b' },
          label: { show: false },
          data: data.map((p) => p.pending || 0)
        },
        {
          name: 'Delayed',
          type: 'bar',
          stack: 't',
          barMaxWidth: 20,
          itemStyle: { color: '#ef4444', borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: 'right',
            fontSize: 9,
            color: 'var(--text-secondary)',
            fontFamily: 'Inter, sans-serif',
            formatter: (p) => {
              const proj = data[p.dataIndex];
              const total = (proj?.completed || 0) + (proj?.pending || 0) + (proj?.delayed || 0);
              return total > 0 ? `${total}` : '';
            }
          },
          data: data.map((p) => p.delayed || 0)
        },
      ],
    };
  }, [projects]);

  // ── Tab 3: Budget revision status pie ───────────────────────────────────
  const budgetPieOption = useMemo(() => {
    const counts = {};
    (revisions || []).forEach((r) => {
      const s = r.status || 'Pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    const data = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: STATUS_COLORS[name] || '#6366f1' },
    }));
    if (data.length === 0) return {};
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      series: [{
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: 'var(--surface)', borderWidth: 2 },
        label: {
          show: true,
          fontSize: 10,
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
          formatter: (p) => p.percent > 10 ? `${p.percent.toFixed(0)}%` : ''
        },
        data,
      }],
    };
  }, [revisions]);

  const recentUploads = useMemo(() => (uploads || []).slice(0, 14), [uploads]);
  const recentRevisions = useMemo(
    () =>
      [...(revisions || [])]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 12),
    [revisions]
  );

  // ── Render upload status icon ──
  const getUploadIcon = (status) => {
    if (status === 'Completed' || status === 'success') return <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />;
    if (status === 'Failed' || status === 'error') return <AlertTriangle size={11} className="text-rose-500 shrink-0" />;
    return <Circle size={11} className="text-blue-400 shrink-0" />;
  };

  return (
    <section
      aria-label="Project Timeline"
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 18px 0 18px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Project Timeline
        </h3>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '10px 18px 0 18px',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div style={{ padding: '14px 18px 18px 18px', minWidth: 0 }}>
        {/* ── Tracker Ingestion Timeline ── */}
        {active === 'tracker' && (
          <div role="tabpanel">
            {recentUploads.length === 0 ? (
              <Empty label="No tracker ingestion activity yet." />
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
                {/* Vertical connector line */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '7px',
                    top: '6px',
                    bottom: '6px',
                    width: '2px',
                    background: 'var(--border-subtle)',
                  }}
                />
                {recentUploads.map((u, i) => {
                  const projColor = projectColorMap[u.project_name] || '#6366f1';
                  const dotColor = STATUS_COLORS[u.status] || projColor;
                  return (
                    <li key={u.id ?? i} style={{ position: 'relative', paddingLeft: '28px', paddingBottom: '14px' }}>
                      {/* Colored status dot */}
                      <span
                        style={{
                          position: 'absolute',
                          left: '2px',
                          top: '3px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: dotColor,
                          border: '2px solid var(--surface)',
                          boxShadow: `0 0 0 1px ${dotColor}33`,
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {getUploadIcon(u.status)}
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.file_name || u.name || u.tracker_name || 'Tracker upload'}
                        </span>
                        {/* Project badge */}
                        {u.project_name && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: projColor,
                              background: `${projColor}15`,
                              border: `1px solid ${projColor}30`,
                              borderRadius: '4px',
                              padding: '1px 6px',
                            }}
                          >
                            {u.project_name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                        <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {fmtDate(u.uploaded_at)}
                        </span>
                        {u.row_count > 0 && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            · {u.row_count.toLocaleString()} rows
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        {/* ── Projects Milestone: Gantt-style chart ── */}
        {active === 'milestone' && (
          <div role="tabpanel">
            {(!projects || projects.length === 0) ? (
              <Empty label="No milestone data available." />
            ) : (
              <ReactECharts
                option={milestoneOption}
                style={{ height: `${Math.max(220, projects.length * 36 + 70)}px`, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            )}
          </div>
        )}

        {/* ── Budget Timeline ── */}
        {active === 'budget' && (
          <div
            role="tabpanel"
            style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}
            className="ptl-budget-grid"
          >
            <div style={{ minWidth: 0 }}>
              <SubHead>Budget revision timeline</SubHead>
              {recentRevisions.length === 0 ? (
                <Empty label="No budget revisions recorded." />
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
                  <span
                    aria-hidden
                    style={{ position: 'absolute', left: '7px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border-subtle)' }}
                  />
                  {recentRevisions.map((r, i) => {
                    const dotColor = STATUS_COLORS[r.status] || '#6366f1';
                    return (
                      <li key={r.id ?? i} style={{ position: 'relative', paddingLeft: '28px', paddingBottom: '12px' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: '2px',
                            top: '3px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: dotColor,
                            border: '2px solid var(--surface)',
                            boxShadow: `0 0 0 1px ${dotColor}33`,
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {r.project_name || 'Project'}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: dotColor,
                              background: `${dotColor}15`,
                              border: `1px solid ${dotColor}30`,
                              borderRadius: '4px',
                              padding: '1px 6px',
                            }}
                          >
                            {r.status || ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {r.previous_budget != null && r.revised_budget != null
                            ? `${fmtCurrency(r.previous_budget)} → ${fmtCurrency(r.revised_budget)} · `
                            : ''}
                          {fmtDate(r.created_at)}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <SubHead>Revisions by status</SubHead>
              {(!revisions || revisions.length === 0) ? (
                <Empty label="No revision data." />
              ) : (
                <ReactECharts option={budgetPieOption} style={{ height: '220px', width: '100%' }} opts={{ renderer: 'svg' }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Responsive two-up for budget */}
      <style>{`
        @media (min-width: 768px) {
          .ptl-budget-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  );
};

const SubHead = ({ children }) => (
  <div
    style={{
      fontSize: '10px',
      fontWeight: 700,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: '10px',
    }}
  >
    {children}
  </div>
);

const Empty = ({ label }) => (
  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
    {label}
  </div>
);

export default ProjectTimelinePanel;
