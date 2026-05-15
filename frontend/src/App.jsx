import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import modules for direct routing
import ProjectDashboard from './pages/ProjectDashboard';
import UploadTrackers from './pages/Trackers/UploadTrackers';
import EmployeeMaster from './pages/Masters/EmployeeMaster';
import ProjectMaster from './pages/Masters/ProjectMaster';

import BudgetMaster from './pages/Masters/BudgetMaster';
import MOMModule from './pages/mom/MOMModule';
import TranscriptViewer from './pages/mom/TranscriptViewer';
import MeetingCapturePage from './pages/mom/MeetingCapturePage';
import MOMViewPage from './pages/mom/MOMViewPage';
import MeetingsDashboardPage from './pages/mom/MeetingsDashboardPage';
import ScheduleMeetingPage from './pages/mom/ScheduleMeetingPage';
import MeetingDetailsPage from './pages/mom/MeetingDetailsPage';
import SavedMOMsPage from './pages/mom/SavedMOMsPage';
import SystemSettings from './pages/Settings/SystemSettings';
import BudgetSummaryView from './pages/Budget/BudgetSummaryView';
import ProjectDetail from './pages/ProjectDetail';
import LandingPage from './pages/LandingPage';

// Import new module pages
import AnalyticsPage from './pages/modules/AnalyticsPage';
import MeetingsPage from './pages/modules/MeetingsPage';
import BudgetPage from './pages/modules/BudgetPage';
import GovernancePage from './pages/modules/GovernancePage';

import EnterprisePage from './pages/EnterprisePage';
import CustomersPage from './pages/CustomersPage';
import PricingPage from './pages/PricingPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import NotFound from './pages/NotFound';

