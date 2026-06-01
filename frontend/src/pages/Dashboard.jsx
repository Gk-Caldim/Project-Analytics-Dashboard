import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Outlet, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  setBranding,
  setActiveView,
  markNotificationsRead,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../store/slices/navSlice';
import { logout } from '../store/slices/authSlice';
import Sidebar from '../components/Sidebar';
import AgentView from './AgentView';
import {
  Layout as LayoutIcon, LayoutDashboard, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter, ChevronUp, ChevronDown, ChevronLeft, Check, Save, Settings,
  Users, Shield, FolderKanban, Package, Building, Database, FileUp, LogOut, Menu, User as UserIcon, Bell, ChevronRight, Projector, FileText, Globe, Clock, BarChart3, PieChart, LineChart,
  MessageSquare, Layers, FolderTree, Calendar, Wallet, Sparkles, Sun, Moon
} from 'lucide-react';

import API from "../utils/api";
import { useTheme } from '../contexts/ThemeContext';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { themeSettings, toggleTheme } = useTheme();

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
    companyName,
    activeView,
    currentMeetingTitle
  } = useSelector(state => state.nav);

  // MOM context for sidebar label
  const momMeetingName = useSelector(state => state.mom?.meetingName);

  // Fetch settings using React Query
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await API.get('/settings/');
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  useEffect(() => {
    if (settings) {
      const logo = settings.find(s => s.key === 'company_logo')?.value;
      const name = settings.find(s => s.key === 'company_name')?.value;
      dispatch(setBranding({ companyLogo: logo, companyName: name }));
    }
  }, [settings, dispatch]);

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Dynamic modules
  const [uploadTrackerModules, setUploadTrackerModules] = useState([]);
  const [projectDashboardModules, setProjectDashboardModules] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const notifications = useSelector(state => state.nav.notifications);
  const unreadNotifications = useSelector(state => state.nav.unreadNotifications);
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });
  const [notificationMenuPosition, setNotificationMenuPosition] = useState({ top: 0, right: 0 });

  // Remove HARDCODED_NOTIFICATIONS

  // Masters submodules
  const mastersSubmodules = useMemo(() => [
    { id: 'employee-master', name: 'Employee Master', path: 'masters/employees', icon: <Users className="h-5 w-5" />, color: '#000000' },
    { id: 'project-master', name: 'Project Master', path: 'masters/project-master', icon: <FolderKanban className="h-5 w-5" />, color: '#333333' },
    { id: 'budget-master', name: 'Budget Master', path: 'masters/budget-master', icon: <Wallet className="h-5 w-5" />, color: '#333333' },
  ], []);

  const mastersModules = useMemo(() => [
    { id: 'masters-main', name: 'Master', path: 'masters/employees', icon: <Database className="h-5 w-5" /> },
  ], []);

  const uploadsSubmodules = useMemo(() => [
    { id: 'upload-trackers', name: 'Trackers Upload', path: 'trackers', icon: <FileUp className="h-5 w-5" /> },
  ], []);
  const uploadsModules = useMemo(() => [
    { id: 'uploads-main', name: 'Uploads', path: 'trackers', icon: <FileUp className="h-5 w-5" /> }
  ], []);

  const otherModules = useMemo(() => [
    { id: 'system-settings', name: 'Settings', path: 'settings', icon: <Settings className="h-4 w-4" /> },
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
      // Any specific cleanup
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
  const { data: structuresData, refetch: refetchStructures } = useQuery({
    queryKey: ['structures'],
    queryFn: async () => {
      const { default: APIInstance } = await import("../utils/api");
      const response = await APIInstance.get('/projects/all/structures');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!structuresData) return;
    try {
      const structures = Array.isArray(structuresData) ? structuresData : [];
      console.log('[Dashboard] dynamic modules processed:', structures.length);

      // KEY FIX: Key the Map by normalized project NAME (not project_id).
      // The API can return the same project name under multiple project_id values.
      // Keying by project_id caused the sidebar to render one entry per project_id,
      // resulting in duplicate project entries (e.g. TATA appearing twice).
      // By keying on name we merge all uploads into one sidebar entry per project name.
      const dashProjectsMap = new Map();

      structures.forEach(struct => {
        if (!struct.project_id) return;

        const projectName = capitalizeFirstLetter(struct.project_name || 'Uncategorized');
        // Use normalized name as map key so same-named projects merge into one sidebar entry
        const projectKey = projectName;
        const stableModuleId = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Create entry on first encounter; reuse on subsequent structs with same name
        if (!dashProjectsMap.has(projectKey)) {
          dashProjectsMap.set(projectKey, {
            id: stableModuleId,
            moduleId: `project-${stableModuleId}`,
            dbProjectId: struct.project_id,
            name: projectName,
            projectName: projectName,
            type: 'project',
            context: 'project-dashboard',
            submodules: []
          });
        }

        const projectModule = dashProjectsMap.get(projectKey);

        // Only show uploaded tracker FILE names in the sidebar.
        // Do NOT use struct.modules — those contain row-level data (CCV, Intake, Exhaust, etc.)
        // which are sub-modules inside the tracker file, not the file itself.
        if (Array.isArray(struct.uploads)) {
          struct.uploads.forEach(u => {
            const fileName = u.file_name || 'Dataset';
            // Strip file extension for display
            const trackerName = fileName.replace(/\.[^/.]+$/, '');
            const trackerId = u.upload_id;

            // Avoid duplicates across merged structs
            if (!projectModule.submodules.some(s => s.trackerId === trackerId)) {
              projectModule.submodules.push({
                id: `tracker-file-${trackerId}`,
                trackerId: trackerId,
                dbProjectId: struct.project_id,
                name: trackerName,
                displayName: trackerName,
                type: 'tracker',
                projectName: projectName,
                context: 'project-dashboard'
              });
            }
          });
        }
      });

      const finalList = Array.from(dashProjectsMap.values());

      // Auto-expand loaded projects in both local state and Redux
      const initialExpanded = {};
      finalList.forEach(p => {
        initialExpanded[`project-dashboard-${p.id}`] = true;
        initialExpanded[`upload-trackers-${p.id}`] = true;
      });
      setExpandedProjects(prev => ({ ...prev, ...initialExpanded }));
      // Sync to Redux so Sidebar can read upload-trackers group states
      if (Object.keys(initialExpanded).length > 0) {
        dispatch(setExpandedModules(initialExpanded));
      }

      setProjectDashboardModules(finalList);
      setUploadTrackerModules(finalList);

      // Cache to localStorage for faster initial load
      localStorage.setItem('project_dashboard_modules', JSON.stringify(finalList));

    } catch (error) {
      console.error('[Dashboard] Critical error in processing structuresData:', error);
    }
  }, [structuresData, dispatch]);

  const loadDynamicModules = () => {
    refetchStructures();
  };


  useEffect(() => {
    loadDynamicModules();
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Storage listeners with context-aware debounce
  const loadDynamicModulesRef = useRef(null);

  useEffect(() => {
    const debouncedLoad = (delay = 100) => {
      if (loadDynamicModulesRef.current) {
        clearTimeout(loadDynamicModulesRef.current);
      }
      loadDynamicModulesRef.current = setTimeout(() => {
        loadDynamicModules();
      }, delay);
    };

    // Backend processes Excel synchronously before firing this event, so a short delay is enough
    const handleUploadTrackerUpdate = () => debouncedLoad(300);
    // Project dashboard config changes are fast, respond quickly
    const handleProjectDashboardUpdate = () => debouncedLoad(100);
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
    else if (path.includes('/dashboard/mom/view')) {
      // MOM output page belongs to the MOM creation workflow, not Saved MOMs library
      dispatch(setActiveModule('mom-module'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/mom')) {
      dispatch(setActiveModule('mom-module'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/saved-moms')) {
      dispatch(setActiveModule('saved-moms'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/schedule-meeting')) {
      dispatch(setActiveModule('schedule-meeting'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/calendar')) {
      dispatch(setActiveModule('calendar'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/meeting/')) {
      dispatch(setActiveModule('calendar'));
      dispatch(setExpandedModules({ 'mom': true }));
    }
    else if (path.includes('/dashboard/settings')) dispatch(setActiveModule('system-settings'));
  }, [location.pathname, dispatch, mastersSubmodules, otherModules]);

  // Sync Redux state when query params change (browser back/forward on same pathname).
  // The pathname effect above only fires when the path changes; this handles cases like
  // /trackers → /trackers?file=123 or /projects?projectId=X → /projects.
  useEffect(() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);

    if (path.includes('/dashboard/trackers')) {
      const fileId = params.get('file');
      if (!fileId) {
        // No file param → user navigated back to tracker list
        dispatch(setSelectedUploadFileId(null));
      }
    }

    if (path.includes('/dashboard/projects')) {
      const submoduleId = params.get('submoduleId');
      const projectId = params.get('projectId');
      if (!submoduleId) {
        dispatch(setSelectedProjectFileId(null));
      }
      if (!projectId) {
        dispatch(setActiveProjectName(null));
      }
    }
  }, [location.search, location.pathname, dispatch]);

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

  // Click outside for menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target)) {
        setNotificationMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update menu positions when opened
  useEffect(() => {
    if (profileMenuOpen && profileMenuRef.current) {
      const rect = profileMenuRef.current.getBoundingClientRect();
      setProfileMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    if (notificationMenuOpen && notificationMenuRef.current) {
      const rect = notificationMenuRef.current.getBoundingClientRect();
      setNotificationMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [profileMenuOpen, notificationMenuOpen]);

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

      // Set the selected file ID — must use dispatch for Redux
      dispatch(setSelectedProjectFileId(trackerId));

      // Ensure project dashboard is active
      if (activeModule !== 'project-dashboard') {
        dispatch(setActiveModule('project-dashboard'));
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
  }, [activeModule, projectDashboardModules, dispatch]);

  useEffect(() => {
    const handleOpenProjectDashboardMain = (event) => {
      const { projectId } = event.detail;
      const project = projectDashboardModules.find(p => p.id === projectId || p.name === projectId || p.projectId === projectId);
      if (project && project.name) {
        dispatch(setActiveProjectName(project.name));
      } else {
        dispatch(setActiveProjectName(projectId));
      }
    };

    const handleResetProjectDashboardMain = () => {
      dispatch(setActiveProjectName(null));
    };

    window.addEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
    window.addEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
    window.addEventListener('openNotifications', () => setNotificationMenuOpen(true));
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
      window.removeEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
      window.removeEventListener('openNotifications', () => setNotificationMenuOpen(true));
    };
  }, [projectDashboardModules, dispatch]);

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

  // Listen for popstate (browser back/forward) events — important when UploadTrackers
  // uses window.history.pushState directly (bypassing React Router's setSearchParams)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (activeModule === 'upload-trackers') {
        const fileId = params.get('file');
        if (!fileId) {
          dispatch(setSelectedUploadFileId(null));
        }
      } else if (activeModule === 'project-dashboard') {
        const projectId = params.get('projectId');
        const submoduleId = params.get('submoduleId');
        if (!submoduleId) dispatch(setSelectedProjectFileId(null));
        if (!projectId) dispatch(setActiveProjectName(null));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModule, dispatch]);

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
    if (activeModule === 'masters-main') return 'Master';
    if (activeModule === 'mom-module') {
      // Distinguish between MOM creation entry and the output/view table
      if (location.pathname.includes('/dashboard/mom/view')) return 'Meeting Table';
      return 'Minutes of Meeting';
    }
    if (activeModule === 'saved-moms') return 'Saved MOMs';
    if (activeModule === 'schedule-meeting') return 'Schedule Meeting';
    if (activeModule === 'calendar') {
      if (location.pathname.includes('/dashboard/meeting/')) return 'Meeting Details';
      return 'Calendar Console';
    }

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
    dispatch(setActiveView('dashboard'));
    dispatch(setActiveModule(moduleId));

    // Build path
    let path = 'projects';
    const allModules = [...mastersModules, ...mastersSubmodules, ...uploadsModules, ...uploadsSubmodules, ...otherModules];
    const module = allModules.find(m => m.id === moduleId);
    if (module) path = module.path;
    else if (moduleId === 'mom-module') path = 'mom';
    else if (moduleId === 'saved-moms') path = 'saved-moms';
    else if (moduleId === 'schedule-meeting') path = 'schedule-meeting';
    else if (moduleId === 'calendar') path = 'calendar';

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
      if (!expandedModules['masters']) {
        dispatch(setExpandedModules({ 'masters': true }));
      }
    } else if (moduleId === 'uploads-main') {
      dispatch(toggleExpansion('uploads'));
    } else if (moduleId === 'mom-module' || moduleId === 'saved-moms' || moduleId === 'schedule-meeting' || moduleId === 'calendar') {
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
    dispatch(setActiveView('dashboard'));
    dispatch(setActiveModule('upload-trackers'));
    dispatch(setSelectedUploadFileId(fileModule.trackerId));
    // Include ?file= so UploadTrackers URL-sync and breadcrumbs work correctly
    navigate(`/dashboard/trackers?file=${encodeURIComponent(fileModule.trackerId)}`);
  };

  // ==========================================================================
  // Clicking a tracker file from the Dashboard section opens it in the
  // Dashboard's dedicated table view.
  // ==========================================================================
  const handleProjectFileClick = (fileModule) => {
    dispatch(setActiveView('dashboard'));
    if (fileModule.type === 'budget') {
      // Budget files still navigate to the budget summary page
      navigate(`/dashboard/budget-summary/${encodeURIComponent(fileModule.projectName)}`);
      return;
    }

    dispatch(setActiveModule('project-dashboard'));
    dispatch(setSelectedProjectFileId(fileModule.trackerId || fileModule.id));
    
    // Construct the URL for project dashboard
    const pid = fileModule.dbProjectId || fileModule.projectId || fileModule.projectName;
    navigate(`/dashboard/projects?projectId=${encodeURIComponent(pid)}&submoduleId=${encodeURIComponent(fileModule.trackerId || fileModule.id)}`);
  };

  // ==========================================================================
  // Check selection based on context
  // ==========================================================================
  const isFileSelected = (fileModule, context) => {
    if (context === 'project-dashboard') {
      return selectedProjectFileId === (fileModule.trackerId || fileModule.id);
    }
    return selectedUploadFileId === fileModule.trackerId;
  };

  // ==========================================================================
  // GET BREADCRUMBS FOR TOP HEADER
  // ==========================================================================
  const getBreadcrumbs = () => {
    if (activeView === 'agent') {
      return [
        { label: 'KIA', active: true }
      ];
    }

    const formatNavLabel = (string) => {
      if (!string) return '';
      let clean = string.replace(/[-_]/g, ' ');
      clean = clean.replace(/^project dashboard\s+/i, '');
      return clean
        .split(/\s+/)
        .map(word => {
          let w = word.toLowerCase();
          if (w === 'tata' || w === 'motors') return 'TATA';
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    };

    const crumbs = [
      { label: 'Dashboard', path: '/dashboard/projects', active: false }
    ];

    const path = location.pathname;

    const addCrumb = (label, pathStr, isActive = false) => {
      crumbs.push({ label, path: pathStr, active: isActive });
    };

    if (path.includes('/dashboard/projects')) {
      const urlProjectId = searchParams.get('projectId');
      const urlSubmoduleId = searchParams.get('submoduleId');
      
      addCrumb('Project Dashboard', '/dashboard/projects', !urlProjectId && !urlSubmoduleId);

      if (urlProjectId || urlSubmoduleId) {
        if (urlProjectId) {
          const projectLabel = formatNavLabel(activeProjectName || urlProjectId);
          if (urlSubmoduleId) {
            addCrumb(projectLabel, `/dashboard/projects?projectId=${encodeURIComponent(urlProjectId)}`);
            let fileLabel = 'File';
            for (const proj of projectDashboardModules) {
              const file = proj.submodules?.find(s => String(s.trackerId) === String(urlSubmoduleId));
              if (file) {
                fileLabel = file.displayName || formatNavLabel((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
                break;
              }
            }
            addCrumb(fileLabel, null, true);
          } else {
            addCrumb(projectLabel, null, true);
          }
        } else if (urlSubmoduleId) {
          let fileLabel = 'File';
          for (const proj of projectDashboardModules) {
            const file = proj.submodules?.find(s => String(s.trackerId) === String(urlSubmoduleId));
            if (file) {
              fileLabel = file.displayName || formatNavLabel((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
              break;
            }
          }
          addCrumb(fileLabel, null, true);
        }
      }
    } else if (path.includes('/dashboard/trackers')) {
      const urlFileId = searchParams.get('file');
      addCrumb('Upload Trackers', '/dashboard/trackers', !urlFileId);
      if (urlFileId) {
        let fileLabel = 'File';
        for (const proj of uploadTrackerModules) {
          const file = proj.submodules?.find(s => String(s.trackerId) === String(urlFileId));
          if (file) {
            fileLabel = file.displayName || formatNavLabel((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
            break;
          }
        }
        addCrumb(fileLabel, null, true);
      }
    } else if (path.includes('/dashboard/budget-summary/')) {
      const pathParts = path.split('/');
      const projectName = decodeURIComponent(pathParts[pathParts.length - 1]);
      addCrumb('Budget Summary', null, false);
      addCrumb(formatNavLabel(projectName), null, true);
    } else if (path.includes('/dashboard/masters/')) {
      addCrumb('Masters', '/dashboard/masters/employees', false);
      if (path.includes('/dashboard/masters/employees')) {
        addCrumb('Employee Master', null, true);
      } else if (path.includes('/dashboard/masters/project-master')) {
        addCrumb('Project Master', null, true);
      } else if (path.includes('/dashboard/masters/budget-master')) {
        addCrumb('Budget Master', null, true);
      } else if (path.includes('/dashboard/masters/project-detail/')) {
        addCrumb('Project Detail', null, true);
      } else {
        addCrumb('Masters', null, true);
      }
    } else if (path.includes('/dashboard/mom')) {
      addCrumb('Minutes of Meeting', '/dashboard/mom', path === '/dashboard/mom');
      if (path.includes('/dashboard/mom/view')) {
        addCrumb(currentMeetingTitle || 'MOM View', null, true);
      } else if (path.includes('/dashboard/mom/transcript-viewer')) {
        addCrumb('Transcript Viewer', null, true);
      } else if (path.includes('/dashboard/mom/legacy')) {
        addCrumb('Legacy MOM', null, true);
      }
    } else if (path.includes('/dashboard/saved-moms')) {
      addCrumb('Saved MOMs', null, true);
    } else if (path.includes('/dashboard/schedule-meeting')) {
      addCrumb('Schedule Meeting', null, true);
    } else if (path.includes('/dashboard/calendar')) {
      addCrumb('Calendar Console', null, true);
    } else if (path.includes('/dashboard/meeting/')) {
      addCrumb('Calendar Console', '/dashboard/calendar');
      addCrumb(currentMeetingTitle || 'Meeting Details', null, true);
    } else if (path.includes('/dashboard/settings')) {
      addCrumb('System Settings', null, true);
    } else {
      addCrumb(capitalizeFirstLetter(getActiveModuleName()), null, true);
    }

    return crumbs;
  };

  // ==========================================================================
  // RENDER FUNCTIONS - ALL WITH WHITE TEXT ON BLUE BACKGROUND
  // ==========================================================================

  // Determine if sidebar should be expanded
  const isSidebarExpanded = !sidebarCollapsed;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-app-bg">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Clean Surface Color */}
        {activeView !== 'agent' && (
          <Sidebar
            activeModule={activeModule}
            expandedModules={expandedModules}
            handleModuleClick={handleModuleClick}
            toggleModuleExpansion={toggleModuleExpansion}
            projectDashboardModules={projectDashboardModules}
            uploadTrackerModules={uploadTrackerModules}
            mastersSubmodules={mastersSubmodules}
            otherModules={otherModules}
            isFileSelected={isFileSelected}
            handleFileModuleClick={handleFileModuleClick}
            handleProjectFileClick={handleProjectFileClick}
            hasAccess={hasPermission}
          />
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${activeView === 'agent' ? 'bg-[#0B0F19]' : 'bg-app-bg'}`}>
          {/* Header */}
          <header className={`h-14 flex-shrink-0 flex items-center px-6 transition-colors duration-300 ${activeView === 'agent'
            ? 'bg-black border-b border-white/5'
            : 'bg-app-bg border-b border-border'}`}>
            {/* Left - Title & Back Button */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className={`p-2 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 group`}
                title="Go Back"
              >
                <ChevronLeft className={`w-5 h-5 ${activeView === 'agent' ? 'text-white/70 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'}`} />
              </button>
              <button
                onClick={() => navigate(1)}
                className={`p-2 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 group`}
                title="Go Forward"
              >
                <ChevronRight className={`w-5 h-5 ${activeView === 'agent' ? 'text-white/70 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'}`} />
              </button>
              <nav className={`flex items-center flex-wrap gap-1 text-sm font-sans tracking-tight ${activeView === 'agent' ? 'text-white/90' : 'text-slate-900 dark:text-white'}`}>
                {activeView === 'agent' ? (
                  <span className="font-semibold text-base">KIA</span>
                ) : (
                  getBreadcrumbs().map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className={`font-normal mx-1 text-xs select-none ${activeView === 'agent' ? 'text-white/30' : 'text-slate-400 dark:text-slate-500'}`}>&gt;</span>
                      )}
                      {crumb.active || !crumb.path ? (
                        <span className={crumb.active
                          ? (activeView === 'agent' ? 'text-white font-semibold' : 'text-slate-900 dark:text-white font-semibold')
                          : (activeView === 'agent' ? 'text-white/60 font-medium' : 'text-slate-500 dark:text-slate-400 font-medium')}>
                          {crumb.label}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (crumb.path === '/dashboard/projects') {
                              dispatch(setSelectedProjectFileId(null));
                              dispatch(setActiveProjectName(null));
                              window.dispatchEvent(new CustomEvent('resetProjectDashboardMain'));
                            } else if (crumb.path === '/dashboard/trackers') {
                              dispatch(setSelectedUploadFileId(null));
                            }
                            navigate(crumb.path);
                          }}
                          className={`hover:text-slate-900 dark:hover:text-white hover:underline transition-colors text-left font-medium bg-transparent border-0 p-0 cursor-pointer ${
                            activeView === 'agent'
                              ? 'text-white/60 hover:text-white'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {crumb.label}
                        </button>
                      )}
                    </React.Fragment>
                  ))
                )}
              </nav>
            </div>

            {/* Right - Date/Time, AI Chat Toggle & Profile */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Date and Time */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-300 ${activeView === 'agent'
                ? 'bg-[#212121] border border-white/5'
                : 'bg-app-surface border border-border/40 shadow-sm'}`}>
                <Clock className={`h-4 w-4 ${activeView === 'agent' ? 'text-white/40' : 'text-text-muted'}`} />
                <span className={`text-body-sm font-medium tabular-nums ${activeView === 'agent' ? 'text-white/60' : 'text-text-secondary'}`}>{currentTime}</span>
                <span className={activeView === 'agent' ? 'text-white/10' : 'text-border-strong'}>|</span>
                <span className={`text-body-sm ${activeView === 'agent' ? 'text-white/60' : 'text-text-secondary'}`}>{currentDate}</span>
              </div>

              {/* Quick Access AI Copilot Button */}
              <button
                onClick={() => dispatch(setActiveView(activeView === 'agent' ? 'dashboard' : 'agent'))}
                className={`p-2 rounded-full transition-all duration-300 relative group active:scale-95 ${activeView === 'agent'
                  ? 'text-indigo-400 bg-white/5 hover:bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-app-surface border border-transparent hover:border-border shadow-sm bg-app-surface'}`}
                title={activeView === 'agent' ? "Back to Dashboard" : "Chat with KIA"}
              >
                {activeView === 'agent' ? (
                  <LayoutDashboard className="h-5 w-5 transition-transform duration-300 group-hover:scale-115 text-indigo-400" />
                ) : (
                  <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-115 text-indigo-500 fill-indigo-500/10" />
                )}
              </button>

              {/* Sleek Theme Switch Toggle */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-between p-1 rounded-full w-14 h-8 transition-all duration-300 relative border ${
                  activeView === 'agent'
                    ? 'bg-[#212121] border-white/5 hover:border-white/10'
                    : themeSettings.displayMode === 'dark'
                      ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-100 border-slate-200 hover:border-slate-350'
                }`}
                title={themeSettings.displayMode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <span className={`z-10 flex items-center justify-center w-5 h-5 transition-colors ${themeSettings.displayMode === 'dark' ? 'text-slate-500' : 'text-amber-500'}`}>
                  <Sun className="h-3.5 w-3.5" />
                </span>
                <span className={`z-10 flex items-center justify-center w-5 h-5 transition-colors ${themeSettings.displayMode === 'dark' ? 'text-blue-400' : 'text-slate-400'}`}>
                  <Moon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`absolute top-0.5 left-0.5 rounded-full w-6.5 h-6.5 shadow-md transition-transform duration-300 ease-out bg-white dark:bg-slate-900 border dark:border-slate-800 ${
                    themeSettings.displayMode === 'dark' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Notifications Menu */}
              <div className="relative mr-2 flex items-center justify-center" ref={notificationMenuRef}>
                <button
                  onClick={() => {
                    setNotificationMenuOpen(!notificationMenuOpen);
                  }}
                  className={`p-2 rounded-full transition-colors duration-fast relative ${activeView === 'agent'
                    ? (notificationMenuOpen ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10')
                    : (notificationMenuOpen ? 'text-text-primary bg-app-surface' : 'text-text-secondary hover:text-text-primary hover:bg-app-surface')}`}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-error opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-status-error"></span>
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationMenuOpen && (
                  <div
                    className={`fixed z-[9999] w-80 rounded-lg shadow-lg border overflow-hidden ${activeView === 'agent'
                      ? 'bg-[#212121] border-white/10 text-white'
                      : 'bg-app-bg border-border text-text-primary'}`}
                    style={{
                      top: `${notificationMenuPosition.top}px`,
                      right: `${notificationMenuPosition.right}px`
                    }}
                  >
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${activeView === 'agent' ? 'border-white/5' : 'border-border'}`}>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-body">Notifications</h3>
                        {unreadNotifications > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-status-error text-[10px] font-bold text-white">
                            {unreadNotifications}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(markAllNotificationsRead());
                        }}
                        className={`text-[10px] font-bold uppercase tracking-widest hover:opacity-100 transition-opacity ${activeView === 'agent' ? 'text-white/40' : 'text-brand-primary'}`}
                      >
                        Mark All as Read
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.is_read) {
                                dispatch(markNotificationRead(notif.id));
                              }
                            }}
                            className={`px-4 py-4 border-b flex gap-3 cursor-pointer transition-colors duration-fast ${notif.is_read ? 'opacity-60' : 'opacity-100'} ${activeView === 'agent'
                              ? 'border-white/5 hover:bg-white/5'
                              : 'border-border hover:bg-app-surface'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeView === 'agent' ? 'bg-white/10' : 'bg-brand-primary/10'}`}>
                              {notif.type === 'project' ? <FolderKanban className="h-4 w-4" /> : 
                               notif.type === 'meeting' ? <Calendar className="h-4 w-4" /> :
                               notif.type === 'issue' ? <Shield className="h-4 w-4" /> :
                               <Bell className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-body-sm font-semibold truncate">{notif.title}</p>
                                <span className="text-[10px] opacity-40 shrink-0 font-medium">
                                  {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-body-xs opacity-60 mt-1 leading-relaxed line-clamp-2">
                                {notif.description}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center opacity-40">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          <p className="text-body-xs font-medium">No notifications yet</p>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <button className={`w-full py-2 text-center text-body-xs font-bold uppercase tracking-widest transition-colors duration-fast rounded-md ${activeView === 'agent'
                        ? 'text-white/40 hover:text-white hover:bg-white/5'
                        : 'text-text-muted hover:text-text-primary hover:bg-app-surface'}`}>
                        View All Activity
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-body-sm transition-colors duration-fast ${activeView === 'agent'
                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
                    : 'bg-brand-primary text-white hover:bg-brand-accent'}`}
                >
                  {getUserInitial()}
                </button>

                {profileMenuOpen && (
                  <div
                    className={`fixed z-[9999] w-64 rounded-lg shadow-lg border py-2 ${activeView === 'agent'
                      ? 'bg-[#212121] border-white/10 text-white'
                      : 'bg-app-bg border-border text-text-primary'}`}
                    style={{
                      top: `${profileMenuPosition.top}px`,
                      right: `${profileMenuPosition.right}px`
                    }}
                  >
                    <div className={`px-4 py-3 border-b ${activeView === 'agent' ? 'border-white/5' : 'border-border'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${activeView === 'agent' ? 'bg-white/10' : 'bg-brand-primary'}`}>
                          {getUserInitial()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-body font-semibold truncate ${activeView === 'agent' ? 'text-white' : 'text-text-primary'}`}>{user?.full_name || 'User'}</p>
                          <p className={`text-caption truncate ${activeView === 'agent' ? 'text-white/40' : 'text-text-muted'}`}>{user?.email || 'user@example.com'}</p>
                          {user?.employee_id && (
                            <p className={`text-[10px] font-mono mt-1 ${activeView === 'agent' ? 'text-white/30' : 'text-text-muted'}`}>ID: {user.employee_id}</p>
                          )}
                        </div>
                      </div>
                    </div>



                    <div className={`border-t py-1 ${activeView === 'agent' ? 'border-white/5' : 'border-border'}`}>
                      <button
                        onClick={() => {
                          handleLogout();
                          setProfileMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-body-sm flex items-center gap-3 transition-colors duration-fast ${activeView === 'agent'
                          ? 'text-red-400 hover:bg-white/5'
                          : 'text-status-error hover:bg-app-surface'}`}
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
            {activeView === 'agent' ? (
              <AgentView />
            ) : (
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
