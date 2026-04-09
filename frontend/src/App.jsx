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
import MeetingsDashboardPage from './pages/mom/MeetingsDashboardPage';
import ScheduleMeetingPage from './pages/mom/ScheduleMeetingPage';
import MeetingDetailsPage from './pages/mom/MeetingDetailsPage';
import SystemSettings from './pages/Settings/SystemSettings';
import BudgetUpload from './pages/Budget/BudgetUpload';
import BudgetSummaryView from './pages/Budget/BudgetSummaryView';
import ProjectDetail from './pages/ProjectDetail';

import { ThemeProvider } from './contexts/ThemeContext';
import { useDispatch } from 'react-redux';
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
  }, [dispatch]);

  return (
    <ThemeProvider>
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
            
            <Route path="mom" element={<MOMModule />} />
            <Route path="meetings" element={<MeetingsDashboardPage />} />
            <Route path="schedule-meeting" element={<ScheduleMeetingPage />} />
            <Route path="meeting/:id" element={<MeetingDetailsPage />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  </ThemeProvider>
);
}

export default App;
