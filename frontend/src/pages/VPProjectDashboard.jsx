import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, AlertTriangle, Calendar, Award, CheckCircle, Clock, TrendingUp, ClipboardList, AlertCircle, CheckCircle2, Users, RefreshCw, FileText, X } from 'lucide-react';
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

  // --- Pinned Issues State ---
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [pinnedIssueIds, setPinnedIssueIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`caldim_pinned_issues_${activeProject?.dbProjectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [tempPinnedIds, setTempPinnedIds] = useState([]);

  // Sync pinned issues if project changes
  useEffect(() => {
    if (activeProject?.dbProjectId) {
      try {
        const stored = localStorage.getItem(`caldim_pinned_issues_${activeProject.dbProjectId}`);
        setPinnedIssueIds(stored ? JSON.parse(stored) : []);
      } catch (e) {
        setPinnedIssueIds([]);
      }
    }
  }, [activeProject?.dbProjectId]);

  const filteredMomIssues = useMemo(() => {
    if (syncHistory.length === 0) {
      return momIssues;
    }
    const latestSync = syncHistory[0];
    return momIssues.filter(i => 
      (i.sync_id && i.sync_id === latestSync.sync_id) || 
      (i.meeting_id && (i.meeting_id === latestSync.session_id || i.meeting_id === latestSync.meeting_id))
    );
  }, [momIssues, syncHistory]);

  const displayIssues = useMemo(() => {
    if (pinnedIssueIds.length > 0) {
      const pinned = filteredMomIssues.filter(i => pinnedIssueIds.includes(i.id));
      if (pinned.length > 0) return pinned;
    }
    return filteredMomIssues.slice(0, 5);
  }, [filteredMomIssues, pinnedIssueIds]);

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
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '18px 24px', 
              borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(to right, var(--elevated-card), var(--surface))'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  CRITICAL ISSUES
                </span>
                
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Total Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--elevated-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--text-secondary)'
                }}>
                  <ClipboardList size={12} color="var(--text-muted)" />
                  TOTAL: <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.length}</span>
                </div>
                
                {/* Pending Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--amber-50)', 
                  border: '1px solid var(--amber-200)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--amber-900)'
                }}>
                  <AlertCircle size={12} color="var(--amber)" />
                  PENDING: <span style={{ color: 'var(--amber-900)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length}</span>
                </div>

                {/* Resolved Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--green-50)', 
                  border: '1px solid var(--green-200)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--green-900)'
                }}>
                  <CheckCircle2 size={12} color="var(--green)" />
                  RESOLVED: <span style={{ color: 'var(--green-900)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.filter(i => i.status === 'Closed' || i.status === 'Resolved').length}</span>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                {/* Premium Refresh Button */}
                <button
                  onClick={() => {
                    fetchingRef.current = false;
                    fetchMomIssues();
                  }}
                  disabled={loadingMom}
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 700,
                    color: 'var(--accent)', 
                    background: 'var(--elevated-card)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px',
                    padding: '5px 12px',
                    cursor: loadingMom ? 'default' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                  }}
                >
                  <RefreshCw size={12} style={{ animation: loadingMom ? 'spin 1s linear infinite' : 'none' }} />
                  REFRESH
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
                  <div className="vppd-mom-form-header" style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--accent)" />
                      <h2 className="vppd-mom-form-title" style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Minutes of Meeting (MOM Action Items)
                      </h2>
                    </div>
                    <div className="vppd-mom-form-meta" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      FORM NO: MOM/DB/2026 <span className="mx-2" style={{ color: 'var(--border-subtle)' }}>|</span> REV: 0.1
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
                        {displayIssues.map((issue, idx) => {
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
                  {filteredMomIssues.length > displayIssues.length && (
                    <div style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          setTempPinnedIds(pinnedIssueIds.length > 0 ? [...pinnedIssueIds] : displayIssues.map(i => i.id));
                          setIsIssueModalOpen(true);
                        }}
                        style={{
                          background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--elevated-card)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        + {filteredMomIssues.length - displayIssues.length} more issues
                      </button>
                    </div>
                  )}
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

      {/* ── PINNED ISSUES MODAL ── */}
      {isIssueModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '12px', width: '100%', maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Select Critical Issues</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Pin exactly 5 issues to your project dashboard. ({tempPinnedIds.length}/5 selected)
                </p>
              </div>
              <button 
                onClick={() => setIsIssueModalOpen(false)}
                style={{ background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '12px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMomIssues.map(issue => {
                const isSelected = tempPinnedIds.includes(issue.id);
                const isMaxReached = tempPinnedIds.length >= 5 && !isSelected;
                return (
                  <div 
                    key={issue.id}
                    onClick={() => {
                      if (isSelected) {
                        setTempPinnedIds(prev => prev.filter(id => id !== issue.id));
                      } else if (!isMaxReached) {
                        setTempPinnedIds(prev => [...prev, issue.id]);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 16px', borderRadius: '8px',
                      background: isSelected ? 'var(--blue-50)' : 'var(--elevated-card)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: isMaxReached ? 'not-allowed' : 'pointer',
                      opacity: isMaxReached ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isMaxReached ? 0.5 : 1
                    }}>
                      {isSelected && <CheckCircle2 size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {issue.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={10} color={issue.priority === 'High' || issue.priority === 'Critical' ? 'var(--red)' : 'var(--amber)'} />
                          {issue.priority || 'Medium'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={10} />
                          {issue.owner || 'Unassigned'}
                        </span>
                        <span>{issue.status || 'Pending'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
              <button 
                onClick={() => setIsIssueModalOpen(false)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setPinnedIssueIds(tempPinnedIds);
                  if (activeProject?.dbProjectId) {
                    localStorage.setItem(`caldim_pinned_issues_${activeProject.dbProjectId}`, JSON.stringify(tempPinnedIds));
                  }
                  setIsIssueModalOpen(false);
                }}
                disabled={tempPinnedIds.length === 0}
                style={{ 
                  padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', 
                  background: tempPinnedIds.length > 0 ? 'var(--accent)' : 'var(--border-subtle)', 
                  border: 'none', borderRadius: '6px', 
                  cursor: tempPinnedIds.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: tempPinnedIds.length > 0 ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                }}
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default VPProjectDashboard;
