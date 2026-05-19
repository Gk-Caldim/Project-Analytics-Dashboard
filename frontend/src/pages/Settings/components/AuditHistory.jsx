import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download, Search, Filter, Loader2, Calendar
} from 'lucide-react';
import API from '../../../utils/api';
import dayjs from 'dayjs';

const AuditHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/audit-logs/');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = activeFilter === 'ALL' || log.module === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, activeFilter]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const getActionColor = (action) => {
    if (!action) return 'text-text-muted bg-app-bg border-border';
    const act = action.toLowerCase();
    if (act.includes('created') || act.includes('added')) return 'text-status-success bg-status-success/10 border-status-success/20';
    if (act.includes('deleted') || act.includes('removed')) return 'text-status-error bg-status-error/10 border-status-error/20';
    if (act.includes('updated') || act.includes('synced')) return 'text-brand-accent bg-brand-accent/10 border-brand-accent/20';
    return 'text-text-muted bg-app-bg border-border';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        <p className="text-text-muted text-xs font-bold tracking-widest uppercase">Fetching immutable ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-text-primary tracking-tight">System Audit Log</h2>
          <p className="text-sm text-text-secondary mt-2">Historical record of all administrative actions, data mutations, and security events.</p>
        </div>
        <button className="h-11 px-6 border border-border text-brand-accent font-bold text-[10px] tracking-widest uppercase hover:bg-app-surface transition-colors flex items-center gap-3 rounded-full">
          <Download className="h-4 w-4" />
          Export Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-app-surface border border-border p-6 rounded-none">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="SEARCH BY ACTIVITY OR USER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-12 pr-4 bg-app-bg border border-border focus:border-brand-accent outline-none text-[10px] font-bold tracking-widest uppercase rounded-md text-text-primary"
          />
        </div>
        
        <div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full h-11 px-4 bg-app-bg border border-border focus:border-brand-accent outline-none text-[10px] font-bold tracking-widest uppercase appearance-none cursor-pointer rounded-md text-text-primary"
          >
            <option value="ALL" className="bg-app-surface">ALL CATEGORIES</option>
            <option value="SECURITY" className="bg-app-surface">SECURITY</option>
            <option value="DATA" className="bg-app-surface">DATA MUTATION</option>
            <option value="SYSTEM" className="bg-app-surface">SYSTEM CONFIG</option>
          </select>
        </div>

        <button 
           onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
           className="h-11 border border-border text-text-muted font-bold text-[10px] tracking-widest uppercase hover:text-brand-accent transition-colors rounded-full"
        >
          Reset Filters
        </button>
      </div>

      <div className="bg-app-surface border border-border rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-app-panel border-b border-border">
                <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Principal</th>
                <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Operation</th>
                <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Module</th>
                <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-app-panel transition-colors">
                  <td className="px-8 py-5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-text-primary">
                        {dayjs(log.timestamp).format('DD MMM, YYYY').toUpperCase()}
                      </p>
                      <p className="text-[10px] text-text-muted font-bold tracking-tighter uppercase">
                        {dayjs(log.timestamp).format('hh:mm:ss A')}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-app-panel border border-border flex items-center justify-center text-text-primary font-bold text-[10px]">
                        {log.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-tight">{log.user_name || 'System'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 text-[9px] font-bold tracking-widest uppercase border ${getActionColor(log.action || '')}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{log.module}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <code className="text-[10px] bg-app-panel px-2 py-1 border border-border text-text-muted font-mono font-bold">
                      {log.entity_id?.substring(0, 8) || 'N/A'}
                    </code>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-8 py-20 text-center">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">No audit entries match the current filters</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
           <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
             Showing {paginatedLogs.length} of {filteredLogs.length} events
           </p>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 border border-border flex items-center justify-center text-text-muted hover:text-brand-accent hover:border-brand-accent transition-colors disabled:opacity-30"
              >
                 ◀
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 border ${currentPage === i + 1 ? 'border-brand-accent bg-brand-accent text-white' : 'border-border text-text-muted'} flex items-center justify-center text-[10px] font-bold`}
                >
                   {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 border border-border flex items-center justify-center text-text-muted hover:text-brand-accent hover:border-brand-accent transition-colors disabled:opacity-30"
              >
                 ▶
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AuditHistory;
