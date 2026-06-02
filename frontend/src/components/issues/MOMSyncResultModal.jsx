/**
 * MOMSyncResultModal.jsx
 * ──────────────────────
 * Displays detailed MOM sync results with actionable feedback
 * Shows:
 * - Overall sync success/status
 * - Breakdown of created, skipped, downgraded items
 * - Per-row details with color-coded actions
 * - Option to download report or retry
 */


// react component
import React from 'react';
import {
  AlertCircle, CheckCircle2, AlertTriangle, Info,
  Download, X, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

const MOMSyncResultModal = ({ show, onClose, result, onRetry }) => {
  const [expandedRows, setExpandedRows] = React.useState({});

  if (!show || !result) return null;

  const {
    total_rows,
    issues_created,
    issues_skipped,
    missing_dates_downgraded,
    summary = {},
    details = [],
  } = result;

  const totalProcessed = issues_created + issues_skipped;
  const successRate = total_rows > 0 ? Math.round((issues_created / total_rows) * 100) : 0;

  const getActionColor = (action) => {
    if (action.includes('CREATED')) {
      if (action.includes('downgraded')) return { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' };
      return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    }
    if (action.includes('SKIPPED')) return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    if (action.includes('FAILED')) return { bg: '#fecaca', text: '#7c2d12', border: '#f87171' };
    return { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATED')) return '✓';
    if (action.includes('SKIPPED')) return '⊘';
    if (action.includes('FAILED')) return '✕';
    return '◦';
  };

  const toggleRow = (rowNum) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowNum]: !prev[rowNum]
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '900px',
        maxWidth: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}>
        {/* ── Header ── */}
        <div style={{
          backgroundColor: '#1e3a5f',
          color: 'white',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `3px solid ${issues_created > 0 ? '#10b981' : '#f59e0b'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={20} />
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>MOM Sync Results</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>

        {/* ── Content (Scrollable) ── */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {/* Total Rows */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Total Rows
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
                {total_rows}
              </div>
            </div>

            {/* Created */}
            <div style={{
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '6px' }}>
                ✓ Created
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#166534' }}>
                {issues_created}
              </div>
            </div>

            {/* Downgraded */}
            {missing_dates_downgraded > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Downgraded
                </div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#b45309' }}>
                  {missing_dates_downgraded}
                </div>
              </div>
            )}

            {/* Skipped */}
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', marginBottom: '6px' }}>
                ⊘ Skipped
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#991b1b' }}>
                {issues_skipped}
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Success Rate</span>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{successRate}%</span>
            </div>
            <div style={{
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              height: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: successRate > 75 ? '#10b981' : successRate > 50 ? '#f59e0b' : '#ef4444',
                width: `${successRate}%`,
                height: '100%',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Summary by Category */}
          {summary && Object.keys(summary).length > 0 && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#1e3a5f' }}>
                Breakdown by Category
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {summary.missing_owner > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} color="#ef4444" />
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{summary.missing_owner}</strong> missing owner
                    </span>
                  </div>
                )}
                {summary.missing_date_downgraded > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#b45309" />
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{summary.missing_date_downgraded}</strong> priority downgraded
                    </span>
                  </div>
                )}
                {summary.duplicate > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} color="#3b82f6" />
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{summary.duplicate}</strong> duplicates skipped
                    </span>
                  </div>
                )}
                {summary.error > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} color="#dc2626" />
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{summary.error}</strong> creation errors
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details Table */}
          {details && details.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '700', color: '#1e3a5f' }}>
                Per-Row Details ({details.length} items)
              </h4>
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '350px',
                overflowY: 'auto'
              }}>
                {details.map((detail, idx) => {
                  const colors = getActionColor(detail.action);
                  const isExpanded = expandedRows[detail.row];

                  return (
                    <div key={idx} style={{
                      borderBottom: idx < details.length - 1 ? '1px solid #f1f5f9' : 'none',
                      backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc'
                    }}>
                      <div
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onClick={() => detail.reason && toggleRow(detail.row)}
                        onMouseEnter={(e) => {
                          if (detail.reason) e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          backgroundColor: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          flexShrink: 0
                        }}>
                          {getActionIcon(detail.action)}
                        </div>

                        {/* Row Number & Title */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#1e3a5f'
                          }}>
                            Row {detail.row}
                            {detail.title && ` • "${detail.title}"`}
                            {detail.issue_id && ` (Issue #${detail.issue_id})`}
                          </div>
                        </div>

                        {/* Action Badge */}
                        <div style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          border: `1px solid ${colors.border}`
                        }}>
                          {detail.action}
                        </div>

                        {/* Expand Icon */}
                        {detail.reason && (
                          <div style={{ color: '#64748b', flexShrink: 0 }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && detail.reason && (
                        <div style={{
                          padding: '12px 16px 12px 52px',
                          backgroundColor: '#f1f5f9',
                          borderTop: '1px solid #e2e8f0',
                          fontSize: '12px',
                          color: '#475569',
                          fontStyle: 'italic'
                        }}>
                          {detail.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (Actions) ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            Close
          </button>

          {issues_created > 0 && (
            <button
              onClick={() => {
                const csv = generateCSV(details);
                downloadCSV(csv, `MOM-Sync-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              <Download size={14} />
              Export Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Utilities
const generateCSV = (details) => {
  const headers = ['Row Number', 'Title', 'Action', 'Reason', 'Issue ID'];
  const rows = details.map(d => [
    d.row,
    d.title || '-',
    d.action || '-',
    d.reason || '-',
    d.issue_id || '-'
  ]);
  return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default MOMSyncResultModal;
