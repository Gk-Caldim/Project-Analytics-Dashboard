import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setBranding } from '../../store/slices/navSlice';
import {
  Plus, Search, Edit, Trash2, X, Check,
  ChevronRight, Layout, Settings, Shield,
  Palette, FileText, Bell, Globe, Search as SearchIcon,
  RefreshCcw, Save, AlertCircle, Inbox, Command, Activity, Cpu, Briefcase, Boxes, ClipboardList, ShieldCheck,
  CreditCard, Key, Activity as ActivityIcon, HelpCircle, BookOpen, Menu, User, LifeBuoy, Link as LinkIcon
} from 'lucide-react';
import API from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';

// Import sub-components
import GeneralInfo from './components/GeneralInfo';
import BrandingTheme from './components/BrandingTheme';
import AccessControl from './components/AccessControl';

import AuditHistory from './components/AuditHistory';
import ApplicationAccess from './components/ApplicationAccess';
import Connections from './components/Connections';

const SystemSettings = () => {
  const dispatch = useDispatch();
  const { themeSettings, updateThemeLocally, refreshTheme } = useTheme();
  const [settings, setSettings] = useState([]);
  const [modifiedSettings, setModifiedSettings] = useState({});
  const [activeCategory, setActiveCategory] = useState('Organization');
  const [activeSubCategory, setActiveSubCategory] = useState('Access Control');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'super admin';

  useEffect(() => {
    console.log('SystemSettings: Current user role:', user?.role);
    console.log('SystemSettings: isAdmin:', isAdmin);
  }, [user, isAdmin]);

  // Categories definition matching Enterprise Console reference
  const sidebarCategories = [
    {
      group: 'GLOBAL SETTINGS',
      items: [
        { id: 'Organization', label: 'Organization', icon: Boxes },
        {
          id: 'Controls',
          label: 'Controls',
          icon: Shield,
          subItems: [
            ...(isAdmin ? [{ id: 'Access Control', label: 'Access Control' }] : []),
            ...(isAdmin ? [{ id: 'Application Access', label: 'Application Access' }] : []),
          ]
        },
        { id: 'Audit Logs', label: 'Audit Logs', icon: ClipboardList },
        { id: 'Connections', label: 'Connections', icon: LinkIcon },
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const logoUrl = response.data.url;

      // Update local state
      setSettings(prev => prev.map(s => s.key === 'company_logo' ? { ...s, value: logoUrl } : s));

      // Update Redux globally
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

      // Update Redux if branding changed
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
      showNotification('Institutional settings synced successfully');
    } catch (error) {
      console.error('Error syncing settings:', error);
      showNotification('Failed to sync updates', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'Organization':
        return <GeneralInfo settings={settings} onUpdate={handleUpdate} onLogoUpload={handleLogoUpload} />;
      case 'Controls':
        switch (activeSubCategory) {
          case 'Access Control':
            return <AccessControl />;
          case 'Application Access':
            return <ApplicationAccess />;
          default:
            return <AccessControl />;
        }
      case 'Audit Logs':
        return <AuditHistory />;
      case 'Connections':
        return <Connections settings={settings} onUpdate={handleUpdate} />;
      default:
        return <GeneralInfo settings={settings} onUpdate={handleUpdate} onLogoUpload={handleLogoUpload} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-surface">
      {/* Sidebar Navigation - Industrial Settings Design */}
      <aside className="w-[280px] bg-app-surface border-r border-border flex flex-col relative z-20">
        <div className="p-8 pt-10 mb-8">
          <h1 className="text-h1 font-bold text-text-primary tracking-tight">Settings</h1>
          <p className="text-caption font-bold text-text-muted uppercase tracking-widest mt-1">ADMINISTRATION</p>
        </div>

        <nav className="flex-1 px-4 space-y-12">
          {sidebarCategories.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="text-caption font-bold text-text-muted uppercase tracking-[0.2em] px-4">{group.group}</h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveCategory(item.id);
                        if (item.subItems && item.subItems.length > 0) {
                          setActiveSubCategory(item.subItems[0].id);
                        }
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${activeCategory === item.id
                        ? 'bg-brand-primary/5 text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-app-bg hover:text-text-primary'
                        }`}
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${activeCategory === item.id ? 'text-brand-primary' : 'text-text-muted group-hover:text-text-primary'}`} />
                      <span className="text-body-sm tracking-tight">{item.label}</span>
                      {item.subItems && (
                        <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-300 ${activeCategory === item.id ? 'rotate-90 text-brand-primary' : 'text-text-muted/30'}`} />
                      )}
                      {!item.subItems && activeCategory === item.id && (
                        <div className="ml-auto w-1 h-1 bg-brand-primary rounded-full" />
                      )}
                    </button>

                    {/* Sub Items */}
                    {item.subItems && activeCategory === item.id && (
                      <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => setActiveSubCategory(subItem.id)}
                            className={`w-full text-left px-4 py-2 rounded-md text-caption font-medium transition-all ${activeSubCategory === subItem.id
                              ? 'text-brand-primary bg-brand-primary/5 font-semibold'
                              : 'text-text-muted hover:text-text-secondary hover:bg-app-bg'
                              }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-border space-y-4">
          <button
            onClick={syncUpdates}
            disabled={!Object.keys(modifiedSettings).length || isSaving}
            className="w-full h-11 bg-brand-primary text-white rounded-md font-semibold text-caption tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-30 disabled:shadow-none"
          >
            <RefreshCcw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
            SYNC UPDATES
          </button>

          <div className="space-y-1">
            <button className="flex items-center gap-4 px-4 py-3 w-full text-slate-500 hover:text-indigo-600 transition-colors">
              <HelpCircle className="h-5 w-5" />
              <span className="text-[13px] font-medium">Support</span>
            </button>
            <button className="flex items-center gap-4 px-4 py-3 w-full text-slate-500 hover:text-indigo-600 transition-colors">
              <BookOpen className="h-5 w-5" />
              <span className="text-[13px] font-medium">Documentation</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">


        <main className="flex-1 overflow-y-auto p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {notification && (
              <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-3 rounded-lg shadow-xl z-50 animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 ${notification.type === 'success' ? 'bg-text-primary text-white' : 'bg-status-error text-white'
                }`}>
                <Check className="h-5 w-5 text-brand-primary" />
                <span className="text-caption font-bold tracking-widest uppercase">{notification.message}</span>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SystemSettings;