/**
 * TopRisksPanel.jsx
 * ──────────────────
 * Compact, high-contrast "Top Risks" panel.
 * - Displays max 5 high-priority issues
 * - Card-based layout with minimal text
 * - Color-coded by priority: Red (High), Yellow (Medium), Green (Low)
 * - Click to open issue detail modal
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight, Zap } from 'lucide-react';
import { getCriticalIssues, PRIORITY_COLORS } from '../../api/issues';
import IssueDetailModal from './IssueDetailModal';

const TopRisksPanel = ({ projectId }) => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const fetchTopRisks = async () => {
    try {
      setLoading(true);
      const data = await getCriticalIssues(projectId, 5);
      setRisks(data);
      setError(null);
    } catch (err) {
      console.error('[TopRisksPanel] Fetch error:', err);
      setError('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTopRisks();
    }
  }, [projectId]);

  const getPriorityColor = (priority) => {
    const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
    return colors;
  };

  const getRiskStyle = (priority) => {
    const colors = getPriorityColor(priority);
    return {
      borderLeft: `4px solid ${colors.text}`,
      backgroundColor: colors.bg,
    };
  };

  if (loading && risks.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#ef4444" />
            <div style={styles.title}>Top Risks</div>
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={styles.skeleton} />
          <div style={styles.skeleton} />
          <div style={styles.skeleton} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#ef4444" />
            <div style={styles.title}>Top Risks</div>
          </div>
        </div>
        <div style={{ ...styles.emptyState, color: '#dc2626' }}>
          {error}
        </div>
      </div>
    );
  }

  const hasRisks = risks && risks.length > 0;

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#ef4444" />
            <div style={styles.title}>Top Risks</div>
            {hasRisks && (
              <span style={styles.countBadge}>{risks.length}</span>
            )}
          </div>
        </div>

        {!hasRisks ? (
          <div style={styles.emptyState}>
            <AlertCircle size={32} color="#22c55e" opacity={0.5} />
            <div>No risks detected</div>
          </div>
        ) : (
          <div style={styles.riskList}>
            {risks.map((risk, idx) => (
              <div
                key={risk.id}
                style={{
                  ...styles.riskCard,
                  ...getRiskStyle(risk.priority),
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: idx < risks.length - 1 ? '8px' : 0,
                  ':hover': {
                    transform: 'translateX(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }
                }}
                onClick={() => setSelectedIssue(risk)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={styles.riskContent}>
                  <div style={styles.riskTitle}>
                    {risk.title}
                  </div>
                  <div style={styles.riskMeta}>
                    <span style={styles.owner}>
                      {risk.owner || 'Unassigned'}
                    </span>
                    <span style={{
                      ...styles.priorityBadge,
                      backgroundColor: getPriorityColor(risk.priority).bg,
                      color: getPriorityColor(risk.priority).text,
                      borderColor: getPriorityColor(risk.priority).border,
                    }}>
                      {risk.priority}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdated={(updated) => {
            setRisks(prev =>
              prev.map(r => r.id === updated.id ? updated : r)
            );
          }}
        />
      )}
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
  },

  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },

  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1f2937',
    letterSpacing: '0.05em',
  },

  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: '12px',
    fontWeight: 700,
  },

  riskList: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    flex: 1,
    overflowY: 'auto',
  },

  riskCard: {
    padding: '12px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'none',
  },

  riskContent: {
    flex: 1,
    minWidth: 0,
  },

  riskTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '6px',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },

  riskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
  },

  owner: {
    color: '#6b7280',
    fontWeight: 500,
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },

  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '24px',
    color: '#9ca3af',
    fontSize: '13px',
    textAlign: 'center',
  },

  skeleton: {
    height: '60px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    marginBottom: '8px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
};

export default TopRisksPanel;
