import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, Clock, ChevronRight, Filter, Search, 
  User, Calendar, TrendingDown, TrendingUp, Minus,
  CheckCircle2, AlertTriangle, ListFilter
} from 'lucide-react';
import { listIssues, STATUS_COLORS } from '../../api/issues';
import IssueDetailModal from './IssueDetailModal';

const CriticalIssuesWidget = ({ projectId }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('All'); // Default to All instead of Open to show more data
  const [priorityFilter, setPriorityFilter] = useState('High'); // Keep High as default for 'Critical' widget
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      // Fetch issues based on filters
      // Backend handles sorting (Overdue first)
      const data = await listIssues({ 
        project_id: projectId,
        status: statusFilter === 'All' ? undefined : statusFilter,
        priority: priorityFilter === 'All' ? undefined : priorityFilter
      });
      setIssues(data);
      setError(null);
    } catch (err) {
      console.error('[CriticalIssuesWidget] Fetch error:', err);
      setError('Failed to load critical issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchIssues();
  }, [projectId, statusFilter, priorityFilter]);

  const filteredIssues = useMemo(() => {
    let result = issues;
    if (searchQuery) {
      result = result.filter(iss => 
        iss.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        iss.owner?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result; // Removed .slice(0, 5) to show ALL issues returned by API
  }, [issues, searchQuery]);

  const getStatusIcon = (health) => {
    switch (health) {
      case 'Overdue': return <AlertCircle size={14} color="#ef4444" />;
      case 'At Risk': return <AlertTriangle size={14} color="#f59e0b" />;
      case 'On Track': return <CheckCircle2 size={14} color="#10b981" />;
      default: return <Clock size={14} color="#64748b" />;
    }
  };

  const StatusIcon = ({ health }) => {
    const colors = STATUS_COLORS[health] || STATUS_COLORS['On Track'];
    return (
      <div style={{
        width: 24, height: 24, borderRadius: '6px',
        backgroundColor: colors.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${colors.border}`,
      }}>
        {getStatusIcon(health)}
      </div>
    );
  };

  if (loading && issues.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Critical Issues</div>
        </div>
        <div style={styles.loadingState}>
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
          <div style={styles.skeletonRow} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ── Header & Toolbar ── */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} color="#ef4444" />
          <div style={styles.title}>Critical Issues</div>
          <span style={styles.countBadge}>{issues.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              ...styles.iconBtn, 
              backgroundColor: showFilters ? '#eff6ff' : 'transparent',
              border: showFilters ? '1px solid #bfdbfe' : '1px solid transparent'
            }}
          >
            <ListFilter size={16} color={showFilters ? '#2563eb' : '#64748b'} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <Search size={14} color="#94a3b8" />
            <input 
              placeholder="Search title or owner..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={styles.select}
            >
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
            <select 
              value={priorityFilter} 
              onChange={e => setPriorityFilter(e.target.value)}
              style={styles.select}
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Issues List ── */}
      <div style={styles.list}>
        {filteredIssues.length === 0 ? (
          <div style={styles.emptyState}>
            <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={styles.emptyText}>
              {searchQuery || statusFilter !== 'All' || priorityFilter !== 'High' 
                ? "No issues match these filters." 
                : "No critical issues"}
            </div>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <div 
              key={issue.id} 
              style={styles.row}
              onClick={() => setSelectedIssue(issue)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <StatusIcon health={issue.health_status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.issueTitle}>{issue.title}</div>
                  <div style={styles.issueMeta}>
                    <span style={styles.metaItem}><User size={10} /> {issue.owner}</span>
                    <span style={styles.separator} />
                    <span style={{ 
                      ...styles.metaItem, 
                      color: issue.health_status === 'Overdue' ? '#ef4444' : '#64748b',
                      fontWeight: issue.health_status === 'Overdue' ? 700 : 500
                    }}>
                      <Calendar size={10} /> 
                      {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No Due Date'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="#cbd5e1" style={{ marginLeft: 8 }} />
            </div>
          ))
        )}
      </div>

      {/* ── Details Panel ── */}
      {selectedIssue && (
        <IssueDetailModal 
          issue={selectedIssue} 
          onClose={() => setSelectedIssue(null)}
          onUpdated={fetchIssues}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#1e3a5f',
    letterSpacing: '-0.01em',
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '999px',
  },
  iconBtn: {
    border: 'none',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  filterBar: {
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    color: '#1e293b',
    width: '100%',
    fontWeight: 500,
  },
  select: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#fff',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  row: {
    padding: '16px 20px',
    borderBottom: '1px solid #f8fafc',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    '&:hover': {
      backgroundColor: '#f8fafc',
    }
  },
  issueTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  issueMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    fontSize: '11px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: 600,
  },
  separator: {
    width: 3,
    height: 3,
    borderRadius: '50%',
    backgroundColor: '#cbd5e1',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#64748b',
    maxWidth: '220px',
    lineHeight: 1.6,
  },
  loadingState: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  skeletonRow: {
    height: '56px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    opacity: 0.6,
  }
};

export default CriticalIssuesWidget;
