import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Code splitting imports using React.lazy
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

const ProjectDashboard = React.lazy(() => import('./pages/ProjectDashboard'));
const UploadTrackers = React.lazy(() => import('./pages/Trackers/UploadTrackers'));
const EmployeeMaster = React.lazy(() => import('./pages/Masters/EmployeeMaster'));
const ProjectMaster = React.lazy(() => import('./pages/Masters/ProjectMaster'));

const BudgetMaster = React.lazy(() => import('./pages/Masters/BudgetMaster'));
const MOMModule = React.lazy(() => import('./pages/mom/MOMModule'));
const TranscriptViewer = React.lazy(() => import('./pages/mom/TranscriptViewer'));
const MeetingCapturePage = React.lazy(() => import('./pages/mom/MeetingCapturePage'));
const MOMViewPage = React.lazy(() => import('./pages/mom/MOMViewPage'));
const MeetingsDashboardPage = React.lazy(() => import('./pages/mom/MeetingsDashboardPage'));
const ScheduleMeetingPage = React.lazy(() => import('./pages/mom/ScheduleMeetingPage'));
const ScheduleMeetingPremiumPage = React.lazy(() => import('./pages/mom/ScheduleMeetingPremiumPage'));
const MeetingDetailsPage = React.lazy(() => import('./pages/mom/MeetingDetailsPage'));
const SavedMOMsPage = React.lazy(() => import('./pages/mom/SavedMOMsPage'));
const SystemSettings = React.lazy(() => import('./pages/Settings/SystemSettings'));
const BudgetSummaryView = React.lazy(() => import('./pages/Budget/BudgetSummaryView'));
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));

const AnalyticsPage = React.lazy(() => import('./pages/modules/AnalyticsPage'));
const MeetingsPage = React.lazy(() => import('./pages/modules/MeetingsPage'));
const BudgetPage = React.lazy(() => import('./pages/modules/BudgetPage'));
const GovernancePage = React.lazy(() => import('./pages/modules/GovernancePage'));

