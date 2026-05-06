import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, AlertTriangle, Calendar, Award, CheckCircle, Clock, TrendingUp, ClipboardList, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import CriticalIssuesWidget from '../components/issues/CriticalIssuesWidget';
import TopRisksPanel from '../components/issues/TopRisksPanel';
import API from '../utils/api';
import { listIssues } from '../api/issues';
import './VPProjectDashboard.css';

const VPProjectDashboard = ({
  activeProject,
  dashboardData,
  onConfigure,
  onSendMail,
  metricsContent
}) => {
  const navigate = useNavigate();
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [momIssues, setMomIssues] = useState([]);

  // Fetch recent meetings explicitly for this project
  useEffect(() => {
    if (!activeProject?.dbProjectId) return;
    
    // 1. Fetch Meetings
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

    // 2. Fetch MOM Issues
    listIssues({ project_id: activeProject.dbProjectId })
      .then(issues => {
        const momSpecific = issues
          .filter(i => i.source === 'MOM')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setMomIssues(momSpecific); // Store all to calculate meeting stats
      })
      .catch(err => console.error('Failed to fetch MOM issues:', err));
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


      {/* ── 1. HEADER (REMOVED AS DUPLICATED) ── */}
      {/*
      <div className="vppd-header">
        ...
      </div>
      */}

      {/* ── 3. KPI SUMMARY BAR (REMOVED) ── */}
      {/*
      <div className="vppd-kpi-bar">
        ...
      </div>
      */}

      <div className="vppd-main-grid">
        {/* ── TOP RISKS PANEL (COMMENTED FOR FUTURE) ── */}
        {/*
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
        */}

        {/* ── CRITICAL ISSUES (COMMENTED FOR FUTURE) ── */}
        {/*
        <div className="vppd-section">
          <div className="vppd-section-header">
            <AlertTriangle size={18} color="#ef4444" />
            Top Critical Issues
          </div>
          <div style={{ marginLeft: '-15px', marginRight: '-15px' }}>
            {activeProject?.dbProjectId ? (
              <CriticalIssuesWidget projectId={activeProject.dbProjectId} />
            ) : (
              <div className="vppd-empty">Loading Critical Risks...</div>
            )}
          </div>
        </div>
        */}

        {/* ── METRICS SUMMARY (Option 1) ── */}
        {metricsContent && (
          <div className="vppd-section full">
            <div className="vppd-section-header">
              <TrendingUp size={18} color="#3b82f6" />
              Project Metrics Summary
            </div>
            <div style={{ marginLeft: '-10px', marginRight: '-10px' }}>
              {metricsContent}
            </div>
          </div>
        )}

        {/* ── 4. SYNCED MEETINGS ── */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <Calendar size={18} color="#3b82f6" />
            Synced MOM Sessions
          </div>
          <div className="vppd-meeting-list">
            {recentMeetings.length === 0 ? (
              <div className="vppd-empty">No MOM sessions logged for this project yet.</div>
            ) : (
              recentMeetings.map(m => {
                const meetingIssues = momIssues.filter(i => String(i.meeting_id) === String(m.id));
                const risks = meetingIssues.filter(i => i.priority === 'High' || i.priority === 'Critical').length;
                const resolved = meetingIssues.filter(i => i.status === 'Closed' || i.status === 'Done' || i.status === 'Resolved').length;
                const pending = meetingIssues.filter(i => i.status !== 'Closed' && i.status !== 'Done' && i.status !== 'Resolved').length;
                const participantCount = m.attendees ? m.attendees.length : (m.participant_count || 0);
                const isAtRisk = risks > 0;

                return (
                  <div key={m.id} className="vppd-meeting-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FAFBFC' }}>
                    {/* Row 1: Title + MOM badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <span
                        onClick={() => navigate(`/dashboard/mom/view?meetingId=${m.id}`)}
                        style={{ fontSize: '14px', fontWeight: 600, color: '#0D9488', cursor: 'pointer', lineHeight: 1.3 }}
                      >
                        {m.title || `MOM #${m.id}`}
                      </span>
                      <div className={`vppd-meeting-status ${m.mom_generated ? 'mom-done' : 'mom-pending'}`}>
                        {m.mom_generated ? 'MOM Logged' : 'Pending'}
                      </div>
                    </div>

                    {/* Row 2: Metadata + Stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {m.date}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {participantCount}
                      </span>
                      <span style={{ width: '1px', height: '14px', background: '#E2E8F0' }} />
                      <span style={{ color: risks > 0 ? '#DC2626' : '#64748B', fontWeight: 600 }}>{risks} Risks</span>
                      <span style={{ color: pending > 0 ? '#D97706' : '#64748B', fontWeight: 500 }}>{pending} Pending</span>
                      <span style={{ color: resolved > 0 ? '#166534' : '#64748B', fontWeight: 500 }}>{resolved} Resolved</span>
                      <div style={{
                        marginLeft: 'auto', padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                        background: isAtRisk ? '#FEF2F2' : '#F0FDFA', color: isAtRisk ? '#DC2626' : '#0D9488',
                      }}>
                        {isAtRisk ? 'AT RISK' : 'ON TRACK'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 4.5. MOM ISSUES (SYNCED) ── */}
        <div className="vppd-section">
          <div className="vppd-section-header" style={{ color: '#0F766E' }}>
            <ClipboardList size={18} color="#0D9488" />
            MOM Issues
          </div>
          <div className="vppd-meeting-list" style={{ padding: '0 12px 12px 12px' }}>
            {momIssues.length === 0 ? (
              <div className="vppd-empty">No issues synced from meetings yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {momIssues.slice(0, 10).map(issue => {
                  const isClosed = issue.status === 'Closed' || issue.status === 'Done' || issue.status === 'Resolved';
                  const isHigh = issue.priority === 'High' || issue.priority === 'Critical';
                  return (
                    <div key={issue.id} style={{
                      padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px',
                      background: '#fff', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', lineHeight: '1.4' }}>
                          {issue.title}
                        </div>
                        <div style={{
                          padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase',
                          background: isHigh ? '#FEE2E2' : '#FEF3C7',
                          color: isHigh ? '#B91C1C' : '#B45309',
                          border: `1px solid ${isHigh ? '#FCA5A5' : '#FDE68A'}`
                        }}>
                          {issue.priority}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{issue.owner}</span>
                          •
                          <span>{issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Unknown Date'}</span>
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
                          color: isClosed ? '#166534' : '#B45309',
                          background: isClosed ? '#F0FDFA' : '#FFFBEB',
                          padding: '2px 8px', borderRadius: '4px'
                        }}>
                          {isClosed ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          {isClosed ? 'Resolved' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
