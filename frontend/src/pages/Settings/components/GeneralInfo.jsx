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
        <h2 className="text-3xl font-bold text-[#0E1B2E] tracking-tight">Organization Profile</h2>
        <p className="text-sm text-gray-500 mt-2">Manage your institution's core identity and branding assets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Identity Form */}
        <div className="lg:col-span-12">
          <div className="bg-white border border-gray-200 p-8 rounded-none">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Corporate Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  value={getValue('company_name')}
                  onChange={(e) => onUpdate('company_name', e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-md focus:border-[#0E1B2E] outline-none transition-colors text-sm font-medium"
                  placeholder="e.g. CALTIMS INDUSTRIAL"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Operational Country
                </label>
                <input
                  type="text"
                  value={getValue('operational_country') || 'India'}
                  onChange={(e) => onUpdate('operational_country', e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-md focus:border-[#0E1B2E] outline-none transition-colors text-sm font-medium"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Headquarters Address
                </label>
                <textarea
                  rows={3}
                  value={getValue('hq_address')}
                  onChange={(e) => onUpdate('hq_address', e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md focus:border-[#0E1B2E] outline-none transition-colors text-sm font-medium resize-none"
                  placeholder="123 Enterprise Way, Tech City..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Base Currency
                </label>
                <select 
                  value={getValue('base_currency') || 'USD ($)'}
                  onChange={(e) => onUpdate('base_currency', e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-md focus:border-[#0E1B2E] outline-none transition-colors text-sm font-medium appearance-none cursor-pointer"
                >
                  <option>USD ($)</option>
                  <option>INR (₹)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="lg:col-span-12">
          <div className="bg-white border border-gray-200 p-8 rounded-none">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Branding Assets</h3>
            
            <div className="flex flex-col md:flex-row gap-12 items-center md:items-start">
              <div className="w-56 h-56 bg-gray-50 border border-gray-200 flex items-center justify-center relative group">
                {getValue('company_logo') ? (
                  <img 
                    src={getValue('company_logo')} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain p-4"
                  />
                ) : (
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center">
                    No Logo<br/>Uploaded
                  </div>
                )}
                <input 
                  id="logo-upload-input"
                  type="file" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  accept="image/*"
                />
              </div>

              <div className="flex-1 space-y-6 w-full max-w-sm">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-[#0E1B2E]">Company Logo</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Upload your institution's logo. This will be used in the navigation sidebar, reports, and system-wide branding. Recommended size: 512x512px.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => document.getElementById('logo-upload-input').click()}
                    className="h-10 bg-[#0E1B2E] text-white rounded-full font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity"
                  >
                    Upload New
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleEditExistingLogo}
                      disabled={!getValue('company_logo')}
                      className="h-10 border border-gray-200 text-[#0E1B2E] rounded-full font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    >
                      Edit Logo
                    </button>
                    <button 
                      onClick={() => onUpdate('company_logo', '')}
                      className="h-10 border border-red-100 text-red-600 rounded-full font-bold text-[10px] tracking-widest uppercase hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
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
    </div>
  );
};

export default GeneralInfo;