import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster, toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { Sparkles, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { setBranding, setExchangeRates } from './store/slices/navSlice';
import API from './utils/api';
import useInactivityTimeout from './hooks/useInactivityTimeout';


const CustomToast = ({ t, toast }) => {
  const isError = t.type === 'error';
  const isLoading = t.type === 'loading';
  const isSuccess = t.type === 'success' || t.type === 'blank';

  let borderColor = 'border-emerald-500 dark:border-emerald-400';
  let bgColor = 'bg-emerald-50 dark:bg-emerald-900/30';
  let iconColor = 'text-emerald-700 dark:text-emerald-200';
  let titleColor = 'text-emerald-800 dark:text-emerald-100';
  let textColor = 'text-emerald-700 dark:text-emerald-200';
  let title = 'Success';
  let Icon = CheckCircle;

  if (isError) {
    title = 'Action Failed';
    borderColor = 'border-rose-500 dark:border-rose-400';
    bgColor = 'bg-rose-50 dark:bg-rose-900/30';
    iconColor = 'text-rose-700 dark:text-rose-200';
    titleColor = 'text-rose-800 dark:text-rose-100';
    textColor = 'text-rose-700 dark:text-rose-200';
    Icon = AlertCircle;
  } else if (isLoading) {
    title = 'Processing';
    borderColor = 'border-sky-500 dark:border-sky-400';
    bgColor = 'bg-sky-50 dark:bg-sky-900/30';
    iconColor = 'text-sky-700 dark:text-sky-200';
    titleColor = 'text-sky-800 dark:text-sky-100';
    textColor = 'text-sky-700 dark:text-sky-200';
    Icon = RefreshCw;
  } else if (t.type === 'blank') {
    title = 'Note';
    borderColor = 'border-amber-500 dark:border-amber-400';
    bgColor = 'bg-amber-50 dark:bg-amber-900/30';
    iconColor = 'text-amber-700 dark:text-amber-200';
    titleColor = 'text-amber-800 dark:text-amber-100';
    textColor = 'text-amber-700 dark:text-amber-200';
    Icon = Info;
  }

  return (
    <div
      role="alert"
      className={`${
        t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out slide-out-to-bottom-5'
      } rounded-xl border-2 ${borderColor} ${bgColor} p-4 shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto min-w-[340px] max-w-md ring-1 ring-black/5`}
    >
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 rounded-full p-1.5 ${bgColor.replace('bg-', 'bg-opacity-20 bg-')}`}>
          {isLoading ? (
             <Icon className={`size-5 animate-spin ${iconColor}`} />
          ) : t.icon ? (
            <div className="size-5 flex items-center justify-center text-xl">{t.icon}</div>
          ) : (
            <Icon className={`size-5 ${iconColor}`} />
          )}
        </div>

        <div className="flex-1">
          <strong className={`block text-sm font-bold tracking-tight ${titleColor}`}>
            {title}
          </strong>

          <div className={`mt-1 text-xs font-medium leading-relaxed ${textColor}`}>
            {t.message}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {t.action ? (
            <button
              onClick={() => {
                t.action.onClick();
                toast.dismiss(t.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${titleColor} hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95`}
            >
              {t.action.label}
            </button>
          ) : (
            <button 
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
               <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const dispatch = useDispatch();
  const wsRef = React.useRef(null);
  const reconnectTimerRef = React.useRef(null);

  // Initialize inactivity logout (30 minutes)
  useInactivityTimeout(30 * 60 * 1000);

  React.useEffect(() => {

    const initializeApp = async () => {
      try {
        // 1. Fetch System Settings (Company Name, Logo, Base Currency)
        const settingsRes = await API.get('/settings/');
        const settings = settingsRes.data || [];

        const companyName = settings.find(s => s.key === 'company_name')?.value;
        const companyLogo = settings.find(s => s.key === 'company_logo')?.value;
        const baseCurrency = settings.find(s => s.key === 'base_currency')?.value;
        const sidebarDashboardLimit = settings.find(s => s.key === 'sidebar_dashboard_limit')?.value;
        const sidebarDashboardMode = settings.find(s => s.key === 'sidebar_dashboard_mode')?.value;

        if (companyName || companyLogo || baseCurrency || sidebarDashboardLimit || sidebarDashboardMode) {
          dispatch(setBranding({
            companyName,
            companyLogo,
            baseCurrency,
            sidebarDashboardLimit,
            sidebarDashboardMode
          }));
        }

        // 2. Fetch Exchange Rates from local backend (which proxies to live source)
        const ratesRes = await API.get('/currency/rates');
        if (ratesRes.data) {
          dispatch(setExchangeRates(ratesRes.data));
        }

      } catch (error) {
        console.error('Failed to initialize app settings:', error);
      }
    };

    initializeApp();

    // ── Global WebSocket Setup for Real-time Notifications ──
    let retryDelay = 5000;

    const connectWebSocket = () => {
      // 1. Prevent duplicate connections if already connecting or open
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        return;
      }

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api';
        const wsBase = apiBase.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws/status/dashboard_${Date.now()}`;
        console.log('📡 WS ATTEMPT:', wsUrl);

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('✅ WS CONNECTED (Handshake Successful)');
          retryDelay = 5000;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'MOM_SAVED') {
              toast.success(`Minutes Processed: ${data.project_name || 'Meeting'}`, {
                icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
                style: { border: '1px solid #10b981', padding: '12px', background: '#f0fdf4' },
              });
              window.dispatchEvent(new CustomEvent('MOM_SAVED', { detail: data }));
            }
            if (data.type === 'ISSUE_SYNCED') {
              window.dispatchEvent(new CustomEvent('ISSUE_SYNCED', { detail: data }));
            }
          } catch (e) {
            console.warn('WS Message non-JSON:', event.data);
          }
        };

        socket.onclose = (e) => {
          // Only retry if this is still the current active socket reference
          if (wsRef.current === socket) {
            console.log(`🔌 WS CLOSED (Code: ${e.code}, Reason: ${e.reason || 'None'}). Retrying in ${retryDelay / 1000}s...`);
            reconnectTimerRef.current = setTimeout(connectWebSocket, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60000);
          }
        };

        socket.onerror = (err) => {
          console.error('❌ WS ERROR DETECTED');
          // onclose will handle retry
        };
      } catch (err) {
        console.error('WS Setup Exception:', err);
      }
    };

    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        const socket = wsRef.current;
        // Detach listeners before closing to avoid "Failed" logs during intentional cleanup
        socket.onclose = null;
        socket.onerror = null;
        socket.onopen = null;
        socket.close();
        wsRef.current = null;
      }
    };
  }, [dispatch]);

  return (
    <ThemeProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
        }}
      >
        {(t) => <CustomToast t={t} toast={toast} />}
      </Toaster>

      <ErrorBoundary>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
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
            <Route path="budget-summary/:projectName" element={<BudgetSummaryView />} />
            
            <Route path="masters" element={<Navigate to="employees" replace />} />
            <Route path="masters/employees" element={<EmployeeMaster />} />
            <Route path="masters/project-master" element={<ProjectMaster />} />
            <Route path="masters/budget-master" element={<BudgetMaster />} />

            <Route path="masters/project-detail/:id" element={<ProjectDetail />} />
            
            <Route path="mom" element={<MeetingCapturePage />} />
            <Route path="mom/view" element={<MOMViewPage />} />
            <Route path="mom/view/:meetingId" element={<MOMViewPage />} />
            <Route path="mom/transcript-viewer" element={<TranscriptViewer />} />
            <Route path="mom/legacy" element={<MOMModule />} />
            <Route path="meetings" element={<MeetingsDashboardPage />} />
            <Route path="saved-moms" element={<SavedMOMsPage />} />
            <Route path="schedule-meeting" element={<ScheduleMeetingPage />} />
            <Route path="meeting/:id" element={<MeetingDetailsPage />} />
            <Route path="settings/*" element={<SystemSettings />} />
          </Route>


          <Route path="/workspace-dashboard" element={<WorkspaceDashboard />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/governance" element={<GovernancePage />} />

          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  </ThemeProvider>
);
}

export default App;
