/**
 * WorkforceTab.jsx — Real-data Workforce Tab (Recharts version)
 */
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { Users, AlertTriangle, Search } from 'lucide-react';

export default function WorkforceTab({
  employees = [],
  analyticsData,
  employeesLoading,
  analyticsLoading,
  isError,
  refetchEmployees,
}) {
  const [search, setSearch] = useState('');

  const resourceUtilization = analyticsData?.resource_utilization || [];

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.employee_id || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  // Data for Resource Utilization Recharts Bar Chart
  const utilizationChartData = useMemo(() => {
    return [...resourceUtilization]
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 12)
      .map(e => {
        let color = '#3b82f6';
        if (e.utilization > e.availability) color = '#ef4444';
        else if (e.utilization >= e.availability * 0.8) color = '#f59e0b';
        
        return {
          name: e.name?.split(' ')[0] || e.employee_id,
          utilization: e.utilization,
          availability: e.availability,
          fill: color
        };
      });
  }, [resourceUtilization]);

  // Data for Employees by Role Recharts Bar Chart
  const roleChartData = useMemo(() => {
    const roleCounts = {};
    employees.forEach(e => {
      const role = e.role || 'Other';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    return Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, count]) => ({
        role,
        count,
        fill: '#6366f1'
      }));
  }, [employees]);

  const overloaded = resourceUtilization.filter(e => e.utilization > e.availability).length;
  const wellUtilized = resourceUtilization.filter(e => e.utilization >= e.availability * 0.6 && e.utilization <= e.availability).length;

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
          { label: 'Total Employees', value: employees.length, sub: 'in system' },
          { label: 'Tracked Members', value: resourceUtilization.length, sub: 'with assignments' },
          { label: 'Overloaded',      value: overloaded,    sub: '> 8h/day avg' },
          { label: 'Well Utilised',   value: wellUtilized,  sub: '60–100% capacity' },
        ].map((k, i) => (
          <div key={i} className="ah-card ah-kpi-card">
            <span className="ah-kpi-label">{k.label}</span>
            <span className="ah-kpi-value">{k.value}</span>
            <span className="ah-kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      {analyticsLoading || employeesLoading ? (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-skeleton ah-skeleton-chart" />
          <div className="ah-skeleton ah-skeleton-chart" />
        </div>
      ) : (
        <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
          <div className="ah-card">
            <div className="ah-card-header">
              <h3 className="ah-card-title">Resource Utilization (h/day)</h3>
              <span className="ah-card-meta">vs availability</span>
            </div>
            <div className="ah-chart-body" style={{ height: 240, padding: 12 }}>
              {utilizationChartData.length > 0 ? (
                <ChartContainer
                  config={{
                    utilization: { label: "Utilization (h/day)", color: "#3b82f6" },
                    availability: { label: "Availability (h/day)", color: "#e2e8f0" }
                  }}
                  className="w-full h-[210px]"
                >
                  <BarChart
                    data={utilizationChartData}
                    layout="vertical"
                    margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                    barGap={2}
                  >
                    <XAxis type="number" domain={[0, 12]} tickFormatter={v => `${v}h`} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={60}
                      tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="utilization" radius={[0, 3, 3, 0]} barSize={8}>
                      {utilizationChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                    <Bar dataKey="availability" fill="rgba(148, 163, 184, 0.2)" radius={[0, 3, 3, 0]} barSize={8} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="ah-error-state" style={{ height: 210 }}><p>No assignment data yet.</p></div>
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
                  config={{
                    count: { label: "Employees", color: "#6366f1" }
                  }}
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
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ah-text-muted)', padding: 24, fontSize: 12 }}>No employees found.</td></tr>
                ) : (
                  filteredEmployees.slice(0, 50).map((emp, i) => {
                    const util = resourceUtilization.find(r => r.employee_id === emp.employee_id);
                    const utilPct = util ? Math.round((util.utilization / util.availability) * 100) : null;
                    return (
                      <tr key={emp.employee_id || i}>
                        <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ah-text-primary)' }}>
                          {emp.employee_id}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)' }}>{emp.name || '—'}</td>
                        <td style={{ color: 'var(--ah-text-secondary)', fontWeight: 500 }}>{emp.role || '—'}</td>
                        <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>{emp.department || '—'}</td>
                        <td>
                          {utilPct !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                              <div className="ah-progress-track" style={{ flex: 1, height: 6 }}>
                                <div
                                  className="ah-progress-fill"
                                  style={{
                                    width: `${Math.min(utilPct, 100)}%`,
                                    background: utilPct > 100 ? '#ef4444' : utilPct >= 80 ? '#f59e0b' : '#10b981',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ah-text-secondary)', width: 32, textAlign: 'right' }}>
                                {utilPct}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ah-text-muted)' }}>—</span>
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
