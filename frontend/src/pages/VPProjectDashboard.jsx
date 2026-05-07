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
  metricsContent,
  visibleSections
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
    <div className="vppd-root" style={{ padding: 0 }}>
      <div className="vppd-main-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* ── PROJECT METRICS SUMMARY ── */}
        {visibleSections.metricsSummary && metricsContent && (
          <div className="vppd-section full">
            <div className="vppd-section-header">
              <TrendingUp size={18} color="var(--primary)" />
              Project Metrics Summary
            </div>
            <div style={{ padding: '0px' }}>
              {metricsContent}
            </div>
          </div>
        )}

        {/* ── MOM ISSUES ── */}
        {visibleSections.criticalIssues && (
          <div className="vppd-section full">
            <div className="vppd-section-header" style={{ color: '#0F766E' }}>
              <ClipboardList size={18} color="#0D9488" />
              MOM Issues
            </div>
            <div className="vppd-meeting-list" style={{ padding: '0px' }}>
              {momIssues.length === 0 ? (
                <div className="vppd-empty">No issues synced from meetings yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {momIssues.slice(0, 12).map(issue => {
                    const isClosed = issue.status === 'Closed' || issue.status === 'Done' || issue.status === 'Resolved';
                    const isHigh = issue.priority === 'High' || issue.priority === 'Critical';
                    return (
                      <div key={issue.id} style={{
                        padding: '16px', border: '1px solid #E2E8F0', borderRadius: '10px',
                        background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px',
                        boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', lineHeight: '1.4' }}>
                            {issue.title}
                          </div>
                          <div className={`vppd-badge ${isHigh ? 'red' : 'yellow'}`} style={{ whiteSpace: 'nowrap' }}>
                            {issue.priority}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>{issue.owner}</span>
                            <span>•</span>
                            <span>{issue.created_at ? new Date(issue.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Unknown'}</span>
                          </div>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800,
                            color: isClosed ? '#166534' : '#B45309',
                            background: isClosed ? '#F0FDFA' : '#FFFBEB',
                            padding: '4px 8px', borderRadius: '4px'
                          }}>
                            {isClosed ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                            {isClosed ? 'RESOLVED' : 'PENDING'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MILESTONE PROGRESS TRACKER ── */}
        {visibleSections.milestones && (
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
                          <td style={{ fontWeight: 800, color: '#0f172a' }}>{m.module || 'General'}</td>
                          <td>{m.milestone}</td>
                          <td>{m.planned_date || '-'}</td>
                          <td>{m.actual_date || '-'}</td>
                          <td>
                            <span className={`vppd-badge ${isDelayed ? 'red' : 'green'}`}>
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
        )}

      </div>
    </div>
  );
};
export default VPProjectDashboard;
