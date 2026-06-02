import React, { useState, useEffect } from 'react';
import { Upload, File, FileText, CheckCircle, Clock, AlertCircle, Download, Trash2, Eye, Plus, Search, X, ChevronUp, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import API from '../../utils/api';
import useCurrency from '../../hooks/useCurrency';

const ProjectTrackerManagement = ({ project, showNotification }) => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'uploaded_at', direction: 'descending' });

  useEffect(() => {
    if (project?.id) {
      fetchUploads();
    }
  }, [project]);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      // The backend has GET /uploads/{project_id}
      const res = await API.get(`/uploads/${project.id}`);
      setUploads(res.data || []);
    } catch (err) {
      console.error("Error fetching uploads:", err);
      if (showNotification) showNotification('Failed to load trackers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const filteredUploads = uploads.filter(u => 
    u.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUploads = [...filteredUploads].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
    return 0;
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tracker? This will remove all associated data.')) {
      try {
        // Backend seems to use /datasets/{id} for deletion in UploadTrackers.jsx
        // Wait, let me check the backend tracker_api.py for delete
        // tracker_api.py doesn't have delete, but datasets.py might.
        // Actually UploadTrackers.jsx uses API.delete(`/datasets/${id}`)
        await API.delete(`/datasets/${id}`);
        if (showNotification) showNotification('Tracker deleted successfully');
        fetchUploads();
      } catch (err) {
        console.error(err);
        if (showNotification) showNotification('Error deleting tracker', 'error');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'processing': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search trackers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchUploads}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium">Loading trackers...</p>
          </div>
        ) : sortedUploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
              <File className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No trackers found</h3>
            <p className="text-slate-500 text-sm max-w-xs">No tracker files have been uploaded for this project yet.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('file_name')}>
                  Tracker Name {sortConfig.key === 'file_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Rows</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('uploaded_at')}>
                  Upload Date {sortConfig.key === 'uploaded_at' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {sortedUploads.map((upload) => (
                <tr key={upload.upload_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <FileText size={18} />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]" title={upload.file_name}>
                        {upload.file_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(upload.status)}`}>
                      {upload.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {upload.valid_row_count || 0} / {upload.row_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock size={12} /> {upload.uploaded_at || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => window.location.href = `/dashboard/trackers?file=${upload.upload_id}`}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                        title="View Content"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(upload.upload_id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProjectTrackerManagement;
