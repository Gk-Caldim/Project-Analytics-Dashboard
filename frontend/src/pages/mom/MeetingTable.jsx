import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Download, Clipboard, Check, Tag, Trash2, AlertCircle, Zap, Loader2, Info, FileText, Share2, FolderOpen, Mail, X, ChevronDown, Settings, ArrowRight, Calendar, Edit3, AlertTriangle, CheckCircle, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  'Open': 'text-amber-600 font-bold',
  'Pending': 'text-amber-600 font-bold',
  'In Progress': 'text-blue-600 font-bold',
  'Done': 'text-emerald-600 font-bold',
  'Resolved': 'text-emerald-600 font-bold',
  'Closed': 'text-gray-400 font-medium line-through',
};

// ── Custom Pill Dropdown Component ─────────────────────────────────────────
const PillDropdown = ({ value, options, onChange, colors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeColor = colors[value] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          background: activeColor.bg, color: activeColor.color, border: `1px solid ${activeColor.border}`,
          padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 800,
          textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
          outline: 'none', transition: 'all 0.2s', letterSpacing: '0.05em', minWidth: '80px', justifyContent: 'center'
        }}
      >
        {value}
        <ChevronDown size={12} style={{ opacity: 0.6, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '4px' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', minWidth: '110px'
            }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                onClick={(e) => { e.stopPropagation(); onChange(opt); setIsOpen(false); }}
                style={{
                  padding: '8px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  color: '#334155', cursor: 'pointer', textAlign: 'center',
                  background: value === opt ? '#F8FAFC' : 'transparent',
                  borderBottom: '1px solid #F1F5F9', letterSpacing: '0.05em'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = value === opt ? '#F8FAFC' : 'transparent'; }}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ── Safe date normalizer ─────────────────────────────────────────────────
// Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO strings, 'TBD', '', null
// Returns: YYYY-MM-DD string or null
function normalizeDate(raw) {
  if (!raw || raw === 'TBD' || raw === '—' || raw === 'None') return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try native parse as last resort (handles ISO strings)
  const ts = Date.parse(raw);
  if (!isNaN(ts)) return new Date(ts).toISOString().split('T')[0];
  return null;
}

const TargetDateCell = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const normalized = normalizeDate(value);
  const isOverdue = normalized && new Date(normalized) < new Date(new Date().setHours(0,0,0,0));

  if (isEditing) {
    return (
      <input
        type="date"
        value={normalized || ''}
        autoFocus
        className="w-full bg-white border border-[#E2E8F0] rounded-[6px] px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0D9488] h-[36px]"
        onChange={(e) => {
          onChange(e.target.value);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
      />
    );
  }

  if (!normalized) {
    return (
      <span 
        onClick={() => setIsEditing(true)}
        className="text-teal-600 font-semibold cursor-pointer hover:underline text-[11px]"
      >
        Set date
      </span>
    );
  }

  const dateObj = new Date(normalized + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-1 transition-colors ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600 font-mono font-bold'}`}
      style={{ whiteSpace: 'nowrap' }}
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
        className="w-full bg-white border border-[#E2E8F0] rounded-[6px] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488] min-h-[36px] resize-none"
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

const ProjectCell = ({ projectName, defaultProjectName }) => {
  const displayValue = projectName || defaultProjectName || null;
  if (!displayValue) {
    return (
      <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic', whiteSpace: 'nowrap' }}
        title="No project linked">
        Unassigned
      </div>
    );
  }
  const truncatedValue = displayValue.length > 16 ? displayValue.slice(0, 16) + '...' : displayValue;

  return (
    <div 
      style={{ 
        fontSize: '14px', 
        color: 'var(--color-text-primary, #1e293b)', 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        maxWidth: '140px' 
      }}
      title={displayValue}
    >
      {truncatedValue}
    </div>
  );
};

const MeetingTable = ({ meetings, employees = [], onUpdateMeeting, onDeleteMeeting, lockedProjectId }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { 
    meetingId, 
    meetingName, 
    projectId: reduxProjectId, 
    projectName: reduxProjectName, 
    status: reduxStatus,
    lastSaved: reduxLastSaved,
    date: reduxDate
  } = useSelector(state => state.mom);

  const effectiveProjectId = lockedProjectId || reduxProjectId;



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

  // ── Sync High-priority MOM rows → Issue Engine ─────────────────
  const [syncFlowState, setSyncFlowState] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showLinkWarning, setShowLinkWarning] = useState(false);
  const [syncedBadgeCount, setSyncedBadgeCount] = useState(0);
  const [syncRoster, setSyncRoster] = useState([]);
  
  // Stable ID for deduplication when Redux meetingId is missing
  const tempMeetingIdRef = useRef(`temp-${Math.random().toString(36).substr(2, 9)}`);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showAutoSyncMenu, setShowAutoSyncMenu] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('autoSyncHighCritical') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('autoSyncHighCritical', autoSyncEnabled);
  }, [autoSyncEnabled]);

  const [copied, setCopied] = useState(false);

  const handleSyncIssues = async (silent = false) => {
    if (!effectiveProjectId) {
      if (silent !== true) {
        setShowLinkWarning(true);
        setTimeout(() => setShowLinkWarning(false), 3000);
      }
      return;
    }

    const rowsToSync = meetings.filter(m => {
      const text = (m.discussion_point || '').trim();
      
      // Accuracy Filter: Exclude empty action points or obvious system logs
      if (!text || text === '—') return false;
      if (text.startsWith('[Meeting ended')) return false;
      if (text.toLowerCase().includes('action items (auto-detected):')) return false;
      
      return true;
    });

    if (rowsToSync.length === 0) {
      if (silent !== true) {
        toast.error(
          'No valid action items found. ' +
          'Review the table to ensure there are items to sync.'
        );
      }
      return;
    }

    const actions = [];
    rowsToSync.forEach((m, idx) => {
      const owner = (m.responsibility || '').trim();
      const target = (m.target || '').trim();
      const actionText = (m.discussion_point || '').trim();
      
      // Removed the !owner block so literally every row syncs as requested.
      
      let parsedDate = null;
      if (target && target !== '—' && target.toLowerCase() !== 'tbd') {
        // 1. Try native parsing
        const timestamp = Date.parse(target);
        if (!isNaN(timestamp)) {
          parsedDate = new Date(timestamp).toISOString().split('T')[0];
        } else {
          // 2. Manual parsing for DD/MM/YYYY
          const parts = target.split(/[-/]/);
          if (parts.length === 3) {
            // DD/MM/YYYY or DD-MM-YYYY
            if (parts[2].length === 4 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            // YYYY/MM/DD
            else if (parts[0].length === 4 && !isNaN(parts[1]) && !isNaN(parts[2])) {
               parsedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
        }
      }

      actions.push({
        title: actionText.length > 150 ? actionText.slice(0, 147) + '...' : actionText,
        description: actionText.length > 150 ? actionText : '',
        owner,
        department: m.function || 'General',
        priority: m.criticality === 'Critical' ? 'High' : (m.criticality || 'Medium'),
        due_date: parsedDate,
        status: m.status || 'PENDING',
        action_taken: (m.action_taken || '').trim(),
      });
    });

    const targetProjectId = Number(effectiveProjectId);
    if (isNaN(targetProjectId)) {
      if (silent !== true) toast.error('Invalid Project ID. Please re-link the project.');
      setSyncFlowState('error');
      return;
    }

    setSyncFlowState('syncing');
    const startTime = Date.now();
    
    // Ensure we always send a stable meeting_id so backend can deduplicate accurately
    const finalMeetingId = meetingId || tempMeetingIdRef.current;
    
    try {
      const resp = await API.post('/mom/issues', {
        project_id: targetProjectId,
        meeting_id: finalMeetingId,
        meeting_name: meetingName || 'Untitled Meeting',
        date: reduxDate || new Date().toISOString().split('T')[0],
        mom_output_url: window.location.href,
        actions,
      });
      
      const { sync_id } = resp.data;
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed));

      setSyncFlowState('success');
      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      setSyncRoster(rowsToSync);
      setSyncedBadgeCount(resp.data.issues_created || rowsToSync.length);
      setShowSyncPanel(true);
      
      toast.success('MOM synced to Saved Library!');
      
      // Part 3 — Redirect to Saved MOMs with high-fidelity highlight
      setTimeout(() => {
        const sid = resp.data.sync_id;
        navigate(`/dashboard/saved-moms${sid ? `?highlight=${sid}` : ''}`);
      }, 1500);

      setTimeout(() => setSyncFlowState('idle'), 3000);
    } catch (err) {
      setSyncFlowState('error');
      setTimeout(() => setSyncFlowState('idle'), 3000);
    }
  };

  useEffect(() => {
    if (autoSyncEnabled && reduxStatus === 'saved' && reduxLastSaved) {
      // Trigger sync silently
      handleSyncIssues(true);
    }
  }, [reduxLastSaved, reduxStatus, autoSyncEnabled]);

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
    const titleText = actionText.length > 150 ? actionText.slice(0, 147) + '...' : actionText;
    const descText = actionText.length > 150 ? actionText : '';
    let parsedDate = null;
    if (row.target) {
      const iso = Date.parse(row.target);
      if (!isNaN(iso)) parsedDate = new Date(iso).toISOString().split('T')[0];
    }
    try {
      await API.post('/mom/issues/manual', {
        project_id: Number(effectiveProjectId),
        meeting_id: meetingId || null,
        title: titleText || 'MOM Action',
        description: descText,
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

        {/* Clean Section Header (Document Identity) */}
        <div className="pt-8 pb-4 px-8 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <div style={{ flex: 1 }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600 mb-1">
              Official Record
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-gray-800">
              Minutes of Meeting
            </h1>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">
              FORM NO: MOM/STD/2026 <br/>
              <span className="text-gray-300">REV: 04-APR-2026</span>
            </div>
          </div>
        </div>

        {/* ── Phase 5: Consolidated Command Bar ── */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between print:hidden">
           {/* Left side: Sync & Automation */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                  onClick={handleSyncIssues}
                  disabled={syncFlowState === 'syncing'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '0 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 700,
                    background: syncFlowState === 'syncing' ? 'transparent' : '#0D9488',
                    border: `1px solid #0D9488`,
                    color: syncFlowState === 'syncing' ? '#0D9488' : '#fff',
                    cursor: syncFlowState === 'syncing' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease', height: '32px'
                  }}
                >
                  {syncFlowState === 'syncing' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {syncFlowState === 'syncing' ? 'Syncing...' : 'Sync Issues'}
                  {syncedBadgeCount > 0 && <span className="ml-2 bg-white text-[#0D9488] px-1.5 rounded text-[10px]">✓ {syncedBadgeCount}</span>}
                </button>
                {unsyncedCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white">
                    {unsyncedCount}
                  </span>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAutoSyncMenu(!showAutoSyncMenu)}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors border border-gray-200"
                  title="Auto-sync Settings"
                >
                  <Settings size={16} />
                </button>
                {showAutoSyncMenu && (
                  <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[240px]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={autoSyncEnabled}
                        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        className="mt-1 accent-[#0D9488]"
                      />
                      <div>
                        <div className="text-[12px] font-bold text-gray-800">Auto-sync on save</div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Automatically sync action items when document is saved.</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {showLinkWarning && <span className="text-[11px] text-amber-600 font-bold animate-pulse">Link a project to sync issues.</span>}
           </div>

           {/* Right side: Exports */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 h-8 rounded border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  <FileText size={14} /> Export <ChevronDown size={12} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[140px] overflow-hidden">
                    {[
                      { label: 'Copy CSV', icon: <Clipboard size={12} />, action: handleCopy },
                      { label: 'Print PDF', icon: <Download size={12} />, action: handlePrint },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => { item.action(); setShowExportMenu(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-[11px] font-bold text-gray-700 hover:bg-teal-50 hover:text-[#0D9488] transition-colors text-left"
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 h-8 rounded bg-gray-800 text-white text-xs font-bold hover:bg-black transition-colors"
              >
                <Download size={14} /> Download PDF
              </button>
           </div>
        </div>

        {/* Global Slide-out Drawer (Always rendered at body level via fixed position) */}
        <AnimatePresence>
          {showSyncPanel && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSyncPanel(false)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)' }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: '400px', maxWidth: '100vw',
                  background: '#F8FAFC', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column'
                }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle color="#0D9488" /> Sync Complete</h2>
                    <p style={{ fontSize: '12px', color: '#64748B' }}>Synced at {lastSyncTime}</p>
                  </div>
                  <button onClick={() => setShowSyncPanel(false)} className="p-2 rounded-full hover:bg-gray-100"><X size={20} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Total Synced</span>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>{syncRoster.length} Issues</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>Project</span>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>{reduxProjectName || 'Current'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {syncRoster.map((item, idx) => (
                      <div key={idx} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{item.discussion_point}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                           <span className={`mvp-priority-pill ${item.criticality}`} style={{ transform: 'scale(0.8)', transformOrigin: 'left' }}>{item.criticality}</span>
                           <span style={{ fontSize: '11px', color: '#64748B' }}>{item.responsibility}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0', background: '#fff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => { setShowSyncPanel(false); navigate(`/dashboard/mom/view/${sync_id}`); }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3 rounded-lg font-bold hover:bg-[#0F766E] transition-all shadow-lg"
                  >
                    View Saved MOM <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => { setShowSyncPanel(false); navigate(`/dashboard/projects?projectId=${effectiveProjectId}`); }}
                    style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Go to Project Dashboard
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── THE GRID ── */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-[#F8FAFC] sticky top-0 z-10" style={{ borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { label: 'S.No', cls: 'px-3 py-3 text-left' },
                  { label: 'Function', cls: 'px-4 py-3 text-left' },
                  { label: 'Project Name', cls: 'px-4 py-3 text-left' },
                  { label: 'Criticality', cls: 'px-3 py-3 text-left' },
                  { label: 'Action Points Discussed', cls: 'px-6 py-3 text-left' },
                  { label: 'Responsibility', cls: 'px-4 py-3 text-left' },
                  { label: 'Target', cls: 'px-4 py-3 text-center' },
                  { label: 'Status', cls: 'px-4 py-3 text-center' },
                  { label: 'Action Taken', cls: 'px-4 py-3 text-left' },
                ].map((col, i, arr) => (
                  <th
                    key={col.label}
                    className={`${col.cls} font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]`}
                    style={{
                      fontSize: '11px', letterSpacing: '0.05em',
                      color: 'var(--color-text-tertiary)',
                      borderRight: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none',
                      borderBottom: '1px solid #E2E8F0'
                    }}
                  >{col.label}</th>
                ))}
                <th
                  className="px-3 py-3 text-left font-medium uppercase print:hidden sticky top-0 z-10 bg-[#F8FAFC]"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', borderBottom: '1px solid #E2E8F0' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Actions</span>
                    {lastSyncTime && (
                      <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                        Last synced: {lastSyncTime}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, idx) => {
                const cellBorder = { borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F8FAFC' };
                return (
                  <tr
                    key={m.id || idx}
                    className="hover:bg-[#FAFCFF] transition-none group"
                    style={{
                      height: '52px',
                      borderLeft: m.needsReview ? '3px solid #F59E0B' : '3px solid transparent',
                    }}
                  >
                    <td className="px-3 py-2 text-center" style={{ fontSize: '14px', color: 'var(--color-text-primary)', ...cellBorder }}>{m.s_no || m.sno || idx + 1}</td>
                    <td className="px-4 py-2 text-center" style={cellBorder}>
                       <input type="text" defaultValue={m.function || 'General'} className="bg-transparent text-center focus:bg-white focus:outline-teal-500 w-full" style={{ fontSize: '14px', color: 'var(--color-text-primary)' }} onBlur={(e) => onUpdateMeeting(m.id, { function: e.target.value })} />
                    </td>
                    <td className="px-4 py-2 text-left font-medium" style={{ maxWidth: '160px', ...cellBorder }}>
                      <ProjectCell projectName={m.project_name} defaultProjectName={reduxProjectName} />
                    </td>
                    <td className="px-3 py-2 text-center" style={cellBorder}>
                      {(() => {
                        const crit = m.criticality || 'Normal';
                        return (
                          <PillDropdown
                            value={crit}
                            options={['Low', 'Medium', 'High', 'Critical']}
                            onChange={(val) => onUpdateMeeting(m.id, { criticality: val })}
                            colors={CRITICALITY_COLORS}
                          />
                        );
                      })()}
                    </td>
                    <td className="px-6 py-2 leading-relaxed min-w-[300px]" style={{ fontSize: '14px', color: 'var(--color-text-primary)', ...cellBorder }}>
                      <div className="relative group/heuristic flex gap-2 w-full">
                        <textarea defaultValue={m.discussion_point || '—'} className="w-full bg-transparent resize-none focus:bg-white focus:outline-teal-500 min-h-[40px]" onBlur={(e) => onUpdateMeeting(m.id, { discussion_point: e.target.value })} />
                        <div className="flex-shrink-0 cursor-help text-gray-300 hover:text-teal-600 mt-1" title={m.isHeuristic ? 'Fallback heuristic used' : 'AI extracted'}><Info className="w-4 h-4" /></div>
                      </div>
                    </td>
                    <td className="px-4 py-2 min-w-[180px]" style={cellBorder}>
                      <Select
                        options={employees.map(e => ({ value: e.name, label: e.name, employeeId: e.employee_id }))}
                        defaultValue={m.responsibility ? { value: m.responsibility, label: m.responsibility } : null}
                        onChange={(opt) => onUpdateMeeting(m.id, { responsibility: opt?.value })}
                        placeholder="Search Employee..."
                        className="text-left"
                        styles={{
                          control: (base) => ({ ...base, minHeight: '30px', background: 'transparent', border: 'none', boxShadow: 'none', fontSize: '14px', color: 'var(--color-text-primary)' }),
                          placeholder: (base) => ({ ...base, color: 'var(--color-text-tertiary)' }),
                          singleValue: (base) => ({ ...base, color: 'var(--color-text-primary)' }),
                          indicatorSeparator: () => ({ display: 'none' }),
                          dropdownIndicator: () => ({ display: 'none' })
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500" style={cellBorder}>
                      <TargetDateCell value={m.target} onChange={(newVal) => onUpdateMeeting(m.id, { target: newVal })} />
                    </td>
                     <td className="px-4 py-2 text-center" style={cellBorder}>
                        <PillDropdown
                          value={m.status || 'Pending'}
                          options={['Open', 'Pending', 'In Progress', 'Needs Review', 'Done', 'Closed']}
                          onChange={(val) => onUpdateMeeting(m.id, { status: val, needsReview: val === 'Needs Review' })}
                          colors={{
                            'Done': { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
                            'Closed': { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
                            'Pending': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
                            'Open': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
                            'In Progress': { bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
                             'Needs Review': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' }
                          }}
                        />
                     </td>
                     <td className="px-4 py-2 min-w-[150px]" style={{ fontSize: '14px', color: 'var(--color-text-primary)', ...cellBorder }}>
                       <ActionTakenCell value={m.action_taken} onChange={(newVal) => onUpdateMeeting(m.id, { action_taken: newVal })} />
                     </td>
                     <td className="px-3 py-2 text-center print:hidden" style={{ borderBottom: '1px solid #F8FAFC' }}>
                       <div className="flex items-center justify-center gap-1">
                         <button onClick={() => handleManualSyncRow(m)} className="p-1.5 text-gray-300 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100" title="Sync this row as issue" disabled={!effectiveProjectId}><Zap className="w-3.5 h-3.5 mx-auto" /></button>
                         <button onClick={() => onDeleteMeeting(m.id || idx)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Delete row"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                       </div>
                     </td>
                   </tr>
                 );
               })}
            </tbody>
          </table>
        </div>
     </div>
    </div>
  );
};

export default MeetingTable;
