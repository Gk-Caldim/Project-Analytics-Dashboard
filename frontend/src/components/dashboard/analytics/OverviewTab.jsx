/**
 * OverviewTab.jsx — Real-data Overview Tab (Recharts version)
 *
 * Replaces legacy ECharts with modern premium Recharts components.
 */
import React, { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { 
  RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowUp, ArrowDown,
  LayoutDashboard, AlertCircle, MapPin, Wallet 
} from 'lucide-react';
import PortfolioHealthMatrix from '../PortfolioHealthMatrix';

// ── Skeleton Components ────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="ah-kpi-grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="ah-skeleton ah-skeleton-kpi" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="ah-skeleton ah-skeleton-chart" />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, delta, deltaType = 'neutral', colorClass = '', Icon }) {
  const DeltaIcon = deltaType === 'up' ? ArrowUp : deltaType === 'down' ? ArrowDown : null;
  const deltaColor = deltaType === 'up' ? 'ah-delta-up' : deltaType === 'down' ? 'ah-delta-down' : 'ah-delta-neutral';

  return (
    <div className="ah-card ah-kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span className="ah-kpi-label">{label}</span>
          {Icon && <Icon size={14} style={{ color: 'var(--ah-text-muted)' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className={`ah-kpi-value ${colorClass}`}>{value}</span>
          {delta && (
            <span className={`ah-kpi-delta ${deltaColor}`}>
              {DeltaIcon && <DeltaIcon size={10} strokeWidth={3} />} {delta}
            </span>
          )}
        </div>
      </div>
      {sub && <span className="ah-kpi-sub" style={{ marginTop: 4 }}>{sub}</span>}
    </div>
  );
}

// ── Error State ────────────────────────────────────────────────────────────
function ErrorState({ onRetry }) {
  return (
    <div className="ah-card" style={{ marginBottom: 16 }}>
      <div className="ah-error-state">
        <AlertTriangle size={24} color="var(--ah-warning)" />
        <h4>Failed to load overview data</h4>
        <p>The backend may be starting up. Please retry in a moment.</p>
        <button className="ah-retry-btn" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}

export default function OverviewTab({
  projectsSummary,
  analyticsData,
  structures,
  allIssues,
  budgetRevisions,
  summaryLoading,
  analyticsLoading,
  isError,
  refetchAll,
  onProjectSelect,
}) {
  // ── Derived KPIs from real data ──
  const kpis = useMemo(() => {
    const total       = projectsSummary.length;
    const critical    = projectsSummary.filter(p => p.project_health === 'Red').length;
    const atRisk      = projectsSummary.filter(p => p.project_health === 'Yellow').length;
    const onTrack     = projectsSummary.filter(p => p.project_health === 'Green').length;
    const totalDelayed = projectsSummary.reduce((s, p) => s + (p.delayed || 0), 0);
    const totalMilestones = projectsSummary.reduce((s, p) => s + (p.completed || 0) + (p.delayed || 0) + (p.pending || 0), 0);
    const openIssues  = allIssues.filter(i => i.status !== 'Closed').length;
    const highIssues  = allIssues.filter(i => i.priority === 'High' && i.status !== 'Closed').length;
    const pendingRevisions = budgetRevisions.filter(r =>
      r.status === 'Pending Head' || r.status === 'Pending Finance'
    ).length;

    return [
      { label: 'Total Projects',    value: total,           sub: 'in portfolio',           deltaType: 'neutral', colorClass: '', Icon: LayoutDashboard },
      { label: 'Critical (Red)',    value: critical,        sub: 'needs immediate action', deltaType: critical > 0 ? 'down' : 'neutral', colorClass: critical > 0 ? '' : '', Icon: AlertTriangle },
      { label: 'At Risk (Yellow)',  value: atRisk,          sub: 'monitor closely',        deltaType: 'neutral', Icon: Clock },
      { label: 'On Track',         value: onTrack,         sub: `of ${total} projects`,   deltaType: 'neutral', Icon: CheckCircle2 },
      { label: 'Delayed Milestones',value: totalDelayed,   sub: `of ${totalMilestones} total`, deltaType: totalDelayed > 0 ? 'down' : 'neutral', Icon: Clock },
      { label: 'Open Issues',      value: openIssues,      sub: `${highIssues} high priority`, deltaType: openIssues > 0 ? 'down' : 'neutral', Icon: AlertCircle },
      { label: 'Budget Revisions', value: pendingRevisions, sub: 'pending approval',       deltaType: 'neutral', Icon: Wallet },
      { label: 'Sites',            value: structures.length, sub: 'active trackers',       deltaType: 'neutral', Icon: MapPin },
    ];
  }, [projectsSummary, allIssues, budgetRevisions, structures]);

  // Data for Health distribution Recharts Pie
  const healthPieData = useMemo(() => {
    const red    = projectsSummary.filter(p => p.project_health === 'Red').length;
    const yellow = projectsSummary.filter(p => p.project_health === 'Yellow').length;
    const green  = projectsSummary.filter(p => p.project_health === 'Green').length;

    return [
      { name: 'Critical', value: red, fill: '#ef4444' },
      { name: 'At Risk', value: yellow, fill: '#f59e0b' },
      { name: 'On Track', value: green, fill: '#10b981' },
    ].filter(d => d.value > 0);
  }, [projectsSummary]);

  // Data for Delayed Milestones Recharts Bar
  const milestoneBarData = useMemo(() => {
    return [...projectsSummary]
      .sort((a, b) => (b.delayed || 0) - (a.delayed || 0))
      .slice(0, 8)
      .map(p => {
        const delayedVal = p.delayed || 0;
        let color = '#6366f1';
        if (delayedVal > 5) color = '#ef4444';
        else if (delayedVal > 2) color = '#f59e0b';
        return {
          name: (p.project_name || '').split(' ').slice(0, 2).join(' '),
          delayed: delayedVal,
          fill: color,
        };
      });
  }, [projectsSummary]);

  // issuesMap for PortfolioHealthMatrix
  const issuesMap = useMemo(() => {
    const map = {};
    allIssues.forEach(issue => {
      const pid = issue.project_id;
      if (!map[pid]) map[pid] = [];
      map[pid].push(issue);
    });
    return map;
  }, [allIssues]);

  // budgetsMap for PortfolioHealthMatrix
  const budgetsMap = useMemo(() => {
    const map = {};
    structures.forEach(s => {
      map[s.project_name] = {
        overall_budget: s.budget || 0,
        spent: s.utilized_budget || 0,
        balance: s.balance_budget || 0,
      };
    });
    return map;
  }, [structures]);

  if (isError) return <ErrorState onRetry={refetchAll} />;

  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">PORTFOLIO COMMAND</span>
        <h2 className="ah-section-title">Overview Dashboard</h2>
      </div>

      {/* ── KPI Grid ── */}
      {summaryLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="ah-kpi-grid">
          {kpis.map((k, i) => (
            <KpiCard key={i} {...k} />
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      {summaryLoading || analyticsLoading ? (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <ChartSkeleton /><ChartSkeleton />
        </div>
      ) : projectsSummary.length > 0 ? (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          {/* Health Donut */}
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Portfolio Health Distribution</h3>
            </div>
            <div className="ah-chart-body" style={{ height: 220, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {healthPieData.length > 0 ? (
                <ChartContainer
                  config={{
                    Critical: { label: "Critical", color: "#ef4444" },
                    "At Risk": { label: "At Risk", color: "#f59e0b" },
                    "On Track": { label: "On Track", color: "#10b981" }
                  }}
                  className="mx-auto w-full h-[180px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={healthPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {healthPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-slate-400 h-[180px]">No data available</div>
              )}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, padding: '0 16px 14px', flexWrap: 'wrap' }}>
              {[
                { color: '#ef4444', label: 'Critical', count: projectsSummary.filter(p => p.project_health === 'Red').length },
                { color: '#f59e0b', label: 'At Risk',  count: projectsSummary.filter(p => p.project_health === 'Yellow').length },
                { color: '#10b981', label: 'On Track', count: projectsSummary.filter(p => p.project_health === 'Green').length },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--ah-text-secondary)' }}>{l.label}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ah-text-primary)' }}>{l.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delayed Milestones Bar */}
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Delayed Milestones by Project</h3>
            </div>
            <div className="ah-chart-body" style={{ height: 220, padding: 12 }}>
              {milestoneBarData.length > 0 ? (
                <ChartContainer
                  config={{
                    delayed: { label: "Delayed Milestones", color: "#6366f1" }
                  }}
                  className="w-full h-[180px]"
                >
                  <BarChart
                    data={milestoneBarData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={100}
                      tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="delayed" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-slate-400 h-[180px]">No delays recorded</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Portfolio Health Matrix (UNTOUCHED — fed real data) ── */}
      <div className="ah-card" style={{ marginBottom: 16 }}>
        <div className="ah-card-header">
          <h3 className="ah-card-title">Portfolio Health Matrix</h3>
          <span className="ah-card-meta">Real-time · auto-refreshes every 30s</span>
        </div>
        <PortfolioHealthMatrix
          projectsSummary={projectsSummary}
          structures={structures}
          onProjectSelect={onProjectSelect}
          issuesMap={issuesMap}
          budgetsMap={budgetsMap}
          analyticsData={analyticsData}
          isPM={false}
        />
      </div>
    </div>
  );
}
