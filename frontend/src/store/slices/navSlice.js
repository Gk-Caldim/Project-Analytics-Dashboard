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
  exchangeRates: JSON.parse(sessionStorage.getItem('exchange_rates')) || { 'USD': 1, 'INR': 83.2, 'EUR': 0.92 }
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
  setExchangeRates
} = navSlice.actions;

export default navSlice.reducer;
