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
import { toast } from 'sonner';
import Skeleton from '../../components/ui/skeleton';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, message, type = 'field' }) => {
  if (!isOpen) return null;

  return (
    <div className="app-modal-overlay z-[70]">
      <div className="app-modal-container max-w-md w-full mx-4">
        <div className="app-modal-header">
          <h3 className="app-modal-title">Confirm Delete</h3>
          <button onClick={onClose} className="app-modal-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="app-modal-body">
          <p className="text-sm text-text-secondary dark:text-slate-300">{message}</p>
          <p className="text-sm text-red-650 mt-2 font-semibold">This action cannot be undone.</p>
        </div>

        <div className="app-modal-footer">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-350 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-red-650 text-white rounded-md hover:bg-red-700 font-bold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const validateValue = (val, dataType, colName, labelPrefix) => {
  if (val === undefined || val === null || val === '') return null;
  const valStr = String(val).trim();
  
  if (dataType === 'integer') {
    if (!/^-?\d+$/.test(valStr)) {
      return `${labelPrefix}: '${colName}' must be an integer (whole number)`;
    }
  } else if (dataType === 'decimal' || dataType === 'currency') {
    if (isNaN(Number(valStr)) || valStr === '') {
      return `${labelPrefix}: '${colName}' must be a decimal number`;
    }
  } else if (dataType === 'email') {
    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(valStr)) {
      return `${labelPrefix}: '${colName}' must be a valid email address`;
    }
  } else if (dataType === 'phone') {
    if (!/^\+?\d{10,14}$/.test(valStr)) {
      return `${labelPrefix}: '${colName}' must be a valid phone number (10-14 digits)`;
    }
  } else if (dataType === 'date') {
    const datePart = valStr.split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || isNaN(Date.parse(datePart))) {
      return `${labelPrefix}: '${colName}' must be a valid date (YYYY-MM-DD)`;
    }
  } else if (dataType === 'boolean') {
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(valStr.toLowerCase())) {
      return `${labelPrefix}: '${colName}' must be true or false`;
    }
  }
  return null;
};

