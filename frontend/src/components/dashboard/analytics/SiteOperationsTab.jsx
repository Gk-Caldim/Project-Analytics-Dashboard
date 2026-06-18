/**
 * SiteOperationsTab.jsx — Site Operations Dashboard (Recharts version)
 */
import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../../ui/chart';
import { MapPin, Users, Database, AlertTriangle, Shield, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const SITES_LIST = [
  { id: 'MH-01', name: 'Mahindra EV Plant', location: 'Pune, MH', status: 'Active', completion: 72, phase: 'Structural', workers: 2840, safetyScore: 94, openNcrs: 6 },
  { id: 'LT-07', name: 'L&T Coastal Highway', location: 'Mumbai-Goa', status: 'Delayed', completion: 48, phase: 'Earthworks', workers: 1420, safetyScore: 82, openNcrs: 18 },
  { id: 'TS-03', name: 'Tata Steel Kalinganagar', location: 'Jajpur, OD', status: 'Active', completion: 61, phase: 'Piping & Structure', workers: 3100, safetyScore: 91, openNcrs: 8 },
  { id: 'MT-12', name: 'NTPC Solar Farm', location: 'Bikaner, RJ', status: 'Active', completion: 33, phase: 'Civil Foundations', workers: 950, safetyScore: 88, openNcrs: 4 },
  { id: 'BL-04', name: 'BEL Defence Hub', location: 'Bengaluru, KA', status: 'Critical', completion: 19, phase: 'Foundation Pile', workers: 1250, safetyScore: 76, openNcrs: 14 },
  { id: 'MH-00', name: 'Mahindra Logistics Park', location: 'Chakan, MH', status: 'Active', completion: 85, phase: 'Finishes & MEP', workers: 1340, safetyScore: 95, openNcrs: 2 }
];

const SAFETY_DATA = [
  { week: 'W1', incidents: 3, nearMiss: 7 },
  { week: 'W2', incidents: 2, nearMiss: 5 },
  { week: 'W3', incidents: 3, nearMiss: 8 },
  { week: 'W4', incidents: 2, nearMiss: 5 },
  { week: 'W5', incidents: 2, nearMiss: 6 },
  { week: 'W6', incidents: 1, nearMiss: 4 }
];

const EQUIPMENT_DATA = [
  { category: 'Cranes', deployed: 12, idle: 3 },
  { category: 'Excavators', deployed: 16, idle: 4 },
  { category: 'Pumps', deployed: 5, idle: 1 },
  { category: 'Mixers', deployed: 20, idle: 6 },
  { category: 'Rigs', deployed: 7, idle: 2 }
];

function getStatusBadge(status) {
  if (status === 'Active')   return 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100';
  if (status === 'Delayed')  return 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100';
  if (status === 'Critical') return 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100';
  return 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100';
}

function getSiteProgressColor(status) {
  if (status === 'Critical') return '#ef4444';
  if (status === 'Delayed')  return '#f59e0b';
  return '#10b981';
}

export default function SiteOperationsTab() {
  const [selectedId, setSelectedId] = useState('MH-01');

  const selected = useMemo(() => {
    return SITES_LIST.find(s => s.id === selectedId) || SITES_LIST[0];
  }, [selectedId]);

  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="ah-section-eyebrow">FIELD INTELLIGENCE</span>
          <h2 className="ah-section-title">Site Operations Dashboard</h2>
        </div>
        {/* Status Indicators top right */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">4 Active</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">1 Delayed</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100">1 Critical</span>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="ah-card ah-kpi-card">
          <span className="ah-kpi-label">Total Workers On-Site</span>
          <span className="ah-kpi-value">10,900</span>
          <span className="ah-kpi-sub">across all sites</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <span className="ah-kpi-label">Avg Safety Score</span>
          <span className="ah-kpi-value">86</span>
          <span className="ah-kpi-sub">weighted index</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <span className="ah-kpi-label">Open NCRs</span>
          <span className="ah-kpi-value">52</span>
          <span className="ah-kpi-sub">needs closure</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <span className="ah-kpi-label">Sites in Execution</span>
          <span className="ah-kpi-value">5 <span style={{ fontSize: 13, color: 'var(--ah-text-secondary)', fontWeight: 500 }}>of 6 total</span></span>
          <span className="ah-kpi-sub">active trackers</span>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        {/* Left Column: Active Sites */}
        <div className="ah-card" style={{ height: 'fit-content' }}>
          <div className="ah-card-header">
            <h3 className="ah-card-title">Active Sites</h3>
          </div>
          <div className="ah-site-list">
            {SITES_LIST.map((site) => (
              <div
                key={site.id}
                onClick={() => setSelectedId(site.id)}
                className={`ah-site-item ${selectedId === site.id ? 'active' : ''}`}
                style={{ padding: '14px 16px', borderBottom: '1px solid var(--ah-border)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ah-text-muted)', fontWeight: 500 }}>
                    {site.id} · {site.location.split(',')[0]}
                  </span>
                  <span className={getStatusBadge(site.status)}>
                    {site.status}
                  </span>
                </div>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ah-text-primary)', marginBottom: 8 }}>
                  {site.name}
                </h4>
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="ah-progress-track" style={{ flex: 1, height: 4 }}>
                    <div
                      className="ah-progress-fill"
                      style={{
                        width: `${site.completion}%`,
                        background: getSiteProgressColor(site.status)
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ah-text-secondary)', width: 28, textAlign: 'right' }}>
                    {site.completion}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Site Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected Site Detail Header Card */}
          <div className="ah-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ah-text-muted)', fontWeight: 500 }}>
                  {selected.id} · {selected.location}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--ah-text-primary)' }}>
                  {selected.name}
                </h3>
              </div>
              <span className={getStatusBadge(selected.status)} style={{ padding: '4px 8px', borderRadius: 4 }}>
                <span className="ah-badge-dot" style={{ background: getSiteProgressColor(selected.status), marginRight: 4 }} />
                {selected.status}
              </span>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Phase', value: selected.phase, color: 'var(--ah-text-primary)' },
                { label: 'Workers', value: selected.workers.toLocaleString(), color: 'var(--ah-text-primary)' },
                { label: 'Safety Score', value: selected.safetyScore, color: '#10b981' },
                { label: 'Open NCRs', value: selected.openNcrs, color: '#ef4444' }
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--ah-border)' }}>
                  <span style={{ fontSize: 10, color: 'var(--ah-text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{m.label}</span>
                  <div style={{ fontSize: 16, fontWeight: 850, color: m.color, marginTop: 4 }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Overall Completion Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ah-text-secondary)', marginBottom: 6 }}>
                <span>Overall Completion</span>
                <span style={{ fontWeight: 700 }}>{selected.completion}%</span>
              </div>
              <div className="ah-progress-track" style={{ height: 6 }}>
                <div
                  className="ah-progress-fill"
                  style={{
                    width: `${selected.completion}%`,
                    background: getSiteProgressColor(selected.status)
                  }}
                />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Safety Incidents Chart */}
            <div className="ah-card">
              <div className="ah-card-header">
                <h3 className="ah-card-title">Safety Incidents - 6W</h3>
              </div>
              <div className="ah-chart-body" style={{ height: 200, padding: 12 }}>
                <ChartContainer
                  config={{
                    incidents: { label: "Incidents", color: "#ef4444" },
                    nearMiss: { label: "Near-Miss", color: "#f59e0b" }
                  }}
                  className="w-full h-[180px]"
                >
                  <LineChart data={SAFETY_DATA} margin={{ left: 5, right: 5, top: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="nearMiss" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>

            {/* Equipment Deployment Chart */}
            <div className="ah-card">
              <div className="ah-card-header">
                <h3 className="ah-card-title">Equipment Deployment</h3>
              </div>
              <div className="ah-chart-body" style={{ height: 200, padding: 12 }}>
                <ChartContainer
                  config={{
                    deployed: { label: "Deployed", color: "#3b82f6" },
                    idle: { label: "Idle", color: "#e2e8f0" }
                  }}
                  className="w-full h-[180px]"
                >
                  <BarChart data={EQUIPMENT_DATA} margin={{ left: 5, right: 5, top: 10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="deployed" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={10} />
                    <Bar dataKey="idle" fill="rgba(148, 163, 184, 0.2)" radius={[2, 2, 0, 0]} barSize={10} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
