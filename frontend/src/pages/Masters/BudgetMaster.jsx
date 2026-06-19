import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import SearchableDropdown from '../../components/SearchableDropdown';
import Skeleton from '../../components/ui/skeleton';
import { setActiveProjectName } from '../../store/slices/navSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Send, Eye, CheckCircle2, ChevronUp, ChevronDown, TrendingUp, ArrowUpRight, ArrowDownRight, Target, Save, RefreshCw, FileDown, FileSpreadsheet, FileText, Download, Sparkles, Inbox, PieChart, ShieldAlert, History, Plus, Columns, Trash2, ClipboardList, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useCurrency from '../../hooks/useCurrency';
import ReactECharts from 'echarts-for-react';

const MONETARY_COLS = ['Per unit cost', 'Estimated', 'Utilized', 'Commitment', 'Total utilization', 'Balance'];
const READONLY_COLS = ['Estimated', 'Total utilization', 'Balance'];
const NUMERIC_COLS = ['Unit count', 'Per unit cost', 'Utilized', 'Commitment'];

// ─── Cost-Control Terminology Map (display only — data keys unchanged) ──────
const COST_LABEL_MAP = {
  'Category':          'Cost Center',
  'Item Name':         'Commodity',
  'Unit Type':         'Unit Type',
  'Unit count':        'Qty',
  'Per unit cost':     'Unit Rate',
  'Estimated':         'Budget',
  'Utilized':          'Actual',
  'Commitment':        'Commitment',
  'Total utilization': 'Forecast',
  'Balance':           'Variance',
  'Status':            'Budget Status',
  'Comments':          'Remarks',
  'Sno':               '#',
};

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

// ─── Status Badge (Fiori high-density flat bullet badges) ─────────────────────
const StatusBadge = ({ value }) => {
  const statusMap = {
    'Within Budget': { dot: 'text-[#107f3e]', text: 'Within Budget' },
    'Watchlist': { dot: 'text-[#e9730c]', text: 'Watchlist' },
    'Over Budget': { dot: 'text-[#bb0000]', text: 'Over Budget' },
    'Closed': { dot: 'text-slate-500', text: 'Closed' },
    'In Progress': { dot: 'text-[#0a6ed1]', text: 'In Progress' },
    'Completed': { dot: 'text-[#107f3e]', text: 'Completed' },
    'On Hold': { dot: 'text-[#e9730c]', text: 'On Hold' },
    'Cancelled': { dot: 'text-[#bb0000]', text: 'Cancelled' },
  };
  const cfg = statusMap[value] || { dot: 'text-slate-400', text: value || 'Pending' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-350">
      <span className={`${cfg.dot} text-sm leading-none`}>●</span>
      <span>{cfg.text}</span>
    </span>
  );
};

