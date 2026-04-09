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
    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organization Landscape</h2>
           </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Forms */}
        <div className="lg:col-span-8 space-y-8">
          {/* Corporate Identity Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-8 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Corporate Identity</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Define your company's core public information</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  Official Company Name
                </label>
                <input
                  type="text"
                  value={getValue('company_name')}
                  onChange={(e) => onUpdate('company_name', e.target.value)}
                  className="w-full h-14 px-6 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-black text-slate-700 shadow-sm placeholder:text-slate-300"
                  placeholder="e.g. CALTIMS INDUSTRIAL"
                />
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  Headquarters Address
                </label>
                <textarea
                  rows={4}
                  value={getValue('hq_address')}
                  onChange={(e) => onUpdate('hq_address', e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50/50 border border-slate-200/80 rounded-3xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-bold text-slate-600 shadow-sm placeholder:text-slate-300 leading-relaxed"
                  placeholder="123 Enterprise Way, Tech City..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                    Operational Country
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={getValue('operational_country') || 'India'}
                      onChange={(e) => onUpdate('operational_country', e.target.value)}
                      className="w-full h-14 pl-12 pr-6 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                    Base Currency
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select 
                      value={getValue('base_currency') || 'USD ($)'}
                      onChange={(e) => onUpdate('base_currency', e.target.value)}
                      className="w-full h-14 pl-12 pr-10 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                    >
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                      <option>EUR (€)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> 
        </div>

        {/* Right Column: Logo & Additional Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col items-center text-center relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 p-3 opacity-10">
               <Building2 className="h-24 w-24" />
            </div>
            
            <div className="self-start flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/20">
                <Globe className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">Company Logo</h3>
              </div>
            </div>

            <div className="relative group w-full aspect-square max-w-[280px] mb-8">
              <div className="absolute inset-0 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center p-8 transition-all group-hover:bg-indigo-50/50 group-hover:border-indigo-300">
                {getValue('company_logo') ? (
                  <img 
                    src={getValue('company_logo')} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/caldimlogo.png";
                    }}
                  />
                ) : (
                  <>
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-slate-200 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-500">
                      <Globe className="h-10 w-10" />
                    </div>
                    <p className="text-xs font-black text-slate-500 tracking-widest uppercase">SELECT IMAGE ASSET</p>
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
                className="w-full h-14 flex items-center justify-center gap-3 bg-indigo-50/50 text-indigo-600 rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100/50 group uppercase"
              >
                <Upload className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                Upload New Logo
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleEditExistingLogo}
                  disabled={!getValue('company_logo')}
                  className="flex-1 h-12 flex items-center justify-center gap-2 bg-indigo-50/50 text-indigo-600 rounded-2xl font-black text-[10px] tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100/30 uppercase disabled:opacity-30"
                >
                  <Edit className="h-4 w-4" />
                  Edit Logo
                </button>
                <button 
                  onClick={() => onUpdate('company_logo', '')}
                  className="flex-1 h-12 flex items-center justify-center gap-2 text-red-500 rounded-2xl font-black text-[10px] tracking-widest hover:bg-red-50 transition-all uppercase"
                >
                  <Trash2 className="h-4 w-4" />
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
