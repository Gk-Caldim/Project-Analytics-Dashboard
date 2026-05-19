import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Upload, File, CheckCircle, Clock, AlertCircle, Download, Trash2, Eye, Edit,
  Plus, Search, X, ChevronUp, ChevronDown, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, FileText, FileSpreadsheet, Database,
  HardDrive, Archive, Check, Calendar, Save, EyeOff, User,
  Edit2, Columns, Rows, CheckSquare, Square, FolderTree, Layout, Snowflake, RefreshCw, Copy, ArrowUp, ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';

// Delete Confirmation Modal Component (same as before)
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, message, type = 'column' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-app-surface dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-border dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary dark:text-slate-100">Confirm Delete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-text-secondary dark:text-slate-300">{message}</p>
          <p className="text-sm text-red-600 mt-2 font-medium">This action cannot be undone.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border dark:border-slate-700 rounded-lg text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const FileContentViewer = ({
  fileData,
  trackerInfo,
  onBack,
  onSaveData,
  viewOnly = false,
  context = 'upload'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');
  const [editedHeaders, setEditedHeaders] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState({
    isOpen: false,
    type: '',
    index: null,
    onConfirm: null,
    message: ''
  });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // Checkbox state
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Action prompts state
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);

  const [columnFilter, setColumnFilter] = useState('');

  // Column Virtualization State
  const [startColumnIndex, setStartColumnIndex] = useState(0);

  // Freeze states
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [showFreezeColumnModal, setShowFreezeColumnModal] = useState(false);
  const [showFreezeRowModal, setShowFreezeRowModal] = useState(false);
  const [activeDropdownColumn, setActiveDropdownColumn] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdownColumn !== null && !event.target.closest('.dropdown-menu-container')) {
        setActiveDropdownColumn(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdownColumn]);

  const handleSortFromMenu = (header, direction) => {
    setSortConfig({ key: header, direction });
    setCurrentPage(1);
    setActiveDropdownColumn(null);
  };

  const handleCopyColumnName = async (label) => {
    try {
      await navigator.clipboard.writeText(label);
      showNotification('Column name copied to clipboard');
      setActiveDropdownColumn(null);
    } catch (err) {
      showNotification('Failed to copy column name', 'error');
    }
  };

  const handleFreezeColumnMenu = (index) => {
    if (frozenColumns.includes(index)) {
      setFrozenColumns(frozenColumns.filter(idx => idx !== index));
    } else {
      setFrozenColumns([...frozenColumns, index].sort((a, b) => a - b));
    }
    setActiveDropdownColumn(null);
  };

  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const capitalizeHeaders = (headers) => {
    if (!headers || !Array.isArray(headers)) return headers;
    return headers.map(header => capitalizeFirstLetter(header));
  };

  useEffect(() => {
    if (!fileData) {
      setIsLoading(false);
      return;
    }

    if (fileData.sheets && Array.isArray(fileData.sheets) && fileData.sheets.length > 0) {
      const currentSheet = fileData.sheets[0];
      const capitalizedHeaders = capitalizeHeaders([...currentSheet.headers]);
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(currentSheet.data.map(row => [...(row || [])]));
      const initialRowData = {};
      capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }

    if (fileData.headers && fileData.data && Array.isArray(fileData.data)) {
      const capitalizedHeaders = capitalizeHeaders([...fileData.headers]);
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(fileData.data.map(row => [...(row || [])]));
      const initialRowData = {};
      capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }

    if (Array.isArray(fileData) && fileData.length > 0) {
      const headers = Object.keys(fileData[0]);
      const capitalizedHeaders = capitalizeHeaders(headers);
      const data = fileData.map(row => capitalizedHeaders.map((h, index) => {
        const originalHeader = headers[index];
        return row[originalHeader] !== undefined ? row[originalHeader] : '';
      }));
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(data);
      const initialRowData = {};
      capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }

    if (fileData.data && Array.isArray(fileData.data) && fileData.data.length > 0) {
      if (typeof fileData.data[0] === 'object' && !Array.isArray(fileData.data[0])) {
        const headers = Object.keys(fileData.data[0]);
        const capitalizedHeaders = capitalizeHeaders(headers);
        const data = fileData.data.map(row => capitalizedHeaders.map((h, index) => {
          const originalHeader = headers[index];
          return row[originalHeader] || '';
        }));
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(data);
        const initialRowData = {};
        capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
      if (Array.isArray(fileData.data[0])) {
        const headers = fileData.headers || Array.from({ length: fileData.data[0].length }, (_, i) => `Column ${i + 1}`);
        const capitalizedHeaders = capitalizeHeaders([...headers]);
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(fileData.data.map(row => [...(row || [])]));
        const initialRowData = {};
        capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
    }

    if (fileData.rows && Array.isArray(fileData.rows) && fileData.rows.length > 0) {
      if (typeof fileData.rows[0] === 'object' && !Array.isArray(fileData.rows[0])) {
        const headers = Object.keys(fileData.rows[0]);
        const capitalizedHeaders = capitalizeHeaders(headers);
        const data = fileData.rows.map(row => capitalizedHeaders.map((h, index) => {
          const originalHeader = headers[index];
          return row[originalHeader] || '';
        }));
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(data);
        const initialRowData = {};
        capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
    }

    if (fileData.content && typeof fileData.content === 'string') {
      try {
        const lines = fileData.content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          const capitalizedHeaders = capitalizeHeaders(headers);
          const data = lines.slice(1).filter(line => line.trim()).map(line => line.split(',').map(cell => cell.trim()));
          setEditedHeaders(capitalizedHeaders);
          setEditedRows(data);
          const initialRowData = {};
          capitalizedHeaders.forEach(header => { initialRowData[header] = ''; });
          setNewRowData(initialRowData);
          setIsLoading(false);
          return;
        }
      } catch (e) { console.error('Error parsing CSV:', e); }
    }
    setIsLoading(false);
  }, [fileData]);

  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  const handleStartColumnEdit = (colIndex, header) => {
    if (viewOnly) return;
    setEditingColumnIndex(colIndex);
    setTempColumnName(header);
  };

  const handleSaveColumnEdit = (colIndex) => {
    if (viewOnly) return;
    if (!tempColumnName.trim()) {
      showNotification('Column name cannot be empty', 'error');
      return;
    }
    if (tempColumnName !== editedHeaders[colIndex]) {
      if (editedHeaders.includes(tempColumnName)) {
        showNotification('Column name already exists', 'error');
        return;
      }
      const newHeaders = [...editedHeaders];
      newHeaders[colIndex] = tempColumnName.trim();
      setEditedHeaders(newHeaders);
      showNotification('Column name updated', 'success');
    }
    setEditingColumnIndex(null);
    setTempColumnName('');
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    if (viewOnly) return;
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      const allVisibleIndices = paginatedRows.map(item => item.originalIndex);
      setSelectedRows(allVisibleIndices);
      setSelectAll(true);
    }
  };

  const toggleRowSelection = (rowIndex) => {
    if (viewOnly) return;
    setSelectedRows(prev => {
      if (prev.includes(rowIndex)) {
        const newSelection = prev.filter(idx => idx !== rowIndex);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, rowIndex];
        const allVisibleIndices = paginatedRows.map(item => item.originalIndex);
        const allSelected = allVisibleIndices.every(idx => newSelection.includes(idx));
        if (allSelected && allVisibleIndices.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  const handleBulkDelete = () => {
    if (viewOnly) return;
    if (selectedRows.length === 0) {
      showNotification('Please select at least one row to delete', 'error');
      return;
    }
    setShowBulkDeletePrompt({ show: true, count: selectedRows.length });
  };

  const confirmBulkDelete = () => {
    if (viewOnly) return;
    const newRows = editedRows.filter((_, index) => !selectedRows.includes(index));
    setEditedRows(newRows);
    setSelectedRows([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    if (paginatedRows.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
    showNotification(`${selectedRows.length} row(s) deleted successfully`);
  };

  const rowsWithIndices = useMemo(() => {
    return editedRows.map((row, index) => ({ data: row, originalIndex: index }));
  }, [editedRows]);

  const filteredRows = useMemo(() => {
    return rowsWithIndices.filter(item => {
      const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
        item.data.some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesColumnFilter = !columnFilter || columnFilter.trim() === '' ||
        item.data.some(cell => String(cell).toLowerCase().includes(columnFilter.toLowerCase()));
      return matchesSearch && matchesColumnFilter;
    });
  }, [rowsWithIndices, searchTerm, columnFilter]);

  const sortedRows = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return [];
    if (!sortConfig.key) return filteredRows;
    const colIndex = editedHeaders.findIndex(h => h === sortConfig.key);
    if (colIndex === -1) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a.data[colIndex] || '';
      const bVal = b.data[colIndex] || '';
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig, editedHeaders]);

  const totalItems = sortedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedRows([]);
    setSelectAll(false);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedRows([]);
    setSelectAll(false);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const handleEditRow = () => {
    if (viewOnly) return;
    if (selectedRows.length === 0) {
      showNotification('Please select a row to edit', 'error');
      return;
    }
    if (selectedRows.length > 1) {
      showNotification('Please select only one row to edit at a time', 'error');
      return;
    }
    const rowIndex = selectedRows[0];
    setIsEditing(true);
    setEditingRowIndex(rowIndex);
    showNotification('Editing mode enabled for selected row', 'info');
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    if (viewOnly) return;
    if (!isEditing || rowIndex !== editingRowIndex) return;
    const newRows = [...editedRows];
    if (!newRows[rowIndex]) newRows[rowIndex] = new Array(editedHeaders.length).fill('');
    newRows[rowIndex][colIndex] = value;
    setEditedRows(newRows);
  };

  const handleSaveChanges = () => {
    if (viewOnly) return;
    const updatedFileData = { headers: editedHeaders, data: editedRows };
    if (onSaveData) onSaveData(updatedFileData);
    showNotification('Changes saved successfully!');
    setIsEditing(false);
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => {
    if (viewOnly) return;
    setIsEditing(false);
    setEditingRowIndex(null);
    showNotification('Edit cancelled', 'info');
  };

  const handleAddColumn = () => {
    if (viewOnly) return;
    if (!newColumnName.trim()) {
      showNotification('Please enter a column name', 'error');
      return;
    }
    if (editedHeaders.includes(newColumnName)) {
      showNotification('Column name already exists', 'error');
      return;
    }
    const newHeaders = [...editedHeaders, newColumnName];
    setEditedHeaders(newHeaders);
    const newRows = editedRows.map(row => [...row, '']);
    setEditedRows(newRows);
    setNewRowData(prev => ({ ...prev, [newColumnName]: '' }));
    showNotification(`Column "${newColumnName}" added`, 'success');
    setNewColumnName('');
    setShowAddColumnModal(false);
  };

  const handleRemoveColumn = (colIndex) => {
    if (viewOnly) return;
    setShowDeleteModal({
      isOpen: true,
      type: 'column',
      index: colIndex,
      message: `Are you sure you want to remove column "${editedHeaders[colIndex]}"?`,
      onConfirm: () => {
        const newHeaders = editedHeaders.filter((_, index) => index !== colIndex);
        setEditedHeaders(newHeaders);
        const newRows = editedRows.map(row => row.filter((_, index) => index !== colIndex));
        setEditedRows(newRows);
        const headerName = editedHeaders[colIndex];
        const newRowDataCopy = { ...newRowData };
        delete newRowDataCopy[headerName];
        setNewRowData(newRowDataCopy);
        showNotification('Column removed', 'info');
      }
    });
  };

  const handleAddRow = () => {
    if (viewOnly) return;
    const rowData = editedHeaders.map(header => newRowData[header] || '');
    const newRows = [...editedRows, rowData];
    setEditedRows(newRows);
    const resetRowData = {};
    editedHeaders.forEach(header => { resetRowData[header] = ''; });
    setNewRowData(resetRowData);
    setShowAddRowModal(false);
    showNotification('New row added', 'success');
  };

  const handleRemoveRow = (rowIndex) => {
    if (viewOnly) return;
    setShowDeleteModal({
      isOpen: true,
      type: 'row',
      index: rowIndex,
      message: 'Are you sure you want to remove this row?',
      onConfirm: () => {
        const newRows = editedRows.filter((_, index) => index !== rowIndex);
        setEditedRows(newRows);
        setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        showNotification('Row removed', 'info');
      }
    });
  };

  const handleExportClick = (format) => {
    if (viewOnly) return;
    if (editedRows.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }
    setShowExportConfirmPrompt({ show: true, format: format, count: editedRows.length });
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    const csvRows = [
      editedHeaders.join(','),
      ...data.map(row =>
        editedHeaders.map((header, index) => {
          const cell = row[index] || '';
          return typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell;
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  };

  const exportToPDF = (data) => {
    if (viewOnly) return;
    const doc = new jsPDF();
    const tableColumn = editedHeaders;
    const tableRows = data.map(row => editedHeaders.map((header, index) => row[index] || ''));
    doc.autoTable({ head: [tableColumn], body: tableRows, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185] } });
    doc.save(`${trackerInfo?.fileName?.split('.')[0] || 'data'}.pdf`);
  };

  const handleExport = (format) => {
    if (viewOnly) return;
    const dataToExport = editedRows.map(row => {
      const obj = {};
      editedHeaders.forEach((header, index) => { obj[header] = row[index] || ''; });
      return obj;
    });
    let content, mimeType, filename;
    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${trackerInfo?.fileName?.split('.')[0] || 'data'}.xlsx`);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(editedRows);
        mimeType = 'text/csv';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.csv`;
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.json`;
        break;
      case 'pdf':
        exportToPDF(editedRows);
        showNotification('Export to PDF completed successfully');
        return;
      default: return;
    }
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
  };

  const toggleFreezeRow = () => { if (!viewOnly) setShowFreezeRowModal(true); };
  const toggleFreezeColumn = () => { if (!viewOnly) setShowFreezeColumnModal(true); };

  const handleFreezeRows = (selectedRowIndices) => {
    setFrozenRows(selectedRowIndices);
    setShowFreezeRowModal(false);
    showNotification(selectedRowIndices.length > 0 ? `${selectedRowIndices.length} row(s) frozen` : 'All rows unfrozen');
  };

  const handleFreezeColumns = (selectedColumnIndices) => {
    setFrozenColumns(selectedColumnIndices);
    setShowFreezeColumnModal(false);
    showNotification(selectedColumnIndices.length > 0 ? `${selectedColumnIndices.length} column(s) frozen` : 'All columns unfrozen');
  };

  const isRowFrozen = (rowIndex) => frozenRows.includes(rowIndex);
  const isColumnFrozen = (colIndex) => frozenColumns.includes(colIndex);

  const getFrozenColumnLeft = (colIndex) => {
    if (!isColumnFrozen(colIndex)) return 'auto';
    const checkboxWidth = 64;
    const sortedFrozenColumns = [...frozenColumns].sort((a, b) => a - b);
    const positionIndex = sortedFrozenColumns.indexOf(colIndex);
    if (positionIndex === -1) return 'auto';
    let leftOffset = 0;
    for (let i = 0; i < positionIndex; i++) {
      const prevColIndex = sortedFrozenColumns[i];
      leftOffset += (prevColIndex === 0) ? checkboxWidth : 160;
    }
    return `${leftOffset}px`;
  };

  const getFrozenRowTop = (rowIndex) => {
    if (!isRowFrozen(rowIndex)) return 'auto';
    const headerHeight = 42;
    const rowHeight = 53;
    const sortedFrozenRows = [...frozenRows].sort((a, b) => a - b);
    const positionIndex = sortedFrozenRows.indexOf(rowIndex);
    if (positionIndex === -1) return 'auto';
    let topOffset = headerHeight;
    for (let i = 0; i < positionIndex; i++) topOffset += rowHeight;
    return `${topOffset}px`;
  };

  const handleRefresh = () => {
    if (fileData) {
      if (fileData.headers && fileData.data) {
        setEditedHeaders(capitalizeHeaders([...fileData.headers]));
        setEditedRows(fileData.data.map(row => [...(row || [])]));
      }
      setSearchTerm('');
      setColumnFilter('');
      setCurrentPage(1);
      setSelectedRows([]);
      setSelectAll(false);
      setSortConfig({ key: null, direction: 'ascending' });
      setIsEditing(false);
      setEditingRowIndex(null);
      showNotification('Data refreshed', 'success');
    }
  };

  const { paginatedVisibleHeaders, nextColIndex, prevColIndex } = useMemo(() => {
    const MAX_CHAR_LENGTH = 120;
    let currentLength = 0;
    let endIndex = startColumnIndex;
    while (endIndex < editedHeaders.length) {
      const charCount = editedHeaders[endIndex].length;
      const weight = Math.max(charCount, 20);
      if (currentLength + weight > MAX_CHAR_LENGTH && endIndex > startColumnIndex) break;
      currentLength += weight;
      endIndex++;
    }
    endIndex = Math.min(startColumnIndex + 8, endIndex);
    let pIndex = startColumnIndex - 1;
    let prevLength = 0;
    while (pIndex >= 0) {
      const charCount = editedHeaders[pIndex].length;
      const weight = Math.max(charCount, 20);
      if (prevLength + weight > MAX_CHAR_LENGTH && pIndex < startColumnIndex - 1) break;
      prevLength += weight;
      pIndex--;
    }
    pIndex = Math.max(pIndex, startColumnIndex - 8 - 1);
    return {
      paginatedVisibleHeaders: editedHeaders.slice(startColumnIndex, endIndex).map((header, idx) => ({ header, originalIndex: startColumnIndex + idx })),
      nextColIndex: endIndex < editedHeaders.length ? endIndex : null,
      prevColIndex: startColumnIndex > 0 ? pIndex + 1 : null
    };
  }, [editedHeaders, startColumnIndex]);

  const handleNextColumns = useCallback(() => { if (nextColIndex !== null) setStartColumnIndex(nextColIndex); }, [nextColIndex]);
  const handlePrevColumns = useCallback(() => { if (prevColIndex !== null) setStartColumnIndex(prevColIndex); }, [prevColIndex]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-app-bg dark:bg-slate-950 p-4">
        <div className="bg-app-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-text-primary dark:text-slate-100">Loading Data...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-app-bg dark:bg-slate-950 overflow-hidden">
      {/* Modals */}
      {showDeleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal.isOpen}
          onClose={() => setShowDeleteModal({ ...showDeleteModal, isOpen: false })}
          onConfirm={showDeleteModal.onConfirm}
          message={showDeleteModal.message}
          type={showDeleteModal.type}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-slate-800 bg-app-surface dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-text-primary dark:text-slate-200 rounded-lg text-sm transition-all">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search in file..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-1.5 bg-app-bg dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg text-sm text-text-primary dark:text-slate-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 outline-none w-64 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!viewOnly && (
            <>
              <button onClick={() => setShowAddColumnModal(true)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <Plus className="h-4 w-4 text-text-primary dark:text-slate-200" />
              </button>
              <button onClick={handleRefresh} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <RefreshCw className="h-4 w-4 text-text-primary dark:text-slate-200" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-app-bg dark:bg-slate-950 relative">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-30">
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border dark:border-slate-800 shadow-sm">
              <th className="py-3 px-3 border-r border-border dark:border-slate-800 bg-slate-100 dark:bg-slate-800 sticky left-0 z-50 w-12 text-center text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-tighter">
                #
              </th>

              {!viewOnly && (
                <th className="py-3 px-4 border-r border-border dark:border-slate-800 bg-slate-100 dark:bg-slate-900 sticky left-12 z-40 w-36">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center pr-2 border-r border-border dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 border-border dark:border-slate-700 rounded focus:ring-blue-500 bg-app-surface dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex items-center space-x-1 pl-2">
                      <button
                        onClick={handlePrevColumns}
                        disabled={prevColIndex === null}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${prevColIndex === null ? 'text-slate-300 dark:text-slate-700' : 'text-blue-600'}`}
                        title="Previous Columns"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleNextColumns}
                        disabled={nextColIndex === null}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${nextColIndex === null ? 'text-slate-300 dark:text-slate-700' : 'text-blue-600'}`}
                        title="Next Columns"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </th>
              )}

              {paginatedVisibleHeaders.map(({ header, originalIndex }) => (
                <th
                  key={originalIndex}
                  className="text-left py-3 px-6 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap border-b border-r border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 group relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => handleSort(header)}
                    >
                      {header}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveDropdownColumn(activeDropdownColumn === header ? null : header)}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity dropdown-menu-container ${
                          activeDropdownColumn === header ? 'opacity-100 bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-text-secondary dark:text-slate-400" />
                      </button>

                      {activeDropdownColumn === header && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-app-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                          <button
                            onClick={() => handleSortFromMenu(header, 'ascending')}
                            className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowUp className="h-3.5 w-3.5 text-text-muted" /> Sort Ascending
                          </button>
                          <button
                            onClick={() => handleSortFromMenu(header, 'descending')}
                            className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowDown className="h-3.5 w-3.5 text-text-muted" /> Sort Descending
                          </button>
                          <div className="h-px bg-border dark:bg-slate-700 my-1"></div>
                          <button
                            onClick={() => handleCopyColumnName(header)}
                            className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Copy className="h-3.5 w-3.5 text-text-muted" /> Copy Column Name
                          </button>
                          {!viewOnly && (
                            <button
                              onClick={() => handleRemoveColumn(originalIndex)}
                              className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-border dark:border-slate-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Column
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
              
              {!viewOnly && (
                <th className="py-3 px-4 border-b border-border dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-text-muted text-[10px] uppercase font-bold text-center w-20">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border dark:divide-slate-800">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((item) => (
                <tr 
                  key={item.originalIndex}
                  className={`transition-colors ${
                    selectedRows.includes(item.originalIndex) 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900 even:bg-slate-50/30 dark:even:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3 px-3 border-r border-border dark:border-slate-800 bg-slate-100 dark:bg-slate-800 sticky left-0 z-10 text-center text-[11px] font-bold text-text-muted">
                    {item.originalIndex + 1}
                  </td>

                  {!viewOnly && (
                    <td className="py-3 px-4 border-r border-border dark:border-slate-800 bg-app-surface dark:bg-slate-900 sticky left-12 z-10">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.originalIndex)}
                          onChange={() => toggleRowSelection(item.originalIndex)}
                          className="h-4 w-4 text-blue-600 border-border dark:border-slate-700 rounded focus:ring-blue-500 bg-app-surface dark:bg-slate-800"
                        />
                      </div>
                    </td>
                  )}

                  {paginatedVisibleHeaders.map(({ originalIndex: colIndex }) => (
                    <td 
                      key={colIndex}
                      className="py-3 px-6 whitespace-nowrap border-r border-border dark:border-slate-800"
                    >
                      {isEditing && editingRowIndex === item.originalIndex ? (
                        <input
                          type="text"
                          value={item.data[colIndex] || ''}
                          onChange={(e) => handleCellChange(item.originalIndex, colIndex, e.target.value)}
                          className="w-full px-2 py-1 bg-app-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded text-sm text-text-primary dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      ) : (
                        <div className="text-text-primary dark:text-slate-200" title={String(item.data[colIndex] || '')}>
                          {item.data[colIndex] !== undefined && item.data[colIndex] !== null ? String(item.data[colIndex]) : ''}
                        </div>
                      )}
                    </td>
                  ))}

                  {!viewOnly && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveRow(item.originalIndex)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Remove Row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={editedHeaders.length + 3} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-12 w-12 opacity-20" />
                    <p className="font-medium">No data available</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="p-3 sm:p-4 border-t border-border dark:border-slate-800 bg-app-surface dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20 shadow-lg">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!viewOnly && (
            <div className="flex gap-2 mr-2">
              <button
                onClick={() => setShowAddRowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add Row
              </button>
              {selectedRows.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Trash2 className="h-4 w-4" /> Delete ({selectedRows.length})
                </button>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                  disabled={selectedRows.length !== 1}
                >
                  <Edit className="h-4 w-4" /> Edit Row
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted dark:text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 bg-app-bg dark:bg-slate-800 border border-border dark:border-slate-700 rounded text-xs text-text-primary dark:text-slate-100 outline-none"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-text-secondary dark:text-slate-400 font-medium">
            Showing <span className="text-text-primary dark:text-slate-100">{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="text-text-primary dark:text-slate-100">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="text-text-primary dark:text-slate-100">{totalItems}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex gap-1 px-1">
              {getPageNumbers().map(num => (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
                    currentPage === num 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-app-surface dark:bg-slate-900 rounded-xl p-5 sm:p-6 max-w-sm w-full border border-border dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-text-primary dark:text-slate-100 mb-4">Add New Column</h3>
            <input
              type="text"
              placeholder="Enter column name..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="w-full px-4 py-2 bg-app-bg dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddColumnModal(false)}
                className="px-4 py-2 text-text-secondary dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {showAddRowModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-app-surface dark:bg-slate-900 rounded-xl p-5 sm:p-6 max-w-lg w-full max-h-[80vh] flex flex-col border border-border dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-text-primary dark:text-slate-100 mb-4 flex-shrink-0">Add New Row</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
              {editedHeaders.map((header) => (
                <div key={header}>
                  <label className="block text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    {header}
                  </label>
                  <input
                    type="text"
                    value={newRowData[header] || ''}
                    onChange={(e) => setNewRowData({ ...newRowData, [header]: e.target.value })}
                    className="w-full px-4 py-2 bg-app-bg dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all"
                    placeholder={`Enter ${header.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 flex-shrink-0 pt-4 border-t border-border dark:border-slate-800">
              <button
                onClick={() => setShowAddRowModal(false)}
                className="px-4 py-2 text-text-secondary dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRow}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95"
              >
                Add Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Prompt */}
      {showBulkDeletePrompt.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-app-surface dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-border dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Confirm Deletion</h3>
            </div>
            <p className="text-text-secondary dark:text-slate-300 mb-6">
              Are you sure you want to delete <span className="font-bold text-text-primary dark:text-slate-100">{showBulkDeletePrompt.count}</span> selected row(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })}
                className="px-4 py-2 text-text-secondary dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileContentViewer;
