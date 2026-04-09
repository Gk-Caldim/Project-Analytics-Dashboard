/**
 * IssueDetailModal.jsx
 * ─────────────────────
 * Full-detail side panel for a single issue.
 * Shows: title, status, owner, priority, department, due date, description,
 *        action items, comment thread, escalation history.
 * Allows: status update, adding actions, adding comments.
 */

import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, CheckCircle2, Clock, User, Building2,
  Calendar, MessageSquare, Zap, ChevronRight, Plus, Send,
  Edit2, Save, RotateCcw
} from 'lucide-react';
import {
  getIssue, updateIssue, addAction, addComment,
  STATUS_COLORS, PRIORITY_COLORS
} from '../../api/issues';

// ─── Escalation level label ───────────────────────────────────────────────────
const ESCALATION_LABEL = { 1: 'Project Manager', 2: 'Department Head', 3: 'VP / Admin' };
const ESCALATION_COLOR = { 1: '#f97316', 2: '#ef4444', 3: '#7c3aed' };

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: '11px', fontWeight: 800, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    borderBottom: '1px solid #f3f4f6', paddingBottom: 6, marginBottom: 10,
  }}>
    {children}
  </div>
);

const StatusPill = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS['On Track'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 12px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 700,
      backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: c.dot }} />
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '5px',
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {priority}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IssueDetailModal = ({ issue: initialIssue, onClose, onUpdated }) => {
  const [issue, setIssue]           = useState(initialIssue);
  const [loading, setLoading]       = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus]   = useState(initialIssue.status);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction]   = useState({ action_text: '', responsible_person: '', target_date: '' });
  const [showAddAction, setShowAddAction] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [commentSending, setCommentSending] = useState(false);

  // Reload full issue with relations on mount
  useEffect(() => {
    const reload = async () => {
      try {
        setLoading(true);
        const fresh = await getIssue(issue.id);
        setIssue(fresh);
        setNewStatus(fresh.status);
      } catch (e) {
        console.error('[IssueDetailModal] reload error:', e);
      } finally {
        setLoading(false);
      }
    };
    reload();
  }, [issue.id]);

  const ds = issue.derived_status || 'On Track';

  const handleStatusSave = async () => {
    try {
      setSaving(true);
      const updated = await updateIssue(issue.id, { status: newStatus });
      setIssue(prev => ({ ...prev, ...updated }));
      setEditStatus(false);
      onUpdated?.();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      setCommentSending(true);
      const comment = await addComment(issue.id, { comment_text: newComment.trim(), created_by: 'User' });
      setIssue(prev => ({ ...prev, comments: [...(prev.comments || []), comment] }));
      setNewComment('');
    } catch (e) {
      alert('Failed to add comment');
    } finally {
      setCommentSending(false);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.action_text.trim()) return;
    try {
      setSaving(true);
      const action = await addAction(issue.id, {
        action_text: newAction.action_text.trim(),
        responsible_person: newAction.responsible_person.trim() || undefined,
        target_date: newAction.target_date || undefined,
        status: 'Pending',
      });
      setIssue(prev => ({ ...prev, actions: [...(prev.actions || []), action] }));
      setNewAction({ action_text: '', responsible_person: '', target_date: '' });
      setShowAddAction(false);
    } catch (e) {
      alert('Failed to add action');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.panel}>
        {/* ── Header ── */}
        <div style={styles.panelHeader}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>
                #{issue.id} · {issue.source_type}
              </span>
              {issue.is_escalated && (
                <span style={styles.escBadge}>
                  <AlertTriangle size={9} /> ESCALATED
                </span>
              )}
            </div>
            <div style={styles.panelTitle}>{issue.title}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={16} />
          </button>
        </div>

        <div style={styles.body}>
          {/* ── Status + Priority Row ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatusPill status={ds} />
            <PriorityBadge priority={issue.priority} />
            {!editStatus && (
              <button onClick={() => setEditStatus(true)} style={styles.ghostBtn}>
                <Edit2 size={11} /> Change Status
              </button>
            )}
          </div>

          {/* ── Status Edit ── */}
          {editStatus && (
            <div style={styles.statusEditBox}>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                style={styles.select}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
              <button onClick={handleStatusSave} disabled={saving} style={styles.saveBtn}>
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditStatus(false)} style={styles.cancelBtn}>
                <RotateCcw size={12} /> Cancel
              </button>
            </div>
          )}

          {/* ── Meta Grid ── */}
          <div style={styles.metaGrid}>
            <div style={styles.metaCell}>
              <User size={13} color="#6b7280" />
              <div>
                <div style={styles.metaLabel}>Owner</div>
                <div style={styles.metaValue}>{issue.owner}</div>
              </div>
            </div>
            {issue.department && (
              <div style={styles.metaCell}>
                <Building2 size={13} color="#6b7280" />
                <div>
                  <div style={styles.metaLabel}>Department</div>
                  <div style={styles.metaValue}>{issue.department}</div>
                </div>
              </div>
            )}
            {issue.due_date && (
              <div style={styles.metaCell}>
                <Calendar size={13} color={ds === 'Overdue' ? '#ef4444' : '#6b7280'} />
                <div>
                  <div style={styles.metaLabel}>Due Date</div>
                  <div style={{ ...styles.metaValue, color: ds === 'Overdue' ? '#ef4444' : '#111827', fontWeight: ds === 'Overdue' ? 700 : 500 }}>
                    {new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {ds === 'Overdue' && ` (${issue.days_overdue}d overdue)`}
                  </div>
                </div>
              </div>
            )}
            <div style={styles.metaCell}>
              <Zap size={13} color="#6b7280" />
              <div>
                <div style={styles.metaLabel}>Urgency Score</div>
                <div style={styles.metaValue}>{issue.urgency_score}</div>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          {issue.description && (
            <div style={styles.section}>
              <SectionTitle>Description</SectionTitle>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                {issue.description}
              </p>
            </div>
          )}

          {/* ── Escalations ── */}
          {issue.escalations?.length > 0 && (
            <div style={styles.section}>
              <SectionTitle>Escalation History</SectionTitle>
              {issue.escalations.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                  backgroundColor: `${ESCALATION_COLOR[e.escalation_level]}10`,
                  border: `1px solid ${ESCALATION_COLOR[e.escalation_level]}30`,
                }}>
                  <AlertTriangle size={14} color={ESCALATION_COLOR[e.escalation_level]} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: ESCALATION_COLOR[e.escalation_level] }}>
                      Level {e.escalation_level} — {ESCALATION_LABEL[e.escalation_level]}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: 2 }}>{e.reason}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: 2 }}>
                      {new Date(e.escalated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Action Items ── */}
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <SectionTitle>Action Items</SectionTitle>
              <button onClick={() => setShowAddAction(!showAddAction)} style={styles.ghostBtn}>
                <Plus size={11} /> Add Action
              </button>
            </div>

            {showAddAction && (
              <div style={styles.addActionBox}>
                <input
                  placeholder="Describe the action…"
                  value={newAction.action_text}
                  onChange={e => setNewAction(p => ({ ...p, action_text: e.target.value }))}
                  style={{ ...styles.input, marginBottom: 6 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="Responsible person"
                    value={newAction.responsible_person}
                    onChange={e => setNewAction(p => ({ ...p, responsible_person: e.target.value }))}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="date"
                    value={newAction.target_date}
                    onChange={e => setNewAction(p => ({ ...p, target_date: e.target.value }))}
                    style={{ ...styles.input, width: 140 }}
                  />
                  <button onClick={handleAddAction} disabled={saving} style={styles.saveBtn}>
                    {saving ? '…' : 'Add'}
                  </button>
                </div>
              </div>
            )}

            {(issue.actions || []).length === 0 && !showAddAction && (
              <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>No action items yet.</div>
            )}
            {(issue.actions || []).map(action => (
              <div key={action.id} style={styles.actionRow}>
                <ChevronRight size={12} color="#9ca3af" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#111827' }}>{action.action_text}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: 2 }}>
                    {action.responsible_person && `Owner: ${action.responsible_person}`}
                    {action.target_date && ` · Due: ${new Date(action.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  backgroundColor: action.status === 'Done' ? '#d1fae5' : action.status === 'In Progress' ? '#dbeafe' : '#f3f4f6',
                  color: action.status === 'Done' ? '#065f46' : action.status === 'In Progress' ? '#1e40af' : '#374151',
                }}>
                  {action.status}
                </span>
              </div>
            ))}
          </div>

          {/* ── Comments ── */}
          <div style={styles.section}>
            <SectionTitle>Comments</SectionTitle>
            {(issue.comments || []).length === 0 && (
              <div style={{ fontSize: '12px', color: '#9ca3af', padding: '6px 0' }}>No comments yet.</div>
            )}
            {(issue.comments || []).map(c => (
              <div key={c.id} style={styles.commentRow}>
                <div style={styles.commentAvatar}>{(c.created_by || 'U')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{c.created_by}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>{c.comment_text}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: 3 }}>
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                placeholder="Add a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                style={{ ...styles.input, flex: 1 }}
              />
              <button onClick={handleAddComment} disabled={commentSending || !newComment.trim()} style={styles.saveBtn}>
                <Send size={13} />
              </button>
            </div>
          </div>

          {/* ── Timestamps ── */}
          <div style={{ marginTop: 12, padding: '10px 0', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              Created: {new Date(issue.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {issue.updated_at && (
                <span> · Updated: {new Date(issue.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 3000, display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff', width: '480px', maxWidth: '95vw',
    height: '100vh', display: 'flex', flexDirection: 'column',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.22s ease-out',
  },
  panelHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '18px 20px', borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#1e3a5f',
  },
  panelTitle: {
    fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: '1.35',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
    padding: '6px', cursor: 'pointer', color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center',
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '18px 20px',
  },
  escBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '1px 7px', borderRadius: '4px',
    backgroundColor: '#fee2e2', color: '#b91c1c',
    fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em',
    border: '1px solid #fca5a5',
  },
  metaGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 12, marginBottom: 18,
    padding: 14, backgroundColor: '#f9fafb',
    borderRadius: 10, border: '1px solid #f3f4f6',
  },
  metaCell: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
  },
  metaLabel: { fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
  metaValue: { fontSize: '13px', color: '#111827', fontWeight: 500, marginTop: 1 },
  section: { marginBottom: 18 },
  actionRow: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '8px 0', borderBottom: '1px solid #f9fafb',
  },
  commentRow: {
    display: 'flex', gap: 10, padding: '8px 0',
    borderBottom: '1px solid #f9fafb',
  },
  commentAvatar: {
    width: 30, height: 30, borderRadius: '50%',
    backgroundColor: '#1e3a5f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },
  input: {
    border: '1px solid #d1d5db', borderRadius: '6px',
    padding: '7px 10px', fontSize: '13px', color: '#111827',
    outline: 'none', width: '100%',
  },
  saveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '7px 14px', borderRadius: '6px',
    backgroundColor: '#1e3a5f', color: '#fff',
    fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  cancelBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '7px 12px', borderRadius: '6px',
    backgroundColor: '#f3f4f6', color: '#374151',
    fontSize: '12px', fontWeight: 600, border: '1px solid #e5e7eb', cursor: 'pointer',
  },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: '6px',
    backgroundColor: 'transparent', color: '#3b82f6',
    fontSize: '11px', fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer',
  },
  statusEditBox: {
    display: 'flex', gap: 8, alignItems: 'center',
    padding: '12px', borderRadius: '8px',
    backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
    marginBottom: 14,
  },
  addActionBox: {
    padding: '12px', borderRadius: '8px',
    backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
    marginBottom: 10,
  },
  select: {
    border: '1px solid #d1d5db', borderRadius: '6px',
    padding: '7px 10px', fontSize: '13px', color: '#111827',
    outline: 'none', flex: 1,
  },
};

export default IssueDetailModal;
