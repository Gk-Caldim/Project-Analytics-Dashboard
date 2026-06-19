/**
 * SiteOperationsTab.jsx — Supply Chain Operations Dashboard
 *
 * All data from /dashboard/supply-chain/analytics (budget JSONB Cost Center & Commodity).
 * NO hardcoded site/safety/equipment data.
 */
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../ui/chart';
import { Package, DollarSign, TrendingUp, AlertTriangle, RefreshCw, Layers, Box } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (!val || val === 0) return '₹0';
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(1)}Cr`;
  if (val >= 100_000)   return `₹${(val / 100_000).toFixed(1)}L`;
  if (val >= 1_000)     return `₹${(val / 1_000).toFixed(0)}K`;
  return `₹${Math.round(val).toLocaleString()}`;
}

function getUtilPct(budget, utilized) {
  if (!budget || budget === 0) return 0;
  return Math.min(Math.round((utilized / budget) * 100), 200);
}

function getUtilColor(pct) {
  if (pct > 100) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#10b981';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SupplySkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="ah-skeleton ah-skeleton-kpi" />)}
      </div>
      <div className="ah-chart-grid ah-chart-grid-2">
        <div className="ah-skeleton ah-skeleton-chart" />
        <div className="ah-skeleton ah-skeleton-chart" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="ah-card" style={{ padding: 48, textAlign: 'center' }}>
      <Package size={48} style={{ color: 'var(--ah-text-muted)', margin: '0 auto 16px' }} />
      <h3 style={{ color: 'var(--ah-text-secondary)', fontWeight: 700, marginBottom: 8 }}>No Supply Chain Data</h3>
      <p style={{ color: 'var(--ah-text-muted)', fontSize: 13 }}>
        No budget data found with "Cost Center" or "Commodity" fields.<br />
        Upload budgets with these columns to see supply chain analytics.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SiteOperationsTab({
  supplyChainData,
  supplyChainLoading,
  isError,
  refetchSupplyChain,
}) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('cost_centers'); // 'cost_centers' | 'commodities'

  const kpis = supplyChainData?.kpis || {};
  const projects = supplyChainData?.projects || [];
  const costCenters = supplyChainData?.cost_centers || [];
  const commodities = supplyChainData?.commodities || [];

  // Selected project data
  const selectedProjectData = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find(p => p.project_name === selectedProject) || null;
  }, [selectedProject, projects]);

  // Active detail: show selected project's breakdown, or global breakdown
  const activeCategories = useMemo(() => {
    const source = viewMode === 'cost_centers' ? costCenters : commodities;
    if (selectedProjectData) {
      return viewMode === 'cost_centers'
        ? selectedProjectData.cost_centers
        : selectedProjectData.commodities;
    }
    return source;
  }, [viewMode, costCenters, commodities, selectedProjectData]);

  // Chart data for category breakdown
  const categoryChartData = useMemo(() => {
    return (activeCategories || []).slice(0, 10).map(c => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
      fullName: c.name,
      budget: c.budget,
      utilized: c.utilized,
      utilPct: getUtilPct(c.budget, c.utilized),
    }));
  }, [activeCategories]);

  // Chart data for project comparison bar
  const projectChartData = useMemo(() => {
    return projects.slice(0, 8).map(p => ({
      name: p.project_name.split(' ').slice(0, 2).join(' '),
      fullName: p.project_name,
      budget: p.total_budget,
      utilized: p.total_utilized,
      utilPct: getUtilPct(p.total_budget, p.total_utilized),
    }));
  }, [projects]);

  if (supplyChainLoading) return <SupplySkeleton />;

  if (isError) {
    return (
      <div className="ah-card">
        <div className="ah-error-state">
          <AlertTriangle size={24} color="var(--ah-warning)" />
          <h4>Failed to load supply chain data</h4>
          <button className="ah-retry-btn" onClick={refetchSupplyChain}>Retry</button>
        </div>
      </div>
    );
  }

  if (!supplyChainData || projects.length === 0) return <EmptyState />;

  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="ah-section-eyebrow">BUDGET INTELLIGENCE</span>
          <h2 className="ah-section-title">Supply Chain Operations</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', fontWeight: 700 }}>
            {kpis.projects_with_supply_data} Projects
          </span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
            {kpis.total_cost_centers} Cost Centers
          </span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#d97706', fontWeight: 700 }}>
            {kpis.total_commodities} Commodities
          </span>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          {
            label: 'Total Supply Categories',
            value: kpis.total_supply_categories || 0,
            sub: 'cost centers + commodities',
            Icon: Layers,
            accent: '#6366f1',
          },
          {
            label: 'Total Budget (Supply)',
            value: formatCurrency(kpis.total_budget),
            sub: 'across all projects',
            Icon: DollarSign,
            accent: '#3b82f6',
          },
          {
            label: 'Total Utilized',
            value: formatCurrency(kpis.total_utilized),
            sub: `${kpis.utilization_pct || 0}% utilization`,
            Icon: TrendingUp,
            accent: getUtilColor(kpis.utilization_pct || 0),
          },
          {
            label: 'Projects with Data',
            value: kpis.projects_with_supply_data || 0,
            sub: 'have cost center / commodity data',
            Icon: Package,
            accent: '#10b981',
          },
        ].map((k, i) => (
          <div key={i} className="ah-card ah-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span className="ah-kpi-label">{k.label}</span>
              {k.Icon && <k.Icon size={14} style={{ color: k.accent }} />}
            </div>
            <span className="ah-kpi-value" style={{ color: k.accent }}>{k.value}</span>
            <span className="ah-kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Main Workspace ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Left Panel: Projects List */}
        <div className="ah-card" style={{ height: 'fit-content' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title">Projects</h3>
          </div>
          <div className="ah-site-list">
            {/* All projects option */}
            <div
              onClick={() => setSelectedProject(null)}
              className={`ah-site-item${!selectedProject ? ' active' : ''}`}
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--ah-border)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ah-text-primary)' }}>All Projects</div>
              <div style={{ fontSize: 11, color: 'var(--ah-text-muted)' }}>{projects.length} with supply data</div>
            </div>

            {projects.map((p) => {
              const utilPct = getUtilPct(p.total_budget, p.total_utilized);
              return (
                <div
                  key={p.project_name}
                  onClick={() => setSelectedProject(p.project_name)}
                  className={`ah-site-item${selectedProject === p.project_name ? ' active' : ''}`}
                  style={{ padding: '12px 16px', borderBottom: '1px solid var(--ah-border)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ah-text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                    {p.project_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ah-text-muted)', marginBottom: 6 }}>
                    <span>{p.cost_centers?.length || 0} cost centers</span>
                    <span>{p.commodities?.length || 0} commodities</span>
                  </div>
                  {/* Utilization bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="ah-progress-track" style={{ flex: 1, height: 4 }}>
                      <div
                        className="ah-progress-fill"
                        style={{ width: `${Math.min(utilPct, 100)}%`, background: getUtilColor(utilPct) }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: getUtilColor(utilPct), width: 32, textAlign: 'right' }}>
                      {utilPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ah-text-secondary)' }}>View by:</span>
            {['cost_centers', 'commodities'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid var(--ah-border)',
                  background: viewMode === mode ? '#6366f1' : 'var(--ah-card)',
                  color: viewMode === mode ? '#fff' : 'var(--ah-text-secondary)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {mode === 'cost_centers' ? '🏭 Cost Center' : '📦 Commodity'}
              </button>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Category Budget vs Utilized */}
            <div className="ah-card">
              <div className="ah-card-header">
                <h3 className="ah-card-title">
                  {viewMode === 'cost_centers' ? 'Cost Center' : 'Commodity'} Budget vs Utilized
                </h3>
                {selectedProject && <span className="ah-card-meta">{selectedProject}</span>}
              </div>
              <div className="ah-chart-body" style={{ height: 240, padding: 12 }}>
                {categoryChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      budget:   { label: "Budget",   color: "#3b82f6" },
                      utilized: { label: "Utilized",  color: "#10b981" },
                    }}
                    className="w-full h-[210px]"
                  >
                    <BarChart
                      data={categoryChartData}
                      layout="vertical"
                      margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                      barGap={2}
                    >
                      <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 9 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        width={90}
                        tick={{ fontSize: 9, fill: "var(--ah-text-secondary)", fontWeight: 600 }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="budget"   fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={7} />
                      <Bar dataKey="utilized" fill="#10b981" radius={[0, 3, 3, 0]} barSize={7} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="ah-error-state" style={{ height: 210 }}>
                    <p>No {viewMode === 'cost_centers' ? 'cost center' : 'commodity'} data for {selectedProject || 'any project'}.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Project-wise Supply Spend */}
            <div className="ah-card">
              <div className="ah-card-header">
                <h3 className="ah-card-title">Project-wise Supply Spend</h3>
              </div>
              <div className="ah-chart-body" style={{ height: 240, padding: 12 }}>
                {projectChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      budget:   { label: "Total Budget",  color: "#6366f1" },
                      utilized: { label: "Total Utilized", color: "#f59e0b" },
                    }}
                    className="w-full h-[210px]"
                  >
                    <BarChart
                      data={projectChartData}
                      layout="vertical"
                      margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                      barGap={2}
                    >
                      <XAxis type="number" tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 9 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        width={90}
                        tick={{ fontSize: 9, fill: "var(--ah-text-secondary)", fontWeight: 600 }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="budget"   fill="#6366f1" radius={[0, 3, 3, 0]} barSize={7} />
                      <Bar dataKey="utilized" fill="#f59e0b" radius={[0, 3, 3, 0]} barSize={7} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="ah-error-state" style={{ height: 210 }}><p>No project data.</p></div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Table */}
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">
                {viewMode === 'cost_centers' ? 'Cost Center' : 'Commodity'} Detail
              </h3>
              <span className="ah-card-meta">
                {selectedProject ? selectedProject : 'All Projects'} · {(activeCategories || []).length} categories
              </span>
            </div>
            <div className="ah-table-wrap">
              <table className="ah-table">
                <thead>
                  <tr>
                    <th>{viewMode === 'cost_centers' ? 'Cost Center' : 'Commodity'}</th>
                    {!selectedProject && <th>Project</th>}
                    <th style={{ textAlign: 'right' }}>Budget</th>
                    <th style={{ textAlign: 'right' }}>Utilized</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeCategories || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ah-text-muted)', padding: 24, fontSize: 12 }}>
                        No data for selected view.
                      </td>
                    </tr>
                  ) : (
                    (activeCategories || []).slice(0, 30).map((cat, i) => {
                      const utilPct = getUtilPct(cat.budget, cat.utilized);
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cat.name}
                          </td>
                          {!selectedProject && (
                            <td style={{ color: 'var(--ah-text-secondary)', fontSize: 11 }}>—</td>
                          )}
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ah-text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                            {formatCurrency(cat.budget)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: getUtilColor(utilPct), fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                            {formatCurrency(cat.utilized)}
                          </td>
                          <td style={{ minWidth: 120 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div className="ah-progress-track" style={{ flex: 1, height: 5 }}>
                                <div
                                  className="ah-progress-fill"
                                  style={{ width: `${Math.min(utilPct, 100)}%`, background: getUtilColor(utilPct) }}
                                />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: getUtilColor(utilPct), width: 36, textAlign: 'right' }}>
                                {utilPct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
