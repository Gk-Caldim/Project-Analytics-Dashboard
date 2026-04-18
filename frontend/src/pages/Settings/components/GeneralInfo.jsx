import React, { useState } from 'react';
import { Building2, MapPin, Globe, Banknote, Upload, Trash2, ShieldCheck, Info, Edit } from 'lucide-react';
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
    // Reset input so the same file can be selected again
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
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h2 font-semibold text-text-primary tracking-tight">Organization Landscape</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Forms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Corporate Identity Card */}
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm space-y-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-md shadow-sm border border-brand-primary/10">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-label font-semibold text-text-primary tracking-wider uppercase">Corporate Identity</h3>
                <p className="text-caption text-text-secondary mt-0.5">Define your company's core public information</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="block text-label font-medium text-text-secondary uppercase mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  Official Company Name
                </label>
                <input
                  type="text"
                  value={getValue('company_name')}
                  onChange={(e) => onUpdate('company_name', e.target.value)}
                  className="w-full h-11 px-4 bg-app-bg border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all font-medium text-text-primary"
                  placeholder="e.g. CALTIMS INDUSTRIAL"
                />
              </div>
 
              <div className="group">
                <label className="block text-label font-medium text-text-secondary uppercase mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  Headquarters Address
                </label>
                <textarea
                  rows={4}
                  value={getValue('hq_address')}
                  onChange={(e) => onUpdate('hq_address', e.target.value)}
                  className="w-full px-4 py-3 bg-app-bg border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all font-medium text-text-primary placeholder:text-text-muted leading-relaxed"
                  placeholder="123 Enterprise Way, Tech City..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="group">
                  <label className="block text-label font-medium text-text-secondary uppercase mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                    Operational Country
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      value={getValue('operational_country') || 'India'}
                      onChange={(e) => onUpdate('operational_country', e.target.value)}
                      className="w-full h-11 pl-10 pr-4 bg-app-bg border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all font-medium text-text-primary"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-label font-medium text-text-secondary uppercase mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                    Base Currency
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <select 
                      value={getValue('base_currency') || 'USD ($)'}
                      onChange={(e) => onUpdate('base_currency', e.target.value)}
                      className="w-full h-11 pl-10 pr-10 bg-app-bg border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all font-medium text-text-primary appearance-none cursor-pointer"
                    >
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                      <option>EUR (€)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                       <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> 
        </div>

        {/* Right Column: Logo & Additional Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm flex flex-col items-center text-center relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 p-3 opacity-5">
               <Building2 className="h-20 w-20" />
            </div>
            
            <div className="self-start flex items-center gap-4 mb-6">
              <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-md shadow-sm border border-brand-primary/10">
                <Globe className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-label font-semibold text-text-primary tracking-wider uppercase">Company Logo</h3>
              </div>
            </div>

            <div className="relative group w-full aspect-square max-w-[240px] mb-6">
              <div className="absolute inset-0 bg-app-surface border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center p-6 transition-all group-hover:bg-brand-primary/5 group-hover:border-brand-primary/30">
                {getValue('company_logo') ? (
                  <img 
                    src={getValue('company_logo')} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain drop-shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/caldimlogo.png";
                    }}
                  />
                ) : (
                  <>
                    <div className="w-16 h-16 bg-app-bg rounded-lg shadow-sm flex items-center justify-center mb-4 text-text-muted group-hover:text-brand-primary group-hover:scale-110 transition-all duration-500">
                      <Globe className="h-8 w-8" />
                    </div>
                    <p className="text-caption font-bold text-text-secondary tracking-widest uppercase">SELECT ASSET</p>
                  </>
                )}
              </div>
              
              <input 
                id="logo-upload-input"
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept="image/*"
              />
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => document.getElementById('logo-upload-input').click()}
                className="w-full h-11 flex items-center justify-center gap-3 bg-brand-primary text-white rounded-md font-semibold text-caption tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-brand-primary/20 uppercase"
              >
                <Upload className="h-4 w-4" />
                Upload New Logo
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleEditExistingLogo}
                  disabled={!getValue('company_logo')}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-app-surface text-text-primary rounded-md font-semibold text-[10px] tracking-widest hover:bg-app-panel border border-border transition-all uppercase disabled:opacity-30"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Logo
                </button>
                <button 
                  onClick={() => onUpdate('company_logo', '')}
                  className="flex-1 h-10 flex items-center justify-center gap-2 text-status-error rounded-md font-semibold text-[10px] tracking-widest hover:bg-status-error/5 transition-all uppercase"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Logo
                </button>
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
// Helper Chevron replacement
const ChevronRight = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default GeneralInfo;
