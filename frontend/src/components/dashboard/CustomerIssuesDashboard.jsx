import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MessageSquare, AlertTriangle, CheckCircle, Clock, Plus, RefreshCw, BarChart2, Filter, Search, Smile, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'react-hot-toast';
import { getComplaints, logComplaint, getSentimentTrend, getEightDStatus } from '../../api/customer';
import SentimentBadge from '../customer/SentimentBadge';
import IssueDetailModal from '../customer/IssueDetailModal';

const CustomerIssuesDashboard = ({ projectId }) => {
  const [complaints, setComplaints] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');

  // Log new complaint state
  const [showLogModal, setShowLogModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newText, setNewText] = useState('');
  const [newUrgency, setNewUrgency] = useState('medium');
  const [logging, setLogging] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [complaintsRes, trendRes, metricsRes] = await Promise.all([
        getComplaints(projectId),
        getSentimentTrend(projectId),
        getEightDStatus(projectId)
      ]);
      setComplaints(complaintsRes);
      setTrendData(trendRes);
      setMetrics(metricsRes);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load customer issues data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [projectId, fetchData]);

  const handleLogComplaint = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setLogging(true);
    try {
      await logComplaint(projectId, {
        customer_name: newCustomer.trim() || null,
        complaint_text: newText.trim(),
        urgency_level: newUrgency,
        eight_d_status: 'open'
      });
      toast.success('Customer complaint logged and analyzed');
      setNewCustomer('');
      setNewText('');
      setNewUrgency('medium');
      setShowLogModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to log complaint');
    } finally {
      setLogging(false);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch = (c.complaint_text || '').toLowerCase().includes(search.toLowerCase()) ||
                            (c.customer_name || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.eight_d_status === statusFilter;
      const matchesUrgency = urgencyFilter === 'All' || c.urgency_level === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [complaints, search, statusFilter, urgencyFilter]);

  // ECharts Sentiment Trend option
  const trendOption = useMemo(() => {
    if (!trendData || !trendData.data || trendData.data.length === 0) return {};
    const dates = trendData.data.map(d => d.date);
    const scores = trendData.data.map(d => d.sentiment_score);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const p = params[0];
          return `<div style="font-weight:bold;margin-bottom:4px">${p.axisValue}</div>
            Sentiment Score: <b>${p.value > 0 ? '+' : ''}${p.value}</b>`;
        }
      },
      grid: { left: 8, right: 8, top: 12, bottom: 20, containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: -1,
        max: 1,
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }
      },
      series: [{
        name: 'Sentiment Trend',
        type: 'line',
        smooth: true,
        data: scores,
        lineStyle: { color: '#3b82f6', width: 2.5 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ]
          }
        }
      }]
    };
  }, [trendData]);

  // ECharts Emotion Distribution option
  const distributionOption = useMemo(() => {
    if (!complaints || complaints.length === 0) return {};
    const emotions = { angry: 0, frustrated: 0, neutral: 0, satisfied: 0 };
    complaints.forEach(c => {
      const emo = c.sentiment?.emotion_label || 'neutral';
      if (emotions[emo] !== undefined) {
        emotions[emo]++;
      }
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: 'var(--surface)', borderWidth: 2 },
        label: { show: false },
        data: [
          { value: emotions.satisfied, name: 'Satisfied', itemStyle: { color: '#10b981' } },
          { value: emotions.neutral, name: 'Neutral', itemStyle: { color: '#64748b' } },
          { value: emotions.frustrated, name: 'Frustrated', itemStyle: { color: '#f97316' } },
          { value: emotions.angry, name: 'Angry', itemStyle: { color: '#ef4444' } }
        ]
      }]
    };
  }, [complaints]);

  return (
    <div className="vppd-section text-xs">
      {/* Upper panel: Metric summary Cards */}
      <div className="vppd-section-body" style={{ paddingBottom: 0 }}>
        <div className="vppd-kpi-strip">
          {[
            { label: 'Total Escalations', value: metrics?.total_complaints || 0, color: 'var(--text-primary)' },
            { label: '8D Closure Rate', value: `${metrics?.closure_rate || 0}%`, color: '#10b981' },
            { label: 'Avg Resolution Time', value: `${metrics?.avg_resolution_days || 0} Days`, color: '#3b82f6' },
            { label: 'Urgent Action Required', value: metrics?.critical_open || 0, color: '#ef4444' }
          ].map((c, i) => (
            <div key={i} className="vppd-kpi-card">
              <span className="vppd-kpi-label">{c.label}</span>
              <span className="vppd-kpi-value" style={{ color: c.color }}>{c.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mid panel: Sentiment trend & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-b border-[var(--border-subtle)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] mt-4">
        <div className="lg:col-span-2 p-4 flex flex-col bg-[var(--surface)]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1.5">
              <BarChart2 size={13} className="text-blue-400" /> Customer Sentiment Trend (30 Days)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
              trendData?.trend_direction === 'improving' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              trendData?.trend_direction === 'declining' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}>
              Trend: {trendData?.trend_direction || 'stable'}
            </span>
          </div>
          {trendData?.data?.length > 0 ? (
            <ReactECharts option={trendOption} style={{ height: 140, width: '100%' }} opts={{ renderer: 'svg' }} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] italic py-10">No sentiment trend data</div>
          )}
        </div>

        <div className="p-4 flex flex-col bg-[var(--surface)]">
          <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1.5 mb-2">
            <Smile size={13} className="text-emerald-400" /> Sentiment Distribution
          </span>
          {complaints.length > 0 ? (
            <div className="flex items-center gap-4 flex-1">
              <ReactECharts option={distributionOption} style={{ height: 110, width: 110 }} opts={{ renderer: 'svg' }} />
              <div className="flex flex-col gap-1.5 flex-1">
                {[
                  { label: 'Satisfied', color: 'bg-emerald-500' },
                  { label: 'Neutral', color: 'bg-slate-500' },
                  { label: 'Frustrated', color: 'bg-orange-500' },
                  { label: 'Angry', color: 'bg-rose-500' }
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px]">
                      <span className={`w-2 h-2 rounded-sm ${item.color}`} />
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] italic">No distribution data</div>
          )}
        </div>
      </div>

      {/* Control panel & Table */}
      <div className="vppd-section-body flex flex-col gap-3 min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search complaints or customers..."
                className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded pl-8 pr-3 py-2 text-[var(--text-primary)] outline-none text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
            >
              <option value="All">All Urgency</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowLogModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded cursor-pointer transition-all border-0 flex items-center gap-1 active:scale-95"
            >
              <Plus size={14} /> Log Complaint
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-[var(--elevated-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold px-3 py-2 rounded cursor-pointer transition-all flex items-center gap-1 active:scale-95 hover:bg-[var(--bg)]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="vppd-refined-table-wrapper">
          <table className="vppd-refined-table text-xs">
            <thead>
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Complaint Detail</th>
                <th className="p-3 text-center">Urgency</th>
                <th className="p-3 text-center">Sentiment</th>
                <th className="p-3 text-center">8D Status</th>
                <th className="p-3 text-center">Date Logged</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-[var(--text-muted)] py-10 italic">
                    No customer complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map(c => {
                  const urgencyStyle = {
                    critical: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                    high: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                    low: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }[c.urgency_level] || 'bg-[var(--elevated-card)] border-[var(--border-subtle)] text-[var(--text-muted)]';

                  const statusStyle = {
                    open: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                    in_progress: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
                    closed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }[c.eight_d_status || 'open'] || 'bg-[var(--elevated-card)] border-[var(--border-subtle)] text-[var(--text-muted)]';

                  const emotion = c.sentiment?.emotion_label || 'neutral';
                  const sentimentEmoji = { satisfied: '😊', neutral: '😐', frustrated: '😠', angry: '😡' }[emotion] || '😐';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setActiveComplaint(c);
                        setIsDetailOpen(true);
                      }}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-hover)] transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {c.customer_name || 'Anonymous Customer'}
                      </td>
                      <td className="p-3 text-[var(--text-primary)] max-w-sm truncate">{c.complaint_text}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded border uppercase font-bold text-[9px] ${urgencyStyle}`}>
                          {c.urgency_level}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm font-semibold whitespace-nowrap text-[var(--text-primary)]">
                        {sentimentEmoji} <span className="text-[11px] font-mono">{c.sentiment_score !== null ? (c.sentiment_score > 0 ? `+${c.sentiment_score.toFixed(1)}` : c.sentiment_score.toFixed(1)) : '—'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded border uppercase font-bold text-[9px] ${statusStyle}`}>
                          {c.eight_d_status === 'in_progress' ? 'In Progress' : c.eight_d_status || 'open'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Complaint Overlay Modal */}
      {showLogModal && (
        <div className="app-modal-overlay">
          <form onSubmit={handleLogComplaint} className="app-modal-container w-full max-w-md p-5 flex flex-col gap-4">
            <div className="app-modal-header pb-3 flex justify-between items-center bg-transparent border-b border-[var(--border-subtle)]">
              <h3 className="app-modal-title uppercase tracking-wider">Log Customer Complaint</h3>
              <button type="button" onClick={() => setShowLogModal(false)} className="app-modal-close-btn bg-transparent border-0 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Customer Name</label>
              <input
                type="text"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                placeholder="Enter customer or client name (optional)..."
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Complaint Text</label>
              <textarea
                value={newText}
                required
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Log the details of customer complaint or feedback..."
                rows={4}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Severity / Urgency Level</label>
              <select
                value={newUrgency}
                onChange={(e) => setNewUrgency(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical 🚨</option>
              </select>
            </div>

            <div className="app-modal-footer bg-transparent border-t-0 p-0 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold px-4 py-2 rounded cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={logging || !newText.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded cursor-pointer text-xs disabled:opacity-50"
              >
                {logging ? 'Saving...' : 'Submit & Analyze'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complaint Detail & 8D Modal */}
      <IssueDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveComplaint(null);
        }}
        complaint={activeComplaint}
        onSaveSuccess={() => {
          fetchData();
          setIsDetailOpen(false);
          setActiveComplaint(null);
        }}
      />
    </div>
  );
};

export default CustomerIssuesDashboard;
