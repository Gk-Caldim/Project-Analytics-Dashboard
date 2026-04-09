import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { X, Plus, Search, Edit, Trash2, Download, Filter, ChevronUp, ChevronDown, Check, Copy, Settings, Columns, Eye, EyeOff, Briefcase, FolderTree } from 'lucide-react';
import API from '../../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import useCurrency from '../../hooks/useCurrency';
import SearchableDropdown from '../SearchableDropdown';

const ProjectSubCategoryMaster = ({ project, showNotification, onRefresh, inline = false }) => {
  const { format, symbol, code, convert } = useCurrency();
  const { user } = useSelector(state => state.auth);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';
  const permissions = user?.permissions || [];
  const canEdit = isAdmin || permissions.includes('Project Master:EDIT-SUBCATEGORY');
  const canDelete = isAdmin || permissions.includes('Project Master:DELETE-SUBCATEGORY');

  const initialColumns = [
    { id: 'sub_category', label: 'Sub-category', visible: true, sortable: true, type: 'text', required: true },
    { id: 'department', label: 'Department', visible: true, sortable: true, type: 'select', required: true },
    { id: 'unit_type', label: 'Unit Type', visible: true, sortable: true, type: 'text', required: false },
    { id: 'no_of_counts_per_unit', label: 'No of counts Per unit', visible: true, sortable: true, type: 'number', required: false },
    { id: 'estimated_value', label: 'Budget', visible: true, sortable: true, type: 'number', required: true },
    { id: 'utilized_value', label: 'Utilized Budget', visible: true, sortable: true, type: 'number', required: false },
    { id: 'balance', label: 'Balance Budget', visible: true, sortable: true, type: 'number', required: false, readonly: true },
  ];

  const fixedColumnIds = ['id', 'project_id', 'sub_category', 'department', 'unit_type', 'no_of_counts_per_unit', 'estimated_value', 'utilized_value', 'balance', 'custom_fields'];

  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('project_subcategory_columns_v1');
    return saved ? JSON.parse(saved) : initialColumns;
  });

  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');


  useEffect(() => {
    localStorage.setItem('project_subcategory_columns_v1', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    if (project) {
      fetchSubCategories();
    }
  }, [project]);



  // Auto-calculate balance for form
  useEffect(() => {
    const estimated = parseFloat(formData.estimated_value) || 0;
    const utilized = parseFloat(formData.utilized_value) || 0;
    const balance = estimated - utilized;
    if (formData.balance !== balance) {
        setFormData(prev => ({ ...prev, balance }));
    }
  }, [formData.estimated_value, formData.utilized_value]);

  const fetchSubCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/project-sub-categories/${project.project_id}`);
      const data = (res.data || []).map(item => ({
        ...item,
        ...(item.custom_fields || {})
      }));
      setSubCategories(data);
    } catch (err) {
      console.error("Error fetching sub-categories", err);
      if (showNotification) showNotification('Failed to load sub-categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.sub_category) {
      if (showNotification) showNotification('Sub-category is required', 'error');
      return;
    }

    try {
      if (!project?.project_id) {
        if (showNotification) showNotification('Current project is missing a Project ID.', 'error');
        return;
      }

      const safeFloat = (val) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      const convertedFormData = {
        ...formData,
        estimated_value: convert(formData.estimated_value || 0, code, 'USD'),
        utilized_value: convert(formData.utilized_value || 0, code, 'USD'),
        balance: convert(formData.balance || 0, code, 'USD'),
      };

      let payload = {
        project_id: project.project_id,
        sub_category: convertedFormData.sub_category,
        department: convertedFormData.department || '',
        unit_type: convertedFormData.unit_type || '',
        no_of_counts_per_unit: safeFloat(convertedFormData.no_of_counts_per_unit),
        estimated_value: safeFloat(convertedFormData.estimated_value),
        utilized_value: safeFloat(convertedFormData.utilized_value),
        balance: safeFloat(convertedFormData.balance),
        custom_fields: {}
      };

      Object.keys(formData).forEach(key => {
        if (!fixedColumnIds.includes(key) && key !== 'id') {
          payload.custom_fields[key] = formData[key];
        }
      });

      if (editingId) {
        const { project_id, ...updatePayload } = payload;
        await API.put(`/project-sub-categories/${editingId}`, updatePayload);
        if (showNotification) showNotification('Sub-category updated successfully');
      } else {
        await API.post(`/project-sub-categories/`, payload);
        if (showNotification) showNotification('Sub-category added successfully');
      }
      fetchSubCategories();
      resetForm();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification('Error saving sub-category', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this sub-category?')) {
      try {
        await API.delete(`/project-sub-categories/${id}`);
        if (showNotification) showNotification('Sub-category deleted successfully');
        fetchSubCategories();
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error(err);
        if (showNotification) showNotification('Error deleting sub-category', 'error');
      }
    }
  };

  const startEdit = (item) => {
    setFormData({
      ...item,
      estimated_value: convert(item.estimated_value || 0, 'USD', code),
      utilized_value: convert(item.utilized_value || 0, 'USD', code),
      balance: convert(item.balance || 0, 'USD', code),
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
    setIsAdding(false);
  };

  const visibleColumns = columns.filter(c => c.visible);

  const filteredData = subCategories.filter(item =>
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addColumn = () => {
    if (!newColumnName.trim()) return;
    const id = newColumnName.toLowerCase().replace(/\s+/g, '_');
    if (columns.some(c => c.id === id)) {
        if (showNotification) showNotification('Column already exists', 'error');
        return;
    }
    const newCol = { id, label: newColumnName, visible: true, sortable: true, type: 'text' };
    setColumns([...columns, newCol]);
    setNewColumnName('');
    if (showNotification) showNotification(`Column "${newColumnName}" added`);
  };

  const toggleColumnVisibility = (id) => {
    setColumns(columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const deleteColumn = (id) => {
    if (initialColumns.some(c => c.id === id)) {
        if (showNotification) showNotification('Cannot delete fixed columns', 'error');
        return;
    }
    setColumns(columns.filter(c => c.id !== id));
    if (showNotification) showNotification('Column deleted');
  };

  const startEditingColumnLabel = (col) => {
    setEditingColumn(col.id);
    setTempColumnName(col.label);
  };

  const saveColumnLabel = () => {
    setColumns(columns.map(c => c.id === editingColumn ? { ...c, label: tempColumnName } : c));
    setEditingColumn(null);
  };

  const handleExport = (format) => {
    const dataToExport = filteredData.map(item => {
      const row = {};
      visibleColumns.forEach(col => {
        let val = item[col.id] || '';
        if (col.type === 'number' && (col.id.includes('value') || col.id === 'balance')) {
          val = format(val || 0);
        }
        row[col.label] = val;
      });
      return row;
    });

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SubCategories");
      XLSX.writeFile(wb, `${project.name || 'Project'}_sub_categories.xlsx`);
    } else if (format === 'pdf') {
       const doc = new jsPDF();
       doc.autoTable({
         head: [visibleColumns.map(c => c.label)],
         body: dataToExport.map(row => Object.values(row)),
         theme: 'grid'
       });
       doc.save(`${project.name || 'Project'}_sub_categories.pdf`);
    }
    if (showNotification) showNotification(`Export to ${format.toUpperCase()} completed`);
  };

  return (
    <div className={`flex flex-col h-full ${inline ? '' : 'bg-white dark:bg-slate-900'}`}>
      {/* Toolbar */}
      <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between ${inline ? 'bg-transparent' : 'bg-white dark:bg-slate-900'}`}>
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search category, unit, values..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canEdit && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Sub-category
            </button>
          )}
          <button 
            onClick={() => setShowColumnModal(true)}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            title="Column Settings"
          >
              <Columns className="h-5 w-5" />
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
          <button onClick={() => handleExport('excel')} className="p-2.5 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-emerald-100 dark:border-emerald-900/30" title="Export to Excel">
              <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-0 relative min-h-[400px]">
        {isAdding ? (
          <div className="p-4 sm:p-8 h-full overflow-auto">
            <div className={`max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300`}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                      {editingId ? 'Edit Sub-category' : 'Create New Sub-category'}
                  </h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Provide details for the chosen project sub-module.</p>
                </div>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="h-6 w-6" /></button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {columns.map(col => (
                  <div key={col.id} className={col.id === 'sub_category' ? 'sm:col-span-2' : ''}>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] mb-2.5 pl-0.5">
                      {col.label} {col.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      {col.type === 'number' && (col.id.includes('value') || col.id === 'balance') && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13.5px] font-bold text-slate-400">
                          {symbol}
                        </span>
                      )}
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={formData[col.id] ?? ''}
                          onChange={(e) => handleInputChange(col.id, col.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value)}
                          disabled={col.readonly}
                          className={`w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50 text-[13.5px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm flex items-center gap-1 ${col.readonly ? 'bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed opacity-80 text-slate-500 italic' : ''} ${(col.type === 'number' && (col.id.includes('value') || col.id === 'balance')) ? 'pl-8' : ''}`}
                          placeholder={`Enter ${col.label.toLowerCase()}...`}
                        />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-10 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-8">
                <button onClick={resetForm} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-[13.5px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95">
                  Discard Changes
                </button>
                <button onClick={handleSave} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13.5px] font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95">
                  {editingId ? 'Update Entry' : 'Verify & Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-24 text-slate-400">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <span className="mt-6 font-medium text-slate-500 dark:text-slate-500">Syncing with database...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800 animate-pulse">
                  <Filter className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No sub-categories found</h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">It seems there's no data matching your query or this project has no sub-modules yet.</p>
                {canEdit && (
                  <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-xl transition-all">
                    <Plus className="h-5 w-5" /> Start by adding one
                  </button>
                )}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 shadow-sm border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      {visibleColumns.map(col => (
                        <th key={col.id} className="px-6 py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
                    {filteredData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all duration-150 group">
                        {visibleColumns.map(col => (
                          <td key={col.id} className="px-6 py-4.5 text-[13.5px] text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                            {col.type === 'number' ? (
                              <span className={col.id === 'balance' ? (item[col.id] < 0 ? 'text-red-500 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30' : 'text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30') : ''}>
                                {col.id.includes('value') || col.id === 'balance' ? 
                                  format(item[col.id] || 0) : 
                                  (item[col.id]?.toLocaleString() || 0)}
                              </span>
                            ) : (
                              <span className={col.id === 'sub_category' ? 'text-slate-900 dark:text-white font-bold' : ''}>
                                  {item[col.id] || '-'}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            {canEdit && (
                              <button 
                                onClick={() => startEdit(item)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all"
                                title="Edit Entry"
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                                title="Permanently Delete"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="font-medium">Stored Records: <span className="text-slate-800 dark:text-white ml-0.5">{subCategories.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="font-medium">Total Resource Allocation: <span className="text-emerald-700 dark:text-emerald-500 ml-0.5 font-bold">{format(subCategories.reduce((acc, curr) => acc + (curr.estimated_value || 0), 0))}</span></span>
          </div>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-300 dark:text-slate-700">Protected Module • v1.0.4</div>
      </div>

      {/* COLUMN SETTINGS MODAL */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[70] p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Column Management</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-0.5">Customize view & Add custom fields</p>
              </div>
              <button onClick={() => setShowColumnModal(false)} className="text-slate-400 hover:text-slate-600 group">
                  <X className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {columns.map(col => (
                  <div key={col.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700 group">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
                      <button 
                        onClick={() => toggleColumnVisibility(col.id)}
                        className={`p-1.5 rounded-lg transition-all ${col.visible ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800'}`}
                      >
                        {col.visible ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                      </button>
                      
                      {editingColumn === col.id ? (
                        <input
                          type="text"
                          value={tempColumnName}
                          onChange={(e) => setTempColumnName(e.target.value)}
                          onBlur={saveColumnLabel}
                          onKeyPress={(e) => e.key === 'Enter' && saveColumnLabel()}
                          autoFocus
                          className="text-[13.5px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border border-blue-500 rounded-md px-2 py-0.5 w-full focus:outline-none"
                        />
                      ) : (
                        <span 
                          className={`text-[13.5px] font-bold truncate ${col.visible ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 italic'}`}
                          onDoubleClick={() => startEditingColumnLabel(col)}
                        >
                          {col.label}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                          onClick={() => startEditingColumnLabel(col)} 
                          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all"
                      >
                          <Edit className="h-4 w-4" />
                      </button>
                      {!initialColumns.some(ic => ic.id === col.id) && (
                        <button 
                          onClick={() => deleteColumn(col.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pl-1">Insert New Custom Column</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Remarks, Priority, etc."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-[13.5px] focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-400 shadow-inner"
                  />
                  <button 
                    onClick={addColumn}
                    disabled={!newColumnName.trim()}
                    className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white px-5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-lg active:scale-95"
                  >
                    ADD
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowColumnModal(false)}
                className="w-full mt-6 py-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600 active:scale-[0.98]"
              >
                Confirm Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSubCategoryMaster;
