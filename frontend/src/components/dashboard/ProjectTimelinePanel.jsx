import React, { useMemo, useState } from 'react';
import { Upload, GanttChartSquare, Wallet, FileText, Clock } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

/**
 * ProjectTimelinePanel
 * ────────────────────
 * Full-width tabbed "Project Timeline" section (matches the sketch):
 *   • Tracker Ingestion  → ingestion timeline (recent tracker uploads)
 *   • Projects Milestone → Gantt-style chart (milestone progress per project)
 *   • Budget Timeline    → revision timeline + status pie chart
 *
 * Reuses data already loaded on the home view; does not change panel contents.
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
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const ProjectTimelinePanel = ({ projects = [], uploads = [], revisions = [] }) => {
  const [active, setActive] = useState('tracker');

  // ── Tab 2: Milestone Gantt-style chart (completed / pending / delayed) ──
  const milestoneOption = useMemo(() => {
    const data = (projects || []).filter((p) => p.project_name);
    if (data.length === 0) return {};
    const names = data.map((p) => p.project_name);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' } },
      legend: { bottom: 0, textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' }, itemWidth: 10, itemHeight: 10 },
      grid: { left: 6, right: 16, top: 8, bottom: 30, containLabel: true },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: 'var(--text-secondary)', fontSize: 9 },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: names,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, width: 110, overflow: 'truncate', fontFamily: 'Inter, sans-serif' },
        axisLine: { show: false }, axisTick: { show: false } },
      series: [
        { name: 'Completed', type: 'bar', stack: 't', barMaxWidth: 18, itemStyle: { color: '#10b981' },
          data: data.map((p) => p.completed || 0) },
        { name: 'Pending', type: 'bar', stack: 't', barMaxWidth: 18, itemStyle: { color: '#f59e0b' },
          data: data.map((p) => p.pending || 0) },
        { name: 'Delayed', type: 'bar', stack: 't', barMaxWidth: 18, itemStyle: { color: '#ef4444', borderRadius: [0, 3, 3, 0] },
          data: data.map((p) => p.delayed || 0) },
      ],
    };
  }, [projects]);

  // ── Tab 3: Budget revisions by status (pie) ────────────────────────────
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
      tooltip: { trigger: 'item', backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: 'pie', radius: ['42%', '70%'], center: ['50%', '44%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: 'var(--surface)', borderWidth: 2 },
        label: { show: true, fontSize: 10, color: 'var(--text-secondary)', formatter: '{b}\n{c}' },
        data,
      }],
    };
  }, [revisions]);

  const recentUploads = useMemo(
    () => (uploads || []).slice(0, 14),
    [uploads]
  );
  const recentRevisions = useMemo(
    () =>
      [...(revisions || [])]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 12),
    [revisions]
  );

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
      {/* Header + title */}
      <div style={{ padding: '16px 18px 0 18px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
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
          padding: '12px 18px 0 18px',
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
                padding: '8px 14px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div style={{ padding: '16px 18px 18px 18px', minWidth: 0 }}>
        {/* ── Tracker Ingestion: timeline ── */}
        {active === 'tracker' && (
          <div role="tabpanel">
            {recentUploads.length === 0 ? (
              <Empty label="No tracker ingestion activity yet." />
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
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
                {recentUploads.map((u, i) => (
                  <li
                    key={u.id ?? i}
                    style={{ position: 'relative', paddingLeft: '26px', paddingBottom: '14px' }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: '2px',
                        top: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        border: '2px solid var(--surface)',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <FileText className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.file_name || u.name || u.tracker_name || 'Tracker upload'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {u.project_name || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {fmtDate(u.uploaded_at)}
                      </span>
                    </div>
                  </li>
                ))}
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
                style={{ height: `${Math.max(220, projects.length * 34 + 60)}px`, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            )}
          </div>
        )}

        {/* ── Budget Timeline: revision timeline + pie ── */}
        {active === 'budget' && (
          <div
            role="tabpanel"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
            }}
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
                  {recentRevisions.map((r, i) => (
                    <li key={r.id ?? i} style={{ position: 'relative', paddingLeft: '26px', paddingBottom: '12px' }}>
                      <span
                        style={{
                          position: 'absolute', left: '2px', top: '2px', width: '12px', height: '12px',
                          borderRadius: '50%', background: STATUS_COLORS[r.status] || '#6366f1', border: '2px solid var(--surface)',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.project_name || 'Project'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.status || ''}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {r.previous_budget != null && r.revised_budget != null
                          ? `${Number(r.previous_budget).toLocaleString()} → ${Number(r.revised_budget).toLocaleString()} · `
                          : ''}
                        {fmtDate(r.created_at)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <SubHead>Revisions by status</SubHead>
              {(!revisions || revisions.length === 0) ? (
                <Empty label="No revision data." />
              ) : (
                <ReactECharts option={budgetPieOption} style={{ height: '240px', width: '100%' }} opts={{ renderer: 'svg' }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local responsive rule for the budget two-up layout */}
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
      letterSpacing: '0.04em',
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
