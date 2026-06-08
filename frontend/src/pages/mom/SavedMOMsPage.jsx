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
  Check, Edit3, Target, Plus, MessageSquare, AlertTriangle, MoreVertical
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../components/ui/collapsible';
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
  const style = STATUS_COLORS[value] || STATUS_COLORS['Pending'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer outline-none hover:opacity-85 focus:ring-1 focus:ring-slate-400 select-none"
          style={{ background: style.bg, color: style.color, borderColor: style.border }}
        >
          {value}
          <ChevronDown size={10} className="opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px] bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50">
        {STATUS_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onSave(opt)}
            className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 rounded transition-colors cursor-pointer outline-none text-slate-700 focus:bg-slate-50 focus:text-slate-900"
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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

// ─── Inline Editable: Function Tag ─────────────────────────────────────────

const FUNCTION_OPTIONS = [
  'General', 'Engineering', 'Design', 'Product', 'QA', 'DevOps',
  'Marketing', 'Sales', 'Finance', 'HR', 'Operations', 'Management',
];

const FunctionCell = ({ value, onSave }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-slate-300 select-none"
        >
          {value || 'General'}
          <ChevronDown size={10} className="opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px] max-h-[220px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50">
        {FUNCTION_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onSave(opt)}
            className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 rounded transition-colors cursor-pointer outline-none focus:bg-slate-50 focus:text-slate-900 ${
              value === opt ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
            }`}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Inline Editable: Criticality Pill ──────────────────────────────────────

const CRITICALITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const CriticalityCell = ({ value, onSave }) => {
  const style = CRITICALITY_COLORS[value] || CRITICALITY_COLORS['Medium'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:opacity-85 outline-none focus:ring-1 focus:ring-slate-400 select-none"
          style={{ background: style.bg, color: style.color, borderColor: style.border }}
        >
          {value}
          <ChevronDown size={9} className="opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[110px] bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50">
        {CRITICALITY_OPTIONS.map(opt => {
          const s = CRITICALITY_COLORS[opt] || CRITICALITY_COLORS['Medium'];
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => onSave(opt)}
              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase rounded transition-colors hover:bg-slate-50 cursor-pointer outline-none focus:bg-slate-50 focus:text-slate-900"
              style={{ color: s.color }}
            >
              {opt}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Mirror Table (The Action Items View) ────────────────────────────────────

const ActionItemsTable = ({ syncId, onItemDeleted }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // ── Per-row edit state ──
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowData, setEditingRowData] = useState({});

  // ── Delete confirm state ──
  const [deletingRowId, setDeletingRowId] = useState(null);

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

  // ── Update a single field via PATCH ──
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

  // ── Batch save all edited fields at once ──
  const handleSaveRow = async (itemId) => {
    try {
      // Flush each changed field one by one
      const fields = Object.keys(editingRowData);
      for (const field of fields) {
        await API.patch(`/mom/action-items/${itemId}`, {
          field,
          value: editingRowData[field],
          sync_id: syncId,
        });
      }
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, ...editingRowData } : item
      ));
      toast.success('Row saved', { icon: '✅', duration: 1500 });
    } catch {
      toast.error('Save failed');
    } finally {
      setEditingRowId(null);
      setEditingRowData({});
    }
  };

  // ── Start editing a row — snapshot its current values ──
  const startEditRow = (item) => {
    setEditingRowId(item.id);
    setEditingRowData({
      function:         item.function || 'General',
      criticality:      item.criticality || 'Medium',
      discussion_point: item.discussion_point || '',
      responsibility:   item.responsibility || '',
      target:           item.target || '',
      status:           item.status || 'Open',
      action_taken:     item.action_taken || '',
    });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditingRowData({});
  };

  const setEditField = (field, value) => {
    setEditingRowData(prev => ({ ...prev, [field]: value }));
  };

  // ── Hard delete a single action item ──
  const handleDeleteItem = async (itemId) => {
    try {
      await API.delete(`/mom/action-items/${itemId}`);
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (onItemDeleted) onItemDeleted();
      toast.success('Item deleted', { icon: '🗑️', duration: 1500 });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      toast.error(`Delete failed: ${detail}`);
    } finally {
      setDeletingRowId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    return items.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  }, [items, activePage, itemsPerPage]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <span className="text-slate-400 text-xs font-medium">Fetching sync snapshot...</span>
      </div>
    );
  }

  // ── Static styled pills for read-only display ──
  const CriticalityBadge = ({ value }) => {
    const style = CRITICALITY_COLORS[value] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' };
    return (
      <span style={{
        background: style.bg, color: style.color, border: `1.5px solid ${style.border}`,
        padding: '2px 8px', borderRadius: '999px', fontSize: '10px',
        fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex',
        alignItems: 'center', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>{value || 'Medium'}</span>
    );
  };

  const StatusBadge = ({ value }) => {
    const style = STATUS_COLORS[value] || STATUS_COLORS['Pending'];
    return (
      <span style={{
        background: style.bg, color: style.color, border: `1.5px solid ${style.border}`,
        padding: '2px 8px', borderRadius: '999px', fontSize: '10px',
        fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex',
        alignItems: 'center', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>{value || 'Open'}</span>
    );
  };

  const FunctionBadge = ({ value }) => (
    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
      {value || 'General'}
    </span>
  );

  return (
    <div className="flex flex-col gap-3 p-1">
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
              <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((item, idx) => {
              const isEditing = editingRowId === item.id;
              return (
                <tr
                  key={item.id}
                  className={`transition-colors group ${
                    isEditing
                      ? 'bg-blue-50/30 ring-2 ring-inset ring-blue-300/40'
                      : 'hover:bg-slate-50/30'
                  }`}
                >
                  {/* S.No */}
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 text-center">
                    {(activePage - 1) * itemsPerPage + idx + 1}
                  </td>

                  {/* Function */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <FunctionCell
                        value={editingRowData.function}
                        onSave={val => setEditField('function', val)}
                      />
                    ) : (
                      <FunctionBadge value={item.function} />
                    )}
                  </td>

                  {/* Criticality */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <CriticalityCell
                        value={editingRowData.criticality}
                        onSave={val => setEditField('criticality', val)}
                      />
                    ) : (
                      <CriticalityBadge value={item.criticality} />
                    )}
                  </td>

                  {/* Action Point */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <textarea
                        value={editingRowData.discussion_point}
                        onChange={e => setEditField('discussion_point', e.target.value)}
                        className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none min-h-[60px]"
                      />
                    ) : (
                      <span className="text-sm text-slate-700 line-clamp-2">{item.discussion_point || '—'}</span>
                    )}
                  </td>

                  {/* Responsibility */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingRowData.responsibility}
                        onChange={e => setEditField('responsibility', e.target.value)}
                        className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-700">{item.responsibility || '—'}</span>
                    )}
                  </td>

                  {/* Target Date */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <DateCell
                        value={editingRowData.target}
                        onSave={val => setEditField('target', val)}
                      />
                    ) : (
                      <DateCell value={item.target} onSave={val => handleUpdateItem(item.id, 'target', val)} />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <StatusCell
                        value={editingRowData.status}
                        onSave={val => setEditField('status', val)}
                      />
                    ) : (
                      <StatusBadge value={item.status} />
                    )}
                  </td>

                  {/* Action Taken */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <textarea
                        value={editingRowData.action_taken}
                        onChange={e => setEditField('action_taken', e.target.value)}
                        className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none min-h-[48px]"
                        rows={2}
                      />
                    ) : (
                      <span className="text-sm text-slate-600 line-clamp-2">{item.action_taken || <span className="text-slate-300 italic">No update</span>}</span>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-center" style={{ minWidth: '90px' }}>
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSaveRow(item.id)}
                          className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                          title="Save changes"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={cancelEditRow}
                          className="p-1.5 bg-slate-100 text-slate-500 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : deletingRowId === item.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-600 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeletingRowId(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded hover:bg-slate-200 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEditRow(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingRowId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="py-3 px-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 rounded-b-lg print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium">
              Showing {(activePage - 1) * itemsPerPage + 1}–{Math.min(activePage * itemsPerPage, items.length)} of {items.length} items
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
                <ComboboxContent position="top" className="w-16 min-w-0">
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
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SavedMOMsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightSyncId = searchParams.get('highlight');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set(highlightSyncId ? [highlightSyncId] : []));
  const [multiExpand, setMultiExpand] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const toggleRecord = useCallback((syncId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(syncId)) {
        next.delete(syncId);
      } else {
        if (!multiExpand) {
          next.clear();
        }
        next.add(syncId);
      }
      return next;
    });
  }, [multiExpand]);

  useEffect(() => {
    if (!multiExpand && expandedIds.size > 1) {
      const first = Array.from(expandedIds)[0];
      setExpandedIds(new Set(first ? [first] : []));
    }
  }, [multiExpand, expandedIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProject]);

  // Premium Custom Alert Dialog state matching Zoho design principles
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    syncId: null,
    historyId: null,
    meetingId: null,
    meetingName: '',
    rowCount: 0
  });

  const fetchRecords = useCallback(async () => {
    try {
      const res = await API.get('/mom/history/all');
      const recs = res.data.records || [];
      setRecords(recs);
      return recs;
    } catch {
      toast.error('Failed to load history');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchRecords().then((recs) => {
      if (highlightSyncId && recs && recs.length > 0) {
        const idx = recs.findIndex(r => r.sync_id === highlightSyncId);
        if (idx !== -1) {
          const targetPage = Math.floor(idx / itemsPerPage) + 1;
          setCurrentPage(targetPage);
        }
        
        // Delay slightly to allow records and the specific page to render
        setTimeout(() => {
          const el = document.getElementById(`sync-${highlightSyncId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setExpandedIds(new Set([highlightSyncId]));
          }
        }, 500);
      }
    }); 

    // Listen for WebSocket broadcasts to auto-refresh the library
    const handleRemoteUpdate = () => {
      fetchRecords();
    };
    
    window.addEventListener('ISSUE_SYNCED', handleRemoteUpdate);
    window.addEventListener('MOM_SAVED', handleRemoteUpdate);

    return () => {
      window.removeEventListener('ISSUE_SYNCED', handleRemoteUpdate);
      window.removeEventListener('MOM_SAVED', handleRemoteUpdate);
    };
  }, [fetchRecords, highlightSyncId]);

  const triggerDeleteSync = (rec) => {
    setDeleteConfirm({
      isOpen: true,
      syncId: rec.sync_id,
      historyId: rec.history_id,
      meetingId: rec.meeting_id,
      meetingName: rec.meeting_name || 'Untitled Meeting',
      rowCount: rec.row_count || 0
    });
  };

  const handleConfirmDelete = async () => {
    const { syncId, historyId, meetingId } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    
    const localFilterId = syncId && syncId !== 'null' ? syncId : null;

    try {
      const params = new URLSearchParams();
      if (historyId) params.append('history_id', historyId);
      if (meetingId) params.append('meeting_id', meetingId);
      
      // Pass all resolved identifiers to guarantee thorough hard deletion
      await API.delete(`/mom/syncs/${syncId || 'null'}?${params.toString()}`);
      
      setRecords(prev => prev.filter(r => {
        if (localFilterId && r.sync_id === localFilterId) return false;
        if (historyId && r.history_id === historyId) return false;
        if (meetingId && r.meeting_id === meetingId) return false;
        return true;
      }));
      toast.success('MOM completely and permanently deleted', { icon: '🗑️' });
    } catch (err) {
      console.error('[DELETE SYNC ERROR]', err);
      toast.error('Failed to hard delete MOM');
    }
  };

  const handleItemDeleted = useCallback((syncId) => {
    setRecords(prev => prev.map(r => r.sync_id === syncId ? { ...r, row_count: Math.max(0, (r.row_count || 0) - 1) } : r));
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    return filtered.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  }, [filtered, activePage, itemsPerPage]);

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
        <Combobox
          items={[
            { value: 'all', label: 'All Projects' },
            ...allProjects.filter(p => p !== 'all').map(p => ({ value: p, label: p }))
          ]}
          value={selectedProject}
          onChange={val => setSelectedProject(val)}
          className="w-48"
        >
          <ComboboxInput
            hideSearch
            hideClear
            placeholder="Select project..."
            className="smp-pill flex items-center justify-between border-slate-200 hover:border-slate-300 rounded-[20px] shadow-sm text-xs font-semibold text-slate-600 h-[36px] py-1 bg-white cursor-pointer"
          />
          <ComboboxContent className="w-48 min-w-0">
            <ComboboxList className="max-h-48">
              {(item) => (
                <ComboboxItem key={item.value} value={item.value} className="text-xs py-1.5 px-3">
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <button
          onClick={() => setMultiExpand(!multiExpand)}
          className={`smp-pill flex items-center gap-2 outline-none cursor-pointer select-none transition-all duration-150 ${multiExpand ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
          style={{ border: '1px solid' }}
        >
          <span className={`w-2 h-2 rounded-full ${multiExpand ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="font-semibold text-xs uppercase tracking-wider">Multi-Expand</span>
        </button>
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
          <div className="flex flex-col gap-6 w-full">
            <div className="smp-list">
              {paginatedRecords.map(rec => {
                const isRecordExpanded = expandedIds.has(rec.sync_id);
                return (
                  <Collapsible
                    key={rec.sync_id}
                    open={isRecordExpanded}
                    onOpenChange={() => toggleRecord(rec.sync_id)}
                    id={`sync-${rec.sync_id}`}
                    className={`smp-project-card ${isRecordExpanded ? 'ring-2 ring-blue-500/20' : ''} ${highlightSyncId === rec.sync_id ? 'ring-2 ring-blue-400' : ''}`}
                    style={{ borderLeftColor: getProjectAccent(rec.project_name) }}
                  >
                    <div className="smp-project-header hover:bg-slate-50 transition-colors">
                      <CollapsibleTrigger asChild>
                        <div className="smp-project-header-left cursor-pointer flex-1 py-1">
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
                      </CollapsibleTrigger>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); triggerDeleteSync(rec); }}
                          className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                          title="Hard Delete MOM"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        <CollapsibleTrigger asChild>
                          <button className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer">
                            <ChevronRight size={18} className={`transition-transform duration-300 ${isRecordExpanded ? 'rotate-90 text-blue-500' : 'text-slate-300'}`} />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="overflow-hidden border-t border-slate-100">
                      <AnimatePresence initial={false}>
                        {isRecordExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                          >
                            <ActionItemsTable syncId={rec.sync_id} onItemDeleted={() => handleItemDeleted(rec.sync_id)} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            {filtered.length > 0 && (
              <div className="py-3 px-6 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-between print:hidden">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Showing {(activePage - 1) * itemsPerPage + 1}–{Math.min(activePage * itemsPerPage, filtered.length)} of {filtered.length} items
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
                      <ComboboxContent position="top" className="w-16 min-w-0">
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
        )}
      </div>

      {/* Premium Zoho Alert Dialog Confirmation Overlay */}
      <AnimatePresence>
        {deleteConfirm.isOpen && (
          <div className="smp-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="smp-modal-backdrop"
              onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'transparent'
              }}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="smp-dialog"
              style={{ position: 'relative', zIndex: 9001 }}
            >
              <div className="smp-dialog-icon">
                <AlertTriangle size={24} style={{ color: '#dc2626' }} className="animate-pulse" />
              </div>
              <h3 className="smp-dialog-title">Hard Delete MOM?</h3>
              <p className="smp-dialog-desc">
                You are about to completely delete the Minutes of Meeting (MOM) for:
                <strong style={{ display: 'block', marginTop: '6px', color: '#1e293b' }}>
                  "{deleteConfirm.meetingName}"
                </strong>
              </p>
              
              <div className="smp-dialog-warning-box">
                <strong style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                  ⚠️ CRITICAL SYSTEM CASCADE
                </strong>
                This action is irreversible and will perform a hard delete:
                <ul className="smp-dialog-bullet-list">
                  <li>Erase the sync history tracking snapshot</li>
                  <li>Permanently erase the MOM session action items JSON</li>
                  <li>Hard delete all <strong>{deleteConfirm.rowCount} action items</strong> inside the Issue Engine</li>
                  <li>Reset the "MOM Generated" flags and counts on the Meeting calendar</li>
                </ul>
              </div>

              <div className="smp-dialog-footer">
                <button
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="smp-dialog-btn smp-dialog-btn--cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="smp-dialog-btn smp-dialog-btn--danger"
                >
                  Confirm Hard Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default SavedMOMsPage;
