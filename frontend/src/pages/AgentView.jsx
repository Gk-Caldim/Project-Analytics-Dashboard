import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import API from '../utils/api';
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
  Pin, Trash2, Edit2, Check, X, Navigation, AlertCircle, Send
} from 'lucide-react';

const AgentView = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { navigationHistory, chatHistory, currentChatId } = useSelector(state => state.nav);
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
        const regex = new RegExp(`(?:set|update|change)\\s+${field}\\s+(?:to|is)\\s+([a-zA-Z0-9\\s]+?)(?:\s+and|$|\\.)`, 'i');
        const match = msg.match(regex);
        return match ? match[1].trim() : null;
      };

      const detectRole = (msg) => {
        const roles = ['Admin', 'Super Admin', 'User', 'Project Manager'];
        for (const role of roles) {
          if (msg.toLowerCase().includes(role.toLowerCase())) return role;
        }
        return null;
      };

      const detectStatus = (msg) => {
        const statuses = ['Active', 'Completed', 'On Hold', 'Archived'];
        for (const status of statuses) {
          if (msg.toLowerCase().includes(status.toLowerCase())) return status;
        }
        return null;
      };

      // 1. CRUD Operations Logic
      try {
        const isList = lowerMsg.includes('list') || lowerMsg.includes('show') || lowerMsg.includes('fetch') || lowerMsg.includes('display') || lowerMsg.includes('get');
        const isAdd = lowerMsg.includes('add') || lowerMsg.includes('create') || lowerMsg.includes('new') || lowerMsg.includes('insert') || lowerMsg.includes('make');
        const isEdit = lowerMsg.includes('edit') || lowerMsg.includes('update') || lowerMsg.includes('change') || lowerMsg.includes('modify') || lowerMsg.includes('set');
        const isDelete = lowerMsg.includes('delete') || lowerMsg.includes('remove') || lowerMsg.includes('destroy');

        const emailInMsg = extractEmail(userMessage);
        const isEmployee = lowerMsg.includes('employee') || lowerMsg.includes('user') || lowerMsg.includes('staff') || !!emailInMsg;
        const isProject = lowerMsg.includes('project') || lowerMsg.includes('task') || lowerMsg.includes('work');

        // --- Handle Multi-step Pending Actions ---
        if (activePendingAction && !isList && !isAdd && !isEdit && !isDelete) {
          if (activePendingAction.type === 'add_employee') {
            const name = activePendingAction.data.name || (userMessage.length < 50 ? userMessage : null);
            const email = activePendingAction.data.email || extractEmail(userMessage);
            if (name && email) {
              const res = await API.post('/employees', { name, email, employee_id: `EMP${Math.floor(Math.random()*10000)}`, role: 'User', department_id: 1 });
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
            if (newRole || newName) {
              const updateData = { ...target };
              if (newRole) updateData.role = newRole;
              if (newName) updateData.name = newName;
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
          } else if (activePendingAction.type === 'edit_project') {
            const { target } = activePendingAction.data;
            const newStatus = detectStatus(userMessage);
            const newName = extractUpdateValue(userMessage, 'name');
            if (newStatus || newName) {
              const updateData = { ...target };
              if (newStatus) updateData.status = newStatus;
              if (newName) updateData.name = newName;
              await API.put(`/projects/${target.project_id}`, updateData);
              response = `✅ Updated project **${target.name}**.`;
              const refresh = await API.get('/projects');
              fetchedData = refresh.data;
              dataType = 'project';
              setPendingAction(null);
            } else if (lowerMsg.includes('delete')) {
              await API.delete(`/projects/${target.project_id}`);
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
                : res.data.find(p => p.name?.toLowerCase().includes(name.toLowerCase()) || p.project_code?.toLowerCase() === name.toLowerCase());

              if (target) {
                if (activePendingAction.subType === 'delete') {
                    const deleteId = activePendingAction.dataType === 'employee' ? target.id : target.project_id;
                    await API.delete(`/${activePendingAction.dataType}s/${deleteId}`);
                    response = `🗑️ Deleted **${target.name}**. Table refreshed.`;
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
          }
        }

        // --- NEW COMMANDS ---
        if (!response) {
            if (isEmployee) {
                dataType = 'employee';
                const res = await API.get('/employees');
                fetchedData = res.data;
                const email = emailInMsg;
                const target = email ? res.data.find(e => e.email?.toLowerCase() === email.toLowerCase()) : null;

                if (target) {
                    if (isDelete) {
                        await API.delete(`/employees/${target.id}`);
                        response = `🗑️ Deleted **${target.name}**. Table refreshed.`;
                        const refresh = await API.get('/employees');
                        fetchedData = refresh.data;
                    } else {
                        const newRole = detectRole(userMessage);
                        if (newRole) {
                            await API.put(`/employees/${target.id}`, { ...target, role: newRole });
                            response = `✅ Updated **${target.name}** to **${newRole}**.`;
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
                        const addRes = await API.post('/employees', { name, email, employee_id: `EMP${Math.floor(Math.random()*10000)}`, role: 'User', department_id: 1 });
                        response = `✅ Added employee: **${addRes.data.name}**.`;
                        const refresh = await API.get('/employees');
                        fetchedData = refresh.data;
                    } else {
                        response = "Please provide the **name** and **email** for the new employee.";
                        setPendingAction({ type: 'add_employee', data: { name, email } });
                    }
                } else if (isEdit || isDelete || email) {
                    if (email) response = `Couldn't find an employee with email **${email}**.`;
                    else {
                        response = `Which employee would you like to ${isDelete ? 'delete' : 'edit'}? Please provide their **email**.`;
                        setPendingAction({ type: 'select_for_action', subType: isDelete ? 'delete' : 'edit', dataType: 'employee', data: {} });
                    }
                }
            } else if (isProject) {
                dataType = 'project';
                const res = await API.get('/projects');
                fetchedData = res.data;
                const projectName = extractName(userMessage) || userMessage.trim();
                const target = projectName ? res.data.find(p => p.name?.toLowerCase().includes(projectName.toLowerCase()) || p.project_code?.toLowerCase() === projectName.toLowerCase()) : null;

                if (target && !isList && !isAdd) {
                    if (isDelete) {
                        await API.delete(`/projects/${target.project_id}`);
                        response = `🗑️ Deleted project **${target.name}**.`;
                        const refresh = await API.get('/projects');
                        fetchedData = refresh.data;
                    } else {
                        const newStatus = detectStatus(userMessage);
                        if (newStatus) {
                            await API.put(`/projects/${target.project_id}`, { ...target, status: newStatus });
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
                        const addRes = await API.post('/projects', { name, project_code: `PRJ-${Math.floor(Math.random()*1000)}`, status: 'Active' });
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
        response = `⚠️ Action failed: ${err.response?.data?.detail || err.message}`;
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
        } else {
          response = "I'm sorry, I am specifically designed to assist with Project Analytics, MOMs, and Dashboard management. I might not be able to help with that particular question.";
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
        <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-[#171717]">
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
            <div className="pb-8">
              <h2 className="text-3xl font-semibold text-white/90 text-center">What's on your mind today?</h2>
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
                                {msg.dataType === 'employee' ? 'Name' : 'Project Name'}
                              </th>
                              <th className="px-3 py-2 font-medium">
                                {msg.dataType === 'employee' ? 'Email' : 'Code'}
                              </th>
                              <th className="px-3 py-2 font-medium text-right">
                                {msg.dataType === 'employee' ? 'Role' : 'Status'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {msg.data.map((item, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-3 py-2 text-white/80 font-medium">
                                  {item.name}
                                </td>
                                <td className="px-3 py-2 text-white/40">
                                  {msg.dataType === 'employee' ? item.email : item.project_code}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    (item.role === 'Admin' || item.status === 'Active') 
                                      ? 'bg-emerald-500/10 text-emerald-400' 
                                      : 'bg-white/10 text-white/40'
                                  }`}>
                                    {msg.dataType === 'employee' ? (item.role || 'User') : (item.status || 'Active')}
                                  </span>
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
              <button type="button" className="p-2 text-white/40 hover:text-white transition-colors mb-1">
                <Plus size={20} />
              </button>
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
    </div>
  );
};

export default AgentView;
