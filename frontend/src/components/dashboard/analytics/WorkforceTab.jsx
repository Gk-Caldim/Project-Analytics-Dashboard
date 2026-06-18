/**
 * WorkforceTab.jsx — Workforce Analytics (Real allocation data)
 *
 * Uses workforceData from /dashboard/workforce/enriched:
 * - employees + EmployeeProjectMap allocations + milestone assignment counts
 * No hardcoded data.
 */
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { Users, AlertTriangle, Search, UserCheck, UserX, Activity } from 'lucide-react';

export default function WorkforceTab({
  employees = [],
  workforceData,
  analyticsData,
  employeesLoading,
  analyticsLoading,
  isError,
  refetchEmployees,
}) {
  const [search, setSearch] = useState('');

  // Use workforceData if available, fall back to employees + analyticsData
  const enrichedEmployees = useMemo(() => {
    if (workforceData?.employees?.length) return workforceData.employees;
    // Fallback: construct from raw employees
    return employees.map(e => ({
      employee_id: e.employee_id,
      name: e.name,
      email: e.email,
      role: e.role,
      department: e.department,
      status: e.status,
      total_allocation_pct: 0,
      project_count: 0,
      milestone_assignments: 0,
      allocations: [],
    }));
  }, [workforceData, employees]);

  const kpis = workforceData?.kpis || {
    total_employees: employees.length,
    allocated_employees: 0,
    overloaded: 0,
    unallocated: employees.length,
    well_utilized: 0,
  };

  const roleBreakdown = workforceData?.role_breakdown || (() => {
    const roleCounts = {};
    employees.forEach(e => {
      const role = e.role || 'Other';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    return Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ role, count }));
  })();

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return enrichedEmployees;
    const q = search.toLowerCase();
    return enrichedEmployees.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.employee_id || '').toLowerCase().includes(q)
    );
  }, [enrichedEmployees, search]);

  // Utilization chart — top 12 by allocation %
  const utilizationChartData = useMemo(() => {
    return [...enrichedEmployees]
      .filter(e => e.total_allocation_pct > 0)
      .sort((a, b) => b.total_allocation_pct - a.total_allocation_pct)
      .slice(0, 12)
      .map(e => {
        let color = '#3b82f6';
        if (e.total_allocation_pct > 100) color = '#ef4444';
        else if (e.total_allocation_pct >= 80) color = '#f59e0b';
        return {
          name: (e.name || e.employee_id || '').split(' ')[0],
          allocation: e.total_allocation_pct,
          fill: color,
        };
      });
  }, [enrichedEmployees]);

  // Role breakdown chart
  const roleChartData = useMemo(() => {
    return roleBreakdown.slice(0, 8).map(r => ({
      role: r.role,
      count: r.count,
      fill: '#6366f1',
    }));
  }, [roleBreakdown]);

  if (isError) {
    return (
      <div className="ah-card">
        <div className="ah-error-state">
          <AlertTriangle size={24} color="var(--ah-warning)" />
          <h4>Failed to load workforce data</h4>
          <button className="ah-retry-btn" onClick={refetchEmployees}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ah-fade-up">
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">Human Capital</span>
        <h2 className="ah-section-title">Workforce Analytics</h2>
      </div>

      {/* KPIs */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Employees', value: kpis.total_employees, sub: 'in system',            Icon: Users,      accent: '#6366f1' },
          { label: 'Allocated',       value: kpis.allocated_employees, sub: 'assigned to projects', Icon: UserCheck, accent: '#10b981' },
          { label: 'Overloaded',      value: kpis.overloaded,    sub: '>100% allocation',       Icon: AlertTriangle, accent: '#ef4444' },
          { label: 'Unallocated',     value: kpis.unallocated,   sub: 'no project assignment',  Icon: UserX,      accent: '#f59e0b' },
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

      {/* Charts */}
      {employeesLoading || analyticsLoading ? (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-skeleton ah-skeleton-chart" />
          <div className="ah-skeleton ah-skeleton-chart" />
        </div>
      ) : (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Allocation % by Employee</h3>
              <span className="ah-card-meta">from project allocations</span>
            </div>
            <div className="ah-chart-body" style={{ height: 240, padding: 12 }}>
              {utilizationChartData.length > 0 ? (
                <ChartContainer
                  config={{ allocation: { label: "Allocation %", color: "#3b82f6" } }}
                  className="w-full h-[210px]"
                >
                  <BarChart
                    data={utilizationChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 120]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={65}
                      tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={v => `${v}%`} />
                    <Bar dataKey="allocation" radius={[0, 3, 3, 0]} barSize={8}>
                      {utilizationChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="ah-error-state" style={{ height: 210 }}>
                  <p>No allocation data yet. Assign employees to projects to see utilization.</p>
                </div>
              )}
            </div>
          </div>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Employees by Role</h3>
            </div>
            <div className="ah-chart-body" style={{ height: 240, padding: 12 }}>
              {roleChartData.length > 0 ? (
                <ChartContainer
                  config={{ count: { label: "Employees", color: "#6366f1" } }}
                  className="w-full h-[210px]"
                >
                  <BarChart
                    data={roleChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="role"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={90}
                      tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} barSize={12} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="ah-error-state" style={{ height: 210 }}><p>No employee data yet.</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Table */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title">Employee Directory</h3>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ah-text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, role..."
              className="ah-search-input"
            />
          </div>
        </div>

        {employeesLoading ? (
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="ah-skeleton ah-skeleton-row" />)}
          </div>
        ) : (
          <div className="ah-table-wrap">
            <table className="ah-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Projects</th>
                  <th>Allocation</th>
                  <th>Milestones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--ah-text-muted)', padding: 24, fontSize: 12 }}>No employees found.</td></tr>
                ) : (
                  filteredEmployees.slice(0, 50).map((emp, i) => {
                    const utilPct = emp.total_allocation_pct || 0;
                    return (
                      <tr key={emp.employee_id || i}>
                        <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ah-text-primary)', fontSize: 11 }}>
                          {emp.employee_id}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)' }}>{emp.name || '—'}</td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontWeight: 500 }}>{emp.role || '—'}</td>
                        <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>{emp.department || '—'}</td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontSize: 12, fontWeight: 600 }}>
                          {emp.project_count > 0 ? (
                            <span style={{
                              background: '#ede9fe', color: '#7c3aed',
                              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700
                            }}>
                              {emp.project_count} project{emp.project_count !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          {utilPct > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                              <div className="ah-progress-track" style={{ flex: 1, height: 5 }}>
                                <div
                                  className="ah-progress-fill"
                                  style={{
                                    width: `${Math.min(utilPct, 100)}%`,
                                    background: utilPct > 100 ? '#ef4444' : utilPct >= 80 ? '#f59e0b' : '#10b981',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: utilPct > 100 ? '#ef4444' : 'var(--ah-text-secondary)', width: 36, textAlign: 'right' }}>
                                {utilPct}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ah-text-muted)' }}>Unallocated</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontSize: 12 }}>
                          {emp.milestone_assignments > 0 ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Activity size={11} style={{ color: '#6366f1' }} />
                              {emp.milestone_assignments}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ah-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
