import React, { useMemo, useState } from 'react';
import { Users, Search, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

/**
 * ResourceLoads
 * ─────────────
 * Shows the resource pool in a table (Employee Name, Employee ID, Role,
 * Assigned Project) alongside a chart that fits those attributes — a stacked
 * bar of headcount per assigned project, broken down by role.
 *
 * Data source: GET /employees  (EmployeeOut: employee_id, name, role, project_name)
 */
const ROLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#14b8a6', '#f43f5e'];

const ResourceLoads = ({ employees = [] }) => {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return (employees || []).map((e) => ({
      id: e.id,
      name: e.name || '—',
      employeeId: e.employee_id || '—',
      role: e.role || 'User',
      project: e.project_name && e.project_name !== 'not assigned' ? e.project_name : 'Not assigned',
    }));
  }, [employees]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.employeeId).toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.project.toLowerCase().includes(q)
    );
  }, [rows, query]);

  // ── Chart: headcount per project, stacked by role ──────────────────────
  const chartOption = useMemo(() => {
    if (rows.length === 0) return {};

    const projects = Array.from(new Set(rows.map((r) => r.project)));
    const roles = Array.from(new Set(rows.map((r) => r.role)));

    const series = roles.map((role, idx) => ({
      name: role,
      type: 'bar',
      stack: 'headcount',
      barMaxWidth: 22,
      itemStyle: { color: ROLE_COLORS[idx % ROLE_COLORS.length], borderRadius: [0, 2, 2, 0] },
      emphasis: { focus: 'series' },
      data: projects.map(
        (proj) => rows.filter((r) => r.project === proj && r.role === role).length
      ),
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: { left: 6, right: 14, top: 8, bottom: 32, containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: projects,
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          fontFamily: 'Inter, sans-serif',
          width: 90,
          overflow: 'truncate',
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series,
    };
  }, [rows]);

  const roleCount = useMemo(() => new Set(rows.map((r) => r.role)).size, [rows]);
  const projectCount = useMemo(
    () => new Set(rows.filter((r) => r.project !== 'Not assigned').map((r) => r.project)).size,
    [rows]
  );

  return (
    <section
      aria-label="Resource Loads"
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '16px 18px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'var(--blue-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
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
              Resource Loads
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {rows.length} people · {roleCount} roles · {projectCount} projects
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '5px 10px',
            minWidth: 0,
          }}
        >
          <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '12px',
              color: 'var(--text-primary)',
              width: '110px',
              maxWidth: '40vw',
            }}
          />
        </div>
      </header>

      {/* Chart */}
      <div style={{ padding: '14px 18px 4px 18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Headcount by project &amp; role
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            No resource data available.
          </div>
        ) : (
          <ReactECharts
            option={chartOption}
            style={{ height: '180px', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        )}
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '8px 12px 12px 12px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '420px' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {['Employee Name', 'Employee ID', 'Role', 'Assigned Project'].map((h) => (
                <th
                  key={h}
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: 'var(--surface)',
                    padding: '8px 10px',
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matching employees.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => (
                <tr
                  key={r.id ?? `${r.employeeId}-${i}`}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {r.name}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {r.employeeId}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: 'var(--blue-50)',
                        color: 'var(--blue-900, var(--accent))',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.role}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      color: r.project === 'Not assigned' ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontStyle: r.project === 'Not assigned' ? 'italic' : 'normal',
                    }}
                  >
                    {r.project}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ResourceLoads;
