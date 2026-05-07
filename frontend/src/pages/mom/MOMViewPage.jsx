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
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    API.get('/projects').then(r => {
      const data = r.data.success ? r.data.projects : (Array.isArray(r.data) ? r.data : []);
      setProjects(data);
    }).catch(() => { });

    API.get('/employees').then(r => {
      setEmployees(r.data?.success ? r.data.employees : (Array.isArray(r.data) ? r.data : []));
    }).catch(() => { });
  }, []);

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
      if (e.type === 'dialogue' && e.speaker && e.text) {
        const words = e.text.trim().split(/\s+/).length;
        if (!stats[e.speaker]) stats[e.speaker] = { name: e.speaker, value: 0 };
        stats[e.speaker].value += words;
        totalWords += words;
      }
    });
    return Object.values(stats).sort((a, b) => b.value - a.value);
  }, [transcriptEntries]);

  const metaDisplay = useMemo(() => {
    let durText = '—';
    const durEntry = transcriptEntries.find(e => e.type === 'metadata' && (e.field === 'DURATION' || e.label === 'Duration'));
    if (durEntry && durEntry.value) {
      durText = durEntry.value.replace(/minutes?/i, 'min').trim();
    }

    const participantNames = Array.from(new Set(transcriptEntries.filter(e => e.type === 'dialogue' && e.speaker).map(e => e.speaker)));
    return { duration: durText, participants: participantNames };
  }, [transcriptEntries]);

  const session = useMemo(() => ({
    name: meetingName || 'Untitled Session',
    metadata: metaDisplay,
    lastSavedTime: lastSaved ? new Date(lastSaved).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
  }), [meetingName, metaDisplay, lastSaved]);

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
    if (!projectId) {
      toast.error('No project linked — link a project during capture.');
      return;
    }
    const targetProjectId = Number(projectId);

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
  }, [projectId, rows]);

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
    if (!projectId) {
      toast.error('No project linked — cannot save MOM.');
      return;
    }
    const targetProjectId = Number(projectId);

    try {
      await dispatch(saveMOM({
        meetingId,
        meetingName,
        projectId: targetProjectId,
        projectName,
        momData: rows
      })).unwrap();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      const rawDetail = err?.response?.data?.detail || err?.message;
      const detail = Array.isArray(rawDetail)
        ? rawDetail.map(e => `${e.loc?.join('.')} — ${e.msg}`).join('; ')
        : (rawDetail || 'Save failed');
      toast.error(`Save failed: ${detail}`);
    }
  }, [dispatch, meetingId, meetingName, projectId, projectName, rows]);

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
  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mvp-root-wrapper">
        <div className="mvp-main-content">
          {/* ── Top Bar ── */}
          <header className="mvp-top-bar">
            <div className="mvp-top-bar-inner">
              <div className="mvp-top-bar-left">
                <h2 className="mvp-page-title">Minutes of Meeting</h2>
              </div>
              <div className="mvp-top-bar-right">
                <button className="mvp-btn-kia">KIA Boards</button>
                <div className="mvp-user-pill">
                  <div className="mvp-user-avatar">GK</div>
                </div>
              </div>
            </div>
          </header>
          <div className="mvp-root">
            <div className="mvp-content-container">
              {/* ── Executive Header Card ── */}
              <div className="mvp-top-container">

                {/* Breadcrumb */}
                <nav className="mvp-breadcrumb">
                  <Link to="/dashboard">Dashboard</Link>
                  <ChevronRight size={12} />
                  <Link to="/dashboard/meetings">Meetings</Link>
                  <ChevronRight size={12} />
                  <Link to={`/dashboard/meetings?id=${meetingId}`}>{session.name}</Link>
                  <ChevronRight size={12} />
                  <span className="active">MOM Output</span>
                </nav>

                {/* Header Card — Zoho flat style */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
                  padding: '20px 24px', background: '#fff',
                  border: '1px solid #E2E8F0', borderRadius: '10px',
                  gap: '24px'
                }}>
                  {/* Left: session identity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                        {session.name}
                      </h1>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    {/* Slim meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                        <Clock style={{ width: 12, height: 12, color: '#94A3B8' }} />
                        {session.metadata.duration || '—'}
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                        <Users style={{ width: 12, height: 12, color: '#94A3B8' }} />
                        {session.metadata.participants.length > 0 ? `${session.metadata.participants.length} participants` : 'No participants'}
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        Saved {session.lastSavedTime !== '—' ? `at ${session.lastSavedTime}` : 'not yet'}
                      </span>
                    </div>
                  </div>

                  {/* Right: controls column */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', justifyContent: 'space-between',
                    gap: '10px', flexShrink: 0
                  }}>
                    {/* Project chip */}
                    {projectName ? (
                      <div style={{
                        padding: '3px 12px', borderRadius: '4px',
                        background: '#F0FDFA', color: '#0D9488',
                        border: '1px solid #99F6E4',
                        fontSize: '12px', fontWeight: 600,
                        whiteSpace: 'nowrap', maxWidth: '180px',
                        overflow: 'hidden', textOverflow: 'ellipsis'
                      }} title={projectName}>
                        {projectName}
                      </div>
                    ) : (
                      <div style={{
                        padding: '3px 12px', borderRadius: '4px',
                        background: '#FFFBEB', color: '#D97706',
                        border: '1px solid #FDE68A',
                        fontSize: '12px', fontWeight: 600
                      }}>
                        No Project Linked
                      </div>
                    )}

                    {/* Status */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '11px', fontWeight: 600, color: '#059669',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                      On Track
                    </div>

                    {/* Save */}
                    <button
                      onClick={handleSave}
                      disabled={status === 'saving'}
                      style={{
                        height: '34px', padding: '0 20px',
                        background: '#0D9488', color: '#fff',
                        border: 'none', borderRadius: '6px',
                        fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                        cursor: status === 'saving' ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        opacity: status === 'saving' ? 0.7 : 1,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if (status !== 'saving') e.currentTarget.style.background = '#0B7F74'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; }}
                    >
                      {status === 'saving' ? <><Loader size={13} className="animate-spin" /> Saving…</> : saveSuccess ? <><Check size={13} /> Saved</> : 'Save MOM'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="mvp-body">
                {/* ── 1. The Dynamic Metrics Band ── */}
                <div className="mvp-section">
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
          </div>
        </div>

        <MOMSyncResultModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          results={syncResult}
        />

        {/* Discussion Drawer (Simplified) */}
        <AnimatePresence>
          {discussionOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDiscussionOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '480px', background: '#fff', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Raw Discussion</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Full transcript history for this session</p>
                    </div>
                  </div>
                  <button onClick={() => setDiscussionOpen(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', background: '#F1F5F9', color: '#64748B', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  {transcriptEntries.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {transcriptEntries.map((entry, idx) => {
                        if (entry.type === 'event') {
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <Zap size={14} style={{ color: '#0D9488' }} />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{entry.label}</span>
                            </div>
                          );
                        }
                        const color = getSpeakerColor(entry.speaker);
                        return (
                          <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                              {entry.speaker?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{entry.speaker}</span>
                                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{entry.time}</span>
                              </div>
                              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                                {entry.text}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', textAlign: 'center' }}>
                      <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                      <p style={{ fontSize: '14px' }}>No discussion data available for this meeting.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default MOMViewPage;
