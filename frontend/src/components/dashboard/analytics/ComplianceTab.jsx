/**
 * ComplianceTab.jsx — Compliance & Audit Management (Recharts version)
 * Beautiful clean layout with Recharts.
 */
import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../ui/chart';
import { Shield, AlertTriangle, FileText, Clock, ArrowUp, ArrowDown } from 'lucide-react';

const AUDIT_DATA = [
  { id: 'AUD-901', area: 'Safety', site: 'MH-01', auditor: 'H. Sharma', date: '14 Jun', status: 'Passed', finding: 'Harness routing check passed' },
  { id: 'AUD-902', area: 'Quality', site: 'LT-07', auditor: 'R. Patel', date: '10 Jun', status: 'Failed', finding: 'Shoring inspection failed' },
  { id: 'AUD-903', area: 'Structural', site: 'TS-03', auditor: 'S. Nair', date: '08 Jun', status: 'Passed', finding: 'Piping welding certifications verified' },
  { id: 'AUD-904', area: 'Environmental', site: 'MT-12', auditor: 'M. Ali', date: '02 Jun', status: 'Passed', finding: 'Solar runoff drainage plan approved' },
  { id: 'AUD-905', area: 'Safety', site: 'BL-04', auditor: 'K. Das', date: '28 May', status: 'Passed', finding: 'Piling machine daily logs up to date' }
];

function getAuditStatusBadge(status) {
  if (status === 'Passed') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900';
  if (status === 'Failed') return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900';
  return 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800';
}

export default function ComplianceTab() {
  const radarChartData = [
    { area: 'Safety', score: 94 },
    { area: 'Quality', score: 82 },
    { area: 'Process', score: 88 },
    { area: 'Structural', score: 76 },
    { area: 'Environmental', score: 85 }
  ];

  const standardsChartData = [
    { standard: 'ISO 9001', passed: 92, risk: 8 },
    { standard: 'ISO 14001', passed: 85, risk: 15 },
    { standard: 'ISO 45001', passed: 88, risk: 12 },
    { standard: 'APQP Gate 3', passed: 78, risk: 22 },
    { standard: 'PPAP Valid.', passed: 94, risk: 6 }
  ];

  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">REGULATORY & QUALITY</span>
        <h2 className="ah-section-title">Compliance & Audit Management</h2>
      </div>

      {/* ── KPIs ── */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Overall Compliance</span>
            <Shield size={14} className="text-blue-500" />
          </div>
          <span className="ah-kpi-value">82.5%</span>
          <span className="ah-kpi-sub">weighted score</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Open Audit Actions</span>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <span className="ah-kpi-value">14</span>
          <span className="ah-kpi-sub">awaiting closure</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Audits This Quarter</span>
            <FileText size={14} className="text-indigo-500" />
          </div>
          <span className="ah-kpi-value">31</span>
          <span className="ah-kpi-sub">conducted</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Days to Next Audit</span>
            <Clock size={14} className="text-rose-500" />
          </div>
          <span className="ah-kpi-value">8</span>
          <span className="ah-kpi-sub">scheduled</span>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Compliance Score by Area</h3>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12, display: 'flex', justifyContent: 'center' }}>
            <ChartContainer
              config={{
                score: { label: "Compliance Score", color: "#3b82f6" }
              }}
              className="mx-auto w-full h-[180px]"
            >
              <RadarChart data={radarChartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 9, fill: 'var(--ah-text-secondary)', fontWeight: 550 }} />
                <Radar name="Compliance" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </RadarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Compliance by Standard</h3>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12 }}>
            <ChartContainer
              config={{
                passed: { label: "Compliant %", color: "#10b981" },
                risk: { label: "At Risk %", color: "#fca5a5" }
              }}
              className="w-full h-[180px]"
            >
              <BarChart
                data={standardsChartData}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="standard"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={90}
                  tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="passed" stackId="a" fill="#10b981" barSize={12} />
                <Bar dataKey="risk" stackId="a" fill="#fca5a5" radius={[0, 4, 4, 0]} barSize={12} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* ── Table Row ── */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title">Audit Trail</h3>
          <span className="ah-card-meta">{AUDIT_DATA.length} audits logged</span>
        </div>
        <div className="ah-table-wrap">
          <table className="ah-table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Area</th>
                <th>Site</th>
                <th>Auditor</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Key Finding</th>
              </tr>
            </thead>
            <tbody>
              {AUDIT_DATA.map((aud) => (
                <tr key={aud.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{aud.id}</td>
                  <td style={{ fontWeight: 600 }}>{aud.area}</td>
                  <td style={{ color: 'var(--ah-text-secondary)', fontWeight: 600 }}>{aud.site}</td>
                  <td style={{ color: 'var(--ah-text-secondary)' }}>{aud.auditor}</td>
                  <td style={{ color: 'var(--ah-text-muted)', fontSize: 11 }}>{aud.date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={getAuditStatusBadge(aud.status)}>
                      <span className={`w-1.5 h-1.5 rounded-full ${aud.status === 'Passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {aud.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ah-text-muted)', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={aud.finding}>
                    {aud.finding}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
