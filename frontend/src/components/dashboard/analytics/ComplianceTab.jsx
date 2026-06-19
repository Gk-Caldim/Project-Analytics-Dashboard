/**
 * ComplianceTab.jsx — Trackers Analytics
 *
 * Shows real tracker metadata from /dashboard/trackers/analytics:
 * - Manual trackers (Upload.industry == 'MANUAL') and uploaded trackers
 * - Grouped by project, type (Manual vs Uploaded), status
 * - Excludes drafts
 * - NO hardcoded data
 */
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../ui/chart';
import { FileText, Upload, PenLine, CheckCircle2, AlertTriangle, Search, Filter } from 'lucide-react';

// ── Badge helpers ─────────────────────────────────────────────────────────────
function getTypeBadge(type) {
  if (type === 'Manual')   return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100';
  if (type === 'Uploaded') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100';
  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100';
}

function getStatusBadge(status) {
  if (status === 'Completed')  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100';
  if (status === 'Processing') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100';
  if (status === 'Failed')     return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100';
  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TrackerSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="ah-skeleton ah-skeleton-kpi" />)}
      </div>
      <div className="ah-chart-grid ah-chart-grid-2">
        <div className="ah-skeleton ah-skeleton-chart" />
        <div className="ah-skeleton ah-skeleton-chart" />
      </div>
      <div className="ah-skeleton ah-skeleton-chart" />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="ah-card" style={{ padding: 48, textAlign: 'center' }}>
      <FileText size={48} style={{ color: 'var(--ah-text-muted)', margin: '0 auto 16px' }} />
      <h3 style={{ color: 'var(--ah-text-secondary)', fontWeight: 700, marginBottom: 8 }}>No Trackers Found</h3>
      <p style={{ color: 'var(--ah-text-muted)', fontSize: 13 }}>
        No completed or published trackers exist yet.<br />
        Upload or create trackers in any project to see analytics here.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ComplianceTab({
  trackersAnalytics,
  trackersLoading,
  isError,
  refetchTrackers,
}) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch]         = useState('');

  const kpis       = trackersAnalytics?.kpis      || {};
  const trackers   = trackersAnalytics?.trackers  || [];
  const byProject  = trackersAnalytics?.by_project || [];
  const byStatus   = trackersAnalytics?.by_status  || [];

  // Filtered tracker list
  const filteredTrackers = useMemo(() => {
    return trackers.filter(t => {
      if (typeFilter !== 'All' && t.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (t.tracker_name || '').toLowerCase().includes(q) ||
          (t.project_name || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trackers, typeFilter, search]);

  // Chart: Trackers by Project (Manual vs Uploaded)
  const projectChartData = useMemo(() => {
    return byProject.slice(0, 10).map(p => ({
      name: p.project.length > 18 ? p.project.slice(0, 18) + '…' : p.project,
      manual: p.manual,
      uploaded: p.uploaded,
    }));
  }, [byProject]);

  // Chart: Status distribution pie
  const statusPieData = useMemo(() => {
    const COLORS = {
      Completed:  '#10b981',
      Processing: '#f59e0b',
      Failed:     '#ef4444',
    };
    return byStatus
      .filter(s => s.status !== 'Draft')
      .map(s => ({
        name: s.status,
        value: s.count,
        fill: COLORS[s.status] || '#94a3b8',
      }));
  }, [byStatus]);

  if (trackersLoading) return <TrackerSkeleton />;

  if (isError) {
    return (
      <div className="ah-card">
        <div className="ah-error-state">
          <AlertTriangle size={24} color="var(--ah-warning)" />
          <h4>Failed to load tracker analytics</h4>
          <button className="ah-retry-btn" onClick={refetchTrackers}>Retry</button>
        </div>
      </div>
    );
  }

  if (!trackersAnalytics || trackers.length === 0) return <EmptyState />;

  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">DATA MANAGEMENT</span>
        <h2 className="ah-section-title">Trackers Analytics</h2>
      </div>

      {/* ── KPIs ── */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          {
            label: 'Total Trackers',
            value: kpis.total_trackers || 0,
            sub: 'manual + uploaded',
            Icon: FileText,
            accent: '#6366f1',
          },
          {
            label: 'Manual Trackers',
            value: kpis.manual_trackers || 0,
            sub: 'created in-app',
            Icon: PenLine,
            accent: '#8b5cf6',
          },
          {
            label: 'Uploaded Trackers',
            value: kpis.uploaded_trackers || 0,
            sub: 'from Excel files',
            Icon: Upload,
            accent: '#3b82f6',
          },
          {
            label: 'Active Projects',
            value: kpis.active_projects || 0,
            sub: 'with tracker data',
            Icon: CheckCircle2,
            accent: '#10b981',
          },
        ].map((k, i) => (
          <div key={i} className="ah-card ah-kpi-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span className="ah-kpi-label">{k.label}</span>
              <k.Icon size={14} style={{ color: k.accent }} />
            </div>
            <span className="ah-kpi-value" style={{ color: k.accent }}>{k.value}</span>
            <span className="ah-kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
        {/* Trackers by Project */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Trackers by Project</h3>
            <span className="ah-card-meta">manual vs uploaded</span>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12 }}>
            {projectChartData.length > 0 ? (
              <ChartContainer
                config={{
                  manual:   { label: "Manual",   color: "#8b5cf6" },
                  uploaded: { label: "Uploaded", color: "#3b82f6" },
                }}
                className="w-full h-[180px]"
              >
                <BarChart
                  data={projectChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  barGap={2}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    width={100}
                    tick={{ fontSize: 9, fill: "var(--ah-text-secondary)", fontWeight: 600 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="manual"   fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={8} />
                  <Bar dataKey="uploaded" fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={8} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="ah-error-state" style={{ height: 180 }}><p>No project data.</p></div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Tracker Status Distribution</h3>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12, display: 'flex', justifyContent: 'center' }}>
            {statusPieData.length > 0 ? (
              <ChartContainer
                config={{
                  Completed:  { label: "Completed",  color: "#10b981" },
                  Processing: { label: "Processing", color: "#f59e0b" },
                  Failed:     { label: "Failed",     color: "#ef4444" },
                }}
                className="mx-auto w-full h-[180px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center text-xs text-slate-400 h-[180px]">No status data</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="ah-filter-row" style={{ marginBottom: 14 }}>
        <Filter size={13} color="var(--ah-text-muted)" />
        {['All', 'Manual', 'Uploaded'].map(t => (
          <button
            key={t}
            className={`ah-chip ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t}
          </button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ah-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tracker, project..."
            className="ah-search-input"
            style={{ width: 200 }}
          />
        </div>
      </div>

      {/* ── Trackers Table ── */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title">Tracker Registry</h3>
          <span className="ah-card-meta">{filteredTrackers.length} trackers</span>
        </div>
        <div className="ah-table-wrap">
          <table className="ah-table">
            <thead>
              <tr>
                <th>Tracker Name</th>
                <th>Project</th>
                <th>Type</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Rows</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Uploaded By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrackers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--ah-text-muted)', padding: 24, fontSize: 12 }}>
                    No trackers match the current filters.
                  </td>
                </tr>
              ) : (
                filteredTrackers.slice(0, 50).map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.tracker_name}
                    </td>
                    <td style={{ color: 'var(--ah-text-secondary)', fontWeight: 600, fontSize: 11 }}>
                      {t.project_name}
                    </td>
                    <td>
                      <span className={getTypeBadge(t.type)}>
                        {t.type === 'Manual' ? '✏️' : '📤'} {t.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>{t.department || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ah-text-secondary)' }}>
                      {(t.valid_row_count || t.row_count || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={getStatusBadge(t.status)}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          t.status === 'Completed' ? 'bg-emerald-500' :
                          t.status === 'Processing' ? 'bg-amber-500' :
                          t.status === 'Failed' ? 'bg-rose-500' : 'bg-slate-400'
                        }`} />
                        {t.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ah-text-secondary)', fontSize: 12 }}>{t.uploaded_by || '—'}</td>
                    <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>{t.uploaded_at || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
