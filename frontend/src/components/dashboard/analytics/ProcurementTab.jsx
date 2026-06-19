/**
 * ProcurementTab.jsx — Procurement & Material Tracking (Recharts version)
 * Modern clean layout using Recharts.
 */
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { ShoppingBag, TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowUp, ArrowDown } from 'lucide-react';

// Status colors matching screenshots
const STATUS_BADGES = {
  'In Transit': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900',
  'Delivered': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900',
  'Critical': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900',
  'Ordered': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900',
  'Delayed': 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900'
};

const PO_DATA = [
  { po: 'PO-4821', material: 'TMT Steel Bars Fe550D', vendor: 'Tata Steel', site: 'MH-01', qty: '1,200 MT', val: '₹8.4 Cr', eta: '12 Jul', status: 'In Transit', delay: '' },
  { po: 'PO-4822', material: 'OPC 53 Grade Cement', vendor: 'ACC Ltd', site: 'LT-07', qty: '4,500 bags', val: '₹2.1 Cr', eta: '28 Jun', status: 'Delivered', delay: '' },
  { po: 'PO-4823', material: 'Structural Steel Sections', vendor: 'JSW Steel', site: 'BL-04', qty: '640 MT', val: '₹5.8 Cr', eta: '04 Jul', status: 'Critical', delay: '9d late' },
  { po: 'PO-4824', material: 'Solar PV Modules 540W', vendor: 'Vikram Solar', site: 'NT-12', qty: '8,400 units', val: '₹14.2 Cr', eta: '18 Jul', status: 'Ordered', delay: '' },
  { po: 'PO-4825', material: 'HR Coils 3.0mm', vendor: 'SAIL', site: 'TS-03', qty: '920 MT', val: '₹6.1 Cr', eta: '09 Jul', status: 'Delayed', delay: '3d late' }
];

export default function ProcurementTab() {
  return (
    <div className="ah-fade-up">
      {/* ── Section Header ── */}
      <div className="ah-section-header">
        <span className="ah-section-eyebrow">SUPPLY CHAIN</span>
        <h2 className="ah-section-title">Procurement & Material Tracking</h2>
      </div>

      {/* ── KPI Grid ── */}
      <div className="ah-kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Active Orders</span>
            <ShoppingBag size={14} className="text-blue-500" />
          </div>
          <span className="ah-kpi-value">143</span>
          <span className="ah-kpi-sub">across 6 sites</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Total PO Value</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="ah-kpi-value">₹284 Cr</span>
            <span className="ah-kpi-delta ah-delta-up">
              <ArrowUp size={10} strokeWidth={3} /> +8%
            </span>
          </div>
          <span className="ah-kpi-sub">current quarter</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">On-Time Delivery</span>
            <CheckCircle2 size={14} className="text-indigo-500" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="ah-kpi-value">83%</span>
            <span className="ah-kpi-delta ah-delta-down">
              <ArrowDown size={10} strokeWidth={3} /> -2%
            </span>
          </div>
          <span className="ah-kpi-sub">rolling 30-day</span>
        </div>

        <div className="ah-card ah-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="ah-kpi-label">Critical Delays</span>
            <Clock size={14} className="text-rose-500" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="ah-kpi-value">7</span>
            <span className="ah-kpi-delta ah-delta-down">
              <ArrowUp size={10} strokeWidth={3} /> +3
            </span>
          </div>
          <span className="ah-kpi-sub">needs escalation</span>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="ah-chart-grid ah-chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Vendor On-Time Performance</h3>
            <span className="ah-card-meta">on-time %</span>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12 }}>
            <ChartContainer
              config={{
                performance: { label: "On-Time Performance", color: "#3b82f6" }
              }}
              className="w-full h-[180px]"
            >
              <BarChart
                data={[
                  { vendor: 'JSW Steel', value: 72, fill: '#ef4444' },
                  { vendor: 'Tata Steel', value: 78, fill: '#f59e0b' },
                  { vendor: 'SAIL', value: 88, fill: '#3b82f6' },
                  { vendor: 'Vikram Solar', value: 91, fill: '#10b981' },
                  { vendor: 'ACC Ltd', value: 94, fill: '#10b981' }
                ]}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="vendor"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={90}
                  tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={v => `${v}%`} hideLabel />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="ah-card">
          <div className="ah-card-header">
            <h3 className="ah-card-title">Order Status Summary</h3>
            <span className="ah-card-meta">count of POs</span>
          </div>
          <div className="ah-chart-body" style={{ height: 220, padding: 12 }}>
            <ChartContainer
              config={{
                count: { label: "Count of POs", color: "#6366f1" }
              }}
              className="w-full h-[180px]"
            >
              <BarChart
                data={[
                  { status: 'Critical', value: 7, fill: '#ef4444' },
                  { status: 'Delayed', value: 12, fill: '#f59e0b' },
                  { status: 'Ordered', value: 18, fill: '#818cf8' },
                  { status: 'In Transit', value: 31, fill: '#3b82f6' },
                  { status: 'Delivered', value: 86, fill: '#10b981' }
                ]}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="status"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={80}
                  tick={{ fontSize: 10, fill: "var(--ah-text-secondary)", fontWeight: 550 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>

      {/* ── Table Row ── */}
      <div className="ah-card">
        <div className="ah-card-header">
          <h3 className="ah-card-title">Purchase Orders</h3>
          <span className="ah-card-meta">{PO_DATA.length} active orders</span>
        </div>
        <div className="ah-table-wrap">
          <table className="ah-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Material</th>
                <th>Vendor</th>
                <th>Site</th>
                <th>Qty / Value</th>
                <th>ETA</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {PO_DATA.map((po) => (
                <tr key={po.po}>
                  <td style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{po.po}</td>
                  <td style={{ fontWeight: 600 }}>{po.material}</td>
                  <td style={{ color: 'var(--ah-text-secondary)' }}>{po.vendor}</td>
                  <td style={{ fontWeight: 600, color: 'var(--ah-text-primary)' }}>{po.site}</td>
                  <td style={{ color: 'var(--ah-text-secondary)' }}>
                    {po.qty} <span style={{ color: 'var(--ah-text-muted)', fontSize: 10 }}>/ {po.val}</span>
                  </td>
                  <td style={{ color: po.delay ? 'var(--ah-danger)' : 'var(--ah-text-muted)', fontSize: 11, fontWeight: po.delay ? 'bold' : 'normal' }}>
                    {po.eta} {po.delay && <span style={{ fontSize: 9, marginLeft: 4 }}>({po.delay})</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={STATUS_BADGES[po.status] || 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800'}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        po.status === 'Delivered' ? 'bg-emerald-500' :
                        po.status === 'In Transit' ? 'bg-blue-500' :
                        po.status === 'Ordered' ? 'bg-indigo-500' :
                        po.status === 'Delayed' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      {po.status}
                    </span>
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
