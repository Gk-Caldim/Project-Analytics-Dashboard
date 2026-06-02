import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setBranding } from '../../../store/slices/navSlice';
import API from '../../../utils/api';
import { toast } from 'react-hot-toast';
import { ChevronDown, Loader2 } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';

const GeneralInfo = ({ settings, onSaveSuccess }) => {
  const dispatch = useDispatch();
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [localEdits, setLocalEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const getValue = (key) => {
    if (localEdits[key] !== undefined) return localEdits[key];
    return settings.find(s => s.key === key)?.value || '';
  };

  const handleUpdate = (key, value) => {
    setLocalEdits(prev => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleEditExistingLogo = async () => {
    const currentLogo = getValue('company_logo');
    if (!currentLogo) return;
    setImageToCrop(currentLogo);
    setIsCropModalOpen(true);
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
      setIsUploadingLogo(true);
      const response = await API.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = response.data.url;
      handleUpdate('company_logo', logoUrl);
      toast.success('Logo uploaded locally. Save settings to persist.');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCropComplete = (croppedFile) => {
    setIsCropModalOpen(false);
    handleLogoUpload(croppedFile);
  };

  const hasChanges = Object.keys(localEdits).length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToUpdate = Object.entries(localEdits).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        return {
          key,
          value,
          category: original?.category || 'General',
          type: original?.type || 'text'
        };
      });
      await API.patch('/settings/bulk', { settings: settingsToUpdate });

      // Update Redux state
      if (localEdits.company_logo !== undefined || localEdits.company_name !== undefined || localEdits.base_currency !== undefined || localEdits.sidebar_dashboard_limit !== undefined || localEdits.sidebar_dashboard_mode !== undefined) {
        dispatch(setBranding({
          companyLogo: localEdits.company_logo !== undefined ? localEdits.company_logo : settings.find(s => s.key === 'company_logo')?.value,
          companyName: localEdits.company_name !== undefined ? localEdits.company_name : settings.find(s => s.key === 'company_name')?.value,
          baseCurrency: localEdits.base_currency !== undefined ? localEdits.base_currency : settings.find(s => s.key === 'base_currency')?.value,
          sidebarDashboardLimit: localEdits.sidebar_dashboard_limit !== undefined ? localEdits.sidebar_dashboard_limit : settings.find(s => s.key === 'sidebar_dashboard_limit')?.value,
          sidebarDashboardMode: localEdits.sidebar_dashboard_mode !== undefined ? localEdits.sidebar_dashboard_mode : settings.find(s => s.key === 'sidebar_dashboard_mode')?.value,
        }));
      }

      setLocalEdits({});
      toast.success('System settings saved successfully');
      if (onSaveSuccess) await onSaveSuccess();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocalEdits({});
    toast.success('Changes discarded');
  };
  // new commit
  

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold text-text-primary tracking-tight">System Configuration</h2>
        <p className="text-sm text-gray-500 mt-2">Manage your institution's core identity and branding assets.</p>
      </div>

      <div className="bg-app-surface border border-border p-8 rounded-none">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-10">System Preferences</h3>

        <div className="space-y-12">
          {/* Base Currency Section */}
          <div className="space-y-4">
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Base Currency
            </label>
            <div className="max-w-xs relative">
              <select
                value={getValue('base_currency') || 'USD ($)'}
                onChange={(e) => handleUpdate('base_currency', e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium appearance-none cursor-pointer text-text-primary"
              >
                <option>USD ($)</option>
                <option>INR (₹)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
                <option>JPY (¥)</option>
                <option>CAD ($)</option>
                <option>AUD ($)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-muted">
                <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-[11px] text-text-muted mt-2 italic">Sets the default currency for all financial analytics.</p>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Sidebar Management Section */}
          <div className="space-y-8">
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Sidebar Management</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Dashboard Sub-modules Mode */}
              <div className="space-y-4">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Dashboard Display Mode
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="dashboard_mode"
                      checked={getValue('sidebar_dashboard_mode') !== 'recent'}
                      onChange={() => handleUpdate('sidebar_dashboard_mode', 'custom')}
                      className="w-4 h-4 text-brand-accent border-border focus:ring-brand-accent"
                    />
                    <span className="text-sm text-text-secondary font-medium group-hover:text-brand-accent transition-colors">Custom Display Count</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="dashboard_mode"
                      checked={getValue('sidebar_dashboard_mode') === 'recent'}
                      onChange={() => handleUpdate('sidebar_dashboard_mode', 'recent')}
                      className="w-4 h-4 text-brand-accent border-border focus:ring-brand-accent"
                    />
                    <span className="text-sm text-text-secondary font-medium group-hover:text-brand-accent transition-colors">Recent Dashboard Activity (Latest 2)</span>
                  </label>
                </div>
              </div>

              {/* Limits Section */}
              <div className="space-y-6">
                {getValue('sidebar_dashboard_mode') !== 'recent' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Dashboard Module Limit
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={getValue('sidebar_dashboard_limit') || '10'}
                        onChange={(e) => handleUpdate('sidebar_dashboard_limit', e.target.value)}
                        className="w-24 h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                      />
                      <p className="text-[11px] text-text-muted italic">Max projects visible.</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-app-surface border border-border p-8 rounded-none">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-10">Budget Analysis & Proposal Settings</h3>

        <div className="space-y-12">
          {/* Inflation Rates Row */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Inflation Rates (%)</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">USD Inflation</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={getValue('inflation_rate_usd') || '3.4'}
                  onChange={(e) => handleUpdate('inflation_rate_usd', e.target.value)}
                  className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">INR Inflation</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={getValue('inflation_rate_inr') || '5.1'}
                  onChange={(e) => handleUpdate('inflation_rate_inr', e.target.value)}
                  className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">EUR Inflation</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={getValue('inflation_rate_eur') || '2.4'}
                  onChange={(e) => handleUpdate('inflation_rate_eur', e.target.value)}
                  className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">GBP Inflation</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={getValue('inflation_rate_gbp') || '2.0'}
                  onChange={(e) => handleUpdate('inflation_rate_gbp', e.target.value)}
                  className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Other Currencies</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={getValue('inflation_rate_default') || '3.0'}
                  onChange={(e) => handleUpdate('inflation_rate_default', e.target.value)}
                  className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Volatility and Contingency Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Volatility Factors */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Volatility Buffers (Multiplier)</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Stable Currency</label>
                  <input
                    type="number" step="0.01" min="1.0" max="2.0"
                    value={getValue('volatility_factor_stable') || '1.01'}
                    onChange={(e) => handleUpdate('volatility_factor_stable', e.target.value)}
                    className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted italic">e.g., 1.01 = 1% buffer</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Volatile Currency</label>
                  <input
                    type="number" step="0.01" min="1.0" max="2.0"
                    value={getValue('volatility_factor_volatile') || '1.03'}
                    onChange={(e) => handleUpdate('volatility_factor_volatile', e.target.value)}
                    className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted italic">e.g., 1.03 = 3% buffer</p>
                </div>
              </div>
            </div>

            {/* Contingency Rates & Threshold */}
            <div className="space-y-4 md:col-span-3">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-tight">Contingency & Thresholds</h4>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Stable Contingency (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={getValue('contingency_rate_stable') || '5.0'}
                    onChange={(e) => handleUpdate('contingency_rate_stable', e.target.value)}
                    className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Volatile Contingency (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={getValue('contingency_rate_volatile') || '8.0'}
                    onChange={(e) => handleUpdate('contingency_rate_volatile', e.target.value)}
                    className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider h-8 flex items-end pb-1">Util. Threshold (%)</label>
                  <input
                    type="number" step="1" min="1" max="100"
                    value={Math.round(parseFloat(getValue('utilization_threshold') || '0.8') * 100)}
                    onChange={(e) => handleUpdate('utilization_threshold', (parseFloat(e.target.value) / 100).toString())}
                    className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium text-text-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCropModalOpen && (
        <ImageCropperModal
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setIsCropModalOpen(false)}
        />
      )}

      {/* Floating Save/Discard Panel */}
      {hasChanges && (
        <div className="fixed bottom-6 left-[240px] right-6 flex justify-center z-50 animate-slideInUp">
          <div className="bg-app-surface/95 dark:bg-slate-900/95 backdrop-blur-md border border-border-strong/30 shadow-2xl px-6 py-4 flex items-center justify-between gap-12 max-w-3xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <div>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Unsaved Changes</span>
                <p className="text-[10px] text-text-muted mt-0.5">You have modified configuration settings on this page.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-4 py-2 border border-transparent text-xs font-bold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralInfo;
