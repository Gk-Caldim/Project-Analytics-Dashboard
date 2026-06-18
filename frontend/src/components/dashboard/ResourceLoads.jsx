import React, { useMemo, useState } from 'react';
import { Users, Search, BarChart3 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';

/**
 * ResourceLoads
 * ─────────────
 * Shows the resource pool in a table (Employee Name, Employee ID, Role,
 * Assigned Project) alongside a stacked bar chart of headcount per project
 * broken down by role.
 *
 * Data source: GET /employees  (EmployeeOut: employee_id, name, role, project_name)
 */

const ROLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#14b8a6', '#f43f5e'];
const NOT_ASSIGNED_LABEL = 'Not assigned';

const ResourceLoads = ({ employees = [] }) => {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return (employees || []).map((e) => ({
      id: e.id,
      name: e.name || '—',
      employeeId: e.employee_id || '—',
      role: e.role || 'User',
      project: e.project_name && e.project_name !== 'not assigned' ? e.project_name : NOT_ASSIGNED_LABEL,
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

    // Cap role list to first 6 for legend clarity; group the rest as 'Other'
    const MAX_ROLES = 6;
    const topRoles = roles.slice(0, MAX_ROLES);
    const hasOther = roles.length > MAX_ROLES;

    // Find max count across projects (for "Not assigned" cap)
    const assignedProjects = projects.filter(p => p !== NOT_ASSIGNED_LABEL);
    const maxAssignedCount = assignedProjects.reduce((max, proj) => {
      const count = rows.filter((r) => r.project === proj).length;
      return Math.max(max, count);
    }, 0);

    // X-axis max: cap "Not assigned" bar visually by using max of assigned bars × 1.4
    const xMax = maxAssignedCount > 0 ? Math.ceil(maxAssignedCount * 1.4) : undefined;

    const series = topRoles.map((role, idx) => ({
      name: role,
      type: 'bar',
      stack: 'headcount',
      barMaxWidth: 22,
      itemStyle: { color: ROLE_COLORS[idx % ROLE_COLORS.length], borderRadius: [0, 2, 2, 0] },
      emphasis: { focus: 'series' },
      data: projects.map((proj) => rows.filter((r) => r.project === proj && r.role === role).length),
    }));

    if (hasOther) {
      series.push({
        name: 'Other Roles',
        type: 'bar',
        stack: 'headcount',
        barMaxWidth: 22,
        itemStyle: { color: '#94a3b8', borderRadius: [0, 2, 2, 0] },
        emphasis: { focus: 'series' },
        data: projects.map((proj) =>
          rows.filter((r) => r.project === proj && !topRoles.includes(r.role)).length
        ),
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const total = params.reduce((s, p) => s + (p.value || 0), 0);
          const lines = params.filter(p => p.value > 0).map(p => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`).join('<br/>');
          return `${params[0].axisValue}<br/>${lines}<br/>Total: <b>${total}</b>`;
        }
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10,
        pageButtonItemGap: 5,
      },
      grid: { left: 6, right: 14, top: 8, bottom: 36, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: xMax,
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
          formatter: (val) => val === NOT_ASSIGNED_LABEL ? `{muted|${val}}` : val,
          rich: {
            muted: { color: '#94a3b8', fontStyle: 'italic', fontSize: 9 }
          }
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series,
    };
  }, [rows]);

  const roleCount = useMemo(() => new Set(rows.map((r) => r.role)).size, [rows]);
  const projectCount = useMemo(
    () => new Set(rows.filter((r) => r.project !== NOT_ASSIGNED_LABEL).map((r) => r.project)).size,
    [rows]
  );
  const assignedCount = useMemo(() => rows.filter(r => r.project !== NOT_ASSIGNED_LABEL).length, [rows]);
  const unassignedCount = rows.length - assignedCount;

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
          padding: '14px 18px',
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
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Resource Loads
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {rows.length} people · {roleCount} roles · {projectCount} projects
              {unassignedCount > 0 && (
                <span style={{ marginLeft: '6px', color: '#94a3b8', fontStyle: 'italic' }}>
                  · {unassignedCount} unassigned
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
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
      <div style={{ padding: '12px 18px 4px 18px' }}>
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
            letterSpacing: '0.06em',
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
            style={{ height: '200px', width: '100%' }}
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
                    zIndex: 10,
                    background: 'var(--surface)',
                    padding: '8px 10px',
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
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
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap', textAlign: 'right' }}>
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
                      color: r.project === NOT_ASSIGNED_LABEL ? '#94a3b8' : 'var(--text-primary)',
                      fontStyle: r.project === NOT_ASSIGNED_LABEL ? 'italic' : 'normal',
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