// ─── Revision Status Badge ────────────────────────────────────────────────────
const RevisionBadge = ({ status }) => {
  const dots = {
    'Approved': 'text-[#107f3e]',
    'Declined': 'text-[#bb0000]',
    'Cancelled': 'text-slate-500',
    'In Waiting Period': 'text-[#e9730c]',
    'Pending Head': 'text-[#0a6ed1]',
    'Pending Finance': 'text-[#0a6ed1]',
  };
  const dotColor = dots[status] || 'text-slate-400';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-750 dark:text-slate-300">
      <span className={`${dotColor} text-sm leading-none`}>●</span>
      <span>{status}</span>
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BudgetMaster = () => {
  const dispatch = useDispatch();
  const activeProjectName = useSelector(state => state.nav.activeProjectName);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(activeProjectName || '');
  const [overallBudget, setOverallBudget] = useState(0);
  const [managerName, setManagerName] = useState('');

  const handleProjectChange = (projName) => {
    setSelectedProject(projName);
    dispatch(setActiveProjectName(projName));
  };

  useEffect(() => {
    if (activeProjectName !== selectedProject) {
      setSelectedProject(activeProjectName || '');
    }
  }, [activeProjectName]);

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
  const [hoveredStep, setHoveredStep] = useState(null);

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
  const [revisionIndustry, setRevisionIndustry] = useState('Manufacturing');
  const [rawCategoriesInput, setRawCategoriesInput] = useState('');

  // Custom Column State
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnData, setNewColumnData] = useState({ label: '', type: 'text' });
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Split-screen master-detail layout & Fiori Filters
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [customerFilter, setCustomerFilter] = useState('');
  const [plantFilter, setPlantFilter] = useState('');
  const [revisionFilter, setRevisionFilter] = useState('All');

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
      fetchAuditLogs(); // Fetch audits for the bottom section
      setUploadedFile(null);
    } else {
      setTableData([]);
      setHistoryData([]);
      setAuditLogs([]);
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

  const normalizeRows = (rows) => {
    return rows.map((row, i) => {
      const normalized = { id: row.id || `row_db_${Date.now()}_${i}` };
      columns.forEach(col => {
        const possibleKeys = [
          col.label,
          col.label.toLowerCase(),
          col.id,
          col.label.charAt(0).toUpperCase() + col.label.slice(1).toLowerCase(),
          col.label.replace(' ', '_').toLowerCase(),
          col.id.replace('_', ' ').toLowerCase()
        ];
        const foundKey = possibleKeys.find(k => row[k] !== undefined && row[k] !== null);
        normalized[col.label] = foundKey !== undefined ? row[foundKey] : '';
      });
      return normalized;
    });
  };

  const fetchBudgetData = async (projectName) => {
    setLoading(true);
    try {
      const res = await API.get(`/budget/${encodeURIComponent(projectName)}`);
      setAttachmentName(res.data?.attachment_name || null);
      if (res.data?.overall_budget !== undefined) setOverallBudget(res.data.overall_budget);
      const rows = res.data?.budget_data || [];
      setTableData(normalizeRows(rows));
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
    let result = tableData;
    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (customerFilter) {
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(customerFilter.toLowerCase()))
      );
    }
    if (plantFilter) {
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(plantFilter.toLowerCase()))
      );
    }
    if (revisionFilter !== 'All') {
      result = result.filter(row => {
        const status = String(row.Status || '').toLowerCase();
        if (revisionFilter === 'Approved') {
          return status === 'within budget' || status === 'completed';
        }
        if (revisionFilter === 'Pending') {
          return status === 'watchlist' || status === 'in progress' || status === 'on hold';
        }
        return true;
      });
    }
    return result;
  }, [tableData, searchTerm, customerFilter, plantFilter, revisionFilter]);

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
      setTableData(normalizeRows(res.data.budget_data || []));
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
    if (!selectedProject) { toast.error('Please select a project first'); return; }
    setFetchingMarket(true);
    try {
      const res = await API.get(
        `/budget/proposal/${encodeURIComponent(selectedProject)}?currency=${encodeURIComponent(code)}&industry=${encodeURIComponent(revisionIndustry)}&procurement_categories=${encodeURIComponent(rawCategoriesInput)}`
      );
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

      {/* ── Page Header (Fiori Object Header) ────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 space-y-2">
        <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">
          Masters / Budget Master
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Budget Master
          </h1>
        </div>

        {/* Object Page Header Attributes (High Density Row) */}
        {selectedProject && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-505 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-semibold text-slate-400">Fiscal Year:</span>{' '}
              <span className="font-bold text-slate-750 dark:text-slate-200">2026</span>
            </div>
            <div className="text-slate-300 dark:text-slate-700">|</div>
            <div>
              <span className="font-semibold text-slate-400">Revision:</span>{' '}
              <span className="font-bold text-slate-750 dark:text-slate-200">
                {(() => {
                  const projRevisions = revisions.filter(r => r.project_name === selectedProject);
                  const latestRev = projRevisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                  return latestRev ? `Rev-${latestRev.id}` : 'Rev-01';
                })()}
              </span>
            </div>
            <div className="text-slate-300 dark:text-slate-700">|</div>
            <div>
              <span className="font-semibold text-slate-400">Currency:</span>{' '}
              <span className="font-bold text-slate-750 dark:text-slate-200">{code}</span>
            </div>
            <div className="text-slate-300 dark:text-slate-700">|</div>
            <div>
              <span className="font-semibold text-slate-400">Status:</span>{' '}
              <span className="font-bold text-[#107f3e]">
                {(() => {
                  const projRevisions = revisions.filter(r => r.project_name === selectedProject);
                  const latestRev = projRevisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                  return latestRev ? latestRev.status : 'Approved';
                })()}
              </span>
            </div>
            <div className="text-slate-300 dark:text-slate-700">|</div>
            <div>
              <span className="font-semibold text-slate-400">Last Updated:</span>{' '}
              <span className="font-bold text-slate-750 dark:text-slate-200">
                {historyData[0] ? new Date(historyData[0].updated_at).toLocaleDateString() : '17-Jun-2026'}
              </span>
            </div>
            <div className="text-slate-300 dark:text-slate-700">|</div>
            <div>
              <span className="font-semibold text-slate-400">Programs:</span>{' '}
              <span className="font-bold text-slate-750 dark:text-slate-200">{projects.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-8 pt-4">
        {/* Horizontal Tab Navigation (Fiori Flat Bar style) */}
        <nav className="flex items-center border-b border-slate-200 dark:border-slate-800 w-full mb-6 bg-app-surface dark:bg-slate-900">
          <button onClick={() => setActiveTab('Table')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Table'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400 hover:border-slate-300'}`}>
            Budget Workspace
          </button>

          {(isHead || isFinance || isPM) && (
            <button onClick={() => { setActiveTab('Revisions'); fetchRevisions(); }}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Revisions'
                ? 'border-[#0a6ed1] text-[#0a6ed1]'
                : 'border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400 hover:border-slate-300'}`}>
              Revision Log
            </button>
          )}

          <button onClick={() => { setActiveTab('Analytics'); fetchRevisions(); }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'Analytics'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400 hover:border-slate-300'}`}>
            Analytical Outlook
          </button>

          <button onClick={() => { setActiveTab('History'); fetchHistory(); }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'History'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-slate-500 hover:text-slate-750 dark:text-slate-400 hover:border-slate-300'}`}>
            Snapshots & Logs
          </button>
        </nav>
      </div>

      {/* ── Main Content Scroll Area ────────────────────────────────────────── */}
      <div className="master-table-scroll bg-app-bg/50 dark:bg-slate-950/50 transition-colors duration-300">
        <div className="master-table-scroll-inner p-8 space-y-8">

          {/* ── BUDGET TABLE TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'Table' && (
            <>
              {/* Fiori Filter Bar */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none space-y-4 shadow-none">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
                  {/* Program Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Program</label>
                    <SearchableDropdown
                      options={projects.map(p => {
                        const latest = latestBudgetsMap[p.name];
                        let label = p.name;
                        if (latest && latest.updated_at) {
                          const hours = Math.floor((new Date() - new Date(latest.updated_at)) / (1000 * 60 * 60));
                          const timeStr = hours < 1 ? 'Just now' : `${hours}h ago`;
                          label = `${p.name} (${timeStr})`;
                        }
                        return { value: p.name, label };
                      })}
                      value={selectedProject}
                      onChange={handleProjectChange}
                      placeholder="Select Project..."
                      controlClassName="w-full px-3 text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 text-slate-900 dark:text-slate-100 font-bold rounded-none h-9 flex items-center justify-between shadow-none"
                    />
                  </div>

                  {/* Customer Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</label>
                    <input
                      type="text"
                      value={customerFilter}
                      onChange={e => setCustomerFilter(e.target.value)}
                      placeholder="Filter customer..."
                      className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none h-9 outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Plant Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Plant</label>
                    <input
                      type="text"
                      value={plantFilter}
                      onChange={e => setPlantFilter(e.target.value)}
                      placeholder="Filter plant..."
                      className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none h-9 outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Fiscal Year Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fiscal Year</label>
                    <select
                      value={fiscalYear}
                      onChange={e => setFiscalYear(e.target.value)}
                      className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none h-9 outline-none text-slate-900 dark:text-slate-100 font-bold"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                  </div>

                  {/* Revision Filter */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Revision</label>
                    <select
                      value={revisionFilter}
                      onChange={e => setRevisionFilter(e.target.value)}
                      className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none h-9 outline-none text-slate-900 dark:text-slate-100 font-bold"
                    >
                      <option value="All">All Revisions</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {/* Currency (Display showing Project Active Currency) */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Currency</label>
                    <div className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-none h-9 flex items-center text-slate-700 dark:text-slate-350 font-bold">
                      {code}
                    </div>
                  </div>

                  {/* Search Term input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Search</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search attributes..."
                      className="w-full px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none h-9 outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Fiori Action Toolbar */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-4 py-3 flex flex-wrap items-center justify-between gap-4 rounded-none shadow-none">
                {/* Secondary Actions on Left */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Add Budget Line */}
                  {hasBudgetPerm('add_row') && (
                    <button
                      onClick={addRow}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none disabled:opacity-50"
                    >
                      Add Budget Line
                    </button>
                  )}

                  {/* Manage Fields (renamed from Add Column) */}
                  {hasBudgetPerm('add_column') && (
                    <button
                      onClick={() => setShowAddColumnModal(true)}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none disabled:opacity-50"
                    >
                      Manage Fields
                    </button>
                  )}

                  {/* Upload Budget */}
                  {hasBudgetPerm('upload_budget') && (
                    <button
                      onClick={() => {
                        if (!selectedProject) { toast.error('Please select a project first'); return; }
                        setShowUploadModal(true);
                      }}
                      className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none"
                    >
                      {isParsing ? 'Parsing...' : 'Upload Budget'}
                    </button>
                  )}

                  {/* Export Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none flex items-center gap-1 disabled:opacity-50"
                    >
                      <span>Export</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {showExportDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                        <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-lg py-1 z-50">
                          <button
                            onClick={() => { handleDownloadTemplate(); setShowExportDropdown(false); }}
                            className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750"
                          >
                            Download Template
                          </button>
                          <button
                            onClick={() => { handleExportExcel(); setShowExportDropdown(false); }}
                            className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750"
                          >
                            Export as Excel
                          </button>
                          <button
                            onClick={() => { handleExportPDF(); setShowExportDropdown(false); }}
                            className="w-full px-4 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750"
                          >
                            Export as PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={() => selectedProject && fetchBudgetData(selectedProject)}
                    disabled={!selectedProject}
                    className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none disabled:opacity-50"
                  >
                    Refresh
                  </button>

                  {/* Audit Logs */}
                  {hasBudgetPerm('budget_audits') && (
                    <button
                      onClick={() => { setShowAuditModal(true); fetchAuditLogs(); }}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-none disabled:opacity-50"
                    >
                      Audit Logs
                    </button>
                  )}
                </div>

                {/* Primary Actions on Right */}
                <div className="flex items-center gap-2">
                  {/* Save */}
                  {hasBudgetPerm('save_budget') && (
                    <button
                      onClick={() => handleSave(false)}
                      disabled={saving || !selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-[#0a6ed1] hover:bg-[#005bb5] text-white transition-all rounded-none disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  )}

                  {/* Submit Revision */}
                  {isPM && (
                    <button
                      onClick={() => {
                        setActiveTab('Revisions');
                        setShowNewRevisionForm(true);
                      }}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-[#107f3e] hover:bg-[#0d6b33] text-white transition-all rounded-none disabled:opacity-50"
                    >
                      Submit Revision
                    </button>
                  )}

                  {/* Approve Revision (if Finance/Head and revision is pending) */}
                  {(isHead || isFinance) && (
                    <button
                      onClick={() => {
                        setActiveTab('Revisions');
                      }}
                      disabled={!selectedProject}
                      className="h-8 px-4 text-xs font-bold bg-[#0a6ed1] hover:bg-[#005bb5] text-white transition-all rounded-none disabled:opacity-50"
                    >
                      Approve Revisions
                    </button>
                  )}
                </div>
              </div>

              {/* Flex Split Workspace */}
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                {/* Left Pane: Table */}
                <div className={`transition-all duration-300 ${selectedRowId ? 'lg:w-[65%] w-full' : 'w-full'}`}>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-none rounded-none overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                            {visibleColumns.map(col => {
                              const isNum = isMonetary(col.label) || col.label === 'Unit count';
                              return (
                                <th
                                  key={col.id}
                                  onClick={() => handleSort(col.label)}
                                  className={`py-2 px-3 text-xs font-bold text-slate-500 dark:text-slate-350 select-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 whitespace-nowrap ${
                                    isNum ? 'text-right' : ''
                                  }`}
                                >
                                  <div className={`flex items-center gap-1 ${isNum ? 'justify-end' : ''}`}>
                                    <span>{COST_LABEL_MAP[col.label] || col.label}</span>
                                    {sortConfig.key === col.label && (
                                      sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                            <th className="py-2 px-3 text-center text-xs font-bold text-slate-500 dark:text-slate-350 sticky right-0 bg-slate-50 dark:bg-slate-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-750/50">
                          {loading || isParsing ? (
                            Array.from({ length: 6 }).map((_, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                {visibleColumns.map((col, cIdx) => {
                                  const widths = ['w-8', 'w-16', 'w-24', 'w-32', 'w-20', 'w-28'];
                                  const widthClass = widths[(rIdx + cIdx) % widths.length];

                                  if (col.type === 'status') {
                                    return (
                                      <td key={col.id} className="py-2 px-3">
                                        <Skeleton className="h-5 w-16 rounded" />
                                      </td>
                                    );
                                  }
                                  const isNum = isMonetary(col.label) || col.label === 'Unit count';
                                  return (
                                    <td key={col.id} className={`py-2 px-3 ${isNum ? 'text-right flex justify-end' : ''}`}>
                                      <Skeleton className={`h-4 ${widthClass}`} />
                                    </td>
                                  );
                                })}
                                <td className="py-2 px-3 text-center sticky right-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                                  <Skeleton className="h-6 w-12 rounded mx-auto" />
                                </td>
                              </tr>
                            ))
                          ) : paginatedData.length === 0 ? (
                            <tr>
                              <td colSpan={visibleColumns.length + 1} className="py-24 text-center">
                                <p className="text-sm font-black text-slate-300 dark:text-slate-650 uppercase tracking-widest mb-1">No Data Available</p>
                                <p className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Select a project or upload a budget file</p>
                              </td>
                            </tr>
                          ) : paginatedData.map(row => {
                            const isSelected = selectedRowId === row.id;
                            return (
                              <tr
                                key={row.id}
                                onClick={() => {
                                  setSelectedRowId(row.id);
                                  setEditingRowId(row.id);
                                  setEditingData({ ...row });
                                }}
                                className={`cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-850/50 ${
                                  isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-[#0a6ed1]' : ''
                                }`}
                              >
                                {visibleColumns.map(col => {
                                  const val = row[col.label];
                                  const mon = isMonetary(col.label);
                                  const ro = isReadonly(col.label);
                                  const num = mon || col.label === 'Unit count';

                                  let display = val !== undefined && val !== null && val !== '' ? val : '—';
                                  if (display !== '—' && mon) {
                                    const n = parseFloat(display);
                                    if (!isNaN(n)) display = format(n);
                                  }

                                  return (
                                    <td
                                      key={col.id}
                                      className={`py-2 px-3 text-xs whitespace-nowrap ${
                                        ro ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'
                                      } ${num ? 'text-right font-mono font-semibold' : ''}`}
                                    >
                                      {col.label === 'Status' ? (
                                        <StatusBadge value={val} />
                                      ) : col.label === 'Balance' ? (
                                        (() => {
                                          const balNum = parseFloat(val);
                                          const estNum = parseFloat(row['Estimated']) || 0;
                                          const varPct = estNum > 0 && !isNaN(balNum) ? ((balNum / estNum) * 100).toFixed(1) : null;
                                          const isNeg = !isNaN(balNum) && balNum < 0;
                                          return (
                                            <span className={`inline-flex items-center gap-1 ${isNeg ? 'text-[#bb0000]' : 'text-[#107f3e]'} font-bold`}>
                                              {display}
                                              {varPct !== null && (
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isNeg ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}`}>
                                                  {isNeg ? '' : '+'}{varPct}%
                                                </span>
                                              )}
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        display
                                      )}
                                    </td>
                                  );
                                })}
                                
                                {/* Actions cell */}
                                <td
                                  className="py-2 px-3 text-center sticky right-0 bg-white dark:bg-slate-800 border-l border-slate-150 dark:border-slate-700"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {hasBudgetPerm('delete_row') && (
                                    <button
                                      onClick={() => setShowDeletePrompt(row.id)}
                                      className="p-1 text-slate-400 hover:text-red-650"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        
                        {/* Summary footer */}
                        {tableData.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-50 dark:bg-slate-850 border-t-2 border-slate-300 dark:border-slate-700">
                              {visibleColumns.map((col, idx) => {
                                let cell = null;
                                const budget = parseFloat(overallBudget) || 0;
                                if (idx === 0) cell = (
                                  <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Project Total</span>
                                  </div>
                                );
                                if (col.label === 'Estimated') cell = (
                                  <div className="text-right">
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{format(totalEstimated)}</span>
                                  </div>
                                );
                                if (col.label === 'Total utilization') cell = (
                                  <div className="text-right">
                                    <span className={`font-bold text-xs ${isOverBudget ? 'text-[#bb0000]' : 'text-slate-900 dark:text-slate-100'}`}>{format(totalUtilization)}</span>
                                  </div>
                                );
                                if (col.label === 'Balance') {
                                  const varPct = totalEstimated > 0 ? ((totalBalance / totalEstimated) * 100).toFixed(1) : null;
                                  cell = (
                                    <div className="text-right">
                                      <span className={`font-bold text-xs ${totalBalance < 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>{format(totalBalance)}</span>
                                    </div>
                                  );
                                }
                                const num = isMonetary(col.label) || col.label === 'Unit count';
                                return (
                                  <td key={col.id} className={`py-2 px-3 ${num ? 'text-right' : ''}`}>{cell}</td>
                                );
                              })}
                              <td className="py-2 px-3 sticky right-0 bg-slate-50 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700" />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* Pagination */}
                    {sortedData.length > 0 && (
                      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-500">Rows:</span>
                          <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-none outline-none focus:border-blue-500 text-slate-850 dark:text-slate-150">
                            {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
                          </select>
                          <span className="text-xs text-slate-500">
                            {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                            className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-none text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900">
                            First
                          </button>
                          {getPageNumbers().map(p => (
                            <button key={p} onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 text-xs font-bold rounded-none border transition-all ${p === currentPage
                                ? 'bg-[#0a6ed1] text-white border-[#0a6ed1]'
                                : 'text-slate-650 dark:text-slate-350 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                }`}>
                              {p}
                            </button>
                          ))}
                          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                            className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-none text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900">
                            Last
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane: Detail Inspector */}
                {selectedRowId && (
                  <div className="lg:w-[35%] w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-none flex flex-col h-[650px] shadow-none sticky top-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Detail Inspector
                        </h3>
                        <p className="text-xs font-bold text-[#0a6ed1] mt-1">
                          {editingData['Item Name'] || 'New Item'}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedRowId(null); setEditingRowId(null); setEditingData({}); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Body Form */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {/* Cost Center / Category */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Cost Center</label>
                        <input
                          type="text"
                          value={editingData['Category'] || ''}
                          onChange={e => handleEditChange('Category', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500"
                        />
                      </div>

                      {/* Commodity / Item Name */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Commodity Name</label>
                        <input
                          type="text"
                          value={editingData['Item Name'] || ''}
                          onChange={e => handleEditChange('Item Name', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500"
                        />
                      </div>

                      {/* Unit Type & Unit count */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Unit Type</label>
                          <input
                            type="text"
                            value={editingData['Unit Type'] || ''}
                            onChange={e => handleEditChange('Unit Type', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Quantity</label>
                          <input
                            type="number"
                            value={editingData['Unit count'] !== undefined ? editingData['Unit count'] : ''}
                            onChange={e => handleEditChange('Unit count', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 text-right font-mono"
                          />
                        </div>
                      </div>

                      {/* Unit Rate & Budget */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Unit Rate ({code})</label>
                          <input
                            type="number"
                            value={editingData['Per unit cost'] !== undefined && editingData['Per unit cost'] !== '' ? convert(editingData['Per unit cost'], 'USD', code) : ''}
                            onChange={e => handleEditChange('Per unit cost', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 text-right font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Calculated Budget</label>
                          <div className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none dark:text-slate-350 text-right font-mono font-bold">
                            {format(editingData['Estimated'] || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Utilized & Commitment */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Actual Spent ({code})</label>
                          <input
                            type="number"
                            value={editingData['Utilized'] !== undefined && editingData['Utilized'] !== '' ? convert(editingData['Utilized'], 'USD', code) : ''}
                            onChange={e => handleEditChange('Utilized', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 text-right font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Commitment ({code})</label>
                          <input
                            type="number"
                            value={editingData['Commitment'] !== undefined && editingData['Commitment'] !== '' ? convert(editingData['Commitment'], 'USD', code) : ''}
                            onChange={e => handleEditChange('Commitment', e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 text-right font-mono"
                          />
                        </div>
                      </div>

                      {/* Forecast & Variance */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Forecast</label>
                          <div className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none dark:text-slate-350 text-right font-mono font-bold">
                            {format(editingData['Total utilization'] || 0)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Variance</label>
                          <div className={`w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-right font-mono font-bold ${(editingData['Balance'] || 0) < 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                            {format(editingData['Balance'] || 0)}
                          </div>
                        </div>
                      </div>

                      {/* Budget Status */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Budget Status</label>
                        <select
                          value={editingData['Status'] || ''}
                          onChange={e => handleEditChange('Status', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500"
                        >
                          <optgroup label="Cost Control">
                            {['Within Budget', 'Watchlist', 'Over Budget', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                          <optgroup label="Workflow">
                            {['In Progress', 'Completed', 'On Hold', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                        </select>
                      </div>

                      {/* Custom Columns */}
                      {columns.filter(c => c.custom).map(col => (
                        <div key={col.id}>
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{col.label}</label>
                          {col.type === 'status' ? (
                            <select
                              value={editingData[col.label] || ''}
                              onChange={e => handleEditChange(col.label, e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500"
                            >
                              {['Within Budget', 'Watchlist', 'Over Budget', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <input
                              type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                              value={col.type === 'currency' ? (editingData[col.label] !== undefined && editingData[col.label] !== '' ? convert(editingData[col.label], 'USD', code) : '') : (editingData[col.label] || '')}
                              onChange={e => handleEditChange(col.label, e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 font-mono"
                            />
                          )}
                        </div>
                      ))}

                      {/* Comments */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Remarks / Comments</label>
                        <textarea
                          rows={2}
                          value={editingData['Comments'] || ''}
                          onChange={e => handleEditChange('Comments', e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none outline-none dark:text-slate-100 focus:border-blue-500 resize-none font-bold"
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex justify-end gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => { setSelectedRowId(null); setEditingRowId(null); setEditingData({}); }}
                        className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-none text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-6 py-2 text-xs font-bold bg-[#0a6ed1] text-white rounded-none hover:bg-[#005bb5]"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fiori Budget Summary key-value table */}
              {selectedProject && tableData.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-none mt-8">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
                    Budget Control Summary
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold">
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350">Metric</th>
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350 text-right">Approved Budget</th>
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350 text-right">Forecast at Completion</th>
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350 text-right">Budget Variance</th>
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350 text-right">Consumption %</th>
                          <th className="py-2.5 px-4 text-slate-500 dark:text-slate-350 text-right">Remaining Budget</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900">
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">Overall Cost Control</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{format(overallBudget)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">{format(totalUtilization)}</td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${overallBudget - totalUtilization < 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                            {format(overallBudget - totalUtilization)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                            {overallBudget > 0 ? `${Math.round((totalUtilization / overallBudget) * 100)}%` : '0%'}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${overallBudget - totalUtilization < 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                            {format(Math.max(0, overallBudget - totalUtilization))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fiori Analytical Charts Section */}
              {selectedProject && tableData.length > 0 && (() => {
                const isDark = document.documentElement.classList.contains('dark');
                const labelColor = isDark ? '#94a3b8' : '#64748b';
                const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

                // 1. Group tableData by Category
                const categorySummary = tableData.reduce((acc, r) => {
                  const cat = r['Category'] || 'Other';
                  if (!acc[cat]) {
                    acc[cat] = { estimated: 0, forecast: 0, actual: 0 };
                  }
                  acc[cat].estimated += parseFloat(r['Estimated']) || 0;
                  acc[cat].forecast += parseFloat(r['Total utilization']) || 0;
                  acc[cat].actual += parseFloat(r['Utilized']) || 0;
                  return acc;
                }, {});

                const sortedCategories = Object.entries(categorySummary)
                  .map(([name, vals]) => ({ name, ...vals }))
                  .sort((a, b) => b.estimated - a.estimated);

                let displayedCategories = [];
                let displayedEstimated = [];
                let displayedForecast = [];
                let actualVals = [];

                if (sortedCategories.length > 6) {
                  const top = sortedCategories.slice(0, 5);
                  const rest = sortedCategories.slice(5);
                  const restEst = rest.reduce((sum, item) => sum + item.estimated, 0);
                  const restForecast = rest.reduce((sum, item) => sum + item.forecast, 0);
                  const restActual = rest.reduce((sum, item) => sum + item.actual, 0);

                  displayedCategories = [...top.map(t => t.name), 'Other'];
                  displayedEstimated = [...top.map(t => t.estimated), restEst];
                  displayedForecast = [...top.map(t => t.forecast), restForecast];
                  actualVals = [...top.map(t => t.actual), restActual];
                } else {
                  displayedCategories = sortedCategories.map(t => t.name);
                  displayedEstimated = sortedCategories.map(t => t.estimated);
                  displayedForecast = sortedCategories.map(t => t.forecast);
                  actualVals = sortedCategories.map(t => t.actual);
                }

                // 2. Options
                const allocationOption = {
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                  },
                  legend: {
                    data: ['Approved Budget', 'Forecast at Completion'],
                    textStyle: { color: labelColor },
                    bottom: 0
                  },
                  grid: { left: '3%', right: '3%', top: '10%', bottom: '15%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: displayedCategories,
                    axisLabel: { color: labelColor }
                  },
                  yAxis: {
                    type: 'value',
                    axisLabel: {
                      color: labelColor,
                      formatter: (val) => format(val, true, { notation: 'compact' })
                    },
                    splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                  },
                  series: [
                    {
                      name: 'Approved Budget',
                      type: 'bar',
                      itemStyle: { color: '#0a6ed1' },
                      data: displayedEstimated
                    },
                    {
                      name: 'Forecast at Completion',
                      type: 'bar',
                      itemStyle: { color: '#e9730c' },
                      data: displayedForecast
                    }
                  ]
                };

                const forecastVsActualOption = {
                  backgroundColor: 'transparent',
                  tooltip: { trigger: 'axis' },
                  legend: {
                    data: ['Approved Budget', 'Actual Spent'],
                    textStyle: { color: labelColor },
                    bottom: 0
                  },
                  grid: { left: '3%', right: '3%', top: '10%', bottom: '15%', containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: displayedCategories,
                    axisLabel: { color: labelColor }
                  },
                  yAxis: {
                    type: 'value',
                    axisLabel: {
                      color: labelColor,
                      formatter: (val) => format(val, true, { notation: 'compact' })
                    },
                    splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                  },
                  series: [
                    {
                      name: 'Approved Budget',
                      type: 'line',
                      symbol: 'circle',
                      symbolSize: 6,
                      lineStyle: { width: 2, color: '#0a6ed1' },
                      itemStyle: { color: '#0a6ed1' },
                      data: displayedEstimated
                    },
                    {
                      name: 'Actual Spent',
                      type: 'line',
                      symbol: 'circle',
                      symbolSize: 6,
                      lineStyle: { width: 2, color: '#107f3e' },
                      itemStyle: { color: '#107f3e' },
                      data: actualVals
                    }
                  ]
                };

                const utilizationPct = displayedCategories.map((cat, idx) => {
                  const est = displayedEstimated[idx] || 0;
                  const fore = displayedForecast[idx] || 0;
                  return est > 0 ? Math.round((fore / est) * 105) : 0; // scaled
                });

                const utilizationBulletOption = {
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'axis',
                    formatter: '{b}: {c}% utilized'
                  },
                  grid: { left: '3%', right: '5%', top: '10%', bottom: '10%', containLabel: true },
                  xAxis: {
                    type: 'value',
                    max: (value) => Math.max(100, value.max + 10),
                    axisLabel: { color: labelColor, formatter: '{value}%' },
                    splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                  },
                  yAxis: {
                    type: 'category',
                    data: displayedCategories,
                    axisLabel: { color: labelColor }
                  },
                  series: [
                    {
                      name: 'Utilization %',
                      type: 'bar',
                      barWidth: 14,
                      itemStyle: {
                        color: (params) => {
                          const pct = params.value;
                          if (pct > 100) return '#bb0000';
                          if (pct > 90) return '#e9730c';
                          return '#107f3e';
                        }
                      },
                      data: utilizationPct
                    }
                  ]
                };

                const varianceVals = displayedCategories.map((cat, idx) => {
                  const est = displayedEstimated[idx] || 0;
                  const fore = displayedForecast[idx] || 0;
                  return est - fore;
                });

                const deviationOption = {
                  backgroundColor: 'transparent',
                  tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                      const p = params[0];
                      return `<b>${p.name}</b><br/>Variance: <b>${format(p.value)}</b>`;
                    }
                  },
                  grid: { left: '3%', right: '3%', top: '10%', bottom: '10%', containLabel: true },
                  xAxis: {
                    type: 'value',
                    axisLabel: {
                      color: labelColor,
                      formatter: (val) => format(val, true, { notation: 'compact' })
                    },
                    splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }
                  },
                  yAxis: {
                    type: 'category',
                    data: displayedCategories,
                    axisLabel: { color: labelColor },
                    axisLine: { onZero: true }
                  },
                  series: [
                    {
                      name: 'Variance',
                      type: 'bar',
                      barWidth: 14,
                      itemStyle: {
                        color: (params) => {
                          return params.value < 0 ? '#bb0000' : '#107f3e';
                        }
                      },
                      data: varianceVals
                    }
                  ]
                };

                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-none mt-8">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-6">
                      Budget Performance Analytics
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart 1: Budget Allocation */}
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-none bg-slate-50/30 dark:bg-slate-900/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                          Budget Allocation by Cost Center
                        </h4>
                        <div style={{ height: '300px', width: '105%' }}>
                          <ReactECharts option={allocationOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                        </div>
                      </div>

                      {/* Chart 2: Forecast vs Actual */}
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-none bg-slate-50/30 dark:bg-slate-900/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                          Spend Trend (Forecast vs Actuals)
                        </h4>
                        <div style={{ height: '300px', width: '105%' }}>
                          <ReactECharts option={forecastVsActualOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                        </div>
                      </div>

                      {/* Chart 3: Budget Utilization */}
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-none bg-slate-50/30 dark:bg-slate-900/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                          Category Utilization vs Approved Budget Limit
                        </h4>
                        <div style={{ height: '300px', width: '105%' }}>
                          <ReactECharts option={utilizationBulletOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                        </div>
                      </div>

                      {/* Chart 4: Variance Deviation Analysis */}
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-none bg-slate-50/30 dark:bg-slate-900/50">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                          Variance Analysis (Deviation Bar Chart)
                        </h4>
                        <div style={{ height: '300px', width: '105%' }}>
                          <ReactECharts option={deviationOption} style={{ height: '100%', width: '100%' }} notMerge={true} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BUDGET REVISION VISIBILITY STRIP */}
              {selectedProject && (() => {
                const projRevisions = revisions.filter(r => r.project_name === selectedProject);
                const pendingRevs   = projRevisions.filter(r => ['Pending Head', 'Pending Finance', 'In Waiting Period'].includes(r.status));
                const approvedRevs  = projRevisions.filter(r => r.status === 'Approved');
                const lastApproved  = approvedRevs.sort((a, b) => new Date(b.approved_at || b.updated_at) - new Date(a.approved_at || a.updated_at))[0];
                const latestRev     = projRevisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

                const revImpact = approvedRevs.length > 0
                  ? approvedRevs.reduce((sum, r) => sum + ((r.revised_budget || 0) - (r.previous_budget || 0)), 0)
                  : 0;

                const fmt = (v) => format(v, true, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

                return (
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 shadow-none overflow-hidden mt-8">
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-[#0a6ed1]" />
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Budget Revision Status</p>
                      </div>
                      <button
                        onClick={() => { setActiveTab('Revisions'); fetchRevisions(); }}
                        className="text-[10px] font-black text-[#0a6ed1] hover:underline uppercase tracking-wider"
                      >
                        Manage Revisions →
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-0 divide-x divide-slate-200 dark:divide-slate-850">
                      {[
                        { label: 'Total Revisions',    value: projRevisions.length.toString(),       sub: 'submitted' },
                        { label: 'Pending Review',     value: pendingRevs.length.toString(),         sub: pendingRevs.length > 0 ? 'Awaiting approval' : 'None pending', highlight: pendingRevs.length > 0 },
                        { label: 'Last Approved',      value: lastApproved ? new Date(lastApproved.approved_at || lastApproved.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—', sub: lastApproved ? `Rev #${lastApproved.id}` : 'No approvals yet' },
                        { label: 'Cumulative Impact',  value: revImpact !== 0 ? (revImpact > 0 ? '+' : '') + fmt(revImpact) : '—', sub: 'from approved revisions', highlight: revImpact > 0 },
                        { label: 'Approval Status',    value: latestRev ? latestRev.status : 'No Revisions', sub: latestRev ? `Rev #${latestRev.id}` : 'Submit a revision request', isStatus: true, rev: latestRev },
                      ].map((item, i) => (
                        <div key={i} className="px-5 py-3 flex flex-col gap-1 bg-white dark:bg-slate-900">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
                          {item.isStatus && item.rev ? (
                            <RevisionBadge status={item.rev.status} />
                          ) : (
                            <p className={`text-sm font-black ${item.highlight ? 'text-[#e9730c]' : 'text-slate-800 dark:text-slate-100'}`}>{item.value}</p>
                          )}
                          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">{item.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Fiori Audit History Trail list */}
              {selectedProject && auditLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-none mt-8">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4">
                    Budget Audit Log History
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 font-bold">
                          <th className="py-2.5 px-4 text-slate-500 font-bold">Timestamp</th>
                          <th className="py-2.5 px-4 text-slate-500 font-bold">Action</th>
                          <th className="py-2.5 px-4 text-slate-500 font-bold">Performed By</th>
                          <th className="py-2.5 px-4 text-slate-500 font-bold">Role</th>
                          <th className="py-2.5 px-4 text-slate-500 text-right font-bold">Budget</th>
                          <th className="py-2.5 px-4 text-slate-500 text-center font-bold">Synced</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                        {auditLogs.slice(0, 5).map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900">
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-350">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold border ${
                                log.action === 'UPLOAD'
                                  ? 'text-[#0a6ed1] border-[#0a6ed1]/30 bg-[#0a6ed1]/5'
                                  : 'text-[#e9730c] border-[#e9730c]/30 bg-[#e9730c]/5'
                              }`}>{log.action}</span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">{log.user_name || log.details?.uploaded_by || '—'}</td>
                            <td className="py-3 px-4 text-slate-650 dark:text-slate-400">{log.user_role || '—'}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-750 dark:text-slate-300">
                              {log.details?.overall_budget != null ? format(log.details.overall_budget) : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {log.details?.sync_to_project
                                ? <span className="text-[#107f3e] font-bold text-[9px] uppercase">✓ Yes</span>
                                : <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          {/* ── REVISIONS TAB ────────────────────────────────────────────────────── */}
          {activeTab === 'Revisions' && (
            <div className="space-y-6">
              {isPM && selectedProject && (
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Budget Revision Management</h2>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">Submit and track revision requests for <span className="text-slate-900 dark:text-slate-100">{selectedProject}</span></p>
                    </div>
                    <button onClick={() => setShowNewRevisionForm(!showNewRevisionForm)}
                      className={`h-10 px-6 rounded-none font-bold text-xs uppercase tracking-wider transition-all border ${showNewRevisionForm
                        ? 'bg-white border-slate-350 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50'
                        : 'bg-[#0a6ed1] text-white hover:bg-[#085caf] border-[#0a6ed1]'
                        }`}>
                      {showNewRevisionForm ? 'Cancel Request' : 'New Revision Request'}
                    </button>
                  </div>

                  {showNewRevisionForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700"
                    >
                      <form onSubmit={handleRevisionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Industry Sector</label>
                            <select
                              value={revisionIndustry}
                              onChange={e => setRevisionIndustry(e.target.value)}
                              className="w-full px-3 py-2 bg-app-surface dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-sm font-bold text-slate-700 dark:text-slate-100"
                            >
                              <option value="Manufacturing">Manufacturing</option>
                              <option value="Automotive">Automotive</option>
                              <option value="Electrical">Electrical</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">
                              Enter procurement categories for market analysis
                            </label>
                            <input
                              type="text"
                              value={rawCategoriesInput}
                              onChange={e => setRawCategoriesInput(e.target.value)}
                              placeholder="e.g. chassis steel materials, imported ecu chips, copper transformer wiring..."
                              className="w-full px-3 py-2 bg-app-surface dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-sm font-bold text-slate-750 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Current Project Budget</label>
                            <div className="w-full px-3 py-2 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 border border-slate-255 dark:border-slate-700 rounded-none font-bold text-sm text-slate-700 dark:text-slate-100 font-mono">
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
                                className="w-full px-3 py-2 bg-app-surface dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-sm font-bold font-mono" />

                              <button type="button" onClick={handleFetchMarketAnalysis} disabled={fetchingMarket}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-[#e9730c] border border-[#e9730c] rounded-none text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50">
                                {fetchingMarket ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                                Analyze Market
                              </button>
                            </div>
                          </div>

                          {revisionData.revised_budget && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-none flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">New Projected Total</span>
                              <span className="text-base font-black text-[#0a6ed1] font-mono">
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
                              className="w-full px-3 py-2 bg-app-surface dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-sm resize-none font-bold" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Support Documentation</label>
                            <div className="relative">
                              <input type="file" accept=".pdf,.xlsx,.xls"
                                onChange={e => setRevisionData({ ...revisionData, attachment: e.target.files[0] })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                              <div className={`w-full px-3 py-3 border-2 border-dashed rounded-none transition-all flex items-center justify-center gap-3 ${revisionData.attachment ? 'border-[#0a6ed1] bg-[#0a6ed1]/5 text-[#0a6ed1]' : 'border-slate-250 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {revisionData.attachment ? revisionData.attachment.name : 'Click to attach evidence'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                          <button type="submit" disabled={submittingRevision}
                            className="h-10 px-8 text-xs font-bold uppercase tracking-wider bg-[#0a6ed1] text-white border border-[#0a6ed1] hover:bg-[#085caf] transition-all disabled:opacity-50">
                            {submittingRevision ? 'Submitting...' : 'Submit Revision'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </div>
              )}

              <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-none overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-app-bg dark:bg-slate-800/50">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Revision Request History</h2>
                  </div>
                  <button onClick={fetchRevisions} disabled={fetchingRevisions}
                    className="px-3 py-1.5 text-xs border border-slate-350 bg-white dark:bg-slate-900 text-slate-650 hover:bg-slate-50 rounded-none font-bold transition-all">
                    {fetchingRevisions ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-app-bg dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        {['Project', 'Requested By', 'Prev Budget', 'New Budget', 'Delta', 'Initiated', 'Approved', 'Status', 'Attachment', 'Actions']
                          .map(h => (
                            <th key={h} className={`py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-350 whitespace-nowrap ${['Prev Budget', 'New Budget', 'Delta'].includes(h) ? 'text-right' : ''
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
                            <p className="text-xs font-bold text-[#0a6ed1] animate-pulse">Fetching revisions...</p>
                          </td>
                        </tr>
                      ) : revisions.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-24">
                            <div className="flex flex-col items-center justify-center text-center px-4">
                              <div className="w-12 h-12 bg-app-bg dark:bg-slate-800/50 rounded-none flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700">
                                <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                              </div>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-300">No revision requests found</p>
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
                            <td className="py-3 px-4">
                              <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{rev.project_name}</p>
                              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">#{rev.id}</p>
                            </td>
                            <td className="py-3 px-4 text-xs font-bold text-slate-650 dark:text-slate-100">{rev.pm_name || '—'}</td>
                            <td className="py-3 px-4 text-right text-xs font-bold text-slate-650 dark:text-slate-100 font-mono">{format(rev.previous_budget)}</td>
                            <td className="py-3 px-4 text-right text-xs font-black text-[#0a6ed1] font-mono">{format(rev.revised_budget)}</td>
                            <td className="py-3 px-4 text-right">
                              <span className={`text-xs font-black font-mono ${delta >= 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                                {delta >= 0 ? '+' : ''}{format(delta)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {rev.approved_at ? new Date(rev.approved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-4"><RevisionBadge status={rev.status} /></td>
                            <td className="py-3 px-4">
                              {rev.attachment_name
                                ? <button onClick={() => handleDownloadAttachment(rev.id, rev.attachment_name)}
                                  className="text-xs font-bold text-[#0a6ed1] hover:underline">
                                  Download
                                </button>
                                : <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">None</span>
                              }
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                {isHead && rev.status === 'Pending Head' && (
                                  <>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Pending Finance')} title="Send to Finance"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-[#0a6ed1] text-[#0a6ed1] hover:bg-slate-50 rounded-none text-[10px] font-bold transition-all shadow-none">
                                      Forward
                                    </button>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Cancelled')} title="Cancel"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 text-slate-650 hover:bg-slate-50 rounded-none text-[10px] font-bold transition-all shadow-none">
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {isFinance && rev.status === 'Pending Finance' && (
                                  <>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Approved')} title="Approve"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-[#107f3e] text-[#107f3e] hover:bg-slate-50 rounded-none text-[10px] font-bold transition-all shadow-none">
                                      Approve
                                    </button>
                                    <button onClick={() => setShowWaitingModal(rev.id)} title="Set Waiting Period"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-[#e9730c] text-[#e9730c] hover:bg-slate-50 rounded-none text-[10px] font-bold transition-all shadow-none">
                                      Wait
                                    </button>
                                    <button onClick={() => handleStatusUpdate(rev.id, 'Declined')} title="Decline"
                                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-[#bb0000] text-[#bb0000] hover:bg-slate-50 rounded-none text-[10px] font-bold transition-all shadow-none">
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
              <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-none">
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Budget Revision Lifecycle</h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mt-1">Track approval stages for {selectedProject || 'Project'}</p>
                </div>

                {(() => {
                  const latestRev = revisions.find(r => r.project_name === selectedProject);
                  const status = latestRev?.status || 'None';

                  const findEmployee = (nameOrRole, roleFilter = null) => {
                    if (!nameOrRole) return null;
                    return employees.find(e => {
                      const matchName = e.name && e.name.toLowerCase() === nameOrRole.toLowerCase();
                      const matchRole = roleFilter ? (e.role && e.role.toLowerCase() === roleFilter.toLowerCase()) : true;
                      return matchName && matchRole;
                    }) || employees.find(e => roleFilter && e.role && e.role.toLowerCase() === roleFilter.toLowerCase());
                  };

                  const formatDate = (dateStr) => {
                    if (!dateStr) return '—';
                    try {
                      const d = new Date(dateStr);
                      return d.toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      });
                    } catch {
                      return dateStr;
                    }
                  };

                  const getTooltipData = (stepId) => {
                    const projectName = selectedProject || 'Project';
                    if (!latestRev) {
                      return {
                        title: stepId === 'PM' ? 'Submission Stage' : stepId === 'Head' ? 'Review Stage' : 'Approval Stage',
                        status: 'Awaiting Initiation',
                        details: [
                          { label: 'Project', value: projectName },
                          { label: 'Status', value: 'No revision request submitted' }
                        ]
                      };
                    }

                    if (stepId === 'PM') {
                      const pmEmp = findEmployee(latestRev.pm_name, 'Project Manager') || findEmployee(latestRev.pm_name);
                      return {
                        title: 'Submission Stage',
                        status: 'Completed',
                        details: [
                          { label: 'Submitted By', value: latestRev.pm_name && latestRev.pm_name !== 'Unknown' ? latestRev.pm_name : pmEmp?.name || managerName || 'Gokul' },
                          { label: 'Department', value: pmEmp?.department || 'DAS' },
                          { label: 'Employee ID', value: pmEmp?.employee_id || 'SEE001' },
                          { label: 'Submitted On', value: formatDate(latestRev.created_at) },
                          { label: 'Project', value: latestRev.project_name }
                        ]
                      };
                    }

                    if (stepId === 'Head') {
                      const isReviewed = ['Pending Finance', 'Approved', 'Declined', 'Cancelled'].includes(latestRev.status);
                      const headEmp = findEmployee('Deepak', 'Head');
                      if (isReviewed) {
                        return {
                          title: 'Review Stage',
                          status: 'Completed',
                          details: [
                            { label: 'Reviewed By', value: headEmp?.name || 'Deepak' },
                            { label: 'Department', value: headEmp?.department || 'Finance' },
                            { label: 'Employee ID', value: headEmp?.employee_id || 'HD001' },
                            { label: 'Reviewed On', value: formatDate(latestRev.updated_at) },
                            { label: 'Project', value: latestRev.project_name }
                          ]
                        };
                      } else {
                        return {
                          title: 'Review Stage',
                          status: 'Awaiting Review',
                          details: [
                            { label: 'Assigned To', value: headEmp?.name || 'Deepak' },
                            { label: 'Department', value: headEmp?.department || 'Finance' },
                            { label: 'Employee ID', value: headEmp?.employee_id || 'HD001' },
                            { label: 'Project', value: latestRev.project_name }
                          ]
                        };
                      }
                    }

                    if (stepId === 'Finance') {
                      const isApproved = latestRev.status === 'Approved';
                      const finEmp = findEmployee('Mike', 'Finance');
                      if (isApproved) {
                        return {
                          title: 'Approval Stage',
                          status: 'Approved',
                          details: [
                            { label: 'Approved By', value: finEmp?.name || 'Mike' },
                            { label: 'Department', value: finEmp?.department || 'Finance' },
                            { label: 'Employee ID', value: finEmp?.employee_id || 'EMP678' },
                            { label: 'Approved On', value: formatDate(latestRev.approved_at || latestRev.updated_at) },
                            { label: 'Project', value: latestRev.project_name }
                          ]
                        };
                      } else {
                        return {
                          title: 'Approval Stage',
                          status: latestRev.status === 'Declined' ? 'Declined' : 'Awaiting Approval',
                          details: [
                            { label: 'Assigned To', value: finEmp?.name || 'Mike' },
                            { label: 'Department', value: finEmp?.department || 'Finance' },
                            { label: 'Employee ID', value: finEmp?.employee_id || 'EMP678' },
                            { label: 'Project', value: latestRev.project_name }
                          ]
                        };
                      }
                    }
                    return null;
                  };

                  const steps = [
                    { id: 'PM', label: 'Submission', sub: 'PM Stage', icon: Send, done: !!latestRev },
                    { id: 'Head', label: 'Review', sub: 'Dept Head', icon: Eye, done: ['Pending Finance', 'Approved'].includes(status) },
                    { id: 'Finance', label: 'Approval', sub: 'Finance Dept', icon: CheckCircle2, done: status === 'Approved' }
                  ];

                  return (
                    <div className="w-full py-2">
                      {/* Stepper container with stable positioning - comes first to prevent hover bouncing */}
                      <div className="relative w-full max-w-2xl mx-auto mt-4 mb-4">
                        
                        {/* Connector Line 1 (PM -> Head) */}
                        <div className="absolute top-[28px] left-[40px] w-[calc(50%-40px)] h-[2px] overflow-hidden pointer-events-none z-0">
                          {/* Track */}
                          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700/60" />
                          {/* Fill */}
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: steps[0].done ? '100%' : '0%' }}
                            transition={{ duration: 0.9, ease: 'easeInOut' }}
                            className="absolute inset-0 bg-[#0a6ed1] origin-left"
                          />
                        </div>

                        {/* Connector Line 2 (Head -> Finance) */}
                        <div className="absolute top-[28px] left-[50%] right-[40px] h-[2px] overflow-hidden pointer-events-none z-0">
                          {/* Track */}
                          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700/60" />
                          {/* Fill */}
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: steps[1].done ? '100%' : '0%' }}
                            transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.25 }}
                            className="absolute inset-0 bg-[#0a6ed1] origin-left"
                          />
                        </div>

                        {/* Steps flex row */}
                        <div className="flex items-start justify-between w-full relative z-10 px-2">
                          {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isDone = step.done;
                            const isActive =
                              (idx === 0 && !latestRev) ||
                              (idx === 1 && status === 'Pending Head') ||
                              (idx === 2 && status === 'Pending Finance');

                            return (
                              <div key={step.id} className="flex flex-col items-center gap-3 flex-shrink-0 relative">
                                
                                {/* Circle outer box with hover handlers */}
                                <div 
                                  className="relative flex items-center justify-center w-14 h-14 cursor-pointer"
                                  onMouseEnter={() => setHoveredStep(step.id)}
                                  onMouseLeave={() => setHoveredStep(null)}
                                >
                                  {/* Pulse ring for active step */}
                                  {isActive && (
                                    <motion.div
                                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                      className="absolute inset-0 rounded-full bg-[#0a6ed1] pointer-events-none"
                                    />
                                  )}
                                  
                                  <motion.div
                                    initial={false}
                                    animate={{ scale: isActive || hoveredStep === step.id ? 1.1 : 1 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className={[
                                      'w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-none relative z-20 transition-colors',
                                      isDone
                                        ? 'bg-[#0a6ed1] border-[#0a6ed1]'
                                        : isActive
                                        ? 'bg-white dark:bg-slate-900 border-[#0a6ed1]'
                                        : 'bg-slate-100 dark:bg-slate-700/60 border-slate-300 dark:border-slate-600',
                                    ].join(' ')}
                                  >
                                    <Icon
                                      size={20}
                                      strokeWidth={2.5}
                                      className={
                                        isDone
                                          ? 'text-white'
                                          : isActive
                                          ? 'text-[#0a6ed1]'
                                          : 'text-slate-450 dark:text-slate-500'
                                      }
                                    />
                                  </motion.div>

                                </div>

                                {/* Labels */}
                                <div className="text-center w-20 pointer-events-none">
                                  <p
                                    className={`text-[11px] font-bold tracking-tight leading-tight mb-0.5 ${
                                      isDone || isActive
                                        ? 'text-slate-800 dark:text-slate-100'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                  <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
                                    {step.sub}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>

                      {/* Inline Details Panel - only active on hover with smooth height slide, placed BELOW the stepper to prevent bouncing */}
                      <AnimatePresence>
                        {hoveredStep && (
                          <motion.div
                            key={hoveredStep}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden max-w-2xl mx-auto w-full"
                          >
                            {(() => {
                              const tooltip = getTooltipData(hoveredStep);
                              if (!tooltip) return null;

                              return (
                                <div className="p-4 rounded-none bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-none text-left mt-2 mb-2">
                                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{tooltip.title}</h4>
                                    <span className={[
                                      'text-[9px] px-2 py-0.5 rounded-none border font-black uppercase tracking-wider',
                                      tooltip.status === 'Completed' || tooltip.status === 'Approved'
                                        ? 'bg-[#107f3e]/10 text-[#107f3e] border-[#107f3e]/20'
                                        : tooltip.status === 'Declined'
                                        ? 'bg-[#bb0000]/10 text-[#bb0000] border-[#bb0000]/20'
                                        : 'bg-[#e9730c]/10 text-[#e9730c] border-[#e9730c]/20'
                                    ].join(' ')}>
                                      {tooltip.status}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                                    {tooltip.details.map((det, dIdx) => (
                                      <div key={dIdx} className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{det.label}</span>
                                        <span className="text-xs text-slate-700 dark:text-slate-200 font-black truncate mt-0.5">{det.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-none">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-350 uppercase tracking-wider">Revision Count</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono">
                      {revisions.filter(r => r.project_name === selectedProject).length}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold">Total requests submitted</p>
                </div>

                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-none">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-350 uppercase tracking-wider">Approval Rate</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono">
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

                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-6 shadow-none">
                  <div className="flex flex-col gap-2 mb-4">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-350 uppercase tracking-wider">Pending Review</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 font-mono">
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
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-none">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Budget Allocation</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[#0a6ed1] text-xs leading-none">●</span>
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
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono">{format(cat.value)} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-none overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: idx * 0.1 }}
                              className={`h-full rounded-none ${idx === 0 ? 'bg-[#0a6ed1]' :
                                  idx === 1 ? 'bg-[#107f3e]' :
                                    idx === 2 ? 'bg-[#e9730c]' : 'bg-slate-500'
                                }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {estimatedBreakdown.length === 0 && (
                      <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-app-bg dark:bg-slate-800/50 rounded-none flex items-center justify-center mb-4">
                          <PieChart className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic">No allocation data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Utilization Health */}
                <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 p-8 shadow-none">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-8">Utilization Health</h3>

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
                          className={isOverBudget ? 'text-[#bb0000]' : 'text-[#0a6ed1]'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-3xl font-black font-mono ${isOverBudget ? 'text-[#bb0000]' : 'text-slate-900 dark:text-slate-100'}`}>
                          {Math.round((totalUtilization / (parseFloat(overallBudget) || 1)) * 100)}%
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Utilized</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Spent (Utilized)</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{format(totalUtilized)}</p>
                    </div>
                    <div className="p-4 bg-app-bg dark:bg-slate-800/50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Committed</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{format(totalCommitment)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BUDGET HISTORY TAB ───────────────────────────────────────────────── */}
          {activeTab === 'History' && (
            <div className="bg-app-surface dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 shadow-none overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-app-bg dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Budget History & Snapshots</h2>
                </div>
                <div className="flex items-center gap-2.5">
                  <select
                    value={historyFilter}
                    onChange={e => { setHistoryFilter(e.target.value); setHistoryCurrentPage(1); }}
                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-750 rounded-none outline-none cursor-pointer text-slate-700 dark:text-slate-100 focus:border-[#0a6ed1]">
                    <option value="All">All Types</option>
                    <option value="Upload">Uploads</option>
                    <option value="Save">Manual Saves</option>
                  </select>
                  {(hasBudgetPerm('budget_audits')) && (
                    <button onClick={() => { setShowAuditModal(true); fetchAuditLogs(); }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#0a6ed1] bg-white border border-[#0a6ed1] rounded-none hover:bg-slate-50 transition-all">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Budget Audits
                    </button>
                  )}
                  <button onClick={fetchHistory} disabled={fetchingHistory}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-650 bg-white border border-slate-350 rounded-none hover:bg-slate-50 transition-all">
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
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider font-bold">Uploaded By</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider font-bold">Last Updated</th>
                      <th className="py-3 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {fetchingHistory ? (
                      Array.from({ length: 5 }).map((_, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4"><Skeleton className="h-4 w-28 rounded-none" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-none" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-24 rounded-none" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20 rounded-none" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-32 rounded-none" /></td>
                          <td className="py-3 px-4 text-center"><Skeleton className="h-6 w-16 rounded-none mx-auto" /></td>
                        </tr>
                      ))
                    ) : paginatedHistoryData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-24">
                          <div className="flex flex-col items-center justify-center text-center px-4">
                            <div className="w-12 h-12 bg-app-bg dark:bg-slate-800/50 rounded-none flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700">
                              <History className="h-6 w-6 text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-100">No budget history found</p>
                            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium max-w-[200px] mt-1">
                              Upload an excel snapshot or save a manual revision to start building your budget history.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedHistoryData.map(item => (
                      <tr key={item.id} className="hover:bg-app-bg dark:bg-slate-800/50 dark:hover:bg-slate-700/20 transition-all duration-200">
                        <td className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-100 tracking-tight">
                          {managerName || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold border ${item.attachment_name ? 'text-[#0a6ed1] border-[#0a6ed1]/30 bg-[#0a6ed1]/5' : 'text-[#e9730c] border-[#e9730c]/30 bg-[#e9730c]/5'}`}>
                            {item.attachment_name ? 'Upload' : 'Save'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-[#0a6ed1] font-mono">{format(item.overall_budget)}</td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-600 dark:text-slate-100">{item.uploaded_by || 'Unknown'}</td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-300">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => loadVersion(item.id)}
                              title="View Snapshot"
                              className="text-[#0a6ed1] hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-none transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteVersion(item.id)}
                              title="Delete Snapshot"
                              className="text-[#bb0000] hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-none transition-all">
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
                      className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-none text-slate-550 disabled:opacity-40 hover:bg-slate-50 transition-all">
                      First
                    </button>
                    {getHistoryPageNumbers().map(p => (
                      <button key={p} onClick={() => setHistoryCurrentPage(p)}
                        className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-none border transition-all ${p === historyCurrentPage
                          ? 'bg-[#0a6ed1] text-white border-[#0a6ed1]'
                          : 'text-slate-655 dark:text-slate-350 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                          }`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setHistoryCurrentPage(totalHistoryPages)} disabled={historyCurrentPage === totalHistoryPages}
                      className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-none text-slate-550 disabled:opacity-40 hover:bg-slate-50 transition-all">
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
          <div className="app-modal-container !rounded-none max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col h-fit">
            <div className="app-modal-header bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
              <div className="flex items-center gap-4">
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

            <div className="app-modal-body flex-1 flex flex-col min-h-0 !overflow-hidden p-6 sm:p-8">
              {fetchingAudit ? (
                <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Index</th>
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 animate-pulse">
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="py-3 px-5 text-xs font-bold"><Skeleton className="h-4 w-4 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-28 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-5 w-16 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-24 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-20 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-24 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-8 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-32 rounded" /></td>
                          <td className="py-3 px-5"><Skeleton className="h-4 w-12 rounded" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="overflow-y-auto max-h-[60vh] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-5 text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Index</th>
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
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${log.action === 'UPLOAD'
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
                </div>
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
          <div className="app-modal-container !rounded-none max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-none">
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
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-none p-6 border border-slate-200 dark:border-slate-700 mb-6">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-4">
                  Standard Column Headers
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    "Category", "Item Name", "Unit Type", "Unit count",
                    "Per unit cost", "Utilized", "Commitment", "Status", "Comments"
                  ].map(header => (
                    <div key={header} className="px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-none text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-100">
                      {header}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-none border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-300 font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Unit Type</th>
                      <th className="px-6 py-4">Count</th>
                      <th className="px-6 py-4">Cost</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-650 dark:text-slate-100">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">CAPEX</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Laptop Dell XPS</td>
                      <td className="px-6 py-4">Nos</td>
                      <td className="px-6 py-4">5</td>
                      <td className="px-6 py-4">1,20,000</td>
                      <td className="px-6 py-4 font-black text-[#0a6ed1]">IN PROGRESS</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Revenue</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">Software License</td>
                      <td className="px-6 py-4">Nos</td>
                      <td className="px-6 py-4">1</td>
                      <td className="px-6 py-4">50,000</td>
                      <td className="px-6 py-4 font-black text-[#107f3e]">COMPLETED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="app-modal-footer flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50 justify-end gap-4">
              <button onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none hover:bg-slate-50">
                Close
              </button>
              <button onClick={handleDownloadTemplate}
                className="px-6 py-2 text-xs font-bold bg-[#107f3e] text-white border border-[#107f3e] rounded-none hover:bg-[#0e6b35] transition-colors uppercase tracking-wider">
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Budget Date Modal ────────────────────────────────────────────────── */}
      {showDateModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container !rounded-none max-w-md w-full mx-4 shadow-none">
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowDateModal(false)}
                className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-none hover:bg-slate-50 text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button onClick={executeSave} disabled={saving}
                className="px-6 py-2 text-xs font-bold bg-[#0a6ed1] hover:bg-[#085caf] border border-[#0a6ed1] text-white rounded-none disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Excel Upload Modal ────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container !rounded-none max-w-md w-full mx-4 shadow-none">
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
              {/* Currency Scale Alignment Warning */}
              <div className="p-3 bg-[#e9730c]/10 border border-[#e9730c]/20 rounded-none flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-[#e9730c] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-[#e9730c] uppercase tracking-widest">Currency Scale Warning</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-semibold">
                    Ensure your Excel values are populated in the selected project currency (<span className="font-black text-[#e9730c]">{code}</span>). The platform will automatically convert to the system baseline (USD) for storage.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Project Name</label>
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-xs font-bold text-slate-500 dark:text-slate-350">
                  {selectedProject || 'NONE SELECTED'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2">Budget Effective Date</label>
                <input
                  type="date"
                  value={budgetDate}
                  onChange={(e) => setBudgetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-none focus:border-[#0a6ed1] outline-none text-xs font-bold text-slate-900 dark:text-slate-100"
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
                  <div className={`w-full px-3 py-4 bg-slate-50 dark:bg-slate-850 border-2 border-dashed rounded-none flex items-center justify-center transition-all ${tempFile ? 'border-[#0a6ed1] bg-[#0a6ed1]/5 text-[#0a6ed1]' : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                    <div className="text-center">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-xs font-bold">{tempFile ? tempFile.name : 'Drag Excel file here or click to browse'}</p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-505 mt-1">Accepts XLSX, XLS, or CSV files</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-modal-footer">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setTempFile(null);
                }}
                className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-none hover:bg-slate-50 text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (tableData.length > 0) {
                    setShowOverwriteWarning(true);
                  } else {
                    executeUpload();
                  }
                }}
                disabled={!tempFile}
                className="px-6 py-2 text-xs font-bold bg-[#0a6ed1] hover:bg-[#085caf] border border-[#0a6ed1] text-white rounded-none disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overwrite Warning Modal ───────────────────────────────────────────── */}
      {showOverwriteWarning && (
        <div className="app-modal-overlay bg-black/60 z-50">
          <div className="app-modal-container !rounded-none max-w-md w-full mx-4 shadow-none">
            <div className="app-modal-header border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="app-modal-title text-slate-900 dark:text-slate-100">Overwrite Existing Budget?</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Existing table data will be overwritten</p>
              </div>
              <button onClick={() => setShowOverwriteWarning(false)}
                className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body p-6 space-y-4">
              <div className="p-3 bg-[#bb0000]/10 border border-[#bb0000]/20 rounded-none flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-[#bb0000] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-[#bb0000] uppercase tracking-widest">Warning</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">
                    Uploading a new budget file will replace all current rows in the table. This action cannot be undone unless you refresh without saving.
                  </p>
                </div>
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowOverwriteWarning(false)}
                className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-none hover:bg-slate-50 text-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button onClick={executeUpload}
                className="px-6 py-2 text-xs font-bold bg-[#bb0000] hover:bg-[#a00000] border border-[#bb0000] text-white rounded-none">
                Overwrite & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Market Analysis Modal ─────────────────────────────────────────── */}
      {showMarketSuggestion && marketAnalysis && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 !rounded-none overflow-hidden shadow-none">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                  <Sparkles className="h-5 w-5 text-[#e9730c]" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Procurement Market Intelligence Report
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                    Live Pricing & Risk Buffers — {marketAnalysis.project_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-none uppercase tracking-wider">
                  1 USD = {marketAnalysis.exchange_rate} {marketAnalysis.currency}
                </span>
                <button onClick={() => setShowMarketSuggestion(false)}
                  className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-none text-slate-400 hover:text-slate-650 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-900/30">
              
              {/* Section 1: Detected Categories & Commodity Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Detected Categories List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Detected Categories</h4>
                  <div className="space-y-2">
                    {marketAnalysis.detected_categories && marketAnalysis.detected_categories.map((det, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-100">"{det.raw_input}"</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Normalized: {det.normalized.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-none border text-[9px] font-black uppercase tracking-wider ${
                            det.confidence >= 0.85 ? 'bg-[#107f3e]/10 text-[#107f3e] border-[#107f3e]/20' :
                            det.confidence >= 0.70 ? 'bg-[#0a6ed1]/10 text-[#0a6ed1] border-[#0a6ed1]/20' :
                            'bg-[#e9730c]/10 text-[#e9730c] border-[#e9730c]/20'
                          }`}>
                            {Math.round(det.confidence * 100)}% Confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commodity Index Snapshots */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Commodity Indices & Pricing</h4>
                  <div className="space-y-2">
                    {marketAnalysis.market_indicators && Object.entries(marketAnalysis.market_indicators).map(([cat, data], idx) => {
                      const isRelevant = marketAnalysis.detected_categories?.some(d => d.normalized === cat) || cat === 'steel';
                      if (!isRelevant) return null;

                      const pct = data.percentage_change;
                      const isUp = pct >= 0;
                      return (
                        <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-100 uppercase">{cat}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{data.source} • Volatility: {data.volatility_index}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-105">
                              {format(data.current_price)}
                            </p>
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                              {isUp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isUp ? '+' : ''}{pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Procurement Risk Metrics */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Risk Assessment Profile</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketAnalysis.category_results && Object.entries(marketAnalysis.category_results).map(([cat, res], idx) => (
                    <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{cat} Risks</span>
                        <span className={`px-2 py-0.5 rounded-none border text-[9px] font-black uppercase tracking-wider ${
                          res.risks.risk_level === 'Critical' ? 'bg-[#bb0000]/10 text-[#bb0000] border-[#bb0000]/20' :
                          res.risks.risk_level === 'High' ? 'bg-[#e9730c]/10 text-[#e9730c] border-[#e9730c]/20' :
                          res.risks.risk_level === 'Medium' ? 'bg-[#e9730c]/5 text-[#e9730c] border-[#e9730c]/10' :
                          'bg-[#107f3e]/10 text-[#107f3e] border-[#107f3e]/20'
                        }`}>
                          {res.risks.risk_level} Risk ({res.risks.overall_risk_score}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                        <div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>Commodity Price</span>
                            <span className="font-bold">{res.risks.commodity_escalation}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-none overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-none" style={{ width: `${res.risks.commodity_escalation}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>Logistics Delay</span>
                            <span className="font-bold">{res.risks.logistics_risk}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-none overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-none" style={{ width: `${res.risks.logistics_risk}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>Supplier Sourcing</span>
                            <span className="font-bold">{res.risks.supplier_dependency}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-none overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-none" style={{ width: `${res.risks.supplier_dependency}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>Forex Fluctuations</span>
                            <span className="font-bold">{res.risks.forex_exposure}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-none overflow-hidden">
                            <div className="h-full bg-slate-500 rounded-none" style={{ width: `${res.risks.forex_exposure}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                            <span>Project Utilization</span>
                            <span className="font-bold">{res.risks.utilization_risk}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-none overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-none" style={{ width: `${res.risks.utilization_risk}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Live Warning Alerts Feed */}
              {marketAnalysis.alerts && marketAnalysis.alerts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Live Warning Alerts Feed</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {marketAnalysis.alerts.map((alert, idx) => (
                      <div key={idx} className={`p-3 rounded-none border flex items-center justify-between text-xs font-semibold ${
                        alert.severity === 'Critical'
                          ? 'bg-[#bb0000]/10 text-[#bb0000] border-[#bb0000]/25'
                          : 'bg-[#e9730c]/10 text-[#e9730c] border-[#e9730c]/25'
                      }`}>
                        <span>{alert.message}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 px-2 py-0.5 rounded-none border border-slate-200 dark:border-slate-700 shadow-none">
                          {alert.metric}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Forecast Pricing Trends */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Forecasting Trend Visualizer (30, 60, 90 Days)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {marketAnalysis.category_results && Object.entries(marketAnalysis.category_results).map(([cat, res], idx) => {
                    if (!res.forecasts || !res.forecasts.forecast) return null;
                    const currentVal = res.forecasts.current_price || 100.0;
                    return (
                      <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span className="uppercase">{cat} Price Outlook</span>
                          <span className="text-[10px] font-semibold text-slate-400">Baseline: {format(currentVal)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {res.forecasts.forecast.map((val, fIdx) => {
                            const pctChange = ((val - currentVal) / currentVal) * 100.0;
                            const day = (fIdx + 1) * 30;
                            return (
                              <div key={fIdx} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{day} Days</p>
                                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-105 mt-1">
                                  {format(val)}
                                </p>
                                <span className={`text-[9px] font-bold ${pctChange >= 0 ? 'text-[#bb0000]' : 'text-[#107f3e]'}`}>
                                  {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Budget Reconciliation Section */}
              {marketAnalysis.reconciliation && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Project Budget Reconciliation</h4>
                  <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-none bg-white dark:bg-slate-800 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Current Budget</p>
                        <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-100 mt-1">
                          {format(marketAnalysis.reconciliation.current_budget / marketAnalysis.exchange_rate)}
                        </p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                          ({marketAnalysis.reconciliation.current_budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {marketAnalysis.currency})
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Utilization</p>
                        <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-100 mt-1">
                          {format(marketAnalysis.reconciliation.total_utilization / marketAnalysis.exchange_rate)}
                        </p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                          ({marketAnalysis.reconciliation.total_utilization.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {marketAnalysis.currency})
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Project Balance</p>
                        <p className={`text-sm font-mono font-bold mt-1 ${marketAnalysis.reconciliation.balance >= 0 ? 'text-[#107f3e]' : 'text-[#bb0000]'}`}>
                          {format(marketAnalysis.reconciliation.balance / marketAnalysis.exchange_rate)}
                        </p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                          ({marketAnalysis.reconciliation.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {marketAnalysis.currency})
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Difference (Deficit)</p>
                        <p className={`text-sm font-mono font-bold mt-1 ${marketAnalysis.reconciliation.difference > 0 ? 'text-[#bb0000]' : 'text-slate-500'}`}>
                          {marketAnalysis.reconciliation.difference > 0 ? '+' : ''}{format(marketAnalysis.reconciliation.difference / marketAnalysis.exchange_rate)}
                        </p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                          ({marketAnalysis.reconciliation.difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {marketAnalysis.currency})
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-450 font-semibold">• Existing Utilization Overrun:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {format(Math.max(0, marketAnalysis.reconciliation.difference) / marketAnalysis.exchange_rate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-450 font-semibold">• Mapped Material Risk & Escalation Buffers:</span>
                        <span className="font-mono text-[#bb0000] font-bold">
                          +{format(marketAnalysis.reconciliation.raw_material_risk_buffer / marketAnalysis.exchange_rate)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <span className="font-black text-slate-800 dark:text-slate-200">Total Suggested Revision Request:</span>
                        <span className="font-mono text-[#0a6ed1] font-black text-sm">
                          +{format(marketAnalysis.reconciliation.total_revision_requested / marketAnalysis.exchange_rate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Affected Items & Granular Calculations Breakdown */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Affected Procurement Items & Calculations</h4>
                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-none bg-white dark:bg-slate-800">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                        <th className="py-2.5 px-4 font-black">Budget Row Description</th>
                        <th className="py-2.5 px-4 font-black">Matched Category</th>
                        <th className="py-2.5 px-4 text-right font-black">Original Budget</th>
                        <th className="py-2.5 px-4 text-right font-black">Suggested Revision</th>
                        <th className="py-2.5 px-4 text-right font-black">Suggested Additional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                      {marketAnalysis.affected_rows && marketAnalysis.affected_rows.map((row, rIdx) => (
                        <React.Fragment key={rIdx}>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-200">{row.description}</td>
                            <td className="py-2.5 px-4 uppercase text-slate-550 dark:text-slate-400 font-semibold">{row.category} ({Math.round(row.confidence_score * 100)}%)</td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">{format(row.original_budget_usd)}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0a6ed1]">{format(row.suggested_budget_usd)}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-[#bb0000]">+{format(row.overrun_usd)}</td>
                          </tr>
                          {row.calculations && (
                            <tr>
                              <td colSpan={5} className="py-2 px-6 bg-slate-50/50 dark:bg-slate-900/30">
                                <div className="space-y-1 py-1">
                                  <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Applied Calculations breakdown:</p>
                                  {row.calculations.map((calc, cIdx) => (
                                    <div key={cIdx} className={`flex justify-between items-center text-[10px] ${!calc.applied ? 'opacity-40 line-through' : ''}`}>
                                      <span className="text-slate-500 dark:text-slate-400">• {calc.step} ({calc.formula})</span>
                                      <span className="font-mono text-slate-600 dark:text-slate-300">+{format(calc.usd_val)}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 6: Suggesed Revision Overrun & Rationale */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-[#0a6ed1] uppercase tracking-widest mb-1">Suggested Revision Overrun</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-105 tracking-tight font-mono">
                    +{format(marketAnalysis.delta)}
                  </p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-1">
                    Proposed new project total: <span className="font-bold text-slate-600 dark:text-slate-300">{format(marketAnalysis.suggested_overall_budget)}</span>
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-none border border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">System Rationale</p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    "{marketAnalysis.reasoning}"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 z-20">
              <button type="button" onClick={() => setShowMarketSuggestion(false)}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-550 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                Dismiss
              </button>
              <button type="button" onClick={handleAcceptSuggestion}
                className="px-8 py-2.5 bg-[#0a6ed1] hover:bg-[#085caf] border border-[#0a6ed1] text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all active:scale-[0.98] shadow-none">
                Apply Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetMaster;
