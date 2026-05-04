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
        log.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = activeFilter === 'ALL' || log.category === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [logs, searchTerm, activeFilter]);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const getActionColor = (action) => {
    const act = action.toLowerCase();
    if (act.includes('created') || act.includes('added')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (act.includes('deleted') || act.includes('removed')) return 'text-red-600 bg-red-50 border-red-100';
    if (act.includes('updated') || act.includes('synced')) return 'text-[#0004ab] bg-[#0004ab]/5 border-[#0004ab]/20';
    return 'text-gray-500 bg-gray-50 border-gray-100';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0004ab]" />
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">Fetching immutable ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#000000] tracking-tight">System Audit Log</h2>
          <p className="text-sm text-gray-500 mt-2">Historical record of all administrative actions, data mutations, and security events.</p>
        </div>
        <button className="h-11 px-6 border border-gray-100 text-[#0004ab] font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors flex items-center gap-3 rounded-full">
          <Download className="h-4 w-4" />
          Export Ledger
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-gray-200 p-6 rounded-none">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="SEARCH BY ACTIVITY OR USER..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-12 pr-4 bg-gray-50 border border-gray-200 focus:border-[#000000] outline-none text-[10px] font-bold tracking-widest uppercase rounded-md"
          />
        </div>
        
        <div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 focus:border-[#000000] outline-none text-[10px] font-bold tracking-widest uppercase appearance-none cursor-pointer rounded-md"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="SECURITY">SECURITY</option>
            <option value="DATA">DATA MUTATION</option>
            <option value="SYSTEM">SYSTEM CONFIG</option>
          </select>
        </div>

        <button 
           onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
           className="h-11 border border-gray-200 text-gray-400 font-bold text-[10px] tracking-widest uppercase hover:text-[#0004ab] transition-colors rounded-full"
        >
          Reset Filters
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Principal</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Module</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#000000]">
                        {dayjs(log.timestamp).format('DD MMM, YYYY').toUpperCase()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold tracking-tighter uppercase">
                        {dayjs(log.timestamp).format('hh:mm:ss A')}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 border border-gray-200 flex items-center justify-center text-[#000000] font-bold text-[10px]">
                        {log.performed_by?.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-tight">{log.performed_by}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 text-[9px] font-bold tracking-widest uppercase border ${getActionColor(log.activity || '')}`}>
                      {log.activity}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{log.category}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <code className="text-[10px] bg-gray-50 px-2 py-1 border border-gray-100 text-gray-400 font-mono font-bold">
                      {log.object_id?.substring(0, 8) || 'N/A'}
                    </code>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                   <td colSpan="5" className="px-8 py-20 text-center">
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">No audit entries match the current filters</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
             Showing {paginatedLogs.length} of {filteredLogs.length} events
           </p>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0004ab] hover:border-[#0004ab] transition-colors disabled:opacity-30"
              >
                 ◀
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 border ${currentPage === i + 1 ? 'border-[#0004ab] bg-[#0004ab] text-white' : 'border-gray-200 text-gray-400'} flex items-center justify-center text-[10px] font-bold`}
                >
                   {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0004ab] hover:border-[#0004ab] transition-colors disabled:opacity-30"
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
