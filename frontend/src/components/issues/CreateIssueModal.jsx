/**
 * CreateIssueModal.jsx
 * ─────────────────────
 * Modal for creating a new issue — Manual or MOM-derived modes.
 * Governance enforced:
 *   - owner is required
 *   - High priority requires due_date
 *   - project_id always required
 */

import React, { useState } from 'react';
import {
  X, AlertTriangle, FileText, Users, Flag, Calendar,
  Building2, AlignLeft, ToggleLeft, ToggleRight, Loader
} from 'lucide-react';
import { createIssue, createMOMIssues } from '../../api/issues';

const FIELD_STYLE = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  padding: '9px 11px',
  fontSize: '13px',
  color: '#111827',
  outline: 'none',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: 5 }}>
    {children}
    {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
  </label>
);

const FieldGroup = ({ children, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>{children}</div>
);

const ErrorText = ({ text }) =>
  text ? <div style={{ color: '#ef4444', fontSize: '11px', marginTop: 4, fontWeight: 600 }}>{text}</div> : null;

// ─── Manual Issue Form ────────────────────────────────────────────────────────

const ManualForm = ({ form, setForm, errors }) => (
  <>
    <FieldGroup>
      <Label required>Issue Title</Label>
      <input
        id="issue-title"
        style={FIELD_STYLE}
        placeholder="e.g. PP2 Build delayed due to supplier dependency"
        value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
      />
      <ErrorText text={errors.title} />
    </FieldGroup>

    <FieldGroup>
      <Label>Description</Label>
      <textarea
        id="issue-description"
        style={{ ...FIELD_STYLE, minHeight: 76, resize: 'vertical' }}
        placeholder="Provide detailed context for this issue…"
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
      />
    </FieldGroup>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FieldGroup>
        <Label required>Owner</Label>
        <input
          id="issue-owner"
          style={FIELD_STYLE}
          placeholder="Person responsible"
          value={form.owner}
          onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
        />
        <ErrorText text={errors.owner} />
      </FieldGroup>

      <FieldGroup>
        <Label>Department</Label>
        <input
          id="issue-department"
          style={FIELD_STYLE}
          placeholder="e.g. Manufacturing"
          value={form.department}
          onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
        />
      </FieldGroup>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FieldGroup>
        <Label required>Priority</Label>
        <select
          id="issue-priority"
          style={FIELD_STYLE}
          value={form.priority}
          onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </FieldGroup>

      <FieldGroup>
        <Label required={form.priority === 'High'}>
          Due Date {form.priority === 'High' ? '(required for High)' : ''}
        </Label>
        <input
          id="issue-due-date"
          type="date"
          style={{
            ...FIELD_STYLE,
            borderColor: errors.due_date ? '#ef4444' : '#d1d5db',
          }}
          value={form.due_date}
          onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
        />
        <ErrorText text={errors.due_date} />
      </FieldGroup>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FieldGroup>
        <Label>Status</Label>
        <select
          id="issue-status"
          style={FIELD_STYLE}
          value={form.status}
          onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </FieldGroup>

      <FieldGroup>
        <Label>Severity Score (0–100)</Label>
        <input
          id="issue-severity"
          type="number"
          min={0} max={100}
          style={FIELD_STYLE}
          placeholder="0"
          value={form.severity_score}
          onChange={e => setForm(p => ({ ...p, severity_score: Number(e.target.value) }))}
        />
        <ErrorText text={errors.severity_score} />
      </FieldGroup>
    </div>
  </>
);

// ─── MOM Form ────────────────────────────────────────────────────────────────

const MOMForm = ({ form, setForm, errors }) => (
  <>
    <div style={{
      padding: '10px 14px', borderRadius: '8px',
      backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
      fontSize: '12px', color: '#1d4ed8', marginBottom: 14, lineHeight: '1.5',
    }}>
      <strong>MOM Mode:</strong> This issue will be created from a meeting action item
      and tagged as <code style={{ backgroundColor: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>source_type = MOM</code>.
    </div>

    <FieldGroup>
      <Label>Meeting ID (optional)</Label>
      <input
        style={FIELD_STYLE}
        placeholder="Meeting UUID (leave blank if not linked)"
        value={form.meeting_id}
        onChange={e => setForm(p => ({ ...p, meeting_id: e.target.value }))}
      />
    </FieldGroup>

    <FieldGroup>
      <Label required>Action / Issue Title</Label>
      <input
        style={FIELD_STYLE}
        placeholder="e.g. Resolve PP2 supplier delivery block"
        value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
      />
      <ErrorText text={errors.title} />
    </FieldGroup>

    <FieldGroup>
      <Label>Description</Label>
      <textarea
        style={{ ...FIELD_STYLE, minHeight: 60, resize: 'vertical' }}
        placeholder="Context from meeting notes…"
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
      />
    </FieldGroup>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FieldGroup>
        <Label required>Action Owner</Label>
        <input
          style={FIELD_STYLE}
          placeholder="Assigned person from MOM"
          value={form.owner}
          onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
        />
        <ErrorText text={errors.owner} />
      </FieldGroup>

      <FieldGroup>
        <Label>Department</Label>
        <input
          style={FIELD_STYLE}
          placeholder="e.g. Supply Chain"
          value={form.department}
          onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
        />
      </FieldGroup>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FieldGroup>
        <Label required>Priority</Label>
        <select style={FIELD_STYLE} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </FieldGroup>

      <FieldGroup>
        <Label required={form.priority === 'High'}>
          Due Date {form.priority === 'High' ? '(required)' : ''}
        </Label>
        <input
          type="date"
          style={{ ...FIELD_STYLE, borderColor: errors.due_date ? '#ef4444' : '#d1d5db' }}
          value={form.due_date}
          onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
        />
        <ErrorText text={errors.due_date} />
      </FieldGroup>
    </div>
  </>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const CreateIssueModal = ({ projectId, onClose, onCreated }) => {
  const [isMOMMode, setIsMOMMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});

  const defaultForm = {
    title: '', description: '', owner: '', department: '',
    priority: 'Medium', severity_score: 0, status: 'Open',
    due_date: '', meeting_id: '',
  };
  const [form, setForm] = useState(defaultForm);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.owner.trim()) e.owner = 'Owner is required — governance policy';
    if (form.priority === 'High' && !form.due_date)
      e.due_date = 'Due date is required for High priority issues';
    if (form.severity_score < 0 || form.severity_score > 100)
      e.severity_score = 'Must be 0–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setServerError('');
    if (!validate()) return;

    try {
      setSubmitting(true);

      if (isMOMMode) {
        await createMOMIssues({
          project_id: projectId,
          meeting_id: form.meeting_id || undefined,
          actions: [{
            title: form.title.trim(),
            owner: form.owner.trim(),
            department: form.department.trim() || undefined,
            due_date: form.due_date || undefined,
            priority: form.priority,
            status: form.status,
            description: form.description.trim() || undefined,
          }],
        });
      } else {
        await createIssue({
          project_id: projectId,
          source_type: 'Manual',
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          owner: form.owner.trim(),
          department: form.department.trim() || undefined,
          priority: form.priority,
          severity_score: form.severity_score,
          status: form.status,
          due_date: form.due_date || undefined,
        });
      }

      onCreated?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setServerError(detail.map(d => d.msg).join(' | '));
      } else {
        setServerError(detail || 'Failed to create issue. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>Log New Issue</div>
            <div style={styles.headerSub}>All fields marked * are required by governance policy</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><X size={16} /></button>
        </div>

        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Issue Source:</span>
          <button
            onClick={() => { setIsMOMMode(false); setErrors({}); }}
            style={{ ...styles.modeBtn, ...(isMOMMode ? {} : styles.modeBtnActive) }}
          >
            <FileText size={12} /> Manual
          </button>
          <button
            onClick={() => { setIsMOMMode(true); setErrors({}); }}
            style={{ ...styles.modeBtn, ...(isMOMMode ? styles.modeBtnActive : {}) }}
          >
            <Users size={12} /> From MOM
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {isMOMMode
            ? <MOMForm form={form} setForm={setForm} errors={errors} />
            : <ManualForm form={form} setForm={setForm} errors={errors} />
          }

          {serverError && (
            <div style={styles.serverError}>
              <AlertTriangle size={14} />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={styles.submitBtn}
            id="submit-issue-btn"
          >
            {submitting
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
              : <>{isMOMMode ? '📋 Create from MOM' : '✚ Create Issue'}</>
            }
          </button>
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '14px',
    width: '560px', maxWidth: '100%', maxHeight: '92vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 22px', borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#1e3a5f', borderRadius: '14px 14px 0 0',
  },
  headerTitle: { fontSize: '16px', fontWeight: 700, color: '#fff' },
  headerSub: { fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
    padding: '6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center',
  },
  modeToggle: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 22px', backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6',
  },
  modeBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
    border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#6b7280', cursor: 'pointer',
  },
  modeBtnActive: {
    backgroundColor: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f',
  },
  body: { flex: 1, overflowY: 'auto', padding: '18px 22px' },
  serverError: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '10px 14px', borderRadius: '8px',
    backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
    color: '#b91c1c', fontSize: '12px', marginTop: 10,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 22px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb',
    borderRadius: '0 0 14px 14px',
  },
  cancelBtn: {
    padding: '8px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
    backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 20px', borderRadius: '7px', fontSize: '13px', fontWeight: 700,
    backgroundColor: '#1e3a5f', color: '#fff', border: 'none', cursor: 'pointer',
  },
};

export default CreateIssueModal;
