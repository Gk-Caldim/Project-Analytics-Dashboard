import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import SearchableDropdown from '../../components/SearchableDropdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Send, Eye, CheckCircle2, ChevronUp, ChevronDown, TrendingUp, ArrowUpRight, ArrowDownRight, Target, Save, RefreshCw, FileDown, FileSpreadsheet, FileText, Download, Sparkles, Inbox, PieChart, ShieldAlert, History, Plus, Columns, Trash2, ClipboardList, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useCurrency from '../../hooks/useCurrency';

const MONETARY_COLS = ['Per unit cost', 'Estimated', 'Utilized', 'Commitment', 'Total utilization', 'Balance'];
const READONLY_COLS = ['Estimated', 'Total utilization', 'Balance'];
const NUMERIC_COLS = ['Unit count', 'Per unit cost', 'Utilized', 'Commitment'];

const initialColumns = [
  { id: 'sno', label: 'Sno', visible: true, type: 'text' },
  { id: 'category', label: 'Category', visible: true, type: 'text' },
  { id: 'item_name', label: 'Item Name', visible: true, type: 'text' },
  { id: 'unit_type', label: 'Unit Type', visible: true, type: 'text' },
  { id: 'unit_count', label: 'Unit count', visible: true, type: 'number' },
  { id: 'per_unit_cost', label: 'Per unit cost', visible: true, type: 'currency' },
  { id: 'estimated', label: 'Estimated', visible: true, type: 'currency' },
  { id: 'utilized', label: 'Utilized', visible: true, type: 'currency' },
  { id: 'commitment', label: 'Commitment', visible: true, type: 'currency' },
  { id: 'total_utilization', label: 'Total utilization', visible: true, type: 'currency' },
  { id: 'balance', label: 'Balance', visible: true, type: 'currency' },
  { id: 'status', label: 'Status', visible: true, type: 'status' },
  { id: 'comments', label: 'Comments', visible: true, type: 'text' },
];

const isMonetary = (label) => MONETARY_COLS.includes(label);
const isReadonly = (label) => READONLY_COLS.includes(label);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ value }) => {
  const cfg = {
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    'On Hold': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    'Cancelled': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  };
  return (
    <span className={`px-3 py-1.5 rounded-md border text-[10px] font-bold ${cfg[value] || 'bg-app-bg dark:bg-slate-800/50 text-slate-700 border-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
      {value || 'Pending'}
    </span>
  );
};

// ─── Revision Status Badge ────────────────────────────────────────────────────
const RevisionBadge = ({ status }) => {
  const dots = {
    'Approved': 'bg-emerald-500 dark:bg-emerald-400',
    'Declined': 'bg-rose-500 dark:bg-rose-400',
    'Cancelled': 'bg-slate-400 dark:bg-slate-500',
    'In Waiting Period': 'bg-amber-500 dark:bg-amber-400',
    'Pending Head': 'bg-blue-500 dark:bg-blue-400',
    'Pending Finance': 'bg-violet-500 dark:bg-violet-400',
  };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status] || 'bg-slate-400'}`} />
      {status}
    </span>
  );
};


