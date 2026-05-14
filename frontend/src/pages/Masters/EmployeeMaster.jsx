import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Search, Edit, Trash2, X, Check, ChevronUp, ChevronDown, Download, Eye, EyeOff, CheckSquare, Square, Snowflake, ChevronLeft, ChevronRight, RefreshCw, Copy, ArrowUp, ArrowDown, Filter, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../utils/api';

const MODULE_LIST = [
  'Dashboard', 'MOM', 'Employee Master', 'Project Master',
  'Upload Trackers',
  'Budget Upload', 'Settings'
];



const EmployeeMaster = () => {
  // Fixed columns - Simplified un-grouped structure with SaaS styling
  const initialColumns = [
    { id: 'employee_id', label: 'Employee ID', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'name', label: 'Name', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'email', label: 'Email', visible: true, sortable: true, type: 'email', required: true, deletable: false },
    { id: 'department', label: 'Department', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'role', label: 'Role', visible: true, sortable: true, type: 'select', required: true, deletable: false },
    { id: 'status', label: 'Status', visible: true, sortable: true, type: 'select', required: true, deletable: false },
    { id: 'project_name', label: 'Project Name', visible: true, sortable: true, type: 'text', deletable: false, required: false },
  ];

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    employee_id: '',
    name: '',
    email: '',
    department: '',
    role: 'Employee',
    status: 'Active',
    modules: [],
    password: '',
    confirmPassword: '',
    custom_fields: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    department: '',
    role: 'Employee',
    status: 'Active',
    modules: [],
    password: '',
    confirmPassword: '',
    custom_fields: {}
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [suggestedType, setSuggestedType] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // Load columns from backend (and combine with initialColumns)
  const [columns, setColumns] = useState(initialColumns);
  const [customColumns, setCustomColumns] = useState([]);

  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  // Column Dropdown state
  const [activeDropdownColumn, setActiveDropdownColumn] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownColumn(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // State for Add Employee modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // New state for checkboxes
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // New state for action prompts
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showBulkEditPrompt, setShowBulkEditPrompt] = useState(false);
  const [showColumnAddPrompt, setShowColumnAddPrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);

  const [validationErrors, setValidationErrors] = useState({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDeleteColumnPrompt, setShowDeleteColumnPrompt] = useState(null);
  const [dynamicRoles, setDynamicRoles] = useState([]);

  // Filter Dropdown state
  const [filterDraft, setFilterDraft] = useState({});

  // Freeze states - Updated to support multiple frozen rows and columns
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [showFreezeColumnModal, setShowFreezeColumnModal] = useState(false);
  const [showFreezeRowModal, setShowFreezeRowModal] = useState(false);
  // Temporary states for modal selections
  const [tempFrozenRows, setTempFrozenRows] = useState([]);
  const [tempFrozenColumns, setTempFrozenColumns] = useState([]);

  // UI state for dropdowns
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);

  // Bulk Filter state
  const [activeFilters, setActiveFilters] = useState({
    department: [],
    role: [],
    status: [],
    project_name: []
  });

  // Get permissions from Redux store
  const { user } = useSelector((state) => state.auth);
  const userPermissions = user?.permissions || [];

  const hasPermission = (module, action = null) => {
    if (!action) return userPermissions.includes(module);
    return userPermissions.includes(`${module}:${action}`);
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';


  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors({});
    try {
      // Silently migrate any legacy 'User' roles → 'Employee' before loading
      await API.post('/employees/migrate-user-role').catch(() => {});
      await fetchColumns();
      await fetchEmployees();
      await fetchDynamicRoles();
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
      toast.error();
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    try {
      const res = await API.get('/employees/columns/all');
      if (Array.isArray(res.data)) {
        const formattedCustomCols = res.data.map(col => ({
          id: col.column_name,
          db_id: col.id, // Keep track of database ID for updates/deletes
          label: col.column_label,
          visible: true,
          sortable: true,
          type: col.data_type || 'text',
          data_type: col.data_type || 'text',
          deletable: true,
          required: col.is_required
        }));
        setCustomColumns(formattedCustomCols);

        // Sync with columns state
        setColumns([...initialColumns, ...formattedCustomCols]);
      }
    } catch (err) {
      console.error("Error fetching columns", err);
    }
  };


  const fetchEmployees = async () => {
    try {
      const res = await API.get('/employees');
      if (Array.isArray(res.data)) {
        setEmployees(res.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching employees", err);
      throw err;
    }
  };

  const fetchDynamicRoles = async () => {
    try {
      const res = await API.get('/roles/');
      if (Array.isArray(res.data)) {
        setDynamicRoles(res.data);
      }
    } catch (err) {
      console.error("Error fetching roles", err);
    }
  };

  // Refresh function - resets selections and freezes
  const handleRefresh = async () => {
    setSelectedEmployees([]);
    setSelectAll(false);
    setFrozenRows([]);
    setFrozenColumns([]);
    setTempFrozenRows([]);
    setTempFrozenColumns([]);
    setCurrentPage(1);
    await fetchData();
    toast.success('Data refreshed successfully');
  };

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = paginatedEmployees.map(emp => emp.id);
      setSelectedEmployees(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        const newSelection = prev.filter(id => id !== employeeId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, employeeId];
        const allVisibleIds = paginatedEmployees.map(emp => emp.id);
        if (newSelection.length === allVisibleIds.length && allVisibleIds.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk edit function - Modified to handle single row only
  const handleBulkEdit = () => {
    if (selectedEmployees.length === 0) {
      toast.success('Please select at least one employee to edit', 'error');
      return;
    }

    if (selectedEmployees.length > 1) {
      toast.success('Only one row can be edited at a time', 'error');
      return;
    }

    setShowBulkEditPrompt({
      show: true,
      count: selectedEmployees.length
    });
  };

  const confirmBulkEdit = () => {
    if (selectedEmployees.length === 1) {
      const employee = employees.find(emp => emp.id === selectedEmployees[0]);
      if (employee) {
        startEditing(employee);
      }
    }
    setShowBulkEditPrompt({ show: false, count: 0 });
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedEmployees.length === 0) {
      toast.success('Please select at least one employee to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedEmployees.length
    });
  };

  const confirmBulkDelete = async () => {
    const count = selectedEmployees.length;

    try {
      // Use bulk delete endpoint for better performance
      await API.post('/employees/bulk-delete', selectedEmployees);

      await fetchEmployees();
      setSelectedEmployees([]);
      setSelectAll(false);
      setCurrentPage(1);
      setShowBulkDeletePrompt({ show: false, count: 0 });

      toast.success(`${count} employees deleted successfully`);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || 'Error during bulk delete process';
      toast.error();
    }
  };

  // Column editing functions
  const startEditColumn = (columnId, currentLabel) => {
    setEditingColumn(columnId);
    setTempColumnName(currentLabel);
  };

  const saveEditColumn = async (columnId) => {
    if (tempColumnName.trim()) {
      const col = columns.find(c => c.id === columnId);
      if (!col.db_id) {
        // This is a fixed column, we only update it locally if needed, 
        // but backend doesn't support updating fixed columns via this API
        setColumns(columns.map(c =>
          c.id === columnId ? { ...c, label: tempColumnName } : c
        ));
        setEditingColumn(null);
        setTempColumnName('');
        toast.success('Column updated locally');
        return;
      }

      try {
        await API.put(`/employees/columns/${col.db_id}`, {
          column_label: tempColumnName
        });
        await fetchColumns();
        setEditingColumn(null);
        setTempColumnName('');
        toast.success('Column updated successfully');
      } catch (err) {
        console.error(err);
        toast.error();
      }
    }
  };

  const cancelEditColumn = () => {
    setEditingColumn(null);
    setTempColumnName('');
  };

  const handleDeleteColumn = (columnId) => {
    const column = columns.find(col => col.id === columnId);
    const isFixedColumn = ['id', 'name', 'email', 'department', 'role', 'status', 'project_name'].includes(columnId);

    if (isFixedColumn) {
      setShowDeleteColumnPrompt({
        id: columnId,
        title: 'Cannot Delete Column',
        message: `Cannot delete fixed column: ${column.label}. Fixed columns are required for the Employee Master.`,
        type: 'warning',
        columnLabel: column.label
      });
      return;
    }

    setShowDeleteColumnPrompt({
      id: columnId,
      title: 'Delete Column',
      columnLabel: column.label,
      type: 'delete'
    });
  };

  const confirmDeleteColumn = async () => {
    if (!showDeleteColumnPrompt) return;

    const columnId = showDeleteColumnPrompt.id;
    const col = columns.find(c => c.id === columnId);

    if (col && col.db_id) {
      try {
        await API.delete(`/employees/columns/${col.db_id}`);
        await fetchColumns();
        setShowDeleteColumnPrompt(null);
        setShowColumnModal(false);
        toast.success('Column deleted successfully');
      } catch (err) {
        console.error(err);
        toast.error();
      }
    } else {
      // Should not happen for fixed columns based on handleDeleteColumn check
      setShowDeleteColumnPrompt(null);
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Validation
  const validateEmployeeForm = (data) => {
    const errors = {};
    const requiredFields = ['employee_id', 'name', 'email', 'department', 'role', 'status'];

    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors[field] = `${field.replace('_', ' ').charAt(0).toUpperCase() + field.replace('_', ' ').slice(1)} is required`;
      }
    });

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Invalid email format";
    }

    // Validate custom fields
    customColumns.forEach(col => {
      const value = data.custom_fields?.[col.id];
      
      // Required check
      if (col.required && (value === undefined || value === null || value === '')) {
        errors[col.id] = `${col.label} is required`;
      }

      // Type checks
      if (value) {
        if (['integer', 'decimal', 'currency'].includes(col.type)) {
          if (isNaN(parseFloat(value))) {
            errors[col.id] = `${col.label} must be a number`;
          }
        } else if (col.type === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[col.id] = `Invalid email format for ${col.label}`;
          }
        } else if (col.type === 'phone') {
          if (!/^\d{10}$/.test(value.toString())) {
            errors[col.id] = `${col.label} must be exactly 10 digits`;
          }
        }
      }
    });

    return errors;
  };

  // Unique values for filters
  const filterOptions = useMemo(() => {
    return {
      department: [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort(),
      role: [...new Set(employees.map(emp => emp.role).filter(Boolean))].sort(),
      status: [...new Set(employees.map(emp => emp.status).filter(Boolean))].sort(),
      project_name: [...new Set(employees.map(emp => emp.project_name).filter(Boolean))].sort()
    };
  }, [employees]);

  // Filter employees - exclude dummy or missing data and apply bulk filters
  const filteredEmployees = employees.filter(emp => {
    // Basic validation for name and email to avoid dummy entries
    if (!emp.name || !emp.email) return false;

    // Search term check
    const matchesSearch = searchTerm === '' || Object.values(emp).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchesSearch) return false;

    // Bulk filter checks
    if (activeFilters.department.length > 0 && !activeFilters.department.includes(emp.department)) return false;
    if (activeFilters.role.length > 0 && !activeFilters.role.includes(emp.role)) return false;
    if (activeFilters.status.length > 0 && !activeFilters.status.includes(emp.status)) return false;
    if (activeFilters.project_name.length > 0 && !activeFilters.project_name.includes(emp.project_name)) return false;

    return true;
  });

  // Sort employees
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return filteredEmployees;

    return [...filteredEmployees].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredEmployees, sortConfig]);

  // Pagination logic
  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedEmployees.slice(startIndex, endIndex);
  }, [sortedEmployees, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  // Handle Add Employee button click
  const handleAddEmployeeClick = () => {
    setNewEmployee({
      employee_id: '',
      name: '',
      email: '',
      department: '',
      role: 'Employee',
      status: 'Active',
      modules: [],
      password: '',
      confirmPassword: '',
      custom_fields: {}
    });
    setValidationErrors({});
    setShowAddEmployeeModal(true);
  };

  // Handle new employee input change
  const handleNewEmployeeChange = (field, value) => {
    const coreFields = ['employee_id', 'name', 'email', 'department', 'role', 'status', 'password', 'confirmPassword', 'modules'];
    const isCustom = !coreFields.includes(field);
    
    setNewEmployee(prev => {
      if (isCustom) {
        return {
          ...prev,
          custom_fields: { ...(prev.custom_fields || {}), [field]: value }
        };
      }
      
      const updated = { ...prev, [field]: value };
      // Auto-toggle permissions if role is dynamic
      if (field === 'role') {
        const roleObj = dynamicRoles.find(r => r.name === value);
        if (roleObj) {
          updated.modules = roleObj.permissions || [];
        }
      }
      return updated;
    });

    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Save new employee
  const saveNewEmployee = async () => {
    const errors = validateEmployeeForm(newEmployee);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...newEmployee,
        employee_id: newEmployee.employee_id || null
      };
      await API.post('/employees', payload);
      await fetchEmployees();
      setShowAddEmployeeModal(false);
      setNewEmployee({});
      setCurrentPage(1);
      toast.success('Employee added successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      toast.error('Error saving employee: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  // Cancel adding new employee
  const cancelNewEmployee = () => {
    setShowAddEmployeeModal(false);
    setNewEmployee({});
  };

  // Confirm delete employee
  const confirmDeleteEmployee = async () => {
    if (showDeletePrompt) {
      try {
        await API.delete(`/employees/${showDeletePrompt.id}`);
        await fetchEmployees();
        setShowDeletePrompt(null);
        if (paginatedEmployees.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        toast.success('Employee deleted successfully');
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.detail || err.message;
          toast.error('Error deleting employee: ' + msg);
      }
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeletePrompt(null);
  };

  // Start editing employee
  const startEditing = (employee) => {
    setEditForm({
      ...employee,
      id: employee.id,
      password: '',
      confirmPassword: '',
      modules: employee.modules || [],
      custom_fields: employee.custom_fields || {}
    });
    setEditingId(employee.id);
  };

  // Save employee edit
  const saveEdit = async () => {
    const errors = validateEmployeeForm(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...editForm,
        employee_id: editForm.employee_id || null
      };
      // Remove confirmPassword from payload
      delete payload.confirmPassword;
      // If password is empty, don't send it to avoid overwriting with empty
      if (!payload.password) delete payload.password;

      await API.put(`/employees/${editingId}`, payload);
      await fetchEmployees();
      setEditingId(null);
      setEditForm({});
      setSelectedEmployees([]);
      setSelectAll(false);
      toast.success('Employee updated successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      toast.error('Error updating employee: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  // Cancel employee edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Handle edit form change
  const handleEditFormChange = (field, value) => {
    const coreFields = ['employee_id', 'name', 'email', 'department', 'role', 'status', 'password', 'confirmPassword', 'modules', 'id', 'created_at', 'updated_at', 'project_name'];
    const isCustom = !coreFields.includes(field);

    setEditForm(prev => {
      if (isCustom) {
        return {
          ...prev,
          custom_fields: { ...(prev.custom_fields || {}), [field]: value }
        };
      }
      
      const updated = { ...prev, [field]: value };
      // Auto-toggle permissions if role is dynamic
      if (field === 'role') {
        const roleObj = dynamicRoles.find(r => r.name === value);
        if (roleObj) {
          updated.modules = roleObj.permissions || [];
        }
      }
      return updated;
    });

    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Add new column
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error('Please enter a column name');
      return;
    }

    try {
      const res = await API.get(`/employees/columns/suggest?name=${encodeURIComponent(newColumnName)}`);
      if (res.data && res.data.suggested_type) {
        setSuggestedType(res.data.suggested_type);
        setNewColumnType(res.data.suggested_type);
      }
    } catch (err) {
      console.error("Error fetching suggestion", err);
    }

    setShowColumnAddPrompt({
      show: true,
      columnName: newColumnName
    });
  };

  const confirmAddColumn = async () => {
    if (newColumnName.trim()) {
      const newColumnId = newColumnName.toLowerCase().replace(/\s+/g, '_');

      if (columns.find(col => col.id === newColumnId)) {
        toast.error('Column already exists');
        return;
      }

      try {
        await API.post('/employees/columns/create', {
          column_name: newColumnId,
          column_label: newColumnName,
          data_type: newColumnType,
          is_required: false,
          validation_rules: {}
        });

        await fetchColumns();
        setNewColumnName('');
        setNewColumnType('text');
        setSuggestedType('');
        setShowColumnAddPrompt({ show: false, columnName: '' });
        setShowColumnModal(false);
        toast.success('Column added successfully');
      } catch (err) {
        console.error(err);
        toast.error('Error adding column');
      }
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(updatedColumns);
  };

  // Dropdown Menu specific handlers
  const handleSortFromMenu = (key, direction) => {
    setSortConfig({ key, direction });
    setCurrentPage(1);
    setActiveDropdownColumn(null);
  };

  const handleCopyColumnName = (label) => {
    navigator.clipboard.writeText(label);
    toast.success('Column name copied');
    setActiveDropdownColumn(null);
  };

  const handleFreezeColumnMenu = (colIndex) => {
    let newFrozen = [...frozenColumns];
    if (newFrozen.includes(colIndex)) {
      newFrozen = newFrozen.filter(idx => idx !== colIndex);
      toast.success('Column unfrozen');
    } else {
      newFrozen = [...new Set([...newFrozen, colIndex])].sort((a, b) => a - b);
      toast.success('Column frozen');
    }
    setFrozenColumns(newFrozen);
    setTempFrozenColumns(newFrozen);
    setActiveDropdownColumn(null);
  };

  // Export functions
  const handleExportClick = (format) => {
    if (sortedEmployees.length === 0) {
      toast.success('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedEmployees.length
    });
  };

  const handleExport = (format) => {
    toast.success(`Export to ${format.toUpperCase()} completed successfully`);
    setShowExportConfirmPrompt(null);
    setShowExportDropdown(false);
  };

  // Freeze functions - Updated to pre-select based on selected employees/columns
  const toggleFreezeRow = () => {
    // Get the actual row indices of selected employees on current page
    const selectedRowIndices = paginatedEmployees
      .map((emp, index) => {
        const actualRowIndex = (currentPage - 1) * pageSize + index;
        return selectedEmployees.includes(emp.id) ? actualRowIndex : null;
      })
      .filter(index => index !== null);

    // Combine with existing frozen rows for initial selection
    setTempFrozenRows([...new Set([...frozenRows, ...selectedRowIndices])].sort((a, b) => a - b));
    setShowFreezeRowModal(true);
  };

  const toggleFreezeColumn = () => {
    // Get column indices of visible columns
    const visibleColumnIndices = visibleColumns.map(col =>
      columns.findIndex(c => c.id === col.id)
    );

    // Start with existing frozen columns
    setTempFrozenColumns([...frozenColumns]);
    setShowFreezeColumnModal(true);
  };

  const handleFreezeRows = () => {
    setFrozenRows(tempFrozenRows);
    setShowFreezeRowModal(false);

    if (tempFrozenRows.length > 0) {
      toast.success(`${tempFrozenRows.length} row(s) frozen`);
    } else {
      toast.success('All rows unfrozen');
    }
  };

  const handleFreezeColumns = () => {
    setFrozenColumns(tempFrozenColumns);
    setShowFreezeColumnModal(false);

    if (tempFrozenColumns.length > 0) {
      toast.success(`${tempFrozenColumns.length} column(s) frozen`);
    } else {
      toast.success('All columns unfrozen');
    }
  };

  const isRowFrozen = (rowIndex) => {
    return frozenRows.includes(rowIndex);
  };

  const isColumnFrozen = (colIndex) => {
    return frozenColumns.includes(colIndex);
  };

  // Get the left position for frozen columns
  const getFrozenColumnLeft = (colIndex) => {
    if (!isColumnFrozen(colIndex)) return 'auto';

    const checkboxWidth = 64;

    const sortedFrozenColumns = [...frozenColumns].sort((a, b) => a - b);
    const positionIndex = sortedFrozenColumns.indexOf(colIndex);

    if (positionIndex === -1) return 'auto';

    let leftOffset = 0;
    for (let i = 0; i < positionIndex; i++) {
      const prevColIndex = sortedFrozenColumns[i];
      if (prevColIndex === 0) {
        leftOffset += checkboxWidth;
      } else {
        leftOffset += 160;
      }
    }

    return `${leftOffset}px`;
  };

  // Get the top position for frozen rows
  const getFrozenRowTop = (rowIndex) => {
    if (!isRowFrozen(rowIndex)) return 'auto';

    const headerHeight = 42;
    const rowHeight = 53;

    const sortedFrozenRows = [...frozenRows].sort((a, b) => a - b);
    const positionIndex = sortedFrozenRows.indexOf(rowIndex);

    if (positionIndex === -1) return 'auto';

    let topOffset = headerHeight;
    for (let i = 0; i < positionIndex; i++) {
      topOffset += rowHeight;
    }

    return `${topOffset}px`;
  };

  // Render cell content
  const renderCellContent = (column, value, emp) => {
    if (column.id === 'status') {
      const isActive = value === 'Active';
      return (
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-100'
            }`}>
            {value || 'Inactive'}
          </span>
        </div>
      );
    }

    if (column.id === 'role') {
      const getRoleStyles = (role) => {
        switch (role) {
          case 'Admin': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
          case 'Manager': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
          case 'User': return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-500/10 dark:text-slate-100 dark:border-slate-500/20';
          case 'Intern': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
          default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
      };

      return (
        <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${getRoleStyles(value)}`}>
          {value || 'User'}
        </span>
      );
    }

    if (column.id === 'employee_id') {
      return (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-100">{value || '-'}</span>
      )
    }

    if (column.id === 'project_name') {
      if (value === 'not assigned') {
        return <span className="text-xs text-slate-400 dark:text-slate-500 italic uppercase tracking-wider font-medium">{value}</span>;
      }
      return (
        <span className="text-[13px] text-blue-600 dark:text-blue-400 font-semibold">
          {value}
        </span>
      );
    }

    // Handle custom fields
    if (customColumns.find(c => c.id === column.id)) {
      const customValue = emp.custom_fields ? emp.custom_fields[column.id] : null;
      return <span className="text-sm text-slate-700 dark:text-slate-100">{customValue || '-'}</span>;
    }

    return <span className="text-sm text-slate-700 dark:text-slate-100">{value || '-'}</span>;
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="master-table-container">
      <>

        {/* Delete Employee Prompt */}
        {showDeletePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">Confirm Delete</h3>
                <button onClick={cancelDelete} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-100">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">Delete employee <span className="font-medium">{showDeletePrompt.name}</span>?</p>
                <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80">Cancel</button>
                <button onClick={confirmDeleteEmployee} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Column Prompt */}
        {showDeleteColumnPrompt && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  {showDeleteColumnPrompt.title}
                </h3>
                <button
                  onClick={() => setShowDeleteColumnPrompt(null)}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-100"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mb-4">
                {showDeleteColumnPrompt.type === 'warning' ? (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">
                    {showDeleteColumnPrompt.message}
                  </p>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">
                      Are you sure you want to delete column
                      <span className="font-medium">
                        {" "}{showDeleteColumnPrompt.columnLabel}
                      </span>?
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      This action cannot be undone.
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteColumnPrompt(null)}
                  className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80"
                >
                  {showDeleteColumnPrompt.type === 'warning' ? 'OK' : 'Cancel'}
                </button>

                {showDeleteColumnPrompt.type === 'delete' && (
                  <button
                    onClick={confirmDeleteColumn}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Prompt */}
        {showBulkDeletePrompt.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">Confirm Bulk Delete</h3>
                <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-100">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">
                  Are you sure you want to delete {showBulkDeletePrompt.count} selected employee{showBulkDeletePrompt.count > 1 ? 's' : ''}?
                </p>
                <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80">Cancel</button>
                <button onClick={confirmBulkDelete} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Column Prompt */}
        {showColumnAddPrompt.show && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">Add New Column</h3>
                <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4 space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">
                  Are you sure you want to add column "<span className="font-medium">{showColumnAddPrompt.columnName}</span>"?
                </p>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-100 uppercase tracking-wider mb-2">Select Data Type</label>
                  <select 
                    value={newColumnType}
                    onChange={(e) => setNewColumnType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
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
                  {suggestedType && (
                    <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Smart suggestion: {suggestedType}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors">Cancel</button>
                <button onClick={confirmAddColumn} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Add Column</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Confirmation Prompt */}
        {showExportConfirmPrompt?.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">Confirm Export</h3>
                <button onClick={() => setShowExportConfirmPrompt(null)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-100">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-100">
                  Export {showExportConfirmPrompt.count} employee{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowExportConfirmPrompt(null)} className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80">Cancel</button>
                <button onClick={() => {
                  handleExport(showExportConfirmPrompt.format);
                  setShowExportConfirmPrompt(null);
                }} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Export</button>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Column Modal */}
        {showFreezeColumnModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-500" />
                  Freeze Columns
                </h3>
                <button
                  onClick={() => setShowFreezeColumnModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-[13px] text-slate-500 dark:text-slate-100 mb-4">
                  Select columns to pin to the left side of the table while scrolling.
                </p>
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                  {visibleColumns.map((column) => {
                    const actualColumnIndex = columns.findIndex(col => col.id === column.id);
                    const isFrozen = tempFrozenColumns.includes(actualColumnIndex);
                    return (
                      <label
                        key={column.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isFrozen
                            ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                            : 'bg-white border-slate-200 hover:border-blue-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-blue-900'
                          }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isFrozen}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempFrozenColumns([...tempFrozenColumns, actualColumnIndex].sort((a, b) => a - b));
                              } else {
                                setTempFrozenColumns(tempFrozenColumns.filter(idx => idx !== actualColumnIndex));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <span className={`ml-3 text-sm font-medium ${isFrozen ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-white'}`}>
                          {column.label}
                        </span>
                        {isFrozen && <Snowflake className="h-3 w-3 ml-auto text-blue-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowFreezeColumnModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezeColumns}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Row Modal */}
        {showFreezeRowModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Snowflake className="h-4 w-4 text-blue-500" />
                  Freeze Rows
                </h3>
                <button
                  onClick={() => setShowFreezeRowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-[13px] text-slate-500 dark:text-slate-100 mb-4">
                  Select rows to pin to the top of the table while scrolling.
                </p>
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                  {paginatedEmployees.map((emp, index) => {
                    const actualRowIndex = (currentPage - 1) * pageSize + index;
                    const isFrozen = tempFrozenRows.includes(actualRowIndex);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isFrozen
                            ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                            : 'bg-white border-slate-200 hover:border-blue-200 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-blue-900'
                          }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={isFrozen}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempFrozenRows([...tempFrozenRows, actualRowIndex].sort((a, b) => a - b));
                              } else {
                                setTempFrozenRows(tempFrozenRows.filter(idx => idx !== actualRowIndex));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <div className="ml-3 flex flex-col">
                          <span className={`text-sm font-medium ${isFrozen ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-white'}`}>
                            {emp.name}
                          </span>
                          <span className="text-[11px] text-slate-400 uppercase font-mono">ID: {emp.id || emp.employee_id}</span>
                        </div>
                        {isFrozen && <Snowflake className="h-3 w-3 ml-auto text-blue-500" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowFreezeRowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezeRows}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Column Management Modal */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-w-md w-full mx-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  Manage Column Layout
                </h3>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-100 uppercase tracking-wider mb-2">Add New Custom Column</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g., Phone Number"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      className="flex-grow px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                    />
                    <button
                      onClick={handleAddColumn}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 dark:shadow-none"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-100 uppercase tracking-wider mb-2">Visibility & Actions</label>
                  <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                    {columns.map((column) => {
                      const isEditing = editingColumn === column.id;
                      const isFixed = ['employee_id', 'name', 'email', 'department', 'role', 'status', 'project_name'].includes(column.id);

                      return (
                        <div key={column.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg group">
                          <div className="flex items-center min-w-0 flex-1 mr-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="text"
                                  value={tempColumnName}
                                  onChange={(e) => setTempColumnName(e.target.value)}
                                  className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded bg-white dark:bg-slate-900 outline-none"
                                  autoFocus
                                />
                                <button onClick={() => saveEditColumn(column.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="h-4 w-4" /></button>
                                <button onClick={cancelEditColumn} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{column.label}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleColumnVisibility(column.id)}
                              className={`p-1.5 rounded-md transition-colors ${column.visible ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                              title={column.visible ? "Visible" : "Hidden"}
                            >
                              {column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>

                            {!isEditing && (
                              <button
                                onClick={() => startEditColumn(column.id, column.label)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                title="Rename"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}

                            {!isFixed && (
                              <button
                                onClick={() => handleDeleteColumn(column.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddEmployeeModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl flex flex-col max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200/60 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Employee</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-100 mt-0.5">Register a new staff member in the system.</p>
                </div>
                <button
                  onClick={cancelNewEmployee}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Basic Information Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Basic Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Employee ID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Employee ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.employee_id || ''}
                        onChange={(e) => handleNewEmployeeChange('employee_id', e.target.value)}
                        placeholder="e.g. EMP001"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.employee_id ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.employee_id && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.employee_id}</p>}
                    </div>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.name || ''}
                        onChange={(e) => handleNewEmployeeChange('name', e.target.value)}
                        placeholder="Enter full name"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.name && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.name}</p>}
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={newEmployee.email || ''}
                        onChange={(e) => handleNewEmployeeChange('email', e.target.value)}
                        placeholder="email@example.com"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.email && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.email}</p>}
                    </div>
                    {/* Department */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.department || ''}
                        onChange={(e) => handleNewEmployeeChange('department', e.target.value)}
                        placeholder="e.g. Engineering"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.department ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.department && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.department}</p>}
                    </div>
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Status <span className="text-red-500">*</span></label>
                      <select
                        value={newEmployee.status || ''}
                        onChange={(e) => handleNewEmployeeChange('status', e.target.value)}
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.status ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 appearance-none cursor-pointer`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    {/* Role */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Role <span className="text-red-500">*</span></label>
                      <select
                        value={newEmployee.role || ''}
                        onChange={(e) => handleNewEmployeeChange('role', e.target.value)}
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.role ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 appearance-none cursor-pointer`}
                      >
                        <option value="" disabled>Select role</option>
                        {dynamicRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Custom Fields Section */}
                {customColumns.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Additional Details</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      {customColumns.map((col) => {
                        const inputType = {
                          'integer': 'number',
                          'decimal': 'number',
                          'currency': 'number',
                          'date': 'date',
                          'email': 'email',
                          'phone': 'tel',
                          'boolean': 'checkbox'
                        }[col.data_type] || 'text';

                        if (col.data_type === 'boolean' || col.type === 'boolean') {
                          return (
                            <div key={col.id} className="flex items-center gap-3 mt-6">
                              <input
                                type="checkbox"
                                id={`new-${col.id}`}
                                checked={newEmployee.custom_fields?.[col.id] === true}
                                onChange={(e) => handleNewEmployeeChange(col.id, e.target.checked)}
                                className="h-5 w-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <label htmlFor={`new-${col.id}`} className="text-xs font-semibold text-slate-700 dark:text-white cursor-pointer">
                                {col.label} {col.required && <span className="text-red-500">*</span>}
                              </label>
                            </div>
                          );
                        }
                         return (
                          <div key={col.id}>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">
                              {col.label} {col.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type={inputType}
                              value={newEmployee.custom_fields?.[col.id] || ''}
                              onChange={(e) => handleNewEmployeeChange(col.id, e.target.value)}
                              className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors[col.id] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                              placeholder={`Enter ${col.label.toLowerCase()}`}
                            />
                            {validationErrors[col.id] && (
                              <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors[col.id]}</p>
                            )}
                          </div>
                        );

                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={cancelNewEmployee}
                  className="px-6 py-2 text-sm font-semibold text-slate-600 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewEmployee}
                  className="px-8 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md shadow-blue-500/10 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  Save Employee
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl flex flex-col max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200/60 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Employee</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-100 mt-0.5">Modify details for <span className="text-blue-600 font-semibold">{editForm.name}</span></p>
                </div>
                <button
                  onClick={cancelEdit}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Basic Information Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Basic Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Employee ID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Employee ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.employee_id || ''}
                        onChange={(e) => handleEditFormChange('employee_id', e.target.value)}
                        placeholder="e.g. EMP001"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.employee_id ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.employee_id && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.employee_id}</p>}
                    </div>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        placeholder="Enter full name"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.name && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.name}</p>}
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        placeholder="email@example.com"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.email && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.email}</p>}
                    </div>
                    {/* Department */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.department || ''}
                        onChange={(e) => handleEditFormChange('department', e.target.value)}
                        placeholder="e.g. Engineering"
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.department ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                      />
                      {validationErrors.department && <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors.department}</p>}
                    </div>
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Status <span className="text-red-500">*</span></label>
                      <select
                        value={editForm.status || 'Active'}
                        onChange={(e) => handleEditFormChange('status', e.target.value)}
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.status ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 appearance-none cursor-pointer`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    {/* Role */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">Role <span className="text-red-500">*</span></label>
                      <select
                        value={editForm.role || ''}
                        onChange={(e) => handleEditFormChange('role', e.target.value)}
                        className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors.role ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 appearance-none cursor-pointer`}
                      >
                        <option value="" disabled>Select role</option>
                        {dynamicRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Custom Fields Section */}
                {customColumns.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Additional Details</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      {customColumns.map((col) => {
                        const inputType = {
                          'integer': 'number',
                          'decimal': 'number',
                          'currency': 'number',
                          'date': 'date',
                          'email': 'email',
                          'phone': 'tel',
                          'boolean': 'checkbox'
                        }[col.data_type] || 'text';

                        if (col.data_type === 'boolean') {
                          return (
                            <div key={col.id} className="flex items-center gap-3 mt-6">
                              <input
                                type="checkbox"
                                id={`edit-${col.id}`}
                                checked={editForm.custom_fields?.[col.id] === true}
                                onChange={(e) => handleEditFormChange(col.id, e.target.checked)}
                                className="h-5 w-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <label htmlFor={`edit-${col.id}`} className="text-xs font-semibold text-slate-700 dark:text-white cursor-pointer">
                                {col.label} {col.required && <span className="text-red-500">*</span>}
                              </label>
                            </div>
                          );
                        }
                         return (
                          <div key={col.id}>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-white mb-1.5">
                              {col.label} {col.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type={inputType}
                              value={editForm.custom_fields?.[col.id] || ''}
                              onChange={(e) => handleEditFormChange(col.id, e.target.value)}
                              className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border ${validationErrors[col.id] ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
                              placeholder={`Enter ${col.label.toLowerCase()}`}
                            />
                            {validationErrors[col.id] && (
                              <p className="mt-1 text-[10px] text-red-500 font-medium">{validationErrors[col.id]}</p>
                            )}
                          </div>
                        );

                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={cancelEdit}
                  className="px-6 py-2 text-sm font-semibold text-slate-600 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-8 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md shadow-blue-500/10 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT CONTAINER */}
        <div className="master-table-container dark:bg-slate-800 dark:border-slate-700">

          {/* Loading / Error State */}
          {loading && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-100">
              Loading data...
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* TOOLBAR SECTION */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  {/* LEFT SIDE */}
                  <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-2 items-start sm:items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-48 h-10 pl-9 pr-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>

                    {/* Bulk Filter Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`flex items-center gap-1.5 h-10 px-3 text-xs sm:text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${Object.values(activeFilters).some(v => v.length > 0)
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white'
                          }`}
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Bulk Filter</span>
                        {Object.values(activeFilters).flat().length > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center pointer-events-none ml-1">
                            {Object.values(activeFilters).flat().length}
                          </span>
                        )}
                      </button>

                      {showFilterDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                          <div className="absolute left-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-4 max-h-[85vh] flex flex-col overflow-hidden animate-slideInUp">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Bulk Filters</h4>
                              <button
                                onClick={() => setActiveFilters({ department: [], role: [], status: [], project_name: [] })}
                                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Clear All
                              </button>
                            </div>

                            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                              {/* Filter Sections */}
                              {[
                                { id: 'department', label: 'Department', options: filterOptions.department },
                                { id: 'role', label: 'Role', options: filterOptions.role },
                                { id: 'status', label: 'Status', options: filterOptions.status },
                                { id: 'project_name', label: 'Project Name', options: filterOptions.project_name }
                              ].map(section => (
                                <div key={section.id} className="filter-section">
                                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-100 uppercase block mb-1.5">{section.label}</label>
                                  <div className="grid grid-cols-1 gap-1.5 pl-1">
                                    {section.options.length > 0 ? section.options.map(option => (
                                      <label key={option} className="flex items-center gap-2 group cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={activeFilters[section.id].includes(option)}
                                          onChange={(e) => {
                                            const current = activeFilters[section.id];
                                            const updated = e.target.checked
                                              ? [...current, option]
                                              : current.filter(o => o !== option);
                                            setActiveFilters({ ...activeFilters, [section.id]: updated });
                                          }}
                                          className="h-3.5 w-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[13px] text-slate-700 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                                          {option}
                                        </span>
                                      </label>
                                    )) : (
                                      <span className="text-[11px] text-slate-400 italic">No options available</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                              <button
                                onClick={() => setShowFilterDropdown(false)}
                                className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Apply Bulk Filters
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Column Visibility Toggle */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          const draft = {};
                          columns.forEach(col => { draft[col.id] = col.visible; });
                          setFilterDraft(draft);
                          setShowColumnsDropdown(!showColumnsDropdown);
                        }}
                        className={`flex items-center gap-1.5 h-10 px-3 text-xs sm:text-sm border rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm ${showColumnsDropdown ? 'bg-slate-100 border-slate-400' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white'
                          }`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Columns</span>
                      </button>

                      {showColumnsDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColumnsDropdown(false)} />
                          <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 p-3 animate-slideInUp">
                            <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-3 px-1">Visible Columns</h4>
                            <div className="space-y-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                              {columns.map(col => (
                                <label key={col.id} className="flex items-center space-x-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors group">
                                  <input
                                    type="checkbox"
                                    checked={filterDraft[col.id] !== false}
                                    onChange={(e) => {
                                      setFilterDraft({ ...filterDraft, [col.id]: e.target.checked });
                                    }}
                                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span className="text-[13px] text-slate-700 dark:text-white select-none group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                                    {col.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setColumns(columns.map(col => ({
                                    ...col,
                                    visible: filterDraft[col.id] !== false
                                  })));
                                  setShowColumnsDropdown(false);
                                }}
                                className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Update View
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div className="flex gap-2 mt-2 sm:mt-0">

                    {/* Add Employee Button */}
                    {hasPermission('Employee Master', 'ADD') && (
                      <button
                        onClick={handleAddEmployeeClick}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                        data-tooltip="Add employee"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Employee</span>
                      </button>
                    )}

                    {/* Add Column Button */}
                    {hasPermission('Employee Master', 'ADD') && (
                      <button
                        onClick={() => setShowColumnModal(true)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 whitespace-nowrap master-table-tooltip"
                        data-tooltip="Add column"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Column</span>
                      </button>
                    )}

                    {/* Export Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 master-table-tooltip"
                        data-tooltip="Export data"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {/* Export Dropdown */}
                      {showExportDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowExportDropdown(false)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-lg z-50">
                            <button
                              onClick={() => handleExportClick('excel')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                            >
                              Export as Excel
                            </button>
                            <button
                              onClick={() => handleExportClick('csv')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                            >
                              Export as CSV
                            </button>
                            <button
                              onClick={() => handleExportClick('json')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                            >
                              Export as JSON
                            </button>
                            <button
                              onClick={() => handleExportClick('pdf')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800"
                            >
                              Export as PDF
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={handleRefresh}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 whitespace-nowrap master-table-tooltip"
                      data-tooltip="Refresh data"
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE SECTION - SCROLLABLE */}
              <div className="master-table-scroll">
                <div className="master-table-scroll-inner">
                  <table className="master-table">
                    <thead className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {/* Checkbox column */}
                        <th
                          className={`text-left py-3 px-4 font-medium cursor-pointer w-10 ${isColumnFrozen(0) ? 'frozen-column' : ''
                            }`}
                          style={{
                            left: isColumnFrozen(0) ? '0' : 'auto',
                            zIndex: isColumnFrozen(0) ? 35 : 30
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              onClick={toggleSelectAll}
                              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:text-slate-100 transition-colors"
                            >
                              {selectAll ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </th>
                        {visibleColumns.map((col) => {
                          const actualColumnIndex = columns.findIndex(c => c.id === col.id);
                          return (
                            <th
                              key={col.id}
                              className={`text-left py-3 px-4 font-medium whitespace-nowrap group relative ${isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                                }`}
                              style={{
                                left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                                zIndex: isColumnFrozen(actualColumnIndex) ? 35 : 30
                              }}
                            >
                              <div className="flex items-center w-full min-w-0">
                                {/* Left side, label and required star */}
                                <div className="flex items-center space-x-1.5 min-w-0 cursor-pointer" onClick={() => handleSort(col.id)}>
                                  <span className="font-medium text-[13px] truncate">{col.label}</span>
                                  {col.required && <span className="text-red-400 shrink-0">*</span>}
                                  {sortConfig.key === col.id && (
                                    <span className="ml-1.5 shrink-0 text-blue-600 dark:text-blue-400">
                                      {getSortIcon(col.id)}
                                    </span>
                                  )}
                                </div>

                                {/* Right side, icon at 'tab-space' (ml-4) */}
                                <div className="ml-5 flex items-center shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownColumn(activeDropdownColumn === col.id ? null : col.id);
                                    }}
                                    className={`p-1.5 rounded-md transition-all ${activeDropdownColumn === col.id
                                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-100'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Dropdown Menu */}
                              {activeDropdownColumn === col.id && (
                                <div
                                  className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 py-1 normal-case tracking-normal"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {col.sortable && (
                                    <>
                                      <button
                                        onClick={() => handleSortFromMenu(col.id, 'ascending')}
                                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                      >
                                        <ArrowUp className="h-3.5 w-3.5 text-slate-400" />
                                        Sort Ascending
                                      </button>
                                      <button
                                        onClick={() => handleSortFromMenu(col.id, 'descending')}
                                        className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                      >
                                        <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                                        Sort Descending
                                      </button>
                                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleCopyColumnName(col.label)}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                    Copy name
                                  </button>

                                  <button
                                    onClick={() => {
                                      startEditColumn(col.id, col.label);
                                      setShowColumnModal(true);
                                      setActiveDropdownColumn(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-slate-400" />
                                    Edit column
                                  </button>

                                  <button
                                    onClick={() => handleFreezeColumnMenu(actualColumnIndex)}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                  >
                                    {isColumnFrozen(actualColumnIndex) ? (
                                      <>
                                        <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-blue-600">Unfreeze column</span>
                                      </>
                                    ) : (
                                      <>
                                        <Snowflake className="h-3.5 w-3.5 text-slate-400" />
                                        Freeze column
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => {
                                      toggleFreezeRow();
                                      setActiveDropdownColumn(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-white"
                                  >
                                    {frozenRows.length > 0 ? (
                                      <>
                                        <Snowflake className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-blue-600">Unfreeze row(s)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Snowflake className="h-3.5 w-3.5 text-slate-400" />
                                        Freeze row(s)
                                      </>
                                    )}
                                  </button>

                                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                  <button
                                    onClick={() => {
                                      handleDeleteColumn(col.id);
                                      setActiveDropdownColumn(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete column
                                  </button>
                                </div>
                              )}
                            </th>
                          );
                        })}
                        {/* Actions Header - Sticky Right */}
                        <th className="sticky right-0 bg-slate-100 dark:bg-slate-700 z-20 px-6 py-3 text-right font-medium border-l border-slate-200 dark:border-slate-700 w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/50">
                      {paginatedEmployees.map((emp, rowIndex) => {
                        const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
                        const isRowCurrentlyFrozen = isRowFrozen(actualRowIndex);

                        return (
                          <tr
                            key={emp.id}
                            className={`group transition-colors duration-150 ${isRowCurrentlyFrozen ? 'frozen-row' : ''
                              } ${selectedEmployees.includes(emp.id) ? 'row-selected bg-blue-50/40 dark:bg-blue-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}
                            style={{
                              top: isRowCurrentlyFrozen ? getFrozenRowTop(actualRowIndex) : 'auto'
                            }}
                          >
                            {/* Checkbox cell */}
                            <td
                              className={`py-3 px-4 whitespace-nowrap w-10 ${isColumnFrozen(0) ? 'frozen-column' : ''
                                }`}
                              style={{
                                left: isColumnFrozen(0) ? '0' : 'auto',
                                zIndex: isColumnFrozen(0) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                              }}
                            >
                              <div className={`flex items-center justify-center ${selectedEmployees.includes(emp.id) ? 'opacity-100' : 'master-table-checkbox-cell'}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedEmployees.includes(emp.id)}
                                  onChange={() => toggleEmployeeSelection(emp.id)}
                                  className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                            </td>
                            {visibleColumns.map((col) => {
                              const actualColumnIndex = columns.findIndex(c => c.id === col.id);
                              return (
                                <td
                                  key={col.id}
                                  className={`py-3 px-4 whitespace-nowrap ${isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                                    }`}
                                  style={{
                                    left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                                    zIndex: isColumnFrozen(actualColumnIndex) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                                  }}
                                >
                                  {renderCellContent(col, emp[col.id], emp)}
                                </td>
                              );
                            })}
                            {/* Actions Cell - Sticky Right */}
                            <td className={`sticky right-0 z-10 py-3 px-4 text-right whitespace-nowrap w-[100px] border-l border-slate-100 dark:border-slate-700 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] ${selectedEmployees.includes(emp.id)
                                ? 'bg-[#f8faff] dark:bg-[#1e293b]'
                                : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50'
                              }`}>
                              <div className="flex items-center justify-end gap-1 transition-opacity duration-200">
                                {hasPermission('Employee Master', 'EDIT') && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEditing(emp); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                )}
                                {hasPermission('Employee Master', 'DELETE') && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeletePrompt({ id: emp.id, name: emp.name }); }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Empty state */}
                      {paginatedEmployees.length === 0 && (
                        <tr>
                          <td colSpan={visibleColumns.length + 2} className="py-24">
                            <div className="flex flex-col items-center justify-center text-center px-4">
                              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-700">
                                <Users className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Employees Found</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-100 max-w-sm mx-auto leading-relaxed">
                                We couldn't find any staff records matching your search. Try adjusting your filters or add a new team member.
                              </p>
                              {hasPermission('Employee Master', 'ADD') && (
                                <button
                                  onClick={handleAddEmployeeClick}
                                  className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                >
                                  <Plus className="h-5 w-5" />
                                  Add Your First Employee
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER SECTION */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white dark:bg-slate-800 flex-shrink-0">
                {/* LEFT SIDE - Add Employee and Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {hasPermission('Employee Master', 'ADD') && (
                      <button
                        onClick={handleAddEmployeeClick}
                        className="flex items-center gap-1 h-10 px-3 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 master-table-tooltip"
                        data-tooltip="Add employee"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={toggleFreezeRow}
                      className={`flex items-center gap-1 h-10 px-3 text-xs border rounded master-table-tooltip ${frozenRows.length > 0
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-white'
                        }`}
                      data-tooltip={frozenRows.length > 0 ? "Unfreeze rows" : "Select rows to freeze"}
                    >
                      <Snowflake className={`h-4 w-4 ${frozenRows.length > 0 ? 'text-blue-600' : 'text-slate-600 dark:text-slate-100'}`} />
                      {frozenRows.length > 0 && <span className="ml-1 text-xs">{frozenRows.length}</span>}
                    </button>
                  </div>

                  {/* Edit and Delete buttons - only show when employees are selected */}
                  {selectedEmployees.length > 0 ? (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={handleBulkEdit}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80"
                        title="Edit selected employee"
                      >
                        <Edit className="h-4 w-4" />
                        {selectedEmployees.length > 1 && <span>Edit ({selectedEmployees.length})</span>}
                      </button>

                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        title={selectedEmployees.length === 1 ? "Delete selected employee" : "Delete selected employees"}
                      >
                        <Trash2 className="h-4 w-4" />
                        {selectedEmployees.length > 1 && <span>Delete ({selectedEmployees.length})</span>}
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* RIGHT SIDE - Info, Pagination, and Column Count */}
                <div className="flex items-center gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-100">Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-1 rounded ${currentPage === 1
                          ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800'
                          }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {getPageNumbers().map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-2 py-1 text-xs rounded ${currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800'
                            }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-1 rounded ${currentPage === totalPages
                          ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                          : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:bg-slate-800'
                          }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <span className="text-slate-600 dark:text-white">
                    Showing {paginatedEmployees.length} of {sortedEmployees.length} employees
                  </span>

                  {selectedEmployees.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {selectedEmployees.length} selected
                    </span>
                  )}
                  <span className="text-slate-600 dark:text-white">
                    ({visibleColumns.length} of {columns.length} columns visible)
                  </span>
                  {(frozenRows.length > 0 || frozenColumns.length > 0) && (
                    <span className="px-2 py-1 master-table-freeze-indicator rounded text-xs flex items-center gap-1">
                      <Snowflake className="h-3 w-3" />
                      {frozenRows.length > 0 && frozenColumns.length > 0 ? `${frozenRows.length} row(s) & ${frozenColumns.length} col(s) frozen` :
                        frozenRows.length > 0 ? `${frozenRows.length} row(s) frozen` : `${frozenColumns.length} col(s) frozen`}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    </div>
  );
};

export default EmployeeMaster;
