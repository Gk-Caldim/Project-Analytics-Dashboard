import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Download, Clipboard, Check, Tag, Trash2, AlertCircle, Zap, Loader2, Info, FileText, Share2, FolderOpen, Mail, X, ChevronDown, Settings, ArrowRight, Calendar, Edit3, AlertTriangle } from 'lucide-react';
import Select from 'react-select';
import API from '../../utils/api';
import { saveMOM, updateMomRow } from '../../store/slices/momSlice';

const CRITICALITY_COLORS = {
  'High':     { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  'Medium':   { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'Low':      { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  'Critical': { bg: '#DC2626', color: '#FFFFFF', border: '#B91C1C' },
};

const STATUS_STYLES = {
  'Pending': 'text-amber-600 font-bold',
  'Done': 'text-emerald-600 font-bold',
  'Closed': 'text-gray-400 font-medium line-through',
};

const TargetDateCell = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const isOverdue = value && new Date(value) < new Date(new Date().setHours(0,0,0,0));

  if (isEditing) {
    return (
      <input
        type="date"
        value={value || ''}
        autoFocus
        className="w-full bg-white border border-teal-500 rounded px-1 py-1 text-[11px] font-mono focus:outline-none"
        onChange={(e) => {
          onChange(e.target.value);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
      />
    );
  }

  if (!value || value === '—') {
    return (
      <span 
        onClick={() => setIsEditing(true)}
        className="text-teal-600 font-semibold cursor-pointer hover:underline text-[11px]"
      >
        Set date
      </span>
    );
  }

  const dateObj = new Date(value);
  const formatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-1 transition-colors ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600 font-mono font-bold'}`}
    >
      <Calendar size={12} />
      <span>{formatted}</span>
    </div>
  );
};

const ActionTakenCell = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => { setLocalValue(value || ''); }, [value]);

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={() => {
          onChange(localValue);
          setIsEditing(false);
        }}
        className="w-full bg-white border border-teal-500 rounded p-1 text-xs focus:outline-none resize-none min-h-[40px]"
      />
    );
  }

  if (!value || value === 'None' || value === 'No update.') {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className="text-gray-400 italic cursor-pointer hover:text-teal-600 transition-colors py-1"
      >
        ＋ Add note
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="group flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors text-gray-700"
    >
      <span className="flex-1 whitespace-pre-wrap">{value}</span>
      <Edit3 size={12} className="text-gray-300 group-hover:text-teal-600 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const MeetingTable = ({ meetings, employees = [], onUpdateMeeting, onDeleteMeeting, lockedProjectId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { meetingId, meetingName, projectId: reduxProjectId, projectName: reduxProjectName, status: reduxStatus } = useSelector(state => state.mom);

  // The effective project ID — prefer lockedProjectId (passed in) else Redux
  const effectiveProjectId = lockedProjectId || reduxProjectId;

  // ── Project list (for display only — name resolution) ──────────────────
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    API.get('/projects')
      .then(resp => {
        const data = resp.data.success
          ? resp.data.projects
          : Array.isArray(resp.data) ? resp.data : [];
        setProjects(data);
      })
      .catch(err => console.error('Failed to fetch projects', err));
  }, []);

  const allAssignedTo = React.useMemo(() => {
    if (!meetings || meetings.length <= 1) return null;
    const firstOwner = meetings[0].responsibility;
    if (!firstOwner) return null;
    const allSame = meetings.every(m => m.responsibility === firstOwner);
    return allSame ? firstOwner : null;
  }, [meetings]);

  const handleBulkReassign = (newOwner) => {
    meetings.forEach((m) => {
      onUpdateMeeting(m.id, { responsibility: newOwner });
    });
  };

  // Helper: resolve project name from id for display
  const resolveProjectName = (pid) => {
    if (!pid) return '—';
    const p = projects.find(pr => String(pr.id ?? pr.project_id) === String(pid));
    return p ? (p.name ?? p.project_name) : `#${pid}`;
  };

  // ── Sync High-priority MOM rows → Issue Engine ─────────────────
  const [syncFlowState, setSyncFlowState] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [syncedCount, setSyncedCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [showAutoSyncMenu, setShowAutoSyncMenu] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('autoSyncHighCritical') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('autoSyncHighCritical', autoSyncEnabled);
  }, [autoSyncEnabled]);

  const [copied, setCopied] = useState(false);

  const handleSyncIssues = async (silent = false) => {
    // Use the project locked in at MOM creation — no manual selection needed
    if (!effectiveProjectId) {
      if (silent !== true) toast.error('No project linked to this MOM. Set the project during MOM creation.');
      return;
    }

    // ── Step 2: Validate rows ──────────────────────────────────────
    const rowsToSync = meetings.filter(m => {
        return m.criticality === 'High' || m.criticality === 'Critical';
    });

    if (rowsToSync.length === 0) {
      if (silent !== true) toast.error('No High priority or pending rows found to sync.');
      return;
    }

    // Build action items, skip rows missing owner
    const actions = [];
    const localSkipped = [];

    rowsToSync.forEach((m, idx) => {
      const owner      = (m.responsibility || '').trim();
      const target     = (m.target || '').trim();
      const actionText = (m.discussion_point || '').trim();

      if (!owner) {
        localSkipped.push(`Row ${idx + 1}: missing Responsibility (owner)`);
        return;
      }

      // Parse target date — allow empty/null
      let parsedDate = null;
      if (target) {
        const iso = Date.parse(target);
        if (!isNaN(iso)) {
          parsedDate = new Date(iso).toISOString().split('T')[0];
        } else {
            parsedDate = null;
        }
      }

      const title50 = actionText.slice(0, 50) || `MOM Action ${idx + 1}`;

      actions.push({
        title:       title50,
        description: actionText || title50,
        owner,
        department:  m.function || undefined,
        priority:    m.criticality === 'High' || m.criticality === 'Critical' ? 'High' : 'Medium',
        due_date:    parsedDate,
        status:      m.status === 'Done' || m.status === 'Closed' ? 'Closed' : 'Open',
      });
    });

    if (actions.length === 0) {
      if (silent !== true) toast.error(`All ${rowsToSync.length} High row(s) were skipped — check Responsibility and Target Date fields.`);
      return;
    }

    // ── Step 3: POST to backend ────────────────────────────────────
    setAttemptedCount(actions.length);
    setSyncFlowState('syncing');
    
    try {
      const resp = await API.post('/mom/issues', {
        project_id: Number(effectiveProjectId),
        meeting_id: meetingId || null,
        actions,
      });
      const data = resp.data;
      setSyncedCount(data.issues_created || actions.length);
      setSyncFlowState('success');
      if (silent !== true) {
        // Resolve project name for URL (ProjectDashboard matches by name or string id)
        const linkedProject = projects.find(pr => String(pr.id ?? pr.project_id) === String(effectiveProjectId));
        const projectLabel = linkedProject
          ? encodeURIComponent(linkedProject.name ?? linkedProject.project_name ?? effectiveProjectId)
          : effectiveProjectId;
        toast.success('Issues Synced! Redirecting to Project...');
        setTimeout(() => {
          navigate(`/dashboard/projects?projectId=${projectLabel}`);
        }, 1500);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      if (silent !== true) toast.error(`Sync failed: ${detail}`);
      setSyncFlowState('error');
      setTimeout(() => setSyncFlowState('idle'), 3000);
    }
  };

  // ── Manual per-row sync: push ANY row to Issue Engine ──────────────
  const handleManualSyncRow = async (row) => {
    if (!effectiveProjectId) {
      toast.error('No project linked — set the project during MOM creation.');
      return;
    }
    const owner = (row.responsibility || '').trim();
    if (!owner) {
      toast.error('Row is missing Responsibility (owner). Fill it before syncing.');
      return;
    }
    const actionText = (row.discussion_point || '').trim();
    const title50 = actionText.slice(0, 50) || 'MOM Action';
    let parsedDate = null;
    if (row.target) {
      const iso = Date.parse(row.target);
      if (!isNaN(iso)) parsedDate = new Date(iso).toISOString().split('T')[0];
    }
    try {
      await API.post('/mom/issues/manual', {
        project_id: Number(effectiveProjectId),
        meeting_id: meetingId || null,
        title: title50,
        description: actionText || title50,
        owner,
        department: row.function || undefined,
        priority: row.criticality === 'High' || row.criticality === 'Critical' ? 'High' : 'Medium',
        due_date: parsedDate,
      });
      toast.success(`Issue created for "${title50}"`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      toast.error(`Sync failed: ${detail}`);
    }
  };


  // Copy to clipboard
  const handleCopy = () => {
    const text = meetings.map(m =>
      `${m.s_no || m.sno || ''}\t${m.function || ''}\t${m.project_name || ''}\t${m.criticality || ''}\t${m.discussion_point || ''}\t${m.responsibility || ''}\t${m.target || ''}\t${m.status || ''}\t${m.action_taken || ''}`
    ).join('\n');
    navigator.clipboard.writeText(`S.No\tFunction\tProject\tCriticality\tAction Points\tResponsibility\tTarget\tStatus\tAction Taken\n${text}`).then(() => {
      setCopied(true);
      toast.success('Table copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => window.print();

  // ── Send Summary Modal ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendRecipients, setSendRecipients] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendAttachPDF, setSendAttachPDF] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSendSummary = async () => {
    if (!sendRecipients.trim()) { toast.error('Add at least one recipient email.'); return; }
    setSending(true);
    try {
      await API.post(`/mom/${meetingId || 'unknown'}/broadcast`, {
        recipients: sendRecipients.split(',').map(e => e.trim()).filter(Boolean),
        message: sendMessage,
        attach_pdf: sendAttachPDF,
      });
      toast.success('MOM summary sent successfully!');
      setShowSendModal(false);
      setSendRecipients('');
      setSendMessage('');
    } catch (err) {
      toast.error('Failed to send summary. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Export Dropdown ──
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Unsynced count — High/Critical rows not yet marked Done/Closed
  const unsyncedCount = meetings.filter(
    m => (m.criticality === 'High' || m.criticality === 'Critical') &&
         m.status !== 'Done' && m.status !== 'Closed'
  ).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-20 space-y-8 animate-fadeIn">

      {/* Removed old syncResult Toast - replaced by toast.success */}

      {/* ── Action Toolbar (Hidden in Print) ── */}
      <div className="flex items-center justify-between w-full print:hidden" style={{ marginBottom: '16px' }}>

        {/* Left: Workflow Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Sync Issues — with unsynced badge and auto-sync toggle */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                onClick={handleSyncIssues}
                disabled={syncFlowState === 'syncing' || !effectiveProjectId}
                title={!effectiveProjectId ? 'No project linked — set project during MOM creation' : 'Sync High/Critical items to Issue Engine'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                  background: 'transparent', border: '1px solid #0D9488', color: '#0D9488',
                  cursor: (!effectiveProjectId || syncFlowState === 'syncing') ? 'not-allowed' : 'pointer',
                  opacity: (!effectiveProjectId || syncFlowState === 'syncing') ? 0.5 : 1,
                  transition: 'all 0.2s', height: '36px'
                }}
                onMouseEnter={e => { if (effectiveProjectId && syncFlowState !== 'syncing') e.currentTarget.style.background = '#F0FDFA'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {syncFlowState === 'syncing'
                  ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  : <Zap style={{ width: 16, height: 16 }} />
                }
                Sync Issues
              </button>
              {unsyncedCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-7px', right: '-2px',
                  background: '#0D9488', color: '#fff',
                  fontSize: '9px', fontWeight: 800, borderRadius: '999px',
                  padding: '1px 5px', lineHeight: '14px', pointerEvents: 'none', zIndex: 10
                }}>
                  {unsyncedCount}
                </span>
              )}
            </div>
            
            {/* Auto-sync gear toggle */}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                onClick={() => setShowAutoSyncMenu(!showAutoSyncMenu)}
                disabled={syncFlowState === 'syncing'}
                title="Auto-sync settings"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 10px', height: '36px', borderRadius: '6px',
                  background: 'transparent', border: '1px solid #CBD5E1', color: '#64748B',
                  cursor: syncFlowState === 'syncing' ? 'not-allowed' : 'pointer',
                  opacity: syncFlowState === 'syncing' ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (syncFlowState !== 'syncing') e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings style={{ width: 16, height: 16 }} />
              </button>

              {showAutoSyncMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '220px', padding: '12px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={autoSyncEnabled}
                      onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#0D9488' }} 
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', lineHeight: '1.2' }}>
                        Auto-sync on save
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', lineHeight: '1.3' }}>
                        Automatically sync Critical & High priority issues when saving MOM.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Export ▾ dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(m => !m)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                background: 'transparent', border: '1.5px solid #CBD5E1', color: '#475569',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileText style={{ width: 14, height: 14 }} />
              Export
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 50,
                background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '160px', overflow: 'hidden'
              }}>
                {[
                  { label: 'Copy CSV', icon: <Clipboard style={{ width: 13, height: 13 }} />, action: () => { handleCopy(); setShowExportMenu(false); } },
                  { label: 'Export as PDF', icon: <Download style={{ width: 13, height: 13 }} />, action: () => { handlePrint(); setShowExportMenu(false); } },
                  { label: 'Export as XLSX', icon: <FileText style={{ width: 13, height: 13 }} />, action: () => { toast('XLSX export coming soon', { icon: '📥' }); setShowExportMenu(false); } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '10px 16px', fontSize: '12px',
                      fontWeight: 600, color: '#374151', background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary CTA: Download PDF */}
          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
              background: '#0D9488', color: '#fff', border: 'none',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(13,148,136,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0F766E'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; }}
          >
            <Download style={{ width: 14, height: 14 }} />
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Inline Sync Confirmation Bar ── */}
      {syncFlowState !== 'idle' && syncFlowState !== 'error' && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#F0FDFA', border: '1px solid #CCFBF1',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {syncFlowState === 'syncing' ? (
              <Loader2 style={{ width: 16, height: 16, color: '#0D9488', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Check style={{ width: 16, height: 16, color: '#0D9488' }} />
            )}
            <span style={{ fontSize: '13px', color: '#0F766E', fontWeight: 600 }}>
              {syncFlowState === 'syncing'
                ? `Syncing ${attemptedCount} issues to ${reduxProjectName || `Project #${effectiveProjectId}`} > Recent Meetings...`
                : `✓ ${syncedCount} issues synced to ${reduxProjectName || `Project #${effectiveProjectId}`}.`}
            </span>
          </div>
          {syncFlowState === 'success' && (
            <button
               onClick={() => {
                 navigate(`/dashboard/projects?projectId=${effectiveProjectId}`);
               }}
               style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#0D9488', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
               onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
               onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
              View in Recent Meetings <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      )}

      {/* ── Send Summary Modal ── */}
      {showSendModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowSendModal(false)}>
          <div
            style={{
              background: '#fff', borderRadius: '12px', width: '480px', maxWidth: '90vw',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail style={{ width: 16, height: 16, color: '#0D9488' }} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Send MOM Summary</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>Email to stakeholders</div>
                </div>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Recipients
                </label>
                <input
                  type="text"
                  placeholder="email1@co.com, email2@co.com"
                  value={sendRecipients}
                  onChange={e => setSendRecipients(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px',
                    border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A',
                    outline: 'none', boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0D9488'; }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Message (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Please find attached the MOM from our recent meeting..."
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '6px',
                    border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A',
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0D9488'; }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sendAttachPDF}
                  onChange={e => setSendAttachPDF(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0D9488' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Attach PDF copy</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: 'transparent', border: '1.5px solid #E2E8F0', color: '#64748B', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSummary}
                disabled={sending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#0D9488', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}
              >
                {sending ? <Loader2 style={{ width: 14, height: 14 }} /> : <Mail style={{ width: 14, height: 14 }} />}
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-assignment Warning ── */}
      {allAssignedTo && (
        <div className="flex items-center justify-between mb-4 print:hidden" style={{ background: '#FFFBEB', color: '#B45309', borderLeft: '3px solid #F59E0B', padding: '12px 16px', borderRadius: 0, fontSize: '13px', fontWeight: 500 }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            All actions auto-assigned to {allAssignedTo}. Review and reassign before syncing.
          </div>
          <div className="relative group z-50">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 rounded text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors">
              Reassign All <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden hidden group-hover:block max-h-60 overflow-y-auto">
              {employees.filter(e => e.name !== allAssignedTo).map(e => (
                <button
                  key={e.employee_id || e.name}
                  onClick={() => handleBulkReassign(e.name)}
                  className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium transition-colors"
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FORM TEMPLATE START ── */}
      <div className="bg-white border border-gray-300 shadow-xl rounded-sm overflow-hidden print:border-0 print:shadow-none">

        {/* Clean Section Header */}
        <div className="pt-6 pb-2 px-6 flex items-center justify-between border-b border-[#0D9488]">
          <div style={{ flex: 1 }} />
          <h1 className="text-[11px] font-bold uppercase tracking-widest text-gray-500" style={{ textAlign: 'center' }}>
            Minutes of Meeting
          </h1>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              FORM NO: MOM/STD/2026 <span className="mx-2 text-gray-300">|</span> REV: 04-APR-2026
            </div>
          </div>
        </div>

        {/* ── THE GRID ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] sticky top-0 z-10" style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                <th className="px-3 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>S.No</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Function</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Project Name</th>
                <th className="px-3 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Criticality</th>
                <th className="px-6 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Action Points discussed</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Responsibility</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Target</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Status</th>
                <th className="px-4 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Action taken</th>
                <th className="px-3 py-3 text-left font-medium uppercase print:hidden sticky top-0 z-10 bg-[#F8FAFC]" style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, idx) => {
                return (
                  <tr key={m.id || idx} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-100" style={{ height: '52px' }}>
                    <td className="px-3 py-2 text-center" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {m.s_no || m.sno || idx + 1}
                    </td>
                    <td className="px-4 py-2 text-center">
                       <input 
                         type="text" 
                         defaultValue={m.function || 'General'} 
                         className="bg-transparent text-center focus:bg-white focus:outline-teal-500 w-full"
                         style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}
                         onBlur={(e) => onUpdateMeeting(m.id, { function: e.target.value })}
                       />
                    </td>
                    <td className="px-4 py-2 text-left font-medium" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      {reduxProjectName || (effectiveProjectId ? resolveProjectName(effectiveProjectId) : '—')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const crit = m.criticality || 'Normal';
                        const c = CRITICALITY_COLORS[crit] || { bg: 'transparent', color: '#64748B', border: '#E2E8F0' };
                        return (
                          <select 
                            defaultValue={crit}
                            style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                              textTransform: 'uppercase', textAlign: 'center', display: 'block', margin: '0 auto',
                              cursor: 'pointer', outline: 'none', appearance: 'auto',
                              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                            }}
                            onChange={(e) => {
                              onUpdateMeeting(m.id, { criticality: e.target.value });
                              // Update style dynamically
                              const nc = CRITICALITY_COLORS[e.target.value] || { bg: 'transparent', color: '#64748B', border: '#E2E8F0' };
                              e.target.style.background = nc.bg;
                              e.target.style.color = nc.color;
                              e.target.style.borderColor = nc.border;
                            }}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-2 leading-relaxed min-w-[300px]" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      <div className="relative group/heuristic flex gap-2 w-full">
                        <textarea
                          defaultValue={m.discussion_point || '—'}
                          className="w-full bg-transparent resize-none focus:bg-white focus:outline-teal-500 min-h-[40px]"
                          onBlur={(e) => onUpdateMeeting(m.id, { discussion_point: e.target.value })}
                        />
                        {m.isHeuristic ? (
                          <div className="flex-shrink-0 cursor-help text-amber-500 hover:text-amber-600 mt-1" title="Fallback heuristic used. AI extraction unavailable for this line.">
                            <Info className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 cursor-help text-gray-400 hover:text-teal-600 mt-1" title="AI confidence: Medium — review this action point manually">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 min-w-[180px]">
                      <Select
                        options={employees.map(e => ({ value: e.name, label: e.name, employeeId: e.employee_id }))}
                        defaultValue={m.responsibility ? { value: m.responsibility, label: m.responsibility } : null}
                        onChange={(opt) => onUpdateMeeting(m.id, { responsibility: opt?.value })}
                        placeholder="Search Employee..."
                        className="text-left"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '30px',
                            background: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                            fontSize: '14px',
                            color: 'var(--color-text-primary)'
                          }),
                          placeholder: (base) => ({ ...base, color: 'var(--color-text-tertiary)' }),
                          singleValue: (base) => ({ ...base, color: 'var(--color-text-primary)' }),
                          indicatorSeparator: () => ({ display: 'none' }),
                          dropdownIndicator: () => ({ display: 'none' })
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">
                      <TargetDateCell 
                        value={m.target} 
                        onChange={(newVal) => onUpdateMeeting(m.id, { target: newVal })} 
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                       <select 
                         defaultValue={m.status || 'Pending'}
                         style={
                           m.status === 'Pending' || !m.status
                             ? { background: '#FAEEDA', color: '#854F0B', fontSize: '12px', fontWeight: 500, borderRadius: '4px', border: 'none', padding: '4px 12px' }
                             : m.status === 'Done'
                             ? { background: '#D1FAE5', color: '#065F46', fontSize: '12px', fontWeight: 500, borderRadius: '4px', border: 'none', padding: '4px 12px' }
                             : { fontSize: '12px', fontWeight: 500, borderRadius: '4px', border: '1px solid #E2E8F0', padding: '4px 12px' }
                         }
                         className="cursor-pointer outline-none block mx-auto"
                         onChange={(e) => onUpdateMeeting(m.id, { status: e.target.value })}
                       >
                         <option value="Pending">PENDING</option>
                         <option value="Done">RESOLVED</option>
                         <option value="Closed">CLOSED</option>
                         <option value="Blocked">BLOCKED</option>
                       </select>
                    </td>
                    <td className="px-4 py-2 min-w-[150px]" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      <ActionTakenCell
                        value={m.action_taken}
                        onChange={(newVal) => onUpdateMeeting(m.id, { action_taken: newVal })}
                      />
                    </td>
                    <td className="px-3 py-2 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleManualSyncRow(m)}
                          className="p-1.5 text-gray-300 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Sync this row as issue"
                          disabled={!effectiveProjectId}
                        >
                          <Zap className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                          onClick={() => onDeleteMeeting(m.id || idx)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Empty Rows to complete the "Form" look if fewer than 10 rows */}
              {meetings.length < 5 && Array.from({ length: 5 - meetings.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-12">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={`cell-${j}`} className={`border border-gray-200 ${j === 9 ? 'print:hidden' : ''}`}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
     </div>
    </div>
  );
};

export default MeetingTable;
