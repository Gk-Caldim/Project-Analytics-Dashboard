/**
 * OverviewTab.jsx — Real-data Overview Tab (Recharts version)
 *
 * KPI Cards (5 only):
 *   Total Projects | Delayed Milestones | Open Issues | Pending Budget Revisions | Budgets Exceeding Utilization
 *
 * Charts:
 *   "Projects and Criticality Level" (pie based on critical issue count per project)
 *   "Delayed Milestones by Project" (bar chart from real projectsSummary)
 */
import React, { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import {
  RefreshCw, TrendingUp, AlertTriangle,
  LayoutDashboard, AlertCircle, Clock, Wallet, TrendingDown,
} from 'lucide-react';
import PortfolioHealthMatrix from '../PortfolioHealthMatrix';

// ── Skeleton Components ────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="ah-skeleton ah-skeleton-kpi" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="ah-skeleton ah-skeleton-chart" />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, colorClass = '', Icon, accent }) {
  return (
    <div className="ah-card ah-kpi-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span className="ah-kpi-label">{label}</span>
          {Icon && <Icon size={14} style={{ color: accent || 'var(--ah-text-muted)' }} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className={`ah-kpi-value ${colorClass}`} style={accent ? { color: accent } : {}}>{value}</span>
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
  overviewKpis,
  summaryLoading,
  analyticsLoading,
  isError,
  refetchAll,
  onProjectSelect,
}) {

  // ── 5 KPIs from overviewKpis (real backend data) ──
  const kpis = useMemo(() => {
    if (overviewKpis) {
      return [
        {
          label: 'Total Projects',
          value: overviewKpis.total_projects,
          sub: 'in portfolio',
          Icon: LayoutDashboard,
          accent: '#6366f1',
        },
        {
          label: 'Delayed Milestones',
          value: overviewKpis.delayed_milestones,
          sub: 'across all projects',
          Icon: Clock,
          accent: overviewKpis.delayed_milestones > 0 ? '#f59e0b' : '#10b981',
        },
        {
          label: 'Open Issues',
          value: overviewKpis.open_issues,
          sub: 'requiring attention',
          Icon: AlertCircle,
          accent: overviewKpis.open_issues > 0 ? '#ef4444' : '#10b981',
        },
        {
          label: 'Pending Budget Revisions',
          value: overviewKpis.pending_budget_revisions,
          sub: 'pending approval',
          Icon: Wallet,
          accent: overviewKpis.pending_budget_revisions > 0 ? '#f59e0b' : '#10b981',
        },
        {
          label: 'Budgets Exceeding Utilization',
          value: overviewKpis.budgets_exceeding_utilization,
          sub: 'utilized > approved',
          Icon: TrendingDown,
          accent: overviewKpis.budgets_exceeding_utilization > 0 ? '#ef4444' : '#10b981',
        },
      ];
    }

    // Fallback: compute from available data while loading
    const total = projectsSummary.length;
    const totalDelayed = projectsSummary.reduce((s, p) => s + (p.delayed || 0), 0);
    const openIssues = allIssues.filter(i => i.status !== 'Closed').length;
    const pendingRevisions = budgetRevisions.filter(r =>
      r.status === 'Pending Head' || r.status === 'Pending Finance'
    ).length;

    return [
      { label: 'Total Projects',              value: total,            sub: 'in portfolio',       Icon: LayoutDashboard, accent: '#6366f1' },
      { label: 'Delayed Milestones',          value: totalDelayed,     sub: 'across all projects', Icon: Clock,          accent: totalDelayed > 0 ? '#f59e0b' : '#10b981' },
      { label: 'Open Issues',                 value: openIssues,       sub: 'requiring attention', Icon: AlertCircle,    accent: openIssues > 0 ? '#ef4444' : '#10b981' },
      { label: 'Pending Budget Revisions',    value: pendingRevisions, sub: 'pending approval',    Icon: Wallet,         accent: pendingRevisions > 0 ? '#f59e0b' : '#10b981' },
      { label: 'Budgets Exceeding Utilization', value: '—',           sub: 'loading...',           Icon: TrendingDown,   accent: '#94a3b8' },
    ];
  }, [overviewKpis, projectsSummary, allIssues, budgetRevisions]);

  // ── Projects and Criticality Level Pie ──
  // Derived from critical issue count per project (not health color)
  const criticalityPieData = useMemo(() => {
    if (!allIssues.length && !projectsSummary.length) return [];

    // Count critical/high issues per project
    const criticalProjects = new Set();
    const moderateProjects = new Set();

    allIssues.forEach(issue => {
      if (issue.priority === 'High' || issue.priority === 'Critical') {
        if (issue.status !== 'Closed') criticalProjects.add(issue.project_id);
      } else if (issue.priority === 'Medium') {
        if (issue.status !== 'Closed' && !criticalProjects.has(issue.project_id)) {
          moderateProjects.add(issue.project_id);
        }
      }
    });

    const criticalCount = criticalProjects.size;
    const moderateCount = [...moderateProjects].filter(p => !criticalProjects.has(p)).length;
    const totalProjects = projectsSummary.length;
    const lowCount = Math.max(0, totalProjects - criticalCount - moderateCount);

    return [
      { name: 'Critical Issues', value: criticalCount, fill: '#ef4444' },
      { name: 'Moderate Issues', value: moderateCount, fill: '#f59e0b' },
      { name: 'Low / No Issues', value: lowCount,      fill: '#10b981' },
    ].filter(d => d.value > 0);
  }, [allIssues, projectsSummary]);

  // ── Delayed Milestones Bar Chart (real project names) ──
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
          name: (p.project_name || p.name || '').split(' ').slice(0, 2).join(' '),
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

      {/* ── KPI Grid (5 cards) ── */}
      {summaryLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
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
          {/* Projects and Criticality Level Donut */}
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Projects and Criticality Level</h3>
              <span className="ah-card-meta">by open issue severity</span>
            </div>
            <div className="ah-chart-body" style={{ height: 220, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {criticalityPieData.length > 0 ? (
                <ChartContainer
                  config={{
                    'Critical Issues': { label: "Critical", color: "#ef4444" },
                    'Moderate Issues': { label: "Moderate", color: "#f59e0b" },
                    'Low / No Issues': { label: "Low / None", color: "#10b981" },
                  }}
                  className="mx-auto w-full h-[180px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={criticalityPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {criticalityPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-slate-400 h-[180px]">No issue data available</div>
              )}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, padding: '0 16px 14px', flexWrap: 'wrap' }}>
              {[
                { color: '#ef4444', label: 'Critical Issues' },
                { color: '#f59e0b', label: 'Moderate Issues' },
                { color: '#10b981', label: 'Low / No Issues' },
              ].map(l => {
                const item = criticalityPieData.find(d => d.name === l.label);
                return (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--ah-text-secondary)' }}>{l.label}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--ah-text-primary)' }}>{item?.value ?? 0}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delayed Milestones Bar */}
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Delayed Milestones by Project</h3>
              <span className="ah-card-meta">top 8 projects</span>
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
                    <Bar dataKey="delayed" radius={[0, 4, 4, 0]} barSize={12}>
                      {milestoneBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-slate-400 h-[180px]">No delays recorded</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Portfolio Health Matrix ── */}
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