const renderFieldInput = (value, onChange, dataType, placeholder, className) => {
  const normalizedType = (dataType || 'text').toLowerCase();
  
  if (normalizedType === 'boolean') {
    return (
      <select
        value={value || ''}
        onChange={onChange}
        className={className}
      >
        <option value="">(Select Boolean)</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }
  
  let typeAttr = 'text';
  let stepAttr = undefined;
  
  if (normalizedType === 'integer') {
    typeAttr = 'number';
    stepAttr = '1';
  } else if (normalizedType === 'decimal' || normalizedType === 'currency') {
    typeAttr = 'number';
    stepAttr = 'any';
  } else if (normalizedType === 'date') {
    typeAttr = 'date';
  } else if (normalizedType === 'email') {
    typeAttr = 'email';
  } else if (normalizedType === 'phone') {
    typeAttr = 'tel';
  }
  
  return (
    <input
      type={typeAttr}
      step={stepAttr}
      value={value || ''}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
    />
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
  // Nomemclature aligned states
  const [editedFields, setEditedFields] = useState([]);
  const [editedRecords, setEditedRecords] = useState([]);
  const [fieldsSchema, setFieldsSchema] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  // Edit Record Modal (replaces inline edit)
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [editRowErrors, setEditRowErrors] = useState({});

  // Modals & triggers
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showBulkFieldsModal, setShowBulkFieldsModal] = useState(false);
  const [bulkFieldsText, setBulkFieldsText] = useState('');
  const [bulkFieldsDefaultType, setBulkFieldsDefaultType] = useState('text');
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newRecordData, setNewRecordData] = useState({});
  const [showManageFieldsModal, setShowManageFieldsModal] = useState(false);
  
  // Dropdown menus
  const [showFieldsDropdown, setShowFieldsDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  
  // Bulk update field dialog
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateFieldName, setBulkUpdateFieldName] = useState('');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');

  // (inline row editing removed — edit is now handled via modal)

  // Schema warnings dialog
  const [schemaWarnings, setSchemaWarnings] = useState([]);
  const [pendingFieldUpdate, setPendingFieldUpdate] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState({
    isOpen: false,
    type: '',
    index: null,
    onConfirm: null,
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // Selection states
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [columnFilter, setColumnFilter] = useState('');
  const [activeDropdownColumn, setActiveDropdownColumn] = useState(null);

  // Freeze states
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [showFreezeColumnModal, setShowFreezeColumnModal] = useState(false);
  const [showFreezeRowModal, setShowFreezeRowModal] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdownColumn !== null && !event.target.closest('.dropdown-menu-container')) {
        setActiveDropdownColumn(null);
      }
      if (!event.target.closest('.dropdown-menu-container')) {
        setShowFieldsDropdown(false);
        setShowFilterDropdown(false);
        setShowExportDropdown(false);
        setShowSaveDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdownColumn]);

  const toggleDropdown = (menuName) => {
    setShowFieldsDropdown(menuName === 'fields' ? !showFieldsDropdown : false);
    setShowFilterDropdown(menuName === 'filter' ? !showFilterDropdown : false);
    setShowExportDropdown(menuName === 'export' ? !showExportDropdown : false);
    setShowSaveDropdown(menuName === 'save' ? !showSaveDropdown : false);
    setActiveDropdownColumn(null);
  };

  const toggleColumnDropdown = (field) => {
    setActiveDropdownColumn(activeDropdownColumn === field ? null : field);
    setShowFieldsDropdown(false);
    setShowFilterDropdown(false);
    setShowExportDropdown(false);
    setShowSaveDropdown(false);
  };

  const handleSortFromMenu = (field, direction) => {
    setSortConfig({ key: field, direction });
    setCurrentPage(1);
    setActiveDropdownColumn(null);
  };

  const handleCopyFieldName = async (label) => {
    try {
      await navigator.clipboard.writeText(label);
      showNotification('Field name copied to clipboard');
      setActiveDropdownColumn(null);
    } catch (err) {
      showNotification('Failed to copy field name', 'error');
    }
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

    let parsedHeaders = [];
    let parsedRows = [];
    let isSet = false;

    if (fileData.sheets && Array.isArray(fileData.sheets) && fileData.sheets.length > 0) {
      const currentSheet = fileData.sheets[0];
      parsedHeaders = capitalizeHeaders([...currentSheet.headers]);
      parsedRows = currentSheet.data.map(row => [...(row || [])]);
      isSet = true;
    } else if (fileData.headers && fileData.data && Array.isArray(fileData.data)) {
      parsedHeaders = capitalizeHeaders([...fileData.headers]);
      parsedRows = fileData.data.map(row => [...(row || [])]);
      isSet = true;
    } else if (Array.isArray(fileData) && fileData.length > 0) {
      const rawHeaders = Object.keys(fileData[0]);
      parsedHeaders = capitalizeHeaders(rawHeaders);
      parsedRows = fileData.map(row => parsedHeaders.map((h, index) => {
        const originalHeader = rawHeaders[index];
        return row[originalHeader] !== undefined ? row[originalHeader] : '';
      }));
      isSet = true;
    } else if (fileData.data && Array.isArray(fileData.data) && fileData.data.length > 0) {
      if (typeof fileData.data[0] === 'object' && !Array.isArray(fileData.data[0])) {
        const rawHeaders = Object.keys(fileData.data[0]);
        parsedHeaders = capitalizeHeaders(rawHeaders);
        parsedRows = fileData.data.map(row => parsedHeaders.map((h, index) => {
          const originalHeader = rawHeaders[index];
          return row[originalHeader] || '';
        }));
        isSet = true;
      } else if (Array.isArray(fileData.data[0])) {
        const rawHeaders = fileData.headers || Array.from({ length: fileData.data[0].length }, (_, i) => `Field ${i + 1}`);
        parsedHeaders = capitalizeHeaders([...rawHeaders]);
        parsedRows = fileData.data.map(row => [...(row || [])]);
        isSet = true;
      }
    } else if (fileData.rows && Array.isArray(fileData.rows) && fileData.rows.length > 0) {
      if (typeof fileData.rows[0] === 'object' && !Array.isArray(fileData.rows[0])) {
        const rawHeaders = Object.keys(fileData.rows[0]);
        parsedHeaders = capitalizeHeaders(rawHeaders);
        parsedRows = fileData.rows.map(row => parsedHeaders.map((h, index) => {
          const originalHeader = rawHeaders[index];
          return row[originalHeader] || '';
        }));
        isSet = true;
      }
    } else if (fileData.content && typeof fileData.content === 'string') {
      try {
        const lines = fileData.content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const rawHeaders = lines[0].split(',').map(h => h.trim());
          parsedHeaders = capitalizeHeaders(rawHeaders);
          parsedRows = lines.slice(1).filter(line => line.trim()).map(line => line.split(',').map(cell => cell.trim()));
          isSet = true;
        }
      } catch (e) { console.error('Error parsing CSV:', e); }
    }

    if (isSet) {
      // Map persistent Record IDs
      const recordIds = fileData.record_ids || (fileData.sheets && fileData.sheets[0] && fileData.sheets[0].record_ids) || [];
      const rowsWithIds = parsedRows.map((row, idx) => {
        const newRow = [...row];
        newRow._record_id = recordIds[idx] || `TRK-${String(idx + 1).padStart(3, '0')}`;
        return newRow;
      });

      setEditedFields(parsedHeaders);
      setEditedRecords(rowsWithIds);
      
      const initialRecordData = {};
      parsedHeaders.forEach(field => { initialRecordData[field] = ''; });
      setNewRecordData(initialRecordData);
      
      // Initialize fieldsSchema from fileData.schema or backend payload
      const backendSchema = fileData.schema || [];
      const schemaMap = {};
      const requiredMap = {};
      const defaultMap = {};
      
      backendSchema.forEach(col => {
        const capName = capitalizeFirstLetter(col.column_name);
        schemaMap[capName] = col.data_type || 'text';
        requiredMap[capName] = col.required || false;
        defaultMap[capName] = col.default_value || '';
      });

      const finalSchema = parsedHeaders.map(h => ({
        column_name: h,
        data_type: schemaMap[h] || 'text',
        required: requiredMap[h] || false,
        default_value: defaultMap[h] || ''
      }));
      setFieldsSchema(finalSchema);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [fileData]);

  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
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
      const allVisibleIndices = paginatedRecords.map(item => item.originalIndex);
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
        const allVisibleIndices = paginatedRecords.map(item => item.originalIndex);
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
      showNotification('Please select at least one record to delete', 'error');
      return;
    }
    setShowBulkDeletePrompt({ show: true, count: selectedRows.length });
  };

  const confirmBulkDelete = () => {
    if (viewOnly) return;
    const newRecords = editedRecords.filter((_, index) => !selectedRows.includes(index));
    setEditedRecords(newRecords);
    setSelectedRows([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    if (paginatedRecords.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
    showNotification(`${selectedRows.length} record(s) deleted successfully`);
  };

  const recordsWithIndices = useMemo(() => {
    return editedRecords.map((row, index) => ({ data: row, originalIndex: index }));
  }, [editedRecords]);

  const filteredRecords = useMemo(() => {
    return recordsWithIndices.filter(item => {
      const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
        item.data.some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesColumnFilter = !columnFilter || columnFilter.trim() === '' ||
        item.data.some(cell => String(cell).toLowerCase().includes(columnFilter.toLowerCase()));
      return matchesSearch && matchesColumnFilter;
    });
  }, [recordsWithIndices, searchTerm, columnFilter]);

  const sortedRecords = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    if (!sortConfig.key) return filteredRecords;
    const colIndex = editedFields.findIndex(f => f === sortConfig.key);
    if (colIndex === -1) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const aVal = a.data[colIndex] || '';
      const bVal = b.data[colIndex] || '';
      
      const isNum = !isNaN(Number(aVal)) && !isNaN(Number(bVal)) && aVal !== '' && bVal !== '';
      if (isNum) {
        return sortConfig.direction === 'ascending' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
      }
      
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig, editedFields]);

  const totalItems = sortedRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRecords.slice(startIndex, startIndex + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

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

  // Open edit modal for a row
  const handleStartRowEdit = (rowIndex) => {
    if (viewOnly) return;
    const record = editedRecords[rowIndex];
    const data = {};
    editedFields.forEach((field, colIdx) => {
      data[field] = record[colIdx] !== undefined ? record[colIdx] : '';
    });
    setEditingRowIndex(rowIndex);
    setEditRowData(data);
    setEditRowErrors({});
    setShowEditRecordModal(true);
  };

  // Save edits from modal
  const handleSaveEditModal = () => {
    if (viewOnly) return;
    const errors = {};
    editedFields.forEach((field, colIdx) => {
      const val = editRowData[field];
      const colSchema = fieldsSchema[colIdx] || { data_type: 'text' };
      if (colSchema.required && (val === undefined || val === null || String(val).trim() === '')) {
        errors[field] = `${field} is required`;
      }
      const valErr = validateValue(val, colSchema.data_type, field, field);
      if (valErr) errors[field] = valErr;
    });
    if (Object.keys(errors).length > 0) {
      setEditRowErrors(errors);
      return;
    }
    const newRecords = [...editedRecords];
    const originalRecord = newRecords[editingRowIndex];
    const newRow = editedFields.map(field => editRowData[field] !== undefined ? editRowData[field] : '');
    newRow._record_id = originalRecord._record_id;
    newRecords[editingRowIndex] = newRow;
    setEditedRecords(newRecords);
    setShowEditRecordModal(false);
    setEditingRowIndex(null);
    setEditRowData({});
    setEditRowErrors({});
    showNotification('Record updated. Click Save to publish changes.', 'success');
  };

  const handleSaveChanges = (status = null) => {
    if (viewOnly) return;
    
    // Validate all rows
    const errors = [];
    editedRecords.forEach((row, rowIndex) => {
      editedFields.forEach((field, colIndex) => {
        const val = row[colIndex];
        const colSchema = fieldsSchema[colIndex] || { data_type: 'text' };
        const err = validateValue(val, colSchema.data_type, field, `Record ${rowIndex + 1}`);
        if (err) errors.push(err);
        
        if (colSchema.required && (val === undefined || val === null || String(val).trim() === '')) {
          errors.push(`Record ${rowIndex + 1}: Field '${field}' is required`);
        }
      });
    });
    
    if (errors.length > 0) {
      errors.slice(0, 5).forEach(err => showNotification(err, 'error'));
      if (errors.length > 5) {
        showNotification(`...and ${errors.length - 5} more validation errors.`, 'error');
      }
      return;
    }
    
    const updatedFileData = { 
      headers: editedFields, 
      data: editedRecords,
      columns_schema: fieldsSchema 
    };
    if (onSaveData) onSaveData(updatedFileData, status);
  };

  const handleAddField = () => {
    if (viewOnly) return;
    if (!newFieldName.trim()) {
      showNotification('Please enter a field name', 'error');
      return;
    }
    const capitalizedName = capitalizeFirstLetter(newFieldName.trim());
    if (editedFields.includes(capitalizedName)) {
      showNotification('Field name already exists', 'error');
      return;
    }
    const newFieldsList = [...editedFields, capitalizedName];
    setEditedFields(newFieldsList);
    
    const newRecordsList = editedRecords.map(row => {
      const newRow = [...row, ''];
      newRow._record_id = row._record_id;
      return newRow;
    });
    setEditedRecords(newRecordsList);
    setNewRecordData(prev => ({ ...prev, [capitalizedName]: '' }));
    
    setFieldsSchema(prev => [...prev, { column_name: capitalizedName, data_type: newFieldType, required: false, default_value: '' }]);
    
    showNotification(`Field "${capitalizedName}" added (${newFieldType})`, 'success');
    setNewFieldName('');
    setNewFieldType('text');
    setShowAddFieldModal(false);
  };

  const handleAddBulkFields = () => {
    if (viewOnly) return;
    if (!bulkFieldsText.trim()) {
      showNotification('Please enter at least one field name', 'error');
      return;
    }
    
    const rawInputs = bulkFieldsText.split(',').map(f => f.trim()).filter(f => f.length > 0);
    if (rawInputs.length === 0) {
      showNotification('Please enter valid field names', 'error');
      return;
    }

    const currentFields = [...editedFields];
    const newSchemaList = [...fieldsSchema];
    const duplicates = [];
    const addedList = [];

    rawInputs.forEach(input => {
      const capName = capitalizeFirstLetter(input);
      if (currentFields.includes(capName)) {
        duplicates.push(capName);
      } else {
        currentFields.push(capName);
        newSchemaList.push({ column_name: capName, data_type: bulkFieldsDefaultType, required: false, default_value: '' });
        addedList.push(capName);
      }
    });

    if (addedList.length === 0) {
      showNotification('All fields already exist', 'error');
      return;
    }

    setEditedFields(currentFields);
    setFieldsSchema(newSchemaList);

    const updatedRecords = editedRecords.map(row => {
      const newRow = [...row];
      addedList.forEach(() => newRow.push(''));
      newRow._record_id = row._record_id;
      return newRow;
    });
    setEditedRecords(updatedRecords);

    setNewRecordData(prev => {
      const next = { ...prev };
      addedList.forEach(f => { next[f] = ''; });
      return next;
    });

    let msg = `Successfully added ${addedList.length} field(s) as '${bulkFieldsDefaultType}'.`;
    if (duplicates.length > 0) {
      msg += ` Ignored duplicate(s): ${duplicates.join(', ')}`;
    }
    showNotification(msg, 'success');
    setBulkFieldsText('');
    setBulkFieldsDefaultType('text');
    setShowBulkFieldsModal(false);
  };

  const handleRemoveField = (colIndex) => {
    if (viewOnly) return;
    const fieldName = editedFields[colIndex];
    setShowDeleteModal({
      isOpen: true,
      type: 'field',
      index: colIndex,
      message: `Are you sure you want to remove field "${fieldName}"? All record cell values in this field will be permanently deleted.`,
      onConfirm: () => {
        const newFields = editedFields.filter((_, index) => index !== colIndex);
        setEditedFields(newFields);
        
        const newRecs = editedRecords.map(row => {
          const newRow = row.filter((_, index) => index !== colIndex);
          newRow._record_id = row._record_id;
          return newRow;
        });
        setEditedRecords(newRecs);
        
        const newRecTemplate = { ...newRecordData };
        delete newRecTemplate[fieldName];
        setNewRecordData(newRecTemplate);
        
        setFieldsSchema(prev => prev.filter((_, index) => index !== colIndex));
        showNotification('Field removed successfully', 'info');
      }
    });
  };

  const handleAddRecord = () => {
    if (viewOnly) return;
    
    // Validate record fields
    const errors = [];
    editedFields.forEach((field, index) => {
      const val = newRecordData[field];
      const colSchema = fieldsSchema[index] || { data_type: 'text' };
      const err = validateValue(val, colSchema.data_type, field, 'New record');
      if (err) errors.push(err);
      
      if (colSchema.required && (val === undefined || val === null || String(val).trim() === '')) {
        errors.push(`Field '${field}' is required`);
      }
    });
    
    if (errors.length > 0) {
      errors.forEach(err => showNotification(err, 'error'));
      return;
    }

    const rowData = editedFields.map(field => newRecordData[field] !== undefined ? newRecordData[field] : (fieldsSchema[editedFields.indexOf(field)]?.default_value || ''));
    
    // Generate persistent Record ID
    const existingIds = editedRecords.map(r => r._record_id).filter(id => id && id.startsWith('TRK-'));
    let maxId = 0;
    existingIds.forEach(id => {
      const num = parseInt(id.replace('TRK-', ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    rowData._record_id = `TRK-${String(maxId + 1).padStart(3, '0')}`;

    const newRecords = [...editedRecords, rowData];
    setEditedRecords(newRecords);
    
    const resetRecordData = {};
    editedFields.forEach(field => { resetRecordData[field] = ''; });
    setNewRecordData(resetRecordData);
    setShowAddRecordModal(false);
    showNotification('New record added successfully', 'success');
  };

  const handleRemoveRow = (rowIndex) => {
    if (viewOnly) return;
    setShowDeleteModal({
      isOpen: true,
      type: 'record',
      index: rowIndex,
      message: 'Are you sure you want to remove this record?',
      onConfirm: () => {
        const newRecords = editedRecords.filter((_, index) => index !== rowIndex);
        setEditedRecords(newRecords);
        setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        showNotification('Record removed', 'info');
      }
    });
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    const csvRows = [
      editedFields.join(','),
      ...data.map(row =>
        editedFields.map((field, index) => {
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
    const tableColumn = editedFields;
    const tableRows = data.map(row => editedFields.map((field, index) => row[index] || ''));
    doc.autoTable({ head: [tableColumn], body: tableRows, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] } });
    doc.save(`${trackerInfo?.fileName?.split('.')[0] || 'tracker'}_export.pdf`);
  };

  const exportToFormat = (format, selectedOnly = false) => {
    if (viewOnly) return;
    const recordsToExport = selectedOnly 
      ? editedRecords.filter((_, index) => selectedRows.includes(index)) 
      : editedRecords;
      
    if (recordsToExport.length === 0) {
      showNotification('No data records to export', 'error');
      return;
    }

    const dataToExport = recordsToExport.map(row => {
      const obj = {};
      editedFields.forEach((field, index) => { obj[field] = row[index] || ''; });
      return obj;
    });

    let content, mimeType, filename;
    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${trackerInfo?.fileName?.split('.')[0] || 'tracker'}.xlsx`);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(recordsToExport);
        mimeType = 'text/csv';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'tracker'}.csv`;
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'tracker'}.json`;
        break;
      case 'pdf':
        exportToPDF(recordsToExport);
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

  const handleRefresh = () => {
    if (fileData) {
      if (fileData.headers && fileData.data) {
        setEditedFields(capitalizeHeaders([...fileData.headers]));
        setEditedRecords(fileData.data.map((row, idx) => {
          const r = [...(row || [])];
          r._record_id = (fileData.record_ids && fileData.record_ids[idx]) || `TRK-${String(idx + 1).padStart(3, '0')}`;
          return r;
        }));
      }
      setSearchTerm('');
      setColumnFilter('');
      setCurrentPage(1);
      setSelectedRows([]);
      setSelectAll(false);
      setSortConfig({ key: null, direction: 'ascending' });
      setEditingRowIndex(null);
      showNotification('Data refreshed', 'success');
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows as raw arrays to preserve headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length === 0) {
          showNotification('The uploaded Excel file is empty', 'error');
          return;
        }

        // Parse headers and rows
        const rawHeaders = jsonData[0].map(h => String(h || '').trim()).filter(h => h.length > 0);
        const capitalizedHeaders = rawHeaders.map(h => capitalizeFirstLetter(h));
        
        const rawRows = jsonData.slice(1).filter(r => r.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));
        const mappedRows = rawRows.map((rowArray, rowIndex) => {
          const row = capitalizedHeaders.map((_, colIdx) => {
            const val = rowArray[colIdx];
            return val !== undefined && val !== null ? String(val).trim() : '';
          });
          // Add unique, persistent record ID
          row._record_id = `TRK-${String(rowIndex + 1).padStart(3, '0')}`;
          return row;
        });

        // Set states
        setEditedFields(capitalizedHeaders);
        setEditedRecords(mappedRows);
        
        const initialRecordData = {};
        capitalizedHeaders.forEach(f => { initialRecordData[f] = ''; });
        setNewRecordData(initialRecordData);

        // Generate schema
        const generatedSchema = capitalizedHeaders.map(h => ({
          column_name: h,
          data_type: 'text',
          required: false,
          default_value: ''
        }));
        setFieldsSchema(generatedSchema);

        showNotification(`Successfully imported ${mappedRows.length} records from Excel`, 'success');
        // Reset file input
        e.target.value = '';
      } catch (err) {
        console.error('Error parsing imported Excel:', err);
        showNotification('Failed to read Excel file format', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Schema Manage Field logic
  const handleSaveFieldManagerChanges = (nextFields, nextSchema) => {
    // Run validation checks for type conversion compatibility
    const warnings = [];
    nextSchema.forEach((schemaItem, fieldIndex) => {
      const oldSchemaItem = fieldsSchema[fieldIndex];
      if (oldSchemaItem && oldSchemaItem.data_type !== schemaItem.data_type) {
        // Data type changed, validate all existing cell values
        const fieldName = nextFields[fieldIndex];
        editedRecords.forEach((record, recordIdx) => {
          const val = record[fieldIndex];
          const err = validateValue(val, schemaItem.data_type, fieldName, `Record ${recordIdx + 1}`);
          if (err) {
            warnings.push(err);
          }
        });
      }
    });

    if (warnings.length > 0) {
      setSchemaWarnings(warnings);
      setPendingFieldUpdate({ fields: nextFields, schema: nextSchema });
    } else {
      applyFieldChanges(nextFields, nextSchema);
    }
  };

  const applyFieldChanges = (nextFields, nextSchema, customRecords = null) => {
    setEditedFields(nextFields);
    setFieldsSchema(nextSchema);
    
    if (customRecords) {
      setEditedRecords(customRecords);
    }
    
    // Update template keys
    const resetRecordData = {};
    nextFields.forEach(f => { resetRecordData[f] = ''; });
    setNewRecordData(resetRecordData);

    showNotification('Field configurations updated successfully', 'success');
    setShowManageFieldsModal(false);
    setSchemaWarnings([]);
    setPendingFieldUpdate(null);
  };

  // Content-aware column width: sample field text + up to 20 data rows
  const colWidths = useMemo(() => {
    const CHAR_PX = 7.5;  // avg px per char at text-sm
    const H_PAD   = 48;   // px: px-6 padding + sort chevron
    const D_PAD   = 24;   // px: px-3 padding each side
    const MIN_W   = 120;
    const MAX_W   = 350;
    return editedFields.map((field, colIdx) => {
      let w = field.length * CHAR_PX + H_PAD;
      const sample = editedRecords.slice(0, 20);
      for (const row of sample) {
        const val = row[colIdx];
        if (val !== null && val !== undefined) {
          const dataW = String(val).length * CHAR_PX + D_PAD;
          if (dataW > w) w = dataW;
        }
      }
      return Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
    });
  }, [editedFields, editedRecords]);

  if (isLoading) {
    return (
      <div className="master-table-container rounded-none">
        {/* Toolbar Skeleton */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && <Skeleton className="h-8 w-20 rounded-lg" />}
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-28 h-10 border border-slate-200 dark:border-slate-700" />
            <Skeleton className="w-10 h-10 border border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Table Content Skeleton */}
        <div className="master-table-scroll">
          <div className="master-table-scroll-inner">
            <table className="master-table" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3 w-12 text-center text-[10px] font-bold uppercase">S.No</th>
                  {['w-24', 'w-36', 'w-28', 'w-40', 'w-32', 'w-20'].map((widthClass, idx) => (
                    <th key={idx} className="text-left py-3 px-6 font-bold bg-slate-50 dark:bg-slate-900">
                      <Skeleton className={`h-4 ${widthClass}`} />
                    </th>
                  ))}
                  <th className="py-3 px-4 w-20 bg-slate-50 dark:bg-slate-900 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-slate-800">
                {Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3 px-3 text-center text-xs font-bold text-text-muted">{rowIndex + 1}</td>
                    {['w-20', 'w-32', 'w-24', 'w-36', 'w-28', 'w-16'].map((widthClass, colIdx) => (
                      <td key={colIdx} className="py-3 px-6"><Skeleton className={`h-4 ${widthClass}`} /></td>
                    ))}
                    <td className="py-3 px-4 text-center"><Skeleton className="h-7 w-7 rounded-full inline-block" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="master-table-container rounded-none">
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

      {/* Warning dialog for schema type mismatch */}
      {schemaWarnings.length > 0 && (
        <div className="app-modal-overlay z-[60]">
          <div className="app-modal-container max-w-md w-full mx-4 border border-amber-500/30 shadow-2xl animate-in fade-in duration-150">
            <div className="app-modal-header bg-amber-500/10 text-amber-800 dark:text-amber-400 border-b border-amber-500/20 py-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="app-modal-title text-sm font-bold">Data Type Conversion Warnings</h3>
            </div>
            <div className="app-modal-body space-y-3 pt-4 max-h-[300px] overflow-y-auto">
              <p className="text-xs text-text-primary dark:text-slate-200 leading-relaxed">
                Changing data types will lead to compatibility errors with values in existing records:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-red-650 dark:text-red-400 font-medium">
                {schemaWarnings.map((warning, wIdx) => (
                  <li key={wIdx}>{warning}</li>
                ))}
              </ul>
              <p className="text-xs text-text-muted mt-4 font-semibold">
                Proceeding will keep the invalid values but may block final publication. Do you want to apply changes anyway?
              </p>
            </div>
            <div className="app-modal-footer border-t border-border pt-3">
              <button
                onClick={() => setSchemaWarnings([])}
                className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-slate-750 dark:text-slate-250 font-bold transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  if (pendingFieldUpdate) {
                    applyFieldChanges(pendingFieldUpdate.fields, pendingFieldUpdate.schema);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-all"
              >
                Confirm & Force Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for Excel imports */}
      <input
        type="file"
        id="excel-import-file-input"
        accept=".xlsx, .xls, .csv"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Floating Selection contextual action bar */}
      {selectedRows.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-blue-50/70 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/40 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 flex-shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-blue-700 dark:text-blue-400">
              {selectedRows.length} Record{selectedRows.length > 1 ? 's' : ''} Selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBulkUpdateFieldName(editedFields[0] || '');
                setBulkUpdateValue('');
                setShowBulkUpdateModal(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all active:scale-95 shadow-sm shadow-blue-500/10"
            >
              Bulk Update Field
            </button>
            <button
              onClick={() => {
                // Bulk export is Excel by default
                exportToFormat('excel', true);
              }}
              className="px-3.5 py-1.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-black hover:bg-slate-900 dark:hover:bg-slate-100 rounded-md text-xs font-bold transition-all active:scale-95"
            >
              Export Selected (.xlsx)
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-all active:scale-95"
            >
              Delete Selected
            </button>
            <button
              onClick={() => {
                setSelectedRows([]);
                setSelectAll(false);
              }}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-bold transition-all"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 h-10 px-3 border border-slate-350 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-text-primary dark:text-slate-200 transition-all active:scale-98 text-sm font-semibold">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search in records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 h-10 pl-9 pr-8 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-800 dark:text-slate-100 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Future-Proof Toolbar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* 1. Record Button */}
          {!viewOnly && (
            <button
              onClick={() => {
                if (editedFields.length === 0) {
                  showNotification('You must add at least one field first before creating records.', 'error');
                } else {
                  setShowAddRecordModal(true);
                }
              }}
              className="flex items-center gap-1.5 h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all active:scale-95 text-xs font-black shadow-md shadow-blue-500/10"
            >
              <Plus className="h-4 w-4" /> Record
            </button>
          )}

          {/* 2. Fields Dropdown */}
          {!viewOnly && (
            <div className="relative dropdown-menu-container">
              <button
                onClick={() => toggleDropdown('fields')}
                className="flex items-center gap-1.5 h-10 px-3.5 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-text-primary dark:text-slate-200 transition-all text-xs font-bold"
              >
                <Columns className="h-4 w-4" /> Fields <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showFieldsDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-app-surface dark:bg-slate-850 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <button
                    onClick={() => { setShowFieldsDropdown(false); setShowAddFieldModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-500" /> Add Single Field
                  </button>
                  <button
                    onClick={() => { setShowFieldsDropdown(false); setShowBulkFieldsModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800 font-semibold"
                  >
                    <GridAddFieldsIcon /> Add Bulk Fields
                  </button>
                  <button
                    onClick={() => { setShowFieldsDropdown(false); setShowManageFieldsModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800 font-semibold"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-blue-500" /> Manage Fields
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Filter Dropdown */}
          <div className="relative dropdown-menu-container">
            <button
              onClick={() => toggleDropdown('filter')}
              className={`flex items-center gap-1.5 h-10 px-3.5 border rounded-md transition-all text-xs font-bold ${
                columnFilter 
                  ? 'border-blue-500 bg-blue-50/20 text-blue-600 dark:text-blue-400'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-text-primary dark:text-slate-200'
              }`}
            >
              <Filter className="h-4 w-4" /> Filter <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-1 w-64 p-3 bg-app-surface dark:bg-slate-850 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 space-y-2 text-xs animate-in fade-in slide-in-from-top-1">
                <p className="font-bold text-text-primary dark:text-slate-100">Filter Records</p>
                <input
                  type="text"
                  placeholder="Filter by field values..."
                  value={columnFilter}
                  onChange={(e) => setColumnFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all"
                />
                {columnFilter && (
                  <button
                    onClick={() => setColumnFilter('')}
                    className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-secondary rounded-md text-[10px] font-bold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. Export Dropdown */}
          <div className="relative dropdown-menu-container">
            <button
              onClick={() => toggleDropdown('export')}
              className="flex items-center gap-1.5 h-10 px-3.5 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-text-primary dark:text-slate-200 transition-all text-xs font-bold"
            >
              <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-app-surface dark:bg-slate-850 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => { setShowExportDropdown(false); exportToFormat('excel'); }}
                  className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-bold"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); exportToFormat('csv'); }}
                  className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800 font-bold"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" /> CSV (.csv)
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); exportToFormat('json'); }}
                  className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800 font-bold"
                >
                  <Database className="h-3.5 w-3.5 text-purple-500" /> JSON (.json)
                </button>
                <button
                  onClick={() => { setShowExportDropdown(false); exportToFormat('pdf'); }}
                  className="w-full text-left px-4 py-2 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800 font-bold"
                >
                  <File className="h-3.5 w-3.5 text-red-500" /> PDF (.pdf)
                </button>
              </div>
            )}
          </div>

          {/* 5. Save Options Dropdown */}
          {!viewOnly && (
            <div className="relative dropdown-menu-container">
              <button
                onClick={() => toggleDropdown('save')}
                className="flex items-center gap-1.5 h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all active:scale-95 text-xs font-black shadow-md shadow-blue-500/10"
              >
                <Save className="h-4 w-4" /> Save <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showSaveDropdown && (
                <div className="absolute right-0 mt-1 w-56 bg-app-surface dark:bg-slate-850 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <button
                    onClick={() => { setShowSaveDropdown(false); handleSaveChanges('Draft'); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">Save Draft</span>
                      <span className="text-[10px] text-text-muted">Save edits as a pending draft</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowSaveDropdown(false); handleSaveChanges('Completed'); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 border-t border-border dark:border-slate-800"
                  >
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">Publish Tracker</span>
                      <span className="text-[10px] text-text-muted">Finalize and sync with sidebar</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center h-10 w-10 border border-slate-350 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-text-primary dark:text-slate-200 transition-all active:scale-98"
            title="Refresh Grid Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Grid View Area — always show table if fields exist, even with no records */}
      {editedFields.length === 0 && editedRecords.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-[#090D16] p-12 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-lg animate-in fade-in duration-300">
            <div className="p-4 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-5">
              <Database className="h-7 w-7" />
            </div>
            <h3 className="text-base font-extrabold text-text-primary dark:text-slate-55">No Fields or Records</h3>
            <p className="text-xs text-text-muted dark:text-slate-400 mt-2 leading-relaxed">
              Start by adding fields using the Fields menu, then create records or import from Excel.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              {!viewOnly && (
                <button
                  onClick={() => setShowAddFieldModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-md active:scale-97"
                >
                  Add First Field
                </button>
              )}
              <button
                onClick={() => document.getElementById('excel-import-file-input').click()}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-xs font-bold transition-all active:scale-97"
              >
                Import from Excel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="master-table-scroll">
          <div className="master-table-scroll-inner">
            <table className="master-table" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {/* Sticky left Checkbox header */}
                  {!viewOnly && (
                    <th 
                      className="py-3 px-2 w-12 sticky left-0 z-40 bg-slate-100 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-700 text-center"
                      style={{ left: 0, width: '48px', minWidth: '48px', maxWidth: '48px' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 bg-app-surface dark:bg-slate-800 cursor-pointer"
                      />
                    </th>
                  )}
                  {/* Sticky left S.No header */}
                  <th 
                    className="py-3 px-2 w-12 sticky z-40 bg-slate-100 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-700 text-center text-[10px] font-bold uppercase"
                    style={{ left: !viewOnly ? '48px' : 0, width: '48px', minWidth: '48px', maxWidth: '48px' }}
                  >
                    S.No
                  </th>

                  {/* Schema field column headers */}
                  {editedFields.map((field, originalIndex) => (
                    <th
                      key={originalIndex}
                      className="text-left py-3 px-4 font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 border-r border-border dark:border-slate-800 whitespace-nowrap group relative"
                      style={{ minWidth: `${colWidths[originalIndex] ?? 120}px`, maxWidth: '400px' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs"
                          onClick={() => handleSort(field)}
                        >
                          {field}
                          {fieldsSchema[originalIndex]?.required && <span className="text-red-500 font-bold">*</span>}
                          {fieldsSchema[originalIndex]?.data_type && fieldsSchema[originalIndex].data_type !== 'text' && (
                            <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold ml-0.5">({fieldsSchema[originalIndex].data_type})</span>
                          )}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleColumnDropdown(field)}
                            className={`p-1 rounded transition-colors dropdown-menu-container ${
                              activeDropdownColumn === field ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>

                          {activeDropdownColumn === field && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-app-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                              <button
                                onClick={() => handleSortFromMenu(field, 'ascending')}
                                className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <ArrowUp className="h-3.5 w-3.5 text-text-muted" /> Sort Ascending
                              </button>
                              <button
                                onClick={() => handleSortFromMenu(field, 'descending')}
                                className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <ArrowDown className="h-3.5 w-3.5 text-text-muted" /> Sort Descending
                              </button>
                              <div className="h-px bg-border dark:bg-slate-700 my-1"></div>
                              <button
                                onClick={() => handleCopyFieldName(field)}
                                className="w-full text-left px-4 py-2.5 text-xs text-text-primary dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Copy className="h-3.5 w-3.5 text-text-muted" /> Copy Field Name
                              </button>
                              {!viewOnly && (
                                <button
                                  onClick={() => handleRemoveField(originalIndex)}
                                  className="w-full text-left px-4 py-2.5 text-xs text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-border dark:border-slate-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove Field
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                  
                  {/* Sticky Right Actions Header */}
                  {!viewOnly && (
                    <th className="py-3 px-4 w-24 sticky right-0 bg-slate-100 dark:bg-slate-850 border-l border-slate-200 dark:border-slate-700 text-center z-45 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/80 dark:divide-slate-750/50">
                {editedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={editedFields.length + (!viewOnly ? 2 : 1)}
                      className="py-16 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
                          <Database className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-text-primary dark:text-slate-100">No Records Yet</p>
                        <p className="text-xs text-text-muted dark:text-slate-400 max-w-xs">
                          Fields are configured. Click <strong>+ Record</strong> to add data, or import from Excel.
                        </p>
                        {!viewOnly && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setShowAddRecordModal(true)}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-all shadow-sm active:scale-97"
                            >
                              + Add First Record
                            </button>
                            <button
                              onClick={() => document.getElementById('excel-import-file-input').click()}
                              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-xs font-bold transition-all"
                            >
                              Import Excel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((item) => (
                    <tr 
                      key={item.originalIndex}
                      className={`group transition-colors ${
                        selectedRows.includes(item.originalIndex) 
                          ? 'row-selected bg-blue-50/70 dark:bg-blue-900/15' 
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Sticky left Checkbox row cell */}
                      {!viewOnly && (
                        <td 
                          className={`master-table-checkbox-cell py-3 px-2 sticky left-0 z-20 border-r border-slate-200 dark:border-slate-800/85 text-center transition-colors ${
                            selectedRows.includes(item.originalIndex) 
                              ? 'opacity-100 bg-blue-50 dark:bg-[#111A2E]' 
                              : 'bg-white dark:bg-slate-900'
                          }`}
                          style={{ left: 0, width: '48px', minWidth: '48px', maxWidth: '48px' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.originalIndex)}
                            onChange={() => toggleRowSelection(item.originalIndex)}
                            className="h-4 w-4 text-blue-600 border-slate-350 dark:border-slate-700 rounded focus:ring-blue-500 bg-app-surface dark:bg-slate-800 cursor-pointer"
                          />
                        </td>
                      )}
                      {/* Sticky left S.No row cell */}
                      <td 
                        className={`py-3 px-2 sticky z-20 border-r border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors ${
                          selectedRows.includes(item.originalIndex) ? 'bg-blue-50 dark:bg-[#111A2E]' : ''
                        }`}
                        style={{ left: !viewOnly ? '48px' : 0, width: '48px', minWidth: '48px', maxWidth: '48px' }}
                      >
                        {(currentPage - 1) * pageSize + paginatedRecords.findIndex(p => p.originalIndex === item.originalIndex) + 1}
                      </td>

                      {/* Data Field row cells */}
                      {editedFields.map((field, colIndex) => (
                        <td 
                          key={colIndex}
                          className="p-3 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap"
                          style={{ minWidth: `${colWidths[colIndex] ?? 120}px`, maxWidth: '400px' }}
                        >
                          <div className="text-text-primary dark:text-slate-200 text-xs font-semibold overflow-hidden text-ellipsis" title={String(item.data[colIndex] || '')}>
                            {item.data[colIndex] !== undefined && item.data[colIndex] !== null ? String(item.data[colIndex]) : ''}
                          </div>
                        </td>
                      ))}

                      {/* Sticky Right Actions row cell */}
                      {!viewOnly && (
                        <td 
                          className={`py-2 px-3 text-center border-l border-slate-200 dark:border-slate-800 sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-20 transition-colors ${
                            selectedRows.includes(item.originalIndex) ? 'bg-blue-50 dark:bg-[#111A2E]' : ''
                          }`}
                          style={{ width: '96px', minWidth: '96px', maxWidth: '96px' }}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartRowEdit(item.originalIndex)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-blue-200 dark:border-blue-800/80 rounded-md transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveRow(item.originalIndex)}
                              className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-800/80 rounded-md transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer / Pagination */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-25 shadow-lg bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted dark:text-slate-400 font-semibold">Records per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 bg-app-bg dark:bg-slate-800 border border-border dark:border-slate-700 rounded-md text-xs text-text-primary dark:text-slate-100 outline-none"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto">
          <div className="text-xs text-text-secondary dark:text-slate-400 font-semibold">
            Showing <span className="text-text-primary dark:text-slate-100">{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="text-text-primary dark:text-slate-100">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="text-text-primary dark:text-slate-100">{totalItems}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex gap-1 px-1">
              {getPageNumbers().map(num => (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
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
              className="p-1.5 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4 shadow-xl">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Add New Field</h3>
              <button onClick={() => setShowAddFieldModal(false)} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Field Name
                </label>
                <input
                  type="text"
                  placeholder="Enter field name..."
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Data Type
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all cursor-pointer"
                >
                  <option value="text">Text</option>
                  <option value="integer">Integer</option>
                  <option value="decimal">Decimal</option>
                  <option value="currency">Currency</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            </div>
            <div className="app-modal-footer">
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddField}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm shadow-blue-500/10"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bulk Fields Modal */}
      {showBulkFieldsModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4 shadow-xl animate-in fade-in duration-150">
            <div className="app-modal-header">
              <div className="flex items-center gap-2">
                <GridAddFieldsIcon />
                <h3 className="app-modal-title">Add Fields in Bulk</h3>
              </div>
              <button onClick={() => { setShowBulkFieldsModal(false); setBulkFieldsText(''); setBulkFieldsDefaultType('text'); }} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body space-y-4">
              {/* Field names textarea */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Field Names <span className="text-slate-400 font-semibold normal-case">(comma separated)</span>
                </label>
                <textarea
                  placeholder="e.g. Location, Status, Phase, Assigned To"
                  value={bulkFieldsText}
                  onChange={(e) => setBulkFieldsText(e.target.value)}
                  className="w-full h-28 px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all font-semibold leading-relaxed resize-none"
                  autoFocus
                />
              </div>
              {/* Default data type */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                  Default Data Type <span className="text-slate-400 font-semibold normal-case">(applies to all fields above)</span>
                </label>
                <select
                  value={bulkFieldsDefaultType}
                  onChange={(e) => setBulkFieldsDefaultType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all cursor-pointer"
                >
                  <option value="text">Text</option>
                  <option value="integer">Integer</option>
                  <option value="decimal">Decimal</option>
                  <option value="currency">Currency</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
                <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed font-semibold">
                  You can fine-tune individual field types later via <strong>Manage Fields</strong>.
                </p>
              </div>
            </div>
            <div className="app-modal-footer">
              <button
                onClick={() => { setShowBulkFieldsModal(false); setBulkFieldsText(''); setBulkFieldsDefaultType('text'); }}
                className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBulkFields}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm shadow-blue-500/10"
              >
                Create Fields
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-lg w-full mx-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="app-modal-header flex-shrink-0">
              <h3 className="app-modal-title">Create New Record</h3>
              <button onClick={() => setShowAddRecordModal(false)} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body flex-1 overflow-y-auto space-y-4 py-6">
              {editedFields.map((field, index) => {
                const colSchema = fieldsSchema[index] || { data_type: 'text' };
                return (
                  <div key={field}>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      {field} {colSchema.required && <span className="text-red-500 font-bold">*</span>}
                      <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold ml-1.5">({colSchema.data_type})</span>
                    </label>
                    {renderFieldInput(
                      newRecordData[field],
                      (e) => setNewRecordData({ ...newRecordData, [field]: e.target.value }),
                      colSchema.data_type,
                      colSchema.default_value ? `Default: ${colSchema.default_value}` : `Enter ${field.toLowerCase()}...`,
                      "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all font-semibold"
                    )}
                  </div>
                );
              })}
            </div>
            <div className="app-modal-footer flex-shrink-0">
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 transition-colors text-slate-755 dark:text-slate-250 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-md"
              >
                Create Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4 shadow-xl animate-in fade-in duration-150">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Bulk Update Field</h3>
              <button onClick={() => setShowBulkUpdateModal(false)} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Select Field to Update
                </label>
                <select
                  value={bulkUpdateFieldName}
                  onChange={(e) => {
                    setBulkUpdateFieldName(e.target.value);
                    setBulkUpdateValue('');
                  }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-text-primary dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  {editedFields.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  New Bulk Value
                </label>
                {renderFieldInput(
                  bulkUpdateValue,
                  (e) => setBulkUpdateValue(e.target.value),
                  (fieldsSchema[editedFields.indexOf(bulkUpdateFieldName)] || {}).data_type,
                  "Enter bulk value...",
                  "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-text-primary dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                )}
              </div>
            </div>
            <div className="app-modal-footer">
              <button
                onClick={() => setShowBulkUpdateModal(false)}
                className="px-4 py-2 text-sm border border-slate-350 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const idx = editedFields.indexOf(bulkUpdateFieldName);
                  if (idx === -1) return;
                  
                  // Validate format
                  const colSchema = fieldsSchema[idx] || { data_type: 'text' };
                  const err = validateValue(bulkUpdateValue, colSchema.data_type, bulkUpdateFieldName, 'Bulk Update');
                  if (err) {
                    showNotification(err, 'error');
                    return;
                  }

                  const updatedRecords = [...editedRecords];
                  selectedRows.forEach(rowIndex => {
                    if (updatedRecords[rowIndex]) {
                      updatedRecords[rowIndex][idx] = bulkUpdateValue;
                    }
                  });
                  setEditedRecords(updatedRecords);
                  showNotification(`Bulk updated field '${bulkUpdateFieldName}' for ${selectedRows.length} record(s)`, 'success');
                  setShowBulkUpdateModal(false);
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Apply Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Fields Metadata Modal */}
      {showManageFieldsModal && (
        <ManageFieldsModal
          fields={editedFields}
          schema={fieldsSchema}
          onClose={() => setShowManageFieldsModal(false)}
          onSave={handleSaveFieldManagerChanges}
        />
      )}

      {/* Edit Record Modal */}
      {showEditRecordModal && editingRowIndex !== null && (
        <div className="app-modal-overlay z-[65]">
          <div className="app-modal-container max-w-lg w-full mx-4 max-h-[88vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
            <div className="app-modal-header flex-shrink-0 border-b border-border/80 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="app-modal-title text-sm font-bold">Edit Record</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Record ID: <span className="font-mono font-bold text-blue-500">{editedRecords[editingRowIndex]?._record_id || `#${editingRowIndex + 1}`}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowEditRecordModal(false); setEditingRowIndex(null); setEditRowData({}); setEditRowErrors({}); }}
                className="app-modal-close-btn text-text-muted hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body flex-1 overflow-y-auto py-5 space-y-4">
              {editedFields.map((field, colIdx) => {
                const colSchema = fieldsSchema[colIdx] || { data_type: 'text' };
                const hasError = !!editRowErrors[field];
                return (
                  <div key={field}>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      {field}
                      {colSchema.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold ml-2 normal-case">({colSchema.data_type})</span>
                    </label>
                    {renderFieldInput(
                      editRowData[field],
                      (e) => {
                        setEditRowData(prev => ({ ...prev, [field]: e.target.value }));
                        if (hasError) setEditRowErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
                      },
                      colSchema.data_type,
                      colSchema.default_value ? `Default: ${colSchema.default_value}` : `Enter ${field.toLowerCase()}...`,
                      `w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-md text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-text-primary dark:text-slate-100 transition-all ${
                        hasError ? 'border-red-500/80 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                      }`
                    )}
                    {hasError && (
                      <p className="mt-1 text-[10px] font-bold text-red-550 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{editRowErrors[field]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="app-modal-footer flex-shrink-0 border-t border-border/80 dark:border-slate-800 pt-4">
              <button
                onClick={() => { setShowEditRecordModal(false); setEditingRowIndex(null); setEditRowData({}); setEditRowErrors({}); }}
                className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditModal}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-md shadow-blue-500/10"
              >
                <Check className="h-3.5 w-3.5" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Prompt */}
      {showBulkDeletePrompt.show && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4 shadow-xl">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Confirm Bulk Delete</h3>
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body">
              <p className="text-sm text-text-secondary dark:text-slate-300">
                Are you sure you want to delete <span className="font-extrabold text-red-650">{showBulkDeletePrompt.count}</span> selected record(s)?
              </p>
              <p className="text-xs text-red-650 dark:text-red-400 mt-2 font-bold">This operation is permanent.</p>
            </div>
            <div className="app-modal-footer">
              <button
                onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })}
                className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── CUSTOM INLINE COMPONENTS & SUBMODALS ─────────────────────────────

// Grid Add Fields Icon
const GridAddFieldsIcon = () => (
  <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14v6m-3-3h6M6 10h2m4 0h2m-6 4h2m4 0h2M4 6h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
  </svg>
);

// Manage Fields Modal Sub-component
const ManageFieldsModal = ({ fields, schema, onClose, onSave }) => {
  const [localFields, setLocalFields] = useState([...fields]);
  const [localSchema, setLocalSchema] = useState(schema.map(item => ({ ...item })));

  const handleFieldChange = (index, key, value) => {
    const updatedSchema = [...localSchema];
    updatedSchema[index] = { ...updatedSchema[index], [key]: value };
    setLocalSchema(updatedSchema);
  };

  const handleFieldNameChange = (index, value) => {
    const updatedFields = [...localFields];
    updatedFields[index] = value;
    setLocalFields(updatedFields);

    const updatedSchema = [...localSchema];
    updatedSchema[index] = { ...updatedSchema[index], column_name: value };
    setLocalSchema(updatedSchema);
  };

  const moveField = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= localFields.length) return;
    
    const fieldsCopy = [...localFields];
    const tempField = fieldsCopy[fromIdx];
    fieldsCopy.splice(fromIdx, 1);
    fieldsCopy.splice(toIdx, 0, tempField);
    setLocalFields(fieldsCopy);

    const schemaCopy = [...localSchema];
    const tempSchema = schemaCopy[fromIdx];
    schemaCopy.splice(fromIdx, 1);
    schemaCopy.splice(toIdx, 0, tempSchema);
    setLocalSchema(schemaCopy);
  };

  const deleteFieldLocal = (index) => {
    const fName = localFields[index];
    if (!window.confirm(`Are you sure you want to remove field "${fName}"?`)) return;
    
    setLocalFields(localFields.filter((_, idx) => idx !== index));
    setLocalSchema(localSchema.filter((_, idx) => idx !== index));
  };

  const handleApply = () => {
    // Check duplicates
    const duplicateFields = localFields.filter((item, index) => localFields.indexOf(item) !== index);
    if (duplicateFields.length > 0) {
      toast.error(`Duplicate field names: ${duplicateFields.join(', ')}`);
      return;
    }

    if (localFields.some(f => !f.trim())) {
      toast.error('Field names cannot be empty');
      return;
    }

    onSave(localFields, localSchema);
  };

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-container max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col shadow-2xl">
        <div className="app-modal-header flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-blue-500" />
            <h3 className="app-modal-title">Manage Fields & Metadata</h3>
          </div>
          <button onClick={onClose} className="app-modal-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="app-modal-body flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-text-muted leading-relaxed font-semibold">
            Adjust field layout parameters. Change order dynamically using arrow triggers. Changing data types of active columns will warn before conversion.
          </div>

          <div className="space-y-3 mt-4">
            {localFields.map((field, index) => {
              const schemaItem = localSchema[index] || { data_type: 'text', required: false, default_value: '' };
              return (
                <div key={index} className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm group">
                  {/* Move Indicators */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveField(index, index - 1)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronUp className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => moveField(index, index + 1)}
                      disabled={index === localFields.length - 1}
                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronDown className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Name input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={field}
                      onChange={(e) => handleFieldNameChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-md text-xs text-text-primary dark:text-slate-100 font-bold outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  {/* Type dropdown */}
                  <div className="w-32">
                    <select
                      value={schemaItem.data_type}
                      onChange={(e) => handleFieldChange(index, 'data_type', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-md text-xs text-text-primary dark:text-slate-100 outline-none font-bold cursor-pointer"
                    >
                      <option value="text">Text</option>
                      <option value="integer">Integer</option>
                      <option value="decimal">Decimal</option>
                      <option value="currency">Currency</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>

                  {/* Required check */}
                  <div className="flex items-center gap-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 py-1.5 rounded-md text-[11px] font-bold">
                    <input
                      type="checkbox"
                      id={`req-${index}`}
                      checked={schemaItem.required || false}
                      onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                      className="h-3.5 w-3.5 rounded-md text-blue-600 cursor-pointer focus:ring-blue-500 bg-app-surface dark:bg-slate-800"
                    />
                    <label htmlFor={`req-${index}`} className="pr-1 select-none cursor-pointer">Req</label>
                  </div>

                  {/* Default value field */}
                  <div className="w-28">
                    <input
                      type="text"
                      placeholder="Default val..."
                      value={schemaItem.default_value || ''}
                      onChange={(e) => handleFieldChange(index, 'default_value', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-md text-xs text-text-secondary dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>

                  {/* Remove Button — always visible */}
                  <button
                    onClick={() => deleteFieldLocal(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/60 hover:border-red-300 dark:hover:border-red-700 rounded-md transition-colors"
                    title="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="app-modal-footer flex-shrink-0 border-t border-border mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all shadow-md shadow-blue-500/10"
          >
            Apply Configurations
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileContentViewer;
