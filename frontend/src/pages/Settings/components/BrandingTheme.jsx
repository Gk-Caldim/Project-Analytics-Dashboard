import React from 'react';
import { Palette, RefreshCw } from 'lucide-react';

const BrandingTheme = ({ settings, onUpdate, onLocalUpdate }) => {
  const primaryColor = settings.find(s => s.key === 'primary_color')?.value || '#f4f6f9';
  const secondaryColor = settings.find(s => s.key === 'secondary_color')?.value || '#0004ab';
  const displayMode = settings.find(s => s.key === 'display_mode')?.value || 'light';

  const ColorInput = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 p-2 rounded-md">
        <div 
          className="w-10 h-10 border border-gray-200 shrink-0 rounded-sm" 
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none focus:ring-0 font-mono text-sm font-bold text-[#0004ab] uppercase flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-bold text-[#0004ab] tracking-tight">Institutional Branding</h2>
        <p className="text-sm text-gray-500 mt-2">Manage global visual identity, color protocols and display characteristics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 p-8 rounded-none space-y-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Color Core</h3>
          <div className="space-y-6">
            <ColorInput 
              label="Primary Surface HEX" 
              value={primaryColor} 
              onChange={(val) => {
                onUpdate('primary_color', val);
                if (val.length === 7 && val.startsWith('#')) onLocalUpdate({ primaryColor: val });
              }}
            />
            <ColorInput 
              label="Secondary Action HEX" 
              value={secondaryColor} 
              onChange={(val) => {
                onUpdate('secondary_color', val);
                if (val.length === 7 && val.startsWith('#')) onLocalUpdate({ secondaryColor: val });
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-8 rounded-none space-y-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Interface Mode</h3>
          <div className="grid grid-cols-1 gap-2">
            {['light', 'dark', 'system'].map((m) => (
              <button
                key={m}
                onClick={() => onUpdate('display_mode', m)}
                className={`flex items-center justify-between px-6 py-4 rounded-full border transition-all ${
                  displayMode === m 
                  ? 'bg-[#0004ab] text-white border-[#0004ab]' 
                  : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{m} Mode</span>
                {displayMode === m && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-12 rounded-none flex items-center justify-center">
         <div className="text-center space-y-6 max-w-md">
            <div className="inline-flex p-4 bg-white border border-gray-200 rounded-md">
               <RefreshCw className="h-6 w-6 text-gray-300" />
            </div>
            <div className="space-y-2">
               <p className="text-xs font-bold text-[#0004ab] uppercase tracking-tight">Identity Synchronization</p>
               <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-relaxed">
                  Changes to the branding core will trigger a system-wide interface rebuild for all active institutional users.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default BrandingTheme;
