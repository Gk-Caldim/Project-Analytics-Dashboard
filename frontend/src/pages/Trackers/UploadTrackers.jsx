import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import FileContentViewer from './FileContentViewer';
import { getEmployees } from '../../utils/employeeApi';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';

// ============================================================================
// DUAL SIDEBAR MANAGER - Two Independent Hierarchies
// ============================================================================

const sidebarManager = {
  // ============== HIERARCHY 1: UPLOAD TRACKERS MODULE ==============
  // Purpose: For file management, tracking, and administrative view
  // Parent: UploadTrackers module in sidebar
  // Context: "management" - shows all uploaded files regardless of project

  loadUploadTrackerModules: () => {
    try {
      const saved = localStorage.getItem('upload_tracker_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading upload tracker modules:', error);
      return [];
    }
  },

  saveUploadTrackerModules: (modules) => {
    try {
      localStorage.setItem('upload_tracker_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving upload tracker modules:', error);
    }
  },

  createUploadTrackerProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `upload-project-${projectId}-${Date.now()}`,
      moduleId: `upload-project-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'upload-trackers', // Child of UploadTrackers module
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}`,
      isExpanded: false,
      submodules: [],
      stats: {
        fileCount: 0,
        lastUpload: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createUploadTrackerFile: (fileName, trackerId, projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Robust prefix stripping
    let cleanedName = fileName;
    if (projectName) {
      const prefixUnderscore = projectName.replace(/\s+/g, '_') + '_';
      if (cleanedName.toLowerCase().startsWith(prefixUnderscore.toLowerCase())) {
        cleanedName = cleanedName.substring(prefixUnderscore.length);
      } else {
        const prefixSpace = projectName + '_';
        if (cleanedName.toLowerCase().startsWith(prefixSpace.toLowerCase())) {
          cleanedName = cleanedName.substring(prefixSpace.length);
        }
      }
    }

    return {
      id: `upload-file-${trackerId}`,
      moduleId: `upload-file-${trackerId}`,
      name: fileName,
      displayName: cleanedName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `upload-project-${projectId}`,
      trackerId: trackerId,
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'upload',
        department: null, // Will be populated
        employeeName: null, // Will be populated
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString()
      }
    };
  },

  addToUploadTrackers: (projectName, fileName, trackerId, metadata = {}) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Find or create project in upload trackers
    let projectModule = modules.find(m =>
      m.moduleId === `upload-project-${projectId}` &&
      m.context === 'upload-management'
    );

    if (!projectModule) {
      projectModule = sidebarManager.createUploadTrackerProject(projectName);
      modules.push(projectModule);
    }

    // Check if file already exists in this context
    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'upload-management'
    );

    if (!existingFile) {
      const fileModule = sidebarManager.createUploadTrackerFile(fileName, trackerId, projectName);

      // Add metadata
      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null,
        employeeName: metadata.employeeName || null
      };

      projectModule.submodules.push(fileModule);

      // Update project stats
      projectModule.stats.fileCount = projectModule.submodules.length;
      projectModule.stats.lastUpload = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();

      // Sort files by date (newest first)
      projectModule.submodules.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      sidebarManager.saveUploadTrackerModules(modules);

      // Dispatch context-specific event
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'upload-management' }
      }));
    }

    return modules;
  },

  removeFromUploadTrackers: (trackerId) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'upload-management'
      );

      if (fileIndex !== -1) {
        projectModule.submodules.splice(fileIndex, 1);
        projectModule.stats.fileCount = projectModule.submodules.length;
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        // Remove empty projects
        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        sidebarManager.saveUploadTrackerModules(modules);

        window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
          detail: { type: 'delete', trackerId, context: 'upload-management' }
        }));

        break;
      }
    }

    return removed;
  },

  // ============== HIERARCHY 2: PROJECT DASHBOARD MODULE ==============
  // Purpose: For project-based organization and team collaboration
  // Parent: Direct child of Project Dashboard (root level)
  // Context: "project-dashboard" - shows files organized by project only

  loadProjectDashboardModules: () => {
    try {
      const saved = localStorage.getItem('project_dashboard_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading project dashboard modules:', error);
      return [];
    }
  },

  saveProjectDashboardModules: (modules) => {
    try {
      localStorage.setItem('project_dashboard_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving project dashboard modules:', error);
    }
  },

  createProjectDashboardProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-dashboard-${projectId}-${Date.now()}`,
      moduleId: `project-dashboard-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'projects-root', // Direct child of Project Dashboard
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}`,
      isExpanded: false,
      submodules: [],
      projectStats: {
        totalFiles: 0,
        contributors: [],
        lastActivity: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createProjectDashboardFile: (fileName, trackerId, projectName, employeeName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-file-${trackerId}`,
      moduleId: `project-file-${trackerId}`,
      name: fileName,
      displayName: (projectName && fileName.startsWith(projectName + "_"))
        ? fileName.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
        : fileName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `project-dashboard-${projectId}`,
      trackerId: trackerId,
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      owner: employeeName,
      contributors: [employeeName],
      metadata: {
        source: 'project',
        uploadedBy: employeeName,
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString(),
        version: 1,
        lastModifiedBy: employeeName
      }
    };
  },

  addToProjectDashboard: (projectName, fileName, trackerId, employeeName, metadata = {}) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Find or create project in project dashboard
    let projectModule = modules.find(m =>
      m.moduleId === `project-dashboard-${projectId}` &&
      m.context === 'project-dashboard'
    );

    if (!projectModule) {
      projectModule = sidebarManager.createProjectDashboardProject(projectName);
      modules.push(projectModule);
    }

    // Check if file already exists in this context
    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'project-dashboard'
    );

    if (!existingFile) {
      const fileModule = sidebarManager.createProjectDashboardFile(
        fileName,
        trackerId,
        projectName,
        employeeName
      );

      // Add additional metadata
      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null
      };

      // Add to contributors if new
      if (!projectModule.projectStats.contributors.includes(employeeName)) {
        projectModule.projectStats.contributors.push(employeeName);
      }

      projectModule.submodules.push(fileModule);

      // Update project stats
      projectModule.projectStats.totalFiles = projectModule.submodules.length;
      projectModule.projectStats.lastActivity = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();

      // Sort files by date
      projectModule.submodules.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      sidebarManager.saveProjectDashboardModules(modules);

      // Dispatch context-specific event
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'project-dashboard' }
      }));
    }

    return modules;
  },

  removeFromProjectDashboard: (trackerId) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'project-dashboard'
      );

      if (fileIndex !== -1) {
        const removedFile = projectModule.submodules[fileIndex];
        projectModule.submodules.splice(fileIndex, 1);
        projectModule.projectStats.totalFiles = projectModule.submodules.length;
        projectModule.projectStats.lastActivity = new Date().toISOString();
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        // Remove empty projects
        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        sidebarManager.saveProjectDashboardModules(modules);

        window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
          detail: { type: 'delete', trackerId, context: 'project-dashboard' }
        }));

        break;
      }
    }

    return removed;
  },

  // ============== UPDATE OPERATIONS FOR BOTH CONTEXTS ==============

  updateProjectNameInUploadTrackers: (oldProjectName, newProjectName, trackerId) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `upload-project-${oldProjectId}` &&
      m.context === 'upload-management'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `upload-project-${newProjectId}`;
      projectModule.path = `/upload-trackers/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `upload-project-${newProjectId}`;
          file.path = `/upload-trackers/${newProjectId}/${file.trackerId}`;
        }
      });

      sidebarManager.saveUploadTrackerModules(modules);
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    }
  },

  updateProjectNameInProjectDashboard: (oldProjectName, newProjectName, trackerId) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `project-dashboard-${oldProjectId}` &&
      m.context === 'project-dashboard'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `project-dashboard-${newProjectId}`;
      projectModule.path = `/projects/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `project-dashboard-${newProjectId}`;
          file.path = `/projects/${newProjectId}/${file.trackerId}`;
        }
      });

      sidebarManager.saveProjectDashboardModules(modules);
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    }
  },

  // ============== DELETE FROM BOTH CONTEXTS ==============

  deleteFileFromAllContexts: (trackerId) => {
    const removedFromUpload = sidebarManager.removeFromUploadTrackers(trackerId);
    const removedFromProject = sidebarManager.removeFromProjectDashboard(trackerId);

    return { removedFromUpload, removedFromProject };
  },

  // ============== REPAIR FUNCTIONS ==============

  repairAllModules: () => {
    try {
      // Repair Upload Tracker modules
      const uploadModules = sidebarManager.loadUploadTrackerModules();
      const savedTrackers = localStorage.getItem('upload_trackers');
      const trackers = savedTrackers ? JSON.parse(savedTrackers) : [];
      let uploadModified = false;

      uploadModules.forEach(project => {
        const projectName = project.name;
        if (project.submodules) {
          project.submodules.forEach(file => {
            // Force correct displayName (strip project prefix)
            const correctDisplayName = (projectName && file.name.startsWith(projectName + "_"))
              ? file.name.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
              : file.name.replace(/\.[^/.]+$/, "");

            if (file.displayName !== correctDisplayName) {
              file.displayName = correctDisplayName;
              uploadModified = true;
            }

            const tracker = trackers.find(t => t.id === file.trackerId);
            if (tracker && (!file.metadata?.employeeName)) {
              if (!file.metadata) file.metadata = {};
              file.metadata.employeeName = tracker.employeeName;
              uploadModified = true;
            }
          });
        }
      });

      if (uploadModified) {
        sidebarManager.saveUploadTrackerModules(uploadModules);
      }

      // Repair Project Dashboard modules
      const projectModules = sidebarManager.loadProjectDashboardModules();
      let projectModified = false;

      projectModules.forEach(project => {
        const projectName = project.name;
        if (project.submodules) {
          project.submodules.forEach(file => {
            // Force correct displayName (strip project prefix)
            const correctDisplayName = (projectName && file.name.startsWith(projectName + "_"))
              ? file.name.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
              : file.name.replace(/\.[^/.]+$/, "");

            if (file.displayName !== correctDisplayName) {
              file.displayName = correctDisplayName;
              projectModified = true;
            }

            const tracker = trackers.find(t => t.id === file.trackerId);

          });
        }
      });

      if (projectModified) {
        sidebarManager.saveProjectDashboardModules(projectModules);
      }

      // Dispatch both events
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

    } catch (error) {
      console.error('Error repairing modules:', error);
    }
  },

  // ============== GETTERS FOR DIFFERENT CONTEXTS ==============

  getUploadTrackerFiles: () => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({
          ...file,
          projectName: project.name,
          projectId: project.moduleId
        });
      });
    });
    return files;
  },

  getProjectDashboardFiles: () => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({
          ...file,
          projectName: project.name,
          projectId: project.moduleId
        });
      });
    });
    return files;
  },

  // ============== CLEAR ALL DATA ==============

  clearAllData: () => {
    localStorage.removeItem('upload_tracker_modules');
    localStorage.removeItem('project_dashboard_modules');
    window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
  }
};

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
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Add New Column</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className={`w-full px-3 py-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'
              }`}
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
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
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Confirm Delete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">{message}</p>
          <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
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
  const selectedFileId = useSelector(state => state.nav.selectedUploadFileId);
  const onClearSelection = () => dispatch(setSelectedUploadFileId(null));
  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      return user.name || user.username || 'Unknown User';
    }
    return sessionStorage.getItem('username') || 'Demo User';
  };

  // Initial columns configuration
  const initialColumns = [
    { id: 'project', label: 'Project Name', sortable: true, type: 'text', required: true, visible: true },

    { id: 'employeeName', label: 'Employee Name', sortable: true, type: 'text', required: true, visible: true },
    { id: 'fileName', label: 'Tracker Name', sortable: true, type: 'text', required: true, visible: true },
  ];



  // Load columns
  const [availableColumns, setAvailableColumns] = useState(initialColumns);

  // Load trackers from API
  const [trackers, setTrackers] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [projectList, setProjectList] = useState([]);

  useEffect(() => {
    const fetchTrackers = async () => {
      try {
        const response = await API.get('/uploads');
        setTrackers(response.data);
      } catch (error) {
        console.error('Error fetching trackers from API:', error);
        showNotification('Failed to load upload history', 'error');
      }
    };

    const fetchProjects = async () => {
      try {
        const response = await API.get('/projects/');
        setProjectList(response.data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await getEmployees();
        setEmployeeList(response.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchTrackers();
    fetchProjects();
    fetchEmployees();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

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

  // Store uploaded file data
  const [uploadedFilesData, setUploadedFilesData] = useState(() => {
    const savedData = localStorage.getItem('uploaded_files_data');
    return savedData ? JSON.parse(savedData) : {};
  });

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
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Handle URL parameters when component mounts or URL changes
  // Handle URL parameters when component mounts or URL changes
  useEffect(() => {
    const handleUrlNavigation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fileId = urlParams.get('file');

      if (fileId && !selectedFileId && !initialFileLoaded && trackers.length > 0) {
        const trackerId = parseInt(fileId, 10);
        await openFileDirectly(trackerId);
      }
    };

    // Small delay to ensure trackers are loaded
    const timer = setTimeout(() => {
      handleUrlNavigation();
    }, 100);

    return () => clearTimeout(timer);
  }, [trackers, selectedFileId, initialFileLoaded]);

  // Save trackers and file data to localStorage
  useEffect(() => {
    localStorage.setItem('upload_trackers', JSON.stringify(trackers));
    localStorage.setItem('uploaded_files_data', JSON.stringify(uploadedFilesData));
  }, [trackers, uploadedFilesData]);

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
    if (selectedFileId) {
      const tracker = trackers.find(t => t.id === selectedFileId);
      if (tracker) {
        setSelectedFileTrackerInfo(tracker);
      }

      const trackerId = parseInt(selectedFileId, 10);
      if (!initialFileLoaded || selectedFileTrackerInfo?.id !== trackerId) {
        openFileDirectly(trackerId);
      }
    } else {
      setSelectedFileContent(null);
      setSelectedFileTrackerInfo(null);
      setInitialFileLoaded(false); // ← ADDED - Reset when no file is selected
    }
  }, [selectedFileId, trackers, uploadedFilesData]);

  // Handle saving edited file data
  const handleSaveFileData = (trackerId, updatedFileData) => {
    setUploadedFilesData(prev => ({
      ...prev,
      [trackerId]: updatedFileData
    }));

    const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
    allFilesData[trackerId] = updatedFileData;
    localStorage.setItem('uploaded_files_data', JSON.stringify(allFilesData));

    showNotification('File changes saved successfully!');
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

    return matchesSearch && matchesDept;
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

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrackers([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = sortedTrackers.map(tracker => tracker.id);
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
        const allVisibleIds = sortedTrackers.map(tracker => tracker.id);
        if (newSelection.length === allVisibleIds.length) {
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
    let deletedCount = 0;
    let errors = [];

    // Show a temporary "Deleting..." notification if many files
    if (count > 2) {
      showNotification(`Deleting ${count} records...`, 'info');
    }

    try {
      // Process deletions in parallel
      await Promise.all(selectedTrackers.map(async (id) => {
        try {
          await API.delete(`/datasets/${id}`);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting tracker ${id}:`, err);
          errors.push(id);
        }
      }));

      // Update local state even if some failed (the ones that succeeded should be removed)
      // Filter out only the ones that were successfully deleted from the backend
      // But for simplicity in UX, if most succeeded we refresh everything

      const successfulIds = selectedTrackers.filter(id => !errors.includes(id));

      setTrackers(prev => prev.filter(tracker => !successfulIds.includes(tracker.id)));

      // Remove from uploaded files data and sidebar contexts
      const newFileData = { ...uploadedFilesData };
      successfulIds.forEach(id => {
        delete newFileData[id];
        sidebarManager.deleteFileFromAllContexts(id);
      });
      setUploadedFilesData(newFileData);

      // Clear selection for the ones we tried to delete
      setSelectedTrackers(errors);
      if (errors.length === 0) {
        setSelectAll(false);
        showNotification(`${count} upload${count > 1 ? 's' : ''} deleted successfully`);
      } else {
        showNotification(`Deleted ${deletedCount} records. ${errors.length} failed.`, 'warning');
      }

      setShowBulkDeletePrompt({ show: false, count: 0 });
    } catch (error) {
      console.error('Error in bulk delete process:', error);
      showNotification('An error occurred during deletion', 'error');
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
        await API.delete(`/datasets/${id}`);

        // Remove from trackers
        setTrackers(trackers.filter(tracker => tracker.id !== id));

        // Remove from uploaded files data if exists locally
        const newFileData = { ...uploadedFilesData };
        if (newFileData[id]) {
          delete newFileData[id];
          setUploadedFilesData(newFileData);
        }

        // Remove from BOTH sidebar contexts
        sidebarManager.deleteFileFromAllContexts(id);

        setShowDeletePrompt(null);
        showNotification('Upload record deleted successfully');
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
    setUploadForm({
      project: '',
      department: 'Design Release',
      employeeName: '',
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
      const allowedTypes = ['CSV', 'XLSX', 'XLS', 'JSON', 'TXT'];

      if (!allowedTypes.includes(fileType)) {
        setUploadFormErrors({ ...uploadFormErrors, file: 'Please upload CSV, Excel, or JSON files only' });
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
        headers: { 'Content-Type': 'multipart/form-data' },
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
      showNotification(`Error uploading file: ${error.response?.data?.detail || error.message}. Please try again.`, 'error');
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
          case 'CSV': return 'text-blue-600';
          case 'XLS':
          case 'XLSX': return 'text-green-600';
          case 'JSON': return 'text-purple-600';
          default: return 'text-gray-600';
        }
      };

      return (
        <div
          className="flex items-center cursor-pointer group/file"
          onClick={(e) => {
            e.stopPropagation();
            openFileDirectly(tracker.id);
          }}
        >
          <File className="h-4 w-4 text-gray-400 mr-2 group-hover/file:text-blue-500 transition-colors" />
          <span className={`font-medium ${getFileColor(tracker.fileType)} group-hover/file:text-blue-600 group-hover/file:underline transition-all`}>
            {getDisplayFileName(value, tracker.project) || '-'}
          </span>
        </div>
      );
    } else if (col.id === 'employeeName') {
      return (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-500 mr-1" />
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'department') {
      return (
        <div className="flex items-center">
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'project') {
      return (
        <div className="flex items-center">
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    }
    return value || '-';
  };

  // ==========================================================================
  // FIXED: Open file directly - Added API fallback and selection logic
  // ==========================================================================
  const openFileDirectly = async (trackerId) => {
    console.log('Opening file directly:', trackerId);

    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) {
      showNotification('File not found', 'error');
      return;
    }

    // Try to get from local state first
    let fileData = uploadedFilesData[trackerId];

    // If not in local state, try localStorage
    if (!fileData) {
      const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
      fileData = allFilesData[trackerId];
    }

    // If still not found, fetch from API
    if (!fileData) {
      setFetchingData(true);
      try {
        console.log('File data not found locally, fetching from API...');
        const response = await API.get(`/datasets/${trackerId}/excel-view`);
        if (response.data && response.data.fileData) {
          fileData = response.data.fileData;
          // Cache it locally
          setUploadedFilesData(prev => ({ ...prev, [trackerId]: fileData }));

          // Also persist to localStorage for better experience next time
          const allStoredData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
          allStoredData[trackerId] = fileData;
          localStorage.setItem('uploaded_files_data', JSON.stringify(allStoredData));
        }
      } catch (error) {
        console.error('Error fetching file data from API:', error);
        showNotification('Error loading file data from server', 'error');
      } finally {
        setFetchingData(false);
      }
    }

    if (fileData) {
      setSelectedFileContent(fileData);
      setSelectedFileTrackerInfo(tracker);
      setInitialFileLoaded(true);
      showNotification(`Opened file: ${getDisplayFileName(tracker.fileName, tracker.project)}`);
    } else {
      showNotification('File data not found. Please re-upload the file.', 'error');
    }
  };

  // ==========================================================================
  // FIXED: Check if we should show file content - Improved logic
  // ==========================================================================
  const shouldShowFileContent = selectedFileContent !== null && initialFileLoaded;

  return (
    <div className="space-y-3 sm:space-y-4 px-0 relative">
      {/* Loading Overlay */}
      {fetchingData && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Fetching File Data...</p>
            <p className="text-xs text-slate-500 mt-1">Downloading content from server</p>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
          <div className="flex items-center">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification({ show: false, message: '', type: '' })}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Tracker Modal */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Delete</h3>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">Delete upload record <span className="font-medium">{showDeletePrompt.name}</span>?</p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDeleteTracker} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Prompt */}
      {showBulkDeletePrompt.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Bulk Delete</h3>
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Are you sure you want to delete {showBulkDeletePrompt.count} selected upload{showBulkDeletePrompt.count > 1 ? 's' : ''}?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmBulkDelete} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Confirmation Prompt */}
      {showExportConfirmPrompt?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Export</h3>
              <button onClick={() => setShowExportConfirmPrompt(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Export {showExportConfirmPrompt.count} upload{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowExportConfirmPrompt(null)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                handleExport(showExportConfirmPrompt.format);
                setShowExportConfirmPrompt(null);
              }} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm sm:text-base">
                <span className="bg-gray-100 text-gray-900 px-2 py-1 rounded">
                  Upload Details
                </span>
              </h3>

              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Project */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Project *</label>
                <SearchableDropdown
                  options={projectList.map(p => p.name)}
                  value={uploadForm.project}
                  onChange={(val) => {
                    setUploadForm({ ...uploadForm, project: val });
                    if (uploadFormErrors.project) setUploadFormErrors({ ...uploadFormErrors, project: '' });
                  }}
                  placeholder="Select project"
                />
                {uploadFormErrors.project && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Department *</label>
                <SearchableDropdown
                  options={[...new Set(employeeList.map(e => e.department).filter(Boolean))]}
                  value={uploadForm.department}
                  onChange={(val) => {
                    setUploadForm({ ...uploadForm, department: val });
                    if (uploadFormErrors.department) setUploadFormErrors({ ...uploadFormErrors, department: '' });
                  }}
                  placeholder="Select department"
                />
                {uploadFormErrors.department && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.department}</p>}
              </div>

              {/* Employee Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
                <SearchableDropdown
                  options={employeeList.map(e => e.name)}
                  value={uploadForm.employeeName}
                  onChange={(val) => {
                    setUploadForm({ ...uploadForm, employeeName: val });
                    if (uploadFormErrors.employeeName) setUploadFormErrors({ ...uploadFormErrors, employeeName: '' });
                  }}
                  placeholder="Select employee name"
                />
                {uploadFormErrors.employeeName && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.employeeName}</p>}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleModalFileSelect}
                      accept=".csv,.xlsx,.xls,.json,.txt"
                    />
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {uploadForm.file ? getDisplayFileName(uploadForm.file.name) : 'Click to select file'}
                      </p>
                      <p className="text-xs text-gray-500">Supports: CSV, Excel, JSON, TXT (Max 50MB)</p>
                      <p className="text-xs font-semibold text-blue-600 mt-2 italic">Please ensure Department name and file name are exact</p>
                    </div>
                  </label>
                </div>
                {uploadFormErrors.file && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.file}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleUploadSubmit} className="px-3 py-1.5 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800">Upload File</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Viewer Modal - FIXED to pass headers and data at root level */}
      {excelViewerData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[95vh] flex flex-col">
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

            // Update URL without file parameter
            const url = new URL(window.location);
            url.searchParams.delete('file');
            window.history.pushState({}, '', url);

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
          onSaveData={null}
          viewOnly={true}
          context="upload"
        />
      ) : (
        /* Original Upload Trackers content */
        <>
          {/* UPLOAD AREA */}
          <PermissionGuard permission="upload_tracker">
            <div className="bg-white border border-gray-300 rounded p-4 sm:p-6">
              <div className="text-center">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={openUploadModal}
                >
                  <div className="space-y-2 sm:space-y-3">
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">Drag & drop files or click to browse</p>
                      <p className="text-xs text-gray-500">Supports: CSV, Excel, JSON, TXT (Max 50MB)</p>
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <File className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{getDisplayFileName(selectedFile.name)}</span>
                      </div>
                      <span className="text-xs text-gray-600">
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="mt-4 sm:mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium">Uploading...</span>
                      <span className="text-xs sm:text-sm text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
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
            <div className="bg-white border border-gray-300 rounded mx-0">

              {/* TOOLBAR SECTION */}
              <div className="p-4 border-b border-gray-300">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  {/* LEFT SIDE - Search */}
                  <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-2 items-start sm:items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-48 h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>

                  {/* RIGHT SIDE - Filter and Export */}
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    {/* Department Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter by department..."
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-48"
                      />
                      {departmentFilter && (
                        <button
                          onClick={() => setDepartmentFilter('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>

                    {/* Export Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
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
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-50">
                            <button
                              onClick={() => handleExportClick('excel')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Export as Excel
                            </button>
                            <button
                              onClick={() => handleExportClick('csv')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Export as CSV
                            </button>
                            <button
                              onClick={() => handleExportClick('json')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Export as JSON
                            </button>
                            <button
                              onClick={() => handleExportClick('pdf')}
                              className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
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
              <div className="overflow-auto max-h-[calc(100vh-300px)] bg-white rounded-lg shadow-sm border border-gray-200">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-slate-200">
                      {/* Checkbox column */}
                      <th className="text-left py-3.5 px-4 font-semibold text-slate-600 cursor-pointer whitespace-nowrap w-12 hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {selectAll ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </th>
                      {visibleColumns.map(col => (
                        <th
                          key={col.id}
                          className="text-left py-3.5 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors whitespace-nowrap"
                          onClick={() => col.sortable && handleSort(col.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="uppercase tracking-wider text-[10px]">{col.label}</span>
                            {col.sortable && getSortIcon(col.id)}
                          </div>
                        </th>
                      ))}
                      <th className="text-left py-3.5 px-4 font-semibold text-slate-600 whitespace-nowrap uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {sortedTrackers.map((tracker) => (
                      <tr
                        key={tracker.id}
                        className={`hover:bg-blue-50/50 transition-colors border-b border-gray-100 ${selectedTrackers.includes(tracker.id) ? 'bg-blue-50' : 'even:bg-gray-50/30'
                          }`}
                      >
                        {/* Checkbox cell */}
                        <td className="py-3 px-4 whitespace-nowrap w-10">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedTrackers.includes(tracker.id)}
                              onChange={() => toggleTrackerSelection(tracker.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        </td>
                        {visibleColumns.map(col => (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                            {renderCellContent(col, tracker[col.id], tracker)}
                          </td>
                        ))}
                        <td className="py-3 px-4 whitespace-nowrap text-left">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openFileDirectly(tracker.id)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                              title="View File"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <PermissionGuard permission="delete_tracker">
                              <button
                                onClick={() => showDeleteConfirmation(tracker.id, getDisplayFileName(tracker.fileName, tracker.project))}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER SECTION */}
              <div className="px-4 py-3 border-t border-gray-300 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white">
                {/* LEFT SIDE - Upload and Action Buttons */}
                <div className="flex items-center gap-2">
                  <PermissionGuard permission="upload_tracker">
                    <button
                      onClick={openUploadModal}
                      className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
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
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          title={selectedTrackers.length === 1 ? "Delete selected upload" : "Delete selected uploads"}
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedTrackers.length > 1 && <span>Delete ({selectedTrackers.length})</span>}
                        </button>
                      </PermissionGuard>
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE - Info */}
                <div className="flex items-center gap-4">
                  <span>
                    Showing {sortedTrackers.length} of {trackers.length} uploads
                    {departmentFilter && ` (Filtered by: ${departmentFilter})`}
                  </span>
                  {selectedTrackers.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
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