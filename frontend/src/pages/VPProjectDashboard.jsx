import React, { useEffect, useState } from 'react';
import { Settings, Mail, AlertTriangle, Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import CriticalIssuesWidget from '../components/issues/CriticalIssuesWidget';
import TopRisksPanel from '../components/issues/TopRisksPanel';
import API from '../utils/api';
import './VPProjectDashboard.css';

const VPProjectDashboard = ({
  activeProject,
  dashboardData,
  onConfigure,
  onSendMail
}) => {
  const [recentMeetings, setRecentMeetings] = useState([]);

  // Fetch recent meetings explicitly for this project
  useEffect(() => {
    if (!activeProject?.dbProjectId) return;
    API.get('/meetings')
      .then(res => {
        if (res.data?.success) {
          const all = res.data.meetings || [];
          // Filter to this project and sort by creation/date desc
          const projectMeetings = all
            .filter(m => String(m.project_id) === String(activeProject.dbProjectId))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5); // top 5
          setRecentMeetings(projectMeetings);
        }
      })
      .catch(() => { });
  }, [activeProject]);

  const milestones = dashboardData?.milestones || [];

  // Compute KPI exactly as requested
  const totalMilestones = milestones.length;
  const completed = milestones.filter(m => m.status === 'Completed' || m.status === 'Complete').length;
  const delayed = milestones.filter(m => m.status === 'Delayed').length;
  const pending = milestones.filter(m => m.status === 'In Progress' || m.status === 'On Track' || m.status === 'Pending' || m.status === 'Open').length;

  const completedPct = totalMilestones > 0 ? Math.round((completed / totalMilestones) * 100) : 0;

  return (
    <div className="vppd-root">

      {/* ── 1. HEADER ── */}
      <div className="vppd-header">
        <div className="vppd-header-left">
          <div className="vppd-project-title">
            {activeProject?.name || 'Loading Project...'}
            <span className={`vppd-badge ${dashboardData?.project_health === 'Red' ? 'red' : dashboardData?.project_health === 'Yellow' ? 'yellow' : 'green'}`}>
              {dashboardData?.project_health || 'Unknown'} Health
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Project ID: {activeProject?.code || activeProject?.dbProjectId}</div>
        </div>

        <div className="vppd-header-right">
          <button className="vppd-btn vppd-btn-secondary" onClick={onConfigure}>
            <Settings size={14} /> Configure
          </button>
          <button className="vppd-btn vppd-btn-primary" onClick={onSendMail}>
            <Mail size={14} /> Send Mail
          </button>
        </div>
      </div>

      {/* ── 3. KPI SUMMARY BAR ── */}
      <div className="vppd-kpi-bar">
        {/* Total Milestones */}
        <div className="vppd-kpi-metric">
          <div className="vppd-metric-indicator" style={{ backgroundColor: '#e0f2fe' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
          </div>
          <div className="vppd-metric-content">
            <span className="vppd-metric-label">Total Milestones</span>
            <span className="vppd-metric-value">{totalMilestones}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="vppd-kpi-divider" />

        {/* Completed */}
        <div className="vppd-kpi-metric">
          <div className="vppd-metric-indicator" style={{ backgroundColor: '#dcfce7' }}>
            <span style={{ fontSize: '18px' }}>✅</span>
          </div>
          <div className="vppd-metric-content">
            <span className="vppd-metric-label">Completed</span>
            <span className="vppd-metric-value">
              {completed}
              <span className="vppd-metric-sub">({completedPct}%)</span>
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="vppd-kpi-divider" />

        {/* Delayed - Red Highlight */}
        <div className="vppd-kpi-metric">
          <div className="vppd-metric-indicator" style={{ backgroundColor: '#fee2e2' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
          </div>
          <div className="vppd-metric-content">
            <span className="vppd-metric-label">Delayed</span>
            <span className="vppd-metric-value vppd-metric-value-red">{delayed}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="vppd-kpi-divider" />

        {/* Pending - Yellow Highlight */}
        <div className="vppd-kpi-metric">
          <div className="vppd-metric-indicator" style={{ backgroundColor: '#fef9c3' }}>
            <span style={{ fontSize: '18px' }}>⏳</span>
          </div>
          <div className="vppd-metric-content">
            <span className="vppd-metric-label">Pending</span>
            <span className="vppd-metric-value vppd-metric-value-yellow">{pending}</span>
          </div>
        </div>
      </div>

      <div className="vppd-main-grid">
        {/* ── TOP RISKS PANEL ── */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <AlertTriangle size={18} color="#ef4444" />
            Top Risks
          </div>
          <div style={{ marginLeft: '-15px', marginRight: '-15px' }}>
            {activeProject?.dbProjectId ? (
              <TopRisksPanel projectId={activeProject.dbProjectId} />
            ) : (
              <div className="vppd-empty">Loading Top Risks...</div>
            )}
          </div>
        </div>

        {/* ── CRITICAL ISSUES ── */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <AlertTriangle size={18} color="#ef4444" />
            Top Critical Issues
          </div>
          <div style={{ marginLeft: '-15px', marginRight: '-15px' }}>
            {/* We rely on the existing widget, modifying its internal CSS isn't needed if it looks okay, but we render it natively */}
            {activeProject?.dbProjectId ? (
              <CriticalIssuesWidget projectId={activeProject.dbProjectId} />
            ) : (
              <div className="vppd-empty">Loading Critical Risks...</div>
            )}
          </div>
        </div>

        {/* ── 4. RECENT MEETINGS ── */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <Calendar size={18} color="#3b82f6" />
            Recent Meetings
          </div>
          <div className="vppd-meeting-list">
            {recentMeetings.length === 0 ? (
              <div className="vppd-empty">No logged meetings for this project.</div>
            ) : (
              recentMeetings.map(m => (
                <div key={m.id} className="vppd-meeting-item">
                  <div className="vppd-meeting-top">
                    <div className="vppd-meeting-title">{m.title || `Meeting #${m.id}`}</div>
                    <div className={`vppd-meeting-status ${m.mom_generated ? 'mom-done' : 'mom-pending'}`}>
                      {m.mom_generated ? 'MOM Logged' : 'MOM Pending'}
                    </div>
                  </div>
                  <div className="vppd-meeting-meta">
                    <span><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> {m.date} {m.time}</span>
                    <span>•</span>
                    <span>Host: {m.host || 'Unknown'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 5. MILESTONES TABLE ── */}
        <div className="vppd-section full">
          <div className="vppd-section-header">
            <Award size={18} color="#10b981" />
            Milestone Progress Tracker
          </div>
          {milestones.length === 0 ? (
            <div className="vppd-empty">No explicit milestones mapped for this project yet.</div>
          ) : (
            <div className="vppd-table-wrapper">
              <table className="vppd-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Milestone</th>
                    <th>Planned Date</th>
                    <th>Actual Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m, idx) => {
                    const isDelayed = String(m.status).toLowerCase().includes('delay');
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{m.module || 'General'}</td>
                        <td>{m.milestone}</td>
                        <td>{m.planned_date || '-'}</td>
                        <td>{m.actual_date || '-'}</td>
                        <td>
                          <span className={`vppd-badge ${isDelayed ? 'red' : 'green'}`} style={{ display: 'inline-flex', width: 'fit-content' }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default VPProjectDashboard;
