/**
 * IssuesTab.jsx — Issues Overview (real project names via DB join)
 *
 * - "Issues Overview" (no NCR references)
 * - project_name always populated from enriched issues endpoint
 * - All analytics from real DB data
 */
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../ui/chart';
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, Search, Filter } from 'lucide-react';

function getStatusBadge(status) {
  if (status === 'Closed')      return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900';
  if (status === 'In Progress') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900';
  if (status === 'Open')        return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900';
  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800';
}

function getPriorityBadge(priority) {
  if (priority === 'High' || priority === 'Critical') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900';
  if (priority === 'Medium')  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900';
  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800';
}

export default function IssuesTab({ allIssues = [], issuesLoading, isError, refetchIssues }) {
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sourceFilter,   setSourceFilter]   = useState('All');
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    return allIssues.filter(i => {
      if (statusFilter   !== 'All' && i.status   !== statusFilter)   return false;
      if (priorityFilter !== 'All' && i.priority !== priorityFilter) return false;
      if (sourceFilter   !== 'All' && (i.source || '').toUpperCase() !== sourceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (i.title || '').toLowerCase().includes(q) ||
          (i.owner || '').toLowerCase().includes(q) ||
          (i.project_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allIssues, statusFilter, priorityFilter, sourceFilter, search]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const open   = allIssues.filter(i => i.status === 'Open').length;
  const inProg = allIssues.filter(i => i.status === 'In Progress').length;
  const closed = allIssues.filter(i => i.status === 'Closed').length;
  const high   = allIssues.filter(i => (i.priority === 'High' || i.priority === 'Critical') && i.status !== 'Closed').length;

  // Issue Severity Stacked Bar
  const severityChartData = useMemo(() => {
    const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

    const getBucket = (issue) => {
      const score = issue.severity_score;
      if (score !== undefined && score !== null && score > 0) {
        if (score >= 75) return 'Critical';
        if (score >= 50) return 'High';
        if (score >= 25) return 'Medium';
        return 'Low';
      }
      if (issue.priority === 'High' || issue.priority === 'Critical') return 'High';
      if (issue.priority === 'Medium') return 'Medium';
      return 'Low';
    };

    return SEVERITIES.map(sev => {
      const Open = allIssues.filter(i => getBucket(i) === sev && i.status === 'Open').length;
      const InProgress = allIssues.filter(i => getBucket(i) === sev && i.status === 'In Progress').length;
      const Closed = allIssues.filter(i => getBucket(i) === sev && i.status === 'Closed').length;
      return { severity: sev, Open, "In Progress": InProgress, Closed };
    });
  }, [allIssues]);

  // Resolution Status Pie
  const resolutionPieData = useMemo(() => {
    const counts = { Open: 0, 'In Progress': 0, Closed: 0 };
    allIssues.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });
    return [
      { name: 'Open',        value: counts['Open'],        fill: '#ef4444' },
      { name: 'In Progress', value: counts['In Progress'], fill: '#3b82f6' },
      { name: 'Closed',      value: counts['Closed'],      fill: '#10b981' },
    ].filter(d => d.value > 0);
  }, [allIssues]);

  if (isError) {
    return (
      <div className="ah-card">
        <div className="ah-error-state">
          <AlertTriangle size={24} color="var(--ah-warning)" />
          <h4>Failed to load issues data</h4>
          <button className="ah-retry-btn" onClick={refetchIssues}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ah-fade-up">
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">Quality & Risk</span>
        <h2 className="ah-section-title">Issues Overview</h2>
      </div>

      {/* KPIs */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Issues',  value: allIssues.length, sub: 'across all projects',  icon: <AlertCircle size={16} color="#6366f1" /> },
          { label: 'Open',          value: open,             sub: 'requiring action',      icon: <AlertCircle size={16} color="#ef4444" /> },
          { label: 'In Progress',   value: inProg,           sub: 'being worked on',       icon: <Clock size={16} color="#f59e0b" /> },
          { label: 'High Priority', value: high,             sub: 'critical open issues',  icon: <AlertTriangle size={16} color="#ef4444" /> },
        ].map((k, i) => (
          <div key={i} className="ah-card ah-kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="ah-kpi-label">{k.label}</span>
              {k.icon}
            </div>
            <span className="ah-kpi-value">{k.value}</span>
            <span className="ah-kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      {issuesLoading ? (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-skeleton ah-skeleton-chart" /><div className="ah-skeleton ah-skeleton-chart" />
        </div>
      ) : (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Issue Severity & Status</h3>
            </div>
            <div className="ah-chart-body" style={{ height: 200, padding: 12 }}>
              <ChartContainer
                config={{
                  Open: { label: "Open", color: "#ef4444" },
                  "In Progress": { label: "In Progress", color: "#3b82f6" },
                  Closed: { label: "Closed", color: "#10b981" }
                }}
                className="w-full h-[170px]"
              >
                <BarChart
                  data={severityChartData}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    dataKey="severity"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    width={60}
                    tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="Open"        stackId="a" fill="#ef4444" barSize={12} />
                  <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" barSize={12} />
                  <Bar dataKey="Closed"      stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Resolution Status</h3>
            </div>
            <div className="ah-chart-body" style={{ height: 200, padding: 12 }}>
              {resolutionPieData.length > 0 ? (
                <ChartContainer
                  config={{
                    Open: { label: "Open", color: "#ef4444" },
                    "In Progress": { label: "In Progress", color: "#3b82f6" },
                    Closed: { label: "Closed", color: "#10b981" }
                  }}
                  className="mx-auto w-full h-[170px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={resolutionPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {resolutionPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-slate-400 h-[170px]">No issues to report</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="ah-filter-row" style={{ marginBottom: 14 }}>
        <Filter size={13} color="var(--ah-text-muted)" />
        {['All', 'Open', 'In Progress', 'Closed'].map(s => (
          <button key={s} className={`ah-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--ah-border)', margin: '0 4px' }} />
        {['All', 'High', 'Medium', 'Low'].map(p => (
          <button key={p} className={`ah-chip ${priorityFilter === p ? 'active' : ''}`} onClick={() => { setPriorityFilter(p); setPage(1); }}>{p}</button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ah-text-muted)' }} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title, project, owner..."
            className="ah-search-input animate-all"
            style={{ width: 210 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title">Issues Log</h3>
          <span className="ah-card-meta">{filtered.length} records</span>
        </div>
        {issuesLoading ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="ah-skeleton ah-skeleton-row" />)}
          </div>
        ) : (
          <>
            <div className="ah-table-wrap">
              <table className="ah-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th style={{ textAlign: 'center' }}>Priority</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Owner</th>
                    <th>Source</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ah-text-muted)', padding: 24, fontSize: 12 }}>No issues match the current filters.</td></tr>
                  ) : (
                    paginated.map(issue => (
                      <tr key={issue.id}>
                        <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {issue.title}
                        </td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontWeight: 600, fontSize: 11 }}>
                          {/* project_name always populated from enriched endpoint */}
                          {issue.project_name || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={getPriorityBadge(issue.priority)}>
                            <span className={`w-1.5 h-1.5 rounded-full ${issue.priority === 'High' || issue.priority === 'Critical' ? 'bg-rose-500' : issue.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                            {issue.priority || 'Low'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={getStatusBadge(issue.status)}>
                            <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'Closed' ? 'bg-emerald-500' : issue.status === 'In Progress' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                            {issue.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontSize: 12 }}>{issue.owner || '—'}</td>
                        <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>
                          {(issue.source || '').toUpperCase() || '—'}
                        </td>
                        <td style={{ color: issue.due_date && new Date(issue.due_date) < new Date() && issue.status !== 'Closed' ? 'var(--ah-danger)' : 'var(--ah-text-muted)', fontSize: 11 }}>
                          {issue.due_date ? issue.due_date.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--ah-border)' }}>
                <span style={{ fontSize: 11, color: 'var(--ah-text-muted)' }}>
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--ah-border)', background: 'var(--ah-card)', color: 'var(--ah-text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontSize: 12 }}
                  >← Prev</button>
                  <span style={{ padding: '4px 12px', fontSize: 12, color: 'var(--ah-text-secondary)' }}>{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--ah-border)', background: 'var(--ah-card)', color: 'var(--ah-text-secondary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontSize: 12 }}
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
