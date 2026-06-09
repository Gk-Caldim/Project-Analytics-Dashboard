import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Download, Clipboard, Check, Tag, Trash2, AlertCircle, Zap, Loader2, Info, FileText, Share2, FolderOpen, Mail, X, ChevronDown, Settings, ArrowRight, Calendar, Edit3, AlertTriangle, CheckCircle, Layout, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import API from '../../utils/api';
import { saveMOM, updateMomRow } from '../../store/slices/momSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '../../components/ui/pagination';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '../../components/ui/combobox';
import { useConfirm } from '../../hooks/use-confirm';

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

// ── Portal-based Pill Dropdown — escapes overflow:hidden/auto parents ──────
// Root cause: table wrapper uses overflow-x:auto which creates a scroll
// containment block. position:absolute children are clipped to that block.
// Fix: render the menu into document.body via createPortal with position:fixed
// coordinates calculated from getBoundingClientRect().
const PillDropdown = ({ value, options, onChange, colors, label = "Select option" }) => {
  const activeColor = colors[value] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            background: activeColor.bg,
            color: activeColor.color,
            border: `1.5px solid ${activeColor.border}`,
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            outline: 'none',
            transition: 'all 0.15s',
            letterSpacing: '0.06em',
            minWidth: '76px',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
          }}
          className="hover:opacity-85 focus:ring-1 focus:ring-slate-400 select-none"
        >
          {value}
          <ChevronDown size={11} className="opacity-70 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="center" 
        className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[130px] p-0 z-50"
      >
        <div className="px-3 py-1.5 text-[9px] font-extrabold tracking-widest text-slate-400 uppercase border-b border-slate-100 bg-slate-50/50">
          {label}
        </div>
        <div className="p-1">
          {options.map((opt) => {
            const c = colors[opt] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
            const isActive = value === opt;
            return (
              <DropdownMenuItem
                key={opt}
                onClick={() => onChange(opt)}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wide rounded cursor-pointer outline-none transition-colors ${
                  isActive 
                    ? 'text-teal-600 font-extrabold' 
                    : 'text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900'
                }`}
                style={{
                  borderLeft: isActive ? `3px solid ${c.border}` : '3px solid transparent',
                  color: isActive ? c.color : undefined,
                  background: isActive ? c.bg : undefined,
                }}
              >
                <span>{opt}</span>
                {isActive && <Check size={11} strokeWidth={3} />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter') setIsEditing(false);
        }}
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
      className={`flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--table-hover)] rounded px-1 py-1 transition-colors ${isOverdue ? 'text-red-600 font-bold' : 'text-[var(--text-primary)] font-mono font-bold'}`}
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
        className="text-[var(--text-muted)] italic cursor-pointer hover:text-teal-600 transition-colors py-1"
      >
        ＋ Add note
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="group flex items-start gap-2 cursor-pointer hover:bg-[var(--table-hover)] p-1 rounded transition-colors text-[var(--text-primary)]"
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
        color: 'var(--text-primary)', 
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

import { Skeleton } from '../../components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';

const MeetingTable = ({ meetings, employees = [], onUpdateMeeting, onDeleteMeeting, lockedProjectId, loading }) => {
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

  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [meetings.length]);

  // ── Local Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [meetings.length]);

  const totalPages = Math.max(1, Math.ceil(meetings.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  
  const paginatedMeetings = React.useMemo(() => {
    return meetings.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  }, [meetings, activePage, itemsPerPage]);

  // ── Inline row preview state (multi-expand via Set) ──
  const [expandedRows, setExpandedRows] = React.useState(new Set());
  const toggleRowExpand = (id) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Selection Toggling Logic ──
  const pageIds = React.useMemo(() => {
    return paginatedMeetings.map((m, idx) => m.id || ((activePage - 1) * itemsPerPage + idx));
  }, [paginatedMeetings, activePage, itemsPerPage]);

  const isAllPageSelected = React.useMemo(() => {
    return pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  }, [pageIds, selectedIds]);

  const toggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Confirmation Handlers ──
  const handleDeleteClick = async (rowId) => {
    const isConfirmed = await confirm({
      title: 'Delete Action Item?',
      description: 'Are you sure you want to delete this action item? This will remove it from the meeting notes.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (isConfirmed) {
      onDeleteMeeting(rowId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      toast.success('Action item deleted', { description: 'The item has been removed.', duration: 2000 });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const isConfirmed = await confirm({
      title: `Delete ${selectedIds.size} Action Items?`,
      description: `Are you sure you want to delete the ${selectedIds.size} selected action items? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.size} Items`,
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (isConfirmed) {
      selectedIds.forEach(id => {
        onDeleteMeeting(id);
      });
      setSelectedIds(new Set());
      toast.success('Items deleted', { description: 'The selected action items have been removed.', duration: 2500 });
    }
  };



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
  const [syncResultId, setSyncResultId] = useState(null); // deep-link to the exact record in Saved MOMs
  
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
      if (silent !== true) toast.error('Invalid Project ID', { description: 'Please re-link the project and try again.' });
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
      
      // Store sync_id so the drawer's "View in Library" button can deep-link to it
      setSyncResultId(resp.data.sync_id || null);
      toast.success('MOM synced', { description: 'The minutes of meeting have been synced to the Saved Library.' });

      setTimeout(() => setSyncFlowState('idle'), 4000);
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
      toast.error('No project linked', { description: 'Please select or set a project before syncing.' });
      return;
    }
    const owner = (row.responsibility || '').trim();
    if (!owner) {
      toast.error('Owner missing', { description: 'Please assign an owner/responsibility before syncing.' });
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
      const title50 = titleText.length > 50 ? titleText.slice(0, 47) + '...' : titleText;
      toast.success('Issue created', { description: `Action item synced successfully: "${title50}"` });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      toast.error('Sync failed', { description: detail });
    }
  };


  // Download as CSV
  const handleDownloadCSV = () => {
    const header = ['S.No', 'Function', 'Project', 'Criticality', 'Action Points', 'Responsibility', 'Target', 'Status', 'Action Taken'];
    const rows = meetings.map((m, idx) => [
      m.s_no || m.sno || idx + 1,
      m.function || 'General',
      m.project_name || reduxProjectName || 'General',
      m.criticality || 'Normal',
      `"${(m.discussion_point || '').replace(/"/g, '""')}"`,
      m.responsibility || '',
      m.target || '',
      m.status || '',
      `"${(m.action_taken || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOM_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Export completed', { description: 'CSV file downloaded successfully.' });
  };

  // Download as PDF via jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Minutes of Meeting - Official Record', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["S.No", "Function", "Project", "Criticality", "Action Points", "Responsibility", "Target", "Status", "Action Taken"];
    const tableRows = meetings.map((m, idx) => [
      m.s_no || m.sno || idx + 1,
      m.function || 'General',
      m.project_name || reduxProjectName || 'General',
      m.criticality || 'Normal',
      m.discussion_point || '',
      m.responsibility || '',
      m.target || '',
      m.status || '',
      m.action_taken || ''
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 36,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        4: { cellWidth: 70 }, 
        8: { cellWidth: 50 }  
      }
    });

    // Open PDF preview in a new tab instead of downloading directly
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    toast.success('Preview generated', { description: 'PDF preview opened in a new tab.' });
  };

  // ── Send Summary Modal ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendRecipients, setSendRecipients] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendAttachPDF, setSendAttachPDF] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSendSummary = async () => {
    if (!sendRecipients.trim()) { toast.error('Recipient email required', { description: 'Please enter at least one recipient email address.' }); return; }
    setSending(true);
    try {
      await API.post(`/mom/${meetingId || 'unknown'}/broadcast`, {
        recipients: sendRecipients.split(',').map(e => e.trim()).filter(Boolean),
        message: sendMessage,
        attach_pdf: sendAttachPDF,
      });
      toast.success('Summary sent', { description: 'MOM summary has been successfully shared with all recipients.' });
      setShowSendModal(false);
      setSendRecipients('');
      setSendMessage('');
    } catch (err) {
      toast.error('Failed to send summary', { description: 'Please check the network connection and try again.' });
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

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 pb-20 space-y-8 animate-fadeIn meeting-table-container">
        {/* Consolidated Command Bar Skeleton */}
        <div className="bg-white border border-gray-300 shadow-xl rounded-sm overflow-hidden">
          <div className="pt-8 pb-4 px-8 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <div style={{ flex: 1 }}>
              <Skeleton className="h-3 w-20" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 className="text-[14px] font-extrabold uppercase tracking-[0.2em] text-gray-800">
                Minutes of Meeting
              </h1>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Skeleton className="h-5 w-32" />
            </div>
          </div>

          <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
            {/* Left side: Sync & Automation Skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Skeleton className="h-8 w-28 rounded-[4px]" />
              <Skeleton className="h-8 w-8 rounded-[4px]" />
            </div>

            {/* Right side: Exports Skeleton */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Skeleton className="h-8 w-20 rounded-[4px]" />
            </div>
          </div>

          {/* THE GRID SKELETON */}
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
                        color: 'var(--text-muted)',
                        borderRight: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none',
                        borderBottom: '1px solid #E2E8F0'
                      }}
                    >{col.label}</th>
                  ))}
                  <th
                    className="px-3 py-3 text-left font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]"
                    style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid #E2E8F0' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const cellBorder = { borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F8FAFC' };
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-[#FAFCFF] transition-none"
                      style={{ height: '58px' }}
                    >
                      {/* S.No */}
                      <td className="px-3 py-2 text-center" style={{ ...cellBorder }}>
                        <Skeleton className="h-4 w-6 mx-auto" />
                      </td>
                      {/* Function */}
                      <td className="px-4 py-2 text-center" style={{ ...cellBorder }}>
                        <Skeleton className="h-6 w-16 mx-auto" />
                      </td>
                      {/* Project Name */}
                      <td className="px-4 py-2 text-left" style={{ maxWidth: '160px', ...cellBorder }}>
                        <Skeleton className="h-4 w-24" />
                      </td>
                      {/* Criticality */}
                      <td className="px-3 py-2 text-center" style={{ ...cellBorder }}>
                        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                      </td>
                      {/* Action Points */}
                      <td className="px-6 py-2 leading-relaxed min-w-[300px]" style={{ ...cellBorder }}>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-[70%]" />
                        </div>
                      </td>
                      {/* Responsibility */}
                      <td className="px-4 py-2 min-w-[180px]" style={{ ...cellBorder }}>
                        <Skeleton className="h-8 w-28 rounded-[4px]" />
                      </td>
                      {/* Target */}
                      <td className="px-4 py-2 text-center" style={{ ...cellBorder }}>
                        <Skeleton className="h-5 w-16 mx-auto" />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-2 text-center" style={{ ...cellBorder }}>
                        <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                      </td>
                      {/* Action Taken */}
                      <td className="px-4 py-2 min-w-[150px]" style={{ ...cellBorder }}>
                        <Skeleton className="h-4 w-28" />
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2 text-center" style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <div className="flex items-center justify-center gap-2">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
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
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-20 space-y-8 animate-fadeIn meeting-table-container">

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
                  <RefreshCw size={14} className={syncFlowState === 'syncing' ? "animate-spin" : ""} />
                  {syncFlowState === 'syncing' ? 'Saving...' : 'Save'}
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

              {showLinkWarning && <span className="text-[11px] text-amber-600 font-bold animate-pulse">Link a project to save.</span>}
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
                      { label: 'CSV', icon: <Download size={12} />, action: handleDownloadCSV },
                      { label: 'PDF', icon: <Download size={12} />, action: handleDownloadPDF },
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
                    onClick={() => {
                      setShowSyncPanel(false);
                      navigate(`/dashboard/saved-moms${syncResultId ? `?highlight=${syncResultId}` : ''}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#0D9488] text-white py-3 rounded-lg font-bold hover:bg-[#0F766E] transition-all shadow-lg"
                  >
                    View in Library <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={() => setShowSyncPanel(false)}
                    style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Continue Editing
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
                <th
                  className="px-1.5 py-3 text-center font-medium sticky top-0 z-10 bg-[#F8FAFC] print:hidden"
                  style={{
                    width: '40px',
                    borderRight: '1px solid #F1F5F9',
                    borderBottom: '1px solid #E2E8F0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-[#0D9488]"
                  />
                </th>
                {[
                  { label: 'S.No', cls: 'px-1.5 py-3 text-center' },
                  { label: 'Function', cls: 'px-2 py-3 text-left' },
                  { label: 'Project Name', cls: 'px-2 py-3 text-left' },
                  { label: 'Criticality', cls: 'px-1.5 py-3 text-center' },
                  { label: 'Action Points Discussed', cls: 'px-4 py-3 text-left' },
                  { label: 'Responsibility', cls: 'px-2 py-3 text-left' },
                  { label: 'Target', cls: 'px-2 py-3 text-center' },
                  { label: 'Status', cls: 'px-2 py-3 text-center' },
                  { label: 'Action Taken', cls: 'px-2 py-3 text-left' },
                ].map((col, i, arr) => (
                  <th
                    key={col.label}
                    className={`${col.cls} font-medium uppercase sticky top-0 z-10 bg-[#F8FAFC]`}
                    style={{
                      fontSize: '11px', letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      borderRight: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none',
                      borderBottom: '1px solid #E2E8F0'
                    }}
                  >{col.label}</th>
                ))}
                <th
                  className="px-1.5 py-3 text-left font-medium uppercase print:hidden sticky top-0 z-10 bg-[#F8FAFC]"
                  style={{ fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid #E2E8F0' }}
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
              {paginatedMeetings.map((m, idx) => {
                const cellBorder = { borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F8FAFC' };
                return (
                  <React.Fragment key={m.id || idx}>
                  <tr
                    className="hover:bg-[#FAFCFF] transition-none group"
                    style={{
                      height: '52px',
                      borderLeft: m.needsReview ? '3px solid #F59E0B' : '3px solid transparent',
                    }}
                  >
                    <td className="px-1.5 py-2 text-center print:hidden" style={{ ...cellBorder, width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.id || ((activePage - 1) * itemsPerPage + idx))}
                        onChange={() => toggleSelectRow(m.id || ((activePage - 1) * itemsPerPage + idx))}
                        aria-label={`Select row ${m.s_no || m.sno || ((activePage - 1) * itemsPerPage + idx + 1)}`}
                        className={`w-4 h-4 rounded border-slate-300 cursor-pointer accent-[#0D9488] transition-opacity duration-100 ${
                          selectedIds.has(m.id || ((activePage - 1) * itemsPerPage + idx))
                            ? 'opacity-100'
                            : 'opacity-100'
                        }`}
                      />
                    </td>
                    <td className="px-1.5 py-2 text-center" style={{ fontSize: '14px', color: 'var(--text-primary)', ...cellBorder }}>{m.s_no || m.sno || ((activePage - 1) * itemsPerPage + idx + 1)}</td>
                    <td className="px-2 py-2 text-center" style={cellBorder}>
                       <input type="text" defaultValue={m.function || 'General'} className="bg-transparent text-center focus:bg-white focus:outline-teal-500 w-full" style={{ fontSize: '14px', color: 'var(--text-primary)' }} onBlur={(e) => onUpdateMeeting(m.id, { function: e.target.value })} />
                    </td>
                    <td className="px-2 py-2 text-left font-medium" style={{ maxWidth: '160px', ...cellBorder }}>
                      <ProjectCell projectName={m.project_name} defaultProjectName={reduxProjectName} />
                    </td>
                    <td className="px-2 py-2 text-center" style={cellBorder}>
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
                    <td className="px-4 py-2 leading-relaxed min-w-[260px]" style={{ fontSize: '14px', color: 'var(--text-primary)', ...cellBorder }}>
                      <div className="relative group/heuristic flex gap-2 w-full">
                        <textarea defaultValue={m.discussion_point || '—'} className="w-full bg-transparent resize-none focus:bg-white focus:outline-teal-500 min-h-[40px]" onBlur={(e) => onUpdateMeeting(m.id, { discussion_point: e.target.value })} />
                        <div className="flex-shrink-0 cursor-help text-gray-300 hover:text-teal-600 mt-1" title={m.isHeuristic ? 'Fallback heuristic used' : 'AI extracted'}><Info className="w-4 h-4" /></div>
                      </div>
                    </td>
                    <td className="px-2 py-2 min-w-[140px]" style={cellBorder}>
                      <Select
                        options={employees.map(e => ({ value: e.name, label: e.name, employeeId: e.employee_id }))}
                        defaultValue={m.responsibility ? { value: m.responsibility, label: m.responsibility } : null}
                        onChange={(opt) => onUpdateMeeting(m.id, { responsibility: opt?.value })}
                        placeholder="Assign..."
                        className="text-left"
                        /* ── Portal fix: render menu to body to escape overflow:auto ── */
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                          menu: (base) => ({
                            ...base,
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                            overflow: 'hidden',
                            fontSize: '13px',
                          }),
                          menuList: (base) => ({ ...base, padding: '4px', maxHeight: '220px' }),
                          option: (base, state) => ({
                            ...base,
                            fontSize: '13px',
                            fontWeight: state.isSelected ? 700 : 500,
                            color: state.isSelected ? '#0D9488' : '#334155',
                            background: state.isSelected ? '#F0FDFA' : state.isFocused ? '#F8FAFC' : 'transparent',
                            borderRadius: '6px',
                            padding: '7px 10px',
                            cursor: 'pointer',
                          }),
                          control: (base) => ({
                            ...base,
                            minHeight: '30px',
                            background: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }),
                          placeholder: (base) => ({ ...base, color: '#94A3B8', fontSize: '12px' }),
                          singleValue: (base) => ({ ...base, color: 'var(--text-primary)', fontWeight: 500 }),
                          indicatorSeparator: () => ({ display: 'none' }),
                          dropdownIndicator: (base, state) => ({
                            ...base,
                            color: '#94A3B8',
                            padding: '0 4px',
                            transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                          }),
                          input: (base) => ({ ...base, fontSize: '13px' }),
                          valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 text-center text-gray-500" style={cellBorder}>
                      <TargetDateCell value={m.target} onChange={(newVal) => onUpdateMeeting(m.id, { target: newVal })} />
                    </td>
                     <td className="px-2 py-2 text-center" style={cellBorder}>
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
                     <td className="px-2 py-2 min-w-[130px]" style={{ fontSize: '14px', color: 'var(--text-primary)', ...cellBorder }}>
                       <ActionTakenCell value={m.action_taken} onChange={(newVal) => onUpdateMeeting(m.id, { action_taken: newVal })} />
                      </td>
                      <td className="px-1.5 py-2 text-center print:hidden" style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Row expand toggle */}
                          <button
                            onClick={() => toggleRowExpand(m.id || ((activePage - 1) * itemsPerPage + idx))}
                            className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                            title={expandedRows.has(m.id || ((activePage - 1) * itemsPerPage + idx)) ? 'Collapse preview' : 'Expand preview'}
                          >
                            <ChevronDown
                              className="w-3.5 h-3.5 mx-auto transition-transform duration-200"
                              style={{ transform: expandedRows.has(m.id || ((activePage - 1) * itemsPerPage + idx)) ? 'rotate(180deg)' : 'none' }}
                            />
                          </button>
                          <button onClick={() => handleManualSyncRow(m)} className="p-1.5 text-slate-400 hover:text-teal-600 transition-colors" title="Sync this row as issue" disabled={!effectiveProjectId}><Zap className="w-3.5 h-3.5 mx-auto" /></button>
                          <button onClick={() => handleDeleteClick(m.id || ((activePage - 1) * itemsPerPage + idx))} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete row"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                        </div>
                      </td>
                    </tr>
                    {/* ── Inline Preview Row (conditionally rendered) ── */}
                    {expandedRows.has(m.id || ((activePage - 1) * itemsPerPage + idx)) && (
                      <tr className="mt-row-preview-tr">
                        <td colSpan={11} className="mt-preview-cell" style={{ padding: 0, borderBottom: '1px solid #E2E8F0' }}>
                          <div className="mt-preview-body">
                            <div className="mt-preview-section">
                              <span className="mt-preview-label">Full Discussion Point</span>
                              <p className="mt-preview-text">{m.discussion_point || '—'}</p>
                            </div>
                            {m.action_taken && m.action_taken !== 'None' && (
                              <div className="mt-preview-section">
                                <span className="mt-preview-label">Action Taken</span>
                                <p className="mt-preview-text">{m.action_taken}</p>
                              </div>
                            )}
                            <div className="mt-preview-chips">
                              {m.function && <span className="mt-preview-chip">{m.function}</span>}
                              {m.criticality && <span className="mt-preview-chip" style={{ background: CRITICALITY_COLORS[m.criticality]?.bg, color: CRITICALITY_COLORS[m.criticality]?.color }}>{m.criticality}</span>}
                              {m.target && <span className="mt-preview-chip">Due: {m.target}</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                   </React.Fragment>
                  );
                })}
             </tbody>
           </table>
         </div>

         {/* Pagination footer — always visible when rows exist so users know current page state */}
         {meetings.length > 0 && (
           <div className="py-3 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 rounded-b-sm print:hidden">
             <div className="flex items-center gap-3">
               <span className="text-[11px] text-slate-400 font-medium">
                 Showing {(activePage - 1) * itemsPerPage + 1}–{Math.min(activePage * itemsPerPage, meetings.length)} of {meetings.length} items
               </span>
               <span className="text-[11px] text-slate-200">|</span>
               <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                  <span>Show:</span>
                  <Combobox
                    items={[5, 10, 15, 20]}
                    value={itemsPerPage}
                    onChange={val => {
                      setItemsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    className="w-16"
                  >
                    <ComboboxInput
                      hideSearch
                      hideClear
                      readOnly
                      placeholder={String(itemsPerPage)}
                      className="h-6 py-0.5 px-1.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 rounded shadow-sm transition-all"
                    />
                    <ComboboxContent className="w-16 min-w-0" position="top">
                      <ComboboxList className="max-h-32">
                        {(val) => (
                          <ComboboxItem key={val} value={val} className="py-1 px-2 text-[10px]">
                            {val}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-[11px] text-slate-200">|</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleBulkDelete}
                        className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors flex items-center justify-center"
                        title={`Delete ${selectedIds.size} selected items`}
                        aria-label={`Delete ${selectedIds.size} selected items`}
                      >
                        <Trash2 size={14} className="stroke-[2.2]" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '10px', color: '#94A3B8', fontWeight: 500,
                          padding: 0
                        }}
                        className="hover:text-slate-600 transition-colors ml-1"
                        aria-label="Clear selection"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
             </div>
             <Pagination className="w-auto mx-0">
               <PaginationContent>
                 <PaginationItem>
                   <PaginationPrevious
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={activePage === 1}
                     className="cursor-pointer"
                   />
                 </PaginationItem>

                 {Array.from({ length: totalPages }).map((_, i) => (
                   <PaginationItem key={i}>
                     <PaginationLink
                       onClick={() => setCurrentPage(i + 1)}
                       isActive={activePage === i + 1}
                       className="cursor-pointer"
                     >
                       {i + 1}
                     </PaginationLink>
                   </PaginationItem>
                 ))}

                 <PaginationItem>
                   <PaginationNext
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={activePage === totalPages}
                     className="cursor-pointer"
                   />
                 </PaginationItem>
               </PaginationContent>
             </Pagination>
           </div>
         )}
      </div>
    </div>
  );
};

export default MeetingTable;
