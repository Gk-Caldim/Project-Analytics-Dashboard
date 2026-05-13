import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { setBranding } from '../../store/slices/navSlice';
import API from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';

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
  const [modifiedSettings, setModifiedSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);
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
    try {
      const response = await API.get('/settings/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  const handleUpdate = (key, value) => {
    setSettings(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) {
        return prev.map(s => s.key === key ? { ...s, value } : s);
      }
      return [...prev, { key, value }];
    });
    setModifiedSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (imageSource) => {
    let file;
    if (imageSource instanceof File) {
      file = imageSource;
    } else {
      file = imageSource.target.files[0];
    }
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsSaving(true);
      const response = await API.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = response.data.url;
      setSettings(prev => prev.map(s => s.key === 'company_logo' ? { ...s, value: logoUrl } : s));
      dispatch(setBranding({ companyLogo: logoUrl }));
      showNotification('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      showNotification('Failed to upload logo', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const syncUpdates = async () => {
    if (Object.keys(modifiedSettings).length === 0) return;
    setIsSaving(true);
    try {
      const settingsToUpdate = Object.entries(modifiedSettings).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        return { key, value, category: original?.category || 'General', type: original?.type || 'text' };
      });
      await API.patch('/settings/bulk', { settings: settingsToUpdate });
      if (modifiedSettings.company_name || modifiedSettings.base_currency || modifiedSettings.sidebar_dashboard_limit || modifiedSettings.sidebar_dashboard_mode) {
        dispatch(setBranding({ 
          companyName: modifiedSettings.company_name,
          baseCurrency: modifiedSettings.base_currency,
          sidebarDashboardLimit: modifiedSettings.sidebar_dashboard_limit,
          sidebarDashboardMode: modifiedSettings.sidebar_dashboard_mode
        }));
      }
      if (modifiedSettings.primary_color || modifiedSettings.secondary_color || modifiedSettings.display_mode) {
        refreshTheme();
      }
      setModifiedSettings({});
      showNotification('Settings saved successfully');
    } catch (error) {
      console.error('Error syncing settings:', error);
      showNotification('Failed to save updates', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Routes are handled in the return JSX now

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
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <div style={{ width: '3px', height: '16px', borderRadius: '2px', backgroundColor: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer — commit button */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 'auto' }}>
          <button
            onClick={syncUpdates}
            disabled={!Object.keys(modifiedSettings).length || isSaving}
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '10px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: Object.keys(modifiedSettings).length && !isSaving ? 'pointer' : 'not-allowed',
              opacity: Object.keys(modifiedSettings).length && !isSaving ? 1 : 0.25,
              transition: 'opacity 0.2s',
            }}
          >
            {isSaving ? '...' : 'Commit Changes'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-app-bg p-16">
        <div className="max-w-5xl mx-auto pb-24">
          <Routes>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralInfo settings={settings} onUpdate={handleUpdate} onLogoUpload={handleLogoUpload} />} />
            <Route path="branding" element={<BrandingTheme settings={settings} onUpdate={handleUpdate} onLocalUpdate={updateThemeLocally} />} />
            <Route path="access" element={<AccessControl />} />
            <Route path="applications" element={<ApplicationAccess />} />
            <Route path="connections" element={<Connections settings={settings} onUpdate={handleUpdate} />} />
            <Route path="audit" element={<AuditHistory />} />
            <Route path="maintenance" element={<Maintenance />} />
            {/* Fallback to general */}
            <Route path="*" element={<Navigate to="general" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default SystemSettings;
