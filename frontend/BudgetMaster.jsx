import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Upload, Save, Check, RefreshCw, AlertCircle, Plus, Trash2, Edit2, X,
  AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TrendingUp, Wallet, ArrowDownCircle, ArrowUp, ArrowDown, ChevronDown,
  FileText, History, Clock, FileUp, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import SearchableDropdown from '../../components/SearchableDropdown';
import useCurrency from '../../hooks/useCurrency';

// MNC-Standard Refined Headers (Moved Project Name and Budget from rows)
const initialColumns = [
  { id: 'sno', label: 'Sno', visible: true, sortable: true, type: 'text' },
  { id: 'category', label: 'Category', visible: true, sortable: true, type: 'text' },
  { id: 'item_name', label: 'Item name', visible: true, sortable: true, type: 'text' },
  { id: 'unit_type', label: 'Unit type', visible: true, sortable: true, type: 'text' },
  { id: 'unit_count', label: 'Unit count', visible: true, sortable: true, type: 'number' },
  { id: 'per_unit_cost', label: 'Per unit cost', visible: true, sortable: true, type: 'number' },
  { id: 'estimated', label: 'Estimated', visible: true, sortable: true, type: 'number', readonly: true },
  { id: 'utilized', label: 'Utilized', visible: true, sortable: true, type: 'number' },
  { id: 'commitment', label: 'Commitment', visible: true, sortable: true, type: 'number' },
  { id: 'total_utilization', label: 'Total utilization', visible: true, sortable: true, type: 'number', readonly: true },
  { id: 'balance', label: 'Balance', visible: true, sortable: true, type: 'number', readonly: true },
  { id: 'status', label: 'Status', visible: true, sortable: true, type: 'text' },
  { id: 'comments', label: 'Comments', visible: true, sortable: true, type: 'text' }
];

