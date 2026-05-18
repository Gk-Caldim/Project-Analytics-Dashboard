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



  return (
    <div className="vppd-root" style={{ padding: 0 }}>
      <div className="vppd-main-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ── PROJECT METRICS SUMMARY ── */}
        {visibleSections.metricsSummary && metricsContent && (
          <div className="vppd-section full">
            <div className="vppd-section-header">
              <TrendingUp size={18} color="var(--accent)" />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--accent)' }}>Critical Issues</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>TOTAL: {momIssues.length}</span>
                <span style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 500 }}>
                  PENDING: {momIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 500 }}>
                  RESOLVED: {momIssues.filter(i => i.status === 'Closed' || i.status === 'Resolved').length}
                </span>
                <button
                  onClick={() => {
                    fetchingRef.current = false;  // reset guard
                    fetchMomIssues();
                  }}
                  disabled={loadingMom}
                  style={{ fontSize: '13px', color: 'var(--accent)', background: 'none', border: 'none', cursor: loadingMom ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={14} style={{ animation: loadingMom ? 'spin 1s linear infinite' : 'none' }} />
                  Refresh
                </button>
              </div>
            </div>
            <div className="vppd-meeting-list" style={{ padding: '0px' }}>
              {momIssues.length === 0 ? (
                <div className="vppd-empty" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)' }}>
                  <div style={{ marginBottom: '20px', color: 'var(--text-muted)', opacity: 0.5 }}>
                    <FileText size={48} strokeWidth={1} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No meeting issues synced yet.</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
                    Capture meeting minutes and sync your action items to track them here in the unified dashboard.
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/mom/capture')}
                    style={{
                      padding: '10px 24px', background: 'var(--accent)', color: 'white', border: 'none',
                      borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Capture New Meeting
                  </button>
                </div>
              ) : (
                <div className="vppd-mom-table-container animate-fadeIn">
                  {/* Form Style Header */}
                  <div className="vppd-mom-form-header">
                    <div style={{ flex: 1 }} />
                    <h2 className="vppd-mom-form-title">Minutes of Meeting (Issues)</h2>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <div className="vppd-mom-form-meta">
                        FORM NO: MOM/DB/2026 <span className="mx-2" style={{ color: 'var(--border-subtle)' }}>|</span> REV: 0.1
                      </div>
                    </div>
                  </div>

                  <div className="vppd-table-wrapper" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
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
                        {momIssues.map((issue, idx) => {
                            const priority = issue.priority || 'Medium';
                            const critStyles = {
                              'High': { bg: 'var(--red-50)', color: 'var(--red-900)', border: 'var(--red-200)' },
                              'Medium': { bg: 'var(--amber-50)', color: 'var(--amber-900)', border: 'var(--amber-200)' },
                              'Low': { bg: 'var(--green-50)', color: 'var(--green-900)', border: 'var(--green-200)' },
                              'Critical': { bg: 'var(--red)', color: '#FFFFFF', border: 'var(--red-700)' },
                            }[priority] || { bg: 'var(--elevated-card)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };

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

                            const statusBg = isClosed ? 'var(--green-50)' : (displayStatus === 'Pending' ? 'var(--amber-50)' : 'var(--elevated-card)');
                            const statusColor = isClosed ? 'var(--green-900)' : (displayStatus === 'Pending' ? 'var(--amber-900)' : 'var(--text-secondary)');

                            return (
                              <tr key={issue.id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{issue.department || 'General'}</td>
                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{activeProject.name}</td>
                                <td>
                                  <div style={{
                                    background: critStyles.bg, color: critStyles.color, border: `1px solid ${critStyles.border}`,
                                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                    textAlign: 'center', textTransform: 'uppercase'
                                  }}>
                                    {priority}
                                  </div>
                                </td>
                                <td style={{ lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{issue.title}</div>
                                  {issue.description && issue.description !== issue.title && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{issue.description}</div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '24px', height: '24px', borderRadius: '50%', background: 'var(--elevated-card)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', flexShrink: 0
                                    }}>
                                      {issue.owner?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{issue.owner}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
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
                                <td style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  {(() => {
                                    if (!issue.comments || issue.comments.length === 0) return '—';
                                    const sorted = [...issue.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                    return sorted[0].comment_text;
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 2: Sync History ── */}
            <div style={{ padding: '20px 20px 12px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Sync History</span>
            </div>
            {syncHistory.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', opacity: 0.3 }}>
                  <RefreshCw size={32} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>No sync history yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>#</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Meeting Name</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Date</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Synced At</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Issues</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Action</th>
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
                      <tr key={h.history_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx === 0 ? 'var(--blue-50)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: idx === 0 ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.meeting_name || 'Untitled Meeting'}
                            </span>
                            {idx === 0 && (
                              <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-900)', border: '1px solid var(--green-200)', borderRadius: '99px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                                latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{parsedDate}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>{parsedSyncedAt}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{h.row_count} issues</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => h.session_id && navigate(`/dashboard/mom/view/${h.session_id}`)}
                            style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

          </div>
        )}




      </div>
    </div>
  );
};
export default VPProjectDashboard;
