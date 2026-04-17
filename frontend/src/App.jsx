import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import modules for direct routing
import ProjectDashboard from './pages/ProjectDashboard';
import UploadTrackers from './pages/Trackers/UploadTrackers';
import EmployeeMaster from './pages/Masters/EmployeeMaster';
import ProjectMaster from './pages/Masters/ProjectMaster';

import Masters from './pages/Masters/Masters';
import MOMModule from './pages/mom/MOMModule';
import MeetingCapturePage from './pages/mom/MeetingCapturePage';
import MOMViewPage from './pages/mom/MOMViewPage';
import MeetingsDashboardPage from './pages/mom/MeetingsDashboardPage';
import ScheduleMeetingPage from './pages/mom/ScheduleMeetingPage';
import MeetingDetailsPage from './pages/mom/MeetingDetailsPage';
import SystemSettings from './pages/Settings/SystemSettings';
import BudgetUpload from './pages/Budget/BudgetUpload';
import BudgetSummaryView from './pages/Budget/BudgetSummaryView';
import ProjectDetail from './pages/ProjectDetail';
import AgentChat from './components/Agent/AgentChat';

import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster, toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { Sparkles } from 'lucide-react'; // For WS toasts
import { setBranding, setExchangeRates } from './store/slices/navSlice';
import API from './utils/api';

function App() {
  const dispatch = useDispatch();

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Fetch System Settings (Company Name, Logo, Base Currency)
        const settingsRes = await API.get('/settings/');
        const settings = settingsRes.data || [];
        
        const companyName = settings.find(s => s.key === 'company_name')?.value;
        const companyLogo = settings.find(s => s.key === 'company_logo')?.value;
        const baseCurrency = settings.find(s => s.key === 'base_currency')?.value;

        if (companyName || companyLogo || baseCurrency) {
          dispatch(setBranding({ 
            companyName, 
            companyLogo, 
            baseCurrency 
          }));
        }

        // 2. Fetch Exchange Rates
        const ratesRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const ratesData = await ratesRes.json();
        
        if (ratesData && ratesData.rates) {
          dispatch(setExchangeRates(ratesData.rates));
        }

      } catch (error) {
        console.error('Failed to initialize app settings:', error);
      }
    };

    initializeApp();

    // ── Global WebSocket Setup for Real-time Notifications ──
    let ws = null;
    const connectWebSocket = () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
        // Convert http://host:port/... -> ws://host:port/ws/dashboard
        const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api.*$/, '') + '/ws/dashboard_' + Date.now();
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => console.log('📡 Connected to Real-time Sync Engine');
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'MOM_SAVED') {
            toast.success(`Minutes Processed: ${data.project_name || 'Meeting'}`, {
              icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
              style: { border: '1px solid #10b981', padding: '12px', background: '#f0fdf4' },
            });
          }
        };

        ws.onclose = () => {
          console.log('📡 Connection lost. Reconnecting in 5s...');
          setTimeout(connectWebSocket, 5000);
        };
      } catch (err) {
        console.warn('Real-time connection failed:', err);
      }
    };
    
    connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, [dispatch]);

  return (
    <ThemeProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 2500,
          style: { fontSize: '12px', fontWeight: '600', borderRadius: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' }, style: { background: '#f0fdf4', color: '#065f46', border: '1px solid #a7f3d0' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' }, style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }, duration: 4000 },
          loading: { style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' } },
        }}
      />

      <ErrorBoundary>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectDashboard />} />
            <Route path="trackers" element={<UploadTrackers />} />
            <Route path="budget-upload" element={<BudgetUpload />} />
            <Route path="budget-summary/:projectName" element={<BudgetSummaryView />} />
            
            <Route path="masters" element={<Masters />} />
            <Route path="masters/employees" element={<EmployeeMaster />} />
            <Route path="masters/project-master" element={<ProjectMaster />} />

            <Route path="masters/project-detail/:id" element={<ProjectDetail />} />
            
            <Route path="mom" element={<MeetingCapturePage />} />
            <Route path="mom/view" element={<MOMViewPage />} />
            <Route path="mom/legacy" element={<MOMModule />} />
            <Route path="meetings" element={<MeetingsDashboardPage />} />
            <Route path="schedule-meeting" element={<ScheduleMeetingPage />} />
            <Route path="meeting/:id" element={<MeetingDetailsPage />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <AgentChat />
      </Router>
    </ErrorBoundary>
  </ThemeProvider>
);
}

export default App;
