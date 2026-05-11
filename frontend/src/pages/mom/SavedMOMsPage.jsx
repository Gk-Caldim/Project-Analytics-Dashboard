/**
 * SavedMOMsPage.jsx
 * Dedicated library for all persisted MOM sessions.
 * Features: list (desc), search, project filter, date filter, sort, view, edit, delete (alert dialog).
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Trash2, Eye, Edit2, RefreshCw,
  ChevronDown, Mic, SlidersHorizontal, X, Calendar,
  FolderOpen, AlertCircle, ArrowRight, Clock, BarChart2,
  Filter, SortAsc, ArrowUpDown, CheckCircle2, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import './SavedMOMsPage.css';

// ─── Date Range Quick Picks ───────────────────────────────────────────────────
const DATE_RANGES = [
  { key: 'all',   label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const SORT_OPTIONS = [
  { key: 'date_desc',  label: 'Latest First' },
  { key: 'date_asc',   label: 'Oldest First' },
  { key: 'name_asc',   label: 'Name A → Z' },
  { key: 'name_desc',  label: 'Name Z → A' },
  { key: 'items_desc', label: 'Most Action Items' },
  { key: 'items_asc',  label: 'Least Action Items' },
];

// Palette: project name → accent color
const PROJECT_COLORS = [
  '#6366f1', '#0d9488', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#10b981', '#f97316',
];
const projectColorMap = {};
let colorIdx = 0;
function getProjectColor(name) {
  if (!name) return '#64748b';
  if (!projectColorMap[name]) {
    projectColorMap[name] = PROJECT_COLORS[colorIdx % PROJECT_COLORS.length];
    colorIdx++;
  }
  return projectColorMap[name];
}

// ─── Delete Alert Dialog ──────────────────────────────────────────────────────
function DeleteAlertDialog({ mom, onConfirm, onCancel, loading }) {
  return (
    <div className="smp-overlay" onClick={onCancel}>
      <div className="smp-alert-dialog" onClick={e => e.stopPropagation()}>
        <div className="smp-alert-icon">
          <AlertCircle size={28} color="#dc2626" />
        </div>
        <h3 className="smp-alert-title">Delete MOM?</h3>
        <p className="smp-alert-desc">
          <strong>"{mom.meeting_name}"</strong> will be permanently deleted.
          This action cannot be undone and will remove all associated action items.
        </p>
        <div className="smp-alert-footer">
          <button className="smp-btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="smp-btn-confirm-delete" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <><RefreshCw size={14} className="spin" /> Deleting…</>
            ) : (
              <><Trash2 size={14} /> Delete MOM</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MOM Card ────────────────────────────────────────────────────────────────
function MOMCard({ mom, onView, onEdit, onDelete, isDeleting }) {
  const [hovered, setHovered] = useState(false);
  const accentColor = getProjectColor(mom.project_name);

  const updatedDate = mom.updated_at
    ? new Date(mom.updated_at)
    : null;
  const dateLabel = updatedDate
    ? updatedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const timeLabel = updatedDate
    ? updatedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  // Relative time
  const relativeTime = useMemo(() => {
    if (!updatedDate) return '';
    const diffMs = Date.now() - updatedDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 2) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateLabel;
  }, [updatedDate, dateLabel]);

  return (
    <div
      className={`smp-card ${hovered ? 'hovered' : ''} ${isDeleting ? 'deleting' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ '--accent': accentColor }}
    >
      {/* Left accent bar */}
      <div className="smp-card-accent" />

      {/* Icon */}
      <div className="smp-card-icon" style={{ background: `${accentColor}18`, color: accentColor }}>
        <FileText size={20} />
      </div>

      {/* Main content */}
      <div className="smp-card-body">
        <div className="smp-card-title">{mom.meeting_name}</div>
        <div className="smp-card-meta">
          {mom.project_name && (
            <span className="smp-meta-chip" style={{ background: `${accentColor}18`, color: accentColor }}>
              <FolderOpen size={10} />
              {mom.project_name}
            </span>
          )}
          <span className="smp-meta-item">
            <BarChart2 size={10} />
            {mom.action_item_count} action item{mom.action_item_count !== 1 ? 's' : ''}
          </span>
          <span className="smp-meta-item">
            <Clock size={10} />
            {relativeTime}
          </span>
          <span className="smp-meta-date">{dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}</span>
        </div>
      </div>

      {/* Actions */}
      <div className={`smp-card-actions ${hovered ? 'visible' : ''}`}>
        <button
          className="smp-action-view"
          onClick={() => onView(mom)}
          title="View MOM"
        >
          <Eye size={13} /> View
        </button>
        <button
          className="smp-action-edit"
          onClick={() => onEdit(mom)}
          title="Edit MOM"
        >
          <Edit2 size={13} /> Edit
        </button>
        <button
          className="smp-action-delete"
          onClick={() => onDelete(mom)}
          title="Delete MOM"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const SavedMOMsPage = () => {
  const navigate = useNavigate();

  const [moms, setMoms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Sort
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sort, setSort] = useState('date_desc');

  // Dropdown open states
  const [projectOpen, setProjectOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Refs for closing dropdowns on outside click
  const projectRef = useRef(null);
  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMoms = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // Existing API contract: /api/mom/all returns { success, moms: [...] }
      const res = await API.get('/mom/all', { params: { sort } });
      
      if (res.data?.success) {
        // Ensure we always have an array, even if backend returns null
        const fetchedMoms = res.data.moms || [];
        setMoms(fetchedMoms);
      } else {
        throw new Error(res.data?.message || 'Failed to fetch data from server');
      }
    } catch (err) {
      console.error('Failed to load MOMs:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to load saved MOMs';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [sort]);

  useEffect(() => { fetchMoms(); }, [fetchMoms]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!projectRef.current?.contains(e.target)) setProjectOpen(false);
      if (!dateRef.current?.contains(e.target)) setDateOpen(false);
      if (!sortRef.current?.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────
  const allProjects = useMemo(() => {
    const names = [...new Set(moms.map(m => m.project_name).filter(Boolean))];
    return names.sort();
  }, [moms]);

  const filtered = useMemo(() => {
    let result = [...moms];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.meeting_name || '').toLowerCase().includes(q) ||
        (m.project_name || '').toLowerCase().includes(q)
      );
    }

    // Project filter
    if (selectedProject !== 'all') {
      result = result.filter(m => m.project_name === selectedProject);
    }

    // Date filter
    if (dateRange !== 'all') {
      const now = new Date();
      result = result.filter(m => {
        if (!m.updated_at) return false;
        const d = new Date(m.updated_at);
        if (dateRange === 'today') {
          return d.toDateString() === now.toDateString();
        }
        if (dateRange === 'week') {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }
        if (dateRange === 'month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return result;
  }, [moms, search, selectedProject, dateRange]);

  // Stats
  const stats = useMemo(() => ({
    total: moms.length,
    totalActions: moms.reduce((acc, m) => acc + (m.action_item_count || 0), 0),
    projects: new Set(moms.map(m => m.project_name).filter(Boolean)).size,
  }), [moms]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleView = (mom) => {
    navigate(`/dashboard/mom/view/${mom.meeting_id}`);
  };

  const handleEdit = (mom) => {
    navigate(`/dashboard/mom/view/${mom.meeting_id}`);
  };

  const handleDeleteClick = (mom) => {
    setDeleteTarget(mom);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await API.delete(`/mom/${deleteTarget.meeting_id}`);
      if (res.data?.success) {
        toast.success('MOM deleted successfully');
        setMoms(prev => prev.filter(m => m.meeting_id !== deleteTarget.meeting_id));
        setDeleteTarget(null);
      }
    } catch (err) {
      toast.error('Failed to delete MOM');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedProject('all');
    setDateRange('all');
    setSort('date_desc');
  };

  const hasActiveFilters = search || selectedProject !== 'all' || dateRange !== 'all' || sort !== 'date_desc';

  // ── Sort label ─────────────────────────────────────────────────────────────
  const sortLabel = SORT_OPTIONS.find(s => s.key === sort)?.label || 'Sort';
  const dateLabel = DATE_RANGES.find(d => d.key === dateRange)?.label || 'Date';
  const projectLabel = selectedProject === 'all' ? 'All Projects' : selectedProject;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="smp-root">
        <div className="smp-loading">
          <RefreshCw size={28} className="spin" style={{ color: '#6366f1' }} />
          <span>Loading saved MOMs…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="smp-root">

      {/* ── Top Bar ── */}
      <div className="smp-topbar">
        <div className="smp-topbar-left">
          <h1 className="smp-heading">Saved MOMs</h1>
          <p className="smp-subheading">Your persistent meeting minutes library</p>
        </div>
        <div className="smp-topbar-right">
          <button
            className="smp-btn-refresh"
            onClick={() => fetchMoms(true)}
            disabled={refreshing}
            title="Refresh list"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          </button>
          <button
            className="smp-btn-capture"
            onClick={() => navigate('/dashboard/mom')}
          >
            <Mic size={13} />
            Capture MOM
          </button>
        </div>
      </div>

      {/* ── Stats Band ── */}
      <div className="smp-stats-band">
        <div className="smp-stat-card">
          <div className="smp-stat-icon indigo"><FileText size={16} /></div>
          <div>
            <div className="smp-stat-value">{stats.total}</div>
            <div className="smp-stat-label">Total MOMs</div>
          </div>
        </div>
        <div className="smp-stat-card">
          <div className="smp-stat-icon teal"><CheckCircle2 size={16} /></div>
          <div>
            <div className="smp-stat-value">{stats.totalActions}</div>
            <div className="smp-stat-label">Action Items</div>
          </div>
        </div>
        <div className="smp-stat-card">
          <div className="smp-stat-icon amber"><FolderOpen size={16} /></div>
          <div>
            <div className="smp-stat-value">{stats.projects}</div>
            <div className="smp-stat-label">Projects Covered</div>
          </div>
        </div>
        <div className="smp-stat-card">
          <div className="smp-stat-icon violet"><BarChart2 size={16} /></div>
          <div>
            <div className="smp-stat-value">{filtered.length}</div>
            <div className="smp-stat-label">Showing</div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="smp-filter-bar">
        {/* Search */}
        <div className="smp-search-wrap">
          <Search size={14} className="smp-search-icon" />
          <input
            id="smp-search"
            type="text"
            className="smp-search-input"
            placeholder="Search meetings or projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="smp-search-clear" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Project Filter */}
        <div className="smp-dropdown-wrap" ref={projectRef}>
          <button
            className={`smp-dropdown-trigger ${selectedProject !== 'all' ? 'active' : ''}`}
            onClick={() => { setProjectOpen(o => !o); setDateOpen(false); setSortOpen(false); }}
          >
            <FolderOpen size={13} />
            <span>{projectLabel}</span>
            <ChevronDown size={12} className={projectOpen ? 'rotated' : ''} />
          </button>
          {projectOpen && (
            <div className="smp-dropdown-menu">
              <button
                className={`smp-dropdown-item ${selectedProject === 'all' ? 'selected' : ''}`}
                onClick={() => { setSelectedProject('all'); setProjectOpen(false); }}
              >
                All Projects
              </button>
              {allProjects.map(p => (
                <button
                  key={p}
                  className={`smp-dropdown-item ${selectedProject === p ? 'selected' : ''}`}
                  onClick={() => { setSelectedProject(p); setProjectOpen(false); }}
                >
                  <span
                    className="smp-project-dot"
                    style={{ background: getProjectColor(p) }}
                  />
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="smp-dropdown-wrap" ref={dateRef}>
          <button
            className={`smp-dropdown-trigger ${dateRange !== 'all' ? 'active' : ''}`}
            onClick={() => { setDateOpen(o => !o); setProjectOpen(false); setSortOpen(false); }}
          >
            <Calendar size={13} />
            <span>{dateLabel}</span>
            <ChevronDown size={12} className={dateOpen ? 'rotated' : ''} />
          </button>
          {dateOpen && (
            <div className="smp-dropdown-menu">
              {DATE_RANGES.map(dr => (
                <button
                  key={dr.key}
                  className={`smp-dropdown-item ${dateRange === dr.key ? 'selected' : ''}`}
                  onClick={() => { setDateRange(dr.key); setDateOpen(false); }}
                >
                  {dr.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="smp-dropdown-wrap" ref={sortRef}>
          <button
            className={`smp-dropdown-trigger ${sort !== 'date_desc' ? 'active' : ''}`}
            onClick={() => { setSortOpen(o => !o); setProjectOpen(false); setDateOpen(false); }}
          >
            <ArrowUpDown size={13} />
            <span>{sortLabel}</span>
            <ChevronDown size={12} className={sortOpen ? 'rotated' : ''} />
          </button>
          {sortOpen && (
            <div className="smp-dropdown-menu">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.key}
                  className={`smp-dropdown-item ${sort === s.key ? 'selected' : ''}`}
                  onClick={() => { setSort(s.key); setSortOpen(false); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button className="smp-clear-filters" onClick={handleClearFilters}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* ── MOM List ── */}
      <div className="smp-list">
        {filtered.length === 0 ? (
          <div className="smp-empty">
            {moms.length === 0 ? (
              <>
                <FileText size={48} className="smp-empty-icon" />
                <h3>No saved MOMs yet</h3>
                <p>Capture your first meeting minutes to get started.</p>
                <button
                  className="smp-empty-cta"
                  onClick={() => navigate('/dashboard/mom')}
                >
                  <Mic size={14} /> Capture MOM
                </button>
              </>
            ) : (
              <>
                <Search size={40} className="smp-empty-icon" />
                <h3>No results found</h3>
                <p>Try adjusting your search or filters.</p>
                <button className="smp-clear-filters-btn" onClick={handleClearFilters}>
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map(mom => (
            <MOMCard
              key={mom.id}
              mom={mom}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isDeleting={deleteTarget?.meeting_id === mom.meeting_id && deleteLoading}
            />
          ))
        )}
      </div>

      {/* ── Delete Alert Dialog ── */}
      {deleteTarget && (
        <DeleteAlertDialog
          mom={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { if (!deleteLoading) setDeleteTarget(null); }}
          loading={deleteLoading}
        />
      )}
    </div>
  );
};

export default SavedMOMsPage;
