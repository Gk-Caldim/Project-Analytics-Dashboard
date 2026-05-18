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
  setBranding,
  setActiveView,
  markNotificationsRead
} from '../store/slices/navSlice';
import { logout } from '../store/slices/authSlice';
import Sidebar from '../components/Sidebar';
import AgentView from './AgentView';
import {
  Layout as LayoutIcon, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter, ChevronUp, ChevronDown, ChevronLeft, Check, Save, Settings,
  Users, Shield, FolderKanban, Package, Building, Database, FileUp, LogOut, Menu, User as UserIcon, Bell, ChevronRight, Projector, FileText, Globe, Clock, BarChart3, PieChart, LineChart,
  MessageSquare, Layers, FolderTree, Calendar, Wallet
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
    companyName,
    activeView
  } = useSelector(state => state.nav);

  // MOM context for sidebar label
  const momMeetingName = useSelector(state => state.mom?.meetingName);

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
  const [expandedProjects, setExpandedProjects] = useState({});

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const unreadNotifications = useSelector(state => state.nav.unreadNotifications);
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });
  const [notificationMenuPosition, setNotificationMenuPosition] = useState({ top: 0, right: 0 });

  const HARDCODED_NOTIFICATIONS = [
    {
      id: 1,
      title: "Project Alpha Updated",
      description: "The milestone 'Development Finish' has been marked as complete.",
      time: "2 hours ago",
      type: "project"
    },
    {
      id: 2,
      title: "New Meeting Scheduled",
      description: "Q2 Strategy Review meeting has been scheduled for tomorrow at 10:00 AM.",
      time: "5 hours ago",
      type: "meeting"
    }
  ];

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
  const loadDynamicModules = async () => {
    try {
      const { default: APIInstance } = await import("../utils/api");
      const structuresData = await APIInstance.get('/projects/all/structures');

      const structures = Array.isArray(structuresData.data) ? structuresData.data : [];
      console.log('[Dashboard] dynamic modules fetched:', structures.length);

      const dashProjectsMap = new Map();

      structures.forEach(struct => {
        if (!struct.project_id) return;

        const projectName = capitalizeFirstLetter(struct.project_name || 'Uncategorized');
        const projectKey = struct.project_id;

        const projectModule = {
          id: projectKey,
          moduleId: `project-${projectKey}`,
          dbProjectId: projectKey,
          name: projectName,
          projectName: projectName,
          type: 'project',
          context: 'project-dashboard',
          submodules: []
        };

        // Only show uploaded tracker FILE names in the sidebar.
        // Do NOT use struct.modules — those contain row-level data (CCV, Intake, Exhaust, etc.)
        // which are sub-modules inside the tracker file, not the file itself.
        if (Array.isArray(struct.uploads)) {
          struct.uploads.forEach(u => {
            const fileName = u.file_name || 'Dataset';
            // Strip file extension for display
            const trackerName = fileName.replace(/\.[^/.]+$/, '');
            const trackerId = u.upload_id;

            // Avoid duplicates
            if (!projectModule.submodules.some(s => s.trackerId === trackerId)) {
              projectModule.submodules.push({
                id: `tracker-file-${trackerId}`,
                trackerId: trackerId,
                dbProjectId: projectKey,
                name: trackerName,
                displayName: trackerName,
                type: 'tracker',
                projectName: projectName,
                context: 'project-dashboard'
              });
            }
          });
        }


        dashProjectsMap.set(projectKey, projectModule);
      });

      const finalList = Array.from(dashProjectsMap.values());

      // Auto-expand loaded projects
      const initialExpanded = {};
      finalList.forEach(p => {
        initialExpanded[`project-dashboard-${p.id}`] = true;
        initialExpanded[`upload-trackers-${p.id}`] = true;
      });
      setExpandedProjects(prev => ({ ...prev, ...initialExpanded }));

      setProjectDashboardModules(finalList);
      setUploadTrackerModules(finalList);

      // Cache to localStorage for faster initial load
      localStorage.setItem('project_dashboard_modules', JSON.stringify(finalList));

    } catch (error) {
      console.error('[Dashboard] Critical error in loadDynamicModules:', error);
    }
  };


  useEffect(() => {
    loadDynamicModules();
  }, []);

  // Storage listeners with simple debounce
  const loadDynamicModulesRef = useRef(null);

  useEffect(() => {
    const debouncedLoad = () => {
      if (loadDynamicModulesRef.current) {
        clearTimeout(loadDynamicModulesRef.current);
      }
      loadDynamicModulesRef.current = setTimeout(() => {
        loadDynamicModules();
      }, 100);
    };

    const handleUploadTrackerUpdate = () => debouncedLoad();
    const handleProjectDashboardUpdate = () => debouncedLoad();
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
      dispatch(setActiveModule('saved-moms'));
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
    window.addEventListener('openNotifications', () => setNotificationMenuOpen(true));
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
      window.removeEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
      window.removeEventListener('openNotifications', () => setNotificationMenuOpen(true));
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
    if (activeModule === 'masters-main') return 'Master';
    if (activeModule === 'mom-module') return 'Minutes of Meeting';
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
    dispatch(setActiveModule('upload-trackers'));
    dispatch(setSelectedUploadFileId(fileModule.trackerId));
    navigate('/dashboard/trackers');
  };

  // ==========================================================================
  // FIXED: Enhanced project file click handler
  // ==========================================================================
  const handleProjectFileClick = (fileModule) => {
    // Set the project-specific selected file ID
    const idToSelect = fileModule.trackerId || fileModule.id || fileModule.moduleId;
    dispatch(setSelectedProjectFileId(idToSelect));

    // Ensure we're on project dashboard
    if (activeModule !== 'project-dashboard') {
      dispatch(setActiveModule('project-dashboard'));
    }

    // Ensure project dashboard is expanded
    dispatch(setExpandedModules({ 'project-dashboard': true }));

    // Also expand the parent project module
    let projectKey = null;
    if (fileModule.projectName) {
      const project = projectDashboardModules.find(p =>
        p.name === fileModule.projectName ||
        p.projectName === fileModule.projectName
      );

      if (project) {
        projectKey = project.id || project.projectId || project.name;
        dispatch(setExpandedModules({
          [`project-dashboard-${projectKey}`]: true
        }));
      }
    }

    if (fileModule.type === 'budget') {
      navigate(`/dashboard/budget-summary/${encodeURIComponent(fileModule.projectName)}`);
    } else {
      // Find project ID for search params
      let pId = fileModule.dbProjectId;
      if (!pId && idToSelect && String(idToSelect).startsWith('module-')) {
        pId = String(idToSelect).split('-')[1];
      }
      if (!pId && projectKey) pId = projectKey;

      const searchParams = new URLSearchParams();
      if (pId) searchParams.set('projectId', pId);
      if (idToSelect) searchParams.set('submoduleId', idToSelect);

      navigate({
        pathname: '/dashboard/projects',
        search: searchParams.toString()
      });
    }

    // Dispatch event for ProjectDashboard to handle (legacy support)
    window.dispatchEvent(new CustomEvent('openProjectDashboardFile', {
      detail: {
        trackerId: idToSelect,
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
        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${activeView === 'agent' ? 'bg-black' : 'bg-app-bg'}`}>
          {/* Header */}
          <header className={`h-14 flex-shrink-0 flex items-center px-6 transition-colors duration-300 ${activeView === 'agent'
            ? 'bg-black border-b border-white/5'
            : 'bg-app-bg border-b border-border'}`}>
            {/* Left - Title */}
            <div className="flex items-center gap-4 flex-1">
              <h1 className={`text-h3 font-semibold ${activeView === 'agent' ? 'text-white/90' : 'text-text-primary'}`}>
                {activeView === 'agent' ? 'KIA' : getHeaderTitle()}
              </h1>
            </div>

            {/* Center - View Toggle */}
            <div className="flex-1 flex justify-center">
              <div className={`flex p-1 rounded-lg border transition-colors duration-300 ${activeView === 'agent'
                ? 'bg-[#212121] border-white/10'
                : 'bg-app-surface border-border'}`}>
                <button
                  onClick={() => dispatch(setActiveView('dashboard'))}
                  className={`px-4 py-1.5 rounded-md text-body-sm font-semibold transition-all duration-fast ${activeView === 'dashboard'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : activeView === 'agent'
                      ? 'text-white/40 hover:text-white hover:bg-white/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => dispatch(setActiveView('agent'))}
                  className={`px-4 py-1.5 rounded-md text-body-sm font-semibold transition-all duration-fast ${activeView === 'agent'
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                  KIA
                </button>
              </div>
            </div>

            {/* Right - Date/Time & Profile */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Date and Time */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors duration-300 ${activeView === 'agent'
                ? 'bg-[#212121] border border-white/5'
                : 'bg-app-surface'}`}>
                <Clock className={`h-4 w-4 ${activeView === 'agent' ? 'text-white/40' : 'text-text-muted'}`} />
                <span className={`text-body-sm font-medium tabular-nums ${activeView === 'agent' ? 'text-white/60' : 'text-text-secondary'}`}>{currentTime}</span>
                <span className={activeView === 'agent' ? 'text-white/10' : 'text-border-strong'}>|</span>
                <span className={`text-body-sm ${activeView === 'agent' ? 'text-white/60' : 'text-text-secondary'}`}>{currentDate}</span>
              </div>

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
                          dispatch(markNotificationsRead());
                        }}
                        className={`text-[10px] font-bold uppercase tracking-widest hover:opacity-100 transition-opacity ${activeView === 'agent' ? 'text-white/40' : 'text-brand-primary'}`}
                      >
                        Mark All as Read
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {HARDCODED_NOTIFICATIONS.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-4 border-b flex gap-3 cursor-pointer transition-colors duration-fast ${activeView === 'agent'
                            ? 'border-white/5 hover:bg-white/5'
                            : 'border-border hover:bg-app-surface'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeView === 'agent' ? 'bg-white/10' : 'bg-brand-primary/10'}`}>
                            {notif.type === 'project' ? <FolderKanban className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-body-sm font-semibold truncate">{notif.title}</p>
                              <span className="text-[10px] opacity-40 shrink-0 font-medium">{notif.time}</span>
                            </div>
                            <p className="text-body-xs opacity-60 mt-1 leading-relaxed line-clamp-2">
                              {notif.description}
                            </p>
                          </div>
                        </div>
                      ))}
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
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <button className={`w-full px-4 py-2 text-left text-body-sm flex items-center gap-3 transition-colors duration-fast ${activeView === 'agent'
                        ? 'text-white/60 hover:text-white hover:bg-white/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-app-surface'}`}>
                        <UserIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </button>
                      <button className={`w-full px-4 py-2 text-left text-body-sm flex items-center gap-3 transition-colors duration-fast ${activeView === 'agent'
                        ? 'text-white/60 hover:text-white hover:bg-white/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-app-surface'}`}>
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
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
