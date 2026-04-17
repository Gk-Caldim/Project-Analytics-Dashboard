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
  Loader2 
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
        <div className="flex items-center gap-5">
          <div className="p-3 bg-brand-primary text-white rounded-lg shadow-lg shadow-brand-primary/20 border border-brand-primary/10">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-h2 font-semibold text-text-primary tracking-tight">Permission Audit History</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 h-10 px-6 bg-text-primary text-white rounded-md font-semibold text-caption tracking-widest hover:brightness-110 transition-all shadow-md active:scale-95 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 text-brand-accent" /> Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-app-bg p-3 rounded-lg border border-border shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 relative min-w-[300px]">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
           <input 
            type="text" 
            placeholder="Search by role, administrator, or module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-12 pr-4 bg-app-surface border border-border rounded-sm text-body font-medium focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all text-text-primary"
           />
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-4 px-4 h-11 bg-app-surface rounded-sm border border-border">
           <Filter className="h-4 w-4 text-text-muted" />
           <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-caption font-semibold text-text-secondary tracking-wider border-none focus:ring-0 cursor-pointer uppercase appearance-none"
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
        <div className="flex items-center gap-3 px-4 h-11 bg-app-bg rounded-sm border border-dashed border-border group hover:border-brand-primary/50 transition-all cursor-pointer relative">
          <CalIcon className="h-4 w-4 text-text-muted group-hover:text-brand-primary transition-colors" />
          <input 
            type="date" 
            className="text-caption font-semibold text-text-secondary uppercase tracking-tight border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
          <ArrowRight className="h-3 w-3 text-text-muted" />
          <input 
            type="date" 
            className="text-caption font-semibold text-text-secondary uppercase tracking-tight border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Premium Audit Table */}
      <div className="bg-app-bg rounded-lg border border-border shadow-sm overflow-hidden relative group">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-app-surface border-b border-border">
              <th className="px-8 py-4 text-label font-semibold text-text-muted uppercase tracking-wider w-48">Date & Time</th>
              <th className="px-8 py-4 text-label font-semibold text-text-muted uppercase tracking-wider">Administrator</th>
              <th className="px-8 py-4 text-label font-semibold text-text-muted uppercase tracking-wider">Action</th>
              <th className="px-8 py-4 text-label font-semibold text-text-muted uppercase tracking-wider">Target Role</th>
              <th className="px-8 py-4 text-label font-semibold text-text-muted uppercase tracking-wider">Changes Summary</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 border-border hover:bg-app-surface transition-colors group/row">
                <td className="px-8 py-5">
                  <div className="text-body-sm font-semibold text-text-primary tracking-tight">{dayjs(log.dateTime).format('DD MMM YYYY')}</div>
                  <div className="text-caption text-text-muted font-medium uppercase tracking-wider mt-0.5">{dayjs(log.dateTime).format('hh:mm a')}</div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-md bg-app-bg shadow-sm border border-border flex items-center justify-center text-xs font-bold text-brand-primary group-hover/row:bg-brand-primary group-hover/row:text-white transition-all">
                      {log.adminName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-body-sm font-semibold text-text-primary tracking-tight block">{log.adminName}</span>
                      <span className="px-1.5 py-0.5 bg-app-surface text-text-secondary rounded text-[10px] font-medium tracking-wider mt-0.5 inline-block">{log.adminRole}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase border shadow-sm ${
                    log.action.includes('UPDATE') ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' :
                    log.action.includes('CREATE') ? 'bg-status-success/10 text-status-success border-status-success/20' :
                    log.action.includes('DELETE') ? 'bg-status-error/10 text-status-error border-status-error/20' :
                    'bg-app-surface text-text-secondary border-border'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.targetRole.includes('Admin') ? 'bg-brand-primary shadow-[0_0_8px_rgba(0,147,159,0.4)]' : 
                      log.targetRole.includes('Manager') ? 'bg-brand-accent shadow-[0_0_8px_rgba(38,192,203,0.4)]' : 
                      'bg-text-muted shadow-[0_0_8px_rgba(148,163,184,0.4)]'
                    }`} />
                    <span className="text-body-sm font-semibold text-text-secondary tracking-tight">{log.targetRole}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3 group/info relative">
                    <ArrowRight className="h-4 w-4 text-text-muted group-hover/row:text-brand-primary transition-colors" />
                    <div>
                      <span className="text-body-sm text-text-primary font-medium tracking-tight block">{log.changesSummary}</span>
                      {log.originalDetails && (
                        <span className="text-caption text-text-muted transition-opacity italic mt-0.5 block">{log.originalDetails}</span>
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
                  className={`w-9 h-9 flex items-center justify-center rounded-md font-semibold text-caption transition-all ${
                    currentPage === idx + 1 
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
