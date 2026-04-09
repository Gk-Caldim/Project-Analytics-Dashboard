/**
 * CriticalIssuesWidget.jsx
 * ─────────────────────────
 * VP-grade critical issues panel for the Project Dashboard.
 * - Fetches top 5 critical issues from the live DB
 * - Shows analytics summary bar (Open / Overdue / At Risk / Closed)
 * - Status-color coded pills
 * - Escalation 🚨 marker
 * - Clicking a card opens IssueDetailModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Clock,
  Plus, RefreshCw, ChevronRight, Flame, User, Building2,
  Calendar, TrendingUp, Shield, ArrowUpRight
} from 'lucide-react';
import { getCriticalIssues, getIssueAnalytics, STATUS_COLORS, PRIORITY_COLORS } from '../../api/issues';
import IssueDetailModal from './IssueDetailModal';
import CreateIssueModal from './CreateIssueModal';

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS['On Track'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '2px 10px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em',
      backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px',
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {priority}
    </span>
  );
};

const MetricBubble = ({ label, value, color, icon: Icon }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '10px 16px', borderRadius: '10px',
    backgroundColor: color + '15', border: `1px solid ${color}30`,
    minWidth: 80, flex: 1,
  }}>
    {Icon && <Icon size={14} color={color} style={{ marginBottom: 4 }} />}
    <span style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
    <span style={{ fontSize: '10px', color: '#6b7280', marginTop: 3, fontWeight: 600, textAlign: 'center' }}>{label}</span>
  </div>
);

// ─── Main Widget ─────────────────────────────────────────────────────────────

const CriticalIssuesWidget = ({ projectId, onDataChange }) => {
  const [issues, setIssues]       = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selectedIssue, setSelectedIssue]   = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const [crit, anal] = await Promise.all([
        getCriticalIssues(projectId, 5),
        getIssueAnalytics(projectId),
      ]);
      setIssues(Array.isArray(crit) ? crit : []);
      setAnalytics(anal);
    } catch (err) {
      console.error('[CriticalIssuesWidget] load error:', err);
      setError('Failed to load critical issues');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleIssueCreated = () => {
    setShowCreateModal(false);
    load();
    onDataChange?.();
  };

  const handleIssueUpdated = () => {
    setSelectedIssue(null);
    load();
    onDataChange?.();
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Flame size={18} color="#ef4444" />
          <span style={styles.headerTitle}>Critical Issues</span>
        </div>
      </div>
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
        <div style={{ fontSize: '13px' }}>Loading critical issues…</div>
      </div>
    </div>
  );

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Flame size={18} color="#ef4444" />
          <span style={styles.headerTitle}>Critical Issues</span>
        </div>
        <button onClick={load} style={styles.iconBtn} title="Retry">
          <RefreshCw size={14} />
        </button>
      </div>
      <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>
        {error}
      </div>
    </div>
  );

  const hasIssues = issues.length > 0;

  return (
    <>
      <div style={styles.container}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Flame size={18} color="#ef4444" />
            <span style={styles.headerTitle}>Critical Issues</span>
            {analytics?.total_overdue > 0 && (
              <span style={styles.overdueChip}>
                <AlertTriangle size={10} style={{ marginRight: 3 }} />
                {analytics.total_overdue} Overdue
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={styles.iconBtn} title="Refresh">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={styles.createBtn}
              id="create-issue-btn"
            >
              <Plus size={13} />
              <span>New Issue</span>
            </button>
          </div>
        </div>

        {/* ── Analytics Banner ── */}
        {analytics && (
          <div style={styles.analyticsBanner}>
            <MetricBubble label="Open"     value={analytics.total_open}        color="#3b82f6" icon={AlertCircle} />
            <MetricBubble label="Overdue"  value={analytics.total_overdue}     color="#ef4444" icon={AlertTriangle} />
            <MetricBubble label="At Risk"  value={analytics.total_at_risk}     color="#f97316" icon={Clock} />
            <MetricBubble label="Closed"   value={analytics.total_closed}      color="#22c55e" icon={CheckCircle2} />
          </div>
        )}

        {/* ── Empty State ── */}
        {!hasIssues && (
          <div style={styles.emptyState}>
            <Shield size={36} color="#22c55e" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '14px' }}>No Critical Issues</div>
            <div style={{ color: '#6b7280', fontSize: '12px', marginTop: 4 }}>
              All tracked items are under control for this project.
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ ...styles.createBtn, marginTop: 14 }}
            >
              <Plus size={12} /> Log New Issue
            </button>
          </div>
        )}

        {/* ── Issue Cards ── */}
        {hasIssues && (
          <div style={styles.issueList}>
            {issues.map((issue, idx) => {
              const ds = issue.derived_status || 'On Track';
              const sc = STATUS_COLORS[ds] || STATUS_COLORS['On Track'];
              const isEscalated = issue.is_escalated;
              const isOverdue   = ds === 'Overdue';

              return (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  style={{
                    ...styles.issueCard,
                    borderLeft: `4px solid ${sc.dot}`,
                    backgroundColor: isEscalated ? '#fff7f7' : '#fff',
                    cursor: 'pointer',
                  }}
                  id={`issue-card-${issue.id}`}
                >
                  {/* Rank + Escalation */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={styles.rankBadge}>#{idx + 1}</span>
                      {isEscalated && (
                        <span style={styles.escalationChip}>
                          <AlertTriangle size={9} style={{ marginRight: 2 }} /> ESCALATED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <PriorityBadge priority={issue.priority} />
                      <StatusPill status={ds} />
                    </div>
                  </div>

                  {/* Title */}
                  <div style={styles.issueTitle}>{issue.title}</div>

                  {/* Meta row */}
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}>
                      <User size={11} color="#6b7280" />
                      <span>{issue.owner}</span>
                    </span>
                    {issue.department && (
                      <span style={styles.metaItem}>
                        <Building2 size={11} color="#6b7280" />
                        <span>{issue.department}</span>
                      </span>
                    )}
                    {issue.due_date && (
                      <span style={{
                        ...styles.metaItem,
                        color: isOverdue ? '#ef4444' : '#6b7280',
                        fontWeight: isOverdue ? 700 : 400,
                      }}>
                        <Calendar size={11} color={isOverdue ? '#ef4444' : '#6b7280'} />
                        <span>
                          {isOverdue
                            ? `${issue.days_overdue}d overdue`
                            : new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                          }
                        </span>
                      </span>
                    )}
                    <span style={styles.metaItem}>
                      <TrendingUp size={11} color="#6b7280" />
                      <span>Score {issue.urgency_score}</span>
                    </span>
                  </div>

                  {/* Arrow CTA */}
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}

            {/* View All Link */}
            {analytics && analytics.total_open > 5 && (
              <div style={{ textAlign: 'center', paddingTop: 6 }}>
                <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>
                  +{analytics.total_open - 5} more open issues <ArrowUpRight size={11} style={{ verticalAlign: 'middle' }} />
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Department Breakdown ── */}
        {analytics && Object.keys(analytics.by_department || {}).length > 0 && (
          <div style={styles.deptSection}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              By Department
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(analytics.by_department).map(([dept, count]) => (
                <span key={dept} style={styles.deptChip}>
                  {dept} <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdated={handleIssueUpdated}
        />
      )}
      {showCreateModal && (
        <CreateIssueModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleIssueCreated}
        />
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#fafafa',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  headerTitle: {
    fontSize: '15px', fontWeight: 700, color: '#111827',
  },
  overdueChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: '999px',
    backgroundColor: '#fee2e2', color: '#991b1b',
    fontSize: '10px', fontWeight: 700,
  },
  iconBtn: {
    background: 'none', border: '1px solid #e5e7eb',
    borderRadius: '6px', padding: '5px 7px',
    cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center',
  },
  createBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: '7px',
    backgroundColor: '#1e3a5f', color: '#fff',
    fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
  },
  analyticsBanner: {
    display: 'flex', gap: 10, padding: '14px 18px',
    borderBottom: '1px solid #f3f4f6',
    flexWrap: 'wrap',
  },
  emptyState: {
    padding: '40px', textAlign: 'center',
  },
  issueList: {
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  issueCard: {
    position: 'relative',
    padding: '14px 40px 14px 14px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.15s',
  },
  rankBadge: {
    fontSize: '10px', fontWeight: 800, color: '#9ca3af',
    backgroundColor: '#f3f4f6', padding: '1px 6px', borderRadius: '4px',
  },
  escalationChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '1px 7px', borderRadius: '4px',
    backgroundColor: '#fee2e2', color: '#b91c1c',
    fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em',
    border: '1px solid #fca5a5',
  },
  issueTitle: {
    fontSize: '13px', fontWeight: 600, color: '#111827',
    marginBottom: 6, lineHeight: '1.4',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: 'calc(100% - 20px)',
  },
  metaRow: {
    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
  },
  metaItem: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '11px', color: '#6b7280',
  },
  deptSection: {
    padding: '12px 18px',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#fafafa',
  },
  deptChip: {
    padding: '3px 10px', borderRadius: '999px',
    backgroundColor: '#f3f4f6', color: '#374151',
    fontSize: '11px', border: '1px solid #e5e7eb',
  },
};

export default CriticalIssuesWidget;