const BudgetMaster = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [overallBudget, setOverallBudget] = useState(0);
  const [managerName, setManagerName] = useState('');

  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState(initialColumns);
  const [activeDropdownColumn, setActiveDropdownColumn] = useState(null);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [frozenRows, setFrozenRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);

  // Column Modal State
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnToEdit, setColumnToEdit] = useState({ id: '', label: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Revision Workflow State
  const [activeTab, setActiveTab] = useState('Table'); // 'Table' or 'Revisions'
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revisionData, setRevisionData] = useState({
    revised_budget: '',
    reasons: '',
    attachment: null
  });
  const [fetchingRevisions, setFetchingRevisions] = useState(false);
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [waitingDate, setWaitingDate] = useState('');
  const [showWaitingModal, setShowWaitingModal] = useState(null); // stores revision ID

  const user = useSelector(state => state.auth.user);
  const userRole = user?.role || 'Employee';
  const isPM = userRole === 'Project Manager';
  const isHead = userRole === 'Head' || userRole === 'Admin' || userRole === 'Super Admin';
  const isFinance = userRole === 'Finance' || userRole === 'Admin' || userRole === 'Super Admin';
  const canRequestRevision = isPM;
  const canManageRevisions = isHead || isFinance;

  const { format, symbol } = useCurrency();

  useEffect(() => {
    fetchInitialData();
    if (canManageRevisions) {
      fetchRevisions();
    }
    const handleClickOutside = () => setActiveDropdownColumn(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userRole]);

  // Filtered & Sorted Data Logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    return tableData.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }
      
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSortFromMenu = (key, direction) => {
    setSortConfig({ key, direction });
    setActiveDropdownColumn(null);
  };

  const handleCopyColumnName = (label) => {
    navigator.clipboard.writeText(label);
    showNotification(`Copied "${label}" to clipboard`, 'success');
    setActiveDropdownColumn(null);
  };

  const handleFreezeColumnMenu = (colId) => {
    setFrozenColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
    setActiveDropdownColumn(null);
  };

  const toggleRowFreeze = (rowId) => {
    setFrozenRows(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
    setActiveDropdownColumn(null);
  };

  const handleDeleteColumn = (colId) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setActiveDropdownColumn(null);
    showNotification('Column removed from view', 'success');
  };

  const saveColumnEdit = () => {
    setColumns(prev => prev.map(c => 
      c.id === columnToEdit.id ? { ...c, label: columnToEdit.label } : c
    ));
    setShowColumnModal(false);
    showNotification('Column renamed successfully', 'success');
  };


  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const proj = projects.find(p => p.name === selectedProject);
      if (proj) {
        setOverallBudget(proj.budget || 0);
        if (proj.manager && proj.manager.length > 0) {
          const managerNames = proj.manager.map(m => {
            const empId = m.employeeId || m.employee_id;
            const emp = employees.find(e => String(e.employee_id) === String(empId));
            return emp ? emp.name : empId;
          }).filter(Boolean).join(', ');
          setManagerName(managerNames || 'No Manager Assigned');
        } else {
          setManagerName('No Manager Assigned');
        }
      }
    } else {
      setManagerName('');
      setOverallBudget(0);
    }
  }, [selectedProject, projects, employees]);

  useEffect(() => {
    if (selectedProject) {
      fetchBudgetData(selectedProject);
      setUploadedFile(null);
    } else {
      setTableData([]);
      setUploadedFile(null);
      setAttachmentName(null);
    }
    setCurrentPage(1); // reset pagination
  }, [selectedProject]);

  const fetchBudgetData = async (projectName) => {
    setLoading(true);
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}`);
      
      if (res.data && res.data.attachment_name) {
          setAttachmentName(res.data.attachment_name);
      } else {
          setAttachmentName(null);
      }

      if (res.data && res.data.budget_data && res.data.budget_data.length > 0) {
        setTableData(res.data.budget_data.map((row, i) => ({
          ...row,
          id: row.id || `row_db_${Date.now()}_${i}`
        })));
        if (res.data.overall_budget !== undefined) {
          setOverallBudget(res.data.overall_budget);
        }
      } else {
        setTableData([]);
      }
    } catch (err) {
      console.error(err);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [projRes, empRes] = await Promise.all([
        API.get('/projects/'),
        API.get('/employees/')
      ]);
      setProjects(projRes.data || []);
      setEmployees(empRes.data || []);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async () => {
    setFetchingRevisions(true);
    try {
      const res = await API.get('/budget/revisions/');
      setRevisions(res.data || []);
    } catch (err) {
      console.error('Error fetching revisions', err);
    } finally {
      setFetchingRevisions(false);
    }
  };

  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !revisionData.revised_budget || !revisionData.reasons) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    setSubmittingRevision(true);
    try {
        const proj = projects.find(p => p.name === selectedProject);
        const formData = new FormData();
        formData.append('project_id', proj?.project_id || '');
        formData.append('project_name', selectedProject);
        formData.append('pm_name', user?.name || 'Unknown PM');
        formData.append('previous_budget', parseFloat(overallBudget) || 0);
        formData.append('revised_budget', parseFloat(revisionData.revised_budget) || 0);
        formData.append('reasons', revisionData.reasons);
        if (revisionData.attachment) {
            formData.append('file', revisionData.attachment);
        }

        await API.post('/budget/revisions/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        showNotification('Budget revision request submitted successfully');
        setShowRevisionModal(false);
        setRevisionData({ revised_budget: '', reasons: '', attachment: null });
        fetchRevisions();
    } catch (err) {
        showNotification('Failed to submit revision request', 'error');
    } finally {
        setSubmittingRevision(false);
    }
  };

  const handleStatusUpdate = async (revisionId, newStatus, extraData = {}) => {
    try {
      await API.patch(`/budget/revisions/${revisionId}`, {
        status: newStatus,
        ...extraData
      });
      showNotification(`Revision ${newStatus.toLowerCase()} successfully`);
      fetchRevisions();
      if (newStatus === 'Approved') {
          // Refresh project data to show new budget
          fetchInitialData();
          if (selectedProject) fetchBudgetData(selectedProject);
      }
    } catch (err) {
      showNotification('Failed to update revision status', 'error');
    }
  };

  const handleDownloadAttachment = async (revisionId, fileName) => {
    try {
      const res = await API.get(`/budget/revisions/${revisionId}/attachment`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'attachment');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showNotification('Failed to download attachment', 'error');
    }
  };

  const handleDownloadBudgetFile = async (projectName, fileName) => {
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}/attachment`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'budget_master.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showNotification('No stored file found or failed to download', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsParsing(true);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

          if (rawData.length < 2) {
            showNotification('Uploaded file has no data', 'error');
            setIsParsing(false);
            return;
          }

          const fileHeaders = rawData[0].map(h => String(h).trim().toLowerCase());
          const newTableData = [];
          for (let i = 1; i < rawData.length; i++) {
            const rowValues = rawData[i];
            if (!rowValues || !rowValues.some(v => v !== undefined && String(v).trim() !== '')) continue;

            let rowObj = { id: `row_${Date.now()}_${i}` };
            columns.forEach((col) => {
              const hLow = col.label.toLowerCase();
              const colIndex = fileHeaders.indexOf(hLow);
              rowObj[col.label] = colIndex !== -1 && rowValues[colIndex] !== undefined ? rowValues[colIndex] : '';
            });
            newTableData.push(rowObj);
          }

          recalculateAll(newTableData);
          showNotification('Project budget data imported successfully!');
        } catch (err) {
          console.error("Excel parse error:", err);
          showNotification("Failed to parse. Please check your Excel format.", "error");
        } finally {
          setIsParsing(false);
          e.target.value = null;
        }
      }, 500);
    };
    reader.readAsBinaryString(file);
  };

  const handleEditChange = (field, value) => {
    const newData = { ...editingData, [field]: value };
    if (["Unit count", "Per unit cost", "Utilized", "Commitment"].includes(field)) {
      const uc = parseFloat(newData["Unit count"]) || 0;
      const puc = parseFloat(newData["Per unit cost"]) || 0;
      const estimated = uc * puc;
      const ut = parseFloat(newData["Utilized"]) || 0;
      const comm = parseFloat(newData["Commitment"]) || 0;
      const tot_util = ut + comm;

      newData["Estimated"] = estimated;
      newData["Total utilization"] = tot_util;
      newData["Balance"] = estimated - tot_util; // Fixed logic: Est - Util
    }
    setEditingData(newData);
  };

  const recalculateAll = (dataArray) => {
    setTableData(dataArray.map(row => {
      const uc = parseFloat(row["Unit count"]) || 0;
      const puc = parseFloat(row["Per unit cost"]) || 0;
      const estimated = uc * puc;
      const ut = parseFloat(row["Utilized"]) || 0;
      const comm = parseFloat(row["Commitment"]) || 0;
      const tot_util = ut + comm;
      return {
        ...row,
        "Estimated": estimated,
        "Total utilization": tot_util,
        "Balance": estimated - tot_util,
        "Status": row["Status"] || "In Progress"
      };
    }));
  };

  const addRow = () => {
    const emptyRow = { id: `row_${Date.now()}` };
    columns.forEach(col => emptyRow[col.label] = '');
    setTableData(prev => [...prev, emptyRow]);
    setEditingRowId(emptyRow.id);
    setEditingData(emptyRow);
  };

  const confirmDeleteRow = () => {
    setTableData(prev => prev.filter(r => r.id !== showDeletePrompt));
    setShowDeletePrompt(null);
    if (editingRowId === showDeletePrompt) setEditingRowId(null);
    showNotification('Item removed locally', 'success');
  };

  const startEdit = (row) => {
    setEditingRowId(row.id);
    setEditingData({ ...row });
  };

  const saveEdit = () => {
    setTableData(prev => prev.map(r => r.id === editingRowId ? { ...editingData } : r));
    setEditingRowId(null);
    setEditingData({});
    showNotification('Changes staged successfully', 'success');
  };

  const handleSave = async () => {
    if (!selectedProject) {
      showNotification('Selection required', 'error');
      return;
    }
    setSaving(true);
    try {
      const dataToSave = tableData.map(r => {
        const rowToUse = (editingRowId && r.id === editingRowId) ? editingData : r;
        const rowData = {};
        columns.forEach(col => rowData[col.label] = rowToUse[col.label]);
        return rowData;
      });

      const formData = new FormData();
      formData.append('project_name', selectedProject);
      formData.append('overall_budget', parseFloat(overallBudget) || 0);
      formData.append('uploaded_by', user?.name || 'Admin');
      formData.append('budget_data', JSON.stringify(dataToSave));
      
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      await API.post(`/budget/${encodeURIComponent(selectedProject)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification('Budget data synchronized with Project Master');
    } catch (err) {
      showNotification('Synchronization failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  }, [tableData, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const totalSumUtilization = tableData.reduce((sum, r) => sum + (parseFloat(r["Total utilization"]) || 0), 0);
  const isGlobalOverBudget = totalSumUtilization > overallBudget;

  const isMonetary = (header) => [
    "Per unit cost", "Estimated", "Utilized", "Commitment", "Total utilization", "Balance"
  ].includes(header);
  const isReadonly = (header) => ["Estimated", "Total utilization", "Balance"].includes(header);

  return (
    <>
      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Budget Master</h1>
            <div className="flex items-center gap-4 mt-1">
              <button 
                onClick={() => setActiveTab('Table')}
                className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'Table' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Budget Table
              </button>
              {(isHead || isFinance) && (
                <button 
                  onClick={() => setActiveTab('Revisions')}
                  className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${activeTab === 'Revisions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Incoming Revisions
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attachmentName && (
            <button
               onClick={() => handleDownloadBudgetFile(selectedProject, attachmentName)}
               className="flex items-center gap-2 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-all font-medium text-slate-700 dark:text-slate-300"
               title="Download stored Master Excel file"
            >
               <Download className="h-4 w-4" />
               <span className="hidden xl:inline">Stored Excel</span>
            </button>
          )}

          <div className="relative group">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <button className={`flex items-center gap-2 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-all font-medium ${isParsing ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {isParsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{isParsing ? 'Processing...' : 'Import Data'}</span>
            </button>
          </div>

          {isPM && (
            <button 
              onClick={() => setShowRevisionModal(true)}
              className="flex items-center gap-2 h-10 px-3 text-xs sm:text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all font-medium shadow-sm"
            >
              <History className="h-4 w-4" />
              <span>Revision Budget</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'Table' ? (
      <>
      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Project</label>
            <SearchableDropdown
              options={projects.map(p => p.name)}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="Select project"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Budget ({symbol})</label>
            <div className="relative">
              <input
                type="number"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                value={overallBudget}
                onChange={(e) => setOverallBudget(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Manager</label>
            <div className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 font-semibold text-sm truncate min-h-[38px] flex items-center">
              {managerName || "- Unassigned -"}
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="master-table-container dark:bg-slate-800 dark:border-slate-700">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 h-10 px-3 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-all font-medium whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Item</span>
              <span className="sm:hidden">Add</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !selectedProject}
              className={`flex items-center gap-1.5 h-10 px-3 rounded text-xs sm:text-sm font-medium transition-all shadow-sm ${saving ? 'bg-slate-100 text-slate-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Sync Master</span>
            </button>

            <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1"></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-0.5">Utilization</span>
              <span className={`text-[11px] font-bold ${isGlobalOverBudget ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                {format(totalSumUtilization, false)}
                {isGlobalOverBudget && <span className="ml-2 text-[9px] bg-red-100 text-red-600 px-1 border border-red-200 rounded uppercase">Limit Exceeded</span>}
              </span>
            </div>
          </div>
        </div>

      {/* Global Over-Budget Warning Banner */}
      {selectedProject && isGlobalOverBudget && (
        <div className="mb-4 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-r shadow-sm flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800 uppercase tracking-tight">Project is Over Budget</p>
              <p className="text-[10px] text-red-600 font-medium uppercase tracking-widest leading-none">Total utilization ({format(totalSumUtilization, false)}) exceeds allocated budget ({format(overallBudget, false)}) by {format(totalSumUtilization - overallBudget, false)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded uppercase tracking-tighter shadow-sm">Critical Warning</span>
          </div>
        </div>
      )}

        <div className="master-table-scroll">
          <div className="master-table-scroll-inner">
            <table className="master-table">
              <thead className="bg-black text-white sticky top-0 z-40">
                <tr>
                  {columns.map(col => {
                    const isDropdown = activeDropdownColumn === col.id;
                    const isFrozen = frozenColumns.includes(col.id);
                    
                    return (
                      <th 
                        key={col.id} 
                        className={`py-3 px-6 text-[11px] font-bold uppercase tracking-wider border-r border-slate-800 text-white group relative ${isFrozen ? 'sticky z-50 bg-black shadow-[2px_0_5px_rgba(0,0,0,0.5)]' : ''}`}
                        style={{ left: isFrozen ? `${columns.filter(c => frozenColumns.includes(c.id)).indexOf(col) * 150}px` : 'auto' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                           <span>{col.label} {sortConfig.key === col.id && (sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />)}</span>
                           <button 
                              onClick={(e) => { e.stopPropagation(); setActiveDropdownColumn(isDropdown ? null : col.id); }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-800"
                           >
                              <ChevronDown className="h-3.5 w-3.5" />
                           </button>
                           
                           {isDropdown && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl z-[100] py-2 text-slate-800 normal-case tracking-normal font-medium">
                                 <button onClick={() => handleSortFromMenu(col.id, 'ascending')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><ArrowUp className="h-3.5 w-3.5 text-slate-400" /> Sort Ascending</button>
                                 <button onClick={() => handleSortFromMenu(col.id, 'descending')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><ArrowDown className="h-3.5 w-3.5 text-slate-400" /> Sort Descending</button>
                                 <div className="h-px bg-slate-100 my-1"></div>
                                 <button onClick={() => { navigator.clipboard.writeText(col.label); showNotification('Copied name', 'success'); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Plus className="h-3.5 w-3.5 text-slate-400" /> Copy name</button>
                                 <button onClick={() => { setColumnToEdit({ id: col.id, label: col.label }); setShowColumnModal(true); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Edit2 className="h-3.5 w-3.5 text-slate-400" /> Edit column</button>
                                 <button onClick={() => handleFreezeColumnMenu(col.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                    <RefreshCw className={`h-3.5 w-3.5 ${isFrozen ? 'text-blue-500' : 'text-slate-400'}`} /> {isFrozen ? 'Unfreeze column' : 'Freeze column'}
                                 </button>
                                 <button onClick={() => setShowNotification('Freeze row functionality coming soon', 'info')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><ArrowDownCircle className="h-3.5 w-3.5 text-slate-400" /> Freeze row(s)</button>
                                 <div className="h-px bg-slate-100 my-1"></div>
                                 <button onClick={() => handleDeleteColumn(col.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-red-600"><Trash2 className="h-3.5 w-3.5" /> Delete column</button>
                              </div>
                           )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-6 text-[11px] font-bold uppercase tracking-wider text-center sticky right-0 z-50 bg-blue-50 text-black border-l border-slate-200 shadow-[-4px_0_8px_rgba(0,0,0,0.05)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading || isParsing ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Entries...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-20 text-center text-slate-400 uppercase font-bold text-[10px] tracking-widest whitespace-nowrap">
                      No data available. Please select project or import budget.
                    </td>
                  </tr>
                ) :
                  paginatedData.map((row) => {
                    const isEdit = editingRowId === row.id;
                    const isFrozenRow = frozenRows.includes(row.id);
                    return (
                      <tr key={row.id} className={`transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isFrozenRow ? 'sticky top-[48px] z-30 bg-blue-50/50' : ''}`}>
                        {columns.map(col => {
                          const val = isEdit ? editingData[col.label] : row[col.label];
                          const header = col.label;
                          if (isEdit) {
                            const numeric = isMonetary(header) || header === "Unit count";
                            return (
                              <td key={`${row.id}-${header}`} className={`p-0 border-r border-slate-200 dark:border-slate-700 relative ${isReadonly(header) ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-800'}`}>
                                {isMonetary(header) && val !== '' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">{symbol}</span>}
                                <input
                                  type={isReadonly(header) ? 'text' : ['Unit count', 'Per unit cost', 'Utilized', 'Commitment'].includes(header) ? 'number' : 'text'}
                                  value={val !== undefined && val !== null ? val : ''}
                                  readOnly={isReadonly(header)}
                                  onChange={(e) => handleEditChange(header, e.target.value)}
                                  className={`w-full h-full py-3 px-6 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium text-xs ${isReadonly(header) ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'} ${isMonetary(header) ? 'pl-6' : ''} ${numeric ? 'text-right' : ''}`}
                                />
                              </td>
                            )
                          }
                          let displayVal = val !== undefined && val !== null && val !== '' ? val : '-';
                          if (displayVal !== '-' && isMonetary(header)) {
                            const num = parseFloat(displayVal);
                            displayVal = !isNaN(num) ? format(num, false) : displayVal;
                          }
                          const numeric = isMonetary(header) || header === "Unit count";
                          return (
                            <td key={`${row.id}-${header}`} className={`py-3 px-6 border-r border-slate-200 dark:border-slate-700 text-[13px] ${isReadonly(header) ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'} whitespace-nowrap ${numeric ? 'text-right' : ''}`}>
                              {displayVal}
                            </td>
                          )
                        })}
                        <td className={`p-2 text-center sticky right-0 z-30 border-l border-slate-200 dark:border-slate-700 ${isEdit ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)]'}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            {isEdit ? (
                              <button onClick={saveEdit} className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm">
                                <Check className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => startEdit(row)} className="p-1.5 rounded text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all">
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => setShowDeletePrompt(row.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
              {/* Sticky Summary Footer - Only visible after project/upload */}
              {(selectedProject || tableData.length > 0) && (
                <tfoot className="sticky bottom-0 z-40 bg-slate-100 text-slate-900 border-t border-slate-300 shadow-[0_-2px_5px_rgba(0,0,0,0.1)]">
                  <tr>
                    {columns.map((col, idx) => {
                      let sum = '-';
                      if (col.label === 'Estimated') sum = format(tableData.reduce((s, r) => s + (parseFloat(r['Estimated']) || 0), 0), false);
                      if (col.label === 'Total utilization') sum = format(tableData.reduce((s, r) => s + (parseFloat(r['Total utilization']) || 0), 0), false);
                      if (col.label === 'Balance') sum = format(tableData.reduce((s, r) => s + (parseFloat(r['Balance']) || 0), 0), false);
                      
                      const numeric = isMonetary(col.label) || col.label === "Unit count";
                      return (
                        <td key={`footer-${col.id}`} className={`py-3 px-6 text-[11px] font-bold uppercase tracking-wider border-r border-slate-200 whitespace-nowrap ${numeric ? 'text-right' : ''}`}>
                          {idx === 0 ? 'TOTAL' : sum}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 bg-slate-100 border-l border-slate-200 p-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </div>
      </div>
      </>
      ) : (
        /* Incoming Revisions UI */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Revision Requests</h2>
              </div>
              <button 
                onClick={fetchRevisions}
                disabled={fetchingRevisions}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 text-slate-500 ${fetchingRevisions ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Project</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Requested By</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-right">Prev Budget</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-right">New Budget</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Attachment</th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {fetchingRevisions ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching Revisions...</span>
                      </td>
                    </tr>
                  ) : revisions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        No revision requests found.
                      </td>
                    </tr>
                  ) : revisions.map(rev => (
                    <tr key={rev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{rev.project_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">ID: {rev.project_id}</div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-600 dark:text-slate-400">{rev.pm_name}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-50 text-right font-mono bg-slate-900 border border-slate-700 rounded-sm px-1.5">{format(rev.previous_budget, false)}</td>
                      <td className="py-3 px-4 text-xs font-bold text-blue-400 text-right font-mono bg-slate-900 border border-blue-900 rounded-sm px-1.5 ml-1">{format(rev.revised_budget, false)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                          rev.status === 'Approved' ? 'bg-green-600 text-white shadow-sm' :
                          rev.status === 'Declined' ? 'bg-red-600 text-white shadow-sm' :
                          rev.status === 'Cancelled' ? 'bg-slate-600 text-white shadow-sm' :
                          rev.status === 'In Waiting Period' ? 'bg-amber-500 text-white shadow-sm' :
                          'bg-blue-600 text-white shadow-sm'
                        }`}>
                          {rev.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rev.attachment_name ? (
                          <button 
                            onClick={() => handleDownloadAttachment(rev.id, rev.attachment_name)}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 decoration-none"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[100px]">{rev.attachment_name}</span>
                          </button>
                        ) : <span className="text-slate-500 text-[10px] font-bold tracking-widest">NO FILE</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {isHead && rev.status === 'Pending Head' && (
                            <>
                              <button 
                                onClick={() => handleStatusUpdate(rev.id, 'Pending Finance')}
                                title="Review to Finance"
                                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all shadow-md active:scale-95"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(rev.id, 'Cancelled')}
                                title="Cancel Review"
                                className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-all shadow-md active:scale-95"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {isFinance && rev.status === 'Pending Finance' && (
                            <>
                              <button 
                                onClick={() => handleStatusUpdate(rev.id, 'Approved')}
                                title="Approve Revised Budget"
                                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all shadow-md active:scale-95"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setShowWaitingModal(rev.id)}
                                title="Set Waiting Period"
                                className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-all shadow-md active:scale-95"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(rev.id, 'Declined')}
                                title="Decline Revised Budget"
                                className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-all shadow-md active:scale-95"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Revision Submission Modal (PM Only) */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                  <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Revise Project Budget</h3>
              </div>
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleRevisionSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previous Budget</label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 font-bold text-sm">
                    {format(overallBudget, false)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revised Budget</label>
                  <input 
                    type="number"
                    required
                    value={revisionData.revised_budget}
                    onChange={(e) => setRevisionData({...revisionData, revised_budget: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for Revision</label>
                <textarea 
                  required
                  rows="3"
                  value={revisionData.reasons}
                  onChange={(e) => setRevisionData({...revisionData, reasons: e.target.value})}
                  placeholder="Explain why the budget needs to be revised..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support Documents (PDF/Excel)</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    onChange={(e) => setRevisionData({...revisionData, attachment: e.target.files[0]})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-3 py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg group-hover:border-indigo-400 transition-colors flex items-center justify-center gap-3">
                    <FileUp className="h-5 w-5 text-slate-400 group-hover:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-500">
                      {revisionData.attachment ? revisionData.attachment.name : "Click to select or drag and drop file"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingRevision}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 uppercase tracking-widest font-black flex items-center gap-2 transition-all active:scale-95 disabled:bg-slate-400"
                >
                  {submittingRevision ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4" />}
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waiting Period Modal (Finance Only) */}
      {showWaitingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Set Waiting Period</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">Select a date until which the revision processing will be deferred.</p>
              
              <input 
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={waitingDate}
                onChange={(e) => setWaitingDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none mb-6"
              />

              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowWaitingModal(null); setWaitingDate(''); }}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleStatusUpdate(showWaitingModal, 'In Waiting Period', { waiting_until: waitingDate });
                    setShowWaitingModal(null);
                    setWaitingDate('');
                  }}
                  disabled={!waitingDate}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-lg shadow-md hover:bg-amber-600 uppercase tracking-widest font-black transition-all active:scale-95 disabled:bg-slate-300"
                >
                  Set Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caution Prompt Modal */}
      {showDeletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded shadow-lg w-full max-w-sm p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirm Removal</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to delete this budget entry? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeletePrompt(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all">Cancel</button>
              <button onClick={confirmDeleteRow} className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded transition-all">Delete Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-10 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3 rounded shadow-lg border ${notification.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-200 text-green-700' : 'bg-white dark:bg-slate-800 border-red-200 text-red-700'}`}>
            {notification.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification({ show: false, message: '', type: '' })} className="ml-4 text-slate-400"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Edit Column Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded shadow-lg w-full max-w-sm p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Edit Column Name</h3>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded mb-6 focus:ring-1 focus:ring-blue-500 outline-none"
              value={columnToEdit.label}
              onChange={(e) => setColumnToEdit({ ...columnToEdit, label: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowColumnModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded decoration-none">Cancel</button>
              <button onClick={saveColumnEdit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BudgetMaster;
