import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Upload, Save, RefreshCw, Plus, Trash2, Edit, X, Check,
  AlertTriangle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Wallet, History, Clock, FileUp, Download, Search, Eye, EyeOff,
  AlertCircle, ArrowUp, ArrowDown, FileText, CheckCircle, Calculator,
  User, ShieldCheck, Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import SearchableDropdown from '../../components/SearchableDropdown';
import useCurrency from '../../hooks/useCurrency';

const MONETARY_COLS = ['Per unit cost', 'Estimated', 'Utilized', 'Commitment', 'Total utilization', 'Balance'];
const READONLY_COLS = ['Estimated', 'Total utilization', 'Balance'];
const NUMERIC_COLS  = ['Unit count', 'Per unit cost', 'Utilized', 'Commitment'];

const initialColumns = [
  { id: 'sno',              label: 'Sno',              visible: true },
  { id: 'category',        label: 'Category',         visible: true },
  { id: 'item_name',       label: 'Item Name',        visible: true },
  { id: 'unit_type',       label: 'Unit Type',        visible: true },
  { id: 'unit_count',      label: 'Unit count',       visible: true },
  { id: 'per_unit_cost',   label: 'Per unit cost',    visible: true },
  { id: 'estimated',       label: 'Estimated',        visible: true },
  { id: 'utilized',        label: 'Utilized',         visible: true },
  { id: 'commitment',      label: 'Commitment',       visible: true },
  { id: 'total_utilization', label: 'Total utilization', visible: true },
  { id: 'balance',         label: 'Balance',          visible: true },
  { id: 'status',          label: 'Status',           visible: true },
  { id: 'comments',        label: 'Comments',         visible: true },
];

const isMonetary = (label) => MONETARY_COLS.includes(label);
const isReadonly  = (label) => READONLY_COLS.includes(label);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ value }) => {
  const cfg = {
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
    'Completed':   'bg-emerald-50 text-emerald-700 border-emerald-100',
    'On Hold':     'bg-amber-50 text-amber-700 border-amber-100',
    'Cancelled':   'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${cfg[value] || 'bg-slate-50 text-slate-700 border-slate-100'}`}>
      {value || '—'}
    </span>
  );
};

