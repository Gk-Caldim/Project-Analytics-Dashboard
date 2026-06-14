import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronUp, ChevronDown, Search, Filter, 
    MoreHorizontal, ExternalLink, ArrowUpDown 
} from 'lucide-react';

/**
 * Enterprise Project Table — sortable, filterable data grid for portfolio view
 */
const ProjectTable = ({ projects = [], onProjectClick }) => {
    const navigate = useNavigate();
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const filtered = useMemo(() => {
        let result = [...(projects || [])];
        
        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => 
                (p.name || '').toLowerCase().includes(q) ||
                (p.project_name || '').toLowerCase().includes(q) ||
                (p.manager || '').toLowerCase().includes(q) ||
                (p.project_manager || '').toLowerCase().includes(q) ||
                (p.status || '').toLowerCase().includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            const aVal = String(a[sortField] || a.project_name || '').toLowerCase();
            const bVal = String(b[sortField] || b.project_name || '').toLowerCase();
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        return result;
    }, [projects, searchQuery, sortField, sortDir]);

    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        if (['active', 'on-track', 'on track', 'in progress'].includes(s)) return 'status-badge status-badge-success';
        if (['at-risk', 'at risk', 'delayed'].includes(s)) return 'status-badge status-badge-warning';
        if (['critical', 'overdue', 'blocked'].includes(s)) return 'status-badge status-badge-danger';
        if (['completed', 'closed'].includes(s)) return 'status-badge status-badge-info';
        return 'status-badge status-badge-neutral';
    };

    const getHealthDot = (status) => {
        const s = (status || '').toLowerCase();
        if (['active', 'on-track', 'on track', 'good', 'healthy', 'green'].includes(s)) return 'health-dot health-dot-green';
        if (['at-risk', 'at risk', 'warning', 'amber', 'yellow'].includes(s)) return 'health-dot health-dot-amber';
        if (['critical', 'red', 'overdue'].includes(s)) return 'health-dot health-dot-red';
        return 'health-dot health-dot-gray';
    };

    const SortHeader = ({ field, children }) => (
        <th 
            className="cursor-pointer select-none group"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {sortField === field ? (
                        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                        <ArrowUpDown size={11} className="opacity-40" />
                    )}
                </span>
            </div>
        </th>
    );

    return (
        <div className="enterprise-card">
            {/* Header */}
            <div className="enterprise-card-header">
                <h3 className="enterprise-card-title">Project Portfolio</h3>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Filter projects..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-[12px] rounded-md border outline-none transition-colors"
                            style={{
                                background: 'var(--surface-raised)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-primary)',
                                width: '180px',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--enterprise-blue)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                        />
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 rounded" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
                        {filtered.length} projects
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="data-grid w-full">
                    <thead>
                        <tr>
                            <SortHeader field="name">Project</SortHeader>
                            <SortHeader field="status">Status</SortHeader>
                            <SortHeader field="manager">Manager</SortHeader>
                            <th>Health</th>
                            <SortHeader field="progress">Progress</SortHeader>
                            <th style={{ width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? (
                            filtered.map((project, idx) => {
                                const name = project.project_name || project.name || 'Unnamed';
                                const status = project.status || 'Active';
                                const manager = project.project_manager || project.manager || '—';
                                const health = project.health || project.status || '';
                                const progress = project.progress || project.completion_percentage || 0;

                                return (
                                    <tr 
                                        key={project.id || project._id || idx}
                                        className="cursor-pointer"
                                        onClick={() => onProjectClick?.(project)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div 
                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                                    style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                                                >
                                                    {name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>
                                                    {name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={getStatusBadge(status)}>
                                                {status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                                {manager}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={getHealthDot(health)} />
                                                <span className="text-[12px] capitalize" style={{ color: 'var(--text-muted)' }}>
                                                    {health || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="progress-bar" style={{ width: '60px' }}>
                                                    <div 
                                                        className="progress-bar-fill" 
                                                        style={{ 
                                                            width: `${Math.min(100, Number(progress) || 0)}%`,
                                                            background: Number(progress) >= 80 ? 'var(--green)' : Number(progress) >= 40 ? 'var(--enterprise-blue)' : 'var(--amber)',
                                                        }} 
                                                    />
                                                </div>
                                                <span className="text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                                    {Math.round(Number(progress) || 0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <button 
                                                className="p-1 rounded hover:bg-[var(--surface-raised)] transition-colors"
                                                onClick={(e) => { e.stopPropagation(); }}
                                                style={{ color: 'var(--text-muted)' }}
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-12">
                                    <div className="empty-state" style={{ padding: '24px' }}>
                                        <div className="empty-state-icon">
                                            <Search size={20} />
                                        </div>
                                        <p className="empty-state-title">No projects found</p>
                                        <p className="empty-state-description">
                                            {searchQuery ? 'Try adjusting your search filter' : 'No projects available yet'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectTable;
