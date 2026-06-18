import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { setProjects, updateProjectConfig } from '../store/slices/projectSlice';
import { setSelectedProjectFileId, setActiveModule, setExpandedModules, setActiveView } from '../store/slices/navSlice';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import '../utils/echarts-theme-v5'; // Register the v5 theme
import ExcelTableViewer from '../components/ExcelTableViewer';
import {
  Layout, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, Save, Settings, Download, GripVertical,
  TrendingUp, CheckCircle2, AlertCircle, Clock, MessageSquare, Sparkles as SparklesIcon,
  LayoutDashboard, FolderKanban, Calendar, Users, Wallet, Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PDFViewer, pdf } from '@react-pdf/renderer';
const ReportDocument = React.lazy(() => import('../components/ReportDocument'));
const PdfPreviewModal = React.lazy(() => import('../components/PdfPreviewModal'));
import useCurrency from "../hooks/useCurrency";
import PremiumProjectCard from '../components/project/PremiumProjectCard';
import { motion } from 'framer-motion';
import { TextGenerateEffect } from '../components/ui/text-generate-effect';
import Skeleton from '../components/ui/skeleton';
import { staggerContainer } from '../utils/animations';
import CriticalIssuesWidget from '../components/issues/CriticalIssuesWidget';
import VPProjectDashboard from './VPProjectDashboard';
import Modal from '../components/ui/Modal';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from '../hooks/use-confirm';
import DashboardHomeLayout from '../components/project/DashboardHomeLayout';
import WelcomePanel from '../components/project/WelcomePanel';
import ProjectsPanel from '../components/project/ProjectsPanel';
import ModulesPanel from '../components/project/ModulesPanel';

import TodayPrioritiesStrip from '../components/dashboard/TodayPrioritiesStrip';
import PortfolioHealthMatrix from '../components/dashboard/PortfolioHealthMatrix';
import OperationsCommandCenter from '../components/dashboard/OperationsCommandCenter';
import BudgetGovernanceWorkspace from '../components/dashboard/BudgetGovernanceWorkspace';
import SupplyChainRiskCenter from '../components/dashboard/SupplyChainRiskCenter';
import ResourceManagementCenter from '../components/dashboard/ResourceManagementCenter';
import QualityHealthCenter from '../components/dashboard/QualityHealthCenter';
import ResourceLoads from '../components/dashboard/ResourceLoads';
import ProjectTimelinePanel from '../components/dashboard/ProjectTimelinePanel';
import OperationalActivityStream from '../components/dashboard/OperationalActivityStream';



// Helper to get display name without project prefix
const getDisplayFileName = (fileName, projectName) => {
  if (!fileName) return '';
  let name = fileName;

  // Try to remove project prefix (both with underscores and spaces)
  if (projectName) {
    const projectPrefixUnderscore = projectName.replace(/\s+/g, '_') + '_';
    if (name.toLowerCase().startsWith(projectPrefixUnderscore.toLowerCase())) {
      name = name.substring(projectPrefixUnderscore.length);
    } else {
      const projectPrefixSpace = projectName + '_';
      if (name.toLowerCase().startsWith(projectPrefixSpace.toLowerCase())) {
        name = name.substring(projectPrefixSpace.length);
      }
    }
  }

  // Remove extension
  return name.replace(/\.[^/.]+$/, "");
};

// Get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'Open': return { bg: '#fee2e2', text: '#991b1b' };
    case 'Closed': return { bg: '#d1fae5', text: '#065f46' };
    case 'In Progress': return { bg: '#dbeafe', text: '#1e40af' };
    case 'On Track':
    case 'Active':
    case 'Complete':
    case 'Good': return { bg: '#d1fae5', text: '#065f46' };
    case 'Ahead of timeline': return { bg: '#d1fae5', text: '#065f46' };
    case 'At Risk':
    case 'Under Review': return { bg: '#fed7aa', text: '#9a3412' };
    case 'Pending':
    case 'Not Started': return { bg: '#f3f4f6', text: '#4b5563' };
    default: return { bg: '#f3f4f6', text: '#1f2937' };
  }
};

// Humanize raw field names and format them for display
const humanizeLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Format X-axis values (dates, numbers)
const formatXAxisValue = (val) => {
  if (val === null || val === undefined) return '';
  const strVal = String(val);

  // Try to detect common date formats
  if (strVal.match(/^\d{4}-\d{2}-\d{2}/) || strVal.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    }
  }

  // Large numbers
  if (!isNaN(parseFloat(val)) && parseFloat(val) > 1000) {
    return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  }

  return strVal;
};

// Helper to detect if a column is a date
const isDateColumn = (data, colName) => {
  if (!data || !Array.isArray(data) || data.length === 0) return false;
  // Check first 5 non-empty rows
  let count = 0;
  let matches = 0;
  for (let i = 0; i < data.length && count < 5; i++) {
    const val = data[i][colName];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      count++;
      const strVal = String(val);
      if (strVal.match(/^\d{4}-\d{2}-\d{2}/) || strVal.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
        matches++;
      }
    }
  }
  return count > 0 && matches / count > 0.6;
};

// Infer relationship between two date columns
const inferDateRelationship = (col1, col2) => {
  const c1 = col1.toLowerCase();
  const c2 = col2.toLowerCase();

  // Delay: Planned/Target vs Actual/Completed
  const plannedKeys = ['planned', 'target', 'expected', 'schedule'];
  const actualKeys = ['actual', 'completed', 'delivered', 'finish'];

  if (plannedKeys.some(k => c1.includes(k)) && actualKeys.some(k => c2.includes(k))) {
    return { type: 'delay', label: 'Delay', date1: col1, date2: col2 }; // Actual - Planned
  }
  if (plannedKeys.some(k => c2.includes(k)) && actualKeys.some(k => c1.includes(k))) {
    return { type: 'delay', label: 'Delay', date1: col2, date2: col1 };
  }

  // Duration: Start vs End
  if (c1.includes('start') && (c2.includes('end') || c2.includes('finish'))) {
    return { type: 'duration', label: 'Duration', date1: col1, date2: col2 }; // End - Start
  }
  if (c2.includes('start') && (c1.includes('end') || c1.includes('finish'))) {
    return { type: 'duration', label: 'Duration', date1: col2, date2: col1 };
  }

  // Cycle Time: Created vs Completed/Closed
  if (c1.includes('created') && (c2.includes('completed') || c2.includes('closed') || c2.includes('finish'))) {
    return { type: 'cycleTime', label: 'Cycle Time', date1: col1, date2: col2 }; // Completed - Created
  }
  if (c2.includes('created') && (c1.includes('completed') || c1.includes('closed') || c1.includes('finish'))) {
    return { type: 'cycleTime', label: 'Cycle Time', date1: col2, date2: col1 };
  }

  return null;
};

// Diverse color palette for differentiation
const getDiversePalette = () => [
  "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
  "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#5ae3f1",
  "#ff9f7f", "#fb7293", "#e79068", "#e690d1", "#e062ae",
  "#67e0e3", "#ffdb5c", "#37a2da", "#32c5e9", "#9fe6b8"
];

