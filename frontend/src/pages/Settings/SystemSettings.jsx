import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { setBranding } from '../../store/slices/navSlice';
import API from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import { Spinner } from '../../components/ui/spinner';

// Import all sub-components
import GeneralInfo from './components/GeneralInfo';
import AccessControl from './components/AccessControl';
import AuditHistory from './components/AuditHistory';
import ApplicationAccess from './components/ApplicationAccess';
import Connections from './components/Connections';
import BrandingTheme from './components/BrandingTheme';
import Maintenance from './components/Maintenance';

const SystemSettings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { themeSettings, updateThemeLocally, refreshTheme } = useTheme();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'super admin';

  // Get current path from location - more robustly
  const currentPath = location.pathname.split('/settings/')[1]?.split('/')[0] || 'general';


  const sidebarCategories = [
    {
      group: 'ORGANIZATION',
      items: [
        { id: 'Organization', label: 'System', path: 'general' },
        { id: 'Branding', label: 'Visual Branding', path: 'branding' },
      ]
    },
    {
        group: 'SECURE CONTROLS',
        items: [
          { id: 'Access Control', label: 'Role Management', path: 'access' },
          ...(isAdmin ? [{ id: 'Application Access', label: 'Account Directory', path: 'applications' }] : []),
        ]
    },
    {
      group: 'INFRASTRUCTURE',
      items: [
        { id: 'Connections', label: 'External Bridges', path: 'connections' },
        ...(isAdmin ? [{ id: 'Audit Logs', label: 'System Ledger', path: 'audit' }] : []),
        { id: 'Maintenance', label: 'System Health', path: 'maintenance' },
      ]
    }
  ];

  // Helper to find active category based on path
  const activeCategory = sidebarCategories
    .flatMap(g => g.items)
    .find(item => item.path === currentPath)?.id || 'Organization';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await API.get('/settings/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg font-['Inter']">
      {/* ── Settings Sidebar — mirrors main Sidebar style, light palette ── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}>
        {/* Logo / Title block */}
        <div style={{
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingLeft: '16px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Settings
          </span>
        </div>

        {/* Scrollable nav */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 0',
        }} className="scrollbar-hide">
          {sidebarCategories.map((group) => (
            <div key={group.group} style={{ marginBottom: '20px' }}>
              {/* Section label */}
              <div style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                padding: '12px 16px 6px',
                fontWeight: 500,
              }}>
                {group.group}
              </div>

              {/* Nav items */}
              {group.items.map((item) => {
                const isActive = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/dashboard/settings/${item.path}`)}
                    style={{
                      width: 'calc(100% - 16px)',
                      margin: '0 8px 4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                      fontSize: '13px',
                      fontWeight: isActive ? 500 : 400,
                      backgroundColor: isActive ? 'var(--active-menu)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <div style={{ width: '3px', height: '16px', borderRadius: '2px', backgroundColor: 'var(--text-primary)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-app-bg p-16">
        <div className="max-w-5xl mx-auto pb-24">
          {loading ? (
            <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size="lg" className="text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <Routes>
              <Route index element={<Navigate to="general" replace />} />
              <Route path="general" element={<GeneralInfo settings={settings} onSaveSuccess={fetchSettings} />} />
              <Route path="branding" element={<BrandingTheme settings={settings} onSaveSuccess={fetchSettings} onLocalUpdate={updateThemeLocally} />} />
              <Route path="access" element={<AccessControl />} />
              <Route path="applications" element={<ApplicationAccess />} />
              <Route path="connections" element={<Connections settings={settings} onSaveSuccess={fetchSettings} />} />
              <Route path="audit" element={<AuditHistory />} />
              <Route path="maintenance" element={<Maintenance />} />
              {/* Fallback to general */}
              <Route path="*" element={<Navigate to="general" replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
};

export default SystemSettings;