const EnterprisePage = React.lazy(() => import('./pages/EnterprisePage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const WorkspaceDashboard = React.lazy(() => import('./pages/WorkspaceDashboard'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const CalendarPage = React.lazy(() => import('./pages/calendar/CalendarPage'));

import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './hooks/use-confirm';
import { Toaster, toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Sparkles, X, CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { setBranding, setExchangeRates, setServerOnline } from './store/slices/navSlice';
import API from './utils/api';
import useInactivityTimeout from './hooks/useInactivityTimeout';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const CustomToast = ({ t, toast }) => {
  const isError = t.type === 'error';
  const isLoading = t.type === 'loading';
  const isSuccess = t.type === 'success' || t.type === 'blank';

  let borderColor = 'border-emerald-500/20 dark:border-emerald-500/25';
  let bgColor = 'bg-white/95 dark:bg-[#0f1115]/95';
  let iconBgColor = 'bg-emerald-50 dark:bg-emerald-500/10';
  let iconColor = 'text-emerald-600 dark:text-emerald-400';
  let titleColor = 'text-slate-800 dark:text-slate-200';
  let textColor = 'text-slate-600 dark:text-slate-400';
  let title = 'Success';
  let Icon = CheckCircle;

  if (isError) {
    title = 'Action Failed';
    borderColor = 'border-rose-500/20 dark:border-rose-500/25';
    iconBgColor = 'bg-rose-50 dark:bg-rose-500/10';
    iconColor = 'text-rose-600 dark:text-rose-400';
    Icon = AlertCircle;
  } else if (isLoading) {
    title = 'Processing';
    borderColor = 'border-blue-500/20 dark:border-blue-500/25';
    iconBgColor = 'bg-blue-50 dark:bg-blue-500/10';
    iconColor = 'text-blue-600 dark:text-blue-400';
    Icon = RefreshCw;
  } else if (t.type === 'blank') {
    title = 'Note';
    borderColor = 'border-amber-500/20 dark:border-amber-500/25';
    iconBgColor = 'bg-amber-50 dark:bg-amber-500/10';
    iconColor = 'text-amber-600 dark:text-amber-400';
    Icon = Info;
  }

  return (
    <div
      role="alert"
      className={`${
        t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'
      } rounded-full border ${borderColor} ${bgColor} py-1.5 pl-1.5 pr-4 shadow-lg backdrop-blur-md transition-all duration-300 pointer-events-auto flex items-center gap-2.5 ring-1 ring-black/5 max-h-9`}
    >
      <div className={`size-6 rounded-full flex items-center justify-center ${iconBgColor}`}>
        {isLoading ? (
           <Icon className={`size-3.5 animate-spin ${iconColor}`} />
        ) : t.icon ? (
          <div className="size-3.5 flex items-center justify-center text-sm">{t.icon}</div>
        ) : (
          <Icon className={`size-3.5 ${iconColor}`} />
        )}
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        <strong className={`text-xs font-semibold tracking-tight ${titleColor}`}>
          {title}
        </strong>
        <span className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800" />
        <span className={`text-xs font-medium leading-none ${textColor}`}>
          {t.message}
        </span>
      </div>
      
      {t.action && (
        <button
          onClick={() => {
            t.action.onClick();
            toast.dismiss(t.id);
          }}
          className={`ml-2 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${titleColor} hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95`}
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="top-center"
        containerStyle={{
          top: '10px',
        }}
        toastOptions={{
          duration: 3000,
        }}
      >
        {(t) => <CustomToast t={t} toast={toast} />}
      </Toaster>

      <ConfirmProvider>
        <ErrorBoundary>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0f1115]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>}>
              <AppContent />
            </React.Suspense>
          </Router>
        </ErrorBoundary>
      </ConfirmProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();
  const wsRef = React.useRef(null);
  const reconnectTimerRef = React.useRef(null);
  const wasOffline = React.useRef(false);

  // Selector to read if server is online
  const isServerOnline = useSelector(state => state.nav.isServerOnline);

  // Initialize inactivity logout (30 minutes)
  useInactivityTimeout(30 * 60 * 1000);

  // Poll healthz endpoint to track backend status
  // - Every 30s when server is online (reduce log noise)
  // - Every 10s when offline (faster recovery detection)
  // - Skipped entirely when the browser tab is hidden
  React.useEffect(() => {
    let active = true;
    let timer = null;

    const checkHealth = async () => {
      // Don't poll hidden tabs — saves requests when app is backgrounded
      if (document.visibilityState === 'hidden') return;

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const healthUrl = apiBase.replace(/\/api\/?$/, '/healthz');
        // Direct axios call to bypass Axios client instance interceptor retries
        const res = await axios.get(healthUrl, { timeout: 3000 });
        if (active) {
          if (res.data && res.data.status === 'ok') {
            dispatch(setServerOnline(true));
          } else {
            dispatch(setServerOnline(false));
          }
        }
      } catch (err) {
        if (active) {
          dispatch(setServerOnline(false));
        }
      }
    };

    const scheduleNext = (online) => {
      if (timer) clearInterval(timer);
      // Poll less frequently when healthy, more aggressively when recovering
      timer = setInterval(checkHealth, online ? 30000 : 10000);
    };

    // Run health check on mount, then start interval
    checkHealth();
    scheduleNext(true); // start with 30s interval; offline handler adjusts it

    // When tab becomes visible again, run an immediate check
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkHealth();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [dispatch]);

  // Handle transition from offline to online (reload to cleanly re-mount all state)
  React.useEffect(() => {
    if (isServerOnline === false) {
      wasOffline.current = true;
    } else if (isServerOnline === true && wasOffline.current) {
      wasOffline.current = false;
      toast.success("Backend server connected! Syncing data...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [isServerOnline]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await API.get('/settings/');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: isServerOnline === true,
  });

  const { data: exchangeRates } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      const response = await API.get('/currency/rates');
      return response.data || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isServerOnline === true,
  });

  React.useEffect(() => {
    if (settings) {
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
    }
  }, [settings, dispatch]);

  React.useEffect(() => {
    if (exchangeRates) {
      dispatch(setExchangeRates(exchangeRates));
    }
  }, [exchangeRates, dispatch]);

  React.useEffect(() => {
    // Only connect WebSocket if server is online
    if (isServerOnline === false) {
      if (wsRef.current) {
        const socket = wsRef.current;
        socket.onclose = null;
        socket.onerror = null;
        socket.onopen = null;
        socket.close();
        wsRef.current = null;
      }
      return;
    }

    let retryDelay = 5000;

    const connectWebSocket = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
        return;
      }

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
        const wsBase = apiBase.replace(/^http/, 'ws');
        const wsUrl = `${wsBase}/ws/status/dashboard_${Date.now()}`;

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
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
          }
        };

        socket.onclose = (e) => {
          if (wsRef.current === socket) {
            reconnectTimerRef.current = setTimeout(connectWebSocket, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60000);
          }
        };

        socket.onerror = (err) => {
        };
      } catch (err) {
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        const socket = wsRef.current;
        socket.onclose = null;
        socket.onerror = null;
        socket.onopen = null;
        socket.close();
        wsRef.current = null;
      }
    };
  }, [isServerOnline, dispatch]);

  const showBanner = isServerOnline === false && (location.pathname.startsWith('/dashboard') || location.pathname === '/login');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showBanner && (
        <div className="h-10 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 dark:border-amber-500/10 px-6 flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-semibold z-[99999] backdrop-blur-md shrink-0 select-none animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
            <span>Backend server is offline or starting up. Retrying connection...</span>
          </div>
          <button
            onClick={() => {
              const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
              const healthUrl = apiBase.replace(/\/api\/?$/, '/healthz');
              axios.get(healthUrl, { timeout: 3000 }).then(res => {
                if (res.data && res.data.status === 'ok') {
                  dispatch(setServerOnline(true));
                }
              }).catch(() => {});
            }}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-all font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300 cursor-pointer active:scale-95 border-0"
          >
            Retry Now
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
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
            <Route path="saved-moms" element={<SavedMOMsPage />} />
            <Route path="schedule-meeting" element={<ScheduleMeetingPremiumPage />} />
            <Route path="calendar" element={<CalendarPage />} />
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
      </div>
    </div>
  );
}

export default App;