const ProjectTitleDashboard = () => {
  const confirm = useConfirm();
  const { themeSettings } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { format, symbol } = useCurrency();
  const selectedFileId = useSelector(state => state.nav.selectedProjectFileId);
  const user = useSelector(state => state.auth.user);
  const onClearSelection = () => dispatch(setSelectedProjectFileId(null));

  const [homeSearchFocused, setHomeSearchFocused] = useState(false);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const [dashboardData, setDashboardData] = useState(null);
  const [submoduleData, setSubmoduleData] = useState({});
  const [submoduleLoading, setSubmoduleLoading] = useState({});
  const [chartTypes, setChartTypes] = useState({});
  const [axisConfigs, setAxisConfigs] = useState({});
  const [maximizedChart, setMaximizedChart] = useState(null);
  const [budgetViewMode, setBudgetViewMode] = useState('simplified'); // 'simplified' | 'table'
  const [showAxisSelector, setShowAxisSelector] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [activeEmailField, setActiveEmailField] = useState('email');
  const [visibleSections, setVisibleSections] = useState({
    milestones: true,
    criticalIssues: true,
    metricsSummary: true,
    budget: true
  });
  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Project Dashboard Report',
    message: '',
    selectedSections: {
      milestones: true,
      criticalIssues: true,
      budget: true,
      resource: true,
      quality: true,
      design: true,
      build: true,
      gateway: true,
      validation: true,
      qualityCheck: true
    },
    includePdf: true,
    emailInputs: [''],
    ccInputs: [''],
    bccInputs: ['']
  });

  const [pdfChartImages, setPdfChartImages] = useState({});

  const chartRefs = useRef({});

  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [metricsPage, setMetricsPage] = useState(1);
  const chartsPerPage = 6;

  // New customization states
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedProjects, setPinnedProjects] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dashboard_pinnedProjects')) || []; } catch { return []; }
  });
  const [projectUrgency, setProjectUrgency] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dashboard_projectUrgency')) || {}; } catch { return {}; }
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Staging states for bulk layout
  const [stagedBulkPin, setStagedBulkPin] = useState(null); // null, 'pin', 'unpin'
  const [stagedBulkUrgency, setStagedBulkUrgency] = useState(null);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setLoading(true);
      const { default: API } = await import('../utils/api');

      let safeId = projectToDelete.dbProjectId;

      // If we don't have dbProjectId cached properly, fetch the projects list to find it by name
      if (!safeId) {
        const { data: allProjects } = await API.get('/projects/');
        const matched = allProjects.find(p => p.name.trim().toLowerCase() === projectToDelete.name.trim().toLowerCase());
        if (matched) {
          safeId = matched.project_id || matched.id;
        } else {
          // Fallback extraction as a last resort
          const extracted = parseInt(projectToDelete.id.split('-').pop());
          safeId = isNaN(extracted) ? projectToDelete.id : extracted;
        }
      }

      await API.delete(`/projects/${safeId}`);

      // Update local Redux Store
      const newProjects = projects.filter(p => p.id !== projectToDelete.id);
      dispatch(setProjects(newProjects));

      // Update filters
      setPinnedProjects(prev => prev.filter(id => id !== projectToDelete.id));
      setSelectedProjects(prev => prev.filter(id => id !== projectToDelete.id));

      // Force Dashboard sidebar refresh
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project', err);
      let errMsg = err.response?.data?.detail || 'Failed to delete project. Ensure no uploaded trackers correspond to this project before deletion.';
      if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      toast.error(`Deletion Failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync to session storage
  useEffect(() => {
    sessionStorage.setItem('dashboard_pinnedProjects', JSON.stringify(pinnedProjects));
  }, [pinnedProjects]);

  useEffect(() => {
    sessionStorage.setItem('dashboard_projectUrgency', JSON.stringify(projectUrgency));
  }, [projectUrgency]);

  // --- Derived state from searchParams & projects ---
  const projectId = searchParams.get('projectId');
  const submoduleId = searchParams.get('submoduleId');
  const showSimulateModal = searchParams.get('configure') === 'true';

  // Projects data from Redux
  const projects = useSelector(state => state.project.projects);

  // Derived filtered & sorted projects
  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
      );
    }
    // Sort logic: pinned first, then within pinned group sort by priority level (high priority pins float to top)
    const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1, None: 0 };
    result.sort((a, b) => {
      const aPinned = pinnedProjects.includes(a.id);
      const bPinned = pinnedProjects.includes(b.id);
      // Pinned always before unpinned
      if (aPinned !== bPinned) return bPinned - aPinned;
      // Both pinned: sort by priority rank descending (Critical > High > Medium > Low > None)
      if (aPinned && bPinned) {
        const aRank = PRIORITY_RANK[projectUrgency[a.id]] ?? 0;
        const bRank = PRIORITY_RANK[projectUrgency[b.id]] ?? 0;
        return bRank - aRank;
      }
      return 0;
    });
    return result;
  }, [projects, searchQuery, pinnedProjects, projectUrgency]);

  // Bulk Handlers
  const handleBulkPin = (pin) => {
    if (pin) {
      setPinnedProjects(prev => [...new Set([...prev, ...selectedProjects])]);
    } else {
      setPinnedProjects(prev => prev.filter(id => !selectedProjects.includes(id)));
    }
  };

  const handleBulkUrgency = (level) => {
    setProjectUrgency(prev => {
      const next = { ...prev };
      selectedProjects.forEach(id => { next[id] = level; });
      return next;
    });
  };

  const activeProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find(p =>
      String(p.id) === String(projectId) ||
      p.name === projectId ||
      decodeURIComponent(String(projectId)) === p.name ||
      String(p.dbProjectId) === String(projectId)
    );
  }, [projectId, projects]);

  // SEO & Document Title management
  useEffect(() => {
    const title = activeProject ? `${activeProject.name} | Project Dashboard` : 'Deep Project Analytics | Dashboard';
    document.title = title;

    // Update meta description for basic SEO
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = activeProject
      ? `Real-time analytics and performance tracking for ${activeProject.name}. Monitor milestones, budgets, and critical issues.`
      : 'Comprehensive project analytics dashboard for enterprise-level tracking and reporting.';
  }, [activeProject]);

  const selectedSubmodule = useMemo(() => {
    if (!activeProject || !submoduleId) return null;

    let match = activeProject.submodules?.find(s =>
      String(s.id) === String(submoduleId) ||
      String(s.trackerId) === String(submoduleId) ||
      `project-file-${s.trackerId}` === submoduleId
    );

    if (!match && activeProject.uploads) {
      const upload = activeProject.uploads.find(u =>
        String(u.upload_id) === String(submoduleId) ||
        `tracker-file-${u.upload_id}` === String(submoduleId)
      );
      if (upload) {
        match = {
          id: `tracker-file-${upload.upload_id}`,
          trackerId: upload.upload_id,
          name: upload.file_name ? upload.file_name.replace(/\.[^/.]+$/, '') : 'Dataset',
          displayName: upload.file_name ? upload.file_name.replace(/\.[^/.]+$/, '') : 'Dataset',
          projectName: activeProject.name,
          type: 'tracker'
        };
      }
    }

    return match;
  }, [activeProject, submoduleId]);

  const setShowSimulateModal = (show) => {
    if (show) {
      setSearchParams(prev => {
        prev.set('configure', 'true');
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('configure');
        return prev;
      }, { replace: true });
    }
  };

  // parse hooks and utilities

  const milestoneStats = useMemo(() => {
    const list = dashboardData?.milestones || [];
    return {
      total: list.length,
      completed: list.filter(m => m.status === 'Completed' || m.status === 'Complete').length,
      delayed: list.filter(m => m.status === 'Delayed').length,
      pending: list.filter(m => m.status === 'In Progress' || m.status === 'On Track' || m.status === 'Pending' || m.status === 'Open').length
    };
  }, [dashboardData]);

  const projectHealthEmoji = useMemo(() => {
    const health = dashboardData?.project_health || 'Unknown';
    if (health === 'Green') return '🟢';
    if (health === 'Yellow') return '🟡';
    if (health === 'Red') return '🔴';
    return '⚪';
  }, [dashboardData]);


  const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const strVal = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(strVal);
    return isNaN(num) ? 0 : num;
  };

  // parse hooks

  const { data: structuresData, refetch: refetchStructures } = useQuery({
    queryKey: ['structures'],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get('/projects/all/structures');
      return response.data;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!structuresData) return;
    try {
      const structures = structuresData;

      const newProjects = (() => {
        const uniqueProjectsMap = new Map();

        structures.forEach((struct) => {
          let projectName = struct.project_name || 'Uncategorized';
          projectName = projectName.replace(/tata\s+motors/ig, 'TATA');
          const capitalizedName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

          let dashboardConfig = struct.dashboard_config || null;

          // Normalize visibleSections to prefer phase keys over upload- keys for mapped trackers
          if (dashboardConfig?.visibleSections) {
            const sections = { ...dashboardConfig.visibleSections };
            const uploads = struct.uploads || [];
            const defaultPhases = [
              { id: 'design', aliases: ['design'] },
              { id: 'partDevelopment', aliases: ['part', 'development'] },
              { id: 'build', aliases: ['build'] },
              { id: 'gateway', aliases: ['gateway'] },
              { id: 'validation', aliases: ['validation'] },
              { id: 'qualityIssues', aliases: ['quality'] }
            ];

            uploads.forEach(u => {
              const fname = (u.file_name || '').toLowerCase();
              const uploadKey = `upload-${u.file_name}`;
              if (sections[uploadKey]) {
                const matchedPhase = defaultPhases.find(p => p.aliases.some(a => fname.includes(a)));
                if (matchedPhase) {
                  sections[matchedPhase.id] = true;
                  delete sections[uploadKey];
                }
              }
            });
            dashboardConfig = {
              ...dashboardConfig,
              visibleSections: sections
            };
          }

          if (!uniqueProjectsMap.has(capitalizedName)) {
            uniqueProjectsMap.set(capitalizedName, {
              id: `project-dashboard-${capitalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
              name: capitalizedName,
              dbProjectId: struct.project_id,
              code: capitalizedName.substring(0, 4).toUpperCase(), // Default code
              status: 'In Progress', // Default status
              submodules: [],
              active: false,
              dashboardConfig: dashboardConfig,
              budget: struct.budget || 0,
              utilized_budget: struct.utilized_budget || 0,
              balance_budget: struct.balance_budget || 0,
              project_manager: struct.project_manager || null,
              employee_name: struct.employee_name || null,
              originalName: struct.project_name || 'Uncategorized'
            });
          }

          const existingProject = uniqueProjectsMap.get(capitalizedName);

          // MERGE logic instead of overwrite
          if (!existingProject.dbProjectId || struct.project_id === existingProject.dbProjectId) {
            existingProject.dbProjectId = struct.project_id;
          }

          // Collect all submodules and uploads from all structures matching this name
          existingProject.submodules = [...(existingProject.submodules || []), ...(struct.modules || [])];
          existingProject.uploads = [...(existingProject.uploads || []), ...(struct.uploads || [])];

          // Deduplicate submodules by ID/Name using a Map for O(N) performance
          const subMap = new Map();
          existingProject.submodules.forEach(s => { if (!subMap.has(s.id)) subMap.set(s.id, s); });
          existingProject.submodules = Array.from(subMap.values());

          // Deduplicate uploads by upload_id using a Map for O(N) performance
          const uploadMap = new Map();
          existingProject.uploads.forEach(u => { if (!uploadMap.has(u.upload_id)) uploadMap.set(u.upload_id, u); });
          existingProject.uploads = Array.from(uploadMap.values());

          existingProject.dashboardConfig = dashboardConfig || existingProject.dashboardConfig;
          existingProject.budget = Math.max(existingProject.budget || 0, struct.budget || 0);
          existingProject.utilized_budget = Math.max(existingProject.utilized_budget || 0, struct.utilized_budget || 0);
          existingProject.balance_budget = Math.max(existingProject.balance_budget || 0, struct.balance_budget || 0);
          existingProject.project_manager = struct.project_manager || existingProject.project_manager || null;
          existingProject.employee_name = struct.employee_name || existingProject.employee_name || null;

          const moduleMap = new Map();

          // Build a map of module_name -> upload_id from uploads
          (struct.uploads || []).forEach(upload => {
            (upload.modules || []).forEach(mod => {
              if (mod.module_name && !moduleMap.has(mod.module_name)) {
                moduleMap.set(mod.module_name, upload.upload_id);
              }
            });
          });

          // PREFERRED: use flat top-level modules[] (deduplicated by server)
          const flatModules = Array.isArray(struct.modules) ? struct.modules : [];
          const moduleSet = new Set(existingProject.submodules.map(s => s.name));

          if (flatModules.length > 0) {
            flatModules.forEach(mod => {
              const modName = mod.module_name;
              if (modName && !moduleSet.has(modName)) {
                moduleSet.add(modName);
                existingProject.submodules.push({
                  id: `module-${struct.project_id}-${modName}`,
                  trackerId: moduleMap.get(modName), // Get trackerId from map
                  dbProjectId: struct.project_id,
                  name: modName,
                  displayName: modName,
                  milestones_count: mod.milestones_count,
                  type: 'module',
                  projectName: capitalizedName
                });
              }
            });
          } else {
            // Fallback: iterate uploads for older API shape
            (struct.uploads || []).forEach(upload => {
              (upload.modules || []).forEach(mod => {
                const modName = mod.module_name;
                if (modName && !moduleSet.has(modName)) {
                  moduleSet.add(modName);
                  existingProject.submodules.push({
                    id: `module-${struct.project_id}-${modName}`,
                    trackerId: upload.upload_id,
                    dbProjectId: struct.project_id,
                    name: modName,
                    displayName: modName,
                    department: upload.department,
                    type: 'module',
                    projectName: capitalizedName
                  });
                }
              });
            });
          }
        });

        return Array.from(uniqueProjectsMap.values());
      })();

      dispatch(setProjects(newProjects));
    } catch (error) {
      console.error('[ProjectDashboard] Error loading project modules:', error);
    }
  }, [structuresData, dispatch]);

  useEffect(() => {
    const loadProjects = () => {
      refetchStructures();
    };

    window.addEventListener('projectDashboardUpdate', loadProjects);
    window.addEventListener('uploadTrackerUpdate', loadProjects);

    return () => {
      window.removeEventListener('projectDashboardUpdate', loadProjects);
      window.removeEventListener('uploadTrackerUpdate', loadProjects);
    };
  }, []);

  // Handle open project dashboard main event
  useEffect(() => {
    const handleOpenDashboardProject = (event) => {
      const { projectId } = event.detail;

      if (onClearSelection) onClearSelection();

      const selectedProject = projects.find(p => p.id === projectId || p.name === projectId);
      if (selectedProject) {
        setSearchParams({ projectId: selectedProject.id });
        if (selectedProject.dashboardConfig && Object.keys(selectedProject.dashboardConfig).length > 0) {
          const config = selectedProject.dashboardConfig;
          const sections = (config.visibleSections && Object.keys(config.visibleSections).length > 0)
            ? config.visibleSections
            : { milestones: true, criticalIssues: true };

          setVisibleSections(sections);
          if (sections.metricsSummary) {
            // If we have metricsSummary enabled but NO specific upload toggles, enable all by default
            const hasAnyUploadToggle = Object.keys(sections).some(k => k.startsWith('upload-'));
            if (!hasAnyUploadToggle) {
              (selectedProject.uploads || []).forEach(u => {
                sections[`upload-${u.file_name}`] = true;
              });
            }
          }
          setShowSimulateModal(false);
        } else {
          // Fallback to defaults
          const defaultSections = {
            milestones: true,
            criticalIssues: true,
            metricsSummary: true,
            budget: false,
            resource: false,
            quality: false,
            design: false,
            partDevelopment: false,
            build: false,
            gateway: false,
            validation: false,
            qualityIssues: false,
            sopTables: false
          };
          (selectedProject.uploads || []).forEach(u => {
            defaultSections[`upload-${u.file_name}`] = true;
          });
          setVisibleSections(defaultSections);
          setShowSimulateModal(true);
        }
      }
    };

    const handleResetDashboardProject = () => {
      setSearchParams({});
      setVisibleSections({
        milestones: false,
        criticalIssues: false,
        budget: false,
        resource: false,
        quality: false,
        design: false,
        partDevelopment: false,
        build: false,
        gateway: false,
        validation: false,
        qualityIssues: false,
        sopTables: false
      });
      if (onClearSelection) onClearSelection();
    };

    window.addEventListener('openProjectDashboardMain', handleOpenDashboardProject);
    window.addEventListener('resetProjectDashboardMain', handleResetDashboardProject);
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenDashboardProject);
      window.removeEventListener('resetProjectDashboardMain', handleResetDashboardProject);
    };
  }, [projects, onClearSelection]);

  const resolvedDashboardParams = useMemo(() => {
    let resolvedProjectId = null;
    let resolvedModule = null;

    const idToResolve = submoduleId || selectedFileId;

    if (idToResolve && String(idToResolve).startsWith('module-')) {
      const parts = String(idToResolve).split('-');
      resolvedProjectId = parts[1];
      resolvedModule = parts.slice(2).join('-') || null;
    } else if (activeProject?.dbProjectId) {
      resolvedProjectId = activeProject.dbProjectId;
      resolvedModule = null;
    } else if (projectId && !isNaN(parseInt(projectId))) {
      resolvedProjectId = projectId;
      resolvedModule = null;
    }

    return { resolvedProjectId, resolvedModule };
  }, [submoduleId, selectedFileId, activeProject?.dbProjectId, projectId]);

  const { data: dashboardQueryData, isLoading: isDashboardLoading, isError: isDashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard', resolvedDashboardParams.resolvedProjectId, resolvedDashboardParams.resolvedModule],
    queryFn: async () => {
      const { getDashboard } = await import('../api/dashboard');
      return getDashboard(resolvedDashboardParams.resolvedProjectId, resolvedDashboardParams.resolvedModule);
    },
    enabled: !!resolvedDashboardParams.resolvedProjectId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (dashboardQueryData) {
      setDashboardData(dashboardQueryData);
      if (dashboardQueryData.milestones) {
        setMilestones(dashboardQueryData.milestones);
      }
    }
  }, [dashboardQueryData]);

  const { data: issuesData } = useQuery({
    queryKey: ['issues', activeProject?.dbProjectId],
    queryFn: async () => {
      const { listIssues } = await import('../api/issues');
      return listIssues({ project_id: activeProject.dbProjectId });
    },
    enabled: !!activeProject?.dbProjectId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (issuesData) {
      const momSpecific = Array.isArray(issuesData)
        ? issuesData
          .filter(i => (i.source || '').toUpperCase() === 'MOM')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : [];
      setCriticalIssues(momSpecific);
    }
  }, [issuesData]);



  // --- New Dashboard Queries for Homepage Decision Areas ---
  const { data: projectsSummaryData, refetch: refetchProjectsSummary } = useQuery({
    queryKey: ['projectsSummary'],
    queryFn: async () => {
      const { getDashboardSummary } = await import('../api/dashboard');
      return getDashboardSummary();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: allRevisionsData, refetch: refetchAllRevisions } = useQuery({
    queryKey: ['allRevisions'],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get('/budget/revisions/');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: allIssuesData, refetch: refetchAllIssues } = useQuery({
    queryKey: ['allIssues'],
    queryFn: async () => {
      const { listIssues } = await import('../api/issues');
      return listIssues();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: commodityPricesData, refetch: refetchCommodityPrices } = useQuery({
    queryKey: ['commodityPrices'],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get('/budget/commodities/');
      return response.data || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: meetingsData, refetch: refetchMeetings } = useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get('/meetings');
      return response.data?.meetings || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get('/employees');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleHomepageRefresh = () => {
    refetchProjectsSummary();
    refetchAllRevisions();
    refetchAllIssues();
    refetchCommodityPrices();
    refetchMeetings();
  };

  const handleMatrixAction = (action, payload) => {
    if (action === 'open-tracker') {
      const { trackerId, struct } = payload;
      const reduxProj = projects.find(p => String(p.dbProjectId) === String(struct.project_id));
      if (reduxProj) {
        setSearchParams({
          projectId: reduxProj.id,
          submoduleId: trackerId
        });
      }
    }
  };

  // --- Derived Selectors & Metrics ---
  const mergedProjectsSummary = useMemo(() => {
    if (!projectsSummaryData) return [];
    let list = projectsSummaryData.map(p => {
      const reduxProj = projects.find(rp => String(rp.dbProjectId) === String(p.project_id));
      return {
        ...p,
        id: reduxProj?.id || `project-id-${p.project_id}`,
        budgetApproved: reduxProj?.budget || 0,
        budgetUtilized: reduxProj?.utilized_budget || 0,
        budgetBalance: reduxProj?.balance_budget || 0,
      };
    });

    // Apply pinned priority sorting
    list.sort((a, b) => {
      const aPinned = pinnedProjects.includes(a.id);
      const bPinned = pinnedProjects.includes(b.id);
      if (aPinned !== bPinned) return bPinned - aPinned;
      return 0;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.project_name.toLowerCase().includes(q));
    }

    return list;
  }, [projectsSummaryData, projects, pinnedProjects, searchQuery]);

  const issuesMap = useMemo(() => {
    const map = {};
    (allIssuesData || []).forEach(issue => {
      const pid = issue.project_id;
      if (!map[pid]) map[pid] = [];
      map[pid].push(issue);
    });
    return map;
  }, [allIssuesData]);

  const budgetsMap = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      map[p.name] = {
        overall_budget: p.budget,
        spent: p.utilized_budget,
        balance: p.balance_budget
      };
    });
    return map;
  }, [projects]);

  const allUploads = useMemo(() => {
    if (!structuresData) return [];
    const list = [];
    structuresData.forEach(struct => {
      if (struct.uploads) {
        struct.uploads.forEach(u => {
          list.push({
            ...u,
            project_id: struct.project_id,
            project_name: struct.project_name
          });
        });
      }
    });
    return list.sort((a, b) => {
      const da = a.uploaded_at ? new Date(a.uploaded_at) : new Date(0);
      const db = b.uploaded_at ? new Date(b.uploaded_at) : new Date(0);
      return db - da;
    });
  }, [structuresData]);

  const ALERT_THRESHOLDS = { steel: 10.0, copper: 8.0, lithium: 12.0, aluminium: 10.0, fuel: 10.0, rubber: 10.0, semiconductor: 0.0 };

  const commodityAlerts = useMemo(() => {
    const alerts = [];
    Object.entries(commodityPricesData || {}).forEach(([cat, data]) => {
      const pct = data.percentage_change || 0;
      const thresh = ALERT_THRESHOLDS[cat] ?? 10.0;
      const isShortage = cat === 'semiconductor' && (data.supply_chain_risk || 0) > 0.65;
      if (pct >= thresh || isShortage) {
        alerts.push({
          id: `commodity-${cat}`,
          title: cat.toUpperCase(),
          category: cat,
          severity: pct >= (thresh * 1.5) ? 'Critical' : 'High',
          message: isShortage 
            ? `⚠️ Semiconductor supply risk: ${data.supply_chain_risk || 0.7}`
            : `🚨 Price spike: ${pct}%`
        });
      }
    });
    return alerts;
  }, [commodityPricesData]);

  const escalations = useMemo(() => {
    return (allIssuesData || []).filter(i => i.status !== 'Closed' && i.priority === 'High');
  }, [allIssuesData]);

  const delays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (allIssuesData || []).filter(i => {
      if (i.status === 'Closed' || !i.due_date) return false;
      const due = new Date(i.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });
  }, [allIssuesData]);

  const momActions = useMemo(() => {
    return (allIssuesData || []).filter(i => {
      if (i.status === 'Closed') return false;
      if ((i.source || '').toUpperCase() !== 'MOM') return false;
      if (!i.due_date) return true;
      const todayStr = new Date().toISOString().split('T')[0];
      return i.due_date.startsWith(todayStr);
    });
  }, [allIssuesData]);

  const allMilestonesFromSummary = useMemo(() => {
    const list = [];
    (projectsSummaryData || []).forEach(proj => {
      if (proj.delayed > 0) {
        list.push({
          id: `milestone-delay-${proj.project_id}`,
          activity_name: `${proj.project_name} baseline milestone schedule`,
          status: 'Delayed',
          complete_percent: proj.on_track_pct,
          end_date: new Date().toISOString()
        });
      }
    });
    return list;
  }, [projectsSummaryData]);

  const myTasks = useMemo(() => {
    if (!allIssuesData || !user?.full_name) return [];
    const name = user.full_name.toLowerCase();
    return allIssuesData.filter(i => 
      i.status !== 'Closed' && 
      (i.owner || '').toLowerCase().includes(name)
    );
  }, [allIssuesData, user]);

  const ingestionLogs = useMemo(() => {
    if (!structuresData) return [];
    const list = [];
    structuresData.forEach(struct => {
      if (struct.uploads) {
        struct.uploads.forEach(u => {
          list.push({
            ...u,
            project_name: struct.project_name
          });
        });
      }
    });
    return list.sort((a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0));
  }, [structuresData]);

  const escalationsCount = escalations.length;
  const criticalPathDelaysCount = (projectsSummaryData || []).reduce((acc, p) => acc + (p.delayed || 0), 0);
  const revisionsCount = (allRevisionsData || []).filter(r => r.status === 'Pending Head' || r.status === 'Pending Finance').length;
  const commodityAlertsCount = commodityAlerts.length;

  const renderMyTasksChecklist = () => {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col mb-6">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h3 className="m-0 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            My Action Items Checklist
          </h3>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
            Assigned to Me
          </span>
        </div>
        <div className="overflow-x-auto">
          {myTasks.length === 0 ? (
            <div className="text-center text-slate-500 py-10 italic text-xs">
              No active tasks assigned to you. Enjoy your clean workspace!
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
                  <th className="p-3">Task / Issue</th>
                  <th className="p-3">Project</th>
                  <th className="p-3 text-center">Priority</th>
                  <th className="p-3 text-center">Due Date</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {myTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-800 hover:bg-slate-850/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-200">{task.title}</td>
                    <td className="p-3 text-slate-400">
                      {projects.find(p => String(p.dbProjectId) === String(task.project_id))?.name || `Project ${task.project_id}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {task.priority || 'Low'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-300 font-semibold">{task.due_date || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={async () => {
                          try {
                            const { updateIssue } = await import('../api/issues');
                            await updateIssue(task.id, { status: 'Closed' });
                            toast.success('Task marked as completed');
                            refetchAllIssues();
                          } catch (e) {
                            toast.error('Failed to update task');
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20 hover:border-emerald-400/40 hover:bg-emerald-500/10 rounded transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderIngestionTrackerLogs = () => {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col mb-6">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <h3 className="m-0 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Database size={14} className="text-blue-500" />
            Ingestion Tracker Logs
          </h3>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
            System Logs
          </span>
        </div>
        <div className="overflow-x-auto">
          {ingestionLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-10 italic text-xs">
              No recent ingestion logs found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
                  <th className="p-3">File Name</th>
                  <th className="p-3">Project</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Row Count</th>
                  <th className="p-3 text-center">Date Ingested</th>
                </tr>
              </thead>
              <tbody>
                {ingestionLogs.slice(0, 15).map((log, idx) => (
                  <tr key={log.upload_id || idx} className="border-b border-slate-800 hover:bg-slate-850/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-200 truncate max-w-[200px]">{log.file_name}</td>
                    <td className="p-3 text-slate-400">{log.project_name}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        log.status === 'Completed' || log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        log.status === 'Failed' || log.status === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-800'
                      }`}>
                        {log.status || 'unknown'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-300">{log.row_count || 0}</td>
                    <td className="p-3 text-center text-slate-500 font-medium">{log.uploaded_at || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // BUFFER STATE for Dashboard Configuration Modal
  const [tempVisibleSections, setTempVisibleSections] = useState({ ...visibleSections });

  // Sync buffer when modal opens
  useEffect(() => {
    if (showSimulateModal) {
      setTempVisibleSections({ ...visibleSections });
    }
  }, [showSimulateModal, visibleSections]);

  // Sync live state with persisted config on mount or project switch
  useEffect(() => {
    if (activeProject?.dashboardConfig) {
      if (activeProject.dashboardConfig.visibleSections) {
        setVisibleSections({
          metricsSummary: true,
          milestones: true,
          criticalIssues: true,
          budget: true,
          resource: true,
          quality: true,
          design: true,
          partDevelopment: true,
          build: true,
          gateway: true,
          validation: true,
          qualityIssues: true,
          sopTables: false,
          ...activeProject.dashboardConfig.visibleSections
        });
      }
      if (activeProject.dashboardConfig.chartTypes) {
        setChartTypes(prev => ({
          ...prev,
          [activeProject.id]: activeProject.dashboardConfig.chartTypes
        }));
      }
      if (activeProject.dashboardConfig.axisConfigs) {
        setAxisConfigs(prev => ({
          ...prev,
          [activeProject.id]: activeProject.dashboardConfig.axisConfigs
        }));
      }
    } else if (activeProject) {
      // Reset to default if no config found for active project
      setVisibleSections({
        metricsSummary: true,
        milestones: true,
        criticalIssues: true,
        budget: true,
        resource: true,
        quality: true,
        design: true,
        partDevelopment: true,
        build: true,
        gateway: true,
        validation: true,
        qualityIssues: true,
        sopTables: false
      });
    }
  }, [activeProject]);

  // Helper to determine which phases are available based on uploaded files
  const availablePhases = useMemo(() => {
    const phases = {
      design: false,
      partDevelopment: false,
      build: false,
      gateway: false,
      validation: false,
      qualityIssues: false
    };

    if (!activeProject || !activeProject.submodules) return phases;

    // Track which submodules are present
    activeProject.submodules.forEach(sub => {
      phases[sub.id] = true;
    });

    // Keep legacy aliases for backward compatibility if needed, 
    // but primarily we want to use submodule.id for dynamic trackers
    const isAvailable = (deptName, aliases) => {
      const inSubmodules = (activeProject.submodules || []).some(sub => {
        const name = (sub.displayName || sub.name || '').toLowerCase();
        const dept = (sub.department || '').toLowerCase();
        return dept === deptName.toLowerCase() || aliases.some(alias => name.includes(alias.toLowerCase()));
      });
      const inUploads = (activeProject.uploads || []).some(u => {
        const fname = (u.file_name || '').toLowerCase();
        return aliases.some(alias => fname.includes(alias.toLowerCase()));
      });
      return inSubmodules || inUploads;
    };

    phases.design = isAvailable('Design Release', ['design']);
    phases.partDevelopment = isAvailable('Part Development', ['part', 'development']);
    phases.build = isAvailable('Build', ['build']);
    phases.gateway = isAvailable('Gateway', ['gateway']);
    phases.validation = isAvailable('Validation', ['validation']);
    phases.qualityIssues = isAvailable('Quality Issues', ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues']);

    return phases;
  }, [activeProject]);

  // Helper to get specific tracker for a phase
  const getTrackerForPhase = (phaseOrId) => {
    if (!activeProject || !activeProject.submodules) return null;

    // If phaseOrId is a submodule ID already, return that submodule
    const DirectMatch = activeProject.submodules.find(sub => sub.id === phaseOrId);
    if (DirectMatch) return DirectMatch;

    const mapping = {
      design: { dept: 'Design Release', aliases: ['design'] },
      partDevelopment: { dept: 'Part Development', aliases: ['part', 'development'] },
      build: { dept: 'Build', aliases: ['build'] },
      gateway: { dept: 'Gateway', aliases: ['gateway'] },
      validation: { dept: 'Validation', aliases: ['validation'] },
      qualityIssues: { dept: 'Quality Issues', aliases: ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues'] }
    };

    const config = mapping[phaseOrId];
    if (!config) return null;

    const fromSubmodules = (activeProject.submodules || []).find(sub => {
      const name = (sub.displayName || sub.name || '').toLowerCase();
      const dept = (sub.department || '').toLowerCase();
      return dept === config.dept.toLowerCase() || config.aliases.some(alias => name.includes(alias.toLowerCase()));
    });

    if (fromSubmodules) return fromSubmodules;

    // Fallback to uploads
    const fromUploads = (activeProject.uploads || []).find(u => {
      const fname = (u.file_name || '').toLowerCase();
      return config.aliases.some(alias => fname.includes(alias.toLowerCase()));
    });

    if (fromUploads) {
      return {
        id: `upload-${fromUploads.file_name}`,
        trackerId: fromUploads.upload_id,
        name: fromUploads.file_name,
        displayName: fromUploads.file_name
      };
    }

    return null;
  };

  // Load employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/employees');
        setAllEmployees(response.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Available columns for X and Y axis (dummy data)
  const availableColumns = [];

  // --- EDITABLE DASHBOARD DATA ---

  // Milestones data with plan/actual
  const [milestones, setMilestones] = useState([]);

  // Lifted Gantt Chart filters
  const [ganttDeptFilter, setGanttDeptFilter] = useState('All');
  const [ganttTypeFilter, setGanttTypeFilter] = useState('All');
  const [ganttStatusFilter, setGanttStatusFilter] = useState('All');

  // SOP Data - Health and status information
  const [sopData, setSopData] = useState([
    {
      name: 'SOP Timeline',
      daysToGo: 0,
      status: 'On Track',
      health: 'Green'
    }
  ]);

  // Critical issues data
  const [criticalIssues, setCriticalIssues] = useState([]);

  const [summaryData, setSummaryData] = useState({
    budgetApproved: 0,
    budgetUtilized: 0,
    budgetBalance: 0,
    budgetOutlook: '0%',
    resourceDeployed: '0',
    resourceUtilized: '0',
    resourceShortage: '0',
    resourceUnderUtilized: '0',
    qualityTotal: '0',
    qualityCompleted: '0',
    qualityOpen: '0',
    qualityCritical: '0'
  });

  // Sync summaryData with activeProject when it changes
  useEffect(() => {
    if (activeProject) {
      setSummaryData(prev => ({
        ...prev,
        budgetApproved: activeProject.budget || 0,
        budgetUtilized: activeProject.utilized_budget || 0,
        budgetBalance: activeProject.balance_budget || 0,
        // Calculate outlook if possible, otherwise keep prev or 0
        budgetOutlook: activeProject.budget > 0
          ? Math.round((activeProject.utilized_budget / activeProject.budget) * 100)
          : '0'
      }));
    }
  }, [activeProject]);

  const allPossibleCharts = useMemo(() => {
    if (!activeProject) return [];

    const defaults = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues']
      .filter(id => availablePhases[id])
      .map(id => {
        const tracker = getTrackerForPhase(id);
        return {
          id,
          title: humanizeLabel(id),
          trackerId: tracker?.trackerId,
          isDefault: true
        };
      });

    const coveredTrackerIds = new Set(defaults.map(c => c.trackerId).filter(Boolean));

    const seenFiles = new Set();
    const dynamics = (activeProject?.uploads || [])
      .filter(u => {
        if (seenFiles.has(u.file_name)) return false;
        seenFiles.add(u.file_name);
        return !coveredTrackerIds.has(u.upload_id);
      })
      .map(u => ({
        id: `upload-${u.file_name}`,
        title: getDisplayFileName(u.file_name, activeProject.name),
        trackerId: u.upload_id,
        isDefault: false
      }));

    return [...defaults, ...dynamics].filter(c => !!c.trackerId);
  }, [activeProject, availablePhases]);

  const allMetricCharts = useMemo(() => {
    if (!activeProject || !visibleSections) return [];

    return allPossibleCharts
      .filter(chart => visibleSections[chart.id])
      .map(chart => ({
        ...chart,
        type: chartTypes[activeProject.id]?.[chart.id] || 'bar'
      }));
  }, [allPossibleCharts, visibleSections, chartTypes, activeProject?.id]);

  useEffect(() => {
    setMetricsPage(1);
    setBudgetPage(1);
  }, [activeProject?.id]);

  // Budget Table Data (Array of Arrays to support Handsontable Excel-like editing natively)
  const [budgetTableData, setBudgetTableData] = useState([
    ['Category', 'Department', 'Estimation', 'Approved', 'Utilized', 'Balance', 'Outlook Spend', 'Likely Cummulative Spend'],
    ['CAPEX', '', '', '', '', '', '', ''],
    ['Total CAPEX', '', '', '', '', '', '', ''],
    ['Revenue', '', '', '', '', '', '', ''],
    ['Total Revenue', '', '', '', '', '', '', '']
  ]);
  const [budgetPage, setBudgetPage] = useState(1);
  const [budgetItemsPerPage, setBudgetItemsPerPage] = useState(10);

  // Modal States
  const [showEditMilestones, setShowEditMilestones] = useState(false);
  const [showEditIssues, setShowEditIssues] = useState(false);
  const [showEditSummary, setShowEditSummary] = useState(false);
  const [editType, setEditType] = useState(null); // 'budget', 'resource', 'quality', 'budgetTable'

  // Form States
  const [milestoneForm, setMilestoneForm] = useState(null);
  const [issuesForm, setIssuesForm] = useState([]);
  const [summaryForm, setSummaryForm] = useState({});
  const [budgetTableForm, setBudgetTableForm] = useState([]);


  // Project Master Data
  const [masterProjects, setMasterProjects] = useState([]);
  const [selectedBudgetProject, setSelectedBudgetProject] = useState('');

  // Budget Modal Specific Edit States for Name & Status
  const [modalProjectName, setModalProjectName] = useState('');
  const [modalProjectStatus, setModalProjectStatus] = useState('');
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState('$');

  // Fetch Master Projects for dropdown
  useEffect(() => {
    const fetchMasterProjects = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/projects/');
        if (response.data) {
          setMasterProjects(response.data);
        }
      } catch (error) {
        console.error('Error fetching master projects:', error);
      }
    };
    fetchMasterProjects();
  }, []);

  // Sync selected budget project with activeProject initially
  useEffect(() => {
    if (activeProject && (activeProject.originalName || activeProject.name)) {
      setSelectedBudgetProject(activeProject.originalName || activeProject.name);
    }
  }, [activeProject]);

  const targetBudgetProject = selectedBudgetProject || (activeProject ? activeProject.name : null);

  const { data: budgetData, isLoading: isBudgetLoading } = useQuery({
    queryKey: ['budget', targetBudgetProject],
    queryFn: async () => {
      const { default: API } = await import('../utils/api');
      const response = await API.get(`/budget/${encodeURIComponent(targetBudgetProject)}`);
      return response.data || null;
    },
    enabled: !!targetBudgetProject,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (budgetData) {
      if (budgetData.budget_data && Array.isArray(budgetData.budget_data) && budgetData.budget_data.length > 0) {
        setBudgetTableData(budgetData.budget_data);
        setBudgetCurrency(budgetData.currency || '$');
      } else {
        // Reset to default
        setBudgetCurrency('$');
        setBudgetTableData([
          ['Category', 'Department', 'Estimation', 'Approved', 'Utilized', 'Balance', 'Outlook Spend', 'Likely Cummulative Spend'],
          ['CAPEX', '', '', '', '', '', '', ''],
          ['Total CAPEX', '', '', '', '', '', '', ''],
          ['Revenue', '', '', '', '', '', '', ''],
          ['Total Revenue', '', '', '', '', '', '', '']
        ]);
      }
    } else if (budgetData === null) {
      setBudgetCurrency('$');
      setBudgetTableData([
        ['Category', 'Department', 'Estimation', 'Approved', 'Utilized', 'Balance', 'Outlook Spend', 'Likely Cummulative Spend'],
        ['CAPEX', '', '', '', '', '', '', ''],
        ['Total CAPEX', '', '', '', '', '', '', ''],
        ['Revenue', '', '', '', '', '', '', ''],
        ['Total Revenue', '', '', '', '', '', '', '']
      ]);
    }
  }, [budgetData]);

  // Load submodule data from API
  const loadSubmoduleData = async (trackerId, force = false) => {
    if (!trackerId || trackerId === 'undefined' || trackerId === 'null') return;

    // Prevent multiple concurrent loads for the same trackerId
    if (submoduleLoading[trackerId]) return;

    // Prevent reloading if we already have the data (unless forced)
    if (!force) {
      if (submoduleData[trackerId] && !submoduleData[trackerId].failed) return;
      if (submoduleData[trackerId]?.failed) return; // Don't auto-retry if failed
    }

    try {
      setSubmoduleLoading(prev => ({ ...prev, [trackerId]: true }));
      const { default: API } = await import('../utils/api');
      const response = await API.get(`/datasets/${trackerId}/excel-view`);

      const sheet = response.data.fileData?.sheets?.[0] || {};
      const headers = sheet.headers || [];
      const data = sheet.data || [];

      setSubmoduleData(prev => ({
        ...prev,
        [trackerId]: {
          headers: headers,
          rows: Array.isArray(headers) ? data.map(rowArray => {
            const rowObj = {};
            headers.forEach((h, i) => {
              if (h) rowObj[h] = rowArray[i];
            });
            return rowObj;
          }) : [],
          error: null,
          failed: false
        }
      }));
    } catch (error) {
      console.error(`[ProjectDashboard] Failed to load submodule ${trackerId}:`, error);
      setSubmoduleData(prev => ({
        ...prev,
        [trackerId]: {
          rows: [],
          columns: [],
          error: error.response?.data?.detail || error.message,
          failed: true
        }
      }));
    } finally {
      setSubmoduleLoading(prev => ({ ...prev, [trackerId]: false }));
    }
  };

  // Handle data optimization logic (re-processing)
  const handleSubmoduleProcess = async (trackerId, indices) => {
    try {
      setLoading(true);
      const { default: API } = await import('../utils/api');
      const payload = indices && indices.length > 0 ? { row_indices: indices } : {};
      const response = await API.post(`/datasets/${trackerId}/process`, payload);

      console.log('Successfully processed submodule data for tracker:', trackerId);

      // Refresh the data to reflect updated types/headers
      await loadSubmoduleData(trackerId, true);

      // We also need to refresh the projects list because column metadata might have changed
      // which affects chart axis selection
      const datasetsResponse = await API.get('/datasets/');
      // (Optional: Implement a more targeted refresh if projects state is huge)

    } catch (error) {
      console.error('Error processing submodule data:', error);
      toast.error('Failed to optimize data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle local data updates from ExcelTableViewer to keep charts in sync
  const handleSubmoduleDataUpdate = async (trackerId, updatedRows, updatedHeaders) => {
    try {
      // Update local state first for immediate feedback
      setSubmoduleData(prev => ({
        ...prev,
        [trackerId]: {
          headers: updatedHeaders,
          rows: updatedRows
        }
      }));

      // Call API to persist changes
      const { default: API } = await import('../utils/api');
      await API.put(`/datasets/${trackerId}/data`, {
        headers: updatedHeaders,
        data: updatedRows
      });

      console.log('Successfully saved submodule data for tracker:', trackerId);
    } catch (error) {
      console.error('Error saving submodule data:', error);
      toast.error('Failed to save changes to the database. Please try again.');
    }
  };
  // Handle submodule data loading from URL
  useEffect(() => {
    if (submoduleId && activeProject) {
      const idToResolve = submoduleId;
      if (idToResolve) {
        // Find the submodule object
        let sub = activeProject.submodules?.find(s =>
          String(s.id) === String(idToResolve) ||
          String(s.trackerId) === String(idToResolve) ||
          `project-file-${s.trackerId}` === String(idToResolve)
        );

        if (!sub && activeProject.uploads) {
          const upload = activeProject.uploads.find(u =>
            String(u.upload_id) === String(idToResolve) ||
            `tracker-file-${u.upload_id}` === String(idToResolve)
          );
          if (upload) sub = { trackerId: upload.upload_id };
        }

        if (sub) {
          // Use the real numeric trackerId for the API call
          const realTrackerId = sub.trackerId || sub.id;
          // If it's still a string starting with 'module-', we might need to parse it 
          // or handle it differently, but usually sub.trackerId is the numeric ID.
          loadSubmoduleData(realTrackerId);
        } else {
          console.warn(`[ProjectDashboard] Submodule ${idToResolve} not found in project ${activeProject.name}. Clearing URL.`);
          setSearchParams(params => {
            params.delete('submoduleId');
            return params;
          });
        }
      }
    }
  }, [submoduleId, activeProject]); // Removed submoduleData to stop infinite loop

  // Handle selected file ID prop from Dashboard (Sidebar)
  useEffect(() => {
    if (selectedFileId && projects.length > 0) {
      // Find the project and submodule
      for (const project of projects) {
        let fileMatch = project.submodules?.find(s =>
          s.trackerId === selectedFileId ||
          `project-file-${s.trackerId}` === selectedFileId ||
          s.id === selectedFileId
        );

        if (!fileMatch && project.uploads) {
          const upload = project.uploads.find(u =>
            String(u.upload_id) === String(selectedFileId) ||
            `tracker-file-${u.upload_id}` === String(selectedFileId)
          );
          if (upload) {
            fileMatch = { id: `tracker-file-${upload.upload_id}`, trackerId: upload.upload_id };
          }
        }

        if (fileMatch) {
          const newProjectId = project.id;
          const newSubmoduleId = String(fileMatch.id || fileMatch.trackerId);
          const currentProjectId = searchParams.get('projectId');
          const currentSubmoduleId = searchParams.get('submoduleId');

          if (currentProjectId !== newProjectId || currentSubmoduleId !== newSubmoduleId) {
            setSearchParams(prev => {
              prev.set('projectId', newProjectId);
              prev.set('submoduleId', newSubmoduleId);
              prev.delete('configure');
              prev.delete('preview');
              return prev;
            });
          }
          break;
        }
      }
    }
  }, [selectedFileId, projects, searchParams, setSearchParams]);

  // Handle submodule click
  const handleSubmoduleClick = (submodule) => {
    if (!submodule || (!submodule.id && !submodule.trackerId)) return;
    setSearchParams(prev => {
      prev.set('submoduleId', submodule.id || submodule.trackerId);
      return prev;
    });
    if (submodule.trackerId) {
      loadSubmoduleData(submodule.trackerId);
    }
  };

  // Handle back to project dashboard
  const handleBackToProjectDashboard = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('submoduleId');
      return next;
    });
    // Also clear selectedProjectFileId from Redux to stay in sync
    dispatch(setSelectedProjectFileId(null));
  };

  // Handle project selection
  const handleProjectSelect = (projectId) => {
    // Look up by ID or Name for robustness
    const selectedProject = projects.find(p => p.id === projectId || p.name === projectId);

    if (selectedProject?.dashboardConfig) {
      setSearchParams({ projectId: selectedProject.id });
      setVisibleSections({
        metricsSummary: true,
        milestones: true,
        criticalIssues: true,
        budget: true,
        resource: true,
        quality: true,
        design: true,
        partDevelopment: true,
        build: true,
        gateway: true,
        validation: true,
        qualityIssues: true,
        sopTables: false,
        ...(selectedProject.dashboardConfig.visibleSections || {})
      });
    } else if (selectedProject) {
      // If no config, go straight to configure modal
      // We use push here because it's a new "page" transition from the list
      setSearchParams({ projectId: selectedProject.id, configure: 'true' });
    }
  };

  // Lazy-load data for visible charts or selected submodule
  useEffect(() => {
    if (activeProject) {
      const visibleTrackerIds = [
        ...allMetricCharts.map(c => c.trackerId),
        selectedSubmodule?.trackerId
      ].filter(Boolean);

      const uniqueTrackerIds = [...new Set(visibleTrackerIds)];

      uniqueTrackerIds.forEach(trackerId => {
        const data = submoduleData[trackerId];
        const isLoading = submoduleLoading[trackerId];

        if (!data && !isLoading) {
          loadSubmoduleData(trackerId);
        } else if (data && data.rows.length === 0 && !data.failed && !isLoading) {
          loadSubmoduleData(trackerId);
        }
      });
    }
  }, [activeProject, allMetricCharts, selectedSubmodule]);

  // Handle apply dashboard configuration
  const handleApplyDashboardConfig = async () => {
    if (activeProject) {
      const configToSave = {
        visibleSections: tempVisibleSections,
        chartTypes: chartTypes[activeProject.id] || {},
        axisConfigs: axisConfigs[activeProject.id] || {}
      };

      try {
        const { default: API } = await import('../utils/api');
        await API.patch(`/projects/${activeProject.dbProjectId}/config`, {
          dashboard_config: configToSave
        });

        // Update project with dashboard config in global store
        dispatch(updateProjectConfig({
          projectId: activeProject.id,
          config: configToSave
        }));

        // Commit buffer to live state
        setVisibleSections(tempVisibleSections);
        setShowSimulateModal(false);
        console.log('Dashboard configuration saved successfully');
      } catch (error) {
        console.error('Error saving dashboard configuration:', error);
        toast.error('Failed to save dashboard configuration. Please try again.');
      }
    }
  };

  // Handle back to projects list
  const handleBackToProjects = () => {
    setSearchParams({}); // Clear all params to go back to list
    // Reset visible sections to empty state
    setVisibleSections({
      milestones: false,
      criticalIssues: false,
      budget: false,
      resource: false,
      quality: false,
      design: false,
      partDevelopment: false,
      build: false,
      gateway: false,
      validation: false,
      qualityIssues: false,
      sopTables: false
    });
    window.dispatchEvent(new CustomEvent('resetProjectDashboardMain'));
  };

  // Handle cancel configuration
  const handleCancelConfig = () => {
    if (activeProject && !activeProject.dashboardConfig) {
      handleBackToProjects();
    } else if (activeProject && activeProject.dashboardConfig) {
      setVisibleSections({
        metricsSummary: true,
        milestones: true,
        criticalIssues: true,
        budget: true,
        resource: true,
        quality: true,
        design: true,
        partDevelopment: true,
        build: true,
        gateway: true,
        validation: true,
        qualityIssues: true,
        sopTables: false,
        ...(activeProject.dashboardConfig.visibleSections || {})
      });
    }
    setShowSimulateModal(false);
  };

  // Handle chart type change
  const handleChartTypeChange = async (chartId, newType) => {
    if (activeProject) {
      const projectTypes = chartTypes[activeProject.id] || {};
      const updatedTypes = {
        ...projectTypes,
        [chartId]: newType
      };

      setChartTypes(prev => ({
        ...prev,
        [activeProject.id]: updatedTypes
      }));

      try {
        const { default: API } = await import('../utils/api');
        const configToSave = {
          visibleSections,
          chartTypes: updatedTypes,
          axisConfigs: axisConfigs[activeProject.id] || {}
        };

        await API.patch(`/projects/${activeProject.dbProjectId}/config`, {
          dashboard_config: configToSave
        });

        // Persist to Redux
        dispatch(updateProjectConfig({
          projectId: activeProject.id,
          config: configToSave
        }));
      } catch (error) {
        console.error('Error saving chart type:', error);
      }
    }
  };

  // Handle axis configuration change
  const handleAxesUpdate = async (chartId, xAxis, yAxis, derivedConfig = null) => {
    if (activeProject) {
      const projectAxes = axisConfigs[activeProject.id] || {};
      const updatedAxes = {
        ...projectAxes,
        [chartId]: {
          xAxis,
          yAxis,
          derivedConfig
        }
      };

      setAxisConfigs(prev => ({
        ...prev,
        [activeProject.id]: updatedAxes
      }));

      // If we have a derived metric, default the chart type to 'bar'
      let updatedChartTypes = chartTypes[activeProject.id] || {};
      if (derivedConfig) {
        updatedChartTypes = { ...updatedChartTypes, [chartId]: 'bar' };
        setChartTypes(prev => ({
          ...prev,
          [activeProject.id]: updatedChartTypes
        }));
      }

      try {
        const { default: API } = await import('../utils/api');
        const configToSave = {
          visibleSections,
          chartTypes: updatedChartTypes,
          axisConfigs: updatedAxes
        };

        await API.patch(`/projects/${activeProject.dbProjectId}/config`, {
          dashboard_config: configToSave
        });

        // Persist to Redux
        dispatch(updateProjectConfig({
          projectId: activeProject.id,
          config: configToSave
        }));
      } catch (error) {
        console.error('Error saving axis configuration:', error);
      }
    }
  };

  // Handle maximize chart
  const handleMaximize = (chartId) => {
    setMaximizedChart(chartId);
  };

  // Handle close maximize
  const handleCloseMaximize = () => {
    setMaximizedChart(null);
  };

  // Toggle axis selector
  const toggleAxisSelector = (chartId) => {
    setShowAxisSelector(showAxisSelector === chartId ? null : chartId);
  };

  // Handle section visibility toggle - MODIFIED to use buffer
  const handleSectionVisibilityToggle = (section) => {
    setTempVisibleSections(prev => {
      const next = { ...prev, [section]: !prev[section] };

      // Auto-enable metricsSummary section if any chart is selected
      const defaultPhases = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
      const isChart = defaultPhases.includes(section) || section.startsWith('upload-');

      if (isChart && next[section]) {
        next.metricsSummary = true;
      }

      return next;
    });
  };

  // Handle select all sections for visibility
  const handleSelectAllVisibility = () => {
    const dynamicTrackerKeys = [
      ...(activeProject?.submodules || []).map(sub => sub.id),
      ...(activeProject?.uploads || []).map(u => `upload-${u.file_name}`)
    ];

    const availableSectionKeys = [
      'milestones', 'criticalIssues', 'metricsSummary',
      'budget', 'resource', 'quality',
      ...['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'],
      ...dynamicTrackerKeys
    ].filter(key => {
      if (['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].includes(key)) {
        return availablePhases[key];
      }
      if (key === 'milestones') return !!(dashboardData?.milestones?.length > 0);
      if (key === 'criticalIssues') return !!(criticalIssues?.length > 0);
      if (key === 'budget') return (budgetTableData || []).some((row, i) => {
        if (Array.isArray(row)) return i > 0 && row.slice(2).some(v => parseNum(v) !== 0);
        return row && typeof row === 'object' && Object.values(row).some(v => parseNum(v) !== 0);
      });
      return true;
    });

    const allSelectedInLogic = availableSectionKeys.every(key => tempVisibleSections[key]);
    const setTarget = !allSelectedInLogic;

    // Create new object, taking care to not turn on unavailable ones
    const newVisibleSections = { ...tempVisibleSections };

    // Apply target to all available keys
    availableSectionKeys.forEach(key => {
      newVisibleSections[key] = setTarget;
    });

    // Also handle keys that might be in tempVisibleSections but not in current availableSectionKeys
    // (e.g. dynamic trackers from other projects). If we are deselecting all, we should probably
    // clear everything to be safe, or just stick to available ones.
    // Let's stick to available ones to avoid accidentally clearing hidden config.

    setTempVisibleSections(newVisibleSections);
  };


  // Handle section selection for email
  const handleSectionToggle = (section) => {
    setEmailData(prev => ({
      ...prev,
      selectedSections: {
        ...prev.selectedSections,
        [section]: !prev.selectedSections[section]
      }
    }));
  };

  // Handle select all sections for email
  const handleSelectAll = () => {
    const availableSectionKeys = Object.keys(emailData.selectedSections).filter(key => {
      const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
      if (metricKeys.includes(key)) return availablePhases[key];
      return true;
    });

    const allSelected = availableSectionKeys.every(key => emailData.selectedSections[key]);
    const setTarget = !allSelected;

    const newSelectedSections = { ...emailData.selectedSections };
    Object.keys(emailData.selectedSections).forEach(key => {
      if (availableSectionKeys.includes(key)) {
        newSelectedSections[key] = setTarget;
      } else {
        newSelectedSections[key] = false;
      }
    });

    setEmailData(prev => ({
      ...prev,
      selectedSections: newSelectedSections
    }));
  };

  // Handle email input change
  const handleEmailInputChange = (index, value, type) => {
    const newInputs = [...emailData[`${type}Inputs`]];
    newInputs[index] = value;

    // Add new empty input if this is the last one and not empty
    if (index === newInputs.length - 1 && value.trim() !== '') {
      newInputs.push('');
    }

    setEmailData(prev => ({
      ...prev,
      [`${type}Inputs`]: newInputs
    }));
  };

  // Add contact from list
  const addContactFromList = (email, type) => {
    const inputs = emailData[`${type}Inputs`];
    // Check if email already exists
    if (!inputs.includes(email) && email.trim() !== '') {
      const newInputs = [...inputs];
      // Replace empty last input or add new
      if (newInputs[newInputs.length - 1] === '') {
        newInputs[newInputs.length - 1] = email;
        newInputs.push('');
      } else {
        newInputs.push(email);
        newInputs.push('');
      }

      setEmailData(prev => ({
        ...prev,
        [`${type}Inputs`]: newInputs
      }));
    }

    // Clear search and close dropdown
    setEmployeeSearchTerm('');
    setShowEmployeeDropdown(false);
  };

  // Remove email input
  const removeEmailInput = (index, type) => {
    const newInputs = emailData[`${type}Inputs`].filter((_, i) => i !== index);
    setEmailData(prev => ({
      ...prev,
      [`${type}Inputs`]: newInputs.length ? newInputs : ['']
    }));
  };



  // Capture chart images and open PDF preview
  const handleOpenPdfPreview = () => {
    const capturedImages = {};
    Object.keys(chartRefs.current).forEach(id => {
      const instance = chartRefs.current[id]?.getEchartsInstance();
      if (instance) {
        capturedImages[id] = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      }
    });
    setPdfChartImages(capturedImages);

    // Sync current visible sections to PDF preview
    setEmailData(prev => ({
      ...prev,
      selectedSections: {
        ...prev.selectedSections,
        ...visibleSections
      }
    }));

    setShowPdfPreview(true);
  };

  const getVisiblePhaseList = () => {
    return [
      { id: 'design', label: 'Design' },
      { id: 'partDevelopment', label: 'Part Development' },
      { id: 'build', label: 'Build' },
      { id: 'gateway', label: 'Gateway' },
      { id: 'validation', label: 'Validation' },
      { id: 'qualityIssues', label: 'Quality Issues' },
      ...(activeProject?.submodules || []).map(sub => ({ id: sub.id, label: sub.displayName || sub.name, isDynamic: true }))
    ].filter((phase, index, self) => {
      const isDuplicate = self.findIndex(p => p.id === phase.id) !== index;
      if (isDuplicate) return false;

      if (phase.isDynamic) {
        const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
        const isAlreadyMapped = defaultIds.some(id => {
          const tracker = getTrackerForPhase(id);
          return tracker && tracker.id === phase.id;
        });
        if (isAlreadyMapped) return false;
      }

      return visibleSections?.[phase.id] && availablePhases?.[phase.id];
    });
  };

  const handleExportPdf = async () => {
    try {
      setLoading(true);
      const capturedImages = {};
      Object.keys(chartRefs.current).forEach(id => {
        const instance = chartRefs.current[id]?.getEchartsInstance();
        if (instance) {
          capturedImages[id] = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        }
      });

      const budgetStatus = masterProjects?.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active';
      const visiblePhaseList = getVisiblePhaseList();

      const { default: ReportDocumentModule } = await import('../components/ReportDocument');
      const blob = await pdf(
        <ReportDocumentModule
          activeProject={activeProject}
          milestones={milestones}
          criticalIssues={criticalIssues}
          sopData={sopData}
          summaryData={summaryData}
          visibleSections={visibleSections}
          visiblePhaseList={visiblePhaseList}
          budgetTableData={budgetTableData}
          budgetCurrency={budgetCurrency}
          budgetStatus={budgetStatus}
          chartImages={capturedImages}
          sectionOrder={['criticalIssues', 'budget', 'resource', 'quality', 'charts']}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeProject?.name || 'Project'}_Dashboard_Report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF Export Failure:', error);
      toast.error('Failed to export PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    const toEmails = emailData.emailInputs.filter(email => email.trim() !== '');
    const ccEmails = emailData.ccInputs.filter(email => email.trim() !== '');
    const bccEmails = emailData.bccInputs.filter(email => email.trim() !== '');

    if (toEmails.length === 0) {
      toast.error("At least one recipient (To) is required.");
      return;
    }

    const isConfirmed = await confirm({
      title: 'Send Project Report',
      description: 'A PDF of the current dashboard will be generated and emailed to the selected recipients.',
      confirmText: 'Send',
      cancelText: 'Cancel'
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setLoading(true);

      // Tier 3: Pre-capture all live echarts into base64 images BEFORE switching to PDF mode
      const capturedImages = {};
      Object.keys(chartRefs.current).forEach(id => {
        const instance = chartRefs.current[id]?.getEchartsInstance();
        if (instance) {
          capturedImages[id] = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        }
      });

      const budgetStatus = masterProjects?.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active';
      const visiblePhaseList = getVisiblePhaseList();

      const { default: ReportDocumentModule } = await import('../components/ReportDocument');
      const blob = await pdf(
        <ReportDocumentModule
          activeProject={activeProject}
          milestones={milestones}
          criticalIssues={criticalIssues}
          sopData={sopData}
          summaryData={summaryData}
          visibleSections={visibleSections}
          visiblePhaseList={visiblePhaseList}
          budgetTableData={budgetTableData}
          budgetCurrency={budgetCurrency}
          budgetStatus={budgetStatus}
          chartImages={capturedImages}
          sectionOrder={['criticalIssues', 'budget', 'resource', 'quality', 'charts']}
        />
      ).toBlob();

      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const base64Pdf = await base64Promise;

      const { default: API } = await import('../utils/api');

      const payload = {
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : [],
        bcc: bccEmails.length > 0 ? bccEmails : [],
        subject: emailData.subject || 'Project Status Report',
        message: emailData.message || 'Please find the attached professional project report.',
        attachment: base64Pdf
      };

      await API.post('/email/send', payload);
      toast.success('Strategic Report successfully dispatched!');

      setShowEmailModal(false);
    } catch (error) {
      console.error('Email Dispatch Failure:', error);
      toast.error('Failed to send report.');
    } finally {
      setLoading(false);
    }
  };

  // Render table for submodule data
  const renderSubmoduleTable = (data, fileName, trackerIdArg = null) => {
    const tId = trackerIdArg || selectedSubmodule?.trackerId;
    const isSubmoduleLoading = tId ? (submoduleLoading[tId] || !submoduleData[tId]) : false;

    if (isSubmoduleLoading) {
      return (
        <div style={{ padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton className="h-6 w-48" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <th key={`header-${idx}`} style={{ padding: '12px', textAlign: 'left' }}>
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, rIdx) => (
                  <tr key={`row-${rIdx}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {Array.from({ length: 5 }).map((_, cIdx) => {
                      const widths = ['w-12', 'w-16', 'w-24', 'w-32', 'w-20'];
                      const widthClass = widths[(rIdx + cIdx) % widths.length];
                      return (
                        <td key={`cell-${cIdx}`} style={{ padding: '12px' }}>
                          <Skeleton className={`h-4 ${widthClass}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // If it's a module from dashboard, data comes from dashboardData.milestones
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          No data available for this submodule
        </div>
      );
    }

    // Handle different data formats
    let rows = [];
    let columns = [];

    if (Array.isArray(data)) {
      rows = data;
      if (data.length > 0) {
        columns = Object.keys(data[0]);
      }
    } else if (data.data && Array.isArray(data.data)) {
      rows = data.data;
      if (data.columns) {
        columns = data.columns;
      } else if (data.data.length > 0) {
        columns = Object.keys(data.data[0]);
      }
    } else if (data.rows && Array.isArray(data.rows)) {
      rows = data.rows;
      if (data.headers) {
        columns = data.headers;
      } else if (data.rows.length > 0) {
        columns = Object.keys(data.rows[0]);
      }
    }

    if (rows.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          No data rows available
        </div>
      );
    }

    return (
      <ExcelTableViewer
        key={`excel-viewer-${tId || fileName}`}
        columns={columns}
        data={rows}
        fileName={fileName || 'Dataset'}
        onDataUpdate={tId ? (updatedRows, updatedHeaders) => handleSubmoduleDataUpdate(tId, updatedRows, updatedHeaders) : null}
        onProcessData={tId ? (indices) => handleSubmoduleProcess(tId, indices) : null}
        onRefresh={tId ? () => loadSubmoduleData(tId, true) : () => loadDashboard(selectedProjectId, selectedFileId?.replace('module-', '').replace(/^\d+-/, ''))}
        loading={loading}
      />
    );
  };

  const renderSimulateModal = () => {
    if (!showSimulateModal) return null;

    const hasMilestones = !!(dashboardData?.milestones?.length > 0);
    const hasCriticalIssues = !!(criticalIssues?.length > 0);
    const hasBudgetData = (budgetTableData || []).some((row, i) => {
      if (Array.isArray(row)) return i > 0 && row.slice(2).some(v => parseNum(v) !== 0);
      return row && typeof row === 'object' && Object.values(row).some(v => parseNum(v) !== 0);
    });

    const dynamicTrackerKeys = [
      ...(activeProject?.submodules || []).map(sub => sub.id),
      ...(activeProject?.uploads || []).map(u => `upload-${u.file_name}`)
    ];

    const availableSectionKeys = [
      hasMilestones && 'milestones',
      hasCriticalIssues && 'criticalIssues',
      hasBudgetData && 'budget',
      'metricsSummary',
      ...['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].filter(id => availablePhases[id]),
      ...dynamicTrackerKeys
    ].filter(Boolean);

    const allSelected = availableSectionKeys.every(key => tempVisibleSections[key]);


    return (
      <Modal
        isOpen={showSimulateModal}
        onClose={handleCancelConfig}
        title={`Configure Dashboard - ${activeProject?.name}`}
        description="Select which sections to display in the dashboard. Unchecked sections will be hidden."
        size="2xl"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <button
              onClick={handleCancelConfig}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyDashboardConfig}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Apply to {activeProject?.name}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dashboard Sections:</h3>
          <button
            onClick={handleSelectAllVisibility}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid var(--accent)',
              backgroundColor: allSelected ? 'var(--accent)' : 'var(--surface)',
              color: allSelected ? 'white' : 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px' }}>
          {hasMilestones && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: tempVisibleSections.milestones ? 'var(--blue-50)' : 'var(--surface)' }}>
              <input type="checkbox" checked={tempVisibleSections.milestones || false} onChange={() => handleSectionVisibilityToggle('milestones')} />
              <span style={{ fontWeight: '600' }}>Project Milestones</span>
            </label>
          )}
          {hasCriticalIssues && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: tempVisibleSections.criticalIssues ? 'var(--blue-50)' : 'var(--surface)' }}>
              <input type="checkbox" checked={tempVisibleSections.criticalIssues || false} onChange={() => handleSectionVisibilityToggle('criticalIssues')} />
              <span style={{ fontWeight: '600' }}>Critical Issues</span>
            </label>
          )}
          {hasBudgetData && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: tempVisibleSections.budget ? 'var(--blue-50)' : 'var(--surface)' }}>
              <input type="checkbox" checked={tempVisibleSections.budget || false} onChange={() => handleSectionVisibilityToggle('budget')} />
              <span style={{ fontWeight: '600' }}>Budget Summary</span>
            </label>
          )}

          <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            background: tempVisibleSections.metricsSummary ? 'var(--blue-50)' : 'var(--surface)',
            overflow: 'hidden'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input type="checkbox" checked={tempVisibleSections.metricsSummary || false} onChange={() => handleSectionVisibilityToggle('metricsSummary')} />
              <span style={{ fontWeight: '600' }}>Project Metrics Summary</span>
            </label>

            {tempVisibleSections.metricsSummary && (
              <div style={{
                padding: '12px 12px 12px 40px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                {allPossibleCharts.map(chart => {
                  const hasData = submoduleData[chart.trackerId]?.rows?.length > 0;
                  return (
                    <label key={chart.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', position: 'relative' }}>
                      <input
                        type="checkbox"
                        checked={tempVisibleSections[chart.id] || false}
                        onChange={() => handleSectionVisibilityToggle(chart.id)}
                      />
                      <span style={{ color: hasData ? 'inherit' : 'var(--text-muted)' }}>{chart.title}</span>
                      {!hasData && (
                        <span style={{ fontSize: '9px', backgroundColor: 'var(--elevated-card)', color: 'var(--text-secondary)', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                          NO DATA
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Preview of visible sections */}
        <div style={{
          marginTop: '20px',
          backgroundColor: 'var(--bg)',
          padding: '15px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Dashboard Preview:</h4>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(tempVisibleSections)
                .filter(([section, selected]) => {
                  const topLevelSections = ['milestones', 'criticalIssues', 'budget', 'resource', 'quality', 'metricsSummary'];
                  return selected && topLevelSections.includes(section);
                })
                .map(([section]) => {
                  const labels = {
                    milestones: 'Project Milestones',
                    criticalIssues: 'MOM Issues',
                    budget: 'Budget Summary',
                    resource: 'Resource Summary',
                    quality: 'Quality Summary',
                    metricsSummary: 'Project Metrics Summary'
                  };

                  let displayLabel = labels[section] || section;

                  if (section === 'metricsSummary') {
                    const chartCount = allPossibleCharts.filter(c => tempVisibleSections[c.id]).length;
                    displayLabel = `Project Metrics Summary (${chartCount} charts)`;
                  }

                  return (
                    <span key={section} style={{
                      padding: '4px 10px',
                      backgroundColor: 'var(--blue-50)',
                      color: 'var(--blue-900)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {displayLabel}
                    </span>
                  );
                })}

            </div>
            {Object.values(tempVisibleSections).filter(v => v).length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                No sections selected - dashboard will be empty
              </div>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>
            Total visible sections: {availableSectionKeys.filter(key => tempVisibleSections[key]).length}
          </div>
        </div>
      </Modal>
    );
  };

  // Edit Milestones Modal Component
  const renderEditMilestonesModal = () => {
    if (!showEditMilestones) return null;

    const handleSave = () => {
      setMilestones([milestoneForm]);
      setShowEditMilestones(false);
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <span>Edit Project Milestones</span>
            <button onClick={() => setShowEditMilestones(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--elevated-card)' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)', width: '80px' }}>Type</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 1</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 2</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 3</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 4</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 5</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Gate 6</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Implementation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid var(--border-subtle)', fontWeight: 'bold', backgroundColor: 'var(--bg)' }}>PLAN</td>
                    {['a', 'b', 'c', 'd', 'e', 'f'].map(char => (
                      <td key={char} style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <input
                          type="text"
                          value={milestoneForm.plan[char]}
                          onChange={(e) => {
                            const newForm = { ...milestoneForm };
                            newForm.plan[char] = e.target.value;
                            setMilestoneForm(newForm);
                          }}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={milestoneForm.plan.implementation}
                        onChange={(e) => {
                          const newForm = { ...milestoneForm };
                          newForm.plan.implementation = e.target.value;
                          setMilestoneForm(newForm);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid var(--border-subtle)', fontWeight: 'bold', backgroundColor: 'var(--bg)' }}>ACTUAL</td>
                    {['a', 'b', 'c', 'd', 'e', 'f'].map(char => (
                      <td key={char} style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <input
                          type="text"
                          value={milestoneForm.actual[char]}
                          onChange={(e) => {
                            const newForm = { ...milestoneForm };
                            newForm.actual[char] = e.target.value;
                            setMilestoneForm(newForm);
                          }}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                      <input
                        type="text"
                        value={milestoneForm.actual.implementation}
                        onChange={(e) => {
                          const newForm = { ...milestoneForm };
                          newForm.actual.implementation = e.target.value;
                          setMilestoneForm(newForm);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '15px' }}>
              <button onClick={() => setShowEditMilestones(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Issues Modal Component
  const renderEditIssuesModal = () => {
    if (!showEditIssues) return null;

    const handleSave = () => {
      setCriticalIssues(issuesForm);
      setShowEditIssues(false);
    };

    const addIssue = () => {
      const newIssue = {
        id: Date.now(),
        issue: 'New Issue',
        responsibility: '',
        function: '',
        targetDate: new Date().toISOString().split('T')[0],
        status: 'Open'
      };
      setIssuesForm([...issuesForm, newIssue]);
    };

    const removeIssue = (id) => {
      setIssuesForm(issuesForm.filter(issue => issue.id !== id));
    };

    const updateIssue = (id, field, value) => {
      setIssuesForm(issuesForm.map(issue =>
        issue.id === id ? { ...issue, [field]: value } : issue
      ));
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <span>Edit Critical Issues</span>
            <button onClick={() => setShowEditIssues(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <button onClick={addIssue} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Plus className="h-4 w-4" /> Add Issue
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--elevated-card)' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>Issue Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)', width: '120px' }}>Responsibility</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)', width: '120px' }}>Function</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)', width: '100px' }}>Target Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--border-subtle)', width: '100px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid var(--border-subtle)', width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issuesForm.map((issue) => (
                    <tr key={issue.id}>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <textarea
                          value={issue.issue}
                          onChange={(e) => updateIssue(issue.id, 'issue', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', resize: 'vertical', minHeight: '40px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <input
                          type="text"
                          value={issue.responsibility}
                          onChange={(e) => updateIssue(issue.id, 'responsibility', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <input
                          type="text"
                          value={issue.function}
                          onChange={(e) => updateIssue(issue.id, 'function', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <input
                          type="date"
                          value={issue.targetDate}
                          onChange={(e) => updateIssue(issue.id, 'targetDate', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '11px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)' }}>
                        <select
                          value={issue.status}
                          onChange={(e) => updateIssue(issue.id, 'status', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ padding: '5px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <button onClick={() => removeIssue(issue.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '15px' }}>
              <button onClick={() => setShowEditIssues(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate Budget Table totals and derived columns
  const calculateBudgetTable = (table) => {
    if (!table || table.length === 0) return table;
    const newTable = table.map(row => [...row]);

    let totals = {
      CAPEX: { estimation: 0, approved: 0, utilized: 0, balance: 0, outlook: 0, likely: 0 },
      Revenue: { estimation: 0, approved: 0, utilized: 0, balance: 0, outlook: 0, likely: 0 },
      "Total CAPEX": null, // markers
      "Total Revenue": null
    };


    const formatNum = (num, forceFormat = false) => {
      if (num === 0 && !forceFormat) return '';
      return format(num);
    };

    let currentCategory = null;

    for (let i = 1; i < newTable.length; i++) {
      const category = String(newTable[i][0] || '').trim();

      if (category === 'CAPEX' || category === 'Revenue') {
        currentCategory = category;
        // Do NOT continue here, allow data extraction simultaneously
      }

      if (category.startsWith('Total')) {
        const cat = category.replace('Total', '').trim();
        if (totals[cat]) {
          newTable[i][2] = formatNum(totals[cat].estimation);
          newTable[i][3] = formatNum(totals[cat].approved);
          newTable[i][4] = formatNum(totals[cat].utilized);
          newTable[i][5] = formatNum(totals[cat].balance);
          newTable[i][6] = formatNum(totals[cat].outlook);
          newTable[i][7] = formatNum(totals[cat].likely);
        }
        currentCategory = null;
        continue;
      }

      // It's a data row
      const estimation = parseNum(newTable[i][2]);
      const approved = parseNum(newTable[i][3]);
      const utilized = parseNum(newTable[i][4]);
      const balance = approved - utilized;
      const outlook = parseNum(newTable[i][6]);
      const likely = utilized + outlook;

      // Auto-update derived values if there's any active value
      if (approved !== 0 || utilized !== 0 || outlook !== 0 || newTable[i][3] || newTable[i][4] || newTable[i][6]) {
        newTable[i][5] = formatNum(balance);
        newTable[i][7] = formatNum(likely);
      }

      if (currentCategory && totals[currentCategory]) {
        totals[currentCategory].estimation += estimation;
        totals[currentCategory].approved += approved;
        totals[currentCategory].utilized += utilized;
        totals[currentCategory].balance += balance;
        totals[currentCategory].outlook += outlook;
        totals[currentCategory].likely += likely;
      }
    }

    return newTable;
  };

  // Edit Summary Modal Component
  const renderEditSummaryModal = () => {
    if (!showEditSummary) return null;

    const handleSave = async () => {
      if (editType === 'budgetTable') {
        const calculatedForm = calculateBudgetTable(budgetTableForm);
        const targetProject = modalProjectName.trim() || selectedBudgetProject || (activeProject ? activeProject.name : null);

        if (targetProject) {
          try {
            const { default: API } = await import('../utils/api');

            // 1. Save Budget Data
            await API.post(`/budget/${encodeURIComponent(targetProject)}`, {
              project_name: targetProject,
              currency: budgetCurrency,
              budget_data: calculatedForm
            });

            // 2. Sync to Project Master Database
            const existingMaster = masterProjects.find(p => p.name === targetProject);
            if (existingMaster) {
              await API.put(`/projects/${existingMaster.id}`, {
                name: targetProject,
                status: modalProjectStatus || existingMaster.status || 'Active',
                manager: existingMaster.manager || 'Unassigned',
                budget: existingMaster.budget || 0.0,
                teamSize: existingMaster.teamSize || 0
              });
            } else {
              await API.post(`/projects/`, {
                name: targetProject,
                status: modalProjectStatus || 'Active',
                manager: 'Unassigned',
                budget: 0.0,
                teamSize: 0
              });
            }

            // Refresh Master Project list
            const pRes = await API.get('/projects/');
            setMasterProjects(pRes.data);

            // Update Dashboard UI context to the explicitly saved project
            setSelectedBudgetProject(targetProject);
            setBudgetTableData(calculatedForm);

            // Extract grand totals for summaryData to ensure PDF is updated
            let totalApproved = 0;
            let totalUtilized = 0;
            calculatedForm.forEach(row => {
              if (row[0] && String(row[0]).startsWith('Total')) {
                totalApproved += parseNum(row[3]);
                totalUtilized += parseNum(row[4]);
              }
            });
            const totalBalance = totalApproved - totalUtilized;
            const totalOutlook = totalApproved > 0 ? Math.round((totalUtilized / totalApproved) * 100) : 0;

            setSummaryData(prev => ({
              ...prev,
              budgetApproved: totalApproved,
              budgetUtilized: totalUtilized,
              budgetBalance: totalBalance,
              budgetOutlook: totalOutlook
            }));

            setShowSaveNotification(true);
            setTimeout(() => setShowSaveNotification(false), 3000);

          } catch (error) {
            console.error('Error saving budget/project data to backend:', error);
          }
        }
      } else {
        setSummaryData(summaryForm);
      }
      setShowEditSummary(false);
    };

    if (editType === 'budgetTable') {
      const updateValue = (rIdx, cIdx, val) => {
        const newForm = [...budgetTableForm];
        newForm[rIdx] = [...newForm[rIdx]];
        newForm[rIdx][cIdx] = val;
        setBudgetTableForm(calculateBudgetTable(newForm));
      };

      const addDepartmentRow = (categoryIndex) => {
        const newForm = [...budgetTableForm];
        newForm.splice(categoryIndex, 0, ['', 'New Dept', '', '', '', '', '', '']);
        setBudgetTableForm(calculateBudgetTable(newForm));
      };

      const handleCurrencyChange = (newCurr) => {
        // Shifted to follow global currency, but keeping this for local overrides if needed
        // however, we'll sync it with useCurrency's symbol
        setBudgetCurrency(newCurr);
        const updatedTable = budgetTableForm.map((row, rIdx) => {
          if (rIdx === 0) return row;
          return row.map((cell, cIdx) => {
            if (cIdx >= 2) {
              const num = parseNum(cell);
              if (num === 0 && (!cell || cell.toString().trim() === '')) return '';
              return format(num);
            }
            return cell;
          });
        });
        setBudgetTableForm(calculateBudgetTable(updatedTable));
      };

      const delRow = (i) => {
        const row = budgetTableForm[i];
        if (row && (row[0] === 'CAPEX' || row[0] === 'Revenue' || row[0].startsWith('Total') || row[0] === 'Category')) {
          return; // Don't delete fixed headers/totals
        }
        setBudgetTableForm(calculateBudgetTable(budgetTableForm.filter((_, idx) => idx !== i)));
      };

      const headers = budgetTableForm[0] || [];
      const rows = budgetTableForm.slice(1);

      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '12px', width: '95vw', maxWidth: '1200px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Budget Summary</span>
              </div>
              <button onClick={() => setShowEditSummary(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' }} className="hover:bg-slate-700">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg)' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Project Name:</span>
                  <input
                    type="text"
                    value={modalProjectName}
                    onChange={e => setModalProjectName(e.target.value)}
                    style={{ border: 'none', color: 'var(--accent)', fontWeight: '800', fontSize: '14px', outline: 'none', width: '180px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Status:</span>
                  <select
                    value={modalProjectStatus}
                    onChange={e => setModalProjectStatus(e.target.value)}
                    style={{ border: 'none', color: '#10b981', fontWeight: '800', fontSize: '14px', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                  >
                    <option style={{ color: 'black' }} value="Planning">Planning</option>
                    <option style={{ color: 'black' }} value="Active">Active</option>
                    <option style={{ color: 'black' }} value="In Progress">In Progress</option>
                    <option style={{ color: 'black' }} value="Completed">Completed</option>
                    <option style={{ color: 'black' }} value="On Hold">On Hold</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>System Currency:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '14px' }}>{symbol}</span>
                </div>
                <div style={{ flex: 1 }}></div>

                <button
                  onClick={() => addDepartmentRow(budgetTableForm.findIndex(r => r[0] === 'Total CAPEX'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Plus size={16} /> ADD CAPEX
                </button>
                <button
                  onClick={() => addDepartmentRow(budgetTableForm.findIndex(r => r[0] === 'Total Revenue'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Plus size={16} /> ADD REVENUE
                </button>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '2px solid var(--border-subtle)' }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{
                          padding: '12px 14px',
                          borderRight: i === headers.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          fontWeight: 'bold'
                        }}>
                          {h}
                        </th>
                      ))}
                      <th style={{ padding: '12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const absoluteIdx = idx + 1;
                      const isHeader = row[0] === 'CAPEX' || row[0] === 'Revenue';
                      const isTotal = row[0] && String(row[0]).startsWith('Total');
                      const canDelete = !isHeader && !isTotal;

                      return (
                        <tr key={idx} style={{ backgroundColor: isTotal ? 'var(--bg)' : 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                          {row.map((cell, colIdx) => {
                            const isCalculatedCell = colIdx === 5 || colIdx === 7 || isTotal;
                            const isLabelCell = colIdx === 0 && (isHeader || isTotal);
                            const isReadOnly = isCalculatedCell || isLabelCell;

                            return (
                              <td key={colIdx} style={{
                                padding: '0',
                                borderRight: colIdx === row.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                              }}>
                                {isReadOnly ? (
                                  <div style={{ padding: '12px 14px', color: isHeader || isTotal ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isHeader || isTotal ? 'bold' : 'normal', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {cell}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => updateValue(absoluteIdx, colIdx, e.target.value)}
                                    placeholder={colIdx === 1 ? "Dept Name" : ""}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid transparent', outline: 'none', color: 'var(--text-primary)', height: '100%', backgroundColor: 'transparent' }}
                                    onFocus={(e) => { e.target.style.backgroundColor = 'var(--bg)'; }}
                                    onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {canDelete && (
                              <button onClick={() => delRow(absoluteIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', margin: '0 auto' }} title="Delete Row">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--surface)' }}>
              <button onClick={() => setShowEditSummary(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      );
    }

    const config = {
      budget: {
        title: 'Budget Summary',
        fields: [
          { key: 'budgetApproved', label: 'Approved amount' },
          { key: 'budgetUtilized', label: 'Utilized amount' },
          { key: 'budgetBalance', label: 'Balance amount' },
          { key: 'budgetOutlook', label: 'Outlook (%)' }
        ]
      }
    };

    const currentConfig = config[editType] || config.budget;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', width: '400px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Edit {currentConfig.title}</span>
            <button onClick={() => setShowEditSummary(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {currentConfig.fields.map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '5px' }}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    {field.key.toLowerCase().includes('amount') || field.key.toLowerCase().includes('budget') ? (
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--accent)' }}>{symbol}</span>
                    ) : null}
                    <input
                      type="text"
                      value={summaryForm[field.key]}
                      onChange={(e) => setSummaryForm({ ...summaryForm, [field.key]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        paddingLeft: (field.key.toLowerCase().includes('amount') || field.key.toLowerCase().includes('budget')) ? '30px' : '8px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowEditSummary(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render chart based on type
  const renderChart = (chartId, chartType, isMaximized = false, trackerId = null) => {
    if (!activeProject) return null;

    const size = isMaximized ? { width: '100%', height: '400px' } : { width: '100%', height: '100%' };

    // Get the configured axes for this chart
    let axisConfig = axisConfigs[activeProject.id]?.[chartId] || { xAxis: '', yAxis: '' };

    // If no chart data or configuration, show placeholder
    let chartData = [];
    const effectiveTrackerId = trackerId || (activeProject?.submodules && activeProject.submodules.length > 0 ? activeProject.submodules[0].trackerId : null);

    if (effectiveTrackerId && submoduleData[effectiveTrackerId] && submoduleData[effectiveTrackerId].rows) {
      chartData = submoduleData[effectiveTrackerId].rows;
    }

    // Auto-detect axes if not configured
    if ((!axisConfig || !axisConfig.xAxis || !axisConfig.yAxis) && chartData.length > 0) {
      const keys = Object.keys(chartData[0]).filter(k => k !== '__row_index__' && k !== 'id');

      // Try to find a date column for X axis
      let xCol = keys.find(k => isDateColumn(chartData, k)) || keys[0];

      // Try to find a numeric column for Y axis (excluding the X column)
      let yCol = keys.find(k => k !== xCol && chartData.some(row => !isNaN(parseFloat(row[k])))) || (keys[1] === xCol ? keys[2] : keys[1]);

      if (xCol && yCol) {
        axisConfig = {
          xAxis: xCol,
          yAxis: yCol
        };

        // If both are dates, try to infer relationship
        if (isDateColumn(chartData, xCol) && isDateColumn(chartData, yCol)) {
          const derived = inferDateRelationship(xCol, yCol);
          if (derived) {
            axisConfig.derivedConfig = derived;
          }
        }
      }
    }

    // Check if attributes are configured
    if (!axisConfig || !axisConfig.xAxis || !axisConfig.yAxis) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 transition-all group hover:border-slate-300 dark:hover:border-slate-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="relative size-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
              <Settings className="size-8 text-amber-600 dark:text-amber-400 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">Configuration Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[200px] leading-relaxed">
            Please define the <span className="text-amber-600 font-bold">X and Y axes</span> in the settings to generate this visualization.
          </p>
        </div>
      );
    }

    // If configured but no data
    if (chartData.length === 0) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-10 group">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-slate-200/50 rounded-full blur-2xl" />
            <div className="relative size-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
              <AlertCircle className="size-8 text-slate-400" />
            </div>
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">No Data Points</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[200px] leading-relaxed">
            The database returned an <span className="font-bold">empty set</span> for this tracker configuration.
          </p>
        </div>
      );
    }

    // ── Smart Data Sampling for Card View ──────────────────────────────────
    // In card view (non-maximized), cap to CARD_MAX_ROWS for performance & clarity.
    // In maximized view all rows are used for full analysis.
    const CARD_MAX_ROWS = 500;
    const totalRows = chartData.length;
    const isSampled = !isMaximized && totalRows > CARD_MAX_ROWS;
    if (isSampled) {
      // Uniform stride sampling — picks evenly spaced rows
      const stride = totalRows / CARD_MAX_ROWS;
      const sampled = [];
      for (let i = 0; i < CARD_MAX_ROWS; i++) {
        sampled.push(chartData[Math.floor(i * stride)]);
      }
      chartData = sampled;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Process data based on selected axes
    // We group by xAxis, and aggregate yAxis (sum if numeric, count otherwise)
    const isGrouped = chartType === 'grouped-bar';
    const groupedData = {}; // { xVal: value } OR { xVal: { groupVal: value } }
    const allGroupValues = new Set();

    const yAxisIsNumeric = chartData.some(row => {
      const val = row[axisConfig.yAxis];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });

    const derivedConfig = axisConfig.derivedConfig;

    chartData.forEach(row => {
      let xVal = row[axisConfig.xAxis];
      if (xVal === null || xVal === undefined || String(xVal).trim() === '') {
        xVal = 'Uncategorized';
      } else {
        xVal = String(xVal).trim();
      }

      let yVal = row[axisConfig.yAxis];
      let groupVal = null;

      if (isGrouped) {
        groupVal = String(yVal || 'Unspecified').trim();
        allGroupValues.add(groupVal);
      }

      // Handle derived date metrics
      if (derivedConfig && ['delay', 'duration', 'cycleTime'].includes(derivedConfig.type)) {
        const d1 = new Date(row[derivedConfig.date1]);
        const d2 = new Date(row[derivedConfig.date2]);

        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          // value = (later_date - earlier_date) in days
          yVal = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        } else {
          yVal = null;
        }
      }

      if (isGrouped) {
        if (!groupedData[xVal]) groupedData[xVal] = {};
        if (!groupedData[xVal][groupVal]) groupedData[xVal][groupVal] = 0;

        // If Y is numeric and we are grouping, we sum the Y values for that group
        // If Y is string, we just count occurrences of (X, Y) pair
        if (yAxisIsNumeric && !derivedConfig) {
          groupedData[xVal][groupVal] += parseFloat(yVal) || 0;
        } else {
          groupedData[xVal][groupVal] += 1;
        }
      } else {
        if (!groupedData[xVal]) {
          groupedData[xVal] = 0;
        }

        if (derivedConfig || yAxisIsNumeric) {
          if (yVal !== null && yVal !== undefined && yVal !== '') {
            groupedData[xVal] += parseFloat(yVal) || 0;
          }
        } else {
          if (yVal !== null && yVal !== undefined && String(yVal).trim() !== '') {
            groupedData[xVal] += 1; // Count valid non-empty values
          }
        }
      }
    });

    // Sort labels to make charts readable (e.g. chronological or alphabetical)
    const sortedXEntries = Object.entries(groupedData).sort((a, b) => {
      if (a[0] === 'Uncategorized') return 1;
      if (b[0] === 'Uncategorized') return -1;
      const numA = parseFloat(a[0]);
      const numB = parseFloat(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a[0].localeCompare(b[0]);
    });

    const xLabels = sortedXEntries.map(e => e[0]);
    const sortedGroups = Array.from(allGroupValues).sort();

    const yValues = sortedXEntries.map(e => {
      if (isGrouped) return 0; // Handled in series construction
      return yAxisIsNumeric ? Math.round(e[1] * 100) / 100 : e[1];
    });


    // Label for Y-axis
    let yAxisLabel = humanizeLabel(axisConfig.yAxis);
    if (derivedConfig && derivedConfig.label) {
      yAxisLabel = `${derivedConfig.label} (Days)`;
    } else if (!yAxisIsNumeric) {
      yAxisLabel = `Count of ${humanizeLabel(axisConfig.yAxis)}`;
    }


    const isDark = themeSettings.displayMode === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1e293b';
    const secondaryTextColor = isDark ? '#FFFFFF' : '#475569';
    const borderColor = isDark ? '#46525E' : '#CBD5E1';
    const tooltipBg = isDark ? '#2B353F' : 'rgba(255, 255, 255, 0.96)';

    const baseOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: tooltipBg,
        borderColor: borderColor,
        borderWidth: 1,
        textStyle: { color: textColor, fontSize: 12 },
        extraCssText: `box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 8px;`,
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          let html = `<div style="font-weight: 800; margin-bottom: 8px; border-bottom: 1px solid ${borderColor}; padding-bottom: 4px; color: ${textColor};">${formatXAxisValue(params[0].axisValue)}</div>`;
          params.forEach(p => {
            const val = typeof p.value === 'number' ? Math.round(p.value * 100) / 100 : p.value;
            html += `<div style="display: flex; justify-content: space-between; gap: 24px; align-items: center; margin-bottom: 3px;">
              <span style="display: flex; align-items: center;">
                <span style="display:inline-block;margin-right:8px;border-radius:2px;width:10px;height:10px;background-color:${p.color};"></span>
                <span style="color: ${secondaryTextColor}; font-weight: 600;">${humanizeLabel(p.seriesName)}</span>
              </span>
              <span style="font-weight: 800; color: ${textColor};">${val} ${derivedConfig ? 'Days' : ''}</span>
            </div>`;
          });
          return html;
        }
      },
      toolbox: {
        show: isMaximized,
        right: '2%',
        top: '2%',
        feature: {
          dataView: {
            show: true,
            readOnly: true,
            title: 'Data View',
            lang: ['Data View', 'Close', 'Refresh'],
            backgroundColor: isDark ? '#1E242B' : '#fff',
            textareaColor: isDark ? '#2B353F' : '#fff',
            textareaBorderColor: borderColor,
            textColor: textColor,
            buttonColor: textColor,
            buttonTextColor: isDark ? '#1E242B' : '#fff',
            optionToContent: function (opt) {
              const series = opt.series;
              if (!series || series.length === 0) return `<div style="padding:20px;color:${textColor};">No data available</div>`;

              const xAxis = opt.xAxis && opt.xAxis[0];
              const yAxis = opt.yAxis && opt.yAxis[0];

              let xHeader = 'Category';
              if (xAxis && xAxis.name) xHeader = xAxis.name;
              else if (yAxis && yAxis.type === 'category' && yAxis.name) xHeader = yAxis.name;

              let table = `<div style="padding:10px;font-family:Inter,sans-serif;height:100%;overflow:auto;background:${isDark ? '#1E242B' : 'white'};">
                <table style="width:100%;border-collapse:collapse;text-align:left;font-size:12px;">
                <thead>
                  <tr style="background:${isDark ? '#2B353F' : '#F8FAFC'};border-bottom:2px solid ${borderColor};">
                    <th style="padding:10px;color:${textColor};font-weight:800;">${xHeader}</th>`;

              series.forEach(s => {
                table += `<th style="padding:10px;color:${textColor};font-weight:800;">${s.name || 'Value'}</th>`;
              });

              table += `</tr></thead><tbody>`;

              const dataLen = series[0].data ? series[0].data.length : 0;
              for (let i = 0; i < dataLen; i++) {
                let name = i;
                if (xAxis && xAxis.data && xAxis.data[i]) {
                  name = typeof xAxis.data[i] === 'object' ? xAxis.data[i].value : xAxis.data[i];
                } else if (yAxis && yAxis.data && yAxis.data[i]) {
                  name = typeof yAxis.data[i] === 'object' ? yAxis.data[i].value : yAxis.data[i];
                } else if (series[0].data[i] && series[0].data[i].name) {
                  name = series[0].data[i].name;
                }

                table += `<tr style="border-bottom:1px solid ${isDark ? '#2B353F' : '#F1F5F9'};">
                  <td style="padding:8px 10px;color:${secondaryTextColor};">${name}</td>`;

                series.forEach(s => {
                  const item = s.data[i];
                  const val = typeof item === 'object' ? item.value : item;
                  table += `<td style="padding:8px 10px;color:${textColor};font-weight:700;">${val !== undefined ? val : '-'}</td>`;
                });

                table += `</tr>`;
              }

              table += '</tbody></table></div>';
              return table;
            }
          },
          saveAsImage: {
            show: true,
            title: 'Download',
            pixelRatio: 3,
            iconStyle: { borderColor: textColor }
          }
        },
        iconStyle: { borderColor: secondaryTextColor },
        emphasis: { iconStyle: { borderColor: textColor } }
      },
      dataZoom: xLabels.length > 10 ? [
        { type: 'slider', show: true, start: 0, end: Math.max(20, Math.floor(1000 / xLabels.length)), bottom: 2, height: 20, borderColor: borderColor, fillerColor: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(59,130,246,0.12)', handleStyle: { color: isDark ? '#60a5fa' : '#3b82f6' }, textStyle: { color: secondaryTextColor, fontSize: 9 } },
        { type: 'inside', start: 0, end: 100 }
      ] : [],
      legend: {
        show: true,
        type: 'scroll',
        orient: isMaximized ? 'vertical' : 'horizontal',
        right: isMaximized ? '2%' : 'auto',
        // When the slider is visible (xLabels > 10), lift the legend above the slider
        bottom: isMaximized ? 'auto' : (xLabels.length > 10 ? 28 : 2),
        left: isMaximized ? 'auto' : 'center',
        top: isMaximized ? 'middle' : 'auto',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { fontSize: 10, color: secondaryTextColor, fontWeight: '600' },
        pageButtonPosition: 'end',
        pageIconSize: 10,
        padding: [5, 10]
      },
      grid: {
        left: isMaximized ? '3%' : '8%',
        right: isMaximized ? '15%' : '5%',
        // Reserve space for: slider (~20px) + legend (~22px) + axis labels
        // When slider is active (>10 labels) we need more bottom room
        bottom: xLabels.length > 10
          ? (isMaximized ? '18%' : '28%')
          : (xLabels.length > 5 ? (chartType === 'bar-rotated' ? '20%' : '18%') : '14%'),
        top: '15%',
        containLabel: true
      },




      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          // 'auto' lets ECharts skip overlapping labels; force all only for small sets
          interval: xLabels.length > 10 ? 'auto' : 0,
          rotate: xLabels.length > 5 ? (chartType === 'bar-rotated' ? 45 : 35) : 0,
          formatter: formatXAxisValue,
          fontSize: 10,
          color: secondaryTextColor,
          // Prevent labels from spilling outside the chart boundary
          hideOverlap: true,
          overflow: 'truncate',
          width: xLabels.length > 15 ? 70 : 90
        },
        axisLine: { lineStyle: { color: borderColor } }
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        boundaryGap: ['15%', '15%'],
        nameTextStyle: {
          color: secondaryTextColor,
          fontSize: 11,
          fontWeight: 'bold',
          align: 'left',
          padding: [0, 0, 0, 20] // Shift only the label to the right into the chart area
        },
        axisLine: { lineStyle: { color: borderColor } },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' } },
        axisLabel: { color: secondaryTextColor, fontSize: 10 }
      }

    };

    let option = {};

    switch (chartType) {
      case 'bar':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '50%',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'top' : 'bottom',
                  distance: v >= 0 ? 8 : 10,
                  align: 'center',
                  verticalAlign: v >= 0 ? 'bottom' : 'top'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: textColor,
                fontSize: 10,
                fontWeight: 'bold',
                hideOverlap: true,
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'line':
      case 'area':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 8,
              data: yValues,
              lineStyle: { width: 3, color: isDark ? '#60a5fa' : '#3b82f6' },
              itemStyle: { color: isDark ? '#60a5fa' : '#3b82f6', borderWidth: 2, borderColor: isDark ? '#1E242B' : '#fff' },
              areaStyle: chartType === 'area' ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.01)' }
                ])
              } : undefined,
              label: {
                show: true,
                position: 'top',
                color: textColor,
                fontSize: 10,
                fontWeight: 'bold',
                hideOverlap: true
              }
            }
          ]
        };
        break;

      case 'pie':
        let pieData = xLabels.map((label, index) => ({
          name: label,
          value: yValues[index]
        })).filter(item => item.value > 0);

        // Smart Default: If too many segments in a Pie, it's better as a Bar
        if (pieData.length > 20 && !isMaximized) {
          return renderChart(chartId, 'bar', isMaximized, trackerId);
        }

        // Clutter management for Pie Chart: Group small slices into "Others"
        if (pieData.length > 12) {
          const sortedData = [...pieData].sort((a, b) => b.value - a.value);
          const topN = sortedData.slice(0, 10);
          const others = sortedData.slice(10).reduce((acc, curr) => acc + curr.value, 0);
          if (others > 0) {
            pieData = [...topN, { name: 'Others', value: Math.round(others * 100) / 100 }];
          }
        }

        option = {
          color: getDiversePalette(),
          tooltip: {
            trigger: 'item',
            backgroundColor: tooltipBg,
            borderColor: borderColor,
            borderWidth: 1,
            textStyle: { color: textColor },
            formatter: (p) => `<div style="padding: 4px; color: ${textColor};"><b>${formatXAxisValue(p.name)}</b><br/><span style="color:${secondaryTextColor}">Value:</span> <b>${p.value}</b><br/><span style="color:${secondaryTextColor}">Share:</span> <b>${p.percent}%</b></div>`
          },
          toolbox: baseOption.toolbox, // retain toolbox from base option
          legend: baseOption.legend,
          series: [
            {
              name: humanizeLabel(axisConfig.yAxis),
              type: 'pie',
              radius: isMaximized ? ['45%', '75%'] : ['35%', '65%'],
              center: ['50%', '45%'],
              avoidLabelOverlap: true,
              itemStyle: {
                borderRadius: 4,
                borderColor: isDark ? '#2B353F' : '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                position: 'outside',
                formatter: (p) => `{name|${formatXAxisValue(p.name)}}\n{value|${p.value}} {percent|(${p.percent}%)}`,
                minMargin: 5,
                edgeDistance: 10,
                lineHeight: 15,
                rich: {
                  name: { fontSize: 9, fontWeight: '700', color: textColor, padding: [0, 0, 2, 0] },
                  value: { fontSize: 9, fontWeight: '800', color: isDark ? '#60a5fa' : '#3b82f6' },
                  percent: { fontSize: 9, color: secondaryTextColor }
                }
              },
              labelLine: {
                show: true,
                length: 10,
                length2: 15,
                smooth: true,
                lineStyle: { width: 1, color: '#cbd5e1' }
              },
              labelLayout: {
                hideOverlap: true
              },
              minAngle: 5,
              emphasis: {
                label: { show: true, fontSize: 11, fontWeight: 'bold' },
                itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' }
              },
              data: pieData
            }
          ]
        };
        break;

      case 'bar-horizontal':
        option = {
          ...baseOption,
          xAxis: {
            type: 'value',
            boundaryGap: ['15%', '15%'],
            axisLabel: { color: secondaryTextColor, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' } }
          },
          yAxis: {
            type: 'category',
            data: xLabels,
            axisLabel: {
              interval: 0,
              fontSize: 10,
              color: secondaryTextColor,
              fontWeight: '600'
            }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'right' : 'left',
                  distance: 8,
                  align: v >= 0 ? 'left' : 'right',
                  verticalAlign: 'middle'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: textColor,
                fontSize: 10,
                fontWeight: 'bold',
                hideOverlap: true,
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'bar-rotated':
        option = {
          ...baseOption,
          grid: { ...baseOption.grid, bottom: '25%' },
          xAxis: {
            ...baseOption.xAxis,
            axisLabel: {
              ...baseOption.xAxis.axisLabel,
              rotate: 45,
              interval: 0,
              hideOverlap: true
            }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '60%',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'top' : 'bottom',
                  distance: 8,
                  align: 'center',
                  verticalAlign: v >= 0 ? 'bottom' : 'top'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: textColor,
                fontSize: 9,
                fontWeight: 'bold',
                hideOverlap: true,
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'histogram':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '95%', // Histogram style: narrow gaps
              data: yValues,
              itemStyle: {
                color: '#6366f1',
                opacity: 0.8,
                borderColor: '#4338ca',
                borderWidth: 1
              },
              label: {
                show: true,
                position: 'top',
                fontSize: 10,
                hideOverlap: true
              }
            }
          ]
        };
        break;

      case 'timeline':
        // Timeline optimized for date sequence
        option = {
          ...baseOption,
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          xAxis: {
            ...baseOption.xAxis,
            type: 'category',
            boundaryGap: true
          },
          yAxis: {
            ...baseOption.yAxis,
            splitLine: { show: true, lineStyle: { type: 'solid', color: '#F1F5F9' } }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              step: 'middle', // Better for timeline changes
              symbol: 'circle',
              symbolSize: 10,
              data: yValues,
              lineStyle: { width: 4, color: isDark ? '#34d399' : '#10b981' },
              itemStyle: { color: isDark ? '#34d399' : '#059669', borderWidth: 2, borderColor: isDark ? '#1E242B' : '#fff' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                    { offset: 1, color: 'rgba(16, 185, 129, 0)' }
                  ]
                }
              },
              label: {
                show: true,
                position: 'top',
                formatter: (p) => p.value,
                fontWeight: 'bold',
                hideOverlap: true,
                color: isDark ? '#34d399' : '#047857'
              }
            }
          ]
        };
        break;

      case 'grouped-bar':
        const palette = getDiversePalette();
        option = {
          ...baseOption,
          yAxis: {
            ...baseOption.yAxis,
            splitLine: { show: true, lineStyle: { type: 'solid', color: '#E2E8F0' } }
          },
          series: sortedGroups.map((group, gIdx) => ({
            name: group,
            type: 'bar',
            barGap: 0,
            barMaxWidth: 40,
            emphasis: { focus: 'series' },
            itemStyle: {
              borderRadius: [2, 2, 0, 0],
              color: palette[gIdx % palette.length]
            },
            data: xLabels.map(x => {
              const val = (groupedData[x] && groupedData[x][group]) || 0;
              return yAxisIsNumeric ? Math.round(val * 100) / 100 : val;
            }),
            label: {
              show: isMaximized,
              position: 'top',
              fontSize: 9,
              color: secondaryTextColor,
              fontWeight: 'bold',
              hideOverlap: true,
              formatter: (p) => p.value > 0 ? p.value : ''
            }
          }))
        };
        break;





      default:
        return null;
    }

    return (
      <div style={size}>
        <div style={{ marginBottom: '6px', fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', backgroundColor: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span><span style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : 'var(--accent)' }}>X:</span> {humanizeLabel(axisConfig.xAxis)} <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span> <span style={{ fontWeight: 'bold', color: isDark ? '#FFFFFF' : 'var(--accent)' }}>Y:</span> {humanizeLabel(axisConfig.yAxis)}</span>
          {isSampled && (
            <span style={{ backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : '#fef9c3', color: isDark ? '#fbbf24' : '#854d0e', fontWeight: '700', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : '#fde68a'}`, whiteSpace: 'nowrap' }}>
              ⚡ Sample: {CARD_MAX_ROWS} of {totalRows} rows · Maximize for full analysis
            </span>
          )}
        </div>
        <ReactECharts
          ref={(e) => {
            if (e) chartRefs.current[chartId] = e;
            else delete chartRefs.current[chartId];
          }}
          theme="v5"
          option={option}
          style={{ height: 'calc(100% - 40px)', width: '100%' }}
          notMerge={true}
        />
      </div>
    );
  };



  const handleDownloadChart = (chartId) => {
    const instance = chartRefs.current[chartId]?.getEchartsInstance();
    if (instance) {
      const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chartId || 'export'}-chart.png`;
      a.click();
    }
  };

  // Chart options render function
  const renderChartOptions = (chartId, currentType) => {
    const commonStyle = {
      height: '26px',
      padding: '0 8px',
      fontSize: '10px',
      borderRadius: '4px',
      border: '1px solid #cbd5e1',
      backgroundColor: 'var(--bg)',
      color: 'var(--accent)',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      outline: 'none'
    };

    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative', justifyContent: 'flex-end', zIndex: 10 }}>
        <select
          value={currentType}
          onChange={(e) => handleChartTypeChange(chartId, e.target.value)}
          style={{
            ...commonStyle,
            minWidth: '85px'
          }}
        >
          <option value="bar">Bar</option>
          <option value="grouped-bar">Grouped</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          <option value="area">Area</option>
          <option value="histogram">Hist</option>
        </select>

        <button
          onClick={() => toggleAxisSelector(chartId)}
          title="Axes"
          style={{
            ...commonStyle,
            backgroundColor: showAxisSelector === chartId ? 'var(--accent)' : 'var(--bg)',
            color: showAxisSelector === chartId ? 'white' : 'var(--accent)',
            minWidth: '85px'
          }}
        >
          Axes
        </button>

        <button
          onClick={() => handleMaximize(chartId)}
          title="Analyze"
          style={{
            ...commonStyle,
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: '1px solid var(--accent)',
            minWidth: '85px'
          }}
        >
          Analyze
        </button>

        {showAxisSelector === chartId && (
          <AxisSelectorModal
            chartId={chartId}
            onClose={() => setShowAxisSelector(null)}
            activeProject={activeProject}
            axisConfigs={axisConfigs}
            submoduleData={submoduleData}
            tracker={getTrackerForPhase(chartId)}
            availableColumns={availableColumns}
            handleAxesUpdate={handleAxesUpdate}
          />
        )}
      </div>
    );
  };

  const renderBudgetTable = () => {
    // Columns the user wants: Sno, Category, Item name, unity type, Estimated, Utilized, commitment, total utilization, balance
    const targetCols = [
      { id: 'sno', label: 'Sno', keys: ['sno', 'Sno', 'S.No', '#', 'SNo'] },
      { id: 'category', label: 'Category', keys: ['category', 'Category'] },
      { id: 'item_name', label: 'Item name', keys: ['item_name', 'Item Name', 'Item name', 'Item'] },
      { id: 'unit_type', label: 'unity type', keys: ['unit_type', 'Unit Type', 'unity type', 'Unit', 'unit_type'] },
      { id: 'estimated', label: 'Estimated', keys: ['estimated', 'Estimated', 'Estimation'] },
      { id: 'utilized', label: 'Utilized', keys: ['utilized', 'Utilized'] },
      { id: 'commitment', label: 'commitment', keys: ['commitment', 'Commitment', 'commitment'] },
      { id: 'total_utilization', label: 'total utilization', keys: ['total_utilization', 'Total utilization', 'Total Utilization', 'total utilization'] },
      { id: 'balance', label: 'balance', keys: ['balance', 'Balance', 'balance'] }
    ];

    // Handle array of arrays (convert to objects)
    let allRows = [];
    if (budgetTableData && budgetTableData.length > 0) {
      if (Array.isArray(budgetTableData[0])) {
        const headers = budgetTableData[0];
        allRows = budgetTableData.slice(1).map(r => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = r[i]; });
          return obj;
        });
      } else {
        allRows = budgetTableData;
      }
    }

    // Pagination logic
    const totalBudgetPages = Math.ceil(allRows.length / budgetItemsPerPage);
    const startIndex = (budgetPage - 1) * budgetItemsPerPage;
    const paginatedRows = allRows.slice(startIndex, startIndex + budgetItemsPerPage);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ overflowX: 'auto', marginTop: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '2px solid var(--border-subtle)' }}>
                {targetCols.map(col => (
                  <th key={col.id} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr><td colSpan={targetCols.length} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>No detailed budget records found.</td></tr>
              ) : paginatedRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  {targetCols.map(col => {
                    const valKey = col.keys.find(k => row[k] !== undefined && row[k] !== null);
                    let val = valKey !== undefined ? row[valKey] : '-';

                    // Format monetary values
                    if (['estimated', 'utilized', 'commitment', 'total_utilization', 'balance'].includes(col.id)) {
                      if (val !== '-') {
                        val = format(val);
                      }
                    }

                    return (
                      <td key={col.id} style={{ padding: '8px 14px', color: 'var(--text-primary)', fontWeight: col.id === 'item_name' ? '700' : '500' }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allRows.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
              Showing <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{Math.min(allRows.length, startIndex + 1)}</span> to <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{Math.min(allRows.length, startIndex + budgetItemsPerPage)}</span> of <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{allRows.length}</span> results
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Rows per page:</span>
                <select
                  value={budgetItemsPerPage}
                  onChange={(e) => {
                    setBudgetItemsPerPage(Number(e.target.value));
                    setBudgetPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'var(--accent)',
                    backgroundColor: 'var(--surface)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {[10, 25, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setBudgetPage(p => Math.max(1, p - 1))}
                  disabled={budgetPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface)',
                    borderRadius: '6px',
                    cursor: budgetPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: budgetPage === 1 ? 'var(--text-muted)' : 'var(--accent)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {(() => {
                    const pages = [];
                    const showMax = 5;
                    if (totalBudgetPages <= showMax) {
                      for (let i = 1; i <= totalBudgetPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (budgetPage > 3) pages.push('...');
                      const start = Math.max(2, budgetPage - 1);
                      const end = Math.min(totalBudgetPages - 1, budgetPage + 1);
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (budgetPage < totalBudgetPages - 2) pages.push('...');
                      if (!pages.includes(totalBudgetPages)) pages.push(totalBudgetPages);
                    }

                    return pages.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => typeof p === 'number' && setBudgetPage(p)}
                        disabled={typeof p !== 'number'}
                        style={{
                          minWidth: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '800',
                          border: '1px solid',
                          borderColor: budgetPage === p ? 'var(--accent)' : 'var(--border-subtle)',
                          backgroundColor: budgetPage === p ? 'var(--accent)' : 'var(--surface)',
                          color: budgetPage === p ? 'white' : (typeof p === 'number' ? 'var(--text-primary)' : 'var(--text-muted)'),
                          cursor: typeof p === 'number' ? 'pointer' : 'default',
                          transition: 'all 0.2s'
                        }}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setBudgetPage(p => Math.min(totalBudgetPages, p + 1))}
                  disabled={budgetPage === totalBudgetPages || totalBudgetPages === 0}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface)',
                    borderRadius: '6px',
                    cursor: (budgetPage === totalBudgetPages || totalBudgetPages === 0) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: (budgetPage === totalBudgetPages || totalBudgetPages === 0) ? '#94a3b8' : 'var(--accent)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAnalysisExplanation = (chartId) => {
    const config = axisConfigs[activeProject.id]?.[chartId];
    const tid = getTrackerForPhase(chartId)?.trackerId;
    const rows = tid && submoduleData[tid] ? submoduleData[tid].rows : [];
    if (!config || rows.length === 0) return null;

    const isNumeric = rows.some(row => {
      const val = row[config.yAxis];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });

    const text = `Analyzing ${humanizeLabel(chartId)} for ${activeProject.name}. This visualization explores the distribution of ${humanizeLabel(config.yAxis)} across different ${humanizeLabel(config.xAxis)} categories. By aggregating ${rows.length} records using a ${isNumeric ? 'Summation' : 'Frequency Count'} logic, we can clearly identify how ${humanizeLabel(config.yAxis)} varies across the project scope. This breakdown highlights primary drivers and helps focus management attention where it matters most.`;
    return (
      <Modal
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        title="AI Insights"
        size="2xl"
        overlayClassName="!z-[11000]"
        footer={
          <button
            onClick={() => setShowExplanation(false)}
            style={{
              padding: '10px 24px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Close Insights
          </button>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <SparklesIcon size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {humanizeLabel(chartId)} Analysis
          </h2>
        </div>

        <TextGenerateEffect
          words={text}
          className="text-[17px] leading-[1.6] font-medium text-slate-700 dark:text-slate-300 tracking-tight"
        />
      </Modal>
    );
  };

  const renderMetricsSummary = () => {
    if (isDashboardLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`metrics-skeleton-${idx}`} style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                height: '380px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Skeleton className="h-[18px] w-4 rounded-sm" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Skeleton className="h-4/5 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (allMetricCharts.length === 0) return null;

    const totalPages = Math.ceil(allMetricCharts.length / chartsPerPage);
    const startIndex = (metricsPage - 1) * chartsPerPage;
    const currentCharts = allMetricCharts.slice(startIndex, startIndex + chartsPerPage);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          {currentCharts.map(chart => (
            <div key={chart.id} style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              padding: '12px 16px', // Reduced padding
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              height: '380px', // Increased from 340px
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '4px', height: '18px', backgroundColor: chart.isDefault ? '#4f46e5' : '#10b981', borderRadius: '2px' }}></div>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{chart.title}</h3>
                </div>
                {renderChartOptions(chart.id, chart.type)}
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {renderChart(chart.id, chart.type, false, chart.trackerId)}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '10px', padding: '20px', backgroundColor: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setMetricsPage(p => Math.max(1, p - 1))}
              disabled={metricsPage === 1}
              style={{
                padding: '8px 20px',
                border: '1px solid #cbd5e1',
                background: 'var(--surface)',
                borderRadius: '8px',
                cursor: metricsPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                color: metricsPage === 1 ? 'var(--text-muted)' : 'var(--accent)',
                boxShadow: metricsPage === 1 ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              ← Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent)' }}>Page {metricsPage}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>of {totalPages}</span>
            </div>
            <button
              onClick={() => setMetricsPage(p => Math.min(totalPages, p + 1))}
              disabled={metricsPage === totalPages}
              style={{
                padding: '8px 20px',
                border: '1px solid #cbd5e1',
                background: 'var(--surface)',
                borderRadius: '8px',
                cursor: metricsPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '700',
                boxShadow: metricsPage === totalPages ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  };

  // Maximized Chart Modal Component
  const renderMaximizedChartModal = () => {
    if (!maximizedChart || !activeProject) return null;

    const chartNames = {
      design: 'Design',
      partDevelopment: 'Part Development',
      build: 'Build',
      gateway: 'Gateway',
      validation: 'Validation',
      qualityIssues: 'Quality Issues'
    };

    const phaseLabel = chartNames[maximizedChart] ||
      (activeProject?.submodules || []).find(sub => sub.id === maximizedChart)?.displayName ||
      (activeProject?.submodules || []).find(sub => sub.id === maximizedChart)?.name ||
      maximizedChart;

    return (
      <div className="app-modal-overlay z-[10000]">
        <div className="app-modal-container max-w-[1400px] w-[98%] max-h-[95vh]">
          {/* Header */}
          <div className="app-modal-header bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
              <h3 className="app-modal-title">{humanizeLabel(phaseLabel)} Analysis</h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => toggleAxisSelector(maximizedChart)}
                  className={`px-3 py-1.5 text-xs font-bold border rounded-md transition-colors flex items-center justify-center cursor-pointer ${showAxisSelector === maximizedChart
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                  AXES CONFIG
                </button>
                {showAxisSelector === maximizedChart && (
                  <AxisSelectorModal
                    chartId={maximizedChart}
                    onClose={() => setShowAxisSelector(null)}
                    activeProject={activeProject}
                    axisConfigs={axisConfigs}
                    submoduleData={submoduleData}
                    tracker={getTrackerForPhase(maximizedChart)}
                    availableColumns={availableColumns}
                    handleAxesUpdate={handleAxesUpdate}
                  />
                )}
              </div>

              <select
                value={chartTypes[activeProject.id]?.[maximizedChart] || 'bar'}
                onChange={(e) => handleChartTypeChange(maximizedChart, e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md outline-none cursor-pointer"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="area">Area Chart</option>
                <option value="histogram">Histogram</option>
                <option value="bar-horizontal">Horizontal Bar</option>
                <option value="bar-rotated">Rotated Bar</option>
                <option value="timeline">Timeline</option>
              </select>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              <button
                onClick={handleCloseMaximize}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white border border-red-500 hover:bg-red-500 rounded-md transition-colors flex items-center justify-center cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="app-modal-body bg-slate-50/30 dark:bg-slate-900/30 p-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="h-[500px]">
                {renderChart(maximizedChart, chartTypes[activeProject.id]?.[maximizedChart] || 'bar', true, getTrackerForPhase(maximizedChart)?.trackerId)}
              </div>
            </div>

            {/* Analysis Logic Summary Table */}
            {(() => {
              const tracker = getTrackerForPhase(maximizedChart);
              const tid = tracker?.trackerId;
              const rows = tid && submoduleData[tid] ? submoduleData[tid].rows : [];

              let config = axisConfigs[activeProject.id]?.[maximizedChart];
              if (!config && tracker) {
                const cols = tracker.columns || [];
                config = {
                  xAxis: cols[0] || '',
                  yAxis: cols[1] || cols[0] || ''
                };
              }

              if (!config || rows.length === 0) return null;

              const groupedData = {};
              const isNumeric = rows.some(row => {
                const val = row[config.yAxis];
                return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
              });

              rows.forEach(row => {
                let xVal = row[config.xAxis];
                if (xVal === null || xVal === undefined || String(xVal).trim() === '') {
                  xVal = 'Uncategorized';
                } else {
                  xVal = String(xVal).trim();
                }

                let yVal = row[config.yAxis];
                if (!groupedData[xVal]) groupedData[xVal] = 0;

                if (isNumeric) {
                  if (yVal !== null && yVal !== undefined && yVal !== '') {
                    groupedData[xVal] += parseFloat(yVal) || 0;
                  }
                } else {
                  if (yVal !== null && yVal !== undefined && String(yVal).trim() !== '') {
                    groupedData[xVal] += 1;
                  }
                }
              });

              const sortedEntries = Object.entries(groupedData).sort((a, b) => {
                if (a[0] === 'Uncategorized') return 1;
                if (b[0] === 'Uncategorized') return -1;
                const numA = parseFloat(a[0]);
                const numB = parseFloat(b[0]);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a[0].localeCompare(b[0]);
              });

              return (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2.5 rounded-lg flex items-center justify-center">
                    <SparklesIcon size={22} />
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <h5 className="m-0 text-[14px] font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Analysis Summary</h5>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-750 px-2 py-0.5 rounded">
                          {isNumeric ? 'SUMMATION' : 'COUNT'} LOGIC
                        </span>
                      </div>
                      <button
                        onClick={() => setShowExplanation(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        Explain Analysis
                      </button>
                    </div>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-850">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">{humanizeLabel(config.xAxis)}</th>
                            <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">{isNumeric ? 'Total' : 'Frequency'} of {humanizeLabel(config.yAxis)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedEntries.slice(0, 10).map(([x, y]) => (
                            <tr key={x} className="border-b border-slate-100 dark:border-slate-800 last:border-0 bg-white dark:bg-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-3 text-slate-700 dark:text-slate-250 font-medium">{x}</td>
                              <td className="p-3 text-slate-900 dark:text-slate-100 font-extrabold text-[13px]">
                                {isNumeric ? (Math.round(y * 100) / 100).toLocaleString() : y}
                              </td>
                            </tr>
                          ))}
                          {sortedEntries.length > 10 && (
                            <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                              <td colSpan="2" className="p-3 text-slate-400 dark:text-slate-550 italic text-center text-[11px]">
                                Showing top 10 categories. Total {sortedEntries.length} categories analyzed.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Data View Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                <h4 className="m-0 text-sm font-bold text-slate-900 dark:text-slate-100">Detailed Data View</h4>
                <button
                  onClick={() => {
                    const tid = getTrackerForPhase(maximizedChart)?.trackerId;
                    const rows = tid && submoduleData[tid] ? submoduleData[tid].rows : [];
                    const config = axisConfigs[activeProject.id]?.[maximizedChart];
                    if (!rows.length || !config) return;

                    const headers = [config.xAxis, config.yAxis];
                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute("download", `${phaseLabel}_data.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] w-12">#</th>
                      <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">{humanizeLabel(axisConfigs[activeProject.id]?.[maximizedChart]?.xAxis || 'X Axis')}</th>
                      <th className="p-3 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">{humanizeLabel(axisConfigs[activeProject.id]?.[maximizedChart]?.yAxis || 'Y Axis')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(submoduleData[getTrackerForPhase(maximizedChart)?.trackerId]?.rows || []).slice(0, 50).map((row, idx) => {
                      const config = axisConfigs[activeProject.id]?.[maximizedChart];
                      return (
                        <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-850/20'} hover:bg-slate-50/50 dark:hover:bg-slate-800/30`}>
                          <td className="p-3 text-slate-400 dark:text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-200 font-semibold">{formatXAxisValue(row[config?.xAxis])}</td>
                          <td className="p-3 text-slate-900 dark:text-slate-100 font-bold">{row[config?.yAxis]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(submoduleData[getTrackerForPhase(maximizedChart)?.trackerId]?.rows || []).length > 50 && (
                  <div className="p-4 text-center text-slate-400 dark:text-slate-550 italic text-[11px] border-t border-slate-100 dark:border-slate-800">
                    Showing top 50 rows. Use "Export CSV" for full results.
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis Explanation Overlay */}
            {showExplanation && renderAnalysisExplanation(maximizedChart)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={{
      height: '100%',
      minHeight: '0',
      backgroundColor: 'var(--bg)',
      padding: '8px 12px',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>


      {/* Save Notification Toast */}
      {showSaveNotification && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#10b981', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, transition: 'opacity 0.3s ease' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>✓</span>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Changes saved to Budget Summary</span>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        show={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        activeProject={activeProject}
        visibleSections={visibleSections}
        emailData={emailData}

        setEmailData={setEmailData}
        allEmployees={allEmployees}
        employeeSearchTerm={employeeSearchTerm}
        setEmployeeSearchTerm={setEmployeeSearchTerm}
        showEmployeeDropdown={showEmployeeDropdown}
        setShowEmployeeDropdown={setShowEmployeeDropdown}
        activeEmailField={activeEmailField}
        setActiveEmailField={setActiveEmailField}
        addContactFromList={addContactFromList}
        handleEmailInputChange={handleEmailInputChange}
        removeEmailInput={removeEmailInput}
        availablePhases={availablePhases}
        getTrackerForPhase={getTrackerForPhase}
        handleSendEmail={handleSendEmail}
        onPreviewPdf={handleOpenPdfPreview}
        onExportPdf={handleExportPdf}
      />

      {/* Simulate Modal */}
      {renderSimulateModal()}

      {/* Edit Modals */}
      {renderEditIssuesModal()}
      {renderEditSummaryModal()}

      {/* Maximized Chart Modal */}
      {renderMaximizedChartModal()}

      {/* Main Dashboard Container */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        flex: 1,
        minHeight: 0
      }}>
        {/* Header with navigation */}
        {(activeProject || selectedSubmodule) && (
          <header style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)',
            padding: '10px 20px',
            fontSize: '15px',
            fontWeight: '600',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
              {activeProject && (
                <button
                  onClick={selectedSubmodule ? handleBackToProjectDashboard : handleBackToProjects}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  ← Back
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', flex: 2 }}>
              {selectedSubmodule ? (
                <span>{getDisplayFileName(selectedSubmodule.name, selectedSubmodule.projectName)}</span>
              ) : activeProject ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span>{activeProject.name} Dashboard</span>
                  {activeProject.project_manager && (
                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      PM: {activeProject.project_manager}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flex: 1 }}>
              {activeProject && !selectedSubmodule && (
                <>
                  <button
                    aria-label="Configure Dashboard Visibility"
                    onClick={() => {
                      setVisibleSections({
                        metricsSummary: true,
                        milestones: true,
                        criticalIssues: true,
                        budget: true,
                        resource: true,
                        quality: true,
                        design: true,
                        partDevelopment: true,
                        build: true,
                        gateway: true,
                        validation: true,
                        qualityIssues: true,
                        sopTables: false,
                        ...(activeProject.dashboardConfig?.visibleSections || {})
                      });
                      setShowSimulateModal(true);
                    }}
                    style={{
                      padding: '7px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none'
                    }}
                  >
                    Configure Dashboard
                  </button>
                  <button
                    onClick={() => {
                      // Initialize selectedSections from current dashboard visibility
                      const sections = { ...visibleSections };

                      // Ensure all submodules have an entry (default to false if not in visibleSections)
                      (activeProject?.submodules || []).forEach(sub => {
                        if (sections[sub.id] === undefined) {
                          sections[sub.id] = false;
                        }
                      });

                      setEmailData(prev => ({ ...prev, selectedSections: sections, includePdf: true }));
                      setShowEmailModal(true);
                    }}
                    style={{
                      padding: '7px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none'
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Send Mail
                  </button>
                </>
              )}
            </div>
          </header>
        )}

        {/* Projects List or Dashboard Content */}
        {!activeProject ? (
          /* Home / Projects Overview View */
          <DashboardHomeLayout>
            <div className="dashboard-header-title-section">
              <h1 className="dashboard-title">Project Command Center</h1>
              <p className="dashboard-subtitle">Enterprise-level project health, budget governance, and resource analytics overview.</p>
            </div>
            <TodayPrioritiesStrip
              escalationsCount={escalationsCount}
              criticalPathDelaysCount={criticalPathDelaysCount}
              revisionsCount={revisionsCount}
              commodityAlertsCount={commodityAlertsCount}
              onAlertClick={(type) => {
                const elementId = type === 'escalations' ? 'operations-command-center' :
                                  type === 'delays' ? 'portfolio-health-matrix' :
                                  type === 'revisions' ? 'budget-governance-workspace' :
                                  type === 'commodity' ? 'supply-chain-risk-center' : null;
                if (elementId) {
                  const el = document.getElementById(elementId);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {(() => {
              const role = (user?.role || 'Admin').trim();
              const isExecOrAdmin = ['Admin', 'Super Admin', 'Finance', 'Head'].includes(role);
              const isPM = role === 'Project Manager';

              if (isExecOrAdmin) {
                return (
                  <div className="sketch-dashboard">
                    {/* Row 1 — Portfolio Health Matrix | Budget Governance Workspace */}
                    <div className="sketch-row-top">
                      <div className="sketch-cell" id="portfolio-health-matrix">
                        <PortfolioHealthMatrix
                          projectsSummary={mergedProjectsSummary}
                          structures={structuresData || []}
                          onProjectSelect={(proj) => {
                            const found = projects.find(p => String(p.dbProjectId) === String(proj.project_id));
                            if (found) handleProjectSelect(found.id);
                          }}
                          issuesMap={issuesMap}
                          budgetsMap={budgetsMap}
                          onActionClick={handleMatrixAction}
                        />
                      </div>
                      <div className="sketch-cell" id="budget-governance-workspace">
                        <BudgetGovernanceWorkspace
                          revisions={allRevisionsData || []}
                          onRefresh={handleHomepageRefresh}
                        />
                      </div>
                    </div>

                    {/* Row 2 — Project Timeline (full width, tabbed) */}
                    <div className="sketch-row-timeline" id="project-timeline">
                      <ProjectTimelinePanel
                        projects={mergedProjectsSummary}
                        uploads={allUploads}
                        revisions={allRevisionsData || []}
                      />
                    </div>

                    {/* Row 3 — Resource Loads (narrow) | Supply Chain Risk Center (wide) */}
                    <div className="sketch-row-bottom">
                      <div className="sketch-cell" id="resource-loads">
                        <ResourceLoads employees={employeesData || allEmployees || []} />
                      </div>
                      <div className="sketch-cell" id="supply-chain-risk-center">
                        <SupplyChainRiskCenter
                          commodityPrices={commodityPricesData || {}}
                          projects={mergedProjectsSummary}
                          structures={structuresData || []}
                          onRefresh={handleHomepageRefresh}
                        />
                      </div>
                    </div>
                  </div>
                );
              } else if (isPM) {
                return (
                  <div className="dash-layout-main-sidebar">
                    {/* Main content column */}
                    <div className="flex flex-col gap-3 min-w-0">
                      <div id="operations-command-center">
                        <OperationsCommandCenter
                          escalations={escalations}
                          delays={delays}
                          revisions={allRevisionsData || []}
                          commodityAlerts={commodityAlerts}
                          momActions={momActions}
                          onRefresh={handleHomepageRefresh}
                        />
                      </div>
                      <div id="portfolio-health-matrix">
                        <PortfolioHealthMatrix
                          projectsSummary={mergedProjectsSummary}
                          structures={structuresData || []}
                          onProjectSelect={(proj) => {
                            const found = projects.find(p => String(p.dbProjectId) === String(proj.project_id));
                            if (found) handleProjectSelect(found.id);
                          }}
                          issuesMap={issuesMap}
                          budgetsMap={budgetsMap}
                          onActionClick={handleMatrixAction}
                        />
                      </div>
                    </div>

                    {/* Fixed sidebar — Activity Stream */}
                    <div className="dash-sidebar-sticky">
                      <OperationalActivityStream
                        uploads={allUploads}
                        meetings={meetingsData || []}
                        revisions={allRevisionsData || []}
                        milestones={allMilestonesFromSummary}
                      />
                    </div>
                  </div>
                );
              } else {
                // Team Lead / Engineer / Employee
                return (
                  <div className="dash-layout-main-sidebar">
                    <div className="flex flex-col gap-3 min-w-0">
                      {renderMyTasksChecklist()}
                      {renderIngestionTrackerLogs()}
                    </div>
                    <div className="dash-sidebar-sticky">
                      <OperationalActivityStream
                        uploads={allUploads}
                        meetings={meetingsData || []}
                        revisions={allRevisionsData || []}
                        milestones={allMilestonesFromSummary}
                      />
                    </div>
                  </div>
                );
              }
            })()}
          </DashboardHomeLayout>
        ) : selectedSubmodule ? (
          /* Submodule Detail View */
          <div style={{ padding: '12px 16px 16px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {renderSubmoduleTable(
              selectedSubmodule.trackerId ? submoduleData[selectedSubmodule.trackerId] : dashboardData?.milestones,
              getDisplayFileName(selectedSubmodule.name, selectedSubmodule.projectName)
            )}
          </div>
        ) : (
          /* Active Project Dashboard */
          <>
            <section aria-label="Project Overview Content" style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

              <VPProjectDashboard
                activeProject={activeProject}
                dashboardData={dashboardData}
                onConfigure={() => setShowSimulateModal(true)}
                onSendMail={() => setShowEmailModal(true)}
                metricsContent={visibleSections.metricsSummary ? renderMetricsSummary() : null}
                visibleSections={visibleSections}
                milestones={milestones}
                isDashboardLoading={isDashboardLoading}
                isDashboardError={isDashboardError}
                onRetry={refetchDashboard}
                ganttDeptFilter={ganttDeptFilter}
                setGanttDeptFilter={setGanttDeptFilter}
                ganttTypeFilter={ganttTypeFilter}
                setGanttTypeFilter={setGanttTypeFilter}
                ganttStatusFilter={ganttStatusFilter}
                setGanttStatusFilter={setGanttStatusFilter}
                budgetTableData={budgetTableData}
                budgetSummaryData={summaryData}
                isBudgetLoading={isBudgetLoading}
                renderBudgetTableContent={renderBudgetTable}
                budgetCurrencySymbol={symbol}
              />
            </section>
            {/* End project-dashboard-main-content */}


            {showPdfPreview && (
              <React.Suspense fallback={<div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div></div>}>
                <PdfPreviewModal
                  show={showPdfPreview}
                  onClose={() => setShowPdfPreview(false)}
                  activeProject={activeProject}
                  milestones={milestones}
                  criticalIssues={criticalIssues.slice(0, 5)}
                  sopData={sopData}
                  summaryData={summaryData}
                  visibleSections={emailData.selectedSections}
                  availablePhases={availablePhases}
                  getTrackerForPhase={getTrackerForPhase}
                  budgetTableData={budgetTableData}
                  submoduleData={submoduleData}
                  selectedBudgetProject={selectedBudgetProject}
                  masterProjects={masterProjects}
                  budgetCurrency={budgetCurrency}
                  chartImages={pdfChartImages}
                  ganttDeptFilter={ganttDeptFilter}
                  ganttTypeFilter={ganttTypeFilter}
                  ganttStatusFilter={ganttStatusFilter}
                />
              </React.Suspense>
            )}

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
                <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '50%' }}>
                      <Trash2 size={24} color="#ef4444" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Delete Project</h3>
                  </div>
                  <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Are you sure you want to permanently delete <strong>{projectToDelete.name}</strong>? This action will remove it from all views.
                    <br /><br />
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>Note: If this project contains uploaded trackers, you must delete those files from the Trackers module first.</span>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={() => setProjectToDelete(null)}
                      disabled={loading}
                      style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      disabled={loading}
                      style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                      {loading ? 'Deleting...' : 'Delete Project'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

// Rich Text Editor Component
const RichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !editorRef.current.contains(document.activeElement)) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleCommand = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ backgroundColor: 'var(--bg)', padding: '6px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '4px' }}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleCommand('bold'); }} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-primary)' }}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleCommand('italic'); }} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', fontStyle: 'italic', color: 'var(--text-primary)' }}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); handleCommand('underline'); }} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-primary)' }}>U</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        style={{ padding: '12px', minHeight: '100px', outline: 'none', fontSize: '13px', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
      />
    </div>
  );
};

// Recipient Input Component
const RecipientInput = ({ label, type, emails, onUpdate, allEmployees, disabledEmails = [] }) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);
  const confirm = useConfirm();

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !email.includes('@') && email.length > 2;

  const handleRemove = (index) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    onUpdate(newEmails);
    setErrorMsg('');
  };

  const handleAdd = async (email, closeDropdown = true) => {
    if (disabledEmails.includes(email)) {
      setErrorMsg('This email is already added to another field');
      setInputValue('');
      return;
    }
    if (email && !emails.includes(email)) {
      if (!isValidEmail(email)) {
        setErrorMsg('Invalid email format');
        return;
      }

      const emailExists = allEmployees?.some(emp => String(emp.email).toLowerCase() === String(email).toLowerCase());
      if (!emailExists) {
        const isConfirmed = await confirm({
          title: 'Recipient Not Found',
          description: 'This email address is not registered in our system. Are you sure you want to add it anyway?',
          confirmText: 'Yes, add anyway',
          cancelText: 'Cancel'
        });

        if (!isConfirmed) {
          setInputValue('');
          return;
        }
      }

      onUpdate([...emails, email]);
    }
    setInputValue('');
    if (closeDropdown) {
      setShowDropdown(false);
    }
    setErrorMsg('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAdd(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      handleRemove(emails.length - 1);
    }
  };

  const filteredEmployees = allEmployees?.filter(emp =>
    String(emp.name || '').toLowerCase().includes(inputValue.toLowerCase()) ||
    String(emp.email || '').toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 50) || [];

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</label>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '6px 8px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          backgroundColor: 'var(--surface)',
          minHeight: '34px',
          alignItems: 'center',
          position: 'relative',
          cursor: 'text'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email, index) => (
          <div key={`${type}-${index}`} style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--elevated-card)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span>{email}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
              style={{
                background: 'none',
                border: 'none',
                marginLeft: '4px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '0 2px'
              }}
            >
              ×
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim() && inputValue.includes('@')) {
              handleAdd(inputValue.trim());
            } else {
              setShowDropdown(false);
              setInputValue('');
            }
          }}
          placeholder={emails.length === 0 ? "Enter email address or search employee..." : ""}
          style={{
            flex: 1,
            minWidth: '150px',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            backgroundColor: 'transparent'
          }}
        />

        {errorMsg && (
          <div style={{ position: 'absolute', bottom: '-18px', left: 0, color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && filteredEmployees.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginTop: '4px',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 20
          }}>
            {filteredEmployees.map(contact => {
              const isDisabled = disabledEmails.includes(contact.email) || emails.includes(contact.email);
              return (
                <div
                  key={contact.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!isDisabled) {
                      handleAdd(contact.email, false);
                    }
                  }}
                  style={{
                    padding: '8px 15px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isDisabled ? 0.4 : 1,
                    backgroundColor: isDisabled ? 'var(--bg)' : 'var(--surface)'
                  }}
                  onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                  onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
                >
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>{contact.name || 'Unknown Name'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{contact.email} • {contact.department || 'No Dept'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Email Modal Component
const EmailModal = ({
  show,
  onClose,
  activeProject,
  visibleSections,
  emailData,

  setEmailData,
  allEmployees,
  employeeSearchTerm,
  setEmployeeSearchTerm,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  activeEmailField,
  setActiveEmailField,
  addContactFromList,
  handleEmailInputChange,
  removeEmailInput,
  availablePhases,
  getTrackerForPhase,
  handleSendEmail,
  onPreviewPdf,
  onExportPdf
}) => {
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [formError, setFormError] = useState('');

  if (!show) return null;

  const availableSectionKeys = Object.keys(emailData.selectedSections).filter(key => {
    const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
    if (metricKeys.includes(key)) return availablePhases[key];
    return true;
  });

  const allSelected = availableSectionKeys.every(key => emailData.selectedSections[key]);

  const handleSelectAll = () => {
    const newState = !allSelected;
    const updatedSections = {};
    Object.keys(emailData.selectedSections).forEach(key => {
      updatedSections[key] = newState;
    });
    setEmailData(prev => ({ ...prev, selectedSections: updatedSections }));
  };

  const handleSectionToggle = (section) => {
    setEmailData(prev => ({
      ...prev,
      selectedSections: {
        ...prev.selectedSections,
        [section]: !prev.selectedSections[section]
      }
    }));
  };

  return (
    <Modal
      isOpen={show}
      onClose={onClose}
      title="Send Project Dashboard Summary"
      description={`Email the dashboard summary for ${activeProject?.name}.`}
      size="3xl"
      footer={
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>

          <button
            onClick={onPreviewPdf}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--surface)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Maximize2 size={14} />
            Preview PDF
          </button>

          <button
            onClick={onExportPdf}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--surface)',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            Export PDF
          </button>

          <button
            onClick={() => {
              const validToEmails = emailData.emailInputs.filter(e => e.trim() !== '');
              if (validToEmails.length === 0) {
                setFormError('Please add at least one valid recipient to the "To" field.');
                return;
              }
              setFormError('');
              handleSendEmail();
            }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Send Email
          </button>
        </div>
      }
    >
      {formError && (
        <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>
          {formError}
        </div>
      )}

      {/* To, CC, BCC fields */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
        <label style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>To: <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!showCc && <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={() => setShowCc(true)}>Add CC</button>}
          {!showBcc && <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={() => setShowBcc(true)}>Add BCC</button>}
        </div>
      </div>
      <RecipientInput
        label=""
        type="email"
        emails={emailData.emailInputs.filter(e => e.trim() !== '')}
        disabledEmails={[...emailData.ccInputs.filter(e => e.trim() !== ''), ...emailData.bccInputs.filter(e => e.trim() !== '')]}
        onUpdate={(newEmails) => setEmailData(prev => ({ ...prev, emailInputs: newEmails }))}
        allEmployees={allEmployees}
      />
      {showCc && (
        <RecipientInput
          label="CC:"
          type="cc"
          emails={emailData.ccInputs.filter(e => e.trim() !== '')}
          disabledEmails={[...emailData.emailInputs.filter(e => e.trim() !== ''), ...emailData.bccInputs.filter(e => e.trim() !== '')]}
          onUpdate={(newEmails) => setEmailData(prev => ({ ...prev, ccInputs: newEmails }))}
          allEmployees={allEmployees}
        />
      )}
      {showBcc && (
        <RecipientInput
          label="BCC:"
          type="bcc"
          emails={emailData.bccInputs.filter(e => e.trim() !== '')}
          disabledEmails={[...emailData.emailInputs.filter(e => e.trim() !== ''), ...emailData.ccInputs.filter(e => e.trim() !== '')]}
          onUpdate={(newEmails) => setEmailData(prev => ({ ...prev, bccInputs: newEmails }))}
          allEmployees={allEmployees}
        />
      )}


      {/* Subject */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>Subject:</label>
        <input
          type="text"
          value={emailData.subject}
          onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>Message (Optional):</label>
        <RichTextEditor
          value={emailData.message}
          onChange={(html) => setEmailData(prev => ({ ...prev, message: html }))}
        />
      </div>

      {/* Attachments */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>Attachments:</label>
        {emailData.includePdf ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--elevated-card)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ marginRight: '6px', fontSize: '14px' }}>📎</span> {activeProject?.name || 'Project'}_Dashboard_Report.pdf (Auto-generated)
            <button
              type="button"
              onClick={() => setEmailData(prev => ({ ...prev, includePdf: false }))}
              style={{ background: 'none', border: 'none', marginLeft: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', padding: '0' }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEmailData(prev => ({ ...prev, includePdf: true }))}
            style={{ background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', color: 'var(--accent)', fontSize: '12px', fontWeight: 'bold' }}
          >
            + Attach Dashboard PDF
          </button>
        )}
      </div>

      {/* Section selection */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>Select Sections to Include:</label>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: `1px solid ${allSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
              backgroundColor: allSelected ? 'var(--accent)' : 'var(--surface)',
              color: allSelected ? 'white' : 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {/* Default Sections */}
          {[
            { id: 'criticalIssues', label: 'Critical Issues' },
            { id: 'budget', label: 'Budget Summary' },
            { id: 'resource', label: 'Resource Summary' },
            { id: 'quality', label: 'Quality Summary' },
            { id: 'design', label: 'Design' },
            { id: 'partDevelopment', label: 'Part Development' },
            { id: 'build', label: 'Build' },
            { id: 'gateway', label: 'Gateway' },
            { id: 'validation', label: 'Validation' },
            { id: 'qualityIssues', label: 'Quality Issues' },

          ].filter(section => {
            // Only show if visible on the dashboard
            if (!visibleSections[section.id]) return false;

            const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
            if (metricKeys.includes(section.id)) return availablePhases[section.id];
            return true;
          }).map(section => (
            <label key={section.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={emailData.selectedSections[section.id] || false}
                onChange={() => handleSectionToggle(section.id)}
                style={{ cursor: 'pointer' }}
              />
              {section.label}
            </label>
          ))}

          {/* Dynamic Trackers */}
          {(activeProject?.submodules || []).filter(sub => {
            // Filter out unnamed or unwanted submodules
            const name = sub.displayName || sub.name || '';
            if (!name.trim()) return false;

            // Only show if visible on the dashboard
            if (!visibleSections[sub.id]) return false;

            const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
            const coveredByDefault = defaultIds.some(id => {
              const tracker = getTrackerForPhase(id);
              return tracker && tracker.id === sub.id;
            });
            return !coveredByDefault;
          }).map(sub => (
            <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={emailData.selectedSections[sub.id] || false}
                onChange={() => handleSectionToggle(sub.id)}
                style={{ cursor: 'pointer' }}
              />
              {sub.displayName || sub.name}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// Axis Selector Modal Component
const AxisSelectorModal = ({
  chartId,
  onClose,
  activeProject,
  axisConfigs,
  submoduleData,
  tracker,
  availableColumns,
  handleAxesUpdate
}) => {
  const config = axisConfigs[activeProject.id]?.[chartId] || { xAxis: '', yAxis: '' };
  const [localConfig, setLocalConfig] = useState(config);

  // Compute dynamic availableColumns based on prefetched data
  const dynamicAvailableColumns = useMemo(() => {
    if (tracker) {
      const data = submoduleData[tracker.trackerId];
      if (data && data.headers && data.headers.length > 0) {
        return data.headers;
      }
    }
    return []; // No data available
  }, [tracker, submoduleData]);

  // Set defaults if localConfig is empty but columns are available
  useEffect(() => {
    if (dynamicAvailableColumns.length > 0) {
      if (!localConfig.xAxis || !dynamicAvailableColumns.includes(localConfig.xAxis)) {
        setLocalConfig(prev => ({ ...prev, xAxis: dynamicAvailableColumns[0] }));
      }
      if (!localConfig.yAxis || !dynamicAvailableColumns.includes(localConfig.yAxis)) {
        setLocalConfig(prev => ({ ...prev, yAxis: dynamicAvailableColumns.length > 1 ? dynamicAvailableColumns[1] : dynamicAvailableColumns[0] }));
      }
    }
  }, [dynamicAvailableColumns]);

  const [showPrompt, setShowPrompt] = useState(false);

  const handleApply = () => {
    // Check if both axes are dates
    const data = (tracker && submoduleData[tracker.trackerId] && submoduleData[tracker.trackerId].rows) || [];
    const isXDate = isDateColumn(data, localConfig.xAxis);
    const isYDate = isDateColumn(data, localConfig.yAxis);

    if (isXDate && isYDate) {
      const relationship = inferDateRelationship(localConfig.xAxis, localConfig.yAxis);
      if (relationship) {
        handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, relationship);
        onClose();
      } else {
        setShowPrompt(true);
      }
    } else {
      handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, null);
      onClose();
    }
  };

  const handleSelectedMetric = (type, label, date1, date2) => {
    handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, { type, label, date1, date2 });
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-[200] w-72">
      {!showPrompt ? (
        <>
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Configure Axes</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-200 text-xs w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              X-Axis Attribute
            </label>
            <select
              value={localConfig.xAxis}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, xAxis: e.target.value }))}
              disabled={dynamicAvailableColumns.length === 0}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dynamicAvailableColumns.length === 0 ? (
                <option>Loading attributes...</option>
              ) : (
                dynamicAvailableColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))
              )}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Y-Axis Attribute
            </label>
            <select
              value={localConfig.yAxis}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, yAxis: e.target.value }))}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
            >
              {dynamicAvailableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-transparent"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Apply
            </button>
          </div>
        </>
      ) : (
        <div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3 mb-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-750">
            <strong className="text-blue-600 dark:text-blue-400">Attr 1:</strong> {localConfig.xAxis}<br />
            <strong className="text-blue-600 dark:text-blue-400">Attr 2:</strong> {localConfig.yAxis}
          </div>
          <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-3 leading-relaxed">
            Both are dates — what should we calculate?
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleSelectedMetric('delay', 'Delay', localConfig.xAxis, localConfig.yAxis)}
              className="px-3 py-2 text-left rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/40 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 cursor-pointer"
            >
              Delay = {localConfig.yAxis} - {localConfig.xAxis}
            </button>
            <button
              onClick={() => handleSelectedMetric('duration', 'Duration', localConfig.xAxis, localConfig.yAxis)}
              className="px-3 py-2 text-left rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 cursor-pointer"
            >
              Duration = {localConfig.yAxis} - {localConfig.xAxis}
            </button>
            <button
              onClick={() => { handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, null); onClose(); }}
              className="px-3 py-2 text-left rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-xs font-semibold text-slate-750 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Plot as-is (no calculation)
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="py-1.5 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ← Back to selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTitleDashboard;
