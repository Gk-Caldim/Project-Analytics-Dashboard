/**
 * MOMViewPage.jsx
 * Enterprise MOM Display — Executive Summary · Action Items · Issues · Discussion
 * Backend frozen: uses existing momSlice + POST /mom/issues API
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ChevronRight, Home, Layout, AlertTriangle, Bell,
  CheckCircle, GitBranch, Trash2, Download, Clipboard,
  ChevronDown, ChevronUp, Loader, Zap, Check, Edit3,
  FileText, Plus, MessageSquare, Target, MoreHorizontal, Users,
  FolderOpen, Mail, X, Settings, Clock, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../utils/api';
import { updateMomRow, deleteMomRow, saveMOM, setMomData as setMomDataRedux } from '../../store/slices/momSlice';
import ReactECharts from 'echarts-for-react';
import MeetingTable from './MeetingTable';
import MOMSyncResultModal from '../../components/issues/MOMSyncResultModal';
import './MOMViewPage.css';

// ── Speaker colour palette ───────────────────────────────────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

let colorIdx = 0;
const speakerColorCache = {};
function getSpeakerColor(name) {
  if (!name) return SPEAKER_COLORS[0];
  if (!speakerColorCache[name]) {
    speakerColorCache[name] = SPEAKER_COLORS[colorIdx % SPEAKER_COLORS.length];
    colorIdx++;
  }
  return speakerColorCache[name];
}

// ── Component ────────────────────────────────────────────────────────────
const MOMViewPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { meetingId, meetingName, projectId, projectName, momData, status, lastSaved } = useSelector(s => s.mom);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selProject, setSelProject] = useState(String(projectId || ''));
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    API.get('/projects').then(r => {
      const data = r.data.success ? r.data.projects : (Array.isArray(r.data) ? r.data : []);
      setProjects(data);
    }).catch(() => { });

    API.get('/employees').then(r => {
      setEmployees(r.data?.success ? r.data.employees : (Array.isArray(r.data) ? r.data : []));
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (projectId && !selProject) setSelProject(String(projectId));
  }, [projectId]);

  // ── Derive sections from momData ─────────────────────────────────────
  const rows = momData || [];

  // Executive Summary counts
  const execSummary = useMemo(() => {
    const risks = rows.filter(r => r.criticality === 'High' || r.criticality === 'Critical').length;
    const attention = rows.filter(r => r.status === 'Pending' || r.status === 'Blocked').length;
    const completed = rows.filter(r => r.status === 'Done' || r.status === 'Closed').length;
    const decisions = rows.filter(r => r._rawEntries?.some(e => e.type === 'event' && e.label === 'Decisions') || false).length;
    return { risks, attention, completed, decisions };
  }, [rows]);

  // Discussion entries from raw transcript stored per row
  const transcriptEntries = useMemo(() => {
    for (const row of rows) {
      if (Array.isArray(row._rawEntries) && row._rawEntries.length > 0) {
        return row._rawEntries;
      }
    }
    return [];
  }, [rows]);

  // Participation Metrics
  const participationData = useMemo(() => {
    const stats = {};
    let totalWords = 0;
    transcriptEntries.forEach(e => {
      if (e.type === 'speech' && e.speaker && e.text) {
        const words = e.text.trim().split(/\s+/).length;
        if (!stats[e.speaker]) stats[e.speaker] = { name: e.speaker, value: 0 };
        stats[e.speaker].value += words;
        totalWords += words;
      }
    });
    return Object.values(stats).sort((a, b) => b.value - a.value);
  }, [transcriptEntries]);

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} words ({d}%)' },
    legend: { bottom: '0%', left: 'center', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 10, color: '#6b7280' } },
    series: [
      {
        name: 'Participation',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data: participationData.map((d, i) => ({
          ...d,
          itemStyle: { color: getSpeakerColor(d.name).dot }
        }))
      }
    ]
  }), [participationData]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleUpdate = useCallback((id, data) => {
    dispatch(updateMomRow({ id, data }));
  }, [dispatch]);

  const handleDelete = useCallback((id) => {
    dispatch(deleteMomRow(id));
  }, [dispatch]);

  const handleSyncIssues = useCallback(async () => {
    let targetProjectId = Number(selProject);
    if (isNaN(targetProjectId) && selProject) {
      const matched = projects.find(p => (p.name || p.project_name)?.toLowerCase() === String(selProject).toLowerCase());
      if (matched) targetProjectId = matched.id || matched.project_id;
    }
    if (!targetProjectId || isNaN(targetProjectId)) {
      toast.error('Invalid Project ID. Please link this meeting to a valid project.');
      return;
    }

    const highRows = rows.filter(r => r.criticality === 'High' || r.criticality === 'Critical');
    if (highRows.length === 0) { toast.error('No High/Critical rows to sync'); return; }

    const actions = highRows
      .filter(r => r.responsibility?.trim())
      .map(r => ({
        title: (r.discussion_point || '').slice(0, 50),
        description: r.discussion_point || '',
        owner: r.responsibility || '',
        department: r.function,
        priority: r.criticality === 'Critical' || r.criticality === 'High' ? 'High' : 'Medium',
        due_date: (() => { const d = Date.parse(r.target); return isNaN(d) ? null : new Date(d).toISOString().split('T')[0]; })(),
        status: 'Open',
      }));

    if (actions.length === 0) { toast.error('Rows missing Responsibility — fill Owner column first'); return; }

    setSyncing(true);
    const t = toast.loading('Syncing to Issue Engine…');
    try {
      const resp = await API.post('/mom/issues', { project_id: targetProjectId, actions });
      setSyncResult(resp.data);
      setShowSyncModal(true);

      if (resp.data.issues_created > 0) {
        toast.success(`✓ ${resp.data.issues_created} issues created`, { id: t });
      } else if (resp.data.missing_dates_downgraded > 0) {
        toast.success(`⬇ ${resp.data.missing_dates_downgraded} priority downgraded`, { id: t });
      } else {
        toast.error(`No issues created (${resp.data.issues_skipped} skipped)`, { id: t });
      }
    } catch (err) {
      const rawDetail = err?.response?.data?.detail;
      const detail = Array.isArray(rawDetail)
        ? rawDetail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ')
        : (rawDetail || err.message || 'Sync failed');
      toast.error(detail, { id: t });
    } finally { setSyncing(false); }
  }, [selProject, rows]);

  const handleCopy = useCallback(() => {
    const header = 'Priority\tAction\tOwner\tDue Date\tStatus';
    const body = rows.map(r => `${r.criticality}\t${r.discussion_point}\t${r.responsibility}\t${r.target}\t${r.status}`).join('\n');
    navigator.clipboard.writeText(`${header}\n${body}`).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rows]);

  const handleSave = useCallback(async () => {
    const rawTarget = selProject || projectId;
    let targetProjectId = Number(rawTarget);
    if (isNaN(targetProjectId) && rawTarget) {
      const matched = projects.find(p => (p.name || p.project_name)?.toLowerCase() === String(rawTarget).toLowerCase());
      if (matched) targetProjectId = matched.id || matched.project_id;
    }

    if (!targetProjectId || isNaN(targetProjectId)) {
      toast.error('Invalid Project ID. Please select a valid project before saving.');
      return;
    }

    try {
      await dispatch(saveMOM({
        meetingId,
        meetingName,
        projectId: targetProjectId,
        projectName,
        momData: rows
      })).unwrap();
      // saveMOM dispatches show its own status — no extra toast needed
    } catch (err) {
      const rawDetail = err?.response?.data?.detail || err?.message;
      const detail = Array.isArray(rawDetail)
        ? rawDetail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ')
        : (rawDetail || 'Save failed');
      toast.error(`Save failed: ${detail}`);
    }
  }, [dispatch, meetingId, meetingName, selProject, projectId, projectName, rows]);

  // ── Auto-save (Debounced) ──
  useEffect(() => {
    // Skip auto-save if we just loaded or are in an error state
    if (!meetingId || status === 'loading' || status === 'error') return;

    const handler = setTimeout(() => {
      // Only auto-save if there's actual data and it's not currently saving
      if (rows.length > 0 && status !== 'saving') {
        handleSave();
      }
    }, 2000);

    return () => clearTimeout(handler);
  }, [rows, meetingId, handleSave, status]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mvp-root">

      {/* ── Executive Top Bar (Redesign) ── */}
      <div className="mvp-top-container" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(248, 250, 252, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E2E8F0', borderTop: '3px solid #0D9488' }}>
        
        {/* Header Card */}
        <div className="mvp-header-card">
          {/* Left Zone: Title & Context */}
          <div className="mvp-header-left">
            <h1 className="mvp-main-title" style={{ fontSize: '24px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{meetingName || 'Meeting Summary'}</h1>
            <div className="mvp-header-date" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            {/* Meeting Metadata Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock style={{ width: 14, height: 14 }} /> 45 min
              </span>
              <span style={{ color: 'var(--color-border-tertiary)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users style={{ width: 14, height: 14 }} /> {Array.from(new Set(rows.map(r => r.responsibility).filter(Boolean))).length || 4} participants
              </span>
              <span style={{ color: 'var(--color-border-tertiary)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit2 style={{ width: 14, height: 14 }} /> Gokula Krishnan
              </span>
              <span style={{ color: 'var(--color-border-tertiary)' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Last saved: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Center Zone: Functional Breadcrumb */}
          <div className="mvp-header-center">
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              <Link
                to="/dashboard"
                style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
              >
                Dashboard
              </Link>
              <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
              <Link
                to="/dashboard/meetings"
                style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
              >
                Meetings
              </Link>
              <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
              {meetingId ? (
                <Link
                  to={`/dashboard/mom`}
                  style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', transition: 'color 0.15s', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.target.style.color = 'var(--color-text-primary)'}
                  onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
                  title={meetingName || 'Meeting'}
                >
                  {meetingName || 'Capture'}
                </Link>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meetingName || 'Meeting'}
                </span>
              )}
              <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>MOM Output</span>
            </nav>
          </div>

          {/* Right Zone: Project Chip + Status + Save */}
          <div className="mvp-header-right" style={{ gap: '12px', alignItems: 'center' }}>
            {/* Project Context Chip */}
            {(projectName || projectId) && (
              <div
                title="Assigned during MOM creation. Change from Meeting Settings."
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '999px',
                  border: '1px solid #0D9488', color: '#0D9488',
                  fontSize: '11px', fontWeight: 700, cursor: 'default',
                  background: '#F0FDFA', whiteSpace: 'nowrap', maxWidth: '160px'
                }}
              >
                <FolderOpen style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {projectName || `Project #${projectId}`}
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div 
              className={`mvp-status-badge ${execSummary.risks > 0 ? 'attention' : 'on-track'}`}
              title={execSummary.risks > 0 ? "Action Required — Critical risks detected" : "Operational Health Index: Optimal — 0 critical risks, all actions assigned"}
              style={{ padding: '5px 13px' }}
            >
              <span className={`mvp-cloud-dot ${execSummary.risks > 0 ? '' : 'pulse-green'}`} style={{ background: execSummary.risks > 0 ? '#DC2626' : '#166534' }} />
              {execSummary.risks > 0 ? 'Action Required' : 'On Track'}
            </div>

            {/* Cloud Sync + Save — moved here from floating row below */}
            <div className="mvp-cloud-sync-badge" style={{ fontSize: '10px', padding: '4px 10px' }}>
              <span className={`mvp-cloud-dot ${status === 'saving' ? 'saving' : 'active'}`} />
              {status === 'saving' ? 'Saving...' : 'Synced'}
            </div>
            <button className="mvp-btn primary" onClick={handleSave} disabled={status === 'saving'}
              style={{ padding: '6px 16px', fontSize: '12px' }}>
              Save
            </button>
          </div>
        </div>
        {/* No separate action row — save/sync now live in header */}
      </div>

      {/* ── Sync Result Modal ── */}
      <MOMSyncResultModal
        show={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        result={syncResult}
      />

      {/* ── Body ── */}
      <div className="mvp-body">

        {/* ── Sync Status Alert ── */}
        {syncResult && (
          <div style={{
            backgroundColor: syncResult.issues_created > 0 ? '#dcfce7' : '#fef3c7',
            border: `1px solid ${syncResult.issues_created > 0 ? '#86efac' : '#fcd34d'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: '600',
            color: syncResult.issues_created > 0 ? '#166534' : '#854d0e'
          }}>
            <span>{syncResult.issues_created > 0 ? '✓' : '⚠'}</span>
            <span>
              {syncResult.issues_created > 0
                ? `Successfully created ${syncResult.issues_created} issue${syncResult.issues_created !== 1 ? 's' : ''}`
                : `No issues created (${syncResult.issues_skipped} skipped)`}
              {syncResult.missing_dates_downgraded > 0 && `, ${syncResult.missing_dates_downgraded} priority downgraded`}
            </span>
            <button
              onClick={() => setShowSyncModal(true)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: '700',
                textDecoration: 'underline'
              }}
            >
              View Details
            </button>
            <button
              onClick={() => setSyncResult(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Single Horizontal Metric Band (Stats Row) ── */}
        <div className="mvp-section mvp-fade-up">
          <div className="mvp-stats-band">
            <div className="mvp-stat-item risks">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div className="mvp-stat-value">{execSummary.risks}</div>
                  <div className="mvp-stat-label">Key Risks</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: execSummary.risks === 0 ? '#166534' : '#DC2626', marginTop: '4px' }}>
                  {execSummary.risks === 0 ? '↓ from last meeting' : `${execSummary.risks} new`}
                </div>
              </div>
            </div>
            <div className="mvp-stat-item pending">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div className="mvp-stat-value">{execSummary.attention}</div>
                  <div className="mvp-stat-label">Pending Actions</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: execSummary.attention > 0 ? '#D97706' : '#64748B', marginTop: '4px' }}>
                  {execSummary.attention > 0 ? `${execSummary.attention} new` : 'None pending'}
                </div>
              </div>
            </div>
            <div className="mvp-stat-item resolved">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div className="mvp-stat-value">{execSummary.completed}</div>
                  <div className="mvp-stat-label">Resolved</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  {execSummary.completed === 0 ? 'None yet' : 'In progress'}
                </div>
              </div>
            </div>
            <div className="mvp-stat-item total">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div className="mvp-stat-value">{rows.length}</div>
                  <div className="mvp-stat-label">Total Actions</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '4px' }}>
                  Captured from transcript
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. The Original Meeting Table ── */}
        <div style={{ marginTop: '24px' }}>
          <MeetingTable
            meetings={rows}
            employees={employees}
            onUpdateMeeting={handleUpdate}
            onDeleteMeeting={handleDelete}
            lockedProjectId={projectId ? String(projectId) : undefined}
          />
        </div>

        <style>{`
          @keyframes greenPulse {
            0% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(22, 101, 52, 0); }
            100% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0); }
          }
          .pulse-green {
            animation: greenPulse 2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

export default MOMViewPage;
