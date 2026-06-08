import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import API from '../utils/api';
import * as XLSX from 'xlsx';
import {
  setActiveModule,
  setActiveView,
  addToNavigationHistory,
  togglePinHistoryItem,
  renameHistoryItem,
  deleteHistoryItem,
  saveChatToHistory,
  setCurrentChatId,
  togglePinChat,
  renameChat,
  deleteChat,
  setChatHistory
} from '../store/slices/navSlice';
import {
  Plus, Search, LayoutGrid, Code2, MoreHorizontal, MoreVertical,
  MessageSquare, Volume2, User, Settings, RefreshCcw,
  ChevronLeft, PanelLeftClose, PanelLeft, FolderKanban, Users,
  Database, FileUp, BarChart3, Calendar, Clock, ChevronDown,
  Pin, Trash2, Edit2, Check, X, Navigation, AlertCircle, Send,
  FileSpreadsheet, Copy, Check as CheckCircle
} from 'lucide-react';
import { trackerSidebarManager } from '../utils/trackerSidebarManager';
import { getEmployees } from '../utils/employeeApi';
import { getCurrentUser } from '../utils/userUtils';
import useCurrency from '../hooks/useCurrency';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

const AgentView = () => {
  const { themeSettings } = useTheme();
  const isDark = themeSettings?.displayMode === 'dark';
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { navigationHistory, chatHistory, currentChatId, unreadNotifications } = useSelector(state => state.nav);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const { symbol, format, code, convert } = useCurrency();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showModules, setShowModules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null); // { id, title, type }
  const [pendingAction, setPendingAction] = useState(null); // { type, data, subType }
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);

  // Tracker Upload State
  const fileInputRef = useRef(null);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [uploadingTracker, setUploadingTracker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectList, setProjectList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [trackerForm, setTrackerForm] = useState({
    project: '',
    department: 'Design Release',
    employeeName: '',
    file: null
  });
  const [trackerFormErrors, setTrackerFormErrors] = useState({});
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  // Budget Upload State
  const budgetFileInputRef = useRef(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [budgetForm, setBudgetForm] = useState({
    project: '',
    department: '',
    uploaded_by: '',
    file: null,
    preview: []
  });
  const [budgetErrors, setBudgetErrors] = useState({});

  // Filter chat history by current user email
  const userChatHistory = chatHistory.filter(c => c.userEmail === user?.email);

  // Chat history list
  const combinedHistory = userChatHistory.map(c => ({ ...c, type: 'chat', sortDate: c.timestamp }))
    .filter(item => {
      if (!searchQuery) return true;
      const title = item.title || '';
      return title.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.sortDate) - new Date(a.sortDate);
    });

  // Load tracker metadata on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projResp, empResp, deptResp] = await Promise.all([
          API.get('/projects/'),
          getEmployees(),
          API.get('/departments/')
        ]);
        setProjectList(projResp.data || []);
        setEmployeeList(empResp.data || []);
        setDepartments(deptResp.data || []);
      } catch (err) {
        console.error("Error fetching tracker metadata:", err);
      }
    };
    fetchData();
  }, []);

  // Set default uploaded_by for budget
  useEffect(() => {
    if (user) {
      setBudgetForm(prev => ({
        ...prev,
        uploaded_by: user.full_name || user.name || 'User'
      }));
    }
  }, [user]);

  const openTrackerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openBudgetUpload = () => {
    if (budgetFileInputRef.current) {
      budgetFileInputRef.current.click();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTrackerForm(prev => ({ ...prev, file }));
      setShowTrackerModal(true);
      e.target.value = '';
    }
  };

  const handleBudgetFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      setBudgetForm(prev => ({
        ...prev,
        file: file,
        preview: data
      }));
      setShowBudgetModal(true);
      setPlusMenuOpen(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleTrackerUpload = async () => {
    const errors = {};
    if (!trackerForm.project) errors.project = 'Project is required';
    if (!trackerForm.department) errors.department = 'Department is required';
    if (!trackerForm.employeeName) errors.employeeName = 'Employee is required';

    if (Object.keys(errors).length > 0) {
      setTrackerFormErrors(errors);
      return;
    }

    setUploadingTracker(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', trackerForm.file);
      formData.append('project', trackerForm.project);
      formData.append('department', trackerForm.department);
      formData.append('employeeName', trackerForm.employeeName);

      const response = await API.post('/upload-tracker', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      const newTracker = response.data;
      const currentUser = user || getCurrentUser();

      // Update Sidebar
      trackerSidebarManager.addToUploadTrackers(
        trackerForm.project,
        newTracker.fileName,
        newTracker.id,
        {
          department: trackerForm.department,
          employeeName: trackerForm.employeeName,
          fileType: newTracker.fileType
        }
      );

      trackerSidebarManager.addToProjectDashboard(
        trackerForm.project,
        newTracker.fileName,
        newTracker.id,
        currentUser,
        {
          department: trackerForm.department,
          uploadedBy: currentUser,
          fileType: newTracker.fileType
        }
      );

      // Dispatch global sync events
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'create', tracker: newTracker }
      }));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'create', tracker: newTracker }
      }));

      // Success notification in chat
      const successMsg = {
        id: Date.now(),
        content: `Successfully uploaded ${newTracker.fileName} for ${trackerForm.project}. It is now visible in the trackers module and sidebar.`,
        role: 'assistant',
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, successMsg]);

      setShowTrackerModal(false);
      setTrackerForm({ project: '', department: 'Design Release', employeeName: '', file: null });
    } catch (err) {
      console.error('Tracker upload failed:', err);
      toast.error('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingTracker(false);
    }
  };

  const handleBudgetUpload = async () => {
    const errors = {};
    if (!budgetForm.project) errors.project = 'Project is required';
    if (!budgetForm.department) errors.department = 'Department is required';
    if (!budgetForm.file || budgetForm.preview.length === 0) errors.file = 'A valid file is required';

    if (Object.keys(errors).length > 0) {
      setBudgetErrors(errors);
      return;
    }

    try {
      setUploadingBudget(true);

      const payload = {
        project_name: budgetForm.project,
        uploaded_by: budgetForm.uploaded_by,
        department: budgetForm.department,
        budget_data: budgetForm.preview
      };

      await API.post(`/budget/${encodeURIComponent(budgetForm.project)}`, payload);

      // Notify Dashboard
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

      // Add feedback message
      const feedbackMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `Budget Uploaded Successfully!\n\nProject: ${budgetForm.project}\nDepartment: ${budgetForm.department}\nFile: ${budgetForm.file?.name}\n\nThe budget summary has been processed and saved.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, feedbackMsg]);

      setShowBudgetModal(false);
      setBudgetForm({ project: '', department: '', uploaded_by: budgetForm.uploaded_by, file: null, preview: [] });
      setBudgetErrors({});
    } catch (err) {
      console.error('Budget upload failed:', err);
      toast.error('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingBudget(false);
    }
  };

  const menuRef = useRef(null);
  const editInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchChats = async () => {
      if (user?.email) {
        try {
          const res = await API.get(`/chats/?user_email=${user.email}`);
          const chats = res.data.map(c => ({
            id: c.chat_id,
            title: c.title,
            messages: c.messages,
            userEmail: c.user_email,
            pinned: c.pinned,
            timestamp: c.timestamp
          }));
          dispatch(setChatHistory(chats));
        } catch (err) {
          console.error("Failed to fetch chats:", err);
        }
      }
    };
    fetchChats();
  }, [user?.email]);

  useEffect(() => {
    if (currentChatId) {
      const activeChat = chatHistory.find(c => c.id === currentChatId);
      if (activeChat) {
        setChatMessages(activeChat.messages);
      }
    } else {
      setChatMessages([]);
    }
  }, [currentChatId, chatHistory]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const modules = [
    { id: 'project-dashboard', name: 'Dashboard', path: 'projects', icon: <BarChart3 size={20} />, color: 'bg-blue-500/10 text-blue-400' },
    { id: 'mom-module', name: 'MOM', path: 'mom', icon: <Calendar size={20} />, color: 'bg-emerald-500/10 text-emerald-400' },
    { id: 'masters-main', name: 'Masters', path: 'masters', icon: <Database size={20} />, color: 'bg-purple-500/10 text-purple-400' },
    { id: 'system-settings', name: 'Settings', path: 'settings', icon: <Settings size={20} />, color: 'bg-slate-500/10 text-slate-400' },
    { id: 'budget-upload', name: 'Budget Upload', path: 'budget-upload', icon: <FileUp size={20} />, color: 'bg-orange-500/10 text-orange-400' },
    { id: 'upload-trackers', name: 'Trackers Upload', path: 'trackers', icon: <FileUp size={20} />, color: 'bg-pink-500/10 text-pink-400' },
    { id: 'employee-master', name: 'Employee Master', path: 'masters/employees', icon: <Users size={20} />, color: 'bg-cyan-500/10 text-cyan-400' },
    { id: 'project-master', name: 'Project Master', path: 'masters/project-master', icon: <FolderKanban size={20} />, color: 'bg-indigo-500/10 text-indigo-400' },
  ];

  const handleModuleClick = (module) => {
    if (editingId) return;
    dispatch(addToNavigationHistory({
      id: module.id,
      name: module.name,
      path: module.path,
      timestamp: new Date().toISOString()
    }));
    dispatch(setActiveView('dashboard'));
    dispatch(setActiveModule(module.id));
    navigate(`/dashboard/${module.path}`);
  };

  const startNewChat = () => {
    dispatch(setCurrentChatId(null));
    setChatMessages([]);
    setShowModules(false);
  };

  const handleSendMessage = async (e, overrideMessage = null, overrideHistory = null) => {
    if (e) e.preventDefault();
    const msgText = overrideMessage !== null ? overrideMessage : message;
    if (!msgText.trim()) return;

    const userMessage = msgText.trim();
    if (overrideMessage === null) {
      setMessage('');
    }

    const currentHistory = overrideHistory !== null ? overrideHistory : chatMessages;
    const newMessages = [...currentHistory, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setIsTyping(true);

    const chatId = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) dispatch(setCurrentChatId(chatId));

    // Fetch fresh data for context
    let latestProjects = projectList;
    let latestEmployees = employeeList;
    try {
      const [pResp, eResp] = await Promise.all([
        API.get('/projects/'),
        API.get('/employees/')
      ]);
      latestProjects = pResp.data || [];
      latestEmployees = eResp.data || [];
    } catch (err) {
      console.error("Fresh fetch failed:", err);
    }

    setTimeout(async () => {
      let response = "";
      let navigationModule = null;
      let fetchedData = null;
      let dataType = null;

      try {
        // Normalize shorthands and common typos
      let lowerMsg = userMessage.toLowerCase().trim();
      const shorthands = {
        ' u ': ' you ', ' r ': ' are ', ' ur ': ' your ',
        ' plz ': ' please ', ' thx ': ' thanks ', ' thnks ': ' thanks ',
        ' proj ': ' project ', ' dash ': ' dashboard ', ' mgr ': ' manager ',
        ' projct ': ' project ', ' projs ': ' projects ', ' employe ': ' employee '
      };

      let paddedMsg = ` ${lowerMsg} `;
      const corrections = [];
      Object.entries(shorthands).forEach(([short, full]) => {
        if (paddedMsg.includes(short)) {
          paddedMsg = paddedMsg.split(short).join(full);
          corrections.push(`'${short.trim()}' -> '${full.trim()}'`);
        }
      });
      lowerMsg = paddedMsg.trim();

      // Fuzzy matching helper (Levenshtein distance)
      const getDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
          }
        }
        return matrix[b.length][a.length];
      };

      const stopWordsForMatching = [
        'employee', 'project', 'admin', 'user', 'manager', 'lead', 'master', 'active', 'inactive', 'dashboard', 'status',
        'tell', 'show', 'give', 'find', 'search', 'about', 'what', 'how', 'list', 'fetch', 'display', 'print', 'details', 'info',
        'please', 'know', 'want', 'need', 'there', 'here', 'some', 'any', 'many', 'much', 'does', 'that', 'this', 'these', 'those',
        'have', 'make', 'made', 'work', 'done', 'task', 'tasks', 'update', 'updates', 'change', 'changes', 'action', 'actions'
      ];

      const isFuzzyMatch = (targetName, queryMsg) => {
        if (!targetName) return false;
        const targetWords = targetName.split(/\s+/).filter(w => w.length > 3 && !stopWordsForMatching.includes(w.toLowerCase()));
        if (targetWords.length === 0) return false;
        const queryWords = queryMsg.split(/\s+/).filter(w => w.length > 3 && !stopWordsForMatching.includes(w.toLowerCase()));

        for (const tw of targetWords) {
          if (queryMsg.includes(tw)) return true;
          for (const qw of queryWords) {
            if (Math.abs(tw.length - qw.length) <= 2) {
              const dist = getDistance(tw, qw);
              if ((dist <= 2 && tw.length >= 5) || (dist <= 1 && tw.length >= 4)) {
                if (tw !== qw) {
                  const corr = `'${qw}' -> '${tw}'`;
                  if (!corrections.includes(corr)) corrections.push(corr);
                }
                return true;
              }
            }
          }
        }
        return false;
      };

      // Enhanced matching for projects and employees
      const getMatchedEntities = () => {
        const matchedProjects = (latestProjects || []).filter(p => {
          const name = (p.name || '').toLowerCase();
          const id = (p.project_id || '').toLowerCase();
          if (id && lowerMsg.includes(id)) return true;
          if (name && lowerMsg.includes(name)) return true;
          return isFuzzyMatch(name, lowerMsg);
        });

        const matchedEmployees = (latestEmployees || []).filter(e => {
          const name = (e.name || '').toLowerCase();
          const fullName = (e.full_name || '').toLowerCase();
          const email = (e.email || '').toLowerCase();

          if (email && lowerMsg.includes(email)) return true;

          const cleanName = name.split(/\s+/).filter(w => !stopWordsForMatching.includes(w)).join(' ');
          const cleanFullName = fullName.split(/\s+/).filter(w => !stopWordsForMatching.includes(w)).join(' ');

          if (cleanName.length > 3 && lowerMsg.includes(cleanName)) return true;
          if (cleanFullName.length > 3 && lowerMsg.includes(cleanFullName)) return true;

          return isFuzzyMatch(cleanName, lowerMsg) || isFuzzyMatch(cleanFullName, lowerMsg);
        });

        return { matchedProjects, matchedEmployees };
      };

      const { matchedProjects, matchedEmployees } = getMatchedEntities();
      const mentionsProjectOrEmployee = matchedProjects.length > 0 || matchedEmployees.length > 0;

      // 1. DATA SEARCH (Prioritize actual data over identity as per Rule 7)

      // Handle individual employee search if specific names are mentioned
      if (matchedEmployees.length > 0 && !/\b(all|list|who are|any|who r|how many|count)\b/i.test(lowerMsg)) {
        response = `I found matching record(s) for the personnel mentioned:\n\n`;
        matchedEmployees.forEach((emp, idx) => {
          response += `${idx + 1}. **${emp.name || emp.full_name}**\n`;
          response += `   - Email: ${emp.email}\n`;
          response += `   - Role: ${emp.role || 'User'}\n`;
          response += `   - Department: ${emp.department || 'N/A'}\n`;
          response += `   - Status: ${emp.status || 'Active'}\n\n`;
        });
        fetchedData = matchedEmployees.map(e => ({ ...e, name: e.name || e.full_name }));
        dataType = 'employee';
      }

      // 2. INTELLIGENT EMPLOYEE & USER QUERIES (Role Search)
      if (!response && matchedProjects.length === 0) {
        const employeeRegex = /\b(employee|employees|employea|employes|user|users|staff|team member|team members|personnel|people|who works)\b/i;
        const adminRegex = /\b(admin|admins|administrator|administrators)\b/i;
        const superAdminRegex = /\b(super admin|super admins|head admin|top admin|master admin|main admin)\b/i;
        const leaderRegex = /\b(manager|managers|lead|leads|head|heads|director|directors|vp|chief|leadership)\b/i;

        const hasEmployeeTerm = employeeRegex.test(lowerMsg);
        const hasAdminTerm = adminRegex.test(lowerMsg);
        const hasSuperAdminTerm = superAdminRegex.test(lowerMsg);
        const hasLeaderTerm = leaderRegex.test(lowerMsg);

        const isListQuery = /\b(all|list|show|who are|any|who is|who r|get|fetch|display|print|how many|count)\b/i.test(lowerMsg);

        if (hasEmployeeTerm || hasAdminTerm || hasSuperAdminTerm || hasLeaderTerm) {
          let filtered = [];
          let queryType = "";

          if (hasSuperAdminTerm) {
            filtered = latestEmployees.filter(e => (e.role || '').toLowerCase().includes('super admin'));
            queryType = "Super Admins";
          } else if (hasAdminTerm) {
            filtered = latestEmployees.filter(e => (e.role || '').toLowerCase().includes('admin'));
            queryType = "Administrators (Admin & Super Admin)";
          } else if (hasLeaderTerm) {
            // Check if user is asking for a SPECIFIC role within leadership
            const leaderTermsList = ['manager', 'lead', 'head', 'director', 'vp', 'chief', 'leadership'];
            const specificTerm = leaderTermsList.find(t => lowerMsg.includes(t));
            const isBroadQuery = /\b(leader|leadership|all)\b/i.test(lowerMsg);

            if (specificTerm && !isBroadQuery) {
              filtered = latestEmployees.filter(e => (e.role || '').toLowerCase().includes(specificTerm));
              queryType = specificTerm.charAt(0).toUpperCase() + specificTerm.slice(1);
            } else {
              const leaderRoles = ['head', 'manager', 'lead', 'director', 'vp', 'chief', 'super admin'];
              filtered = latestEmployees.filter(e => {
                const role = (e.role || '').toLowerCase();
                return leaderRoles.some(lr => role.includes(lr));
              });
              queryType = "Leadership Roles (Heads, Leads, Managers)";
            }
          } else if (isListQuery || hasEmployeeTerm) {
            filtered = latestEmployees;
            queryType = "Employees";
          }

          if (filtered.length > 0) {
            if (/\b(active)\b/i.test(lowerMsg)) {
              filtered = filtered.filter(e => (e.status || '').toLowerCase() === 'active');
              queryType = "Active " + queryType;
            } else if (/\b(inactive|disabled)\b/i.test(lowerMsg)) {
              filtered = filtered.filter(e => (e.status || '').toLowerCase() !== 'active');
              queryType = "Inactive " + queryType;
            }

            if (filtered.length === 0) {
              response = `There are no **${queryType}** currently in the system.`;
            } else {
              response = `I found **${filtered.length}** matching record(s) for **${queryType}**:\n\n`;
              filtered.forEach((emp, idx) => {
                response += `${idx + 1}. **${emp.name || emp.full_name}**\n`;
                response += `   - Email: ${emp.email}\n`;
                response += `   - Role: ${emp.role || 'User'}\n`;
                response += `   - Department: ${emp.department || 'N/A'}\n`;
                response += `   - Status: ${emp.status || 'Active'}\n\n`;
              });
              fetchedData = filtered.map(e => ({ ...e, name: e.name || e.full_name }));
              dataType = 'employee';
            }
          }
        }
      }

      // X. DEPARTMENT QUERIES
      const isDeptQuery = /\b(department|departments|team|teams)\b/i.test(lowerMsg) && 
                          /\b(list|show|what|which|available|exist|are there|have)\b/i.test(lowerMsg);
      if (!response && isDeptQuery) {
        try {
          const deptResp = await API.get('/departments/');
          const masterDepts = (deptResp.data || []).map(d => typeof d === 'string' ? d : (d.name || ''));
          
          // Deep scan: Aggregate from Employees and Projects for complete coverage
          const employeeDepts = (latestEmployees || []).map(e => e.department).filter(Boolean);
          const projectDepts = (latestProjects || []).map(p => p.department).filter(Boolean);
          
          const uniqueDepts = [...new Set([
            ...masterDepts,
            ...employeeDepts,
            ...projectDepts
          ])].map(d => d.trim()).filter(d => d !== '' && d !== '-');

          if (uniqueDepts.length > 0) {
            response = `I found **${uniqueDepts.length}** unique department(s)/team(s) across the system:\n\n`;
            uniqueDepts.sort().forEach((d, idx) => {
              response += `${idx + 1}. **${d}**\n`;
            });
            fetchedData = uniqueDepts.map(d => ({ name: d, details: '-', status: 'Active' }));
            dataType = 'department';
          } else {
            response = "No departments were found in the system.";
          }
        } catch (err) {
          console.error("Dept query error:", err);
          response = "I encountered an error while fetching departments.";
        }
      }

      // 3. IDENTITY & CAPABILITIES (Only if no data was found and it's clearly about identity)
      if (!response) {
        const isAboutMe = !mentionsProjectOrEmployee && (
          /\b(who are you|who are u|who r u|who ru|who u|u r|ur|your name|tell about you|tell about u|what do you do|what u do|help|capabilities|who is kia|what r u|use of this|purpose of this)\b/i.test(lowerMsg) ||
          (/\b(help|capabilities|your name|what do|what u|can u|may i|know me|know you|know u|introduce yourself|describe yourself|explain yourself|purpose|use case)\b/i.test(lowerMsg)) ||
          (/^(who is|what is|who r|what r)$/i.test(lowerMsg.trim()))
        );
        if (isAboutMe) {
          response = "I am KIA, your Intelligent Project Dashboard Assistant. I am designed to help you manage and analyze data across the entire system.\n\n" +
            "**What I can help you with:**\n" +
            "- **Employee Master:** Query users, admins, staff, and leadership roles.\n" +
            "- **Project Analytics:** Get health reports, milestone tracking, and budget summaries.\n" +
            "- **MOMs:** Search through meeting transcripts for specific discussions.\n" +
            "- **Navigation:** Instantly take you to any dashboard module.\n" +
            "- **Automation:** Process tracker or budget file uploads.\n\n" +
            "How can I assist you right now?";
        }
      }

      // 3. ANALYTICS & PROJECT MATCHING
      if (!response) {
        const isMilestoneRequest = /\b(milestone|milestones|track|tracking|progress|timeline|stages)\b/i.test(lowerMsg);
        const isIssueRequest = /\b(issue|issues|problem|problems|criticality|critical|mom|generate|blocker|blockers)\b/i.test(lowerMsg);
        const isHealthRequest = /\b(health|check|risk|risk report|how is|status|status check|tell me about|info|information|details|about|explain|summary|overview)\b/i.test(lowerMsg);
        const isProjectQuery = /\b(project|projects|explain about)\b/i.test(lowerMsg);
        const isDelayedQuery = /\b(delayed|overdue|pending|behind|late)\b/i.test(lowerMsg);
        const isListProjectQuery = isProjectQuery && /\b(all|list|show|what are|which are|are here|in the dashboard|any project|what project|fetch|get|display|how many|count)\b/i.test(lowerMsg);

        if (isListProjectQuery) {
          let filteredProjects = latestProjects;
          let listType = "project(s)";
          
          if (isDelayedQuery) {
            filteredProjects = latestProjects.filter(p => 
              (p.status || '').toLowerCase() === 'delayed' || 
              (p.status || '').toLowerCase() === 'overdue' ||
              (p.status || '').toLowerCase() === 'pending'
            );
            listType = "delayed/overdue project(s)";
          }

          if (filteredProjects.length > 0) {
            response = `I found **${filteredProjects.length}** ${listType} in the dashboard:\n\n`;
            filteredProjects.forEach((proj, idx) => {
              response += `${idx + 1}. **${proj.name}**\n`;
              if (proj.project_id) response += `   - Project ID: ${proj.project_id}\n`;
              if (proj.project_manager) response += `   - Manager: ${proj.project_manager}\n`;
              if (proj.department) response += `   - Department: ${proj.department}\n`;
              response += `\n`;
            });
            fetchedData = filteredProjects.map(p => ({ ...p, type: 'Project' }));
            dataType = 'project';
          } else {
            response = `There are no ${listType} currently available in the dashboard.`;
          }
        } else if (isHealthRequest && matchedProjects.length > 0) {
          try {
            let combinedRes = "";
            let combinedData = [];
            for (const targetProject of matchedProjects) {
              const [issueResp, dashResp] = await Promise.all([
                API.get(`/issues/project/${targetProject.id}/critical`),
                API.get(`/dashboard/${targetProject.id}`)
              ]);
              const issues = issueResp.data || [];
              const milestones = dashResp.data.milestones || [];
              const delayedCount = milestones.filter(m => m.status === 'Delayed').length;
              const criticalCount = issues.filter(iss => iss.priority === 'Critical' || iss.priority === 'High').length;
              const healthScore = Math.max(0, 100 - (delayedCount * 15) - (criticalCount * 20));
              const statusText = healthScore < 50 ? "At Risk" : (healthScore < 85 ? "Warning" : "Healthy");

              combinedRes += `**PROJECT SUMMARY: ${targetProject.name.toUpperCase()}**\n` +
                `------------------------------------------\n` +
                `Status: ${statusText} (Health Score: ${healthScore}/100)\n` +
                `Project ID: ${targetProject.project_id || 'N/A'}\n` +
                `Department: ${targetProject.department || 'General'}\n` +
                `Project Manager: ${targetProject.project_manager || 'N/A'}\n` +
                `Team Lead: ${targetProject.employee_name || 'N/A'}\n\n` +
                `**BUDGET SUMMARY**\n` +
                `- Total Budget: ${symbol}${parseFloat(targetProject.budget || 0).toLocaleString()}\n` +
                `- Utilized: ${symbol}${parseFloat(targetProject.utilized_budget || 0).toLocaleString()}\n` +
                `- Balance: ${symbol}${parseFloat(targetProject.balance_budget || 0).toLocaleString()}\n\n` +
                `**DASHBOARD SECTIONS**\n` +
                `- Milestones: ${milestones.length} (${delayedCount} delayed)\n` +
                `- Critical Issues: ${issues.length} (${criticalCount} high priority)\n\n`;
              combinedData.push(...issues.map(i => ({ name: i.title, type: 'Issue', status: i.priority, project_name: targetProject.name })));
              combinedData.push(...milestones.filter(m => m.status === 'Delayed').map(m => ({ name: m.milestone, type: 'Milestone', status: 'Delayed', project_name: targetProject.name })));
            }
            response = combinedRes.trim();
            fetchedData = combinedData;
            dataType = 'milestone';
          } catch (err) { response = "I encountered an error while fetching project data."; }
        } else if (matchedProjects.length > 0) {
          try {
            let combinedRes = "";
            let combinedList = [];
            const isTeamRequest = lowerMsg.includes('team lead') || lowerMsg.includes('manager') || lowerMsg.includes('who is') || lowerMsg.includes('lead');

            for (const targetProject of matchedProjects) {
              if (isMilestoneRequest) {
                const dashResp = await API.get(`/dashboard/${targetProject.id}`);
                const milestones = dashResp.data.milestones || [];
                combinedRes += `Milestones for ${targetProject.name}:\n`;
                combinedRes += `Found ${milestones.length} milestone(s).\n\n`;
                if (milestones.length > 0) {
                  milestones.forEach(m => {
                    combinedRes += `• ${m.milestone} [${m.module}] - Status: ${m.status}\n`;
                  });
                }
                combinedList.push(...milestones.map(m => ({ name: m.milestone, module: m.module, status: m.status, project_name: targetProject.name })));
              } else if (isIssueRequest) {
                const issueResp = await API.get(`/issues/project/${targetProject.id}/critical`);
                const issues = issueResp.data || [];
                combinedRes += `Critical Issues for ${targetProject.name}:\n`;
                combinedRes += `Found ${issues.length} critical issue(s).\n\n`;
                if (issues.length > 0) {
                  issues.forEach(iss => {
                    combinedRes += `• ${iss.title} [Priority: ${iss.priority}] - Status: ${iss.status}\n`;
                  });
                } else {
                  combinedRes += `No critical issues found for this project.\n`;
                }
                combinedList.push(...issues.map(iss => ({ name: iss.title, priority: iss.priority, status: iss.status, project_name: targetProject.name })));
              } else if (isTeamRequest) {
                combinedRes += `Team details for ${targetProject.name}:\n`;
                combinedRes += `• Project Manager: ${targetProject.project_manager || 'Not Assigned'}\n`;
                combinedRes += `• Team Lead: ${targetProject.employee_name || 'Not Assigned'}\n\n`;
                combinedList.push(targetProject);
              } else {
                combinedRes += `Project Information for ${targetProject.name}:\n`;
                combinedRes += `• Status: ${targetProject.status || 'Active'}\n`;
                combinedRes += `• Department: ${targetProject.department || 'General'}\n\n`;
                combinedList.push(targetProject);
              }
            }
            response = combinedRes.trim();
            fetchedData = combinedList;
            if (isMilestoneRequest) dataType = 'milestone';
            else if (isIssueRequest) dataType = 'issue';
            else dataType = 'project';
          } catch (err) { response = "I could not fetch the full analytics data for those projects."; }
        }

        // If project was queried but not found
        if (!response && isProjectQuery && matchedProjects.length === 0) {
          response = "Sorry, no relevant records were found in the dashboard.";
        }
      }

      // 4. MASTER DATA OPERATIONS (Enhanced Search)
      if (!response) {
        try {
          const isSearch = /\b(search|find|who is|details for|lookup|look up|get info|fetch info|show me)\b/i.test(lowerMsg);
          const emailInMsg = userMessage.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i)?.[0];
          const isEmployee = /\b(employee|user|staff|person|account|colleague)\b/i.test(lowerMsg) || !!emailInMsg;

          if (isSearch && isEmployee) {
            const target = matchedEmployees.length > 0 ? matchedEmployees[0] : latestEmployees.find(e =>
              lowerMsg.includes((e.name || '').toLowerCase()) ||
              lowerMsg.includes((e.full_name || '').toLowerCase()) ||
              (emailInMsg && e.email?.toLowerCase() === emailInMsg.toLowerCase())
            );

            if (target) {
              response = `I found a matching record for **${target.name || target.full_name}**. Here are the details:\n\n`;
              response += `- **Email:** ${target.email}\n`;
              response += `- **Role:** ${target.role || 'User'}\n`;
              response += `- **Department:** ${target.department || 'N/A'}\n`;
              response += `- **Status:** ${target.status || 'Active'}\n`;

              fetchedData = [{ ...target, name: target.name || target.full_name }];
              dataType = 'employee';
            } else {
              response = "Sorry, no relevant records were found in the dashboard.";
            }
          }
        } catch (err) {
          console.error("Master data op error:", err);
        }
      }

      // 5. MEETING INTELLIGENCE (Transcript Search)
      const isTranscriptQuery = /\b(talked about|discussed|mention|mentioned|said|speak about|spoke about|meeting|transcript)\b/i.test(lowerMsg);
      if (!response && isTranscriptQuery) {
        try {
          const query = lowerMsg.replace(/\b(talked about|discussed|mention|mentioned|said|speak about|spoke about|meeting|transcript|search for|find)\b\s*/i, '').trim();
          const searchResp = await API.get('/transcript/global/search', { params: { query } });
          const matches = searchResp.data || [];
          if (matches.length > 0) {
            response = `I found ${matches.length} mention(s) of "${query}" in the meeting transcripts.`;
            fetchedData = matches.map(m => ({ name: m.meeting_title, speaker: m.speaker, text: m.text, timestamp: m.timestamp }));
            dataType = 'transcript_result';
          } else { response = `I couldn't find any discussions about "${query}" in the saved transcripts.`; }
        } catch (err) { response = "I encountered an error while searching transcripts."; }
      }

      // X. ACTIVITY & AUDIT LOGS
      const isActivityRequest = /\b(change|changes|update|updates|activity|activities|action|actions|modification|modifications|log|logs|work|task|tasks|operation|operations|transaction|transactions)\b/i.test(lowerMsg);
      const targetsSelf = /\b(i|my|me)\b/i.test(lowerMsg);
      const hasTarget = targetsSelf || matchedEmployees.length > 0 || userMessage.match(/\b(EMP\d+)\b/i);

      if (!response && isActivityRequest && hasTarget) {
        try {
          let targetId = null;
          let targetName = null;

          if (targetsSelf) {
            targetId = user?.employee_id || user?.id;
            targetName = "you";
          } else if (matchedEmployees.length > 0) {
            targetId = matchedEmployees[0].employee_id || matchedEmployees[0].id;
            targetName = matchedEmployees[0].name || matchedEmployees[0].full_name;
          } else {
            const idMatch = userMessage.match(/\b(EMP\d+)\b/i);
            if (idMatch) {
              targetId = idMatch[1].toUpperCase();
              targetName = targetId;
            }
          }

          if (targetId) {
            const auditResp = await API.get('/audit-logs/', { params: { user_id: targetId, limit: 100 } });
            const logs = auditResp.data || [];
            
            const isToday = lowerMsg.includes('today');
            const filteredLogs = logs.filter(log => {
              if (!isToday) return true;
              const logDate = new Date(log.timestamp).toLocaleDateString();
              const today = new Date().toLocaleDateString();
              return logDate === today;
            });

            if (filteredLogs.length > 0) {
              response = `Yes, ${targetName} made ${filteredLogs.length} update(s)${isToday ? ' today' : ' recently'}:\n\n`;
              filteredLogs.slice(0, 10).forEach((log, idx) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                response += `${idx + 1}. **${log.action}** in ${log.module} at ${timeStr}\n`;
                if (log.details) response += `   - Details: ${log.details}\n`;
              });
              if (filteredLogs.length > 10) response += `\n*(Showing latest 10 of ${filteredLogs.length} updates)*`;
            } else {
              response = `No updates or changes were found for ${targetName}${isToday ? ' today' : ' recently'}.`;
            }
          }
        } catch (err) {
          console.error("Audit log error:", err);
          response = "I encountered an error while retrieving the activity logs.";
        }
      }

      // 6. NAVIGATION & UTILS
      const isNavigationQuery = /\b(navigate|take me to|go to|open|switch to|move to)\b/i.test(lowerMsg);
      if (!response && isNavigationQuery) {
        navigationModule = modules.find(m => lowerMsg.includes(m.name.toLowerCase()) || (m.id === 'masters-main' && /\b(master|masters)\b/i.test(lowerMsg)));
        if (navigationModule) response = `Certainly. I am navigating you to the ${navigationModule.name} page.`;
      }

      // 7. GENERAL FALLBACKS
      if (!response) {
        const isGreeting = /\b(hi|hello|hai|hey|greetings|greet|hlo|helo|hy|u there|u there|u good|yo|sup|good morning|good afternoon|good evening)\b/i.test(lowerMsg);
        const isAcknowledgement = /\b(ok|okay|fine|alright|cool|got it|noted|perfect|understood|k|kk)\b/i.test(lowerMsg);

        if (isGreeting) {
          response = "Hello! I am KIA, your Intelligent Project Dashboard Assistant. How can I help you today?";
        } else if (isAcknowledgement) {
          response = "Great! Let me know if you have any other questions or need help with the dashboard.";
        } else if (/\b(thanks|thank you|thx|thnks|appreciate it)\b/i.test(lowerMsg)) {
          response = "You're very welcome! Let me know if you need anything else.";
        } else {
          response = "Sorry, no relevant records were found in the dashboard.";
        }
      }

      if (corrections.length > 0 && response && !response.startsWith("Sorry")) {
        const uniqueCorrections = [...new Set(corrections)];
        response = `*(Auto-corrected: ${uniqueCorrections.join(', ')})*\n\n` + response;
      }

      } catch (err) {
        console.error("KIA Logic Error:", err);
        response = response || "I encountered an error while processing your request. Please try again.";
      } finally {
        // 8. FINALIZE & SYNC
        const finalMessages = [...newMessages, { role: 'assistant', content: response || "Sorry, I couldn't process that.", data: fetchedData, dataType }];
        setChatMessages(finalMessages);
        setIsTyping(false);

        let finalTitle = "";
        if (currentHistory.length === 0) {
          finalTitle = userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : "");
        } else {
          const activeChat = chatHistory.find(c => c.id === chatId);
          finalTitle = activeChat ? activeChat.title : (userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : ""));
        }

        dispatch(saveChatToHistory({ id: chatId, title: finalTitle, messages: finalMessages, userEmail: user?.email }));
        try {
          await API.post('/chats/save', { chat_id: chatId, title: finalTitle, messages: finalMessages, user_email: user?.email, pinned: false });
        } catch (err) { console.error("Database sync failed:", err); }

        if (navigationModule) {
          setTimeout(() => handleModuleClick(navigationModule), 1500);
        }
      }
    }, 800);
  };

  const handleRename = async (id, type) => {
    if (editValue.trim()) {
      if (type === 'nav') {
        dispatch(renameHistoryItem({ id, newName: editValue.trim() }));
      } else {
        dispatch(renameChat({ id, newTitle: editValue.trim() }));
        try {
          await API.post('/chats/rename', { chat_id: id, title: editValue.trim() });
        } catch (err) {
          console.error("Failed to rename chat in DB:", err);
        }
      }
    }
    setEditingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmItem) return;

    const { id, type } = deleteConfirmItem;
    if (type === 'nav') {
      dispatch(deleteHistoryItem(id));
    } else {
      dispatch(deleteChat(id));
      try {
        await API.delete(`/chats/${id}`);
      } catch (err) {
        console.error("Failed to delete chat in DB:", err);
      }
    }
    setDeleteConfirmItem(null);
  };

  const copyMessageToClipboard = (content, index) => {
    const textToCopy = typeof content === 'string' ? content : content;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const renderMessageContent = (content) => {
    if (!content) return null;
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className={`italic ${isDark ? 'text-white/85' : 'text-slate-600'}`}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const renderHistoryItem = (item, type, index, total = 0) => (
    <div key={item.id} className="relative group/item">
      {editingId === item.id ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border mx-1`}>
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(item.id, type);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className={`bg-transparent border-none focus:ring-0 text-sm p-0 w-full ${isDark ? 'text-white' : 'text-slate-800'}`}
          />
          <div className="flex items-center gap-1">
            <button onClick={() => handleRename(item.id, type)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingId(null)} className={`${isDark ? 'text-white/40' : 'text-slate-400'} hover:text-white p-0.5`}>
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              if (type === 'nav') handleModuleClick(item);
              else dispatch(setCurrentChatId(item.id));
            }}
            className={`w-full text-left pl-3 pr-10 py-2 rounded-lg transition-colors text-sm truncate flex items-center gap-2 group ${currentChatId === item.id 
                ? (isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900 font-medium') 
                : (isDark ? 'text-white/80 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
              }`}
          >
            {item.pinned && <Pin size={12} className="text-emerald-400 fill-emerald-400 shrink-0" />}
            <span className="truncate flex-1">{type === 'nav' ? item.name : item.title}</span>
          </button>

          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(type + index);
              }}
              className={`p-1 ${isDark ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'} rounded transition-colors`}
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          {activeMenu === (type + index) && (
            <div
              ref={menuRef}
              className={`absolute right-2 z-[100] w-36 ${isDark ? 'bg-[#2f2f2f] border-white/10' : 'bg-white border-slate-200 shadow-lg'} border rounded-lg py-1 ${total > 5 && index > total - 4 ? 'bottom-8' : 'top-8'
                }`}
            >
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (type === 'nav') {
                    dispatch(togglePinHistoryItem(item.id));
                  } else {
                    dispatch(togglePinChat(item.id));
                    try {
                      await API.post('/chats/toggle-pin', { chat_id: item.id });
                    } catch (err) {
                      console.error("Failed to toggle pin in DB:", err);
                    }
                  }
                  setActiveMenu(null);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs ${isDark ? 'hover:bg-white/5 text-white/80 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'} flex items-center gap-2 transition-colors`}
              >
                <Pin size={12} className={item.pinned ? 'text-emerald-400 fill-emerald-400' : ''} />
                <span>{item.pinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(item.id);
                  setEditValue(type === 'nav' ? item.name : item.title);
                  setActiveMenu(null);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs ${isDark ? 'hover:bg-white/5 text-white/80 hover:text-white' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'} flex items-center gap-2 transition-colors`}
              >
                <Edit2 size={12} />
                <span>Rename</span>
              </button>
              <div className={`h-px ${isDark ? 'bg-white/5' : 'bg-slate-100'} my-1`}></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmItem({
                    id: item.id,
                    title: type === 'nav' ? item.name : item.title,
                    type
                  });
                  setActiveMenu(null);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs ${isDark ? 'hover:bg-white/5 text-red-400 hover:text-red-300' : 'hover:bg-slate-50 text-red-500 hover:text-red-600'} flex items-center gap-2 transition-colors`}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={`flex h-full w-full ${isDark ? 'bg-black text-white' : 'bg-slate-50 text-slate-800'} font-sans overflow-hidden`}>
      <style>{`
        .kia-agent-table tr {
          background-color: transparent !important;
          border-left: none !important;
        }
        .kia-agent-table tr:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'} !important;
        }
        .kia-agent-table td {
          background-color: transparent !important;
          color: ${isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.8)'} !important;
        }
        .kia-agent-table th {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'} !important;
          color: ${isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.5)'} !important;
        }
      `}</style>
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-[60px]'} flex-shrink-0 transition-all duration-300 ${isDark ? 'bg-black border-white/5' : 'bg-white border-slate-200'} flex flex-col overflow-hidden border-r relative`}
      >
        {/* Collapsed State Icons */}
        <div className={`absolute top-0 left-0 w-full h-full flex flex-col items-center gap-2 mt-4 transition-all duration-300 z-20 ${isDark ? 'bg-black' : 'bg-white'} ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors`} title="Expand Sidebar">
            <PanelLeft size={20} />
          </button>
          <button onClick={startNewChat} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors`} title="New Chat">
            <Edit2 size={20} />
          </button>
          <button onClick={() => { setSidebarOpen(true); setIsSearching(true); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors`} title="Search Chats">
            <Search size={20} />
          </button>
          <button onClick={() => setSidebarOpen(true)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors`} title="Recents">
            <MessageSquare size={20} />
          </button>
        </div>

        {/* Expanded State Content */}
        <div className={`flex flex-col h-full w-64 transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={startNewChat}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/80 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'} transition-colors text-sm font-medium`}
            >
              <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} flex items-center justify-center`}>
                <Plus size={16} />
              </div>
              <span>New chat</span>
            </button>

            <div className="relative group/search">
              {isSearching ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} border mx-0`}>
                  <Search size={16} className={isDark ? 'text-white/40' : 'text-slate-400'} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setIsSearching(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchQuery('');
                        setIsSearching(false);
                      }
                    }}
                    className={`bg-transparent border-none focus:ring-0 text-sm p-0 w-full ${isDark ? 'text-white placeholder-white/20' : 'text-slate-800 placeholder-slate-400'}`}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className={`${isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsSearching(true)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/80 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'} transition-colors text-sm font-medium`}
                >
                  <Search size={18} />
                  <span>Search chats</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1 scrollbar-hide">
            {searchQuery && combinedHistory.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-400'} italic`}>No results found for "{searchQuery}"</p>
              </div>
            )}
            {combinedHistory.length > 0 && (
              <>
                <button
                  onClick={() => setRecentsExpanded(!recentsExpanded)}
                  className={`w-full text-[10px] font-bold ${isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'} uppercase tracking-widest px-3 mb-2 mt-4 flex items-center justify-between group transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>Recents</span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${recentsExpanded ? '' : '-rotate-90'}`} />
                </button>
                {recentsExpanded && combinedHistory.map((item, i) => renderHistoryItem(item, item.type, i, combinedHistory.length))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col relative min-h-0">
        {/* Top Header Controls */}
        <div className={`flex items-center justify-between p-4 ${isDark ? 'bg-black' : 'bg-slate-50'} z-10 shrink-0`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors ${!sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <PanelLeftClose size={20} />
            </button>
          </div>
        </div>

        {/* Central Content */}
        <div className={`flex-1 flex flex-col items-center px-4 max-w-5xl mx-auto w-full min-h-0 ${chatMessages.length === 0 ? 'justify-center' : 'pt-6'}`}>
          {chatMessages.length === 0 ? (
            <div className="pb-8 flex flex-col items-center gap-4">
              <h2 className={`text-3xl font-semibold ${isDark ? 'text-white/90' : 'text-slate-800'} text-center`}>What's on your mind today?</h2>

              {unreadNotifications > 0 && (
                <div
                  className="flex items-center gap-3 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full animate-pulse cursor-pointer hover:bg-brand-primary/20 transition-all"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('openNotifications'));
                  }}
                >
                  <AlertCircle className="text-brand-primary h-4 w-4" />
                  <p className="text-sm font-medium text-brand-primary">
                    You have {unreadNotifications} new notification{unreadNotifications > 1 ? 's' : ''}.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex-1 overflow-y-auto mb-4 space-y-6 scrollbar-hide px-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}>
                  <div className={`max-w-[85%] text-sm ${msg.role === 'user'
                      ? (isDark ? 'bg-[#2f2f2f] text-white border-white/10' : 'bg-white text-slate-800 border-slate-200 border shadow-md') + ' rounded-2xl px-4 py-3'
                      : (isDark ? 'text-white/90' : 'text-slate-800') + ' bg-transparent border-none shadow-none px-0 py-1'
                    }`}>
                    {editingMessageIndex === idx ? (
                      <div className="flex flex-col gap-3 w-full min-w-[300px]">
                        <textarea
                          value={editingMessageText}
                          onChange={(e) => setEditingMessageText(e.target.value)}
                          className={`w-full ${isDark ? 'bg-[#1e1e1e] border-white/20 text-white focus:ring-white/40' : 'bg-white border-slate-300 text-slate-800 focus:ring-slate-400'} rounded-xl p-3 focus:outline-none focus:ring-1 resize-none min-h-[80px]`}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setEditingMessageIndex(null); setEditingMessageText(""); }}
                            className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-150 hover:bg-slate-200 text-slate-700'} text-xs font-medium transition-colors`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const newHistory = chatMessages.slice(0, idx);
                              handleSendMessage(null, editingMessageText, newHistory);
                              setEditingMessageIndex(null);
                              setEditingMessageText("");
                            }}
                            className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-slate-900 hover:bg-slate-800 text-white'} text-xs font-semibold transition-colors`}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{renderMessageContent(msg.content)}</div>
                    )}

                    {msg.data && msg.data.length > 0 && (
                      <div className={`mt-4 overflow-x-auto border ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-100/50'} rounded-xl custom-scrollbar`}>
                        <table className="kia-agent-table w-full text-xs text-left">
                          <thead className={`${isDark ? 'bg-white/5 text-white/40' : 'bg-slate-200 text-slate-650'} uppercase tracking-wider`}>
                            <tr>
                              {msg.dataType === 'project' ? (
                                <>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Project ID</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Project Name</th>
                                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Budget</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Department</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Project Manager</th>
                                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Status</th>
                                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Utilized</th>
                                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Balance</th>
                                </>
                              ) : msg.dataType === 'employee' ? (
                                <>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Employee ID</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Name</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Email</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Department</th>
                                  <th className="px-3 py-2 font-medium whitespace-nowrap">Role</th>
                                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Status</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-3 py-2 font-medium">
                                    {msg.dataType === 'milestone' ? 'Item Name' :
                                      msg.dataType === 'issue' ? 'Critical Issue' :
                                        msg.dataType === 'transcript_result' ? 'Meeting' : 'Name'}
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    {msg.dataType === 'milestone' ? 'Module' :
                                      msg.dataType === 'issue' ? 'Priority' :
                                        msg.dataType === 'transcript_result' ? 'Speaker' : 'Details'}
                                  </th>
                                  <th className="px-3 py-2 font-medium text-right">
                                    {msg.dataType === 'transcript_result' ? 'Moment' : 'Status'}
                                  </th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {msg.data.map((item, i) => (
                              <tr key={i} className={`border-b ${isDark ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-150 hover:bg-slate-200/50'} transition-colors bg-transparent`}>
                                {msg.dataType === 'project' ? (
                                  <>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} font-mono text-[10px] whitespace-nowrap`}>{item.project_id || '-'}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/90' : 'text-slate-800'} font-medium whitespace-nowrap`}>{item.name}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/70' : 'text-slate-650'} font-mono text-[10px] text-right whitespace-nowrap`}>
                                      {item.budget ? `${symbol}${parseFloat(item.budget).toLocaleString()}` : '-'}
                                    </td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} text-[10px] whitespace-nowrap`}>{item.department || '-'}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} text-[10px] whitespace-nowrap`}>{item.project_manager || '-'}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(item.status === 'Active' || item.status === 'Completed' || item.status === 'Healthy')
                                          ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600')
                                          : (item.status === 'Delayed' || item.status === 'At Risk' || item.status === 'On Hold')
                                            ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-500/10 text-red-600')
                                            : (isDark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-500')
                                        }`}>
                                        {item.status || 'Active'}
                                      </span>
                                    </td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-550'} font-mono text-[10px] text-right whitespace-nowrap`}>
                                      {item.utilized_budget ? `${symbol}${parseFloat(item.utilized_budget).toLocaleString()}` : '-'}
                                    </td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-550'} font-mono text-[10px] text-right whitespace-nowrap`}>
                                      {item.balance_budget ? `${symbol}${parseFloat(item.balance_budget).toLocaleString()}` : '-'}
                                    </td>
                                  </>
                                ) : msg.dataType === 'employee' ? (
                                  <>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} font-mono text-[10px] whitespace-nowrap`}>{item.employee_id || '-'}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/90' : 'text-slate-800'} font-medium whitespace-nowrap`}>{item.name}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} text-[10px] whitespace-nowrap`}>{item.email}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} text-[10px] whitespace-nowrap`}>{item.department || '-'}</td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-500'} text-[10px] whitespace-nowrap`}>{item.role || 'User'}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(item.status === 'Active' || item.role === 'Admin')
                                          ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600')
                                          : (isDark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-500')
                                        }`}>
                                        {item.status || 'Active'}
                                      </span>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/80' : 'text-slate-800'} font-medium`}>
                                      {item.name}
                                      {(msg.dataType === 'issue' || msg.dataType === 'milestone') && item.project_name && (
                                        <div className={`text-[9px] ${isDark ? 'text-white/30' : 'text-slate-400'} mt-0.5 font-normal`}>
                                          Project: {item.project_name}
                                        </div>
                                      )}
                                      {msg.dataType === 'transcript_result' && (
                                        <div className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'} mt-1 font-normal line-clamp-2 italic`}>
                                          "{item.text}"
                                        </div>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                                      {msg.dataType === 'milestone' ? (item.module || item.type || '-') :
                                        msg.dataType === 'issue' ? (item.priority || 'High') :
                                          msg.dataType === 'transcript_result' ? item.speaker : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {msg.dataType === 'transcript_result' ? (
                                        <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'} font-mono`}>{item.timestamp}</span>
                                      ) : (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(item.status === 'Active' || item.status === 'Completed' || item.status === 'On Track' || item.status === 'Healthy')
                                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600')
                                            : (item.status === 'Delayed' || item.priority === 'High' || item.priority === 'Critical' || item.status === 'At Risk')
                                              ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-500/10 text-red-600')
                                              : (isDark ? 'bg-white/10 text-white/40' : 'bg-slate-100 text-slate-500')
                                          }`}>
                                          {item.status || item.priority || 'Active'}
                                        </span>
                                      )}
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.role === 'user' && (
                      <button
                        onClick={() => {
                          setEditingMessageIndex(idx);
                          setEditingMessageText(msg.content);
                        }}
                        className={`p-1.5 rounded-md ${isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'} transition-all`}
                        title="Edit message"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => copyMessageToClipboard(msg.content, idx)}
                      className={`p-1.5 rounded-md transition-all ${copiedMessageIndex === idx
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : isDark ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                        }`}
                      title="Copy message"
                    >
                      {copiedMessageIndex === idx ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className={`bg-transparent ${isDark ? 'text-white/40' : 'text-slate-400'} px-0 py-3 text-sm animate-pulse`}>
                    KIA is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Chat Box */}
          <form onSubmit={handleSendMessage} className="w-full relative mb-8">
            <div className={`relative ${isDark ? 'bg-[#2f2f2f] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-md'} rounded-2xl border p-1.5 flex items-end gap-2`}>
              <div className="relative flex items-end">
                <button
                  type="button"
                  onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                  className={`p-2 transition-colors mb-1 ${plusMenuOpen ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-white/40' : 'text-slate-400 hover:text-slate-700')}`}
                >
                  <Plus size={20} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                {plusMenuOpen && (
                  <div className={`absolute bottom-full left-0 mb-4 w-56 ${isDark ? 'bg-[#1e1e1e] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'} border rounded-2xl p-2 animate-in slide-in-from-bottom-2 duration-200 z-50`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlusMenuOpen(false);
                        openTrackerUpload();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-slate-50 text-slate-655 hover:text-slate-900'} transition-all text-sm group`}
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                        <FileSpreadsheet size={16} />
                      </div>
                      <span>Upload Tracker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlusMenuOpen(false);
                        openBudgetUpload();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-slate-50 text-slate-655 hover:text-slate-900'} transition-all text-sm group`}
                    >
                      <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20">
                        <FileUp size={16} />
                      </div>
                      <span>Upload Budget</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".csv,.xlsx,.xls,.json,.txt"
              />
              <input
                type="file"
                ref={budgetFileInputRef}
                className="hidden"
                onChange={handleBudgetFileSelect}
                accept=".csv,.xlsx,.xls"
              />
              <textarea
                rows="1"
                placeholder="Ask anything"
                className={`flex-1 bg-transparent border-none focus:ring-0 outline-none focus:outline-none ${isDark ? 'caret-white text-white placeholder-white/40' : 'caret-slate-800 text-slate-800 placeholder-slate-450'} py-2 resize-none max-h-[200px]`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              <div className="flex items-center gap-1 mb-1 pr-1">
                <button type="submit" className={`p-2 rounded-full transition-all ${message.trim() ? (isDark ? 'bg-white text-black' : 'bg-slate-900 text-white hover:bg-slate-800') : (isDark ? 'bg-white/10 text-white/20' : 'bg-slate-100 text-slate-350')}`}>
                  <Send size={20} />
                </button>
              </div>
            </div>
          </form>

          {/* Module Navigation Toggle / Grid */}
          <div className="w-full mb-4">
            {chatMessages.length > 0 ? (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setShowModules(!showModules)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-650 hover:text-slate-800 hover:bg-slate-50'} border transition-all text-sm font-medium`}
                >
                  <Navigation size={16} />
                  <span>Module Navigations</span>
                  <ChevronDown size={14} className={`transition-transform ${showModules ? 'rotate-180' : ''}`} />
                </button>

                {showModules && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {modules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => handleModuleClick(module)}
                        className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-[#2f2f2f] border-white/5 hover:border-white/20 hover:bg-[#383838]' : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'} border transition-all group w-full`}
                      >
                        <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 shrink-0 ${module.color}`}>
                          {React.cloneElement(module.icon, { size: 16 })}
                        </div>
                        <span className={`text-xs font-medium ${isDark ? 'text-white/70 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'} truncate`}>
                          {module.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handleModuleClick(module)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl ${isDark ? 'bg-[#2f2f2f] border-white/5 hover:border-white/20 hover:bg-[#383838]' : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50'} border transition-all group`}
                  >
                    <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${module.color}`}>
                      {module.icon}
                    </div>
                    <span className={`text-sm font-medium ${isDark ? 'text-white/70 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>
                      {module.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`border rounded-2xl w-[400px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-800'} mb-4`}>Delete {deleteConfirmItem.type === 'nav' ? 'navigation' : 'chat'}?</h3>
            <p className={`text-sm ${isDark ? 'text-white/80' : 'text-slate-600'} mb-8 leading-relaxed`}>
              This will delete <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{deleteConfirmItem.title}</span>.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className={`px-6 py-2 rounded-full ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} text-sm font-medium transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 rounded-full bg-[#e11d48] hover:bg-[#be123c] text-white text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracker Upload Modal */}
      {showTrackerModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-slate-100'} flex items-center justify-between`}>
              <div>
                <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Upload Tracker Details</h3>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-slate-500'} mt-1`}>Configure metadata for your tracker upload</p>
              </div>
              <button onClick={() => setShowTrackerModal(false)} className={`p-2 ${isDark ? 'text-white/40 hover:text-white' : 'text-slate-450 hover:text-slate-700'} transition-colors`}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* File Info */}
              <div className={`rounded-xl p-3 flex items-center gap-3 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>{trackerForm.file?.name}</p>
                  <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-wider`}>
                    {trackerForm.file?.size ? (trackerForm.file.size / 1024).toFixed(1) + ' KB' : ''} • Excel Tracker
                  </p>
                </div>
              </div>

              {/* Project Selection */}
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest mb-2 ml-1`}>Target Project</label>
                <div className="relative">
                  <select
                    value={trackerForm.project}
                    onChange={(e) => {
                      setTrackerForm(prev => ({ ...prev, project: e.target.value }));
                      if (trackerFormErrors.project) setTrackerFormErrors(prev => ({ ...prev, project: null }));
                    }}
                    className={`w-full ${isDark ? 'bg-[#2a2a2a] border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-slate-350'} border ${trackerFormErrors.project ? 'border-red-500/50' : ''} rounded-xl px-4 py-3 text-sm focus:ring-1 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select a project</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
                {trackerFormErrors.project && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{trackerFormErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest mb-2 ml-1`}>Department</label>
                <select
                  value={trackerForm.department}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, department: e.target.value }))}
                  className={`w-full ${isDark ? 'bg-[#2a2a2a] border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-slate-350'} border rounded-xl px-4 py-3 text-sm focus:ring-1 transition-all cursor-pointer`}
                >
                  <option value="Design Release">Design Release</option>
                  <option value="Supplier Development">Supplier Development</option>
                  <option value="Production Control">Production Control</option>
                  <option value="Quality Control">Quality Control</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>

              {/* Employee */}
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest mb-2 ml-1`}>Employee Name</label>
                <div className="relative">
                  <select
                    value={trackerForm.employeeName}
                    onChange={(e) => {
                      setTrackerForm(prev => ({ ...prev, employeeName: e.target.value }));
                      if (trackerFormErrors.employeeName) setTrackerFormErrors(prev => ({ ...prev, employeeName: null }));
                    }}
                    className={`w-full ${isDark ? 'bg-[#2a2a2a] border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-slate-350'} border ${trackerFormErrors.employeeName ? 'border-red-500/50' : ''} rounded-xl px-4 py-3 text-sm focus:ring-1 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select internal personnel</option>
                    {employeeList.map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
                {trackerFormErrors.employeeName && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{trackerFormErrors.employeeName}</p>}
              </div>
            </div>

            <div className={`p-6 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'} border-t flex gap-3`}>
              <button
                onClick={() => setShowTrackerModal(false)}
                className={`flex-1 px-4 py-3 rounded-xl ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-200/50 hover:bg-slate-200 text-slate-700'} text-sm font-medium transition-all`}
              >
                Cancel
              </button>
              <button
                disabled={uploadingTracker}
                onClick={handleTrackerUpload}
                className={`flex-[2] px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${uploadingTracker
                    ? 'bg-emerald-500/50 text-white/50 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  }`}
              >
                {uploadingTracker ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    <span>Uploading {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Complete Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl ${isDark ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-850'}`}>
            {/* Header */}
            <div className={`px-8 py-6 border-b ${isDark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'} flex items-center justify-between`}>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-850'} flex items-center gap-2`}>
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <FileUp size={18} />
                  </div>
                  Budget Details
                </h3>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'} mt-1 max-w-[240px]`}>Map your budget file to a project and department</p>
              </div>
              <button
                onClick={() => setShowBudgetModal(false)}
                className={`p-2 ${isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-650'} rounded-full transition-colors`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Project */}
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest mb-2 ml-1`}>Project Name</label>
                <div className="relative">
                  <select
                    value={budgetForm.project}
                    onChange={(e) => {
                      setBudgetForm(prev => ({ ...prev, project: e.target.value }));
                      if (budgetErrors.project) setBudgetErrors(prev => ({ ...prev, project: null }));
                    }}
                    className={`w-full ${isDark ? 'bg-[#2a2a2a] border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-slate-350'} border ${budgetErrors.project ? 'border-red-500/50' : ''} rounded-xl px-4 py-3 text-sm focus:ring-1 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select Target Project</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
                {budgetErrors.project && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{budgetErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest mb-2 ml-1`}>Department</label>
                <div className="relative">
                  <select
                    value={budgetForm.department}
                    onChange={(e) => {
                      setBudgetForm(prev => ({ ...prev, department: e.target.value }));
                      if (budgetErrors.department) setBudgetErrors(prev => ({ ...prev, department: null }));
                    }}
                    className={`w-full ${isDark ? 'bg-[#2a2a2a] border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border-slate-200 text-slate-850 focus:ring-slate-350'} border ${budgetErrors.department ? 'border-red-500/50' : ''} rounded-xl px-4 py-3 text-sm focus:ring-1 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d, idx) => (
                      <option key={idx} value={d.name || d.department_id}>{d.name || d.department_id}</option>
                    ))}
                  </select>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
                    <ChevronDown size={16} />
                  </div>
                </div>
                {budgetErrors.department && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{budgetErrors.department}</p>}
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-[10px] font-medium ${isDark ? 'text-white/20' : 'text-slate-400'} uppercase tracking-widest mb-1.5 ml-1`}>Uploaded By</label>
                  <div className={`border rounded-xl px-4 py-3 text-xs overflow-hidden text-ellipsis whitespace-nowrap ${isDark ? 'bg-white/5 border-white/5 text-white/60' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    {budgetForm.uploaded_by}
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-medium ${isDark ? 'text-white/20' : 'text-slate-400'} uppercase tracking-widest mb-1.5 ml-1`}>File Source</label>
                  <div className={`border rounded-xl px-4 py-3 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/5 text-orange-400/60' : 'bg-slate-50 border-slate-100 text-orange-600/70'}`}>
                    <FileSpreadsheet size={14} />
                    {budgetForm.file?.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-8 py-6 border-t ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'} flex gap-3`}>
              <button
                onClick={() => setShowBudgetModal(false)}
                className={`flex-1 ${isDark ? 'bg-white/5 text-white/70 hover:bg-white/10' : 'bg-slate-200/50 text-slate-700 hover:bg-slate-200'} font-semibold py-3 rounded-xl transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleBudgetUpload}
                disabled={uploadingBudget}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {uploadingBudget ? 'Processing...' : 'Complete Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentView;
