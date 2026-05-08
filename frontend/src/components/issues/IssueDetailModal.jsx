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
  const [issue, setIssue] = useState(initialIssue);
  const [loading, setLoading] = useState(false);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(initialIssue.status);
  const [newComment, setNewComment] = useState('');
  const [newAction, setNewAction] = useState({ action_text: '', responsible_person: '', target_date: '' });
  const [showAddAction, setShowAddAction] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const [editOwner, setEditOwner] = useState(false);
  const [newOwner, setNewOwner] = useState(issue.owner);
  const handleOwnerSave = async () => {
    try {
      setSaving(true);
      const updated = await updateIssue(issue.id, { owner: newOwner });
      setIssue(prev => ({ ...prev, ...updated }));
      setEditOwner(false);
      onUpdated?.();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update owner');
    } finally {
      setSaving(false);
    }
  };

  const [editDue, setEditDue] = useState(false);
  const [newDue, setNewDue] = useState(issue.due_date || '');
  const handleDueSave = async () => {
    try {
      setSaving(true);
      const updated = await updateIssue(issue.id, { due_date: newDue });
      setIssue(prev => ({ ...prev, ...updated }));
      setEditDue(false);
      onUpdated?.();
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update due date');
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
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
                ISSUE #{issue.id} · {issue.source?.toUpperCase() || 'MANUAL'}
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
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          {/* ── Status + Priority Row ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatusPill status={ds} />
            <PriorityBadge priority={issue.priority} />
            {!editStatus && (
              <button onClick={() => setEditStatus(true)} style={styles.ghostBtn}>
                <Edit2 size={11} /> Update Status
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
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleStatusSave} disabled={saving} style={styles.saveBtn}>
                  <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditStatus(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Meta Grid ── */}
          <div style={styles.metaGrid}>
            <div style={styles.metaCell}>
              <User size={14} color="#64748b" style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={styles.metaLabel}>Owner</div>
                  {!editOwner && (
                    <button onClick={() => setEditOwner(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Edit2 size={10} color="#3b82f6" />
                    </button>
                  )}
                </div>
                {editOwner ? (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <input
                      value={newOwner}
                      onChange={e => setNewOwner(e.target.value)}
                      style={styles.inlineInput}
                    />
                    <button onClick={handleOwnerSave} style={styles.inlineSave} disabled={saving}>✓</button>
                    <button onClick={() => setEditOwner(false)} style={styles.inlineCancel}>✕</button>
                  </div>
                ) : (
                  <div style={styles.metaValue}>{issue.owner}</div>
                )}
              </div>
            </div>

            <div style={styles.metaCell}>
              <Calendar size={14} color={ds === 'Overdue' ? '#ef4444' : '#64748b'} style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={styles.metaLabel}>Due Date</div>
                  {!editDue && (
                    <button onClick={() => setEditDue(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Edit2 size={10} color="#3b82f6" />
                    </button>
                  )}
                </div>
                {editDue ? (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <input
                      type="date"
                      value={newDue ? newDue.split('T')[0] : ''}
                      onChange={e => setNewDue(e.target.value)}
                      style={styles.inlineInput}
                    />
                    <button onClick={handleDueSave} style={styles.inlineSave} disabled={saving}>✓</button>
                    <button onClick={() => setEditDue(false)} style={styles.inlineCancel}>✕</button>
                  </div>
                ) : (
                  <div style={{ ...styles.metaValue, color: ds === 'Overdue' ? '#ef4444' : '#1e3a5f', fontWeight: ds === 'Overdue' ? 700 : 600 }}>
                    {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date set'}
                    {ds === 'Overdue' && <span style={{ fontSize: '10px', marginLeft: 4 }}>({issue.days_overdue}d overdue)</span>}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.metaCell}>
              <Building2 size={14} color="#64748b" style={{ marginTop: 2 }} />
              <div>
                <div style={styles.metaLabel}>Department</div>
                <div style={styles.metaValue}>{issue.department || '—'}</div>
              </div>
            </div>

            <div style={styles.metaCell}>
              <Zap size={14} color="#f59e0b" style={{ marginTop: 2 }} />
              <div>
                <div style={styles.metaLabel}>Urgency</div>
                <div style={styles.metaValue}>{issue.urgency_score}</div>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          {issue.description && (
            <div style={styles.section}>
              <SectionTitle>Description</SectionTitle>
              <div style={styles.descriptionBox}>
                {issue.description}
              </div>
            </div>
          )}

          {/* ── Audit Logs ── */}
          {issue.audit_logs?.length > 0 && (
            <div style={styles.section}>
              <SectionTitle>History & Audit Trail</SectionTitle>
              <div style={styles.auditContainer}>
                {issue.audit_logs.map(log => (
                  <div key={log.id} style={styles.auditRow}>
                    <div style={styles.auditDot} />
                    <div style={{ flex: 1 }}>
                      <div style={styles.auditText}>
                        <span style={{ fontWeight: 700, color: '#1e3a5f' }}>{log.changed_by}</span> updated
                        <span style={{ fontWeight: 700, margin: '0 4px' }}>{log.field_changed}</span>
                        from <span style={styles.oldVal}>{log.old_value || 'None'}</span>
                        to <span style={styles.newVal}>{log.new_value}</span>
                      </div>
                      <div style={styles.auditTime}>
                        {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Escalations ── */}
          {issue.escalations?.length > 0 && (
            <div style={styles.section}>
              <SectionTitle>Escalations</SectionTitle>
              {issue.escalations.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px', borderRadius: 10, marginBottom: 8,
                  backgroundColor: `${ESCALATION_COLOR[e.escalation_level]}08`,
                  border: `1px solid ${ESCALATION_COLOR[e.escalation_level]}20`,
                }}>
                  <AlertTriangle size={16} color={ESCALATION_COLOR[e.escalation_level]} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: ESCALATION_COLOR[e.escalation_level] }}>
                      LEVEL {e.escalation_level} — {ESCALATION_LABEL[e.escalation_level]?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: 4, fontStyle: 'italic' }}>"{e.reason}"</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 6, fontWeight: 600 }}>
                      {new Date(e.escalated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Action Items ── */}
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <SectionTitle>Action Items</SectionTitle>
              <button onClick={() => setShowAddAction(!showAddAction)} style={styles.ghostBtn}>
                <Plus size={11} /> New Action
              </button>
            </div>

            {showAddAction && (
              <div style={styles.addActionBox}>
                <input
                  placeholder="What needs to be done?"
                  value={newAction.action_text}
                  onChange={e => setNewAction(p => ({ ...p, action_text: e.target.value }))}
                  style={{ ...styles.input, marginBottom: 8, fontWeight: 500 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Owner"
                    value={newAction.responsible_person}
                    onChange={e => setNewAction(p => ({ ...p, responsible_person: e.target.value }))}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    type="date"
                    value={newAction.target_date}
                    onChange={e => setNewAction(p => ({ ...p, target_date: e.target.value }))}
                    style={{ ...styles.input, width: 130 }}
                  />
                  <button onClick={handleAddAction} disabled={saving} style={styles.saveBtn}>
                    Add
                  </button>
                </div>
              </div>
            )}

            <div style={styles.actionList}>
              {(issue.actions || []).length === 0 && !showAddAction && (
                <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: 8, border: '1px dashed #e2e8f0' }}>No action items recorded.</div>
              )}
              {(issue.actions || []).map(action => (
                <div key={action.id} style={styles.actionRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>{action.action_text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      {action.responsible_person && (
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} /> {action.responsible_person}
                        </div>
                      )}
                      {action.target_date && (
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {new Date(action.target_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                    backgroundColor: action.status === 'Done' ? '#dcfce7' : action.status === 'In Progress' ? '#dbeafe' : '#f1f5f9',
                    color: action.status === 'Done' ? '#166534' : action.status === 'In Progress' ? '#1e40af' : '#475569',
                    textTransform: 'uppercase'
                  }}>
                    {action.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Comments ── */}
          <div style={styles.section}>
            <SectionTitle>Discussion</SectionTitle>
            <div style={styles.commentList}>
              {(issue.comments || []).map(c => (
                <div key={c.id} style={styles.commentRow}>
                  <div style={styles.commentAvatar}>{(c.created_by || 'U')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a5f' }}>{c.created_by}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: 3, lineHeight: 1.5 }}>{c.comment_text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.commentInputBox}>
              <input
                placeholder="Post an update…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                style={styles.commentInput}
              />
              <button onClick={handleAddComment} disabled={commentSending || !newComment.trim()} style={styles.commentBtn}>
                <Send size={14} />
              </button>
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 3000, display: 'flex', justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff', width: '500px', maxWidth: '95vw',
    height: '100vh', display: 'flex', flexDirection: 'column',
    boxShadow: '-20px 0 50px rgba(0,0,0,0.1)',
  },
  panelHeader: {
    padding: '24px 24px', borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#1e3a5f', color: '#fff',
  },
  panelTitle: {
    fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: '1.4',
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
    width: 34, height: 34, cursor: 'pointer', color: '#fff', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s',
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '24px',
  },
  escBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: '4px',
    backgroundColor: '#fee2e2', color: '#dc2626',
    fontSize: '10px', fontWeight: 900, letterSpacing: '0.04em',
    border: '1px solid #fecaca',
  },
  metaGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 20, marginBottom: 24,
    padding: 16, backgroundColor: '#f8fafc',
    borderRadius: 12, border: '1px solid #f1f5f9',
  },
  metaCell: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
  },
  metaLabel: { fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' },
  metaValue: { fontSize: '14px', color: '#1e293b', fontWeight: 600, marginTop: 2 },
  section: { marginBottom: 30 },
  descriptionBox: {
    fontSize: '14px', color: '#475569', lineHeight: '1.6',
    backgroundColor: '#fff', padding: '12px 16px', borderRadius: 8,
    border: '1px solid #f1f5f9',
  },
  auditContainer: {
    display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8,
  },
  auditRow: {
    display: 'flex', gap: 12, position: 'relative',
  },
  auditDot: {
    width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1',
    marginTop: 6, flexShrink: 0,
  },
  auditText: {
    fontSize: '12px', color: '#64748b', lineHeight: '1.4',
  },
  auditTime: {
    fontSize: '10px', color: '#94a3b8', marginTop: 2, fontWeight: 600,
  },
  oldVal: { color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 },
  newVal: { color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '1px 4px', borderRadius: 4 },
  actionList: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  actionRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px', border: '1px solid #f1f5f9', borderRadius: 10,
    transition: 'background 0.2s',
  },
  commentList: {
    display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16,
  },
  commentRow: {
    display: 'flex', gap: 12,
  },
  commentAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    backgroundColor: '#1e3a5f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 800, flexShrink: 0,
    boxShadow: '0 2px 4px rgba(30, 58, 95, 0.1)',
  },
  input: {
    border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', color: '#1e293b',
    outline: 'none', width: '100%',
    transition: 'border-color 0.2s',
  },
  saveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: '8px',
    backgroundColor: '#1e3a5f', color: '#fff',
    fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
    transition: 'transform 0.1s, background 0.2s',
  },
  cancelBtn: {
    padding: '8px 16px', borderRadius: '8px',
    backgroundColor: '#f1f5f9', color: '#64748b',
    fontSize: '13px', fontWeight: 600, border: '1px solid #e2e8f0', cursor: 'pointer',
  },
  ghostBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: '8px',
    backgroundColor: '#eff6ff', color: '#1e293b',
    fontSize: '11px', fontWeight: 700, border: '1px solid #dbeafe', cursor: 'pointer',
  },
  statusEditBox: {
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '16px', borderRadius: 12,
    backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
    marginBottom: 20,
  },
  addActionBox: {
    padding: '16px', borderRadius: 12,
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    marginBottom: 16,
  },
  select: {
    flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px',
    padding: '10px', fontSize: '13px', color: '#1e293b',
    outline: 'none', backgroundColor: '#fff',
  },
  inlineInput: {
    flex: 1, border: '1px solid #3b82f6', borderRadius: '4px',
    padding: '2px 6px', fontSize: '12px', outline: 'none',
  },
  inlineSave: {
    background: '#10b981', color: '#fff', border: 'none',
    borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 800,
  },
  inlineCancel: {
    background: '#ef4444', color: '#fff', border: 'none',
    borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 800,
  },
  commentInputBox: {
    display: 'flex', gap: 10,
    backgroundColor: '#f8fafc', padding: 8, borderRadius: 12,
    border: '1px solid #f1f5f9',
  },
  commentInput: {
    flex: 1, background: 'transparent', border: 'none',
    padding: '8px 12px', fontSize: '13px', outline: 'none',
  },
  commentBtn: {
    width: 36, height: 36, borderRadius: '10px',
    backgroundColor: '#1e3a5f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer',
  }
};

export default IssueDetailModal;
