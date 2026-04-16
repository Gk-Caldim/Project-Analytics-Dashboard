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
  MessageSquare, Layers, FolderTree, Calendar, Box, MoreVertical, Pin,
  LayoutDashboard, ServerCog, UsersRound, Briefcase, CloudUpload, FilePlus2, Settings2, MessagesSquare, CalendarDays
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

  // Recents State
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const [recentMenu, setRecentMenu] = useState(null); // idx of open menu
  const [pinnedRecents, setPinnedRecents] = useState([]);

  useEffect(() => {
    const loadRecents = () => {
      const saved = localStorage.getItem('project_dashboard_recents');
      if (saved) {
        try {
          setRecentActivity(JSON.parse(saved).slice(0, 8)); // Limit sidebar to 8 items
        } catch (e) {
          console.error("Failed to load recents", e);
        }
      }
    };
    
    loadRecents(); // initial load
    window.addEventListener('recentsUpdated', loadRecents);
    return () => window.removeEventListener('recentsUpdated', loadRecents);
  }, []);

  // Masters submodules
  const mastersSubmodules = useMemo(() => [
    { id: 'employee-master', name: 'Employee Master', path: 'masters/employees', icon: <UsersRound className="h-5 w-5" />, color: '#000000' },
    { id: 'project-master', name: 'Project Master', path: 'masters/project-master', icon: <Briefcase className="h-5 w-5" />, color: '#333333' },
  ], []);

  const mastersModules = useMemo(() => [
    { id: 'masters-main', name: 'Masters', path: 'masters', icon: <ServerCog className="h-5 w-5" /> },
  ], []);

  const uploadsSubmodules = useMemo(() => [
    { id: 'upload-trackers', name: 'Trackers Upload', path: 'trackers', icon: <CloudUpload className="h-5 w-5" /> },
    { id: 'budget-upload', name: 'Budget Upload', path: 'budget-upload', icon: <CloudUpload className="h-5 w-5" /> }
  ], []);
  const uploadsModules = useMemo(() => [
    { id: 'uploads-main', name: 'Uploads', path: 'trackers', icon: <CloudUpload className="h-5 w-5" /> }
  ], []);

  const otherModules = useMemo(() => [
    { id: 'system-settings', name: 'Settings', path: 'settings', icon: <Settings2 className="h-5 w-5" /> },
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
    if (activeModule === 'project-dashboard') return 'Dashboard';
    if (activeModule === 'masters-main') return 'Masters';
    if (activeModule === 'mom-module') return 'Minutes of Meeting';
    if (activeModule === 'meetings') return 'Meetings Console';
    if (activeModule === 'schedule-meeting') return 'Schedule Meeting';

    const allModules = [...mastersModules, ...mastersSubmodules, ...uploadsModules, ...uploadsSubmodules, ...otherModules];
    const module = allModules.find(m => m.id === activeModule);
    return module ? module.name : 'Dashboard';
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
    else if (moduleId === 'mom-main' || moduleId === 'meetings') path = 'meetings';
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
      if (projectDashboardModules.length > 0) {
        dispatch(toggleExpansion('project-dashboard'));
      }
    } else if (moduleId === 'masters-main') {
      dispatch(toggleExpansion('masters'));
    } else if (moduleId === 'uploads-main') {
      dispatch(toggleExpansion('uploads'));
    } else if (moduleId === 'mom-main') {
      dispatch(toggleExpansion('mom'));
    } else if (moduleId === 'upload-trackers') {
      if (uploadTrackerModules.length > 0) {
        dispatch(toggleExpansion('upload-trackers'));
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
      <div key="project-dashboard" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('project-dashboard')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('project-dashboard')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <LayoutDashboard className={`${isSidebarExpanded ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isSidebarExpanded && (
              <span className={`font-semibold text-base text-white`}>
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
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && hasDynamicModules && (
          <div className="ml-7 mt-1.5 space-y-1.5">
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
      <div key="upload-trackers" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('upload-trackers')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('upload-trackers')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <FileUp className={`${isSidebarExpanded ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isSidebarExpanded && (
              <span className={`font-semibold text-base text-white`}>
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
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && hasDynamicModules && (
          <div className="ml-7 mt-1.5 space-y-1.5">
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
      <div key="uploads" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('uploads-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('uploads-main')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <CloudUpload className={`${isSidebarExpanded ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isSidebarExpanded && (
              <span className={`font-semibold text-base text-white`}>
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
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            {/*
              Embed the Upload Trackers tile (with its own dynamic project expansion)
            */}
            {renderUploadTrackersModule()}
            {/*
              Simple submodule button for Budget Upload
            */}
            {hasPermission('Budget Upload') && (
              <button
                key="budget-upload"
                onMouseEnter={() => setHoveredModule('budget-upload')}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => handleModuleClick('budget-upload')}
                className={`w-full flex items-center space-x-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                  activeModule === 'budget-upload'
                    ? 'bg-white/20 shadow-sm text-white'
                    : hoveredModule === 'budget-upload'
                      ? 'bg-white/15 shadow-sm text-white'
                      : 'hover:bg-white/10 text-white'
                }`}
              >
                <div className="text-white">
                  <CloudUpload className="h-5 w-5" />
                </div>
                <span className={`text-sm font-medium truncate text-white`}>
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
    const isActive = activeModule === 'mom-module' || activeModule === 'meetings' || activeModule === 'mom-main';
    const isHovered = hoveredModule === 'mom-main';

    return (
      <div key="mom" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('mom-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => {
            handleModuleClick('mom-main');
          }}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <MessagesSquare className={`${isSidebarExpanded ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isSidebarExpanded && (
              <span className={`font-semibold text-base text-white`}>
                MOM
              </span>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('mom', e);
              }}
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            <button
              key="meetings"
              onMouseEnter={() => setHoveredModule('meetings')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => handleModuleClick('meetings')}
              className={`w-full flex items-center space-x-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                activeModule === 'meetings'
                  ? 'bg-white/20 shadow-sm text-white'
                  : hoveredModule === 'meetings'
                    ? 'bg-white/15 shadow-sm text-white'
                    : 'hover:bg-white/10 text-white'
              }`}
            >
              <div className="text-white">
                <CalendarDays className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium truncate text-white`}>
                Meetings
              </span>
            </button>

            <button
              key="mom-module"
              onMouseEnter={() => setHoveredModule('mom-module')}
              onMouseLeave={() => setHoveredModule(null)}
              onClick={() => handleModuleClick('mom-module')}
              className={`w-full flex items-center space-x-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${
                activeModule === 'mom-module'
                  ? 'bg-white/20 shadow-sm text-white'
                  : hoveredModule === 'mom-module'
                    ? 'bg-white/15 shadow-sm text-white'
                    : 'hover:bg-white/10 text-white'
              }`}
            >
              <div className="text-white">
                <FilePlus2 className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium truncate text-white`}>
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
      <div key="masters" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('masters-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('masters-main')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isSidebarExpanded ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isSidebarExpanded ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <FolderTree className={`${isSidebarExpanded ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isSidebarExpanded && (
              <span className={`font-semibold text-base text-white`}>
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
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isSidebarExpanded && isExpanded && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            {visibleSubmodules.map((submodule, index) => {
              const isSubmoduleActive = activeModule === submodule.id;
              const isSubmoduleHovered = hoveredModule === submodule.id;

              return (
                <button
                  key={submodule.id}
                  onMouseEnter={() => setHoveredModule(submodule.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  onClick={() => handleModuleClick(submodule.id)}
                  className={`w-full flex items-center space-x-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${isSubmoduleActive
                    ? 'bg-white/20 shadow-sm text-white'
                    : isSubmoduleHovered
                      ? 'bg-white/15 shadow-sm text-white'
                      : 'hover:bg-white/10 text-white'
                    }`}
                >
                  <div className="text-white">
                    {submodule.icon}
                  </div>
                  <span className={`text-sm font-medium truncate text-white`}>
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
            className={`flex-1 flex items-center space-x-2.5 rounded-lg px-3 py-2.5 transition-all duration-300 cursor-pointer ${isHovered
              ? 'bg-white/15 text-white shadow-sm'
              : 'hover:bg-white/10 text-white'
              }`}
          >
            <Layers className="h-5 w-5 text-white" />
            <span className="text-sm font-medium truncate text-white">
              {projectModule.name}
            </span>
          </div>
          {hasFiles && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion(uniqueId, e);
              }}
              className={`p-1.5 rounded-lg text-white ${isHovered ? 'hover:bg-white/15' : 'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {isExpanded && hasFiles && (
          <div className="ml-7 mt-1.5 space-y-1">
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
        className={`w-full flex items-center space-x-2.5 rounded-lg px-3 py-2 transition-all duration-300 ${isSelected
          ? 'bg-white/25 shadow-sm text-white font-medium'
          : isHovered
            ? 'bg-white/15 text-white shadow-sm'
            : 'hover:bg-white/10 text-white'
          }`}
      >
        <span className={`text-sm truncate text-white ${isSelected ? 'font-medium' : ''
          }`}>
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
          onMouseEnter={() => setHoveredModule(module.id)}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick(module.id)}
          className={`w-full flex items-center transition-all duration-300 ${isSidebarExpanded ? 'px-4 py-3.5 space-x-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className="text-white">
            {module.icon}
          </div>
          {isSidebarExpanded && (
            <span className="font-semibold text-base text-white">
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
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Global styles */}
      <style>{`
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Blue color from project dashboard header (#1e3a5f) */}
        <div
          ref={sidebarRef}
          className={`
            fixed lg:relative inset-y-0 left-0 z-30
            ${isSidebarExpanded ? 'w-60' : 'w-16'}
            bg-[#1e3a5f]
            transform transition-all duration-200 ease-in-out lg:transform-none
            flex flex-col
            shadow-xl
            relative z-30
            group
          `}
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 30%),
                                   radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 30%)`
            }}>
          </div>

          {/* Sidebar Boundary Toggle Button */}
          <button
            onClick={() => dispatch(setSidebarCollapsed(!sidebarCollapsed))}
            className="absolute top-7 -right-3.5 z-[100] h-7 w-7 rounded-full bg-[#1e3a5f] border-2 border-gray-100 text-white hover:bg-[#2a528a] transition-all duration-300 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100"
            title={sidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4 ml-0.5" /> : <ChevronLeft className="h-4 w-4 pr-0.5" />}
          </button>

          {/* Logo Section */}
          <div className="relative px-4 py-4 z-10 min-h-[80px] flex items-center justify-center">
            {isSidebarExpanded ? (
              <div className="relative w-full flex justify-center">
                <img
                  src={companyLogo || "/caldimlogo.png"}
                  className={`h-22 w-auto max-w-full object-contain relative ${!companyLogo ? 'brightness-0 invert' : ''}`}
                  alt="Company Logo"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shadow-md backdrop-blur-sm">
                <span className="text-white font-bold text-sm">
                  {companyName ? companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CD'}
                </span>
              </div>
            )}
          </div>

          {/* Navigation - All text white */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 relative z-10">
            {renderProjectDashboardModule()}
            {renderMOMModule()}
            {renderMastersModule()}

            <div className="space-y-1.5">
              {renderUploadsModule()}
              {renderOtherModules()}
            </div>

            {/* Recents Sidebar Section */}
            {recentActivity.length > 0 && (
              <div className="mt-8 mb-4">
                {isSidebarExpanded ? (
                  <button
                    onClick={() => setRecentsExpanded(!recentsExpanded)}
                    className="w-full px-4 mb-2 flex items-center justify-between group"
                  >
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider group-hover:text-white/70 transition-colors">
                      Recents
                    </span>
                    <span className="text-white/40 group-hover:text-white/70 transition-colors">
                      {recentsExpanded
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                ) : null}

                {(recentsExpanded || !isSidebarExpanded) && (
                  <div className="space-y-1">
                    {recentActivity.map((item, idx) => (
                      <div key={idx} className="relative group/item">
                        <button
                          onClick={() => {
                            if (item.type === 'project') {
                              navigate(`/dashboard/projects?projectId=${item.id}`);
                              window.dispatchEvent(new CustomEvent('openProjectDashboardMain', { detail: { projectId: item.id } }));
                            } else {
                              navigate(item.path);
                            }
                          }}
                          title={!isSidebarExpanded ? item.label : ''}
                          className={`w-full flex items-center transition-all duration-300 ${isSidebarExpanded ? 'pl-4 pr-8 py-2 space-x-3' : 'justify-center px-2 py-2'} rounded-xl hover:bg-white/10 text-white/80 hover:text-white`}
                        >
                          <div className="flex-shrink-0">
                            {pinnedRecents.includes(idx)
                              ? <span className="text-yellow-400"><Box className="h-4 w-4" /></span>
                              : item.type === 'project' ? <Box className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                          </div>
                          {isSidebarExpanded && (
                            <div className="flex flex-col items-start min-w-0 overflow-hidden">
                              <span className="text-sm font-medium truncate w-full text-left">
                                {item.label}
                              </span>
                            </div>
                          )}
                        </button>

                        {/* Three-dot menu button */}
                        {isSidebarExpanded && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRecentMenu(recentMenu === idx ? null : idx); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-white/0 group-hover/item:text-white/50 hover:!text-white transition-all"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {recentMenu === idx && isSidebarExpanded && (
                          <div
                            className="absolute right-0 top-full mt-1 z-[200] bg-[#1a2f4a] border border-white/10 rounded-lg shadow-xl overflow-hidden w-36"
                            onMouseLeave={() => setRecentMenu(null)}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPinnedRecents(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                                setRecentMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Pin className="h-3.5 w-3.5" />
                              {pinnedRecents.includes(idx) ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = recentActivity.filter((_, i) => i !== idx);
                                setRecentActivity(updated);
                                localStorage.setItem('project_dashboard_recents', JSON.stringify(updated));
                                setRecentMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          {/* Header - White background */}
          <header className="bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-20 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between relative z-10">
              {/* Left side - Back Button */}
              <div className="w-48 flex items-center">
                {!(location.pathname === '/dashboard/projects' && !location.search) && location.pathname !== '/dashboard' && (
                  <button
                    onClick={() => navigate(-1)}
                    className="px-3 py-2 rounded-lg text-[#1e3a5f] hover:bg-gray-100 transition-colors flex items-center gap-2 group"
                    title="Go Back"
                  >
                    <ChevronLeft className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
                    <span className="font-semibold text-sm text-[15px]">Back</span>
                  </button>
                )}
              </div>

              {/* Center - Title */}
              <div className="flex-1 flex justify-center items-center">
                <h1 className="text-2xl font-bold text-[#1e3a5f] tracking-tight">
                  {getHeaderTitle()}
                </h1>
              </div>

              {/* Right side - Date/Time and Profile */}
              <div className="flex items-center space-x-6 min-w-[300px] justify-end">
                {/* Date and Time - Updated for white header */}
                <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <span className="text-sm font-medium text-gray-700 tabular-nums">{currentTime}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm font-medium text-gray-700">{currentDate}</span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-[#1e3a5f] transition-colors rounded-full hover:bg-gray-100">
                  <Bell className="h-6 w-6" />
                  {notifications > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    </span>
                  )}
                </button>

                {/* Profile Menu with black background */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="bg-[#1e3a5f] w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {getUserInitial()}
                  </button>

                  {profileMenuOpen && (
                    <div
                      className="fixed z-[9999] w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2"
                      style={{
                        position: 'fixed',
                        top: `${profileMenuPosition.top}px`,
                        right: `${profileMenuPosition.right}px`
                      }}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-[#1e3a5f] w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                            {getUserInitial()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-lg truncate">{user?.full_name || 'User'}</p>
                            <p className="text-sm text-gray-500 mt-1 truncate">{user?.email || 'user@example.com'}</p>
                            <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 capitalize">
                              {user?.role || 'User'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2 border-t border-gray-100">
                        <button className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">Profile Settings</span>
                        </button>
                        <button className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                          <Settings className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">Account Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={() => {
                            handleLogout();
                            setProfileMenuOpen(false);
                          }}
                          className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <LogOut className="h-5 w-5 text-gray-500" />
                          <span className="font-semibold">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 min-h-0 overflow-hidden bg-white">
            <div className={activeModule === 'project-dashboard' ? 'pl-6 pr-0.5 py-6 h-full' : 'p-6 h-full'}>
              <div className="bg-white rounded-lg h-full overflow-auto">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
