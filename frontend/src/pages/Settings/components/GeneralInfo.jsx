import React, { useState } from 'react';
import ImageCropperModal from './ImageCropperModal';

const GeneralInfo = ({ settings, onUpdate, onLogoUpload }) => {
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const getValue = (key) => settings.find(s => s.key === key)?.value || '';

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

  const handleCropComplete = (croppedFile) => {
    setIsCropModalOpen(false);
    onLogoUpload(croppedFile);
  };

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
            <div className="max-w-xs">
              <select 
                value={getValue('base_currency') || 'USD ($)'}
                onChange={(e) => onUpdate('base_currency', e.target.value)}
                className="w-full h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium appearance-none cursor-pointer"
              >
                <option>USD ($)</option>
                <option>INR (₹)</option>
                <option>EUR (€)</option>
              </select>
              <p className="text-[11px] text-text-muted mt-2 italic">Sets the default currency for all financial analytics.</p>
            </div>
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
                      onChange={() => onUpdate('sidebar_dashboard_mode', 'custom')}
                      className="w-4 h-4 text-brand-accent border-border focus:ring-brand-accent"
                    />
                    <span className="text-sm text-text-secondary font-medium group-hover:text-brand-accent transition-colors">Custom Display Count</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="dashboard_mode"
                      checked={getValue('sidebar_dashboard_mode') === 'recent'}
                      onChange={() => onUpdate('sidebar_dashboard_mode', 'recent')}
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
                        onChange={(e) => onUpdate('sidebar_dashboard_limit', e.target.value)}
                        className="w-24 h-11 px-4 bg-app-panel border border-border rounded-md focus:border-brand-accent outline-none transition-colors text-sm font-medium"
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

      {isCropModalOpen && (
        <ImageCropperModal 
          image={imageToCrop} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setIsCropModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default GeneralInfo;
