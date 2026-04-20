import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBranding } from '../../store/slices/navSlice';
import API from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';

// Import all sub-components
import GeneralInfo from './components/GeneralInfo';
import AccessControl from './components/AccessControl';
import AuditHistory from './components/AuditHistory';
import ApplicationAccess from './components/ApplicationAccess';
import Connections from './components/Connections';
import BrandingTheme from './components/BrandingTheme';

const SystemSettings = () => {
  const dispatch = useDispatch();
  const { themeSettings, updateThemeLocally, refreshTheme } = useTheme();
  const [settings, setSettings] = useState([]);
  const [modifiedSettings, setModifiedSettings] = useState({});
  const [activeCategory, setActiveCategory] = useState('Organization');
  const [activeSubCategory, setActiveSubCategory] = useState('Identity');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'super admin';

  const sidebarCategories = [
    {
      group: 'ORGANIZATION',
      items: [
        { id: 'Organization', label: 'Identity' },
        { id: 'Branding', label: 'Visual Branding' },
      ]
    },
    {
        group: 'SECURE CONTROLS',
        items: [
          { id: 'Access Control', label: 'Role Management' },
          { id: 'Application Access', label: 'Account Directory' },
        ]
    },
    {
      group: 'INFRASTRUCTURE',
      items: [
        { id: 'Connections', label: 'External Bridges' },
        { id: 'Audit Logs', label: 'System Ledger' },
      ]
    }
  ];

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
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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
      if (modifiedSettings.company_name || modifiedSettings.base_currency) {
        dispatch(setBranding({ 
          companyName: modifiedSettings.company_name,
          baseCurrency: modifiedSettings.base_currency
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

  const renderContent = () => {
    switch (activeCategory) {
      case 'Organization': return <GeneralInfo settings={settings} onUpdate={handleUpdate} onLogoUpload={handleLogoUpload} />;
      case 'Branding': return <BrandingTheme settings={settings} onUpdate={handleUpdate} onLocalUpdate={updateThemeLocally} />;
      case 'Access Control': return <AccessControl />;
      case 'Application Access': return <ApplicationAccess />;
      case 'Connections': return <Connections settings={settings} onUpdate={handleUpdate} />;
      case 'Audit Logs': return <AuditHistory />;
      default: return <GeneralInfo settings={settings} onUpdate={handleUpdate} onLogoUpload={handleLogoUpload} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F9] font-['Inter']">
      <aside className="w-[280px] bg-[#F4F6F9] border-r border-gray-200 flex flex-col z-20">
        <div className="p-8 pt-12">
          <h1 className="text-2xl font-bold text-[#0E1B2E] tracking-tight uppercase">Settings</h1>
          <div className="h-0.5 w-6 bg-[#0E1B2E]/20 mt-4" />
        </div>

        <nav className="flex-1 px-6 mt-8 space-y-10 overflow-y-auto custom-scrollbar">
          {sidebarCategories.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="text-[10px] font-bold text-[#0E1B2E]/40 uppercase tracking-[0.3em] px-2">{group.group}</h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-none transition-all group ${activeCategory === item.id
                      ? 'bg-[#0E1B2E] text-white'
                      : 'text-[#0E1B2E]/60 hover:bg-[#0E1B2E]/5 hover:text-[#0E1B2E]'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-200 mt-auto">
          <button
            onClick={syncUpdates}
            disabled={!Object.keys(modifiedSettings).length || isSaving}
            className="w-full h-12 bg-[#0E1B2E] text-white rounded-none font-bold text-[10px] tracking-[0.2em] outline-none hover:opacity-90 disabled:opacity-20 transition-all uppercase"
          >
            {isSaving ? '...' : 'Commit Changes'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#F4F6F9] p-16">
        <div className="max-w-5xl mx-auto pb-24">
          {notification && (
            <div className={`fixed bottom-12 left-[calc(280px+50%)] -translate-x-1/2 px-8 py-4 border z-50 text-[10px] font-bold uppercase tracking-[0.2em] animate-in slide-in-from-bottom-10 shadow-2xl ${
              notification.type === 'success' ? 'bg-[#0E1B2E] text-white border-white/10' : 'bg-red-600 text-white border-none'
            }`}>
              {notification.message}
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default SystemSettings;