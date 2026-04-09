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
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar Navigation - Enterprise Console Design */}
      <aside className="w-[300px] bg-[#FFFFFF] border-r border-slate-100 flex flex-col relative z-20">
        <div className="p-8 pt-10 mb-8">
          <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">Enterprise Console</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ADMINISTRATION</p>
        </div>

        <nav className="flex-1 px-4 space-y-12">
          {sidebarCategories.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">{group.group}</h3>
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
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activeCategory === item.id
                        ? 'bg-indigo-50 text-indigo-600 font-bold'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      <item.icon className={`h-5 w-5 ${activeCategory === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span className="text-[13px] tracking-tight">{item.label}</span>
                      {item.subItems && (
                        <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-300 ${activeCategory === item.id ? 'rotate-90 text-indigo-600' : 'text-slate-300'}`} />
                      )}
                      {!item.subItems && activeCategory === item.id && (
                        <div className="ml-auto w-1 h-1 bg-indigo-600 rounded-full" />
                      )}
                    </button>

                    {/* Sub Items */}
                    {item.subItems && activeCategory === item.id && (
                      <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        {item.subItems.map((subItem) => (
                          <button
                            key={subItem.id}
                            onClick={() => setActiveSubCategory(subItem.id)}
                            className={`w-full text-left px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeSubCategory === subItem.id
                              ? 'text-indigo-600 bg-indigo-50/50'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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

        <div className="p-6 border-t border-slate-50 space-y-4">
          <button
            onClick={syncUpdates}
            disabled={!Object.keys(modifiedSettings).length || isSaving}
            className="w-full h-12 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-900 transition-all shadow-lg shadow-indigo-100/50 disabled:opacity-30 disabled:shadow-none"
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
              <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-3 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 ${notification.type === 'success' ? 'bg-[#1E293B] text-white' : 'bg-red-600 text-white'
                }`}>
                <Check className="h-5 w-5 text-emerald-400" />
                <span className="text-[11px] font-black tracking-widest uppercase">{notification.message}</span>
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