// ─── Summary Card (Static Aggregate View) ───────────────────────────────────
const SummaryCard = ({ label, value, color, format, subLabel, count, extraStat }) => {
  return (
    <div className="bg-app-surface dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 flex justify-between items-center overflow-hidden relative">
      {/* Decorative vertical accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        color === 'red' ? 'bg-red-500' :
        color === 'blue' ? 'bg-blue-500' :
        'bg-emerald-500'
      } opacity-20`}></div>

      <div className="flex-1">
        <div className="flex flex-col mb-6">
          <p className="text-xs font-black text-slate-400 dark:text-slate-100 uppercase tracking-[0.2em] mb-1">{label}</p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 italic uppercase tracking-wider">{subLabel}</p>
        </div>
        <p className={`text-3xl font-black tracking-tighter ${
          color === 'red' ? 'text-red-600 dark:text-red-400' :
          color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
          color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
          'text-slate-900 dark:text-slate-100'
        }`}>
          {format(value)}
        </p>
      </div>

      {/* Right Side Metadata - Clean & Functional Context */}
      <div className="pl-10 ml-6 border-l border-slate-100 dark:border-slate-800 dark:border-slate-800/50 flex flex-col gap-5 text-right min-w-[140px]">
        {extraStat && (
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">{extraStat.label}</p>
            <p className={`text-xs font-black tracking-tight ${extraStat.color || 'text-slate-500 dark:text-slate-100'}`}>
              {extraStat.value}
            </p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Items Processed</p>
          <p className="text-xs font-black text-slate-500 dark:text-slate-100 tracking-tight">{count} Rows</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BudgetMaster = () => {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [overallBudget, setOverallBudget] = useState(0);
  const [managerName, setManagerName] = useState('');

  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState(initialColumns);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState('');

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const [historyData, setHistoryData] = useState([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [latestBudgetsMap, setLatestBudgetsMap] = useState({});
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [fetchingAudit, setFetchingAudit] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [budgetDate, setBudgetDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempFile, setTempFile] = useState(null);
  const [saveType, setSaveType] = useState('save'); // 'save' or 'sync'

  const [activeTab, setActiveTab] = useState('Table');

  // Revision state
  const [showNewRevisionForm, setShowNewRevisionForm] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revisionData, setRevisionData] = useState({ revised_budget: '', reasons: '', attachment: null });
  const [fetchingRevisions, setFetchingRevisions] = useState(false);
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [waitingDate, setWaitingDate] = useState('');
  const [showWaitingModal, setShowWaitingModal] = useState(null);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);

  // Market Analysis state
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [fetchingMarket, setFetchingMarket] = useState(false);
  const [showMarketSuggestion, setShowMarketSuggestion] = useState(false);

  // Custom Column State
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnData, setNewColumnData] = useState({ label: '', type: 'text' });
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const user = useSelector(state => state.auth.user);
  const userRole = user?.role || 'Employee';
  const isPM = userRole === 'Project Manager';
  const isHead = ['Head', 'Admin', 'Super Admin'].includes(userRole);
  const isFinance = ['Finance', 'Admin', 'Super Admin'].includes(userRole);
  const { format, convert, code } = useCurrency();

  // ─── Permission helper ─────────────────────────────────────────────────────
  // Permissions are stored as ["Budget Master", "Budget Master:view_budget", ...]
  const userPerms = user?.permissions || [];
  const hasBudgetModule = userPerms.includes('Budget Master') || userPerms.includes('Budget Upload');
  const hasBudgetPerm = (sub) => {
    // Admins and Super Admins bypass all checks
    if (['Admin', 'Super Admin'].includes(userRole)) return true;
    // Must have the parent module enabled first
    if (!hasBudgetModule) return false;
    return userPerms.includes(`Budget Master:${sub}`) || userPerms.includes(sub);
  };

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
      fetchHistory(); // Ensure history is ready for duplicate checks
      setUploadedFile(null);
    } else {
      setTableData([]);
      setHistoryData([]);
      setUploadedFile(null);
      setAttachmentName(null);
    }
    setCurrentPage(1);
  }, [selectedProject]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [projRes, empRes, budgetRes] = await Promise.all([
        API.get('/projects/'),
        API.get('/employees/'),
        API.get('/budget/').catch(() => ({ data: [] }))
      ]);
      setProjects(projRes.data || []);
      setEmployees(empRes.data || []);
      
      const latestBudgets = {};
      (budgetRes?.data || []).forEach(b => {
        if (!latestBudgets[b.project_name] || new Date(b.updated_at) > new Date(latestBudgets[b.project_name].updated_at)) {
          latestBudgets[b.project_name] = b;
        }
      });
      setLatestBudgetsMap(latestBudgets);
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
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ─── Pagination for History ───────────────────────────────────────────────────
  const filteredHistoryData = useMemo(() => {
    if (historyFilter === 'All') return historyData;
    if (historyFilter === 'Upload') return historyData.filter(item => item.attachment_name);
    if (historyFilter === 'Save') return historyData.filter(item => !item.attachment_name);
    return historyData;
  }, [historyData, historyFilter]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistoryData.length / historyItemsPerPage));
  const paginatedHistoryData = useMemo(() => {
    const start = (historyCurrentPage - 1) * historyItemsPerPage;
    return filteredHistoryData.slice(start, start + historyItemsPerPage);
  }, [filteredHistoryData, historyCurrentPage, historyItemsPerPage]);

  const getHistoryPageNumbers = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, historyCurrentPage - 2);
    let end = Math.min(totalHistoryPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ─── Row Editing ────────────────────────────────────────────────────────────
  const recalc = (data) => ({
    ...data,
    'Estimated': (parseFloat(data['Unit count']) || 0) * (parseFloat(data['Per unit cost']) || 0),
    'Total utilization': (parseFloat(data['Utilized']) || 0) + (parseFloat(data['Commitment']) || 0),
    get 'Balance'() { return this['Estimated'] - this['Total utilization']; }
  });

  const handleEditChange = (label, value) => {
    const col = columns.find(c => c.label === label);
    let val = value;

    // Preserve data types
    if (col?.type === 'number' || col?.type === 'currency') {
      const parsed = parseFloat(value);
      val = isNaN(parsed) ? (value === '' ? '' : value) : parsed;
      
      // If it's a monetary column, convert from current currency to USD for storage
      if (col?.type === 'currency' && val !== '') {
        val = convert(val, code, 'USD');
      }
    }

    setEditingData(prev => {
      const next = { ...prev, [label]: val };
      if ([...NUMERIC_COLS, 'Utilized', 'Commitment'].includes(label)) {
        const uc = parseFloat(next['Unit count']) || 0;
        const puc = parseFloat(next['Per unit cost']) || 0;
        const ut = parseFloat(next['Utilized']) || 0;
        const comm = parseFloat(next['Commitment']) || 0;
        next['Estimated'] = uc * puc;
        next['Total utilization'] = ut + comm;
        next['Balance'] = next['Estimated'] - next['Total utilization'];
      }
      return next;
    });
  };

  const addColumn = () => {
    if (!newColumnData.label) { toast.error('Column label is required'); return; }
    if (columns.some(c => c.label.toLowerCase() === newColumnData.label.toLowerCase())) {
      toast.error('Column already exists');
      return;
    }

    const newCol = {
      id: `custom_${Date.now()}`,
      label: newColumnData.label,
      visible: true,
      type: newColumnData.type,
      custom: true
    };

    setColumns(prev => [...prev, newCol]);
    setTableData(prev => prev.map(row => ({ ...row, [newCol.label]: '' })));
    setShowAddColumnModal(false);
    setNewColumnData({ label: '', type: 'text' });
    toast.success(`Column "${newCol.label}" added`);
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
  const saveEdit = () => {
    setTableData(prev => prev.map(r => r.id === editingRowId ? { ...editingData } : r));
    setEditingRowId(null);
    setEditingData({});
    toast.success('Row updated');
  };
  const cancelEdit = () => { setEditingRowId(null); setEditingData({}); };

  const confirmDeleteRow = () => {
    setTableData(prev => prev.filter(r => r.id !== showDeletePrompt));
    setShowDeletePrompt(null);
    if (editingRowId === showDeletePrompt) { setEditingRowId(null); setEditingData({}); }
    toast.success('Row removed');
  };

  // ─── Excel Import ────────────────────────────────────────────────────────────
  const executeUpload = () => {
    const file = tempFile;
    if (!file) return;
    setIsParsing(true);
    setUploadedFile(file);
    setShowUploadModal(false);
    setShowOverwriteWarning(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (raw.length < 2) { toast.error('No data in file'); return; }
          const headers = raw[0].map(h => String(h).trim().toLowerCase());
          const rows = [];
          for (let i = 1; i < raw.length; i++) {
            const rv = raw[i];
            if (!rv || !rv.some(v => v !== undefined && String(v).trim() !== '')) continue;
            const row = { id: `row_${Date.now()}_${i}` };
            columns.forEach(col => {
              const idx = headers.indexOf(col.label.toLowerCase());
              let val = idx !== -1 && rv[idx] !== undefined ? rv[idx] : '';
              
              // If it's a monetary column, assume the Excel has values in the current currency
              // and convert them to USD for internal storage.
              if (col.type === 'currency' && val !== '' && !isNaN(parseFloat(val))) {
                val = convert(parseFloat(val), code, 'USD');
              }
              
              row[col.label] = val;
            });
            rows.push(recalc(row));
          }
          setTableData(rows);
          toast.success(`Imported ${rows.length} items. Don't forget to Save!`);
          setActiveTab('Table');
        } catch (err) {
          toast.error('Excel parse failed');
        } finally {
          setIsParsing(false);
          setTempFile(null);
        }
      }, 500);
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

    toast.success('Template downloaded successfully');
  };

  // ─── Save to DB ──────────────────────────────────────────────────────────────
  // ─── Save to DB ──────────────────────────────────────────────────────────────
  const handleSave = (syncToProject = false) => {
    if (!selectedProject) { toast.error('Please select a project first'); return; }
    setSaveType(syncToProject ? 'sync' : 'save');
    setShowDateModal(true);
  };

  const executeSave = async () => {
    setSaving(true);
    setShowDateModal(false);
    try {
      const dataToSave = tableData.map(r => {
        const src = (editingRowId && r.id === editingRowId) ? editingData : r;
        const row = {};
        columns.forEach(c => { row[c.label] = src[c.label]; });
        return row;
      });
      const fd = new FormData();
      fd.append('project_name', selectedProject);
      fd.append('budget_date', budgetDate);
      fd.append('overall_budget', parseFloat(overallBudget) || 0);
      fd.append('uploaded_by', user?.role || user?.full_name || 'Unknown');
      fd.append('user_id', user?.employee_id || String(user?.id || ''));
      fd.append('budget_data', JSON.stringify(dataToSave));
      fd.append('sync_to_project', saveType === 'sync');
      if (uploadedFile) fd.append('file', uploadedFile);

      await API.post(`/budget/${encodeURIComponent(selectedProject)}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      fetchHistory(); // Refresh history so the next upload check sees this new version
      toast.success(saveType === 'sync' ? 'Budget saved and synced to Project Master' : 'Budget version saved');
      if (editingRowId) { setEditingRowId(null); setEditingData({}); }
    } catch (err) {
      toast.error('Save failed — ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ─── Revision handlers ───────────────────────────────────────────────────────
  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !revisionData.revised_budget || !revisionData.reasons) {
      toast.error('Fill all required fields'); return;
    }
    setSubmittingRevision(true);
    try {
      const proj = projects.find(p => p.name === selectedProject);
      const fd = new FormData();
      fd.append('project_id', proj?.project_id || '');
      fd.append('project_name', selectedProject);
      fd.append('pm_name', user?.full_name || managerName || 'Unknown');
      fd.append('previous_budget', parseFloat(overallBudget) || 0);
      fd.append('revised_budget', (parseFloat(overallBudget) || 0) + (parseFloat(revisionData.revised_budget) || 0));
      fd.append('reasons', revisionData.reasons);
      if (revisionData.attachment) fd.append('file', revisionData.attachment);
      await API.post('/budget/revisions/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Revision request submitted');
      setShowNewRevisionForm(false);
      setRevisionData({ revised_budget: '', reasons: '', attachment: null });
      fetchRevisions();
    } catch (err) {
      toast.error('Failed to submit revision');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, extra = {}) => {
    try {
      await API.patch(`/budget/revisions/${id}`, { status: newStatus, ...extra });

      if (newStatus === 'Approved') {
        toast.success('Budget approved - new budget updated');
      } else if (['Declined', 'Cancelled'].includes(newStatus)) {
        toast.error('Budget not approved');
      } else {
        toast.success(`Revision ${newStatus.toLowerCase()}`);
      }

      fetchRevisions();
      if (newStatus === 'Approved') {
        fetchInitialData();
        if (selectedProject) fetchBudgetData(selectedProject);
      }
    } catch { toast.error('Failed to update revision'); }
  };

  const fetchHistory = async () => {
    if (!selectedProject) return;
    setFetchingHistory(true);
    try {
      const res = await API.get(`/budget/history/${encodeURIComponent(selectedProject)}`);
      setHistoryData(res.data);
    } catch { toast.error('Failed to fetch budget history'); }
    finally { setFetchingHistory(false); }
  };

  const fetchAuditLogs = async () => {
    if (!selectedProject) return;
    setFetchingAudit(true);
    try {
      const res = await API.get(`/budget/audits/${encodeURIComponent(selectedProject)}`);
      setAuditLogs(res.data || []);
    } catch { toast.error('Failed to fetch audit logs'); }
    finally { setFetchingAudit(false); }
  };

  const loadVersion = async (id) => {
    try {
      const res = await API.get(`/budget/version/${id}`);
      // Assuming budget_data is stored as objects matching our columns
      setTableData(res.data.budget_data.map((r, i) => ({ ...r, id: r.id || `hist_${i}` })));
      setOverallBudget(res.data.overall_budget || 0);
      setBudgetDate(res.data.budget_date || new Date().toISOString().split('T')[0]);
      setAttachmentName(res.data.attachment_name);
      setActiveTab('Table');
      toast.success('Budget version loaded into table');
    } catch { toast.error('Failed to load version'); }
  };

  const deleteVersion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget version?')) return;
    try {
      await API.delete(`/budget/version/${id}`);
      toast.success('Budget version deleted');
      fetchHistory();
    } catch { toast.error('Failed to delete version'); }
  };

  const handleDownloadAttachment = async (revId, fileName) => {
    try {
      const res = await API.get(`/budget/revisions/${revId}/attachment`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', fileName || 'attachment');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('Download failed'); }
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) { toast.error('No data to export'); return; }
    const exportData = tableData.map(row => {
      const filteredRow = {};
      columns.forEach(col => {
        if (col.visible) filteredRow[col.label] = row[col.label];
      });
      return filteredRow;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget");
    XLSX.writeFile(wb, `Budget_${selectedProject || 'Export'}.xlsx`);
    toast.success('Exported as Excel');
  };

  const handleFetchMarketAnalysis = async () => {
    if (!selectedProject) { toast.success('Please select a project first', 'error'); return; }
    setFetchingMarket(true);
    try {
      const res = await API.get(`/budget/proposal/${encodeURIComponent(selectedProject)}?currency=${encodeURIComponent(code)}`);
      setMarketAnalysis(res.data);
      setShowMarketSuggestion(true);
      toast.success('Market analysis completed');
    } catch (err) {
      toast.error('Failed to fetch market analysis');
    } finally {
      setFetchingMarket(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (!marketAnalysis) return;
    setRevisionData({ 
      ...revisionData, 
      revised_budget: marketAnalysis.delta.toString(),
      reasons: marketAnalysis.reasoning
    });
    setShowMarketSuggestion(false);
    toast.success('Suggestion applied with detailed reasoning');
  };

  const handleExportPDF = () => {
    try {
      if (tableData.length === 0) { toast.error('No data to export'); return; }
      
      // Initialize landscape A4 document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Header Section
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Project Budget Plan", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Project: ${selectedProject || 'Not Selected'}`, 14, 28);
      doc.text(`Effective Date: ${budgetDate || new Date().toLocaleDateString()}`, 14, 33);
      doc.text(`Exported On: ${new Date().toLocaleString()}`, 14, 38);

      // Horizontal Divider
      doc.setDrawColor(241, 245, 249);
      doc.line(14, 42, 283, 42);

      // Data Preparation
      const visibleCols = columns.filter(c => c.visible);
      const tableHeaders = [visibleCols.map(c => c.label)];
      const tableRows = tableData.map(row => 
        visibleCols.map(c => {
          const val = row[c.label];
          if (val === undefined || val === null) return '-';
          if (MONETARY_COLS.includes(c.label)) {
            try {
              return format(val);
            } catch {
              return String(val);
            }
          }
          return String(val);
        })
      );

      // Render Table
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 45,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [51, 65, 85], // slate-700
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        margin: { top: 45, right: 14, bottom: 20, left: 14 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        }
      });

      doc.save(`Budget_Report_${selectedProject || 'Export'}_${new Date().getTime()}.pdf`);
      toast.success('PDF Exported Successfully');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to generate PDF. Please check table data.');
    }
  };

  const handleDownloadBudgetFile = async (projectName, fileName) => {
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}/attachment`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', fileName || 'budget_master.xlsx');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { toast.error('No file stored or download failed'); }
  };

  // ─── Computed summary ────────────────────────────────────────────────────────
  const totalUtilization = tableData.reduce((s, r) => s + (parseFloat(r['Total utilization']) || 0), 0);
  const totalEstimated = tableData.reduce((s, r) => s + (parseFloat(r['Estimated']) || 0), 0);
  const totalBalance = tableData.reduce((s, r) => s + (parseFloat(r['Balance']) || 0), 0);
  const totalUtilized = tableData.reduce((s, r) => s + (parseFloat(r['Utilized']) || 0), 0);
  const totalCommitment = tableData.reduce((s, r) => s + (parseFloat(r['Commitment']) || 0), 0);
  
  const estimatedBreakdown = Object.entries(
    tableData.reduce((acc, r) => {
      const cat = r.Category || 'Other';
      acc[cat] = (acc[cat] || 0) + (parseFloat(r.Estimated) || 0);
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 4); // Show top 4 categories

  const isOverBudget = totalUtilization > parseFloat(overallBudget);
  const visibleColumns = columns.filter(c => c.visible);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="master-table-container bg-app-surface dark:bg-slate-900 transition-colors duration-300 min-h-screen">


      {/* ── Delete Row Prompt ────────────────────────────────────────────────── */}
      {showDeletePrompt && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Confirm Delete</h3>
              <button onClick={() => setShowDeletePrompt(null)} className="app-modal-close-btn">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="app-modal-body py-4">
              <p className="text-base text-slate-600 dark:text-slate-100 mb-2">Remove this budget entry?</p>
              <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
            </div>
            <div className="app-modal-footer">
              <button onClick={() => setShowDeletePrompt(null)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button onClick={confirmDeleteRow}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── Add Column Modal ────────────────────────────────────────────────── */}
      {showAddColumnModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Add New Column</h3>
              <button onClick={() => setShowAddColumnModal(false)} className="app-modal-close-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Column Label</label>
                <input 
                  type="text" 
                  value={newColumnData.label}
                  onChange={e => setNewColumnData({ ...newColumnData, label: e.target.value })}
                  placeholder="e.g., Tax Rate"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Data Type</label>
                <select 
                  value={newColumnData.type}
                  onChange={e => setNewColumnData({ ...newColumnData, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-slate-100"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowAddColumnModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button onClick={addColumn}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Waiting Period Modal ─────────────────────────────────────────────── */}
      {showWaitingModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <div>
                <h3 className="app-modal-title">Set Waiting Period</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Defer revision until a specific date</p>
              </div>
              <button onClick={() => { setShowWaitingModal(null); setWaitingDate(''); }}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Defer Until</label>
                <input type="date" min={new Date().toISOString().split('T')[0]}
                  value={waitingDate}
                  onChange={e => setWaitingDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-slate-100" />
              </div>
            </div>
            <div className="app-modal-footer">
              <button onClick={() => { setShowWaitingModal(null); setWaitingDate(''); }}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button disabled={!waitingDate}
                onClick={() => { handleStatusUpdate(showWaitingModal, 'In Waiting Period', { waiting_until: waitingDate }); setShowWaitingModal(null); setWaitingDate(''); }}
                className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors disabled:opacity-40">
                Set Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 py-8 border-b border-slate-200 dark:border-slate-700 mb-8 px-8 bg-app-surface dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Budget Master</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage project budgets and revision workflows</p>
          </div>
        </div>

        {/* Breadcrumb Tab Navigation */}
        <nav className="flex items-center space-x-4">
          <div className="flex items-center">
            <button onClick={() => setActiveTab('Table')}
              className={`text-sm transition-all ${activeTab === 'Table'
                ? 'font-black text-slate-900 dark:text-slate-100'
                : 'font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}>
              Budget Table
            </button>
            <span className="mx-4 text-slate-300 dark:text-slate-700 font-light text-xl">›</span>
          </div>

          {(isHead || isFinance || isPM) && (
            <div className="flex items-center">
              <button onClick={() => { setActiveTab('Revisions'); fetchRevisions(); }}
                className={`text-sm transition-all relative ${activeTab === 'Revisions'
                  ? 'font-black text-slate-900 dark:text-slate-100'
                  : 'font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                Revision Budget
                {revisions.filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance').length > 0 && (
                  <span className="absolute -top-2 -right-6 px-1.5 py-0.5 text-[8px] font-black bg-blue-600 text-white rounded-none">
                    {revisions.filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance').length}
                  </span>
                )}
              </button>
              <span className="mx-4 text-slate-300 dark:text-slate-700 font-light text-xl">›</span>
            </div>
          )}

          <div className="flex items-center">
            <button onClick={() => { setActiveTab('Analytics'); fetchRevisions(); }}
              className={`text-sm transition-all ${activeTab === 'Analytics'
                ? 'font-black text-slate-900 dark:text-slate-100'
                : 'font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}>
              Budget Analytics
            </button>
            <span className="mx-4 text-slate-300 dark:text-slate-700 font-light text-xl">›</span>
          </div>

          <div className="flex items-center">
            <button onClick={() => { setActiveTab('History'); fetchHistory(); }}
              className={`text-sm transition-all ${activeTab === 'History'
                ? 'font-black text-slate-900 dark:text-slate-100'
                : 'font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}>
              Budget History
            </button>
          </div>
        </nav>
      </div>

      {/* ── Main Content Scroll Area ────────────────────────────────────────── */}
      <div className="master-table-scroll bg-app-bg/50 dark:bg-slate-950/50 transition-colors duration-300">
        <div className="master-table-scroll-inner p-8 space-y-8">

          {/* ── BUDGET TABLE TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'Table' && (
            <>
              {/* Control Panel */}
              <div className="bg-app-surface dark:bg-slate-800 rounded-sm border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                      Active Project
                    </label>
                    <SearchableDropdown
                      options={projects.map(p => {
                        const latest = latestBudgetsMap[p.name];
                        let label = p.name;
                        if (latest && latest.updated_at) {
                          const hours = Math.floor((new Date() - new Date(latest.updated_at)) / (1000 * 60 * 60));
                          const timeStr = hours < 1 ? 'Just now' : `${hours} hours ago`;
                          label = `${p.name} (updated ${timeStr})`;
                        }
                        return { value: p.name, label };
                      })}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      placeholder="Select a project..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                      Overall Budget
                    </label>
                    <input type="number"
                      value={convert(overallBudget, 'USD', code)}
                      onChange={e => setOverallBudget(convert(parseFloat(e.target.value) || 0, code, 'USD'))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 text-base bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                      Project Manager
                    </label>
                    <div className="w-full px-4 py-3 text-base bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-100 font-bold min-h-[48px] flex items-center">
                      {managerName || '— Unassigned —'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Over-budget Warning */}
              {selectedProject && isOverBudget && (
                <div className="px-8 py-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-4">
                  <div>
                    <p className="text-base font-bold text-red-800 dark:text-red-400">Project is Over Budget</p>
                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                      Total utilization <strong>{format(totalUtilization)}</strong> exceeds budget <strong>{format(parseFloat(overallBudget))}</strong> by <strong>{format(totalUtilization - parseFloat(overallBudget))}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              {(selectedProject || tableData.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <SummaryCard
                    label="Total Estimated"
                    value={totalEstimated}
                    color="blue"
                    format={format}
                    subLabel="Summation of Estimated Values"
                    count={tableData.length}
                    extraStat={{ label: 'Project Lead', value: managerName || 'Unassigned' }}
                  />
                  <SummaryCard
                    label="Total Utilization"
                    value={totalUtilization}
                    color={isOverBudget ? 'red' : 'emerald'}
                    format={format}
                    subLabel="Summation of (Utilized + Commitment)"
                    count={tableData.length}
                    extraStat={{ 
                      label: 'Budget Limit', 
                      value: format(parseFloat(overallBudget)),
                      color: isOverBudget ? 'text-red-500' : 'text-slate-500 dark:text-slate-300'
                    }}
                  />
                  <SummaryCard
                    label="Total Balance"
                    value={totalBalance}
                    color={totalBalance < 0 ? 'red' : 'emerald'}
                    format={format}
                    subLabel="Summation of Balance Remaining"
                    count={tableData.length}
                    extraStat={{ 
                      label: 'Approved Revisions', 
                      value: `${revisions.filter(r => r.project_name === selectedProject && r.status === 'Approved').length} Revisions`,
                      color: 'text-slate-500 dark:text-slate-300 dark:text-slate-100'
                    }}
                  />
                </div>
              )}

              {/* Table Toolbar */}
              <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 dark:border-slate-700 flex flex-wrap items-center gap-4">
                  {/* Add Item — needs add_row OR add_column permission */}
                  {(hasBudgetPerm('add_row') || hasBudgetPerm('add_column')) && (
                  <div className="relative">
                    <button onClick={() => setShowAddDropdown(!showAddDropdown)}
                      className="h-10 px-6 text-sm font-bold bg-slate-900 dark:bg-slate-700 text-white rounded-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-sm flex items-center gap-2">
                      Add Item
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showAddDropdown && (
                      <>
                        <div className="fixed inset-0 z-50" onClick={() => setShowAddDropdown(false)} />
                        <div className="absolute top-full left-0 mt-2 w-48 bg-app-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xl z-50 overflow-hidden">
                          {hasBudgetPerm('add_row') && (
                          <button onClick={() => { addRow(); setShowAddDropdown(false); }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-100 transition-colors">
                            <Plus className="w-4 h-4 text-blue-500" />
                            <span>Add Row</span>
                          </button>
                          )}
                          {hasBudgetPerm('add_column') && (
                          <button onClick={() => { setShowAddColumnModal(true); setShowAddDropdown(false); }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/50 flex items-center gap-3 text-slate-700 dark:text-slate-100 transition-colors border-t border-slate-100 dark:border-slate-800 dark:border-slate-700/50">
                            <Columns className="w-4 h-4 text-emerald-500" />
                            <span>Add Column</span>
                          </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  )}

                  {/* Save — needs save_budget permission */}
                  {hasBudgetPerm('save_budget') && (
                  <div className="relative">
                    <div className="flex items-stretch h-10">
                      <button onClick={() => handleSave(false)} disabled={saving || !selectedProject}
                        className="flex items-center gap-2 px-6 text-sm font-bold bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 border-r border-blue-500/30">
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button onClick={() => setShowSaveDropdown(!showSaveDropdown)} disabled={saving || !selectedProject}
                        className="px-4 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center">
                        <span className="text-xs">▼</span>
                      </button>
                    </div>

                    {showSaveDropdown && (
                      <>
                        <div className="fixed inset-0 z-50" onClick={() => setShowSaveDropdown(false)} />
                        <div className="absolute top-full left-0 mt-2 w-72 bg-app-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <button onClick={() => { handleSave(false); setShowSaveDropdown(false); }}
                            className="w-full px-6 py-4 text-left text-sm hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/50 flex items-center gap-4 text-slate-700 dark:text-slate-100 transition-colors">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 font-bold">
                              <Save className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">Save Budget</p>
                              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Save changes to budget master</p>
                            </div>
                          </button>
                          <button onClick={() => { handleSave(true); setShowSaveDropdown(false); }}
                            className="w-full px-6 py-4 text-left text-sm hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/50 flex items-center gap-4 text-slate-700 dark:text-slate-100 transition-colors border-t border-slate-100 dark:border-slate-800 dark:border-slate-700/50">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md text-emerald-600 font-bold">
                              <RefreshCw className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">Save & Sync to Project Master</p>
                              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Updates project's budget summary</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  )}

                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                  {/* Upload Budget — needs upload_budget permission */}
                  {hasBudgetPerm('upload_budget') && (
                  <div className="relative group">
                    <button
                      onClick={() => {
                        if (!selectedProject) { toast.error('Please select a project first'); return; }
                        setShowUploadModal(true);
                      }}
                      className="h-10 px-6 text-sm font-bold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                    >
                      {isParsing ? 'Parsing...' : 'Upload Budget'}
                    </button>
                  </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="h-10 px-6 text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                      <FileDown className="w-4 h-4" />
                      Export / Download
                      <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showExportDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 mt-2 w-64 bg-app-surface dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-50 overflow-hidden"
                          >
                            <div className="px-4 py-2 mb-2 border-b border-slate-50 dark:border-slate-800">
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Options</p>
                            </div>
                            
                            <button onClick={() => { handleDownloadTemplate(); setShowExportDropdown(false); }}
                              className="w-full px-6 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-100 hover:bg-app-bg dark:hover:bg-slate-800 transition-colors flex items-center gap-4">
                              <Download className="w-4 h-4 text-blue-500" />
                              Download Template
                            </button>

                            <button onClick={() => { handleExportExcel(); setShowExportDropdown(false); }}
                              className="w-full px-6 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-100 hover:bg-app-bg dark:hover:bg-slate-800 transition-colors flex items-center gap-4">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                              Export as Excel
                            </button>

                            <button onClick={() => { handleExportPDF(); setShowExportDropdown(false); }}
                              className="w-full px-6 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-100 hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors flex items-center gap-4">
                              <FileText className="w-4 h-4 text-red-500" />
                              Export as PDF
                            </button>

                            {attachmentName && (
                              <button onClick={() => { handleDownloadBudgetFile(selectedProject, attachmentName); setShowExportDropdown(false); }}
                                className="w-full px-6 py-3 text-left text-sm font-bold text-slate-700 dark:text-slate-100 hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors flex items-center gap-4 border-t border-slate-50 dark:border-slate-800 mt-2">
                                <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                Download Original
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right: Search + rows info */}
                  <div className="ml-auto flex items-center gap-4">
                    <div className="relative">
                      <input type="text" placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="px-4 py-2 text-xs font-bold bg-app-bg dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-48 transition-all text-slate-900 dark:text-slate-100" />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                      {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-app-bg dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        {visibleColumns.map(col => (
                          <th key={col.id}
                            className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
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
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-100 text-center whitespace-nowrap sticky right-0 bg-app-bg dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 border-b">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {loading || isParsing ? (
                        <tr>
                          <td colSpan={visibleColumns.length + 1} className="py-24 text-center">
                            <p className="text-base font-bold text-blue-600 animate-pulse">
                              {isParsing ? 'Parsing data...' : 'Loading budget...'}
                            </p>
                          </td>
                        </tr>
                      ) : paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={visibleColumns.length + 1} className="py-32 text-center">
                            <p className="text-xl font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-2">No Data Available</p>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Select a project or import an Excel file</p>
                          </td>
                        </tr>
                      ) : paginatedData.map(row => {
                        const isEdit = editingRowId === row.id;
                        return (
                          <tr key={row.id}
                            className={`transition-colors hover:bg-app-bg dark:bg-slate-800/80 dark:hover:bg-slate-700/20 ${isEdit ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                            {visibleColumns.map(col => {
                              const val = isEdit ? editingData[col.label] : row[col.label];
                              const mon = isMonetary(col.label);
                              const ro = isReadonly(col.label);
                              const num = mon || col.label === 'Unit count';

                              if (isEdit) {
                                return (
                                  <td key={col.id} className="px-1 py-1">
                                    {col.type === 'status' ? (
                                      <select value={val || ''}
                                        onChange={e => handleEditChange(col.label, e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-app-surface dark:bg-slate-800 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                                        {['In Progress', 'Completed', 'On Hold', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                                      </select>
                                    ) : (
                                      <input
                                        type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                                        value={col.type === 'currency' ? convert(val, 'USD', code) : (val !== undefined && val !== null ? val : '')}
                                        readOnly={ro}
                                        onChange={e => handleEditChange(col.label, e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-md outline-none transition-all ${ro
                                          ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 cursor-not-allowed'
                                          : 'bg-app-surface dark:bg-slate-800 border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100'
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
                                if (!isNaN(n)) display = format(n);
                              }

                              return (
                                <td key={col.id}
                                  className={`py-4 px-6 text-sm whitespace-nowrap transition-all duration-200 ${ro ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-100'
                                    } ${num ? 'text-right font-semibold' : ''}`}>
                                  {col.label === 'Status'
                                    ? <StatusBadge value={val} />
                                    : col.label === 'Balance' && parseFloat(val) < 0
                                      ? <span className="text-red-600 dark:text-red-400 font-bold">{display}</span>
                                      : display
                                  }
                                </td>
                              );
                            })}

                            {/* Actions col */}
                            <td className={`py-4 px-6 text-center sticky right-0 border-l border-slate-100 dark:border-slate-800 dark:border-slate-700 whitespace-nowrap transition-all duration-200 ${isEdit ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-app-surface dark:bg-slate-800'
                              }`}>
                              <div className="flex items-center justify-center gap-2">
                                {isEdit ? (
                                  <>
                                    <button onClick={saveEdit}
                                      className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-all shadow-sm" title="Save">
                                      Save
                                    </button>
                                    <button onClick={cancelEdit}
                                      className="px-4 py-1.5 text-slate-500 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-all" title="Cancel">
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  hasBudgetPerm('edit_row') && (
                                  <button onClick={() => startEdit(row)}
                                    className="px-4 py-1.5 text-slate-500 dark:text-slate-300 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md text-xs font-bold transition-all" title="Edit">
                                    Edit
                                  </button>
                                  )
                                )}
                                {hasBudgetPerm('delete_row') && (
                                <button onClick={() => setShowDeletePrompt(row.id)}
                                  className="px-4 py-1.5 text-slate-500 dark:text-slate-300 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-xs font-bold transition-all" title="Delete">
                                  Delete
                                </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Summary footer */}
                    {tableData.length > 0 && (
                      <tfoot>
                        <tr className="bg-app-bg dark:bg-slate-800/80 border-t-4 border-slate-200 dark:border-slate-700">
                          {visibleColumns.map((col, idx) => {
                            let cell = null;
                            if (idx === 0) cell = <span className="text-xs font-bold text-slate-500 dark:text-slate-300 dark:text-slate-100">Total</span>;
                            if (col.label === 'Estimated') cell = <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{format(totalEstimated)}</span>;
                            if (col.label === 'Total utilization') cell = <span className={`font-bold text-sm ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{format(totalUtilization)}</span>;
                            if (col.label === 'Balance') cell = <span className={`font-bold text-sm ${totalBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{format(totalBalance)}</span>;
                            const num = isMonetary(col.label) || col.label === 'Unit count';
                            return (
                              <td key={col.id} className={`py-6 px-6 ${num ? 'text-right' : ''}`}>{cell}</td>
                            );
                          })}
                          <td className="py-6 px-6 sticky right-0 bg-app-bg dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700" />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination */}
                {sortedData.length > 0 && (
                  <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 dark:border-slate-700 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300 dark:text-slate-300">Rows per page:</span>
                    <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-4 py-1.5 text-xs font-bold bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none transition-all focus:ring-4 focus:ring-slate-500/10 text-slate-900 dark:text-slate-100">
                      {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                    </select>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300 dark:text-slate-300">
                      {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
                    </span>
                  </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                        className="px-4 py-2 text-xs font-bold rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        First
                      </button>
                      {getPageNumbers().map(p => (
                        <button key={p} onClick={() => setCurrentPage(p)}
                          className={`w-10 h-10 flex items-center justify-center text-xs font-black rounded-md transition-all ${p === currentPage
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700'
                            }`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                        className="px-4 py-2 text-xs font-bold rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── REVISIONS TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'Revisions' && (
            <div className="space-y-6">
              {isPM && selectedProject && (
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Budget Revision Management</h2>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">Submit and track revision requests for <span className="text-slate-900 dark:text-slate-100">{selectedProject}</span></p>
                    </div>
                    <button onClick={() => setShowNewRevisionForm(!showNewRevisionForm)}
                      className={`h-12 px-8 rounded-md font-bold text-sm transition-all ${showNewRevisionForm
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-100 hover:bg-slate-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                        }`}>
                      {showNewRevisionForm ? 'Cancel Request' : 'New Revision Request'}
                    </button>
                  </div>

                  {showNewRevisionForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 dark:border-slate-700"
                    >
                      <form onSubmit={handleRevisionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Current Project Budget</label>
                            <div className="w-full px-4 py-4 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-lg text-slate-700 dark:text-slate-100">
                              {format(overallBudget)}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                              Additional Budget Required
                            </label>
                            <div className="relative">
                              <input type="number" required
                                value={convert(revisionData.revised_budget, 'USD', code)}
                                onChange={e => setRevisionData({ ...revisionData, revised_budget: convert(parseFloat(e.target.value) || 0, code, 'USD') })}
                                placeholder="0.00"
                                className="w-full px-4 py-4 bg-app-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg font-bold" />
                              
                              <button type="button" onClick={handleFetchMarketAnalysis} disabled={fetchingMarket}
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border border-amber-200 shadow-sm disabled:opacity-50">
                                {fetchingMarket ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Analyze Market
                              </button>
                            </div>
                          </div>

                          {showMarketSuggestion && marketAnalysis && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="bg-app-surface dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                            >
                              <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                  <Sparkles className="w-4 h-4 text-indigo-500" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Smart Market Analysis</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  Confidence: High
                                </span>
                              </div>
                              
                              <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                  <div className="p-3 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-slate-700">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Utilization</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-100 font-mono">
                                      {Math.round(marketAnalysis.utilization_ratio * 100)}%
                                    </p>
                                  </div>
                                  <div className="p-3 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-slate-700">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Remaining Balance</p>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-100 font-mono">
                                      {format(marketAnalysis.remaining_balance)}
                                    </p>
                                  </div>
                                </div>

                                {marketAnalysis.calculations && (
                                  <div className="mb-6 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                      <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                          <th className="py-2.5 px-4 font-black">Factor</th>
                                          <th className="py-2.5 px-4 font-black">Formula / Rationale</th>
                                          <th className="py-2.5 px-4 text-right font-black">Value ({code})</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-300">
                                        {marketAnalysis.calculations.map((c, idx) => {
                                          const isTotal = c.step.includes("Total");
                                          return (
                                            <tr key={idx} className={`${isTotal ? 'font-black bg-slate-50/30 dark:bg-slate-850/20 text-slate-900 dark:text-slate-100' : ''} ${!c.applied ? 'opacity-40 line-through' : ''}`}>
                                              <td className="py-2.5 px-4 flex items-center gap-1.5">
                                                {!isTotal && <span className={`h-1.5 w-1.5 rounded-full ${c.applied ? 'bg-indigo-500' : 'bg-slate-300'}`} />}
                                                {c.step}
                                              </td>
                                              <td className="py-2.5 px-4 text-slate-400 dark:text-slate-500">{c.formula}</td>
                                              <td className="py-2.5 px-4 text-right font-mono font-bold">
                                                {format(c.usd_val)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Suggested Revision Amount</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                                      +{format(marketAnalysis.delta)}
                                    </p>
                                  </div>
                                  
                                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-350 leading-relaxed italic">
                                      "{marketAnalysis.reasoning}"
                                    </p>
                                  </div>

                                  <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleAcceptSuggestion}
                                      className="flex-1 h-12 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md transition-all active:scale-95">
                                      Apply Suggestion
                                    </button>
                                    <button type="button" onClick={() => setShowMarketSuggestion(false)}
                                      className="px-6 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                      Dismiss
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {revisionData.revised_budget && (
                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">New Projected Total</span>
                              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {format((parseFloat(overallBudget) || 0) + (parseFloat(revisionData.revised_budget) || 0))}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                              Reason for Revision
                            </label>
                            <textarea required rows={4}
                              value={revisionData.reasons}
                              onChange={e => setRevisionData({ ...revisionData, reasons: e.target.value })}
                              placeholder="Justification..."
                              className="w-full px-4 py-4 bg-app-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-base resize-none font-bold" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Support Documentation</label>
                            <div className="relative">
                              <input type="file" accept=".pdf,.xlsx,.xls"
                                onChange={e => setRevisionData({ ...revisionData, attachment: e.target.files[0] })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                              <div className={`w-full px-4 py-4 border-2 border-dashed rounded-md transition-all flex items-center justify-center gap-4 ${revisionData.attachment ? 'border-indigo-500 bg-indigo-50/10 text-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                                <span className="text-sm font-bold">
                                  {revisionData.attachment ? revisionData.attachment.name : 'Click to attach evidence'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-4 pt-4">
                          <button type="submit" disabled={submittingRevision}
                            className="h-12 px-12 text-sm font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
                            {submittingRevision ? 'Submitting...' : 'Submit Revision'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 dark:border-slate-700 flex items-center justify-between bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Revision Request History</h2>
                  </div>
                  <button onClick={fetchRevisions} disabled={fetchingRevisions}
                    className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 transition-all">
                    {fetchingRevisions ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-app-bg dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        {['Project', 'Requested By', 'Prev Budget', 'New Budget', 'Delta', 'Initiated', 'Approved', 'Status', 'Attachment', 'Actions']
                          .map(h => (
                            <th key={h} className={`py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-350 whitespace-nowrap ${['Prev Budget', 'New Budget', 'Delta'].includes(h) ? 'text-right' : ''
                              } ${h === 'Actions' ? 'text-center' : ''}`}>
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {fetchingRevisions ? (
                        <tr>
                          <td colSpan={10} className="py-24 text-center">
                            <p className="text-base font-bold text-blue-600 animate-pulse">Fetching revisions...</p>
                          </td>
                        </tr>
                      ) : revisions.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-24">
                            <div className="flex flex-col items-center justify-center text-center px-4">
                              <div className="w-16 h-16 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 dark:border-slate-700">
                                <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                              </div>
                              <p className="text-sm font-bold text-slate-500 dark:text-slate-300 dark:text-slate-100">No revision requests found</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium max-w-[200px] mt-1">
                                Any budget revisions you submit will appear here in the history log.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : revisions.map(rev => {
                        const delta = (rev.revised_budget || 0) - (rev.previous_budget || 0);
                        return (
                          <tr key={rev.id} className="hover:bg-app-bg dark:bg-slate-800/80 dark:hover:bg-slate-700/20 transition-all duration-200">
                            <td className="py-4 px-6">
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{rev.project_name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">#{rev.id}</p>
                            </td>
                            <td className="py-4 px-6 text-sm font-bold text-slate-600 dark:text-slate-100">{rev.pm_name || '—'}</td>
                            <td className="py-4 px-6 text-right text-sm font-bold text-slate-600 dark:text-slate-100">{format(rev.previous_budget)}</td>
                            <td className="py-4 px-6 text-right text-sm font-black text-blue-600">{format(rev.revised_budget)}</td>
                            <td className="py-4 px-6 text-right">
                              <span className={`text-xs font-black ${delta >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {delta >= 0 ? '+' : ''}{format(delta)}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {rev.approved_at ? new Date(rev.approved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-4 px-6"><RevisionBadge status={rev.status} /></td>
                            <td className="py-4 px-6">
                              {rev.attachment_name
                                ? <button onClick={() => handleDownloadAttachment(rev.id, rev.attachment_name)}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700">
                                  Download
                                </button>
                                : <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">None</span>
                              }
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                {isHead && rev.status === 'Pending Head' && (
                                  <>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Pending Finance')} title="Send to Finance"
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md text-[10px] font-bold transition-all shadow-sm">
                                      Forward
                                    </button>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Cancelled')} title="Cancel"
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-md text-[10px] font-bold transition-all shadow-sm">
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {isFinance && rev.status === 'Pending Finance' && (
                                  <>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Approved')} title="Approve"
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md text-[10px] font-bold transition-all shadow-sm">
                                      Approve
                                    </button>
                                    <button onClick={() => setShowWaitingModal(rev.id)} title="Set Waiting Period"
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md text-[10px] font-bold transition-all shadow-sm">
                                      Wait
                                    </button>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Declined')} title="Decline"
                                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md text-[10px] font-bold transition-all shadow-sm">
                                      Decline
                                    </button>
                                  </>
                                )}
                                {!['Pending Head', 'Pending Finance'].includes(rev.status) && (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Locked</span>
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
            </div>
          )}

          {/* ── BUDGET ANALYTICS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'Analytics' && (
            <div className="space-y-6">
              {/* Stepper Card */}
              <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Budget Revision Lifecycle</h2>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">Track approval stages for {selectedProject || 'Project'}</p>
                </div>

                {(() => {
                  const latestRev = revisions.find(r => r.project_name === selectedProject);
                  const status = latestRev?.status || 'None';

                  const steps = [
                    { id: 'PM', label: 'Submission', sub: 'PM Stage', icon: Send, done: !!latestRev },
                    { id: 'Head', label: 'Review', sub: 'Dept Head', icon: Eye, done: ['Pending Finance', 'Approved'].includes(status) },
                    { id: 'Finance', label: 'Approval', sub: 'Finance Dept', icon: CheckCircle2, done: status === 'Approved' }
                  ];

                  return (
                    <div className="relative flex items-center justify-between max-w-5xl mx-auto py-16 px-12">

                      {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = (idx === 0 && !latestRev) ||
                          (idx === 1 && status === 'Pending Head') ||
                          (idx === 2 && status === 'Pending Finance');

                        const isDone = step.done;
                        const isLast = idx === steps.length - 1;

                        return (
                          <React.Fragment key={step.id}>
                            <div className="relative z-20 flex flex-col items-center">
                              {/* Glass Circle */}
                              <motion.div
                                initial={false}
                                animate={{
                                  scale: isActive ? 1.15 : 1,
                                  backgroundColor: isDone ? '#3b82f6' : 'rgba(15, 23, 42, 0.8)',
                                  borderColor: isDone ? '#3b82f6' : isActive ? '#3b82f6' : '#334155',
                                }}
                                className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all relative backdrop-blur-md shadow-sm dark:bg-slate-900/80`}
                              >
                                {isActive && (
                                  <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.05, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-full bg-blue-500"
                                  />
                                )}

                                <Icon size={20} className={isDone ? 'text-white' : isActive ? 'text-blue-500' : 'text-slate-300'} strokeWidth={2.5} />
                              </motion.div>

                              {/* Labels */}
                              <div className="absolute top-full mt-6 text-center">
                                <p className={`text-[12px] font-bold tracking-tight mb-1 ${isDone || isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-300'}`}>
                                  {step.label}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-widest">
                                  {step.sub}
                                </p>
                              </div>
                            </div>

                            {/* Connecting Line Segment */}
                            {!isLast && (
                              <div className="flex-1 relative mx-4 h-[2px]">
                                {/* Background Segment */}
                                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full" />

                                {/* Active Segment */}
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: isDone ? '100%' : '0%' }}
                                  className="absolute inset-0 bg-blue-500 rounded-full z-10 origin-left"
                                  transition={{ duration: 0.8, ease: "easeInOut", delay: idx * 0.2 }}
                                />

                                {/* Moving Light Effect for Active Path */}
                                {isDone && (
                                  <motion.div
                                    animate={{ left: ['-20%', '120%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent z-20"
                                  />
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Revision Count</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                      {revisions.filter(r => r.project_name === selectedProject).length}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">Total requests submitted</p>
                </div>

                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Approval Rate</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                      {(() => {
                        const projRevs = revisions.filter(r => r.project_name === selectedProject);
                        if (projRevs.length === 0) return '0%';
                        const approved = projRevs.filter(r => r.status === 'Approved').length;
                        return `${Math.round((approved / projRevs.length) * 100)}%`;
                      })()}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">Successful final approvals</p>
                </div>

                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Pending Review</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100">
                      {revisions.filter(r => r.project_name === selectedProject && ['Pending Head', 'Pending Finance'].includes(r.status)).length}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">Requests awaiting action</p>
                </div>
              </div>
            </div>
          )}

          {/* ── BUDGET ANALYTICS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'Analytics' && (
            <div className="space-y-8 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Budget Distribution Chart (Simulated with CSS) */}
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Budget Allocation</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">By Category</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {estimatedBreakdown.map((cat, idx) => {
                      const percentage = totalEstimated > 0 ? (cat.value / totalEstimated) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-100">{cat.label}</span>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{format(cat.value)} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-blue-600' : 
                                idx === 1 ? 'bg-emerald-600' : 
                                idx === 2 ? 'bg-indigo-600' : 'bg-slate-600'
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {estimatedBreakdown.length === 0 && (
                      <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                          <PieChart className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic">No allocation data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Utilization Health */}
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-8">Utilization Health</h3>
                  
                  <div className="flex items-center justify-center py-4">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96" cy="96" r="88"
                          stroke="currentColor" strokeWidth="12"
                          fill="transparent"
                          className="text-slate-100 dark:text-slate-900"
                        />
                        <motion.circle
                          cx="96" cy="96" r="88"
                          stroke="currentColor" strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 88}
                          initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - Math.min(1, totalUtilization / (parseFloat(overallBudget) || 1))) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          strokeLinecap="round"
                          className={isOverBudget ? 'text-red-500' : 'text-blue-600'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-3xl font-black ${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                          {Math.round((totalUtilization / (parseFloat(overallBudget) || 1)) * 100)}%
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Utilized</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Spent (Utilized)</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{format(totalUtilized)}</p>
                    </div>
                    <div className="p-4 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Committed</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{format(totalCommitment)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BUDGET HISTORY TAB ───────────────────────────────────────────────── */}
          {activeTab === 'History' && (
            <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-app-bg dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Budget History & Snapshots</h2>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={historyFilter} 
                    onChange={e => { setHistoryFilter(e.target.value); setHistoryCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-bold bg-app-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none cursor-pointer text-slate-700 dark:text-slate-100">
                    <option value="All">All Types</option>
                    <option value="Upload">Uploads</option>
                    <option value="Save">Manual Saves</option>
                  </select>
                  {(hasBudgetPerm('budget_audits')) && (
                    <button onClick={() => { setShowAuditModal(true); fetchAuditLogs(); }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/40 rounded-md hover:bg-indigo-100 transition-all">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Budget Audits
                    </button>
                  )}
                  <button onClick={fetchHistory} disabled={fetchingHistory}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-300 bg-app-surface dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:text-slate-700 hover:bg-app-bg dark:bg-slate-800/50 transition-all">
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingHistory ? 'animate-spin' : ''}`} />
                    {fetchingHistory ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-app-bg dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider">Project Manager</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider">Type</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider">Overall Budget</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider">Uploaded By</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider">Last Updated</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {fetchingHistory ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-300">Loading history...</td></tr>
                    ) : paginatedHistoryData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-24">
                          <div className="flex flex-col items-center justify-center text-center px-4">
                            <div className="w-16 h-16 bg-app-bg dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                              <History className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-100">No budget history found</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium max-w-[200px] mt-1">
                              Upload an excel snapshot or save a manual revision to start building your budget history.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedHistoryData.map(item => (
                      <tr key={item.id} className="hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/20 transition-all duration-200">
                        <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-slate-100 tracking-tight">
                          {managerName || 'Unassigned'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.attachment_name ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'}`}>
                            {item.attachment_name ? 'Upload' : 'Save'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-blue-600 dark:text-blue-400">{format(item.overall_budget)}</td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-600 dark:text-slate-100">{item.uploaded_by || 'Unknown'}</td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-500 dark:text-slate-300">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-4">
                            <button onClick={() => loadVersion(item.id)}
                              title="View Snapshot"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 p-1.5 rounded-md transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteVersion(item.id)}
                              title="Delete Snapshot"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* History Pagination */}
              {historyData.length > 0 && (
                <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300">Rows per page:</span>
                    <select value={historyItemsPerPage} onChange={e => { setHistoryItemsPerPage(Number(e.target.value)); setHistoryCurrentPage(1); }}
                      className="px-4 py-1.5 text-xs font-bold bg-app-bg dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none transition-all focus:ring-4 focus:ring-slate-500/10 text-slate-700 dark:text-slate-100">
                      {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                    </select>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                      {(historyCurrentPage - 1) * historyItemsPerPage + 1}–{Math.min(historyCurrentPage * historyItemsPerPage, historyData.length)} of {historyData.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistoryCurrentPage(1)} disabled={historyCurrentPage === 1}
                      className="px-4 py-2 text-xs font-bold rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      First
                    </button>
                    {getHistoryPageNumbers().map(p => (
                      <button key={p} onClick={() => setHistoryCurrentPage(p)}
                        className={`w-10 h-10 flex items-center justify-center text-xs font-black rounded-md transition-all ${p === historyCurrentPage
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700'
                          }`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setHistoryCurrentPage(totalHistoryPages)} disabled={historyCurrentPage === totalHistoryPages}
                      className="px-4 py-2 text-xs font-bold rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Budget Audit Modal ────────────────────────────────────────────────── */}
      {showAuditModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="app-modal-header bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-indigo-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="app-modal-title">Budget Audit Trail</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{selectedProject} — Complete activity log</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body flex-1 overflow-y-auto">
              {fetchingAudit ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="ml-3 text-sm font-bold text-slate-400 dark:text-slate-500">Loading audit logs...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 bg-app-bg dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No audit records found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Audit entries will appear after any budget save or upload action.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-app-bg dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">#</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Timestamp</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Action</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Performed By</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Role</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Budget</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Rows</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Attachment</th>
                      <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Synced</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-5 text-xs font-bold text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-5 text-xs font-bold text-slate-600 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                            log.action === 'UPLOAD'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : log.action === 'SAVE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-app-bg dark:bg-slate-800/50 text-slate-600 border-slate-200'
                          }`}>{log.action}</span>
                        </td>
                        <td className="py-3 px-5 text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-200">
                          {log.user_name || log.details?.uploaded_by || '—'}
                        </td>
                        <td className="py-3 px-5 text-xs font-bold text-slate-500 dark:text-slate-300">
                          {log.user_role || '—'}
                        </td>
                        <td className="py-3 px-5 text-sm font-bold text-blue-600">
                          {log.details?.overall_budget != null ? format(log.details.overall_budget) : '—'}
                        </td>
                        <td className="py-3 px-5 text-xs font-bold text-slate-600">
                          {log.details?.rows ?? '—'}
                        </td>
                        <td className="py-3 px-5 text-xs font-bold text-slate-500 dark:text-slate-300">
                          {log.details?.attachment_name || <span className="text-slate-300">None</span>}
                        </td>
                        <td className="py-3 px-5">
                          {log.details?.sync_to_project
                            ? <span className="text-emerald-600 font-bold text-[10px] uppercase">✓ Synced</span>
                            : <span className="text-slate-300 text-[10px]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="app-modal-footer flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{auditLogs.length} total entries</span>
              <button onClick={() => { setShowAuditModal(false); }}
                className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Template Modal ────────────────────────────────────────────── */}
      {showTemplateModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="app-modal-header bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <div>
                <h3 className="app-modal-title">Budget Upload Template</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Required format for excel uploads</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body flex-1 overflow-y-auto space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded p-6 border border-slate-200 dark:border-slate-700 mb-6">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-4">
                  Standard Column Headers
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    "Category", "Item Name", "Unit Type", "Unit count",
                    "Per unit cost", "Utilized", "Commitment", "Status", "Comments"
                  ].map(header => (
                    <div key={header} className="px-4 py-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-100">
                      {header}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Unit Type</th>
                      <th className="px-6 py-4">Count</th>
                      <th className="px-6 py-4">Cost</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 dark:text-slate-100">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">CAPEX</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Laptop Dell XPS</td>
                      <td className="px-6 py-4">Nos</td>
                      <td className="px-6 py-4">5</td>
                      <td className="px-6 py-4">1,20,000</td>
                      <td className="px-6 py-4 font-black text-blue-600">IN PROGRESS</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Revenue</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Software License</td>
                      <td className="px-6 py-4">Nos</td>
                      <td className="px-6 py-4">1</td>
                      <td className="px-6 py-4">50,000</td>
                      <td className="px-6 py-4 font-black text-emerald-600">COMPLETED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="app-modal-footer flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50 justify-end gap-4">
              <button onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-700 transition-colors bg-transparent border-none">
                Close
              </button>
              <button onClick={handleDownloadTemplate}
                className="px-6 py-2 text-sm font-black bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Date Modal ────────────────────────────────────────────────── */}
      {showDateModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4">
            <div className="app-modal-header">
              <div>
                <h3 className="app-modal-title">Budget Date</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Effective date for this version</p>
              </div>
              <button onClick={() => setShowDateModal(false)}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Effective Date</label>
                <input
                  type="date"
                  value={budgetDate}
                  onChange={(e) => setBudgetDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowDateModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button onClick={executeSave} disabled={saving}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Excel Upload Modal ────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4">
            <div className="app-modal-header">
              <div>
                <h3 className="app-modal-title">Import Budget</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upload new budget snapshot</p>
              </div>
              <button onClick={() => setShowUploadModal(false)}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Project Name</label>
                <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-bold text-slate-500 dark:text-slate-350">
                  {selectedProject || 'NONE SELECTED'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Budget Effective Date</label>
                <input
                  type="date"
                  value={budgetDate}
                  onChange={(e) => setBudgetDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Select Excel File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setTempFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed rounded-md flex items-center justify-center transition-all ${tempFile ? 'border-blue-500 bg-blue-50/10 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {tempFile ? tempFile.name : 'Click to select file'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!tempFile) { toast.error('Please select a file'); return; }
                  const targetDate = String(budgetDate || '').trim();
                  const historyArray = Array.isArray(historyData) ? historyData : [];
                  const exists = historyArray.some(h => String(h.budget_date || '').trim() === targetDate);
                  if (exists) { setShowOverwriteWarning(true); } else { executeUpload(); }
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overwrite Warning Modal ─────────────────────────────────────────── */}
      {showOverwriteWarning && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4">
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 font-black text-xl">!</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2 uppercase tracking-widest">Overwrite Budget?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-455 mb-6 leading-relaxed">
                A budget snapshot for <span className="font-bold text-slate-900 dark:text-slate-100">{selectedProject}</span> on <span className="font-bold text-slate-900 dark:text-slate-100">{budgetDate}</span> already exists.
                Uploading again will <span className="text-red-600 underline font-semibold">REPLACE</span> previous data.
              </p>

              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowOverwriteWarning(false)}
                  className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">
                  Cancel
                </button>
                <button onClick={executeUpload}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetMaster;
