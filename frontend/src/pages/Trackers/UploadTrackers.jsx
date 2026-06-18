import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { setSelectedUploadFileId } from '../../store/slices/navSlice';
import {
  Upload, File, CheckCircle, Clock, AlertCircle, Download, Trash2, Eye, Edit,
  Plus, Search, X, ChevronUp, ChevronDown, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, FileText, FileSpreadsheet, Database,
  HardDrive, Archive, Check, Calendar, EyeOff, User,
  Edit2, Save, Columns, Rows, CheckSquare, Square, FolderTree, Layout, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API from '../../utils/api';
import { toast } from 'sonner';
import FileContentViewer from './FileContentViewer';
import { getEmployees } from '../../utils/employeeApi';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';
import { trackerSidebarManager } from '../../utils/trackerSidebarManager';
import { getCurrentUser } from '../../utils/userUtils';
import Skeleton from '../../components/ui/skeleton';

// Use shared trackerSidebarManager instead of internal implementation
const sidebarManager = trackerSidebarManager;

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

// Add Column Modal Component
const AddColumnModal = ({ isOpen, onClose, onSubmit }) => {
  const [columnName, setColumnName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!columnName.trim()) {
      setError('Column name is required');
      return;
    }
    onSubmit(columnName.trim());
    setColumnName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-app-surface dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-border dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary dark:text-slate-100">Add New Column</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary dark:text-slate-300 mb-2">
            Column Name
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => {
              setColumnName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter column name"
            className={`w-full px-3 py-2 border rounded bg-app-surface dark:bg-slate-800 text-text-primary dark:text-slate-100 ${error ? 'border-red-500' : 'border-border dark:border-slate-700'
              }`}
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border dark:border-slate-700 rounded text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
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
          <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border dark:border-slate-700 rounded text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTION TO CAPITALIZE FIRST LETTER OF COLUMN NAMES
// ============================================================================
const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================================================
// FILE CONTENT VIEWER COMPONENT - FIXED WITH CONTEXT AND VIEWONLY SUPPORT
// ============================================================================

// Internal FileContentViewer placeholder removed for consolidation


// ============================================================================
// MAIN UPLOAD TRACKERS COMPONENT
// ============================================================================

const UploadTrackers = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const loadingFileIdRef = useRef(null);
  const selectedFileId = useSelector(state => state.nav.selectedUploadFileId);
  const authUser = useSelector(state => state.auth?.user);
  const isAdmin = authUser?.role === 'Admin' || authUser?.role === 'Super Admin' || authUser?.role === 'Project Manager';
  
  const onClearSelection = () => dispatch(setSelectedUploadFileId(null));
  // Initial columns configuration
  const initialColumns = [
    { id: 'project', label: 'Project Name', sortable: true, type: 'text', required: true, visible: true },
    { id: 'department', label: 'Department', sortable: true, type: 'text', required: true, visible: true },
    { id: 'fileName', label: 'Tracker File', sortable: true, type: 'text', required: true, visible: true },
    { id: 'employeeName', label: 'Uploaded By', sortable: true, type: 'text', required: true, visible: true },
    { id: 'uploadDate', label: 'Upload Date', sortable: true, type: 'text', required: true, visible: true },
    { id: 'status', label: 'Status', sortable: true, type: 'text', required: true, visible: true },
  ];



  // Load columns
  const [availableColumns, setAvailableColumns] = useState(initialColumns);

  // Load trackers from API
  const [trackers, setTrackers] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [projectList, setProjectList] = useState([]);

  const { data: uploadData, isLoading, refetch: refetchUploads } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      const response = await API.get('/uploads');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projectsList'],
    queryFn: async () => {
      const response = await API.get('/projects/');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (uploadData) setTrackers(uploadData);
  }, [uploadData]);

  useEffect(() => {
    if (projectsData) setProjectList(projectsData);
  }, [projectsData]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await getEmployees();
        setEmployeeList(response.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);


  // Excel Viewer Modal State
  const [excelViewerData, setExcelViewerData] = useState(null);
  const [excelEditMode, setExcelEditMode] = useState(false);
  const [excelEditData, setExcelEditData] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [excelHeaders, setExcelHeaders] = useState([]);

  // Upload Form Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    project: '',
    department: 'Design Release',
    employeeName: '',
    file: null
  });
  const [uploadFormErrors, setUploadFormErrors] = useState({});

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Filter state
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected file content state
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFileTrackerInfo, setSelectedFileTrackerInfo] = useState(null);



  // New state for checkboxes and selection
  const [selectedTrackers, setSelectedTrackers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);

  // ==========================================================================
  // FIXED: Initial file loaded flag - CRITICAL FOR NAVIGATION
  // ==========================================================================
  const [initialFileLoaded, setInitialFileLoaded] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  // Show notification
  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  // Handle URL parameters when component mounts or URL changes
  useEffect(() => {
    const fileId = searchParams.get('file');

    if (fileId && trackers.length > 0) {
      const trackerId = parseInt(fileId, 10);
      if (selectedFileId !== trackerId) {
        dispatch(setSelectedUploadFileId(trackerId));
      }
    } else if (!fileId && selectedFileId !== null) {
      // URL cleared (e.g. browser back) — also clear Redux state
      dispatch(setSelectedUploadFileId(null));
    }
  }, [searchParams, trackers, selectedFileId, dispatch]);

  // Save trackers to localStorage (metadata only)
  useEffect(() => {
    localStorage.setItem('upload_trackers', JSON.stringify(trackers));
  }, [trackers]);

  // Scroll position restoration
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('uploadTrackersScrollY');
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY, 10));
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem('uploadTrackersScrollY', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      sessionStorage.setItem('uploadTrackersScrollY', window.scrollY.toString());
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Repair sidebar modules on mount
  useEffect(() => {
    sidebarManager.repairAllModules();
  }, []);

  // Load file content when selectedFileId changes
  useEffect(() => {
    if (trackers.length === 0) return;

    if (selectedFileId) {
      const tracker = trackers.find(t => t.id === selectedFileId || t.upload_id === selectedFileId);
      if (tracker) {
        setSelectedFileTrackerInfo(tracker);
      }

      const trackerId = parseInt(selectedFileId, 10);
      const isCorrectFileLoaded = initialFileLoaded && 
        (selectedFileTrackerInfo?.upload_id === trackerId || selectedFileTrackerInfo?.id === trackerId);

      if (!isCorrectFileLoaded && loadingFileIdRef.current !== trackerId) {
        openFileDirectly(trackerId);
      }
    } else {
      setSelectedFileContent(null);
      setSelectedFileTrackerInfo(null);
      setInitialFileLoaded(false);
    }
  }, [selectedFileId, trackers, initialFileLoaded, selectedFileTrackerInfo]);

  // Handle saving edited file data
  const handleSaveFileData = async (trackerId, updatedFileData) => {
    try {
      setFetchingData(true);
      
      const headers = updatedFileData.headers || [];
      const rowsAsDicts = (updatedFileData.data || []).map(rowArray => {
        const rowObj = {};
        headers.forEach((h, index) => {
          rowObj[h] = rowArray[index] !== undefined ? rowArray[index] : '';
        });
        return rowObj;
      });

      const payload = {
        schema: updatedFileData.columns_schema || [],
        rows: rowsAsDicts
      };
      
      await API.patch(`/tracker_ingestions/${trackerId}`, payload);
      showNotification('Tracker saved successfully');
      
      // Update local state content
      setSelectedFileContent(prev => ({
        ...prev,
        headers: updatedFileData.headers,
        data: updatedFileData.data,
        schema: updatedFileData.columns_schema
      }));
      
      // Update the main trackers list counts
      refetchUploads();
    } catch (error) {
      console.error('Error saving tracker data:', error);
      const errMsg = error.response?.data?.detail || 'Failed to save tracker data';
      showNotification(errMsg, 'error');
    } finally {
      setFetchingData(false);
    }
  };


  // Get current date functions
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getFormattedDate = () => {
    const now = new Date();
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  // Get visible columns for table
  const visibleColumns = availableColumns.filter(col => col.visible);

  // Get unique departments from trackers data
  const uniqueDepartments = [...new Set(trackers.map(tracker => tracker.department).filter(Boolean))];

  // Filter trackers based on search and filters
  const filteredTrackers = trackers.filter(tracker => {
    const matchesSearch = Object.values(tracker).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesDept = !departmentFilter || tracker.department?.toLowerCase().includes(departmentFilter.toLowerCase());
    const matchesDate = !dateFilter || tracker.uploadDate === dateFilter;

    return matchesSearch && matchesDept && matchesDate;
  });

  // Sort trackers
  const sortedTrackers = React.useMemo(() => {
    if (!sortConfig.key) return filteredTrackers;

    return [...filteredTrackers].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (aVal < bVal) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredTrackers, sortConfig]);

  const totalItems = sortedTrackers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedTrackers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTrackers.slice(startIndex, startIndex + pageSize);
  }, [sortedTrackers, currentPage, pageSize]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, dateFilter]);

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrackers([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = paginatedTrackers.map(tracker => tracker.id);
      setSelectedTrackers(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleTrackerSelection = (trackerId) => {
    setSelectedTrackers(prev => {
      if (prev.includes(trackerId)) {
        const newSelection = prev.filter(id => id !== trackerId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, trackerId];
        const allVisibleIds = paginatedTrackers.map(tracker => tracker.id);
        if (newSelection.length === allVisibleIds.length && allVisibleIds.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };


  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedTrackers.length === 0) {
      showNotification('Please select at least one upload to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedTrackers.length
    });
  };

  const confirmBulkDelete = async () => {
    if (selectedTrackers.length === 0) return;

    const count = selectedTrackers.length;
    
    // Show a temporary "Deleting..." notification if many files
    if (count > 2) {
      showNotification(`Deleting ${count} records...`, 'info');
    }

    try {
      // Single bulk delete API call
      const response = await API.post('/uploads/bulk-delete', { ids: selectedTrackers });
      console.log('Bulk delete response:', response.data);

      // After successful deletion, update local state
      // Filter out deleted trackers from the current list
      setTrackers(prev => prev.filter(tracker => !selectedTrackers.includes(tracker.id)));

      // Remove from sidebar contexts
      selectedTrackers.forEach(id => {
        sidebarManager.deleteFileFromAllContexts(id);
      });

      // Dispatch events to refresh views
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', { 
        detail: { type: 'bulk-delete', ids: selectedTrackers } 
      }));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', { 
        detail: { type: 'bulk-delete', ids: selectedTrackers } 
      }));

      // Reset selected file if it was among deleted ones
      if (selectedTrackers.includes(selectedFileId)) {
        dispatch(setSelectedUploadFileId(null));
        setSelectedFileContent(null);
        setSelectedFileTrackerInfo(null);
      }

      // Clear selection
      setSelectedTrackers([]);
      setSelectAll(false);
      
      showNotification(`${count} upload${count > 1 ? 's' : ''} deleted successfully`);
      setShowBulkDeletePrompt({ show: false, count: 0 });
    } catch (error) {
      console.error('Detailed error in bulk delete process:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Even if an error occurs, if the user reports it was deleted in backend, 
      // they might want to refresh the page to see current state.
      showNotification(
        error.response?.data?.detail || 'An error occurred during deletion. Please refresh the page.', 
        'error'
      );
      
      // Close the prompt anyway to avoid stuck UI
      setShowBulkDeletePrompt({ show: false, count: 0 });
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon for a column
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending'
      ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
      : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };


  // Delete tracker
  const showDeleteConfirmation = (id, name) => setShowDeletePrompt({ id, name });

  const confirmDeleteTracker = async () => {
    if (showDeletePrompt) {
      const { id } = showDeletePrompt;

      try {
        await API.delete(`/uploads/${id}`);

        // Remove from trackers
        setTrackers(trackers.filter(tracker => tracker.id !== id));

        // Remove from BOTH sidebar contexts (this also dispatches the events)
        sidebarManager.deleteFileFromAllContexts(id);

        // Explicitly dispatch events to ensure Dashboard sidebar reloads
        window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', { detail: { type: 'delete', id } }));
        window.dispatchEvent(new CustomEvent('projectDashboardUpdate', { detail: { type: 'delete', id } }));

        // Clear selection if this was the selected file
        if (selectedFileId === id) {
          setSelectedFileId(null);
          setSelectedFileContent(null);
          setSelectedFileTrackerInfo(null);
        }

        setShowDeletePrompt(null);
        showNotification('Upload record and associated modules deleted successfully');
      } catch (error) {
        console.error('Error deleting record:', error);
        showNotification('Failed to delete record', 'error');
      }
    }
  };

  const cancelDelete = () => setShowDeletePrompt(null);



  // Upload functions
  const openUploadModal = () => {
    setShowUploadModal(true);
    
    const currentUserName = getCurrentUser();
    const currentUserProfile = employeeList.find(e => e.name === currentUserName);
    const userDept = currentUserProfile?.department || '';
    
    // Filter projects based on assignment for non-admins
    const userProjects = isAdmin 
      ? projectList 
      : projectList.filter(p => 
          p.project_manager === currentUserName || 
          p.employee_name === currentUserName || 
          p.assigned_to_name === currentUserName
        );
    
    const defaultProject = userProjects.length === 1 ? userProjects[0].name : '';

    setUploadForm({
      project: defaultProject,
      department: userDept,
      employeeName: currentUserName,
      file: null
    });
    setUploadFormErrors({});
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const fileExtension = file.name.split('.').pop().toLowerCase();

          if (fileExtension === 'csv') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              const headers = jsonData[0];
              const rows = jsonData.slice(1);

              resolve({
                headers,
                data: rows,
                sheets: [{
                  name: 'Sheet1',
                  headers: headers,
                  data: rows
                }]
              });
            } else {
              resolve({
                headers: ['No Data'],
                data: [],
                sheets: [{
                  name: 'Sheet1',
                  headers: ['No Data'],
                  data: []
                }]
              });
            }
          } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheets = workbook.SheetNames.map(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              if (jsonData.length > 0) {
                return {
                  name: sheetName,
                  headers: jsonData[0],
                  data: jsonData.slice(1)
                };
              } else {
                return {
                  name: sheetName,
                  headers: ['No Data'],
                  data: []
                };
              }
            });

            resolve({
              headers: sheets[0].headers,
              data: sheets[0].data,
              sheets: sheets
            });
          } else if (fileExtension === 'json') {
            const jsonData = JSON.parse(data);
            let headers = [];
            let rows = [];

            if (Array.isArray(jsonData) && jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
              rows = jsonData.map(item => Object.values(item));
            } else if (typeof jsonData === 'object') {
              headers = ['Key', 'Value'];
              rows = Object.entries(jsonData);
            }

            resolve({
              headers,
              data: rows,
              sheets: [{
                name: 'Data',
                headers: headers,
                data: rows
              }]
            });
          } else {
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = ['Line', 'Content'];
            const rows = lines.map((line, index) => [index + 1, line.trim()]);

            resolve({
              headers,
              data: rows,
              sheets: [{
                name: 'Content',
                headers: headers,
                data: rows
              }]
            });
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          reject(new Error(`Error parsing file: ${error.message}`));
        }
      };

      reader.onerror = (error) => {
        reject(new Error(`File reading error: ${error.target.error}`));
      };

      if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleModalFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.name.split('.').pop().toUpperCase();
      const allowedTypes = ['XLSX', 'XLS'];

      if (!allowedTypes.includes(fileType)) {
        setUploadFormErrors({ ...uploadFormErrors, file: 'Please upload Excel (.xlsx, .xls) files only' });
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setUploadFormErrors({ ...uploadFormErrors, file: 'File size must be less than 50MB' });
        return;
      }

      setUploadForm({ ...uploadForm, file });
      setUploadFormErrors({ ...uploadFormErrors, file: '' });
    }
  };

  const handleUploadSubmit = async () => {
    const errors = {};
    if (!uploadForm.project.trim()) errors.project = 'Project is required';
    if (!uploadForm.department.trim()) errors.department = 'Department is required';
    if (!uploadForm.employeeName.trim()) errors.employeeName = 'Employee name is required';
    if (!uploadForm.file) errors.file = 'File is required';

    if (Object.keys(errors).length > 0) {
      setUploadFormErrors(errors);
      return;
    }

    setShowUploadModal(false);
    await handleFileUpload(uploadForm.file);
  };


  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setSelectedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadForm.project) formData.append('project', uploadForm.project);
      if (uploadForm.department) formData.append('department', uploadForm.department);
      if (uploadForm.employeeName) formData.append('employeeName', uploadForm.employeeName);

      const response = await API.post('/upload-tracker', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      const newTracker = response.data;

      // Get current user for metadata
      const currentUser = getCurrentUser();

      // Ensure progress finishes visually
      setProgress(100);

      // Add to trackers state
      setTrackers(prev => [newTracker, ...prev]);

      // ============ ADD TO BOTH SIDEBAR CONTEXTS ============

      // 1. Add to Upload Trackers hierarchy (for management view)
      sidebarManager.addToUploadTrackers(
        uploadForm.project,
        newTracker.fileName,
        newTracker.id,
        {
          department: uploadForm.department,
          employeeName: uploadForm.employeeName,
          fileType: newTracker.fileType
        }
      );

      // 2. Add to Project Dashboard hierarchy (for project view)
      sidebarManager.addToProjectDashboard(
        uploadForm.project,
        newTracker.fileName,
        newTracker.id,
        currentUser,
        {
          department: uploadForm.department,
          uploadedBy: currentUser,
          fileType: newTracker.fileType
        }
      );

      // Notify both contexts about the update
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'create', tracker: newTracker, context: 'upload-management' }
      }));

      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'create', tracker: newTracker, context: 'project-dashboard' }
      }));

      setUploading(false);
      setProgress(0);
      setSelectedFile(null);
      setUploadForm({
        project: '',
        department: 'Design Release',
        employeeName: '',
        file: null
      });

      // Refresh projects list in case a new one was created in project master
      try {
        const projResp = await API.get('/projects/');
        setProjectList(projResp.data || []);
      } catch (e) {
        console.error('Error refreshing projects after upload:', e);
      }

      showNotification('File uploaded successfully and added to both sidebar views');

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
      setProgress(0);
      
      let errorMessage = error.message;
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(e => e.msg).join(', ');
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }
      
      showNotification(`Error uploading file: ${errorMessage}`, 'error');
    }
  };

  // Excel viewer functions - FIXED to match FileContentViewer expected format
  const showExcelViewer = async (tracker) => {
    try {
      const response = await API.get(`/datasets/${tracker.id}/excel-view`);
      const { headers, data } = response.data;

      // Create a properly formatted fileData object that FileContentViewer expects
      const formattedFileData = {
        fileName: tracker.fileName,
        headers: headers,
        data: data,
        sheets: [{
          name: "Sheet1",
          headers: headers,
          data: data
        }]
      };

      setExcelViewerData({
        ...tracker,
        fileData: formattedFileData,
        sheets: formattedFileData.sheets
      });

      setExcelEditData(data.map(row => [...(row || [])]));
      setExcelHeaders(headers || []);
      setExcelEditMode(false);
      setCurrentSheet(0);
      setInitialFileLoaded(true);
    } catch (error) {
      console.error('Error fetching excel view data:', error);
      showNotification('Failed to load file data.', 'error');
    }
  };

  const closeExcelViewer = () => {
    setExcelViewerData(null);
    setExcelEditMode(false);
    setExcelEditData([]);
    setExcelHeaders([]);
    setInitialFileLoaded(false);
  };

  // Export functions
  const handleExportClick = (format) => {
    if (sortedTrackers.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedTrackers.length
    });
  };

  const handleExport = (format) => {
    const dataToExport = sortedTrackers.map(tracker => {
      const row = {};
      availableColumns.forEach(col => {
        row[col.label] = tracker[col.id] || '';
      });
      return row;
    });

    let content, mimeType, filename;

    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "UploadTrackers");
        XLSX.writeFile(wb, "upload_trackers.xlsx");
        setShowExportDropdown(false);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(dataToExport);
        mimeType = 'text/csv';
        filename = 'upload_trackers.csv';
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = 'upload_trackers.json';
        break;
      case 'pdf':
        exportToPDF(dataToExport);
        setShowExportDropdown(false);
        showNotification('Export to PDF completed successfully');
        return;
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

    setShowExportDropdown(false);
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
  };

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    const tableColumn = availableColumns.map(col => col.label);
    const tableRows = data.map(tracker =>
      availableColumns.map(col => tracker[col.label] || '')
    );

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("upload_trackers.pdf");
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const cell = row[header];
          return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };


  // Helper to remove project prefix and file extension
  const getDisplayFileName = (fileName, project) => {
    if (!fileName) return '';
    let name = fileName;
    if (project && name.startsWith(project + "_")) {
      name = name.substring(project.length + 1);
    }
    return name.replace(/\.[^/.]+$/, "");
  };

  const renderCellContent = (col, value, tracker) => {
    if (col.id === 'fileName') {
      const getFileColor = (type) => {
        switch (type) {
          case 'CSV': return 'text-blue-600 dark:text-blue-400';
          case 'XLS':
          case 'XLSX': return 'text-green-600 dark:text-green-400';
          case 'JSON': return 'text-purple-600 dark:text-purple-400';
          default: return 'text-slate-600 dark:text-slate-400';
        }
      };

      return (
        <div
          className="flex items-center cursor-pointer group/file"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setSelectedUploadFileId(tracker.upload_id));
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set('file', String(tracker.upload_id));
              return next;
            });
          }}
        >
          <File className="h-4 w-4 text-slate-400 dark:text-slate-500 mr-2 group-hover/file:text-blue-500 transition-colors" />
          <span className={`font-medium ${getFileColor(tracker.fileType)} group-hover/file:text-blue-600 dark:group-hover/file:text-blue-400 group-hover/file:underline transition-all`}>
            {getDisplayFileName(value, tracker.project) || '-'}
          </span>
        </div>
      );
    } else if (col.id === 'employeeName') {
      return (
        <div className="flex items-center">
          <User className="h-4 w-4 text-slate-400 dark:text-slate-500 mr-2" />
          <span className="font-medium text-text-primary dark:text-slate-200">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'department') {
      return (
        <div className="flex items-center">
          <span className="font-medium text-text-primary dark:text-slate-200">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'project') {
      return (
        <div className="flex items-center">
          <span className="font-medium text-text-primary dark:text-slate-200">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'uploadDate') {
      return (
        <div className="flex items-center text-text-secondary dark:text-slate-300 font-medium">
          <Calendar className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
          <span>{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'status') {
      return (
        <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-bold rounded-full ${
          (value === 'Completed' || value === 'Success') 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
        }`}>
          {value || 'Completed'}
        </span>
      );
    }
    return value || '-';
  };

  // ==========================================================================
  // FIXED: Open file directly - Added API fallback and selection logic
  // ==========================================================================
  const openFileDirectly = async (trackerId) => {
    console.log('Opening file directly:', trackerId);

    const tracker = trackers.find(t => t.upload_id === trackerId || t.id === trackerId);
    if (!tracker) {
      showNotification('File not found', 'error');
      return;
    }

    loadingFileIdRef.current = trackerId;

    setFetchingData(true);
    try {
      console.log('Fetching file data from API...');
      const response = await API.get(`/datasets/${trackerId}/excel-view`);
      if (response.data && response.data.fileData) {
        setSelectedFileContent(response.data.fileData);
        setSelectedFileTrackerInfo(tracker);
        setInitialFileLoaded(true);
        showNotification(`Opened file: ${getDisplayFileName(tracker.fileName, tracker.project)}`);
      } else {
        showNotification('File data not found on server.', 'error');
      }
    } catch (error) {
      console.error('Error fetching file data from API:', error);
      showNotification('Error loading file data from server', 'error');
    } finally {
      setFetchingData(false);
      if (loadingFileIdRef.current === trackerId) {
        loadingFileIdRef.current = null;
      }
    }
  };

  // ==========================================================================
  // FIXED: Check if we should show file content - Improved logic
  // ==========================================================================
  const shouldShowFileContent = selectedFileContent !== null && initialFileLoaded;

  const getDepartmentOptions = () => {
    if (uploadForm.project) {
      const selectedProj = projectList.find(p => p.name === uploadForm.project);
      if (selectedProj && selectedProj.department) {
        return [selectedProj.department];
      }
    }
    return [...new Set(employeeList.map(e => e.department).filter(Boolean))];
  };

  const getEmployeeOptions = () => {
    if (uploadForm.project) {
      const selectedProj = projectList.find(p => p.name === uploadForm.project);
      if (selectedProj) {
        const relatedEmps = new Set();
        if (selectedProj.project_manager) relatedEmps.add(selectedProj.project_manager);
        if (selectedProj.employee_name) relatedEmps.add(selectedProj.employee_name);
        if (selectedProj.assigned_to_name) {
          selectedProj.assigned_to_name.split(',').forEach(e => relatedEmps.add(e.trim()));
        }
        if (relatedEmps.size > 0) {
          return [...relatedEmps].filter(Boolean);
        }
      }
    }
    return employeeList.map(e => e.name);
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-0 relative">
      {/* Loading Overlay */}
      {fetchingData && (
        <div className="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[4px] z-[100] flex items-center justify-center">
          <div className="bg-app-surface dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-border dark:border-slate-800 flex flex-col items-center">
            <RefreshCw className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-text-primary dark:text-slate-100">Fetching File Data...</p>
            <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Downloading content from server</p>
          </div>
        </div>
      )}


      {/* Delete Tracker Modal */}
      {showDeletePrompt && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Confirm Delete</h3>
              <button onClick={cancelDelete} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body">
              <p className="text-sm text-text-secondary dark:text-slate-350">Delete upload record <span className="font-bold text-text-primary dark:text-white underline">{showDeletePrompt.name}</span>?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic font-medium">This action cannot be undone.</p>
            </div>
            <div className="app-modal-footer">
              <button onClick={cancelDelete} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">Cancel</button>
              <button onClick={confirmDeleteTracker} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all">Delete Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Prompt */}
      {showBulkDeletePrompt.show && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Confirm Bulk Delete</h3>
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body">
              <p className="text-sm text-text-secondary dark:text-slate-350">
                Are you sure you want to delete <span className="font-bold text-text-primary dark:text-white underline">{showBulkDeletePrompt.count}</span> selected upload{showBulkDeletePrompt.count > 1 ? 's' : ''}?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 italic font-medium">This action cannot be undone.</p>
            </div>
            <div className="app-modal-footer">
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">Cancel</button>
              <button onClick={confirmBulkDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all">Bulk Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Confirmation Prompt */}
      {showExportConfirmPrompt?.show && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Confirm Export</h3>
              <button onClick={() => setShowExportConfirmPrompt(null)} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="app-modal-body">
              <p className="text-sm text-text-secondary dark:text-slate-350">
                Export {showExportConfirmPrompt.count} upload{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
              </p>
            </div>
            <div className="app-modal-footer">
              <button onClick={() => setShowExportConfirmPrompt(null)} className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-200">Cancel</button>
              <button onClick={() => {
                handleExport(showExportConfirmPrompt.format);
                setShowExportConfirmPrompt(null);
              }} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-all shadow-md active:scale-95">Export</button>
            </div>
          </div>
        </div>
      )}



      {/* Upload Form Modal */}
      {showUploadModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Upload Details</h3>
              <button onClick={() => setShowUploadModal(false)} className="app-modal-close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="app-modal-body space-y-4">
              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-slate-300 mb-1">Project *</label>
                {isAdmin ? (
                  <SearchableDropdown
                    options={projectList.map(p => p.name)}
                    value={uploadForm.project}
                    onChange={(val) => {
                      const selectedProj = projectList.find(p => p.name === val);
                      let newDept = uploadForm.department;
                      let newEmp = uploadForm.employeeName;
                      
                      if (selectedProj) {
                        newDept = selectedProj.department || newDept;
                        
                        const relatedEmps = new Set();
                        if (selectedProj.project_manager) relatedEmps.add(selectedProj.project_manager);
                        if (selectedProj.employee_name) relatedEmps.add(selectedProj.employee_name);
                        if (selectedProj.assigned_to_name) {
                          selectedProj.assigned_to_name.split(',').forEach(e => relatedEmps.add(e.trim()));
                        }
                        
                        const empsArray = [...relatedEmps].filter(Boolean);
                        if (empsArray.length > 0 && !empsArray.includes(newEmp)) {
                          newEmp = empsArray[0];
                        }
                      }
                      
                      setUploadForm({ ...uploadForm, project: val, department: newDept, employeeName: newEmp });
                      if (uploadFormErrors.project) setUploadFormErrors({ ...uploadFormErrors, project: '' });
                    }}
                    placeholder="Select project"
                  />
                ) : (
                  <SearchableDropdown
                    options={projectList
                      .filter(p => p.project_manager === getCurrentUser() || p.employee_name === getCurrentUser() || p.assigned_to_name === getCurrentUser())
                      .map(p => p.name)
                    }
                    value={uploadForm.project}
                    onChange={(val) => {
                      setUploadForm({ ...uploadForm, project: val });
                      if (uploadFormErrors.project) setUploadFormErrors({ ...uploadFormErrors, project: '' });
                    }}
                    placeholder={uploadForm.project ? uploadForm.project : "Select assigned project"}
                  />
                )}
                {uploadFormErrors.project && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-slate-300 mb-1">Department *</label>
                {isAdmin ? (
                  <SearchableDropdown
                    options={getDepartmentOptions()}
                    value={uploadForm.department}
                    onChange={(val) => {
                      setUploadForm({ ...uploadForm, department: val });
                      if (uploadFormErrors.department) setUploadFormErrors({ ...uploadFormErrors, department: '' });
                    }}
                    placeholder="Select department"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-text-secondary dark:text-slate-300 text-sm">
                    {uploadForm.department || 'No Department'}
                  </div>
                )}
                {uploadFormErrors.department && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.department}</p>}
              </div>

              {/* Employee Name */}
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-slate-300 mb-1">Employee Name *</label>
                {isAdmin ? (
                  <SearchableDropdown
                    options={getEmployeeOptions()}
                    value={uploadForm.employeeName}
                    onChange={(val) => {
                      setUploadForm({ ...uploadForm, employeeName: val });
                      if (uploadFormErrors.employeeName) setUploadFormErrors({ ...uploadFormErrors, employeeName: '' });
                    }}
                    placeholder="Select employee name"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border border-border dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-text-secondary dark:text-slate-300 text-sm">
                    {uploadForm.employeeName || 'Unknown User'}
                  </div>
                )}
                {uploadFormErrors.employeeName && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.employeeName}</p>}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-medium text-text-secondary dark:text-slate-300 mb-1">File *</label>
                <div className="border-2 border-dashed border-border dark:border-slate-700 rounded-lg p-4 hover:border-slate-400 dark:hover:border-slate-500 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleModalFileSelect}
                      accept=".xlsx,.xls"
                    />
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-text-secondary dark:text-slate-300 mb-1">
                        {uploadForm.file ? getDisplayFileName(uploadForm.file.name) : 'Click to select file'}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-slate-500">Supports: Excel (.xlsx, .xls) (Max 50MB)</p>
                      <p className="text-xs font-semibold text-blue-600 mt-2 italic">Please ensure Department name and file name are exact</p>
                    </div>
                  </label>
                </div>
                {uploadFormErrors.file && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.file}</p>}
              </div>
            </div>

            <div className="app-modal-footer">
              <button onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 text-xs sm:text-sm border border-border dark:border-slate-700 rounded text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleUploadSubmit} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium">Upload File</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Viewer Modal - FIXED to pass headers and data at root level */}
      {excelViewerData && (
        <div className="app-modal-overlay">
          <div className="bg-app-surface dark:bg-slate-900 rounded-lg w-full max-w-7xl h-[95vh] flex flex-col border border-border dark:border-slate-800 shadow-2xl overflow-hidden m-4">
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              <FileContentViewer
                fileData={excelViewerData.fileData || {
                  headers: excelHeaders,
                  data: excelEditData,
                  sheets: [{
                    headers: excelHeaders,
                    data: excelEditData
                  }]
                }}
                trackerInfo={excelViewerData}
                onBack={() => {
                  closeExcelViewer();
                  // Also clear the file selection
                  setSelectedFileContent(null);
                  setSelectedFileTrackerInfo(null);
                  if (onClearSelection) {
                    onClearSelection();
                  }
                }}
                viewOnly={true}
                context="upload"
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {shouldShowFileContent ? (
        <FileContentViewer
          key={selectedFileTrackerInfo?.id || selectedFileId || 'none'}
          fileData={selectedFileContent}
          trackerInfo={selectedFileTrackerInfo}
          onBack={() => {
            // ==========================================================================
            // FIXED: Proper back navigation - Reset all states
            // ==========================================================================
            console.log('Back button clicked - navigating to parent module');

            // Clear local state
            setSelectedFileContent(null);
            setSelectedFileTrackerInfo(null);
            setInitialFileLoaded(false); // ← CRITICAL: Reset the flag

            // Update URL without file parameter via React Router (triggers re-render)
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.delete('file');
              return next;
            });

            // Call onClearSelection to notify parent Dashboard
            if (onClearSelection) {
              onClearSelection(); // This sets selectedUploadFileId to null in Dashboard
            }

            // Dispatch event as backup
            window.dispatchEvent(new CustomEvent('returnToDashboard', {
              detail: { from: 'uploadTrackers' }
            }));

            console.log('Back navigation complete - should show table view');
          }}
          onSaveData={(updatedData) => handleSaveFileData(selectedFileTrackerInfo?.upload_id || selectedFileId, updatedData)}
          viewOnly={!isAdmin}
          context="upload"
        />
      ) : (
        /* Original Upload Trackers content */
        <>
          {/* UPLOAD AREA */}
          <PermissionGuard permission="upload_tracker">
            <div className="bg-app-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded p-4 sm:p-6 shadow-sm">
              <div className="text-center">
                <div
                  className="border-2 border-dashed border-border dark:border-slate-700 rounded-xl p-4 sm:p-8 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors bg-slate-50/30 dark:bg-slate-800/30"
                  onClick={openUploadModal}
                >
                  <div className="space-y-2 sm:space-y-3">
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 dark:text-slate-500 mx-auto" />
                    <div>
                      <p className="font-medium text-sm sm:text-base text-text-primary dark:text-slate-100">Drag & drop files or click to browse</p>
                      <p className="text-xs text-text-muted dark:text-slate-500">Supports: Excel (.xlsx, .xls) (Max 50MB)</p>
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-text-primary dark:text-slate-200">{getDisplayFileName(selectedFile.name)}</span>
                      </div>
                      <span className="text-xs text-text-secondary dark:text-slate-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 sm:mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium text-text-primary dark:text-slate-100">Uploading...</span>
                      <span className="text-xs sm:text-sm text-text-secondary dark:text-slate-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </PermissionGuard>

          {/* MAIN BORDER CONTAINER */}
          <PermissionGuard permission="view_tracker">
            <div className="bg-app-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded mx-0 shadow-sm">

              {/* TOOLBAR SECTION */}
              <div className="p-4 border-b border-border dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  {/* LEFT SIDE - Search */}
                  <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-2 items-start sm:items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-48 group">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search trackers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm border border-border dark:border-slate-700 bg-app-surface dark:bg-slate-800 text-text-primary dark:text-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
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

                  {/* RIGHT SIDE - Filter and Export */}
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    {/* Date Filter */}
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-10 pl-9 pr-3 text-xs sm:text-sm border border-border dark:border-slate-700 bg-app-surface dark:bg-slate-800 text-text-primary dark:text-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 w-full sm:w-40 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                      />
                      {dateFilter && (
                        <button
                          onClick={() => setDateFilter('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>

                    {/* Department Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Filter by department..."
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="h-10 pl-9 pr-3 text-xs sm:text-sm border border-border dark:border-slate-700 bg-app-surface dark:bg-slate-800 text-text-primary dark:text-slate-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500 w-full sm:w-48 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                      {departmentFilter && (
                        <button
                          onClick={() => setDepartmentFilter('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>

                    {/* Export Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-border dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-text-primary dark:text-slate-200"
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
                          <div className="absolute right-0 mt-1 w-48 bg-app-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded shadow-lg z-50 overflow-hidden">
                            <button
                              onClick={() => handleExportClick('excel')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Export as Excel
                            </button>
                            <button
                              onClick={() => handleExportClick('csv')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Export as CSV
                            </button>
                            <button
                              onClick={() => handleExportClick('json')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Export as JSON
                            </button>
                            <button
                              onClick={() => handleExportClick('pdf')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-text-primary dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Export as PDF
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE SECTION */}
              <div className="overflow-auto max-h-[calc(100vh-300px)] bg-app-surface dark:bg-slate-900 rounded-lg shadow-sm border border-border dark:border-slate-800">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 z-10">
                    <tr className="border-b border-border dark:border-slate-700 shadow-sm">
                      {/* Checkbox column */}
                      <th className="text-left py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap w-12 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          >
                            {selectAll ? (
                              <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </th>
                      {visibleColumns.map(col => (
                        <th
                          key={col.id}
                          className="text-left py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap"
                          onClick={() => col.sortable && handleSort(col.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="uppercase tracking-wider text-[10px] font-bold">{col.label}</span>
                            {col.sortable && getSortIcon(col.id)}
                          </div>
                        </th>
                      ))}
                      <th className="text-left py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-slate-800/50">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors border-b border-border dark:border-slate-800"
                        >
                          {/* Checkbox cell */}
                          <td className="py-3 px-4 whitespace-nowrap w-10">
                            <div className="flex items-center justify-center">
                              <Skeleton className="h-4 w-4 rounded" />
                            </div>
                          </td>
                          {visibleColumns.map((col, cIdx) => {
                            const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16'];
                            const widthClass = widths[(rIdx + cIdx) % widths.length];
                            if (col.id === 'status') {
                              return (
                                <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </td>
                              );
                            }
                            return (
                              <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                                <Skeleton className={`h-4 ${widthClass}`} />
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 whitespace-nowrap text-left w-20">
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-6 w-6 rounded-full" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : paginatedTrackers.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length + 2} className="py-12 text-center text-text-secondary dark:text-slate-400 font-medium">
                          No trackers found.
                        </td>
                      </tr>
                    ) : (
                      paginatedTrackers.map((tracker) => (
                        <tr
                          key={tracker.upload_id}
                          className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors border-b border-border dark:border-slate-800 ${selectedTrackers.includes(tracker.upload_id) ? 'bg-blue-50 dark:bg-blue-900/30' : 'even:bg-slate-50/30 dark:even:bg-slate-800/30'
                            }`}
                        >
                          {/* Checkbox cell */}
                          <td className="py-3 px-4 whitespace-nowrap w-10">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedTrackers.includes(tracker.upload_id)}
                                onChange={() => toggleTrackerSelection(tracker.upload_id)}
                                className="h-4 w-4 text-blue-600 border-border dark:border-slate-600 rounded focus:ring-blue-500 bg-app-surface dark:bg-slate-800"
                              />
                            </div>
                          </td>
                          {visibleColumns.map(col => (
                            <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                              <div className="text-text-primary dark:text-slate-200">
                                {renderCellContent(col, tracker[col.id], tracker)}
                              </div>
                            </td>
                          ))}
                          <td className="py-3 px-4 whitespace-nowrap text-left">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  dispatch(setSelectedUploadFileId(tracker.upload_id));
                                  setSearchParams(prev => {
                                    const next = new URLSearchParams(prev);
                                    next.set('file', String(tracker.upload_id));
                                    return next;
                                  });
                                }}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                title="View File"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <PermissionGuard permission="delete_tracker">
                                <button
                                  onClick={() => showDeleteConfirmation(tracker.upload_id, getDisplayFileName(tracker.fileName, tracker.project))}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER SECTION */}
              <div className="px-4 py-3 border-t border-border dark:border-slate-800 text-xs text-text-primary dark:text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-app-surface dark:bg-slate-900">
                {/* LEFT SIDE - Upload and Action Buttons */}
                <div className="flex items-center gap-2">
                  <PermissionGuard permission="upload_tracker">
                    <button
                      onClick={openUploadModal}
                      className="flex items-center gap-1 h-10 px-3 text-xs border border-border dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-text-primary dark:text-slate-200 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </PermissionGuard>

                  {/* Delete button only */}
                  {selectedTrackers.length > 0 && (
                    <div className="flex items-center gap-1 ml-1">
                      <PermissionGuard permission="delete_tracker">
                        <button
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-border dark:border-slate-700 rounded hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 text-text-primary dark:text-slate-200 transition-colors"
                          title={selectedTrackers.length === 1 ? "Delete selected upload" : "Delete selected uploads"}
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedTrackers.length > 1 && <span>Delete ({selectedTrackers.length})</span>}
                        </button>
                      </PermissionGuard>
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE - Pagination & Info */}
                <div className="flex items-center gap-4">
                  {/* Page Size Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary dark:text-slate-400 font-medium">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-border dark:border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-app-surface dark:bg-slate-800 text-text-primary dark:text-slate-200"
                    >
                      {[5, 10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary dark:text-slate-400"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-text-secondary dark:text-slate-300 mx-2 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-text-secondary dark:text-slate-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-text-secondary dark:text-slate-400 font-medium">
                    Showing <span className="text-text-primary dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-text-primary dark:text-slate-200">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="text-text-primary dark:text-slate-200">{totalItems}</span> uploads
                  </span>
                  {selectedTrackers.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {selectedTrackers.length} selected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </PermissionGuard>
        </>
      )}
    </div>
  );
};

export default UploadTrackers;
