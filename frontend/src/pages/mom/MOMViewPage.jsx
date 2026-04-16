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
  FileText, Plus, MessageSquare, Target
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
    if (!selProject) { toast.error('Select a project before syncing'); return; }
    const highRows = rows.filter(r => r.criticality === 'High' || r.criticality === 'Critical' || (r.status === 'Pending') || (r.status === 'Blocked'));
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
        status: r.status === 'Done' || r.status === 'Closed' ? 'Closed' : 'Open',
      }));

    if (actions.length === 0) { toast.error('Rows missing Responsibility — fill Owner column first'); return; }

    setSyncing(true);
    const t = toast.loading('Syncing to Issue Engine…');
    try {
      const resp = await API.post('/mom/issues', { project_id: Number(selProject), actions });
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
      toast.error(err?.response?.data?.detail || 'Sync failed', { id: t });
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
    const targetProject = selProject || projectId;
    if (!targetProject) {
      toast.error('Select a project before committing changes');
      return;
    }

    const saveToast = toast.loading('Persisting MOM structure...');
    try {
      // 1. Save MOM metadata
      await dispatch(saveMOM({ 
        meetingId, 
        meetingName, 
        projectId: Number(targetProject), 
        projectName, 
        momData: rows 
      })).unwrap();
      
      // 2. Intelligence Auto-Sync
      toast.loading('Syncing to Intelligence Engine...', { id: saveToast });
      
      const actionableRows = rows.filter(r => r.responsibility?.trim() && r.discussion_point?.trim());
      
      if (actionableRows.length > 0) {
        const actions = actionableRows.map(r => ({
          title: (r.discussion_point || '').slice(0, 50),
          description: r.discussion_point || '',
          owner: r.responsibility || '',
          department: r.function,
          priority: (r.criticality === 'Critical' || r.criticality === 'High' || r.status === 'Blocked' || r.status === 'Delayed') ? 'High' : 'Medium',
          due_date: (() => { 
            const d = Date.parse(r.target); 
            return isNaN(d) ? null : new Date(d).toISOString().split('T')[0]; 
          })(),
          status: 'Open',
        }));

        const syncResp = await API.post('/mom/issues', { 
          project_id: Number(targetProject), 
          meeting_id: meetingId,
          actions 
        });
        
        setSyncResult(syncResp.data);
        toast.success(`Pipeline Secure: MOM saved & ${syncResp.data.issues_created} issues synced.`, { id: saveToast });
      } else {
        toast.success('MOM saved. No actionable items found for sync.', { id: saveToast });
      }
    } catch (err) {
      toast.error(`Pipeline Error: ${err.message || 'Unknown failure'}`, { id: saveToast });
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

      {/* ── Top Bar ── */}
      <div className="mvp-topbar">
        <nav className="mvp-breadcrumb">
          <Link to="/dashboard" className="mvp-bc-link"><Home style={{ width: 12, height: 12 }} />Dashboard</Link>
          <ChevronRight className="mvp-bc-sep" style={{ width: 12, height: 12 }} />
          <Link to="/dashboard/meetings" className="mvp-bc-link"><Layout style={{ width: 12, height: 12 }} />Meetings</Link>
          <ChevronRight className="mvp-bc-sep" style={{ width: 12, height: 12 }} />
          <Link to="/dashboard/mom" className="mvp-bc-link"><Edit3 style={{ width: 12, height: 12 }} />Capture</Link>
          <ChevronRight className="mvp-bc-sep" style={{ width: 12, height: 12 }} />
          <span className="mvp-bc-current">MOM</span>
        </nav>

        <div className="mvp-topbar-actions">
          <div className={`mvp-save-status${status === 'saving' ? ' saving' : status === 'saved' ? ' saved' : ''}`}>
            {status === 'saving' && <Loader style={{ width: 10, height: 10 }} className="animate-spin" />}
            {status === 'saved' && <CheckCircle style={{ width: 10, height: 10 }} />}
            {status === 'saving' ? 'Saving…' : status === 'saved' && lastSaved
              ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Auto-save Enabled'}
          </div>
          <button className="mvp-action-btn" onClick={handleCopy}>
            {copied ? <><Check style={{ width: 12, height: 12 }} />Copied</> : <><Clipboard style={{ width: 12, height: 12 }} />Copy CSV</>}
          </button>
          <button className="mvp-action-btn" onClick={() => window.print()}>
            <Download style={{ width: 12, height: 12 }} />PDF / Print
          </button>
          <button className="mvp-action-btn primary" onClick={handleSave} disabled={status === 'saving'}>
            {status === 'saving' ? <Loader style={{ width: 12, height: 12 }} className="animate-spin" /> : <Check style={{ width: 12, height: 12 }} />}
            Save
          </button>
        </div>
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

        {/* ── 1. Executive Summary ── */}
        <div className="mvp-section mvp-fade-up">
          <div className="mvp-section-header">
            <span className="mvp-section-title">Executive Summary</span>
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
              {meetingName || 'Meeting MOM'}{projectName ? ` · ${projectName}` : ''}
            </span>
          </div>
          <div className="mvp-exec-grid">
            <div className="mvp-exec-card">
              <div className="mvp-exec-icon red">
                <AlertTriangle style={{ width: 16, height: 16 }} />
              </div>
              <div className="mvp-exec-body">
                <div className="mvp-exec-value">{execSummary.risks}</div>
                <div className="mvp-exec-label">Key Risks</div>
              </div>
            </div>
            <div className="mvp-exec-card">
              <div className="mvp-exec-icon amber">
                <Bell style={{ width: 16, height: 16 }} />
              </div>
              <div className="mvp-exec-body">
                <div className="mvp-exec-value">{execSummary.attention}</div>
                <div className="mvp-exec-label">Attention Items</div>
              </div>
            </div>
            <div className="mvp-exec-card">
              <div className="mvp-exec-icon green">
                <CheckCircle style={{ width: 16, height: 16 }} />
              </div>
              <div className="mvp-exec-body">
                <div className="mvp-exec-value">{execSummary.completed}</div>
                <div className="mvp-exec-label">Completed</div>
              </div>
            </div>
            <div className="mvp-exec-card">
              <div className="mvp-exec-icon blue">
                <GitBranch style={{ width: 16, height: 16 }} />
              </div>
              <div className="mvp-exec-body">
                <div className="mvp-exec-value">{rows.length}</div>
                <div className="mvp-exec-label">Total Actions</div>
              </div>
            </div>

            {participationData.length > 0 && (
              <div className="mvp-exec-card participation" style={{ flex: 1.5, minWidth: 320, padding: '12px 16px' }}>
                <div className="mvp-exec-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="mvp-exec-label" style={{ marginBottom: 4 }}>Voice Participation</div>
                  <div style={{ height: 130, width: '100%' }}>
                    <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
                <div className="mvp-exec-body" style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12, minWidth: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="mvp-exec-label">Top Contributor</div>
                  <div className="mvp-exec-value" style={{ fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {participationData[0]?.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginTop: 4 }}>
                    {participationData[0]?.value || 0} words shared
                  </div>
                </div>
              </div>
            )}
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

        {/* ── 3. Discussion Section (Collapsible) ── */}
        <div className="mvp-section mvp-fade-up">
          <div className="mvp-discussion-wrap">
            <div
              className="mvp-discussion-header"
              onClick={() => setDiscussionOpen(o => !o)}
            >
              <span className="mvp-section-title">
                <FileText style={{ width: 12, height: 12 }} />
                Discussion Transcript
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 }}>
                  · {transcriptEntries.length} lines
                </span>
              </span>
              {discussionOpen
                ? <ChevronUp style={{ width: 16, height: 16, color: '#9ca3af' }} />
                : <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af' }} />}
            </div>

            <AnimatePresence>
              {discussionOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="mvp-discussion-body-wrap"
                >
                  <div className="mvp-discussion-body">
                    {transcriptEntries.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                        No transcript data available. Raw transcript is preserved per meeting session.
                      </div>
                    ) : (
                      transcriptEntries.map((entry, i) => {
                        if (entry.type === 'event') {
                          return (
                            <div key={i} className="mvp-transcript-event">
                              <span style={{
                                background: entry.bg || '#fef9c3', color: entry.textColor || '#92400e',
                                padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800
                              }}>
                                {entry.label}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 500 }}>{entry.text}</span>
                            </div>
                          );
                        }
                        const spkColor = getSpeakerColor(entry.speaker);
                        return (
                          <div key={i} className="mvp-transcript-line">
                            <div className="mvp-transcript-speaker">
                              <span
                                className="mvp-tspk-pill"
                                style={{ background: entry.bg || spkColor.bg, color: entry.textColor || spkColor.text }}
                              >
                                {entry.speaker || 'Unknown'}
                              </span>
                            </div>
                            <span className="mvp-transcript-time">{entry.time}</span>
                            <span className="mvp-transcript-text">{entry.text}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MOMViewPage;
