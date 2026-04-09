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
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold tracking-tight animate-pulse">Synchronizing audit records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Permission Audit History</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 text-indigo-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-3 rounded-[32px] border border-slate-200/60 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 relative min-w-[300px]">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <input 
            type="text" 
            placeholder="Search by role, administrator, or module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-14 pr-6 bg-slate-50 border border-slate-200/80 rounded-[24px] text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 transition-all text-slate-600"
           />
        </div>
        <div className="h-10 w-px bg-slate-100 hidden sm:block" />
        <div className="flex items-center gap-4 px-4 h-12 bg-slate-50 rounded-2xl border border-slate-200/40">
           <Filter className="h-4 w-4 text-slate-400" />
           <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-[11px] font-black text-slate-600 tracking-widest border-none focus:ring-0 cursor-pointer uppercase appearance-none"
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
        <div className="flex items-center gap-3 px-4 h-12 bg-white rounded-2xl border border-dashed border-slate-200 group hover:border-indigo-300 transition-all cursor-pointer relative">
          <CalIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <input 
            type="date" 
            className="text-[11px] font-black text-slate-500 uppercase tracking-tighter border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
          <ArrowRight className="h-3 w-3 text-slate-300" />
          <input 
            type="date" 
            className="text-[11px] font-black text-slate-500 uppercase tracking-tighter border-none focus:ring-0 p-0 w-24 bg-transparent outline-none"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Premium Audit Table */}
      <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden relative group">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Date & Time</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Administrator</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Role</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Changes Summary</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 border-slate-50 hover:bg-slate-50/80 transition-colors group/row">
                <td className="px-8 py-7">
                  <div className="text-[13px] font-black text-slate-800 tracking-tight">{dayjs(log.dateTime).format('DD MMM YYYY')}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{dayjs(log.dateTime).format('hh:mm a')}</div>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs font-black text-indigo-600 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-all">
                      {log.adminName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-[13px] font-black text-slate-800 tracking-tight block">{log.adminName}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest mt-1 inline-block">{log.adminRole}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-7">
                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border shadow-sm ${
                    log.action.includes('UPDATE') ? 'bg-indigo-50/50 text-indigo-700 border-indigo-100/50' :
                    log.action.includes('CREATE') ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50' :
                    log.action.includes('DELETE') ? 'bg-rose-50/50 text-rose-700 border-rose-100/50' :
                    'bg-slate-50/50 text-slate-700 border-slate-100/50'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.targetRole.includes('Admin') ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 
                      log.targetRole.includes('Manager') ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                      'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]'
                    }`} />
                    <span className="text-[13px] font-black text-slate-700 tracking-tight">{log.targetRole}</span>
                  </div>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-3 group/info relative">
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover/row:text-indigo-400 transition-colors" />
                    <div>
                      <span className="text-[13px] text-slate-600 font-bold tracking-tight block">{log.changesSummary}</span>
                      {log.originalDetails && (
                        <span className="text-[10px] text-slate-400 transition-opacity italic mt-0.5 block">{log.originalDetails}</span>
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
           <div className="flex gap-2 bg-white p-2 rounded-[24px] border border-slate-200/60 shadow-sm">
              {[...Array(totalPages)].map((_, idx) => (
                <button 
                  key={idx + 1}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-10 h-10 flex items-center justify-center rounded-2xl font-black text-sm transition-all ${
                    currentPage === idx + 1 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                      : 'bg-transparent text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              {totalPages > 5 && currentPage < totalPages && (
                <>
                  <div className="w-10 h-10 flex items-center justify-center text-slate-300 tracking-tighter">•••</div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-transparent border border-slate-200 text-slate-400 font-black text-sm hover:bg-slate-50 transition-all"
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
