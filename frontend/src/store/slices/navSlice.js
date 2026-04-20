import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeModule: sessionStorage.getItem('active_module') || 'project-dashboard',
  expandedModules: JSON.parse(sessionStorage.getItem('expanded_modules')) || {
    'project-dashboard': false,
    'masters': false,
    'upload-trackers': false
  },
  selectedUploadFileId: JSON.parse(sessionStorage.getItem('selected_upload_file_id')) || null,
  selectedProjectFileId: JSON.parse(sessionStorage.getItem('selected_project_file_id')) || null,
  activeProjectName: sessionStorage.getItem('active_project_name') || null,
  sidebarCollapsed: false,
  companyLogo: sessionStorage.getItem('company_logo') || null,
  companyName: sessionStorage.getItem('company_name') || 'Industrial Analytics Platform',
  baseCurrency: sessionStorage.getItem('base_currency') || 'USD ($)',
  exchangeRates: JSON.parse(sessionStorage.getItem('exchange_rates')) || { 'USD': 1, 'INR': 83.2, 'EUR': 0.92 },
  activeView: sessionStorage.getItem('active_view') || 'dashboard',
  navigationHistory: JSON.parse(sessionStorage.getItem('navigation_history')) || [],
  chatHistory: JSON.parse(sessionStorage.getItem('chat_history')) || [],
  currentChatId: null
};

const navSlice = createSlice({
  name: 'nav',
  initialState,
  reducers: {
    setActiveModule: (state, action) => {
      state.activeModule = action.payload;
      sessionStorage.setItem('active_module', action.payload);
    },
    toggleModuleExpansion: (state, action) => {
      const moduleId = action.payload;
      state.expandedModules[moduleId] = !state.expandedModules[moduleId];
      sessionStorage.setItem('expanded_modules', JSON.stringify(state.expandedModules));
    },
    setExpandedModules: (state, action) => {
      state.expandedModules = { ...state.expandedModules, ...action.payload };
      sessionStorage.setItem('expanded_modules', JSON.stringify(state.expandedModules));
    },
    setSelectedUploadFileId: (state, action) => {
      state.selectedUploadFileId = action.payload;
      if (action.payload) {
        sessionStorage.setItem('selected_upload_file_id', JSON.stringify(action.payload));
      } else {
        sessionStorage.removeItem('selected_upload_file_id');
      }
    },
    setSelectedProjectFileId: (state, action) => {
      state.selectedProjectFileId = action.payload;
      if (action.payload) {
        sessionStorage.setItem('selected_project_file_id', JSON.stringify(action.payload));
      } else {
        sessionStorage.removeItem('selected_project_file_id');
      }
    },
    setActiveProjectName: (state, action) => {
      state.activeProjectName = action.payload;
      if (action.payload) {
        sessionStorage.setItem('active_project_name', action.payload);
      } else {
        sessionStorage.removeItem('active_project_name');
      }
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setBranding: (state, action) => {
      const { companyLogo, companyName, baseCurrency } = action.payload;
      if (companyLogo !== undefined) {
        state.companyLogo = companyLogo;
        if (companyLogo) sessionStorage.setItem('company_logo', companyLogo);
        else sessionStorage.removeItem('company_logo');
      }
      if (companyName !== undefined) {
        state.companyName = companyName;
        sessionStorage.setItem('company_name', companyName);
      }
      if (baseCurrency !== undefined) {
        state.baseCurrency = baseCurrency;
        sessionStorage.setItem('base_currency', baseCurrency);
      }
    },
    setExchangeRates: (state, action) => {
      state.exchangeRates = action.payload;
      sessionStorage.setItem('exchange_rates', JSON.stringify(action.payload));
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload;
      sessionStorage.setItem('active_view', action.payload);
    },
    addToNavigationHistory: (state, action) => {
      const module = action.payload;
      // Remove if already exists to move to top
      const filtered = state.navigationHistory.filter(h => h.id !== module.id);
      // Keep only last 15 items
      state.navigationHistory = [module, ...filtered].slice(0, 15);
      sessionStorage.setItem('navigation_history', JSON.stringify(state.navigationHistory));
    },
    clearNavigationHistory: (state) => {
      state.navigationHistory = [];
      sessionStorage.removeItem('navigation_history');
    },
    togglePinHistoryItem: (state, action) => {
      const itemId = action.payload;
      const item = state.navigationHistory.find(h => h.id === itemId);
      if (item) {
        item.pinned = !item.pinned;
        // Sort: pinned first, then by timestamp
        state.navigationHistory.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        sessionStorage.setItem('navigation_history', JSON.stringify(state.navigationHistory));
      }
    },
    renameHistoryItem: (state, action) => {
      const { id, newName } = action.payload;
      const item = state.navigationHistory.find(h => h.id === id);
      if (item) {
        item.name = newName;
        sessionStorage.setItem('navigation_history', JSON.stringify(state.navigationHistory));
      }
    },
    deleteHistoryItem: (state, action) => {
      const itemId = action.payload;
      state.navigationHistory = state.navigationHistory.filter(h => h.id !== itemId);
      sessionStorage.setItem('navigation_history', JSON.stringify(state.navigationHistory));
    },
    saveChatToHistory: (state, action) => {
      const { id, title, messages, userEmail } = action.payload;
      const existingIdx = state.chatHistory.findIndex(c => c.id === id);
      if (existingIdx !== -1) {
        state.chatHistory[existingIdx] = { ...state.chatHistory[existingIdx], messages, title };
      } else {
        state.chatHistory.unshift({ 
          id, 
          title, 
          messages, 
          userEmail, // Link chat to specific user
          pinned: false, 
          timestamp: new Date().toISOString() 
        });
      }
      sessionStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
    },
    setCurrentChatId: (state, action) => {
      state.currentChatId = action.payload;
    },
    togglePinChat: (state, action) => {
      const chatId = action.payload;
      const chat = state.chatHistory.find(c => c.id === chatId);
      if (chat) {
        chat.pinned = !chat.pinned;
        state.chatHistory.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        sessionStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
      }
    },
    renameChat: (state, action) => {
      const { id, newTitle } = action.payload;
      const chat = state.chatHistory.find(c => c.id === id);
      if (chat) {
        chat.title = newTitle;
        sessionStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
      }
    },
    deleteChat: (state, action) => {
      const chatId = action.payload;
      state.chatHistory = state.chatHistory.filter(c => c.id !== chatId);
      if (state.currentChatId === chatId) state.currentChatId = null;
      sessionStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
    },
    setChatHistory: (state, action) => {
      state.chatHistory = action.payload;
      sessionStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
    },
  },
});

export const {
  setActiveModule,
  toggleModuleExpansion,
  setExpandedModules,
  setSelectedUploadFileId,
  setSelectedProjectFileId,
  setActiveProjectName,
  setSidebarCollapsed,
  setBranding,
  setExchangeRates,
  setActiveView,
  addToNavigationHistory,
  clearNavigationHistory,
  togglePinHistoryItem,
  renameHistoryItem,
  deleteHistoryItem,
  saveChatToHistory,
  setCurrentChatId,
  togglePinChat,
  renameChat,
  deleteChat,
  setChatHistory
} = navSlice.actions;

export default navSlice.reducer;
