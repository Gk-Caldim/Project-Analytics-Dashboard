import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ReactDOM from 'react-dom';
import {
  setActiveModule,
  setExpandedModules,
  toggleModuleExpansion as toggleExpansion,
  setSelectedProjectFileId,
  setSelectedUploadFileId,
  setActiveProjectName,
  setSidebarCollapsed,
  setBranding
} from '../store/slices/navSlice';
import { logout } from '../store/slices/authSlice';
import {
  Layout as LayoutIcon, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter, ChevronUp, ChevronDown, ChevronLeft, Check, Save, Settings,
  Users, Shield, FolderKanban, Package, Building, Database, FileUp, LogOut, Menu, User as UserIcon, Bell, ChevronRight, Projector, FileText, Globe, Clock, BarChart3, PieChart, LineChart,
  MessageSquare, Layers, FolderTree, Calendar
} from 'lucide-react';

import API from "../utils/api";

// ============================================================================
// SIDEBAR MANAGER
// ============================================================================
const sidebarManager = {
  loadUploadTrackerModules: () => {
    try {
      const saved = localStorage.getItem('upload_tracker_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading upload tracker modules:', error);
      return [];
    }
  },

  loadProjectDashboardModules: () => {
    try {
      const saved = localStorage.getItem('project_dashboard_modules');
      const allModules = saved ? JSON.parse(saved) : [];
      return Array.isArray(allModules) ? allModules.filter(m => m && m.type === 'project' && m.context === 'project-dashboard') : [];
    } catch (error) {
      console.error('Error loading project dashboard modules:', error);
      return [];
    }
  }
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Get state from Redux
  const user = useSelector(state => state.auth.user);
  const {
    activeModule,
    expandedModules,
    selectedProjectFileId,
    selectedUploadFileId,
    activeProjectName,
    sidebarCollapsed,
    companyLogo,
    companyName
  } = useSelector(state => state.nav);

  // Fetch settings on mount
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await API.get('/settings/');
        const settings = response.data;
        const logo = settings.find(s => s.key === 'company_logo')?.value;
        const name = settings.find(s => s.key === 'company_name')?.value;
        dispatch(setBranding({ companyLogo: logo, companyName: name }));
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchCompanySettings();
  }, [dispatch]);

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Dynamic modules
  const [uploadTrackerModules, setUploadTrackerModules] = useState([]);
  const [projectDashboardModules, setProjectDashboardModules] = useState([]);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications] = useState(3);
  const [hoveredModule, setHoveredModule] = useState(null);

  const profileMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });

  // Masters submodules
  const mastersSubmodules = useMemo(() => [
    { id: 'employee-master', name: 'Employee Master', path: 'masters/employees', icon: <Users className="h-5 w-5" />, color: '#000000' },
    { id: 'project-master', name: 'Project Master', path: 'masters/project-master', icon: <FolderKanban className="h-5 w-5" />, color: '#333333' },
  ], []);

  const mastersModules = useMemo(() => [
    { id: 'masters-main', name: 'Masters', path: 'masters', icon: <Database className="h-5 w-5" /> },
  ], []);

  const uploadsSubmodules = useMemo(() => [
    { id: 'upload-trackers', name: 'Trackers Upload', path: 'trackers', icon: <FileUp className="h-5 w-5" /> },
    { id: 'budget-upload', name: 'Budget Upload', path: 'budget-upload', icon: <FileUp className="h-5 w-5" /> }
  ], []);
  const uploadsModules = useMemo(() => [
    { id: 'uploads-main', name: 'Uploads', path: 'trackers', icon: <FileUp className="h-5 w-5" /> }
  ], []);

  const otherModules = useMemo(() => [
    { id: 'system-settings', name: 'Settings', path: 'settings', icon: <Settings className="h-5 w-5" /> },
  ], []);


  // Permission check helper
  const hasPermission = (moduleName) => {
    if (user?.role === 'Admin') return true;
    if (!user?.permissions) return false;
    return user.permissions.includes(moduleName);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sidebarRef.current) {
        // Any specific cleanup
      }
    };
  }, []);

  // ==========================================================================
  // HELPER FUNCTION TO CAPITALIZE FIRST LETTER
  // ==========================================================================
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    let processed = string.replace(/tata\s+motors/ig, 'TATA');
    return processed.charAt(0).toUpperCase() + processed.slice(1);
  };

  // ==========================================================================
  // LOAD MODULES FROM API — sidebar source of truth
  // Uses /projects/all/structures which returns:
  //   { project_id, project_name, modules: [{module_name, milestones_count}], uploads: [...] }
  // modules[] is flat & deduplicated across all uploads on the server side.
  // ==========================================================================
  const loadDynamicModules = async () => {
    try {
      const { data: structures } = await API.get('/projects/all/structures');
      const { data: budgets } = await API.get('/budget/');

      const projectsWithBudget = new Set((budgets || []).map(b => capitalizeFirstLetter(b.project_name)));

      const dashProjectsMap = new Map();

      // Ensure projects with budget are in the map first (so they appear even without tracker data)
      projectsWithBudget.forEach(projectName => {
        const projectId = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (!dashProjectsMap.has(projectName)) {
          dashProjectsMap.set(projectName, {
            id: `project-dashboard-${projectId}`,
            moduleId: `project-dashboard-${projectId}`,
            name: projectName,
            projectName: projectName,
            dbProjectId: null,
            type: 'project',
            context: 'project-dashboard',
            isExpanded: false,
            submodules: []
          });
        }
      });

      // Parse structures to build the sidebar tree
      // PREFERRED PATH: use the flat top-level `modules` array (deduplicated, server-side)
      // FALLBACK: iterate upload.modules for compatibility with older API responses
      structures.forEach(struct => {
        const projectName = capitalizeFirstLetter(struct.project_name);
        const projectIdStr = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        if (!dashProjectsMap.has(projectName)) {
          dashProjectsMap.set(projectName, {
            id: `project-dashboard-${projectIdStr}`,
            moduleId: `project-dashboard-${projectIdStr}`,
            name: projectName,
            projectName: projectName,
            dbProjectId: struct.project_id,
            type: 'project',
            context: 'project-dashboard',
            isExpanded: false,
            submodules: []
          });
        }

        const dashProject = dashProjectsMap.get(projectName);
        dashProject.dbProjectId = struct.project_id;

        // Use flat top-level modules (deduplicated by server) when available
        const flatModules = Array.isArray(struct.modules) ? struct.modules : [];
        const moduleSet = new Set(dashProject.submodules.map(s => s.name));

        if (flatModules.length > 0) {
          // Preferred: use the server-deduplicated flat list
          flatModules.forEach(mod => {
            const modName = mod.module_name;
            if (modName && !moduleSet.has(modName)) {
              moduleSet.add(modName);
              dashProject.submodules.push({
                id: `module-${struct.project_id}-${modName}`,
                moduleId: `module-${struct.project_id}-${modName}`,
                dbProjectId: struct.project_id,
                name: modName,
                displayName: modName,
                milestones_count: mod.milestones_count,
                type: 'module',
                projectName: projectName,
                context: 'project-dashboard'
              });
            }
          });
        } else {
          // Fallback: iterate uploads to collect modules (older API)
          (struct.uploads || []).forEach(upload => {
            (upload.modules || []).forEach(mod => {
              const modName = mod.module_name;
              if (modName && !moduleSet.has(modName)) {
                moduleSet.add(modName);
                dashProject.submodules.push({
                  id: `module-${struct.project_id}-${modName}`,
                  moduleId: `module-${struct.project_id}-${modName}`,
                  dbProjectId: struct.project_id,
                  name: modName,
                  displayName: modName,
                  type: 'module',
                  projectName: projectName,
                  context: 'project-dashboard'
                });
              }
            });
          });
        }
      });

      // Add Budget Summary submodule for projects that have budget data
      for (const project of dashProjectsMap.values()) {
        const hasBudget = project.submodules.some(sub => sub.type === 'budget');
        if (!hasBudget && projectsWithBudget.has(project.name)) {
          project.submodules.push({
            id: `budget-${project.id}`,
            moduleId: `budget-${project.id}`,
            name: 'Budget Summary',
            displayName: 'Budget Summary',
            type: 'budget',
            projectName: project.projectName,
            context: 'project-dashboard'
          });
        }
      }

      const finalList = Array.from(dashProjectsMap.values());

      // Project Dashboard sidebar — shows projects with their modules from DB
      setProjectDashboardModules(finalList);

      // Upload Trackers sidebar — same tree (projects+modules)
      setUploadTrackerModules(finalList);
    } catch (error) {
      console.error('[Dashboard] Error loading dynamic modules from API:', error);
    }
  };


  useEffect(() => {
    loadDynamicModules();
  }, []);

  // Storage listeners
  useEffect(() => {
    const handleUploadTrackerUpdate = () => loadDynamicModules();
    const handleProjectDashboardUpdate = () => loadDynamicModules();
    const handleStorageChange = (e) => {
      if (e.key === 'upload_tracker_modules' || e.key === 'project_dashboard_modules') {
        loadDynamicModules();
      }
    };

    window.addEventListener('uploadTrackerUpdate', handleUploadTrackerUpdate);
    window.addEventListener('projectDashboardUpdate', handleProjectDashboardUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('uploadTrackerUpdate', handleUploadTrackerUpdate);
      window.removeEventListener('projectDashboardUpdate', handleProjectDashboardUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sync with URL on route changes
  useEffect(() => {
    const path = location.pathname;

    // First check masters submodules
    const mastersSub = mastersSubmodules.find(sub => path.includes(`/dashboard/${sub.path}`));
    if (mastersSub) {
      dispatch(setActiveModule(mastersSub.id));
      return;
    }

    // Then check uploads submodules
    const uploadsSub = uploadsSubmodules.find(sub => path.includes(`/dashboard/${sub.path}`));
    if (uploadsSub) {
      dispatch(setActiveModule(uploadsSub.id));
      return;
    }

    // Then check other specific submodules if any
    const otherSub = otherModules.find(sub => path.includes(`/dashboard/${sub.path}`));
    if (otherSub) {
      dispatch(setActiveModule(otherSub.id));
      return;
    }

    if (path.includes('/dashboard/projects')) dispatch(setActiveModule('project-dashboard'));
    else if (path.includes('/dashboard/trackers')) dispatch(setActiveModule('upload-trackers'));
    else if (path.includes('/dashboard/budget-summary')) {
      dispatch(setActiveModule('project-dashboard'));
      // Extract project name from path if possible to set selectedProjectFileId
      const pathParts = path.split('/');
      const projectName = decodeURIComponent(pathParts[pathParts.length - 1]);
      if (projectName) {
        const projectId = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        dispatch(setSelectedProjectFileId(`budget-project-dashboard-${projectId}`));
      }
    }
    else if (path.includes('/dashboard/masters')) dispatch(setActiveModule('masters-main'));
    else if (path.includes('/dashboard/mom')) dispatch(setActiveModule('mom-module'));
    else if (path.includes('/dashboard/meetings')) dispatch(setActiveModule('meetings'));
    else if (path.includes('/dashboard/schedule-meeting')) dispatch(setActiveModule('schedule-meeting'));
    else if (path.includes('/dashboard/settings')) dispatch(setActiveModule('system-settings'));
  }, [location.pathname, dispatch, mastersSubmodules, otherModules]);

  // DateTime
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update profile menu position when opened
  useEffect(() => {
    if (profileMenuOpen && profileMenuRef.current) {
      const rect = profileMenuRef.current.getBoundingClientRect();
      setProfileMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [profileMenuOpen]);

  // Handle window resize for profile menu
  useEffect(() => {
    const handleResize = () => {
      if (profileMenuOpen && profileMenuRef.current) {
        const rect = profileMenuRef.current.getBoundingClientRect();
        setProfileMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [profileMenuOpen]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  // Open master submodule
  useEffect(() => {
    const handleOpenMasterSubmodule = (event) => {
      const { masterModuleId } = event.detail;
      handleModuleClick(masterModuleId);
      dispatch(setExpandedModules({ 'masters': true }));
    };

    window.addEventListener('openMasterSubmodule', handleOpenMasterSubmodule);
    return () => window.removeEventListener('openMasterSubmodule', handleOpenMasterSubmodule);
  }, [dispatch]);

  // ==========================================================================
  // FIXED: Handle project dashboard file open events with better state management
  // ==========================================================================
  useEffect(() => {
    const handleOpenProjectDashboardFile = (event) => {
      const { trackerId, fileModule, projectName } = event.detail;

      // Set the selected file ID
      setSelectedProjectFileId(trackerId);

      // Ensure project dashboard is active
      if (activeModule !== 'project-dashboard') {
        setActiveModule('project-dashboard');
      }

      // Ensure project dashboard is expanded
      dispatch(setExpandedModules({ 'project-dashboard': true }));

      // Find and expand the parent project module
      if (fileModule && fileModule.projectName) {
        // Find the project in projectDashboardModules
        const project = projectDashboardModules.find(p =>
          p.name === fileModule.projectName ||
          p.projectName === fileModule.projectName
        );

        if (project) {
          const projectKey = project.id || project.projectId || project.name;
          dispatch(setExpandedModules({
            [`project-dashboard-${projectKey}`]: true
          }));
        }
      }
    };

    window.addEventListener('openProjectDashboardFile', handleOpenProjectDashboardFile);
    return () => window.removeEventListener('openProjectDashboardFile', handleOpenProjectDashboardFile);
  }, [activeModule, projectDashboardModules]);

  useEffect(() => {
    const handleOpenProjectDashboardMain = (event) => {
      const { projectId } = event.detail;
      const project = projectDashboardModules.find(p => p.id === projectId || p.name === projectId || p.projectId === projectId);
      if (project && project.name) {
        setActiveProjectName(project.name);
      } else {
        setActiveProjectName(projectId);
      }
    };

    const handleResetProjectDashboardMain = () => {
      dispatch(setActiveProjectName(null));
    };

    window.addEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
    window.addEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
      window.removeEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
    };
  }, [projectDashboardModules]);

  // ==========================================================================
  // FIXED: Effect to ensure project file selection persists
  // ==========================================================================
  useEffect(() => {
    // If we have a selected project file ID and we're on project dashboard,
    // ensure the parent module is expanded
    if (activeModule === 'project-dashboard' && selectedProjectFileId) {
      // Find which project contains this file
      for (const project of projectDashboardModules) {
        const file = project.submodules?.find(s => s.trackerId === selectedProjectFileId);
        if (file) {
          const projectKey = project.id || project.projectId || project.name;
          dispatch(setExpandedModules({
            'project-dashboard': true,
            [`project-dashboard-${projectKey}`]: true
          }));
          break;
        }
      }
    }
  }, [activeModule, selectedProjectFileId, projectDashboardModules, dispatch]);

  // Helper functions
  const getUserInitial = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.full_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getAvatarColor = () => {
    return 'bg-black';
  };

  const getActiveModuleName = () => {
    if (activeModule === 'project-dashboard') return 'Project Dashboard';
    if (activeModule === 'masters-main') return 'Masters';
    if (activeModule === 'mom-module') return 'Minutes of Meeting';
    if (activeModule === 'meetings') return 'Meetings Console';
    if (activeModule === 'schedule-meeting') return 'Schedule Meeting';

    const allModules = [...mastersModules, ...mastersSubmodules, ...uploadsModules, ...uploadsSubmodules, ...otherModules];
    const module = allModules.find(m => m.id === activeModule);
    return module ? module.name : 'Project Dashboard';
  };

  // ==========================================================================
  // FIXED: Get header title using context-specific selected file IDs
  // ==========================================================================
  const getHeaderTitle = () => {
    if (activeModule === 'upload-trackers' && selectedUploadFileId) {
      for (const proj of uploadTrackerModules) {
        const file = proj.submodules?.find(s => s.trackerId === selectedUploadFileId);
        if (file) {
          // Use displayName which is now cleaned in loadDynamicModules
          return file.displayName || capitalizeFirstLetter((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
        }
      }
      return 'Upload Trackers';
    }
    if (activeModule === 'project-dashboard' && selectedProjectFileId) {
      for (const proj of projectDashboardModules) {
        const file = proj.submodules?.find(s => s.trackerId === selectedProjectFileId);
        if (file) {
          // Use displayName which is now cleaned in loadDynamicModules
          return file.displayName || capitalizeFirstLetter((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
        }
      }
    }
    if (activeModule === 'project-dashboard' && activeProjectName) {
      return `${capitalizeFirstLetter(activeProjectName)} Dashboard`;
    }
    return getActiveModuleName();
  };

  // ==========================================================================
  // HANDLE MODULE CLICK - UPDATED to match Masters behavior
  // ==========================================================================
  const handleModuleClick = (moduleId) => {
    dispatch(setActiveModule(moduleId));

    // Build path
    let path = 'projects';
    const allModules = [...mastersModules, ...mastersSubmodules, ...uploadsModules, ...uploadsSubmodules, ...otherModules];
    const module = allModules.find(m => m.id === moduleId);
    if (module) path = module.path;
    else if (moduleId === 'mom-module') path = 'mom';
    else if (moduleId === 'meetings') path = 'meetings';
    else if (moduleId === 'schedule-meeting') path = 'schedule-meeting';

    navigate(`/dashboard/${path}`);

    if (moduleId !== 'project-dashboard') {
      dispatch(setSelectedProjectFileId(null));
    } else {
      dispatch(setSelectedProjectFileId(null));
      window.dispatchEvent(new CustomEvent('resetProjectDashboardMain'));
    }

    if (moduleId !== 'upload-trackers') {
      dispatch(setSelectedUploadFileId(null));
    }

    if (moduleId === 'project-dashboard') {
      if (projectDashboardModules.length > 0 && !expandedModules['project-dashboard']) {
        dispatch(setExpandedModules({ 'project-dashboard': true }));
      }
    } else if (moduleId === 'masters-main') {
      dispatch(toggleExpansion('masters'));
    } else if (moduleId === 'uploads-main') {
      dispatch(toggleExpansion('uploads'));
    } else if (moduleId === 'mom-module') {
      if (!expandedModules['mom']) {
        dispatch(setExpandedModules({ 'mom': true }));
      }
    } else if (moduleId === 'upload-trackers') {
      if (uploadTrackerModules.length > 0 && !expandedModules['upload-trackers']) {
        dispatch(setExpandedModules({ 'upload-trackers': true }));
      }
    }
  };

  // ==========================================================================
  // TOGGLE MODULE EXPANSION
  // ==========================================================================
  const toggleModuleExpansion = (moduleId, e) => {
    if (e) {
      e.stopPropagation();
    }
    dispatch(toggleExpansion(moduleId));
  };

  // ==========================================================================
  // FIXED: Use context-specific file click handlers
  // ==========================================================================
  const handleFileModuleClick = (fileModule) => {
    dispatch(setActiveModule('upload-trackers'));
    dispatch(setSelectedUploadFileId(fileModule.trackerId));
    navigate('/dashboard/trackers');
  };

  // ==========================================================================
  // FIXED: Enhanced project file click handler
  // ==========================================================================
  const handleProjectFileClick = (fileModule) => {
    // Set the project-specific selected file ID
    dispatch(setSelectedProjectFileId(fileModule.trackerId));

    // Ensure we're on project dashboard
    if (activeModule !== 'project-dashboard') {
      dispatch(setActiveModule('project-dashboard'));
    }

    // Ensure project dashboard is expanded
    dispatch(setExpandedModules({ 'project-dashboard': true }));

    // Also expand the parent project module
    if (fileModule.projectName) {
      const project = projectDashboardModules.find(p =>
        p.name === fileModule.projectName ||
        p.projectName === fileModule.projectName
      );

      if (project) {
        const projectKey = project.id || project.projectId || project.name;
        dispatch(setExpandedModules({
          [`project-dashboard-${projectKey}`]: true
        }));
      }
    }

    if (fileModule.type === 'budget') {
      navigate(`/dashboard/budget-summary/${encodeURIComponent(fileModule.projectName)}`);
    } else {
      navigate('/dashboard/projects');
    }

    // Dispatch event for ProjectDashboard to handle
    window.dispatchEvent(new CustomEvent('openProjectDashboardFile', {
      detail: {
        trackerId: fileModule.trackerId,
        fileModule: fileModule,
        projectName: fileModule.projectName || 'Unknown'
      }
    }));
  };

  // ==========================================================================
  // FIXED: Check selection based on context
  // ==========================================================================
  const isFileSelected = (fileModule, context) => {
    if (context === 'upload-trackers') {
      return selectedUploadFileId === fileModule.trackerId;
    } else if (context === 'project-dashboard') {
      return selectedProjectFileId === fileModule.trackerId;
    }
    return false;
  };

  // ==========================================================================
  // RENDER FUNCTIONS - ALL WITH WHITE TEXT ON BLUE BACKGROUND
  // ==========================================================================

  const renderProjectDashboardModule = () => {
    if (!hasPermission('Dashboard')) return null;

    const isActive = activeModule === 'project-dashboard';
    const isExpanded = expandedModules['project-dashboard'];
    const hasDynamicModules = projectDashboardModules.length > 0;
    const isHovered = hoveredModule === 'project-dashboard';

    return (
      <div key="project-dashboard" className="px-2">
        <div
          onMouseEnter={() => setHoveredModule('project-dashboard')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('project-dashboard')}
          className={`w-full flex items-center cursor-pointer transition-all duration-fast ${isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            } rounded-r-md ${isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
            }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
            <BarChart3 className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isSidebarExpanded && (
              <span className="text-body font-medium">
                Dashboard
              </span>
            )}
          </div>
          {isSidebarExpanded && hasDynamicModules && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('project-dashboard', e);
              }}
              className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && hasDynamicModules && (
          <div className="ml-6 mt-1 space-y-1">
            {projectDashboardModules.map(projectModule => renderProjectModule(projectModule, 'project-dashboard'))}
          </div>
        )}
      </div>
    );
  };

  const renderUploadTrackersModule = () => {
    if (!hasPermission('Upload Trackers')) return null;

    const isActive = activeModule === 'upload-trackers';
    const isExpanded = expandedModules['upload-trackers'];
    const hasDynamicModules = uploadTrackerModules.length > 0;
    const isHovered = hoveredModule === 'upload-trackers';

    return (
      <div key="upload-trackers" className="px-2">
        <div
          onMouseEnter={() => setHoveredModule('upload-trackers')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('upload-trackers')}
          className={`w-full flex items-center cursor-pointer transition-all duration-fast ${isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            } rounded-r-md ${isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
            }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
            <FileUp className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isSidebarExpanded && (
              <span className="text-body font-medium">
                Trackers
              </span>
            )}
          </div>
          {isSidebarExpanded && hasDynamicModules && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('upload-trackers', e);
              }}
              className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && hasDynamicModules && (
          <div className="ml-6 mt-1 space-y-1">
            {uploadTrackerModules.map(projectModule => renderProjectModule(projectModule, 'upload-trackers'))}
          </div>
        )}
      </div>
    );
  };

  const renderUploadsModule = () => {
    if (!hasPermission('Upload Trackers')) return null;

    const isExpanded = expandedModules['uploads'];
    const isActive = activeModule === 'uploads-main' || uploadsSubmodules.some(s => s.id === activeModule);
    const isHovered = hoveredModule === 'uploads-main';

    return (
      <div key="uploads" className="px-2">
        <div
          onMouseEnter={() => setHoveredModule('uploads-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('uploads-main')}
          className={`w-full flex items-center cursor-pointer transition-all duration-fast ${isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            } rounded-r-md ${isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
            }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
            <FolderTree className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isSidebarExpanded && (
              <span className="text-body font-medium">
                Uploads
              </span>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('uploads', e);
              }}
              className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {renderUploadTrackersModule()}
            {hasPermission('Budget Upload') && (
              <button
                key="budget-upload"
                onMouseEnter={() => setHoveredModule('budget-upload')}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => handleModuleClick('budget-upload')}
                className={`w-full flex items-center gap-3 rounded-r-md px-3 py-2 transition-all duration-fast ${
                  activeModule === 'budget-upload'
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'hover:bg-app-bg text-text-secondary hover:text-text-primary'
                }`}
              >
                <FileUp className="h-4 w-4" />
                <span className="text-body font-medium">
                  Budget Upload
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMOMModule = () => {
    if (!hasPermission('MOM')) return null;

    const isExpanded = expandedModules['mom'];
    const isActive = activeModule === 'mom-module' || activeModule === 'meetings';
    const isHovered = hoveredModule === 'mom-main';

    return (
      <div key="mom" className="px-2">
        <div
          onMouseEnter={() => setHoveredModule('mom-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('meetings')}
          className={`w-full flex items-center cursor-pointer transition-all duration-fast ${isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            } rounded-r-md ${isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
            }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
            <MessageSquare className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isSidebarExpanded && (
              <span className="text-body font-medium">
                Meetings
              </span>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('mom', e);
              }}
              className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            <button
              key="meetings"
              onMouseEnter={() => setHoveredModule('meetings')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => handleModuleClick('meetings')}
              className={`w-full flex items-center gap-3 rounded-r-md px-3 py-2 transition-all duration-fast ${
                activeModule === 'meetings'
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'hover:bg-app-bg text-text-secondary hover:text-text-primary'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span className="text-body font-medium">
                All Meetings
              </span>
            </button>

            <button
              key="mom-module"
              onMouseEnter={() => setHoveredModule('mom-module')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => handleModuleClick('mom-module')}
              className={`w-full flex items-center gap-3 rounded-r-md px-3 py-2 transition-all duration-fast ${
                activeModule === 'mom-module'
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'hover:bg-app-bg text-text-secondary hover:text-text-primary'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="text-body font-medium">
                Create MOM
              </span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMastersModule = () => {
    const visibleSubmodules = mastersSubmodules.filter(sub => hasPermission(sub.name));
    if (visibleSubmodules.length === 0) return null;

    const isExpanded = expandedModules['masters'];
    const isActive = activeModule === 'masters-main' || mastersSubmodules.some(s => s.id === activeModule);
    const isHovered = hoveredModule === 'masters-main';

    return (
      <div key="masters" className="px-2">
        <div
          onMouseEnter={() => setHoveredModule('masters-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('masters-main')}
          className={`w-full flex items-center cursor-pointer transition-all duration-fast ${isSidebarExpanded ? 'justify-between px-3 py-2' : 'justify-center p-2'
            } rounded-r-md ${isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
            }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
            <FolderTree className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {isSidebarExpanded && (
              <span className="text-body font-medium">
                Masters
              </span>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('masters', e);
              }}
              className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-6 mt-1 space-y-1">
            {visibleSubmodules.map((submodule) => {
              const isSubmoduleActive = activeModule === submodule.id;

              return (
                <button
                  key={submodule.id}
                  onMouseEnter={() => setHoveredModule(submodule.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  onClick={() => handleModuleClick(submodule.id)}
                  className={`w-full flex items-center gap-3 rounded-r-md px-3 py-2 transition-all duration-fast ${isSubmoduleActive
                    ? 'bg-brand-primary/10 text-white font-semibold'
                    : 'hover:bg-white/5 text-white/60 hover:text-white'
                    }`}
                >
                  <span className="text-body font-medium">
                    {submodule.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // FIXED: Pass isSelected function to renderProjectModule
  // ==========================================================================
  const renderProjectModule = (projectModule, context) => {
    const projectKey = projectModule.id || projectModule.projectId || projectModule.name;
    const uniqueId = `${context}-${projectKey}`;
    const isExpanded = expandedModules[uniqueId] || false;
    const hasFiles = projectModule.submodules?.length > 0;
    const isHovered = hoveredModule === uniqueId;

    return (
      <div key={uniqueId} className="group">
        <div className="flex items-center justify-between">
          <div
            onMouseEnter={() => setHoveredModule(uniqueId)}
            onMouseLeave={() => setHoveredModule(null)}
            onClick={(e) => {
              toggleModuleExpansion(uniqueId, e);
              if (context === 'project-dashboard') {
                handleModuleClick('project-dashboard');
                const pId = projectModule.id || projectModule.projectId || projectModule.name;
                window.dispatchEvent(new CustomEvent('openProjectDashboardMain', {
                  detail: { projectId: pId }
                }));
              }
            }}
            className={`flex-1 flex items-center gap-2 rounded-r-md px-3 py-2 transition-all duration-fast cursor-pointer ${isHovered
              ? 'bg-white/5 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
              }`}
          >
            <Layers className="h-4 w-4" />
            <span className="text-body font-medium truncate">
              {projectModule.name}
            </span>
          </div>
          {hasFiles && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion(uniqueId, e);
              }}
              className="p-1 rounded hover:bg-white/5 transition-colors text-white/20 hover:text-white"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {isExpanded && hasFiles && (
          <div className="ml-6 mt-1 space-y-1">
            {projectModule.submodules.map(fileModule => renderFileModule(fileModule, context, projectKey))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // FIXED: Use context-specific selection check with project key
  // ==========================================================================
  const renderFileModule = (fileModule, context, projectKey) => {
    const isSelected = isFileSelected(fileModule, context);
    const fileId = `${context}-${fileModule.id}-${projectKey}`;
    const isHovered = hoveredModule === fileId;

    return (
      <button
        key={fileId}
        onMouseEnter={() => setHoveredModule(fileId)}
        onMouseLeave={() => setHoveredModule(null)}
        onClick={() => {
          if (context === 'upload-trackers') {
            handleFileModuleClick(fileModule);
          } else if (context === 'project-dashboard') {
            if (fileModule.type === 'budget') {
              dispatch(setActiveModule(fileModule.id));
              navigate(`/dashboard/budget-summary/${fileModule.projectName}`);
            } else {
              handleProjectFileClick({
                ...fileModule,
                projectName: fileModule.projectName || projectKey
              });
            }
          }
        }}
        className={`w-full flex items-center gap-2 rounded-r-md px-3 py-2 transition-all duration-fast ${isSelected
          ? 'bg-brand-primary/10 text-white font-semibold'
          : isHovered
            ? 'bg-white/5 text-white'
            : 'text-white/60 hover:text-white'
          }`}
      >
        <span className={`text-body-sm truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
          {fileModule.displayName || (fileModule.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, '')}
        </span>
      </button>
    );
  };

  const renderOtherModules = () => {
    return otherModules.filter(module => module.id !== 'upload-trackers').map((module, index) => {
      if (!hasPermission(module.name)) return null;

      const isActive = activeModule === module.id;
      const isHovered = hoveredModule === module.id;
      return (
        <button
          key={module.id}
          onClick={() => handleModuleClick(module.id)}
          className={`w-full flex items-center gap-3 rounded-r-md px-3 py-2 transition-all duration-fast ${isSidebarExpanded ? '' : 'justify-center'} ${
            isActive
              ? 'bg-brand-primary/10 text-white font-semibold'
              : 'hover:bg-white/5 text-white/60 hover:text-white'
          }`}
        >
          <Settings className={`${isSidebarExpanded ? 'h-4 w-4' : 'h-5 w-5'}`} />
          {isSidebarExpanded && (
            <span className="text-body font-medium">
              {module.name}
            </span>
          )}
        </button>
      );
    });
  };

  // Determine if sidebar should be expanded
  const isSidebarExpanded = !sidebarCollapsed;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-app-bg">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Clean Surface Color */}
        <div
          ref={sidebarRef}
          className={`
            fixed lg:relative inset-y-0 left-0 z-30
            ${isSidebarExpanded ? 'w-60' : 'w-16'}
            bg-[#0E1B2E]
            border-r border-white/5
            transform transition-all duration-250 ease-product lg:transform-none
            flex flex-col
            overflow-hidden
          `}
        >
          {/* Logo Section */}
          <div className="px-4 py-5 border-b border-border">
            {isSidebarExpanded ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {companyName ? companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'IA'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label font-semibold text-white truncate">
                    {companyName || 'Industrial Analytics'}
                  </p>
                  <p className="text-caption text-white/40">Platform</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {companyName ? companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'IA'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1">
            {renderProjectDashboardModule()}
            {renderMOMModule()}
            {renderMastersModule()}

            <div className="pt-2">
              {renderUploadsModule()}
              {renderOtherModules()}
            </div>
          </div>

          {/* User Section at Bottom */}
          <div className="p-3 border-t border-white/5">
            <div className={`flex items-center gap-3 ${!isSidebarExpanded && 'justify-center'}`}>
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-caption font-semibold">
                {getUserInitial()}
              </div>
              {isSidebarExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                  <p className="text-caption text-white/40 capitalize">{user?.role || 'User'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-app-bg">
          {/* Header */}
          <header className="h-14 bg-app-bg border-b border-border flex-shrink-0 flex items-center px-6">
            {/* Left - Toggle & Title */}
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => dispatch(setSidebarCollapsed(!sidebarCollapsed))}
                className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-app-surface transition-all duration-fast"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
              <h1 className="text-h3 font-semibold text-text-primary">
                {getHeaderTitle()}
              </h1>
            </div>

            {/* Right - Date/Time & Profile */}
            <div className="flex items-center gap-4">
              {/* Date and Time */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-app-surface rounded-md">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-body-sm font-medium text-text-secondary tabular-nums">{currentTime}</span>
                <span className="text-border-strong">|</span>
                <span className="text-body-sm text-text-secondary">{currentDate}</span>
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-semibold text-body-sm hover:bg-brand-accent transition-colors duration-fast"
                >
                  {getUserInitial()}
                </button>

                {profileMenuOpen && (
                  <div
                    className="fixed z-[9999] w-64 bg-app-bg rounded-lg shadow-lg border border-border py-2"
                    style={{
                      top: `${profileMenuPosition.top}px`,
                      right: `${profileMenuPosition.right}px`
                    }}
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-semibold">
                          {getUserInitial()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-text-primary truncate">{user?.full_name || 'User'}</p>
                          <p className="text-caption text-text-muted truncate">{user?.email || 'user@example.com'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-body-sm text-text-secondary hover:text-text-primary hover:bg-app-surface flex items-center gap-3 transition-colors duration-fast">
                        <UserIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                      <button className="w-full px-4 py-2 text-left text-body-sm text-text-secondary hover:text-text-primary hover:bg-app-surface flex items-center gap-3 transition-colors duration-fast">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                    </div>

                    <div className="border-t border-border py-1">
                      <button
                        onClick={() => {
                          handleLogout();
                          setProfileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-body-sm text-status-error hover:bg-app-surface flex items-center gap-3 transition-colors duration-fast"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 min-h-0 overflow-hidden bg-app-bg">
            <div className="h-full overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
