import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  ArrowRight,
  Download,
  Search,
  Filter,
  Calendar as CalIcon,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import API from '../../../utils/api';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import * as XLSX from 'xlsx';

dayjs.extend(isBetween);

const AuditHistory = () => {
  // State
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch data
  const fetchLogs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const response = await API.get('/audit-logs/');
      // Map backend data to frontend structure if necessary
      const mappedLogs = response.data.map(log => {
        const details = log.details || {};

        // Intelligent fallback for summary
        let summaryFallback = 'No details available';
        if (details.summary) {
          summaryFallback = details.summary;
        } else if (details.name) {
          summaryFallback = `${log.action.charAt(0) + log.action.slice(1).toLowerCase()}: ${details.name}`;
        } else if (details.member) {
          summaryFallback = `Affected Member: ${details.member}`;
        } else if (details.sub_category) {
          summaryFallback = `Sub-category: ${details.sub_category}`;
        } else if (Object.keys(details).length > 0) {
          // If it's a generic object, pick the first string value or stringify
          const firstValue = Object.values(details).find(v => typeof v === 'string');
          summaryFallback = firstValue || JSON.stringify(details).substring(0, 50);
        }

        return {
          id: log.id,
          dateTime: log.timestamp,
          adminName: log.user_name || 'System',
          adminRole: log.user_role || 'System',
          action: log.action,
          targetRole: details.targetRole || log.module || 'N/A',
          changesSummary: summaryFallback,
          originalDetails: details.details || ''
        };
      });
      setLogs(mappedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Combined Filtering logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search matching
      const matchesSearch =
        log.adminName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.targetRole.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Action filter matching
      const matchesAction =
        actionFilter === 'All Actions' ||
        log.action.toLowerCase().includes(actionFilter.toLowerCase());

      // Date range matching
      const matchesDate =
        (!dateRange.from || dayjs(log.dateTime).isAfter(dayjs(dateRange.from).startOf('day'))) &&
        (!dateRange.to || dayjs(log.dateTime).isBefore(dayjs(dateRange.to).endOf('day')));

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, debouncedSearch, actionFilter, dateRange]);

  // Pagination logic
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Export CSV
  const handleExportCSV = () => {
    const dataToExport = filteredLogs.map(log => ({
      'Date & Time': dayjs(log.dateTime).format('DD MMM YYYY, hh:mm a'),
      'Administrator': log.adminName,
      'Admin Role': log.adminRole,
      'Action': log.action,
      'Target Role': log.targetRole,
      'Summary': log.changesSummary,
      'Details': log.originalDetails
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
    XLSX.writeFile(workbook, `Permission_Audit_History_${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-4">
        <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
        <p className="text-text-secondary text-caption font-bold tracking-widest uppercase animate-pulse">Synchronizing audit records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-lg border border-brand-primary/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-h2 font-bold text-text-primary tracking-tight">Audit Logs</h1>
            <p className="text-body-sm text-text-muted">Monitor system events and user actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 text-text-muted hover:text-brand-primary hover:bg-app-bg rounded-md transition-all"
            title="Refresh logs"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 h-10 px-4 bg-text-primary text-white rounded-md font-semibold text-caption tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> EXPORT
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-app-surface p-2 rounded-lg border border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 relative min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-11 pr-4 bg-app-bg border border-border rounded text-body-sm focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all text-text-primary"
          />
        </div>

        <div className="flex items-center gap-3 px-3 h-10 bg-app-bg rounded border border-border">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-caption font-semibold text-text-secondary border-none focus:ring-0 cursor-pointer min-w-[140px]"
          >
            <option>All Actions</option>
            <option>Update Permission</option>
            <option>Create Role</option>
            <option>Delete Role</option>
            <option>Update Employee</option>
            <option>Create Employee</option>
            <option>Delete Employee</option>
            <option>Update Department</option>
            <option>Create Department</option>
            <option>Delete Department</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 h-10 bg-app-bg rounded border border-border">
          <CalIcon className="h-3.5 w-3.5 text-text-muted" />
          <input
            type="date"
            className="text-caption font-semibold text-text-secondary border-none focus:ring-0 p-0 w-24 bg-transparent"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
          <ArrowRight className="h-3 w-3 text-text-muted" />
          <input
            type="date"
            className="text-caption font-semibold text-text-secondary border-none focus:ring-0 p-0 w-24 bg-transparent"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Premium Audit Table */}
      <div className="bg-app-surface rounded-lg border border-border overflow-hidden relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-app-bg/50 border-b border-border">
              <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest w-48">Timestamp</th>
              <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">User</th>
              <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">Event</th>
              <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">Context</th>
              <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">Summary</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 border-border hover:bg-app-bg/30 transition-colors group/row">
                <td className="px-6 py-4">
                  <div className="text-body-sm font-semibold text-text-primary tracking-tight">{dayjs(log.dateTime).format('DD MMM, YYYY')}</div>
                  <div className="text-caption text-text-muted font-medium uppercase tracking-wider">{dayjs(log.dateTime).format('hh:mm A')}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-primary/10 flex items-center justify-center text-[10px] font-bold text-brand-primary">
                      {log.adminName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-body-sm font-semibold text-text-primary block">{log.adminName}</span>
                      <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{log.adminRole}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${log.action.includes('UPDATE') ? 'bg-brand-primary/5 text-brand-primary border-brand-primary/10' :
                      log.action.includes('CREATE') ? 'bg-status-success/5 text-status-success border-status-success/10' :
                        log.action.includes('DELETE') ? 'bg-status-error/5 text-status-error border-status-error/10' :
                          'bg-app-bg text-text-secondary border-border'
                    }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${log.targetRole.includes('Admin') ? 'bg-brand-primary' :
                        log.targetRole.includes('Manager') ? 'bg-brand-accent' :
                          'bg-text-muted'
                      }`} />
                    <span className="text-body-sm font-medium text-text-secondary">{log.targetRole}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 text-brand-primary/40 mt-1" />
                    <div>
                      <span className="text-body-sm text-text-primary font-medium tracking-tight block">{log.changesSummary}</span>
                      {log.originalDetails && (
                        <span className="text-caption text-text-muted italic block">{log.originalDetails}</span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state overlay for no results */}
        {(filteredLogs.length === 0 && !loading) && (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-6 bg-slate-50 rounded-full border border-slate-100">
              <FileText className="h-12 w-12 text-slate-300" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800 tracking-tight">No Logs Found</p>
              <p className="text-sm text-slate-400 font-medium mt-1">Try adjusting your search or filters.</p>
            </div>
          </div>
        )}
      </div>

      {/* functional Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center pt-10">
          <div className="flex gap-2 bg-app-bg p-2 rounded-lg border border-border shadow-sm">
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => setCurrentPage(idx + 1)}
                className={`w-9 h-9 flex items-center justify-center rounded-md font-semibold text-caption transition-all ${currentPage === idx + 1
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'bg-transparent text-text-muted hover:bg-app-surface'
                  }`}
              >
                {idx + 1}
              </button>
            ))}
            {totalPages > 5 && currentPage < totalPages && (
              <>
                <div className="w-9 h-9 flex items-center justify-center text-text-muted tracking-tighter">•••</div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-md bg-transparent border border-border text-text-muted font-semibold text-caption hover:bg-app-surface transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditHistory;
