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
  Plus, Search, LayoutGrid, Code2, MoreHorizontal, 
  MessageSquare, Mic, Volume2, User, Settings, RefreshCcw, 
  ChevronLeft, PanelLeftClose, PanelLeft, FolderKanban, Users, 
  Database, FileUp, BarChart3, Calendar, Clock, ChevronDown,
  Pin, Trash2, Edit2, Check, X, Navigation, AlertCircle, Send,
  FileSpreadsheet
} from 'lucide-react';
import { trackerSidebarManager } from '../utils/trackerSidebarManager';
import { getEmployees } from '../utils/employeeApi';
import { getCurrentUser } from '../utils/userUtils';

const AgentView = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { navigationHistory, chatHistory, currentChatId, unreadNotifications } = useSelector(state => state.nav);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recentsExpanded, setRecentsExpanded] = useState(true);
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
  
  // Tracker Upload State
  const fileInputRef = useRef(null);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [uploadingTracker, setUploadingTracker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectList, setProjectList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
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

  // Merge chat and navigation history into one list
  const combinedHistory = [
    ...userChatHistory.map(c => ({ ...c, type: 'chat', sortDate: c.timestamp })),
    ...navigationHistory.map(n => ({ ...n, type: 'nav', title: n.name, sortDate: n.timestamp }))
  ].filter(item => {
    if (!searchQuery) return true;
    const title = (item.type === 'nav' ? item.name : item.title) || '';
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
      const currentUser = getCurrentUser();

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
        text: `Successfully uploaded **${newTracker.fileName}** for **${trackerForm.project}**. It's now visible in the trackers module and sidebar.`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString(),
        type: 'upload-success'
      };
      setChatMessages(prev => [...prev, successMsg]);

      setShowTrackerModal(false);
      setTrackerForm({ project: '', department: 'Design Release', employeeName: '', file: null });
    } catch (err) {
      console.error('Tracker upload failed:', err);
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
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
        content: `💰 **Budget Uploaded Successfully!**\n\n**Project:** ${budgetForm.project}\n**Department:** ${budgetForm.department}\n**File:** ${budgetForm.file?.name}\n\nThe budget summary has been processed and saved.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, feedbackMsg]);

      setShowBudgetModal(false);
      setBudgetForm({ project: '', department: '', uploaded_by: budgetForm.uploaded_by, file: null, preview: [] });
      setBudgetErrors({});
    } catch (err) {
      console.error('Budget upload failed:', err);
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
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

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    
    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setIsTyping(true);

    // Create or update chat ID
    const chatId = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) dispatch(setCurrentChatId(chatId));

    // Capture pending state
    const activePendingAction = pendingAction;

    setTimeout(async () => {
      let response = "";
      let navigationModule = null;
      let fetchedData = null;
      let dataType = null;
      const lowerMsg = userMessage.toLowerCase();

      // CRUD Extraction Helpers
      const extractName = (msg) => {
        const match = msg.match(/(?:name is|called|named|employee|project|is)\s+([a-zA-Z\s0-9]+?)(?:\s+with|$|\s+and|\s+is|\.)/i);
        return match ? match[1].trim() : null;
      };
      const extractEmail = (msg) => {
        const match = msg.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
        return match ? match[1].trim() : null;
      };
      const extractUpdateValue = (msg, field) => {
        const aliases = {
          email: ['email', 'mail', 'email address'],
          name: ['name', 'full name', 'username'],
          status: ['status', 'state', 'condition'],
          role: ['role', 'permission', 'access level']
        };
        
        const fieldTerms = aliases[field] || [field];
        for (const term of fieldTerms) {
          const regex = new RegExp(`(?:set|update|change|to)\\s+${term}\\s+(?:to|is)?\\s*([a-zA-Z0-9.@\\s_-]+?)(?:\s+and|$|\\.|from)`, 'i');
          const match = msg.match(regex);
          if (match) return match[1].trim();
          
          // Fallback for "change [field] to [value]"
          const regex2 = new RegExp(`(?:change|update)\\s+(?:his|her|their|the)?\\s*${term}\\s+(?:to|is)?\\s*([a-zA-Z0-9.@\\s_-]+?)(?:\s+and|$|\\.|from)`, 'i');
          const match2 = msg.match(regex2);
          if (match2) return match2[1].trim();
        }
        return null;
      };

      const detectRole = (msg) => {
        const roles = ['Admin', 'Super Admin', 'User', 'Project Manager', 'Team Lead'];
        const lowerMsg = msg.toLowerCase();
        for (const role of roles) {
          if (lowerMsg.includes(role.toLowerCase())) return role;
        }
        // Handle shorthand
        if (lowerMsg.includes('pm')) return 'Project Manager';
        if (lowerMsg.includes('tl')) return 'Team Lead';
        if (lowerMsg.includes('admin')) return 'Admin';
        return null;
      };

      const detectStatus = (msg) => {
        const statuses = ['Active', 'Completed', 'On Hold', 'Archived'];
        for (const status of statuses) {
          if (msg.toLowerCase().includes(status.toLowerCase())) return status;
        }
        return null;
      };

      // 1. SMART INTENTS: Analytics & Intelligence (High Priority)
      const isMilestoneRequest = lowerMsg.includes('milestone') || lowerMsg.includes('track');
      const isIssueRequest = lowerMsg.includes('issue') || lowerMsg.includes('criticality') || lowerMsg.includes('critical');
      const isAuditRequest = lowerMsg.includes('audit') || lowerMsg.includes('activity') || lowerMsg.includes('recent changes') || lowerMsg.includes('changed');
      const isHealthRequest = lowerMsg.includes('health') || lowerMsg.includes('check') || lowerMsg.includes('risk report') || lowerMsg.includes('how is') || lowerMsg.includes('status check');

      if (!response && (isMilestoneRequest || isIssueRequest || isAuditRequest || isHealthRequest)) {
        // Robust project identification: match by name or ID
        const targetProject = projectList.find(p => {
          const pNameLower = (p.name || '').toLowerCase();
          const pIdLower = (p.project_id || '').toLowerCase();
          
          // Case 1: Direct inclusion (Name or ID)
          if (lowerMsg.includes(pNameLower) || (pIdLower && lowerMsg.includes(pIdLower))) return true;
          
          // Case 2: Word intersection (handle "Car manufacturing project" matching "Car Manufacturing")
          const pWords = pNameLower.split(/\s+/).filter(w => w.length > 2); // ignore small words like "of", "the"
          const matchCount = pWords.filter(w => lowerMsg.includes(w)).length;
          return matchCount >= Math.min(pWords.length, 2); // 2 words match or entire small name
        });
        
        if (isHealthRequest && targetProject) {
          // PROACTIVE HEALTH REPORT LOGIC
          try {
            const [issueResp, dashResp] = await Promise.all([
               API.get(`/issues/project/${targetProject.id}/critical`),
               API.get(`/dashboard/${targetProject.id}`)
            ]);
            
            const issues = issueResp.data || [];
            const milestones = dashResp.data.milestones || [];
            
            const delayedMilestones = milestones.filter(m => m.status === 'Delayed');
            const criticalIssues = issues.filter(iss => iss.priority === 'Critical' || iss.priority === 'High');
            
            let healthScore = 100;
            healthScore -= (delayedMilestones.length * 15);
            healthScore -= (criticalIssues.length * 20);
            
            let statusChar = "🟢 Healthy";
            let color = "text-emerald-400";
            if (healthScore < 50) { statusChar = "🔴 At Risk"; color = "text-red-400"; }
            else if (healthScore < 85) { statusChar = "🟡 Warning"; color = "text-amber-400"; }
            
            response = `### Health Report for **${targetProject.name}**\n` + 
                       `Status: **${statusChar}** (Score: ${Math.max(0, healthScore)}/100)\n\n` +
                       `I've analyzed the current data and found **${delayedMilestones.length} delayed milestones** and **${criticalIssues.length} critical issues**. ` +
                       (healthScore < 85 ? `Immediate attention is recommended to get the project back on track.` : `The project is performing well.`);
            
            fetchedData = [
                ...criticalIssues.map(i => ({ name: i.title, type: 'Issue', status: i.priority, project_name: targetProject.name })),
                ...delayedMilestones.map(m => ({ name: m.milestone, type: 'Milestone', status: 'Delayed', project_name: targetProject.name }))
            ];
            dataType = 'milestone'; // Reuse milestone/issue table layout
          } catch (err) {
            response = `I encountered an error trying to generate a health report for **${targetProject.name}**.`;
          }
        } else if (isAuditRequest) {
          // AUDIT LOG TRACKING
          try {
            const auditResp = await API.get('/audit-logs', { 
               params: { limit: 10, module: targetProject ? 'Project Master' : null } 
            });
            const logs = auditResp.data || [];
            if (logs.length > 0) {
              response = targetProject 
                ? `Here are the latest activities for **${targetProject.name}**:`
                : `I've fetched the most recent system-wide activities:`;
              
              fetchedData = logs.map(l => ({
                action: l.action,
                module: l.module,
                user: l.user_name || 'System',
                time: new Date(l.timestamp).toLocaleString(),
                summary: l.details?.summary || l.action
              }));
              dataType = 'audit_log';
            } else {
              response = `No recent audit logs were found.`;
            }
          } catch (err) {
            response = `⚠️ I couldn't access the system audit trails right now.`;
          }
        } else if (targetProject) {
          try {
            if (isMilestoneRequest) {
              const dashResp = await API.get(`/dashboard/${targetProject.id}`);
              const milestones = dashResp.data.milestones || [];
              response = `Here are the milestones for **${targetProject.name}**.`;
              fetchedData = milestones.map(m => ({
                name: m.milestone,
                module: m.module,
                status: m.status,
                project_name: targetProject.name
              }));
              dataType = 'milestone';
            } else {
              const issueResp = await API.get(`/issues/project/${targetProject.id}/critical`, { params: { limit: 100 } });
              const issues = issueResp.data || [];
              if (issues.length > 0) {
                response = `I've retrieved the critical issues for **${targetProject.name}**:`;
                fetchedData = issues.map(iss => ({
                  name: iss.title,
                  priority: iss.priority,
                  status: iss.status,
                  project_name: targetProject.name
                }));
                dataType = 'issue';
              } else {
                response = `Sorry, I couldn't find any critical issues recorded for **${targetProject.name}** at this time.`;
              }
            }
          } catch (apiErr) {
            console.error("Analytics fetch failed:", apiErr);
            response = `⚠️ I couldn't fetch the data for **${targetProject.name}**.`;
          }
        } else if (isIssueRequest) {
          // Global Fallback for Issues (Dashboard view)
          try {
            const issueResp = await API.get('/issues', { params: { priority: 'High' } });
            const allIssues = issueResp.data || [];
            
            if (allIssues.length > 0) {
              response = `Since no specific project was named, I've listed the top critical issues from across your **entire dashboard**.`;
              fetchedData = allIssues.map(iss => {
                const proj = projectList.find(p => p.id === iss.project_id);
                return {
                  name: iss.title,
                  priority: iss.priority,
                  status: iss.status,
                  project_name: proj ? proj.name : 'Global'
                };
              });
              dataType = 'issue';
            } else {
              response = `I'd be happy to help with that! Which **project** are you interested in?`;
              setPendingAction({ 
                type: 'select_for_action', 
                dataType: 'project', 
                subType: 'issues' 
              });
            }
          } catch (err) {
            response = `I couldn't identify the project. Which one are you interested in?`;
            setPendingAction({ type: 'select_for_action', dataType: 'project', subType: 'issues' });
          }
        } else {
           response = `I'd be happy to help with project milestones! Which **project** are you interested in?`;
           setPendingAction({ type: 'select_for_action', dataType: 'project', subType: 'milestones' });
        }
      }

      // 2. CRUD Operations Logic
      try {
        const isList = lowerMsg.includes('list') || lowerMsg.includes('show') || lowerMsg.includes('fetch') || lowerMsg.includes('display') || lowerMsg.includes('get');
        const isAdd = lowerMsg.includes('add') || lowerMsg.includes('create') || lowerMsg.includes('new') || lowerMsg.includes('insert') || lowerMsg.includes('make');
        const isEdit = lowerMsg.includes('edit') || lowerMsg.includes('update') || lowerMsg.includes('change') || lowerMsg.includes('modify') || lowerMsg.includes('set');
        const isDelete = lowerMsg.includes('delete') || lowerMsg.includes('remove') || lowerMsg.includes('destroy');

        const emailInMsg = extractEmail(userMessage);
        let isEmployee = lowerMsg.includes('employee') || lowerMsg.includes('user') || lowerMsg.includes('staff') || lowerMsg.includes('person') || lowerMsg.includes('who is') || !!emailInMsg;
        let isProject = lowerMsg.includes('project') || lowerMsg.includes('task') || lowerMsg.includes('work') || lowerMsg.includes('assignment');
        const isSearch = lowerMsg.includes('search') || lowerMsg.includes('find') || lowerMsg.includes('who is') || lowerMsg.includes('show me');

        // Context-aware type detection
        if (activePendingAction) {
          if (activePendingAction.type.includes('employee') || activePendingAction.dataType === 'employee') isEmployee = true;
          if (activePendingAction.type.includes('project') || activePendingAction.dataType === 'project') isProject = true;
        }

        // --- Handle Multi-step Pending Actions ---
        if (activePendingAction && !isList && !isAdd) {
          if (activePendingAction.type === 'add_employee') {
            const name = activePendingAction.data.name || (userMessage.length < 50 ? userMessage : null);
            const email = activePendingAction.data.email || extractEmail(userMessage);
            if (name && email) {
              const res = await API.post('/employees', { name, email, employee_id: `EMP${Math.floor(Math.random()*10000)}`, role: 'User', status: 'Active' });
              response = `✅ Successfully added employee: **${res.data.name}**. I've updated the table below.`;
              const allEmps = await API.get('/employees');
              fetchedData = allEmps.data;
              dataType = 'employee';
              setPendingAction(null);
            } else if (name && !email) {
              response = `Got it, the name is **${name}**. Now, what is the **email address** for this employee?`;
              setPendingAction({ ...activePendingAction, data: { ...activePendingAction.data, name } });
            }
          } else if (activePendingAction.type === 'edit_employee') {
            const { target } = activePendingAction.data;
            const newRole = detectRole(userMessage);
            const newName = extractUpdateValue(userMessage, 'name');
            const newEmail = extractUpdateValue(userMessage, 'email');

            if (newRole || newName || newEmail) {
              const updateData = { ...target };
              if (newRole) updateData.role = newRole;
              if (newName) updateData.name = newName;
              if (newEmail) updateData.email = newEmail;
              await API.put(`/employees/${target.id}`, updateData);
              response = `✅ Updated **${target.name}**. Table refreshed.`;
              const refresh = await API.get('/employees');
              fetchedData = refresh.data;
              dataType = 'employee';
              setPendingAction(null);
            } else if (lowerMsg.includes('delete')) {
              await API.delete(`/employees/${target.id}`);
              response = `🗑️ Deleted **${target.name}**. Table refreshed.`;
              const refresh = await API.get('/employees');
              fetchedData = refresh.data;
              dataType = 'employee';
              setPendingAction(null);
            }
          } else if (activePendingAction.type === 'add_project') {
            const name = activePendingAction.data.name || (userMessage.length < 50 ? userMessage : null);
            if (name) {
              const res = await API.post('/projects', { 
                name, 
                project_id: `PRJ-${Math.floor(Math.random()*1000)}`, 
                status: 'Active' 
              });
              response = `✅ Successfully created project: **${res.data.name}**. I've updated the list below.`;
              const allProjects = await API.get('/projects');
              fetchedData = allProjects.data;
              dataType = 'project';
              setPendingAction(null);
            }
          } else if (activePendingAction.type === 'edit_project') {
            const { target } = activePendingAction.data;
            const newStatus = detectStatus(userMessage);
            const newName = extractUpdateValue(userMessage, 'name');
            if (newStatus || newName) {
              const updateData = { ...target };
              if (newStatus) updateData.status = newStatus;
              if (newName) updateData.name = newName;
              await API.put(`/projects/${target.id}`, updateData);
              response = `✅ Updated project **${target.name}**.`;
              const refresh = await API.get('/projects');
              fetchedData = refresh.data;
              dataType = 'project';
              setPendingAction(null);
            } else if (lowerMsg.includes('delete')) {
              await API.delete(`/projects/${target.id}`);
              response = `🗑️ Deleted project **${target.name}**. Table refreshed.`;
              const refresh = await API.get('/projects');
              fetchedData = refresh.data;
              dataType = 'project';
              setPendingAction(null);
            }
          } else if (activePendingAction.type === 'select_for_action') {
              // We were waiting for an email or project name
              const res = await (activePendingAction.dataType === 'employee' ? API.get('/employees') : API.get('/projects'));
              const email = extractEmail(userMessage);
              const name = extractName(userMessage) || userMessage.trim();
              
              const target = activePendingAction.dataType === 'employee' 
                ? res.data.find(e => e.email?.toLowerCase() === email?.toLowerCase())
                : res.data.find(p => p.name?.toLowerCase().includes(name.toLowerCase()) || p.project_id?.toLowerCase() === name.toLowerCase());

              if (target) {
                // Check if an action was also provided in this message
                const newRole = activePendingAction.dataType === 'employee' ? detectRole(userMessage) : null;
                const newStatus = activePendingAction.dataType === 'project' ? detectStatus(userMessage) : null;
                const isDeleteNow = lowerMsg.includes('delete') || lowerMsg.includes('remove');

                if (isDeleteNow) {
                    await API.delete(`/${activePendingAction.dataType}s/${target.id}`);
                    response = `🗑️ Deleted **${target.name}**. Table refreshed.`;
                    const refresh = await API.get(`/${activePendingAction.dataType}s`);
                    fetchedData = refresh.data;
                    dataType = activePendingAction.dataType;
                    setPendingAction(null);
                } else if (newRole || newStatus) {
                    const updateData = { ...target };
                    if (newRole) updateData.role = newRole;
                    if (newStatus) updateData.status = newStatus;
                    await API.put(`/${activePendingAction.dataType}s/${target.id}`, updateData);
                    response = `✅ Updated **${target.name}**.`;
                    const refresh = await API.get(`/${activePendingAction.dataType}s`);
                    fetchedData = refresh.data;
                    dataType = activePendingAction.dataType;
                    setPendingAction(null);
                } else {
                    response = `I found **${target.name}**. What would you like to do? (e.g., 'set role to Admin' or 'delete')`;
                    setPendingAction({ type: `edit_${activePendingAction.dataType}`, data: { target } });
                    fetchedData = res.data;
                    dataType = activePendingAction.dataType;
                }
              }
          } else if (activePendingAction.type === 'select_for_action' && (activePendingAction.subType === 'milestones' || activePendingAction.subType === 'issues')) {
              // Handle Analytics Multi-turn Selection
              const pName = userMessage.trim().toLowerCase();
              const targetProject = projectList.find(p => 
                p.name.toLowerCase().includes(pName) || p.project_id?.toLowerCase() === pName
              );

              if (targetProject) {
                try {
                  const isMilestone = activePendingAction.subType === 'milestones';
                  if (isMilestone) {
                    const dashResp = await API.get(`/dashboard/${targetProject.id}`);
                    const milestones = dashResp.data.milestones || [];
                    response = `Here are the milestones for **${targetProject.name}**.`;
                    fetchedData = milestones.map(m => ({
                      name: m.milestone,
                      module: m.module,
                      status: m.status
                    }));
                    dataType = 'milestone';
                  } else {
                    const issueResp = await API.get(`/issues/project/${targetProject.id}/critical`);
                    const issues = issueResp.data || [];
                    response = `I've retrieved the top critical issues for **${targetProject.name}**.`;
                    fetchedData = issues.map(iss => ({
                      name: iss.title,
                      priority: iss.priority,
                      status: iss.status
                    }));
                    dataType = 'issue';
                  }
                  setPendingAction(null);
                } catch (apiErr) {
                  console.error("Multi-turn analytics fetch failed:", apiErr);
                  response = `⚠️ I couldn't fetch the data for **${targetProject.name}**.`;
                  setPendingAction(null);
                }
              }
          }
        }

        // 1.7. Meeting Transcript Search
        const searchKeywords = ['discussed', 'said about', 'search meeting', 'find in meeting', 'mention'];
        const isDiscussionSearch = searchKeywords.some(k => lowerMsg.includes(k));

        if (!response && isDiscussionSearch) {
          // Extract search query
          let searchQuery = userMessage;
          searchKeywords.forEach(k => {
            if (lowerMsg.includes(k)) {
              searchQuery = searchQuery.split(new RegExp(k, 'i'))[1] || searchQuery;
            }
          });
          
          searchQuery = searchQuery.replace(/[?.!]/g, '').trim();

          if (searchQuery.length > 1) {
            try {
              const searchResp = await API.get('/transcript/global/search', { params: { query: searchQuery } });
              const matches = searchResp.data || [];
              
              if (matches.length > 0) {
                response = `I found **${matches.length}** mention(s) of "${searchQuery}" in your meeting transcripts.`;
                fetchedData = matches.map(m => ({
                  name: m.meeting_title,
                  speaker: m.speaker,
                  text: m.text,
                  timestamp: m.timestamp
                }));
                dataType = 'transcript_result';
              } else {
                response = `I couldn't find any discussions about "${searchQuery}" in your saved meeting transcripts.`;
              }
            } catch (searchErr) {
              console.error("Transcript search failed:", searchErr);
              response = `⚠️ I encountered an error while searching your transcripts.`;
            }
          }
        }

        // --- NEW COMMANDS ---
        if (!response) {
            if (isSearch && !isAdd && !isEdit && !isDelete) {
                // Handle Search Intent
                const query = userMessage.replace(/(search for|find|who is|show me|look for)\s+/i, '').trim();
                if (query) {
                    const empRes = await API.get('/employees');
                    const projRes = await API.get('/projects');
                    
                    const foundEmps = empRes.data.filter(e => 
                        e.name?.toLowerCase().includes(query.toLowerCase()) || 
                        e.email?.toLowerCase() === query.toLowerCase() ||
                        e.employee_id?.toLowerCase() === query.toLowerCase()
                    );
                    
                    const foundProjs = projRes.data.filter(p => 
                        p.name?.toLowerCase().includes(query.toLowerCase()) || 
                        p.project_id?.toLowerCase() === query.toLowerCase()
                    );

                    if (foundEmps.length > 0 && foundProjs.length === 0) {
                        fetchedData = foundEmps;
                        dataType = 'employee';
                        if (foundEmps.length === 1) {
                            response = `I found **${foundEmps[0].name}**. What would you like to do? (e.g., 'edit role' or 'delete')`;
                            setPendingAction({ type: 'edit_employee', data: { target: foundEmps[0] } });
                        } else {
                            response = `I found ${foundEmps.length} employees matching "${query}".`;
                        }
                    } else if (foundProjs.length > 0 && foundEmps.length === 0) {
                        fetchedData = foundProjs;
                        dataType = 'project';
                        if (foundProjs.length === 1) {
                            response = `I found project **${foundProjs[0].name}**. What would you like to do? (e.g., 'change status' or 'delete')`;
                            setPendingAction({ type: 'edit_project', data: { target: foundProjs[0] } });
                        } else {
                            response = `I found ${foundProjs.length} projects matching "${query}".`;
                        }
                    } else if (foundEmps.length > 0 || foundProjs.length > 0) {
                        fetchedData = [...foundEmps, ...foundProjs];
                        dataType = foundEmps.length > foundProjs.length ? 'employee' : 'project';
                        response = `I found some matches for "${query}". Which one are you interested in?`;
                    } else {
                        response = `I couldn't find any employees or projects matching "${query}".`;
                    }
                }
            }

            if (!response && isEmployee) {
                dataType = 'employee';
                const res = await API.get('/employees');
                fetchedData = res.data;
                const email = emailInMsg;
                // Enhanced name extraction for deletion
                const nameFromMsg = userMessage.replace(/(delete|remove|edit|update|change|who is)\s+(employee|user|staff)?\s+/i, '').trim();
                
                const target = email 
                    ? res.data.find(e => e.email?.toLowerCase() === email.toLowerCase()) 
                    : res.data.find(e => e.name?.toLowerCase().includes(nameFromMsg.toLowerCase()));

                if (target && !isList && !isAdd) {
                    if (isDelete) {
                        await API.delete(`/employees/${target.id}`);
                        response = `🗑️ Deleted **${target.name}**. Table refreshed.`;
                        const refresh = await API.get('/employees');
                        fetchedData = refresh.data;
                    } else {
                        const newRole = detectRole(userMessage);
                        const newName = extractUpdateValue(userMessage, 'name');
                        const newEmail = extractUpdateValue(userMessage, 'email');
                        
                        if (newRole || newName || newEmail) {
                            const updateData = { ...target };
                            if (newRole) updateData.role = newRole;
                            if (newName) updateData.name = newName;
                            if (newEmail) updateData.email = newEmail;
                            await API.put(`/employees/${target.id}`, updateData);
                            response = `✅ Updated **${target.name}**.`;
                            const refresh = await API.get('/employees');
                            fetchedData = refresh.data;
                        } else {
                            response = `I found **${target.name}**. What would you like to do? (e.g., 'edit role to Admin' or 'delete')`;
                            setPendingAction({ type: 'edit_employee', data: { target } });
                        }
                    }
                } else if (isList) {
                    response = `I've fetched the employee list. There are ${res.data.length} employees.`;
                } else if (isAdd) {
                    const name = extractName(userMessage);
                    if (name && email) {
                        const addRes = await API.post('/employees', { name, email, employee_id: `EMP${Math.floor(Math.random()*10000)}`, role: 'User', status: 'Active' });
                        response = `✅ Added employee: **${addRes.data.name}**.`;
                        const refresh = await API.get('/employees');
                        fetchedData = refresh.data;
                    } else {
                        response = "Please provide the **name** and **email** for the new employee.";
                        setPendingAction({ type: 'add_employee', data: { name, email } });
                    }
                } else if (isEdit || isDelete || email || (nameFromMsg && nameFromMsg.length > 2)) {
                    if (email) response = `Couldn't find an employee with email **${email}**.`;
                    else if (nameFromMsg) {
                        response = `Which employee would you like to ${isDelete ? 'delete' : 'edit'}? Please provide their **email** or full name.`;
                        setPendingAction({ type: 'select_for_action', subType: isDelete ? 'delete' : 'edit', dataType: 'employee', data: {} });
                    }
                }
            } else if (!response && isProject) {
                dataType = 'project';
                const res = await API.get('/projects');
                fetchedData = res.data;
                const projectName = extractName(userMessage) || userMessage.trim();
                const target = projectName ? res.data.find(p => p.name?.toLowerCase().includes(projectName.toLowerCase()) || p.project_id?.toLowerCase() === projectName.toLowerCase()) : null;

                if (target && !isList && !isAdd) {
                    if (isDelete) {
                        await API.delete(`/projects/${target.id}`);
                        response = `🗑️ Deleted project **${target.name}**.`;
                        const refresh = await API.get('/projects');
                        fetchedData = refresh.data;
                    } else {
                        const newStatus = detectStatus(userMessage);
                        if (newStatus) {
                            await API.put(`/projects/${target.id}`, { ...target, status: newStatus });
                            response = `✅ Updated **${target.name}** to **${newStatus}**.`;
                            const refresh = await API.get('/projects');
                            fetchedData = refresh.data;
                        } else {
                            response = `Found project **${target.name}**. What would you like to do? (e.g., 'set status to Completed' or 'delete')`;
                            setPendingAction({ type: 'edit_project', data: { target } });
                        }
                    }
                } else if (isList) {
                    response = `I've fetched all projects. We have ${res.data.length} active projects.`;
                } else if (isAdd) {
                    const name = extractName(userMessage);
                    if (name) {
                        const addRes = await API.post('/projects', { name, project_id: `PRJ-${Math.floor(Math.random()*1000)}`, status: 'Active' });
                        response = `✅ Created project: **${addRes.data.name}**.`;
                        const refresh = await API.get('/projects');
                        fetchedData = refresh.data;
                    } else {
                        response = "What **name** should I give to the new project?";
                        setPendingAction({ type: 'add_project', data: { name: null } });
                    }
                } else if (isEdit || isDelete) {
                    response = `Which project would you like to ${isDelete ? 'delete' : 'edit'}? Please provide the **name**.`;
                    setPendingAction({ type: 'select_for_action', subType: isDelete ? 'delete' : 'edit', dataType: 'project', data: {} });
                }
            }
        }
      } catch (err) {
        console.error("Agent Action Error:", err);
        const errorDetail = err.response?.data?.detail || err.message;
        response = `⚠️ Action failed: ${errorDetail}`;
        
        // Clear pending action on error to allow the user to "continue" with a fresh start
        setPendingAction(null);
        
        // Add helpful context if it's a known error type
        if (errorDetail.toLowerCase().includes('foreign key') || errorDetail.toLowerCase().includes('referenced')) {
          response += "\n\nThis usually happens because this record is linked to other data (like projects, tasks, or meetings). For safety, I can't delete it while those links exist.";
        }
      }

      // 2. Navigation Command Detection (Fallback)
      if (!response && (lowerMsg.includes('take me to') || lowerMsg.includes('navigate to') || lowerMsg.includes('go to') || lowerMsg.includes('open'))) {
        navigationModule = modules.find(m => 
          lowerMsg.includes(m.name.toLowerCase()) || 
          (m.id === 'masters-main' && lowerMsg.includes('master')) ||
          (m.id === 'project-dashboard' && lowerMsg.includes('dashboard'))
        );

        if (navigationModule) {
          response = `Sure! I'm taking you to the ${navigationModule.name} page now.`;
        }
      }

      // 3. General Fallbacks
      if (!response) {
        if (lowerMsg.includes('hai') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
          response = "Hello! How can I assist you with your Project Analytics today?";
        } else if (lowerMsg.includes('hwau') || lowerMsg.includes('how are you')) {
          response = "I'm doing great, thank you for asking! Ready to help you manage your projects.";
        } else if (lowerMsg.includes('greet') || lowerMsg.includes('good morning') || lowerMsg.includes('good afternoon')) {
          response = "Greetings! I'm your AI assistant for this dashboard. What can I do for you?";
        } else if (lowerMsg.includes('thanks') || lowerMsg.includes('thank you') || lowerMsg.includes('great') || lowerMsg.includes('awesome') || lowerMsg.includes('good job') || lowerMsg.includes('appreciate it')) {
          response = "You're very welcome! Let me know if you need any further assistance.";
        } else {
          response = "I'm sorry, I am specifically designed to assist with Project Analytics, MOMs, and Dashboard management. I might not be able to help with that particular question.";
        }

        // Add a reminder if there are unread notifications
        if (unreadNotifications > 0 && !response.includes("I'm sorry")) {
          response += `\n\nBy the way, you have ${unreadNotifications} unread notification${unreadNotifications > 1 ? 's' : ''}. Use the bell icon on the top right to view them!`;
        }
      }

      const finalMessages = [...newMessages, { role: 'assistant', content: response, data: fetchedData, dataType }];
      setChatMessages(finalMessages);
      setIsTyping(false);

      // Save to history
      const chatTitle = userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : "");
      dispatch(saveChatToHistory({
        id: chatId,
        title: chatTitle,
        messages: finalMessages,
        userEmail: user?.email // Save with user identifier
      }));

      // Persistent backend save
      try {
        await API.post('/chats/save', {
          chat_id: chatId,
          title: chatTitle,
          messages: finalMessages,
          user_email: user?.email,
          pinned: false
        });
      } catch (err) {
        console.error("Failed to sync chat to DB:", err);
      }

      // Navigation execution
      if (navigationModule) {
        setTimeout(() => {
          handleModuleClick(navigationModule);
        }, 1500);
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

  const renderHistoryItem = (item, type, index) => (
    <div key={item.id} className="relative group/item">
      {editingId === item.id ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 mx-1">
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(item.id, type);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="bg-transparent border-none focus:ring-0 text-sm p-0 w-full text-white"
          />
          <div className="flex items-center gap-1">
            <button onClick={() => handleRename(item.id, type)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
              <Check size={14} />
            </button>
            <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white p-0.5">
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
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm truncate flex items-center gap-3 group ${
              currentChatId === item.id ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <div className="relative flex-shrink-0">
              {type === 'nav' ? <Navigation size={14} className="text-white/20" /> : <MessageSquare size={14} className="text-white/20" />}
              {item.pinned && (
                <Pin size={8} className="absolute -top-1 -right-1 text-emerald-400 fill-emerald-400" />
              )}
            </div>
            <span className="truncate flex-1">{type === 'nav' ? item.name : item.title}</span>
          </button>
          
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 flex items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(type + index);
              }}
              className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>

          {activeMenu === (type + index) && (
            <div 
              ref={menuRef}
              className="absolute right-2 top-8 z-[100] w-36 bg-[#2f2f2f] border border-white/10 rounded-lg shadow-xl py-1"
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
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-white/5 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
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
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-white/5 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Edit2 size={12} />
                <span>Rename</span>
              </button>
              <div className="h-px bg-white/5 my-1"></div>
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
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-white/5 flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
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
    <div className="flex h-full bg-[#171717] text-[#ececec] font-sans overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 bg-[#212121] flex flex-col overflow-hidden border-r border-white/5`}
      >
        <div className="p-4 flex flex-col gap-2">
          <button 
            onClick={startNewChat}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <Plus size={16} />
            </div>
            <span>New chat</span>
          </button>
          
          <div className="relative group/search">
            {isSearching ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 mx-0">
                <Search size={16} className="text-white/40" />
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
                  className="bg-transparent border-none focus:ring-0 text-sm p-0 w-full text-white placeholder-white/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setIsSearching(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
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
              <p className="text-xs text-white/40 italic">No results found for "{searchQuery}"</p>
            </div>
          )}
          {combinedHistory.length > 0 && (
            <>
              <button 
                onClick={() => setRecentsExpanded(!recentsExpanded)}
                className="w-full text-[10px] font-bold text-white/40 uppercase tracking-widest px-3 mb-2 mt-4 flex items-center justify-between group hover:text-white/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>Recents</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-200 ${recentsExpanded ? '' : '-rotate-90'}`} />
              </button>
              {recentsExpanded && combinedHistory.map((item, i) => renderHistoryItem(item, item.type, i))}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col relative min-h-0">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between p-4 bg-[#171717] z-10 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
          </div>
        </div>

        {/* Central Content */}
        <div className={`flex-1 flex flex-col items-center px-4 max-w-5xl mx-auto w-full min-h-0 ${chatMessages.length === 0 ? 'justify-center' : 'pt-6'}`}>
          {chatMessages.length === 0 ? (
            <div className="pb-8 flex flex-col items-center gap-4">
              <h2 className="text-3xl font-semibold text-white/90 text-center">What's on your mind today?</h2>
              
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
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-brand-primary text-white' 
                      : 'bg-[#2f2f2f] text-white/90 border border-white/5 shadow-lg'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    
                    {msg.data && msg.data.length > 0 && (
                      <div className="mt-4 overflow-x-auto border border-white/10 rounded-xl bg-black/20 scrollbar-hide">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-white/5 text-white/40 uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 font-medium">
                                {msg.dataType === 'employee' ? 'Name' : 
                                 msg.dataType === 'milestone' ? 'Milestone' :
                                 msg.dataType === 'issue' ? 'Critical Issue' : 
                                 msg.dataType === 'audit_log' ? 'Action' :
                                 msg.dataType === 'transcript_result' ? 'Meeting' : 'Project Name'}
                              </th>
                              <th className="px-3 py-2 font-medium">
                                {msg.dataType === 'employee' ? 'Email' : 
                                 msg.dataType === 'milestone' ? 'Module' :
                                 msg.dataType === 'issue' ? 'Priority' : 
                                 msg.dataType === 'audit_log' ? 'User' :
                                 msg.dataType === 'transcript_result' ? 'Speaker' : 'Code'}
                              </th>
                              <th className="px-3 py-2 font-medium text-right">
                                {msg.dataType === 'transcript_result' ? 'Moment' : 
                                 msg.dataType === 'audit_log' ? 'Timestamp' : 'Status'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {msg.data.map((item, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-3 py-2 text-white/80 font-medium">
                                  {msg.dataType === 'audit_log' ? item.summary : item.name}
                                  {(msg.dataType === 'issue' || msg.dataType === 'milestone') && item.project_name && (
                                    <div className="text-[9px] text-white/30 mt-0.5 font-normal">
                                      Project: {item.project_name}
                                    </div>
                                  )}
                                  {msg.dataType === 'audit_log' && (
                                    <div className="text-[9px] text-white/30 mt-0.5 font-normal">
                                      Module: {item.module}
                                    </div>
                                  )}
                                  {msg.dataType === 'transcript_result' && (
                                    <div className="text-[10px] text-white/40 mt-1 font-normal line-clamp-2 italic">
                                      "{item.text}"
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-white/40">
                                  {msg.dataType === 'employee' ? item.email : 
                                   msg.dataType === 'milestone' ? (item.module || item.type || '-') :
                                   msg.dataType === 'issue' ? (item.priority || 'High') : 
                                   msg.dataType === 'audit_log' ? item.user :
                                   msg.dataType === 'transcript_result' ? item.speaker : item.project_code}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {msg.dataType === 'transcript_result' ? (
                                    <span className="text-[10px] text-white/40 font-mono">{item.timestamp}</span>
                                  ) : msg.dataType === 'audit_log' ? (
                                    <span className="text-[10px] text-white/40 font-mono">{item.time}</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      (item.role === 'Admin' || item.status === 'Active' || item.status === 'Completed' || item.status === 'On Track' || item.status === 'CREATED' || item.status === 'Healthy') 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : (item.status === 'Delayed' || item.priority === 'High' || item.priority === 'Critical' || item.status === 'At Risk')
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'bg-white/10 text-white/40'
                                    }`}>
                                      {msg.dataType === 'employee' ? (item.role || 'User') : (item.status || item.priority || 'Active')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#2f2f2f] text-white/40 rounded-2xl px-4 py-3 text-sm border border-white/5 animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
          
          {/* Chat Box */}
          <form onSubmit={handleSendMessage} className="w-full relative group mb-8">
            <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-focus-within:bg-white/10 transition-all"></div>
            <div className="relative bg-[#2f2f2f] rounded-2xl border border-white/10 focus-within:border-white/20 transition-all p-2 flex items-end gap-2 shadow-2xl">
            <div className="relative flex items-end">
              <button 
                type="button" 
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                className={`p-2 transition-colors mb-1 ${plusMenuOpen ? 'text-white' : 'text-white/40 hover:text-white'}`}
              >
                <Plus size={20} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
              </button>
              
              {plusMenuOpen && (
                <div className="absolute bottom-full left-0 mb-4 w-56 bg-[#1e1e1e] border border-white/10 rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      openTrackerUpload();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm group"
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-sm group"
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
              <textarea 
                rows="1"
                placeholder="Ask anything"
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/40 py-3 resize-none max-h-[200px]"
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
                <button type="button" className="p-2 text-white/40 hover:text-white transition-colors">
                  <Mic size={20} />
                </button>
                <button type="submit" className={`p-2 rounded-full transition-all ${message.trim() ? 'bg-white text-black' : 'bg-white/10 text-white/20'}`}>
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
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                >
                  <Navigation size={16} />
                  <span>Module Navigations</span>
                  <ChevronDown size={14} className={`transition-transform ${showModules ? 'rotate-180' : ''}`} />
                </button>
                
                {showModules && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {modules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => handleModuleClick(module)}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#2f2f2f] border border-white/5 hover:border-white/20 hover:bg-[#383838] transition-all group"
                      >
                        <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${module.color}`}>
                          {module.icon}
                        </div>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white">
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
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#2f2f2f] border border-white/5 hover:border-white/20 hover:bg-[#383838] transition-all group"
                  >
                    <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${module.color}`}>
                      {module.icon}
                    </div>
                    <span className="text-sm font-medium text-white/70 group-hover:text-white">
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
            className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-[400px] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Delete {deleteConfirmItem.type === 'nav' ? 'navigation' : 'chat'}?</h3>
            <p className="text-white/80 text-sm mb-8 leading-relaxed">
              This will delete <span className="font-bold text-white">{deleteConfirmItem.title}</span>.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
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
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Upload Tracker Details</h3>
                <p className="text-sm text-white/40 mt-1">Configure metadata for your tracker upload</p>
              </div>
              <button onClick={() => setShowTrackerModal(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* File Info */}
              <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{trackerForm.file?.name}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    {trackerForm.file?.size ? (trackerForm.file.size / 1024).toFixed(1) + ' KB' : ''} • Excel Tracker
                  </p>
                </div>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2 ml-1">Target Project</label>
                <div className="relative">
                  <select 
                    value={trackerForm.project}
                    onChange={(e) => {
                      setTrackerForm(prev => ({ ...prev, project: e.target.value }));
                      if (trackerFormErrors.project) setTrackerFormErrors(prev => ({ ...prev, project: null }));
                    }}
                    className={`w-full bg-[#2a2a2a] border ${trackerFormErrors.project ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select a project</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {trackerFormErrors.project && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{trackerFormErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2 ml-1">Department</label>
                <select 
                  value={trackerForm.department}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 transition-all cursor-pointer"
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
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2 ml-1">Employee Name</label>
                <div className="relative">
                  <select 
                    value={trackerForm.employeeName}
                    onChange={(e) => {
                      setTrackerForm(prev => ({ ...prev, employeeName: e.target.value }));
                      if (trackerFormErrors.employeeName) setTrackerFormErrors(prev => ({ ...prev, employeeName: null }));
                    }}
                    className={`w-full bg-[#2a2a2a] border ${trackerFormErrors.employeeName ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select internal personnel</option>
                    {employeeList.map(e => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {trackerFormErrors.employeeName && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{trackerFormErrors.employeeName}</p>}
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
              <button 
                onClick={() => setShowTrackerModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={uploadingTracker}
                onClick={handleTrackerUpload}
                className={`flex-[2] px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  uploadingTracker 
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
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                    <FileUp size={18} />
                  </div>
                  Budget Details
                </h3>
                <p className="text-xs text-white/40 mt-1 max-w-[240px]">Map your budget file to a project and department</p>
              </div>
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2 ml-1">Project Name</label>
                <div className="relative">
                  <select 
                    value={budgetForm.project}
                    onChange={(e) => {
                      setBudgetForm(prev => ({ ...prev, project: e.target.value }));
                      if (budgetErrors.project) setBudgetErrors(prev => ({ ...prev, project: null }));
                    }}
                    className={`w-full bg-[#2a2a2a] border ${budgetErrors.project ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select Target Project</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {budgetErrors.project && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{budgetErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2 ml-1">Department</label>
                <div className="relative">
                  <select 
                    value={budgetForm.department}
                    onChange={(e) => {
                      setBudgetForm(prev => ({ ...prev, department: e.target.value }));
                      if (budgetErrors.department) setBudgetErrors(prev => ({ ...prev, department: null }));
                    }}
                    className={`w-full bg-[#2a2a2a] border ${budgetErrors.department ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer`}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d, idx) => (
                      <option key={idx} value={d.name || d.department_id}>{d.name || d.department_id}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                    <ChevronDown size={16} />
                  </div>
                </div>
                {budgetErrors.department && <p className="text-[10px] text-red-400 mt-1.5 ml-1">{budgetErrors.department}</p>}
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-white/20 uppercase tracking-widest mb-1.5 ml-1">Uploaded By</label>
                  <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/60 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                    {budgetForm.uploaded_by}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-white/20 uppercase tracking-widest mb-1.5 ml-1">File Source</label>
                  <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-orange-400/60 text-xs overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2">
                    <FileSpreadsheet size={14} />
                    {budgetForm.file?.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowBudgetModal(false)}
                className="flex-1 bg-white/5 text-white/70 font-semibold py-3 rounded-xl hover:bg-white/10 transition-colors"
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
