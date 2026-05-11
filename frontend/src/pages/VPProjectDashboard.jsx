import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, AlertTriangle, Calendar, Award, CheckCircle, Clock, TrendingUp, ClipboardList, AlertCircle, CheckCircle2, Users, RefreshCw, FileText } from 'lucide-react';
import { useRef } from 'react';
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
  const [syncHistory, setSyncHistory] = useState([]);

  const [loadingMom, setLoadingMom] = useState(false);

  const fetchingRef = useRef(false);
  const projectIdRef = useRef(null);

  const fetchMomIssues = useCallback(() => {
    if (!activeProject?.dbProjectId) return;

    // Guard: skip if already fetching
    if (fetchingRef.current) {
      console.log('[VPPD] Fetch already in progress, skipping duplicate call');
      return;
    }

    fetchingRef.current = true;
    setLoadingMom(true);
    console.log('[VPPD] Fetching issues for project:',
      activeProject.dbProjectId, activeProject.name);

    const issuesPromise = listIssues({ project_id: activeProject.dbProjectId });
    const historyPromise = API.get(
      `/mom/history/project/${activeProject.dbProjectId}`
    ).catch(() => ({ data: [] }));

    Promise.all([issuesPromise, historyPromise])
      .then(([issues, historyRes]) => {
        const momSpecific = Array.isArray(issues)
          ? issues
            .filter(i => (i.source || '').toUpperCase() === 'MOM')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          : [];
        setMomIssues(momSpecific);

        if (Array.isArray(historyRes?.data)) {
          setSyncHistory(historyRes.data);
        }
      })
      .catch(err => {
        console.error('[VPPD] Fetch error:', err.message);
        setMomIssues([]);
      })
      .finally(() => {
        setLoadingMom(false);
        fetchingRef.current = false;
      });
  }, [activeProject?.dbProjectId]);  // depend on ID only, not full object

  useEffect(() => {
    // Only fetch when project ID actually changes
    const newId = activeProject?.dbProjectId;
    if (!newId || newId === projectIdRef.current) return;
    projectIdRef.current = newId;

    fetchMomIssues();

    API.get('/meetings')
      .then(res => {
        if (res.data?.success) {
          const projectMeetings = (res.data.meetings || [])
            .filter(m => String(m.project_id) === String(newId))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
          setRecentMeetings(projectMeetings);
        }
      })
      .catch(() => { });

    const refreshTimeoutRef = { current: null };
    const handleRemoteUpdate = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        fetchingRef.current = false;  // reset guard before refresh
        fetchMomIssues();
      }, 800);
    };

    window.addEventListener('MOM_SAVED', handleRemoteUpdate);
    window.addEventListener('ISSUE_SYNCED', handleRemoteUpdate);

    return () => {
      window.removeEventListener('MOM_SAVED', handleRemoteUpdate);
      window.removeEventListener('ISSUE_SYNCED', handleRemoteUpdate);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [activeProject?.dbProjectId, fetchMomIssues]);

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
        {(visibleSections.criticalIssues ?? true) && (
          <div className="vppd-section full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#0D9488' }}>Critical Issues</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>TOTAL: {momIssues.length}</span>
                <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 500 }}>
                  PENDING: {momIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length}
                </span>
                <span style={{ fontSize: '13px', color: '#10B981', fontWeight: 500 }}>
                  RESOLVED: {momIssues.filter(i => i.status === 'Closed' || i.status === 'Resolved').length}
                </span>
                <button
                  onClick={() => {
                    fetchingRef.current = false;  // reset guard
                    fetchMomIssues();
                  }}
                  disabled={loadingMom}
                  style={{ fontSize: '13px', color: '#0D9488', background: 'none', border: 'none', cursor: loadingMom ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} style={{ animation: loadingMom ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>
              </div>
            </div>
            <div className="vppd-meeting-list" style={{ padding: '0px' }}>
              {momIssues.length === 0 ? (
                <div className="vppd-empty">No issues synced from meetings yet.</div>
              ) : (
                <div className="vppd-mom-table-container animate-fadeIn">
                  {/* Form Style Header */}
                  <div className="vppd-mom-form-header">
                    <div style={{ flex: 1 }} />
                    <h2 className="vppd-mom-form-title">Minutes of Meeting (Issues)</h2>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <div className="vppd-mom-form-meta">
                        FORM NO: MOM/DB/2026 <span className="mx-2" style={{ color: '#E2E8F0' }}>|</span> REV: 0.1
                      </div>
                    </div>
                  </div>

                  <div className="vppd-table-wrapper" style={{ border: '1px solid #E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <table className="vppd-mom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>S.No</th>
                          <th style={{ width: '100px' }}>Function</th>
                          <th style={{ width: '150px' }}>Project</th>
                          <th style={{ width: '100px' }}>Criticality</th>
                          <th>Action Points Discussed</th>
                          <th style={{ width: '150px' }}>Responsibility</th>
                          <th style={{ width: '100px' }}>Target</th>
                          <th style={{ width: '120px' }}>Status</th>
                          <th style={{ width: '180px' }}>Action Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {momIssues.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div className="vppd-empty" style={{ padding: '60px 20px', background: '#F8FAFC', borderRadius: '0 0 8px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                                <div style={{ marginBottom: '20px', color: '#94A3B8' }}>
                                  <FileText size={48} strokeWidth={1} />
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>No meeting issues synced yet.</div>
                                <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
                                  Capture meeting minutes and sync your action items to track them here in the unified dashboard.
                                </div>
                                <button
                                  onClick={() => navigate('/dashboard/mom/capture')}
                                  style={{
                                    padding: '10px 24px', background: '#0D9488', color: 'white', border: 'none',
                                    borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(134,148,136,0.2)'
                                  }}
                                >
                                  Capture New Meeting
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          momIssues.map((issue, idx) => {
                            const priority = issue.priority || 'Medium';
                            const critStyles = {
                              'High': { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
                              'Medium': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
                              'Low': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
                              'Critical': { bg: '#DC2626', color: '#FFFFFF', border: '#B91C1C' },
                            }[priority] || { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };

                            const normalizeStatus = (status) => {
                              if (!status) return 'Pending';
                              const s = status.toLowerCase();
                              if (['open', 'pending', 'in progress'].includes(s)) return 'Pending';
                              if (['closed', 'done', 'resolved', 'complete'].includes(s)) return 'Resolved';
                              return status;
                            };

                            const isClosed = ['closed', 'done', 'resolved', 'complete'].includes(
                              (issue.status || '').toLowerCase()
                            );
                            const displayStatus = normalizeStatus(issue.status);

                            const statusBg = isClosed ? '#D1FAE5' : (displayStatus === 'Pending' ? '#FAEEDA' : '#F1F5F9');
                            const statusColor = isClosed ? '#065F46' : (displayStatus === 'Pending' ? '#854F0B' : '#475569');

                            return (
                              <tr key={issue.id}>
                                <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 500 }}>{idx + 1}</td>
                                <td style={{ textAlign: 'center', color: '#334155' }}>{issue.department || 'General'}</td>
                                <td style={{ fontWeight: 500, color: '#0F172A' }}>{activeProject.name}</td>
                                <td>
                                  <div style={{
                                    background: critStyles.bg, color: critStyles.color, border: `1px solid ${critStyles.border}`,
                                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                    textAlign: 'center', textTransform: 'uppercase'
                                  }}>
                                    {priority}
                                  </div>
                                </td>
                                <td style={{ lineHeight: 1.5, color: '#1E293B' }}>
                                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{issue.title}</div>
                                  {issue.description && issue.description !== issue.title && (
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>{issue.description}</div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '24px', height: '24px', borderRadius: '50%', background: '#F1F5F9',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#475569', flexShrink: 0
                                    }}>
                                      {issue.owner?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{issue.owner}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                                <td>
                                  <div style={{
                                    background: statusBg, color: statusColor,
                                    fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px',
                                    textAlign: 'center', textTransform: 'uppercase'
                                  }}>
                                    {displayStatus}
                                  </div>
                                </td>
                                <td style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>
                                  {(() => {
                                    if (!issue.comments || issue.comments.length === 0) return '—';
                                    const sorted = [...issue.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                    return sorted[0].comment_text;
                                  })()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 2: Sync History ── */}
            <div style={{ padding: '20px 20px 12px', borderTop: '1px solid #E2E8F0', marginTop: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Sync History</span>
            </div>
            {syncHistory.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', padding: '16px' }}>No sync history yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>#</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Meeting Name</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Date</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Synced At</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Issues</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((h, idx) => {
                    const parsedDate = h.date ? new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                    let parsedSyncedAt = '—';
                    if (h.synced_at) {
                      const sd = new Date(h.synced_at);
                      const sDateStr = sd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                      const sTimeStr = sd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                      parsedSyncedAt = `${sDateStr} · ${sTimeStr}`;
                    }
                    return (
                      <tr key={h.history_id || idx}>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', color: '#1E293B', verticalAlign: 'middle' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', color: '#1E293B', verticalAlign: 'middle', fontSize: '13px' }}>{h.meeting_name || 'Untitled Meeting'}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', color: '#64748B', verticalAlign: 'middle', fontSize: '13px' }}>{parsedDate}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', color: '#64748B', verticalAlign: 'middle', fontSize: '13px' }}>{parsedSyncedAt}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', color: '#0D9488', verticalAlign: 'middle', fontSize: '13px' }}>{h.row_count} issues</td>
                        <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #F1F5F9', verticalAlign: 'middle', fontSize: '13px' }}>
                          {h.mom_output_url ? (
                            <a href={h.mom_output_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0D9488', textDecoration: 'none' }}>
                              View Transcript →
                            </a>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
