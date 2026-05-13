/**
 * SavedMOMsPage.jsx — Executive-Grade MOM Library
 * Features: Atomic Sync History · Expandable Mirror Table · Inline Editing · Auto-Expansion
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, Trash2, Eye, RefreshCw,
  ChevronDown, ChevronRight, X, Calendar,
  FolderOpen, AlertCircle, Clock, BarChart2,
  ArrowUpDown, CheckCircle2, Layers, Loader2,
  Check, Edit3, Target, Plus, MessageSquare, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { getProjectAccent } from '../../utils/projectColors';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle,
  EmptyDescription, EmptyContent
} from '../../components/ui/empty';
import { Button } from '../../components/ui/button';
import './SavedMOMsPage.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const DATE_RANGES = [
  { key: 'all',   label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const SORT_OPTIONS = [
  { key: 'date_desc',  label: 'Latest First' },
  { key: 'date_asc',   label: 'Oldest First' },
  { key: 'name_asc',   label: 'Project A → Z' },
  { key: 'name_desc',  label: 'Project Z → A' },
];

const CRITICALITY_COLORS = {
  'High':     { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  'Medium':   { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'Low':      { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  'Critical': { bg: '#DC2626', color: '#FFFFFF', border: '#B91C1C' },
};

const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed', 'Pending', 'Resolved'];
const STATUS_COLORS = {
  'Open':        { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' }, // Same as Pending
  'Pending':     { bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' },
  'In Progress': { bg: '#EFF6FF', color: '#1D4ED8', border: '#DBEAFE' },
  'Closed':      { bg: '#F0FDF4', color: '#15803D', border: '#DCFCE7' }, // Same as Resolved
  'Resolved':    { bg: '#F0FDF4', color: '#15803D', border: '#DCFCE7' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ─── Inline Editable Cells ───────────────────────────────────────────────────

const EditableCell = ({ value, onSave, multiline = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => setLocalValue(value || ''), [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) onSave(localValue);
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <InputComponent
        autoFocus
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter' && !multiline) handleBlur(); }}
        className="w-full bg-white border border-[#3b82f6] rounded px-2 py-1 text-sm outline-none shadow-sm"
        rows={multiline ? 3 : 1}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="group flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
    >
      <span className="flex-1 whitespace-pre-wrap min-h-[1.5em]">
        {value || <span className="text-slate-300 italic">Add details...</span>}
      </span>
      <Edit3 size={12} className="text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>
  );
};

const StatusCell = ({ value, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const style = STATUS_COLORS[value] || STATUS_COLORS['Pending'];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all"
        style={{ background: style.bg, color: style.color, borderColor: style.border }}
      >
        {value}
        <ChevronDown size={10} className={isOpen ? 'rotate-180' : ''} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1 min-w-[120px]">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { onSave(opt); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 rounded transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DateCell = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const dateVal = value === 'TBD' ? '' : value;

  if (isEditing) {
    return (
      <input
        type="date"
        autoFocus
        value={dateVal}
        onChange={e => { onSave(e.target.value); setIsEditing(false); }}
        onBlur={() => setIsEditing(false)}
        className="text-xs border border-blue-400 rounded px-1 py-0.5 outline-none"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-blue-600 font-mono text-xs font-bold transition-colors"
    >
      <Calendar size={12} className="opacity-60" />
      {value === 'TBD' ? 'Set Date' : fmtDate(value)}
    </div>
  );
};

// ─── Mirror Table (The Action Items View) ────────────────────────────────────

const ActionItemsTable = ({ syncId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await API.get(`/mom/syncs/${syncId}/items`);
      setItems(res.data.rows || []);
    } catch {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [syncId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleUpdateItem = async (itemId, field, value) => {
    try {
      await API.patch(`/mom/action-items/${itemId}`, { field, value, sync_id: syncId });
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      ));
      toast.success('Field updated', { icon: '✨', duration: 1500 });
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="text-slate-400 text-xs font-medium">Fetching sync snapshot...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-12 text-center">S.No</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-32">Function</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-24">Criticality</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Action Point</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-40">Responsibility</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-32">Target</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-28">Status</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-48">Action Taken</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
              <td className="px-4 py-4 text-xs font-mono text-slate-400 text-center">{idx + 1}</td>
              <td className="px-4 py-4">
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {item.function}
                </span>
              </td>
              <td className="px-4 py-4">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                  style={{ 
                    background: (CRITICALITY_COLORS[item.criticality] || CRITICALITY_COLORS['Medium']).bg,
                    color: (CRITICALITY_COLORS[item.criticality] || CRITICALITY_COLORS['Medium']).color,
                    borderColor: (CRITICALITY_COLORS[item.criticality] || CRITICALITY_COLORS['Medium']).border
                  }}
                >
                  {item.criticality}
                </span>
              </td>
              <td className="px-4 py-4">
                <EditableCell 
                  value={item.discussion_point} 
                  onSave={val => handleUpdateItem(item.id, 'discussion_point', val)} 
                />
              </td>
              <td className="px-4 py-4">
                <EditableCell 
                  value={item.responsibility} 
                  onSave={val => handleUpdateItem(item.id, 'responsibility', val)} 
                />
              </td>
              <td className="px-4 py-4">
                <DateCell 
                  value={item.target} 
                  onSave={val => handleUpdateItem(item.id, 'target', val)} 
                />
              </td>
              <td className="px-4 py-4">
                <StatusCell 
                  value={item.status} 
                  onSave={val => handleUpdateItem(item.id, 'status', val)} 
                />
              </td>
              <td className="px-4 py-4">
                <EditableCell 
                  value={item.action_taken} 
                  multiline
                  onSave={val => handleUpdateItem(item.id, 'action_taken', val)} 
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SavedMOMsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightSyncId = searchParams.get('highlight');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(highlightSyncId || null);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');

  const fetchRecords = useCallback(async () => {
    try {
      const res = await API.get('/mom/history/all');
      setRecords(res.data.records || []);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchRecords().then(() => {
      if (highlightSyncId) {
        // Delay slightly to allow records to render
        setTimeout(() => {
          const el = document.getElementById(`sync-${highlightSyncId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedId(highlightSyncId);
          }
        }, 500);
      }
    }); 
  }, [fetchRecords, highlightSyncId]);

  const handleDeleteSync = async (syncId) => {
    if (!window.confirm('Delete this sync record and all associated action items?')) return;
    try {
      await API.delete(`/mom/syncs/${syncId}`);
      setRecords(prev => prev.filter(r => r.sync_id !== syncId));
      toast.success('Sync record deleted');
    } catch {
      toast.error('Failed to delete sync');
    }
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = !search || 
        r.meeting_name.toLowerCase().includes(search.toLowerCase()) || 
        r.project_name.toLowerCase().includes(search.toLowerCase());
      const matchesProject = selectedProject === 'all' || r.project_name === selectedProject;
      return matchesSearch && matchesProject;
    });
  }, [records, search, selectedProject]);

  const allProjects = useMemo(() => 
    ['all', ...new Set(records.map(r => r.project_name))].filter(Boolean), 
  [records]);

  if (loading) {
    return (
      <div className="smp-root p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="smp-root">
      {/* Header */}
      <div className="smp-header">
        <div>
          <h1 className="smp-heading">Saved MOMs</h1>
          <p className="smp-subheading">Review and refine action items from all synced meeting minutes</p>
        </div>
      </div>

      {/* Stats Band */}
      <div className="smp-stats">
        <div className="smp-stat border-l-blue-500">
          <div className="smp-stat-icon-wrap bg-blue-50 text-blue-600"><Layers size={18} /></div>
          <div><div className="smp-stat-value">{records.length}</div><div className="smp-stat-label">Total Syncs</div></div>
        </div>
        <div className="smp-stat border-l-emerald-500">
          <div className="smp-stat-icon-wrap bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
          <div>
            <div className="smp-stat-value">
              {records.reduce((acc, r) => acc + (r.status === 'success' ? 1 : 0), 0)}
            </div>
            <div className="smp-stat-label">Successful</div>
          </div>
        </div>
        <div className="smp-stat border-l-amber-500">
          <div className="smp-stat-icon-wrap bg-amber-50 text-amber-600"><BarChart2 size={18} /></div>
          <div>
            <div className="smp-stat-value">
              {records.reduce((acc, r) => acc + (r.row_count || 0), 0)}
            </div>
            <div className="smp-stat-label">Total Items</div>
          </div>
        </div>
        <div className="smp-stat border-l-purple-500">
          <div className="smp-stat-icon-wrap bg-purple-50 text-purple-600"><Clock size={18} /></div>
          <div><div className="smp-stat-value">{allProjects.length - 1}</div><div className="smp-stat-label">Projects</div></div>
        </div>
      </div>

      {/* Filters */}
      <div className="smp-filterbar">
        <div className="smp-search">
          <Search size={14} className="smp-search-ic" />
          <input 
            type="text" 
            placeholder="Search meetings or projects..." 
            className="smp-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="smp-pill outline-none cursor-pointer"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="all">All Projects</option>
          {allProjects.filter(p => p !== 'all').map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="smp-content">
        {filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText size={32} /></EmptyMedia>
              <EmptyTitle>No saved MOMs found</EmptyTitle>
              <EmptyDescription>Sync a meeting output to see its action items here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="smp-list">
            {filtered.map(rec => (
              <div 
                key={rec.sync_id} 
                id={`sync-${rec.sync_id}`}
                className={`smp-project-card ${expandedId === rec.sync_id ? 'ring-2 ring-blue-500/20' : ''} ${highlightSyncId === rec.sync_id ? 'pulse-highlight' : ''}`}
                style={{ borderLeftColor: getProjectAccent(rec.project_name) }}
              >
                <div 
                  className="smp-project-header hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === rec.sync_id ? null : rec.sync_id)}
                >
                  <div className="smp-project-header-left">
                    <div className="smp-project-icon" style={{ background: `${getProjectAccent(rec.project_name)}15`, color: getProjectAccent(rec.project_name) }}>
                      <FolderOpen size={18} />
                    </div>
                    <div>
                      <div className="smp-project-name">{rec.meeting_name}</div>
                      <div className="smp-project-meta">
                        <span className="smp-project-pill smp-project-pill--neutral">{rec.project_name}</span>
                        <span className="smp-project-pill smp-project-pill--neutral"><Clock size={10} /> {relativeTime(rec.synced_at)}</span>
                        <span className="smp-project-pill smp-project-pill--neutral"><Layers size={10} /> {rec.row_count} items</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteSync(rec.sync_id); }}
                      className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className={`transition-transform duration-300 ${expandedId === rec.sync_id ? 'rotate-90 text-blue-500' : 'text-slate-300'}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === rec.sync_id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-100"
                    >
                      <ActionItemsTable syncId={rec.sync_id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .pulse-highlight {
          animation: highlightPulse 2s infinite;
        }
        @keyframes highlightPulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  );
};

export default SavedMOMsPage;