// ─── Revision Status Badge ────────────────────────────────────────────────────
const RevisionBadge = ({ status }) => {
  const cfg = {
    'Approved':           'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Declined':           'bg-red-50 text-red-700 border-red-100',
    'Cancelled':          'bg-slate-50 text-slate-600 border-slate-200',
    'In Waiting Period':  'bg-amber-50 text-amber-700 border-amber-100',
    'Pending Head':       'bg-blue-50 text-blue-700 border-blue-100',
    'Pending Finance':    'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${cfg[status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BudgetMaster = () => {
  const [projects,        setProjects]        = useState([]);
  const [employees,       setEmployees]       = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [overallBudget,   setOverallBudget]   = useState(0);
  const [managerName,     setManagerName]     = useState('');

  const [tableData,       setTableData]       = useState([]);
  const [columns,         setColumns]         = useState(initialColumns);
  const [sortConfig,      setSortConfig]      = useState({ key: null, direction: 'ascending' });
  const [searchTerm,      setSearchTerm]      = useState('');

  const [editingRowId,    setEditingRowId]    = useState(null);
  const [editingData,     setEditingData]     = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);

  const [currentPage,     setCurrentPage]     = useState(1);
  const [itemsPerPage,    setItemsPerPage]     = useState(10);

  const [loading,         setLoading]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [isParsing,       setIsParsing]       = useState(false);
  const [uploadedFile,    setUploadedFile]    = useState(null);
  const [attachmentName,  setAttachmentName]  = useState(null);
  const [notification,    setNotification]    = useState({ show: false, message: '', type: '' });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcSimAmount, setCalcSimAmount] = useState('');

  const [activeTab,       setActiveTab]       = useState('Table');

  // Revision state
  const [showRevisionModal,  setShowRevisionModal]  = useState(false);
  const [revisions,          setRevisions]          = useState([]);
  const [revisionData,       setRevisionData]       = useState({ revised_budget: '', reasons: '', attachment: null });
  const [fetchingRevisions,  setFetchingRevisions]  = useState(false);
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [waitingDate,        setWaitingDate]        = useState('');
  const [showWaitingModal,   setShowWaitingModal]   = useState(null);
  const [showSaveDropdown,   setShowSaveDropdown]   = useState(false);

  const user     = useSelector(state => state.auth.user);
  const userRole = user?.role || 'Employee';
  const isPM      = userRole === 'Project Manager';
  const isHead    = ['Head', 'Admin', 'Super Admin'].includes(userRole);
  const isFinance = ['Finance', 'Admin', 'Super Admin'].includes(userRole);
  const { format } = useCurrency();

  // ─── Fetch helpers ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInitialData();
    if (isHead || isFinance) fetchRevisions();
  }, [userRole]);

  useEffect(() => {
    if (selectedProject && projects.length > 0) {
      const proj = projects.find(p => p.name === selectedProject);
      if (proj) {
        setOverallBudget(proj.budget || 0);
        setManagerName(proj.project_manager || 'No Manager Assigned');
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
    setCurrentPage(1);
  }, [selectedProject]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [projRes, empRes] = await Promise.all([API.get('/projects/'), API.get('/employees/')]);
      setProjects(projRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error('Init error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async (projectName) => {
    setLoading(true);
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}`);
      setAttachmentName(res.data?.attachment_name || null);
      if (res.data?.overall_budget !== undefined) setOverallBudget(res.data.overall_budget);
      const rows = res.data?.budget_data || [];
      setTableData(rows.map((row, i) => ({ ...row, id: row.id || `row_db_${Date.now()}_${i}` })));
    } catch (err) {
      console.error(err);
      setTableData([]);
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
      console.error(err);
    } finally {
      setFetchingRevisions(false);
    }
  };

  // ─── Notifications ──────────────────────────────────────────────────────────
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // ─── Sort / Filter ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    return tableData.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tableData, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortConfig.key]; const bv = b[sortConfig.key];
      const an = parseFloat(av); const bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortConfig.direction === 'ascending' ? an - bn : bn - an;
      const as = String(av || '').toLowerCase(); const bs = String(bv || '').toLowerCase();
      if (as < bs) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (as > bs) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (label) => {
    setSortConfig(prev => ({
      key: label,
      direction: prev.key === label && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const totalPages    = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ─── Row Editing ────────────────────────────────────────────────────────────
  const recalc = (data) => ({
    ...data,
    'Estimated':         (parseFloat(data['Unit count']) || 0) * (parseFloat(data['Per unit cost']) || 0),
    'Total utilization': (parseFloat(data['Utilized']) || 0) + (parseFloat(data['Commitment']) || 0),
    get 'Balance'()    { return this['Estimated'] - this['Total utilization']; }
  });

  const handleEditChange = (label, value) => {
    setEditingData(prev => {
      const next = { ...prev, [label]: value };
      if ([...NUMERIC_COLS, 'Utilized', 'Commitment'].includes(label)) {
        const uc   = parseFloat(next['Unit count'])    || 0;
        const puc  = parseFloat(next['Per unit cost']) || 0;
        const ut   = parseFloat(next['Utilized'])      || 0;
        const comm = parseFloat(next['Commitment'])    || 0;
        next['Estimated']         = uc * puc;
        next['Total utilization'] = ut + comm;
        next['Balance']           = next['Estimated'] - next['Total utilization'];
      }
      return next;
    });
  };

  const addRow = () => {
    const row = { id: `row_${Date.now()}` };
    columns.forEach(c => { row[c.label] = ''; });
    row['Status'] = 'In Progress';
    setTableData(prev => [...prev, row]);
    setEditingRowId(row.id);
    setEditingData(row);
  };

  const startEdit = (row) => { setEditingRowId(row.id); setEditingData({ ...row }); };
  const saveEdit  = () => {
    setTableData(prev => prev.map(r => r.id === editingRowId ? { ...editingData } : r));
    setEditingRowId(null);
    setEditingData({});
    showNotification('Row updated');
  };
  const cancelEdit = () => { setEditingRowId(null); setEditingData({}); };

  const confirmDeleteRow = () => {
    setTableData(prev => prev.filter(r => r.id !== showDeletePrompt));
    setShowDeletePrompt(null);
    if (editingRowId === showDeletePrompt) { setEditingRowId(null); setEditingData({}); }
    showNotification('Row removed');
  };

  // ─── Excel Import ────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsParsing(true);
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (raw.length < 2) { showNotification('No data in file', 'error'); return; }
          const headers = raw[0].map(h => String(h).trim().toLowerCase());
          const rows = [];
          for (let i = 1; i < raw.length; i++) {
            const rv = raw[i];
            if (!rv || !rv.some(v => v !== undefined && String(v).trim() !== '')) continue;
            const row = { id: `row_${Date.now()}_${i}` };
            columns.forEach(col => {
              const idx = headers.indexOf(col.label.toLowerCase());
              row[col.label] = idx !== -1 && rv[idx] !== undefined ? rv[idx] : '';
            });
            const uc   = parseFloat(row['Unit count'])    || 0;
            const puc  = parseFloat(row['Per unit cost']) || 0;
            const ut   = parseFloat(row['Utilized'])      || 0;
            const comm = parseFloat(row['Commitment'])    || 0;
            row['Estimated']         = uc * puc;
            row['Total utilization'] = ut + comm;
            row['Balance']           = row['Estimated'] - row['Total utilization'];
            row['Status']            = row['Status'] || 'In Progress';
            rows.push(row);
          }
          setTableData(rows);
          showNotification('Data imported successfully');
        } catch (err) {
          showNotification('Failed to parse file', 'error');
        } finally {
          setIsParsing(false);
          e.target.value = null;
        }
      }, 300);
    };
    reader.readAsBinaryString(file);
  };

  // ─── Budget Template ────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const templateData = [
      [
        "Category",
        "Item Name",
        "Unit Type",
        "Unit count",
        "Per unit cost",
        "Utilized",
        "Commitment",
        "Status",
        "Comments"
      ],
      ["CAPEX", "Sample Item 1", "Nos", 10, 500, 200, 100, "In Progress", "Initial estimate"],
      ["Revenue", "Sample Item 2", "LS", 1, 1000, 0, 0, "In Progress", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const colWidths = [
      { wch: 15 }, // Category
      { wch: 25 }, // Item Name
      { wch: 12 }, // Unit Type
      { wch: 12 }, // Unit count
      { wch: 15 }, // Per unit cost
      { wch: 12 }, // Utilized
      { wch: 12 }, // Commitment
      { wch: 15 }, // Status
      { wch: 30 }, // Comments
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Template");
    XLSX.writeFile(wb, "Budget_Template.xlsx");

    showNotification('Template downloaded successfully');
  };

  // ─── Save to DB ──────────────────────────────────────────────────────────────
  const handleSave = async (syncToProject = false) => {
    if (!selectedProject) { showNotification('Please select a project first', 'error'); return; }
    setSaving(true);
    try {
      const dataToSave = tableData.map(r => {
        const src = (editingRowId && r.id === editingRowId) ? editingData : r;
        const row = {};
        columns.forEach(c => { row[c.label] = src[c.label]; });
        return row;
      });
      const fd = new FormData();
      fd.append('project_name',   selectedProject);
      fd.append('overall_budget', parseFloat(overallBudget) || 0);
      fd.append('uploaded_by',    user?.name || 'Admin');
      fd.append('budget_data',    JSON.stringify(dataToSave));
      fd.append('sync_to_project', syncToProject);
      if (uploadedFile) fd.append('file', uploadedFile);
      await API.post(`/budget/${encodeURIComponent(selectedProject)}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification(syncToProject ? 'Budget saved and synced to Project Master' : 'Budget saved to database');
      if (editingRowId) { setEditingRowId(null); setEditingData({}); }
    } catch (err) {
      showNotification('Save failed — ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Revision handlers ───────────────────────────────────────────────────────
  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !revisionData.revised_budget || !revisionData.reasons) {
      showNotification('Fill all required fields', 'error'); return;
    }
    setSubmittingRevision(true);
    try {
      const proj = projects.find(p => p.name === selectedProject);
      const fd   = new FormData();
      fd.append('project_id',      proj?.project_id || '');
      fd.append('project_name',    selectedProject);
      fd.append('pm_name',         user?.name || 'Unknown');
      fd.append('previous_budget', parseFloat(overallBudget) || 0);
      fd.append('revised_budget',  (parseFloat(overallBudget) || 0) + (parseFloat(revisionData.revised_budget) || 0));
      fd.append('reasons',         revisionData.reasons);
      if (revisionData.attachment) fd.append('file', revisionData.attachment);
      await API.post('/budget/revisions/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showNotification('Revision request submitted');
      setShowRevisionModal(false);
      setRevisionData({ revised_budget: '', reasons: '', attachment: null });
      fetchRevisions();
    } catch (err) {
      showNotification('Failed to submit revision', 'error');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, extra = {}) => {
    try {
      await API.patch(`/budget/revisions/${id}`, { status: newStatus, ...extra });
      
      if (newStatus === 'Approved') {
        showNotification('Budget approved - new budget updated', 'success');
      } else if (['Declined', 'Cancelled'].includes(newStatus)) {
        showNotification('Budget not approved', 'error');
      } else {
        showNotification(`Revision ${newStatus.toLowerCase()}`);
      }
      
      fetchRevisions();
      if (newStatus === 'Approved') { 
        fetchInitialData(); 
        if (selectedProject) fetchBudgetData(selectedProject); 
      }
    } catch { showNotification('Failed to update revision', 'error'); }
  };

  const handleDownloadAttachment = async (revId, fileName) => {
    try {
      const res = await API.get(`/budget/revisions/${revId}/attachment`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', fileName || 'attachment');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { showNotification('Download failed', 'error'); }
  };

  const handleDownloadBudgetFile = async (projectName, fileName) => {
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}/attachment`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', fileName || 'budget_master.xlsx');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { showNotification('No file stored or download failed', 'error'); }
  };

  // ─── Computed summary ────────────────────────────────────────────────────────
  const totalUtilization = tableData.reduce((s, r) => s + (parseFloat(r['Total utilization']) || 0), 0);
  const totalEstimated   = tableData.reduce((s, r) => s + (parseFloat(r['Estimated'])          || 0), 0);
  const totalBalance     = tableData.reduce((s, r) => s + (parseFloat(r['Balance'])            || 0), 0);
  const isOverBudget     = totalUtilization > parseFloat(overallBudget);
  const visibleColumns   = columns.filter(c => c.visible);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="master-table-container">

      {/* ── Notification ──────────────────────────────────────────────────────── */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button onClick={() => setNotification({ show: false, message: '', type: '' })}
            className="ml-2 text-current opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Delete Row Prompt ────────────────────────────────────────────────── */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Confirm Delete</h3>
              <button onClick={() => setShowDeletePrompt(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Remove this budget entry?</p>
            <p className="text-xs text-red-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeletePrompt(null)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80">
                Cancel
              </button>
              <button onClick={confirmDeleteRow}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revision Submission Modal (PM) ───────────────────────────────────── */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-w-lg w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revise Project Budget</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Submit a revision request for approval</p>
              </div>
              <button onClick={() => setShowRevisionModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRevisionSubmit} className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-2 gap-6 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Previous Budget</label>
                  <div className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600">
                    {format(overallBudget, false)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Additional Budget Needed <span className="text-red-500">*</span>
                  </label>
                  <input type="number" required
                    value={revisionData.revised_budget}
                    onChange={e => setRevisionData({ ...revisionData, revised_budget: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              
              {revisionData.revised_budget && (
                <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Calculated New Total</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {format((parseFloat(overallBudget) || 0) + (parseFloat(revisionData.revised_budget) || 0), false)}
                  </span>
                </div>
              )}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Revision <span className="text-red-500">*</span>
                </label>
                <textarea required rows={3}
                  value={revisionData.reasons}
                  onChange={e => setRevisionData({ ...revisionData, reasons: e.target.value })}
                  placeholder="Explain why the budget revision is needed..."
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Support Document (Optional)</label>
                <div className="relative">
                  <input type="file" accept=".pdf,.xlsx,.xls"
                    onChange={e => setRevisionData({ ...revisionData, attachment: e.target.files[0] })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 transition-colors flex items-center justify-center gap-2 text-slate-400">
                    <FileUp className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {revisionData.attachment ? revisionData.attachment.name : 'Click to attach PDF or Excel'}
                    </span>
                  </div>
                </div>
              </div>
            </form>
            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => setShowRevisionModal(false)}
                className="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submittingRevision}
                onClick={handleRevisionSubmit}
                className="px-8 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                {submittingRevision && <RefreshCw className="h-4 w-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiting Period Modal ─────────────────────────────────────────────── */}
      {showWaitingModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Set Waiting Period</h3>
                <p className="text-xs text-slate-500 mt-0.5">Defer revision until a specific date</p>
              </div>
              <button onClick={() => { setShowWaitingModal(null); setWaitingDate(''); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Defer Until</label>
              <input type="date" min={new Date().toISOString().split('T')[0]}
                value={waitingDate}
                onChange={e => setWaitingDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none mb-6" />
              <div className="flex gap-3">
                <button onClick={() => { setShowWaitingModal(null); setWaitingDate(''); }}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button disabled={!waitingDate}
                  onClick={() => { handleStatusUpdate(showWaitingModal, 'In Waiting Period', { waiting_until: waitingDate }); setShowWaitingModal(null); setWaitingDate(''); }}
                  className="flex-1 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-40">
                  Set Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-slate-200 dark:border-slate-700 mb-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 dark:bg-slate-700 rounded-lg">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Budget Master</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage project budgets and revision workflows</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button onClick={() => setActiveTab('Table')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'Table'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Budget Master
          </button>
          {(isHead || isFinance || isPM) && (
            <button onClick={() => { setActiveTab('Revisions'); fetchRevisions(); }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'Revisions'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              Revision Budget
              {revisions.filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                  {revisions.filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance').length}
                </span>
              )}
            </button>
          )}
          <button onClick={() => { setActiveTab('Analytics'); fetchRevisions(); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'Analytics'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Budget Analytics
          </button>
        </div>
      </div>
      
      {/* ── Main Content Scroll Area ────────────────────────────────────────── */}
      <div className="master-table-scroll">
        <div className="master-table-scroll-inner p-4 sm:p-6 space-y-6">

      {/* ── BUDGET TABLE TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'Table' && (
        <>
          {/* Control Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Active Project
                </label>
                <SearchableDropdown
                  options={projects.map(p => p.name)}
                  value={selectedProject}
                  onChange={setSelectedProject}
                  placeholder="Select a project..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Overall Budget
                </label>
                <input type="number"
                  value={overallBudget}
                  onChange={e => setOverallBudget(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Project Manager
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium min-h-[42px] flex items-center">
                  {managerName || '— Unassigned —'}
                </div>
              </div>
            </div>
          </div>

          {/* Over-budget Warning */}
          {selectedProject && isOverBudget && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Project is Over Budget</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Total utilization <strong>{format(totalUtilization, false)}</strong> exceeds budget <strong>{format(parseFloat(overallBudget), false)}</strong> by <strong>{format(totalUtilization - parseFloat(overallBudget), false)}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {(selectedProject || tableData.length > 0) && (
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Total Estimated', value: totalEstimated, color: 'slate' },
                { label: 'Total Utilization', value: totalUtilization, color: isOverBudget ? 'red' : 'blue' },
                { label: 'Total Balance', value: totalBalance, color: totalBalance < 0 ? 'red' : 'emerald' },
              ].map(card => (
                <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{card.label}</p>
                  <p className={`text-lg font-bold ${
                    card.color === 'red'     ? 'text-red-600'     :
                    card.color === 'blue'    ? 'text-blue-600'    :
                    card.color === 'emerald' ? 'text-emerald-600' :
                    'text-slate-900 dark:text-white'
                  }`}>
                    {format(card.value, false)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Table Toolbar */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2">
              {/* Left actions */}
              <button onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </button>

              <div className="relative">
                <div className="flex items-stretch h-[38px]">
                  <button onClick={() => handleSave(false)} disabled={saving || !selectedProject}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 border-r border-blue-500/30">
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button onClick={() => setShowSaveDropdown(!showSaveDropdown)} disabled={saving || !selectedProject}
                    className="px-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center">
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSaveDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showSaveDropdown && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setShowSaveDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <button onClick={() => { handleSave(false); setShowSaveDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-300 transition-colors">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
                          <Save className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold">Save Budget</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Save changes to budget master</p>
                        </div>
                      </button>
                      <button onClick={() => { handleSave(true); setShowSaveDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-300 transition-colors border-t border-slate-100 dark:border-slate-700/50">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                          <RefreshCw className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Save & Sync to Project Master</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Updates project's budget summary</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* File actions */}
              <div className="relative group">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-300">
                  {isParsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{isParsing ? 'Parsing...' : 'Import Excel'}</span>
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-300"
                >
                  <FileText className="h-4 w-4" />
                  <span>Template</span>
                </button>
              </div>

              {attachmentName && (
                <button onClick={() => handleDownloadBudgetFile(selectedProject, attachmentName)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-300">
                  <Download className="h-4 w-4" />
                  <span className="hidden xl:inline">Stored Excel</span>
                </button>
              )}

              {isPM && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRevisionModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
                    <History className="h-4 w-4" />
                    <span>Revision Budget</span>
                  </button>

                  <div className="relative">
                    <button 
                      onClick={() => setShowCalculator(!showCalculator)}
                      className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
                        showCalculator 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200 dark:shadow-none' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                      title="Budget Calculator"
                    >
                      <Calculator className="h-4 w-4" />
                    </button>

                    <AnimatePresence>
                      {showCalculator && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          className="absolute right-0 top-full mt-3 w-80 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-5 overflow-hidden"
                        >
                          {/* Design Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-900 dark:bg-slate-700 rounded-lg">
                                <Calculator className="h-3.5 w-3.5 text-white" />
                              </div>
                              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Quick Calc</span>
                            </div>
                            <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Values Stack */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Overall Budget</p>
                                <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{format(overallBudget, false)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Utilization</p>
                                <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{format(totalUtilization, false)}</p>
                              </div>
                            </div>

                            {/* Health Bar (Visual Gauge) */}
                            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (totalUtilization / (parseFloat(overallBudget) || 1)) * 100)}%` }}
                                className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`}
                              />
                              {calcSimAmount && (
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100 - (totalUtilization / (parseFloat(overallBudget) || 1)) * 100, (parseFloat(calcSimAmount) / (parseFloat(overallBudget) || 1)) * 100)}%` }}
                                  className="h-full bg-indigo-400 opacity-60"
                                />
                              )}
                            </div>

                            {/* Simulation Tool */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Simulate Expense/Change</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  value={calcSimAmount}
                                  onChange={(e) => setCalcSimAmount(e.target.value)}
                                  placeholder="Enter amount..."
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                                <button onClick={() => setCalcSimAmount('')} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Final Results */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-slate-500">Remaining Balance</span>
                                <span className={`text-sm font-mono font-bold ${(parseFloat(overallBudget) || 0) - totalUtilization < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {format((parseFloat(overallBudget) || 0) - totalUtilization, false)}
                                </span>
                              </div>
                              {calcSimAmount && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700"
                                >
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Projected</span>
                                  <span className={`text-sm font-mono font-bold ${(parseFloat(overallBudget) || 0) - totalUtilization - (parseFloat(calcSimAmount) || 0) < 0 ? 'text-red-500' : 'text-indigo-600'}`}>
                                    {format((parseFloat(overallBudget) || 0) - totalUtilization - (parseFloat(calcSimAmount) || 0), false)}
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Right: Search + rows info */}
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input type="text" placeholder="Search entries..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-40 transition-all" />
                </div>
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    {visibleColumns.map(col => (
                      <th key={col.id}
                        className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                        onClick={() => handleSort(col.label)}>
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortConfig.key === col.label && (
                            sortConfig.direction === 'ascending'
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading || isParsing ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="py-16 text-center">
                        <RefreshCw className="h-7 w-7 text-blue-500 animate-spin mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                          {isParsing ? 'Parsing file...' : 'Loading data...'}
                        </p>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="py-16 text-center">
                        <Wallet className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-400">No budget items found</p>
                        <p className="text-xs text-slate-400 mt-1">Select a project or import an Excel file to get started</p>
                      </td>
                    </tr>
                  ) : paginatedData.map(row => {
                    const isEdit = editingRowId === row.id;
                    return (
                      <tr key={row.id}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/20 ${isEdit ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                        {visibleColumns.map(col => {
                          const val = isEdit ? editingData[col.label] : row[col.label];
                          const mon = isMonetary(col.label);
                          const ro  = isReadonly(col.label);
                          const num = mon || col.label === 'Unit count';

                          if (isEdit) {
                            return (
                              <td key={col.id} className="px-1 py-1">
                                {col.label === 'Status' ? (
                                  <select value={val || ''}
                                    onChange={e => handleEditChange(col.label, e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                                    {['In Progress', 'Completed', 'On Hold', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    type={!ro && (num) ? 'number' : 'text'}
                                    value={val !== undefined && val !== null ? val : ''}
                                    readOnly={ro}
                                    onChange={e => handleEditChange(col.label, e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all ${
                                      ro
                                        ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-white dark:bg-slate-800 border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100'
                                    } ${num ? 'text-right font-mono' : ''}`}
                                  />
                                )}
                              </td>
                            );
                          }

                          // View mode
                          let display = val !== undefined && val !== null && val !== '' ? val : '—';
                          if (display !== '—' && mon) {
                            const n = parseFloat(display);
                            if (!isNaN(n)) display = format(n, false);
                          }

                          return (
                            <td key={col.id}
                              className={`py-3 px-4 text-[13px] whitespace-nowrap ${
                                ro ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'
                              } ${num ? 'text-right font-mono' : ''}`}>
                              {col.label === 'Status'
                                ? <StatusBadge value={val} />
                                : col.label === 'Balance' && parseFloat(val) < 0
                                  ? <span className="text-red-600 font-semibold font-mono">{display}</span>
                                  : display
                              }
                            </td>
                          );
                        })}

                        {/* Actions col */}
                        <td className={`py-2 px-3 text-center sticky right-0 border-l border-slate-100 dark:border-slate-700 whitespace-nowrap ${
                          isEdit ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            {isEdit ? (
                              <>
                                <button onClick={saveEdit}
                                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm" title="Save">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={cancelEdit}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all" title="Cancel">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => startEdit(row)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Edit">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => setShowDeletePrompt(row.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Summary footer */}
                {tableData.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                      {visibleColumns.map((col, idx) => {
                        let cell = null;
                        if (idx === 0) cell = <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TOTAL</span>;
                        if (col.label === 'Estimated')         cell = <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">{format(totalEstimated, false)}</span>;
                        if (col.label === 'Total utilization') cell = <span className={`font-mono font-bold text-xs ${isOverBudget ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{format(totalUtilization, false)}</span>;
                        if (col.label === 'Balance')           cell = <span className={`font-mono font-bold text-xs ${totalBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{format(totalBalance, false)}</span>;
                        const num = isMonetary(col.label) || col.label === 'Unit count';
                        return (
                          <td key={col.id} className={`py-3 px-4 ${num ? 'text-right' : ''}`}>{cell}</td>
                        );
                      })}
                      <td className="py-3 px-3 sticky right-0 bg-slate-50 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            {sortedData.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Rows per page:</span>
                  <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none">
                    {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <span className="text-xs text-slate-500">
                    {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPageNumbers().map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        p === currentPage
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── REVISIONS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'Revisions' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* ... (existing content) */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Budget Revision Requests</h2>
            </div>
            <button onClick={fetchRevisions} disabled={fetchingRevisions}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw className={`h-4 w-4 ${fetchingRevisions ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  {['Project', 'Requested By', 'Prev Budget', 'New Budget', 'Delta', 'Status', 'Attachment', 'Actions']
                    .map(h => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${
                        ['Prev Budget', 'New Budget', 'Delta'].includes(h) ? 'text-right' : ''
                      } ${h === 'Actions' ? 'text-center' : ''}`}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {fetchingRevisions ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fetching revisions...</p>
                    </td>
                  </tr>
                ) : revisions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <History className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-400">No revision requests</p>
                    </td>
                  </tr>
                ) : revisions.map(rev => {
                  const delta = (rev.revised_budget || 0) - (rev.previous_budget || 0);
                  return (
                    <tr key={rev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rev.project_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">#{rev.id}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{rev.pm_name || '—'}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-600 dark:text-slate-400">{format(rev.previous_budget, false)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-blue-600">{format(rev.revised_budget, false)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-xs font-semibold font-mono ${delta >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {delta >= 0 ? '+' : ''}{format(delta, false)}
                        </span>
                      </td>
                      <td className="py-3 px-4"><RevisionBadge status={rev.status} /></td>
                      <td className="py-3 px-4">
                        {rev.attachment_name
                          ? <button onClick={() => handleDownloadAttachment(rev.id, rev.attachment_name)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                              <Download className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[100px]">{rev.attachment_name}</span>
                            </button>
                          : <span className="text-xs text-slate-400">No file</span>
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {isHead && rev.status === 'Pending Head' && (
                            <>
                              <button onClick={() => handleStatusUpdate(rev.id, 'Pending Finance')} title="Send to Finance"
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleStatusUpdate(rev.id, 'Cancelled')} title="Cancel"
                                className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {isFinance && rev.status === 'Pending Finance' && (
                            <>
                              <button onClick={() => handleStatusUpdate(rev.id, 'Approved')} title="Approve"
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setShowWaitingModal(rev.id)} title="Set Waiting Period"
                                className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm">
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleStatusUpdate(rev.id, 'Declined')} title="Decline"
                                className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {!['Pending Head', 'Pending Finance'].includes(rev.status) && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BUDGET ANALYTICS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'Analytics' && (
        <div className="space-y-6">
          {/* Stepper Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Budget Revision Lifecycle</h2>
              <p className="text-sm text-slate-500">Track the approval stages for {selectedProject || 'the selected project'}</p>
            </div>

            {(() => {
              const latestRev = revisions.find(r => r.project_name === selectedProject);
              const status = latestRev?.status || 'None';
              
              const steps = [
                { id: 'PM', label: 'Project Manager', sub: 'Request Submitted', icon: User, done: !!latestRev },
                { id: 'Head', label: 'Department Head', sub: 'Head Review', icon: ShieldCheck, done: ['Pending Finance', 'Approved'].includes(status) },
                { id: 'Finance', label: 'Finance Team', sub: 'Final Approval', icon: Banknote, done: status === 'Approved' }
              ];

              return (
                <div className="relative flex items-center justify-between max-w-4xl mx-auto py-4">
                  {/* Progress Line Background */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2" />
                  
                  {/* Animated Progress Line */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${steps.filter(s => s.done).length === 3 ? 100 : steps.filter(s => s.done).length === 2 ? 50 : steps.filter(s => s.done).length === 1 ? 0 : 0}%` }}
                    className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-10 origin-left"
                    transition={{ duration: 0.8, ease: "circOut" }}
                  />

                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = (idx === 0 && !latestRev) || 
                                     (idx === 1 && status === 'Pending Head') || 
                                     (idx === 2 && status === 'Pending Finance');
                    
                    return (
                      <div key={step.id} className="relative z-20 flex flex-col items-center">
                        <motion.div 
                          initial={false}
                          animate={{ 
                            scale: step.done ? 1.1 : 1,
                            backgroundColor: step.done ? '#3b82f6' : isActive ? '#fff' : '#f8fafc',
                            borderColor: step.done ? '#3b82f6' : isActive ? '#3b82f6' : '#e2e8f0'
                          }}
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                            isActive ? 'ring-4 ring-blue-500/10' : ''
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${step.done ? 'text-white' : isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                        </motion.div>
                        <div className="absolute top-full mt-4 text-center whitespace-nowrap">
                          <p className={`text-xs font-bold uppercase tracking-wider ${step.done || isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${step.done ? 'text-blue-600' : 'text-slate-400'}`}>
                            {step.done ? 'Completed' : isActive ? 'Processing...' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <History className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Revision Count</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-200">
                {revisions.filter(r => r.project_name === selectedProject).length}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Total requests submitted</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Approval Rate</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-200">
                {(() => {
                  const projRevs = revisions.filter(r => r.project_name === selectedProject);
                  if (projRevs.length === 0) return '0%';
                  const approved = projRevs.filter(r => r.status === 'Approved').length;
                  return `${Math.round((approved / projRevs.length) * 100)}%`;
                })()}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Successful final approvals</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pending Review</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-200">
                {revisions.filter(r => r.project_name === selectedProject && ['Pending Head', 'Pending Finance'].includes(r.status)).length}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Requests awaiting action</p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* ── Budget Template Modal ────────────────────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Budget Upload Template</h3>
                <p className="text-xs text-slate-500 mt-0.5">Preview the required format for Excel uploads</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Standard Headers
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    "Category", "Item Name", "Unit Type", "Unit count", 
                    "Per unit cost", "Utilized", "Commitment", "Status", "Comments"
                  ].map(header => (
                    <div key={header} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {header}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Unit Type</th>
                      <th className="px-4 py-3">Unit count</th>
                      <th className="px-4 py-3">Per unit cost</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 dark:text-slate-400">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">CAPEX</td>
                      <td className="px-4 py-3">Laptop Dell XPS</td>
                      <td className="px-4 py-3">Nos</td>
                      <td className="px-4 py-3">5</td>
                      <td className="px-4 py-3">1,20,000</td>
                      <td className="px-4 py-3">In Progress</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Revenue</td>
                      <td className="px-4 py-3">Software License</td>
                      <td className="px-4 py-3">Nos</td>
                      <td className="px-4 py-3">1</td>
                      <td className="px-4 py-3">50,000</td>
                      <td className="px-4 py-3">Completed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowTemplateModal(false)}
                className="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors">
                Close
              </button>
              <button onClick={handleDownloadTemplate}
                className="px-8 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Template (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetMaster;
