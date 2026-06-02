/**
 * issues.js
 * ─────────
 * Axios wrappers for the Critical Issue Engine API.
 * All calls go through the shared `API` instance which carries auth headers.
 */

import API from '../utils/api';

const BASE = '/issues';
const MOM  = '/mom/issues';


// ─── Issue CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new issue (manual).
 * @param {Object} payload - IssueCreate fields
 */
export const createIssue = (payload) =>
  API.post(BASE, payload).then(r => r.data);

/**
 * Fetch a single issue with full detail (actions, comments, escalations).
 */
export const getIssue = (issueId) =>
  API.get(`${BASE}/${issueId}`).then(r => r.data);

/**
 * List all issues for a project with optional filters.
 * @param {Object} filters - { project_id, status, owner, priority, department }
 */
export const listIssues = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.project_id) params.append('project_id', filters.project_id);
  if (filters.status)     params.append('status',     filters.status);
  if (filters.owner)      params.append('owner',      filters.owner);
  if (filters.priority)   params.append('priority',   filters.priority);
  if (filters.department) params.append('department', filters.department);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return API.get(`${BASE}${qs}`).then(r => r.data);
};

/**
 * Get top N critical issues sorted by urgency.
 * Also triggers escalation engine on backend.
 * @param {number} projectId
 * @param {number} limit - default 5
 */
export const getCriticalIssues = (projectId, limit = 5) =>
  API.get(`${BASE}/project/${projectId}/critical?limit=${limit}`).then(r => r.data);

/**
 * Partial update on an issue.
 * @param {number} issueId
 * @param {Object} patch - IssueUpdate fields
 */
export const updateIssue = (issueId, patch) =>
  API.patch(`${BASE}/${issueId}`, patch).then(r => r.data);

/**
 * Soft-close an issue (sets status → Closed, stamps resolved_at).
 */
export const closeIssue = (issueId) =>
  API.delete(`${BASE}/${issueId}`).then(r => r.data);


// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * Get issue summary metrics for a project.
 * Returns: { total_open, total_overdue, total_at_risk, total_closed,
 *            by_department, by_priority, top_overdue }
 */
export const getIssueAnalytics = (projectId) =>
  API.get(`${BASE}/project/${projectId}/analytics`).then(r => r.data);


// ─── Actions & Comments ──────────────────────────────────────────────────────

/**
 * Add an action item to an issue.
 * @param {number} issueId
 * @param {Object} action - { action_text, responsible_person, target_date, status }
 */
export const addAction = (issueId, action) =>
  API.post(`${BASE}/${issueId}/actions`, action).then(r => r.data);

/**
 * Add a comment to the issue audit thread.
 * @param {number} issueId
 * @param {Object} comment - { comment_text, created_by }
 */
export const addComment = (issueId, comment) =>
  API.post(`${BASE}/${issueId}/comments`, comment).then(r => r.data);

/**
 * Fetch escalation history for an issue.
 */
export const getEscalations = (issueId) =>
  API.get(`${BASE}/${issueId}/escalations`).then(r => r.data);


// ─── Escalation Engine ───────────────────────────────────────────────────────

/**
 * Manually trigger the escalation engine for a project.
 */
export const runEscalation = (projectId) =>
  API.post(`${BASE}/project/${projectId}/run-escalation`).then(r => r.data);


// ─── MOM Integration ─────────────────────────────────────────────────────────

/**
 * Batch-create issues from MOM meeting actions.
 * @param {Object} payload - { project_id, meeting_id?, actions: [MOMActionItem] }
 */
export const createMOMIssues = (payload) =>
  API.post(MOM, payload).then(r => r.data);


// ─── Status helpers (mirror backend logic, used for optimistic UI) ────────────

export const derivedStatus = (issue) => {
  if (issue.status === 'Closed') return 'Closed';
  // Use backend provided health_status if available
  if (issue.health_status) return issue.health_status;
  
  if (!issue.due_date) return 'On Track';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due   = new Date(issue.due_date);
  due.setHours(0, 0, 0, 0);
  const diff  = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return 'Overdue';
  if (diff <= 2) return 'At Risk';
  return 'On Track';
};

export const STATUS_COLORS = {
  Overdue:    { bg: 'var(--red-50)', text: 'var(--red-900)', border: 'var(--red-50)', dot: 'var(--red)' },
  'At Risk':  { bg: 'var(--amber)', text: '#000', border: 'var(--amber)', dot: 'var(--amber)' },
  'On Track': { bg: 'var(--green-50)', text: 'var(--green-900)', border: 'var(--green-50)', dot: 'var(--green)' },
  Closed:     { bg: 'var(--elevated-card)', text: 'var(--text-muted)', border: 'var(--border-subtle)', dot: 'var(--text-muted)' },
  Open:       { bg: 'var(--green-50)', text: 'var(--green-900)', border: 'var(--green-50)', dot: 'var(--green)' },
};

export const PRIORITY_COLORS = {
  High:   { bg: 'var(--red-50)', text: 'var(--red-900)', border: 'var(--red-50)' },
  Medium: { bg: 'var(--amber)', text: '#000', border: 'var(--amber)' },
  Low:    { bg: 'var(--blue-50)', text: 'var(--blue-900)', border: 'var(--blue-50)' },
};
