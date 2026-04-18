import React from 'react';
import { Palette, Sun, Moon, Laptop, Check, RefreshCcw } from 'lucide-react';

const BrandingTheme = ({ settings, onUpdate, themeSettings, onLocalUpdate }) => {
  const primaryColor = settings.find(s => s.key === 'primary_color')?.value || '#6366f1';
  const secondaryColor = settings.find(s => s.key === 'secondary_color')?.value || '#0ea5e9';
  const displayMode = settings.find(s => s.key === 'display_mode')?.value || 'light';

  const presets = [
    { name: 'Indigo', primary: '#6366f1', secondary: '#818cf8' },
    { name: 'Royal', primary: '#4f46e5', secondary: '#6366f1' },
    { name: 'Ocean', primary: '#0ea5e9', secondary: '#38bdf8' },
    { name: 'Emerald', primary: '#10b981', secondary: '#34d399' },
    { name: 'Amber', primary: '#f59e0b', secondary: '#fbbf24' },
    { name: 'Rose', primary: '#f43f5e', secondary: '#fb7185' },
    { name: 'Slate', primary: '#475569', secondary: '#64748b' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-h2 font-semibold text-text-primary tracking-tight">Institutional Branding</h2>
        <p className="text-text-secondary text-caption uppercase mt-1">Customize your enterprise identity and global interface</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color Palette Selection */}
        <div className="space-y-6">
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-md border border-brand-primary/10">
                <Palette className="h-5 w-5" />
              </div>
              <h3 className="text-label font-semibold text-text-primary uppercase tracking-wider">Atmosphere</h3>
            </div>

            <div className="space-y-6">
              {/* Presets */}
              <div className="flex flex-wrap gap-4">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      onUpdate('primary_color', p.primary);
                      onUpdate('secondary_color', p.secondary);
                      onLocalUpdate({ primaryColor: p.primary, secondaryColor: p.secondary });
                    }}
                    className={`w-14 h-14 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${
                      primaryColor === p.primary ? 'border-slate-800 ring-4 ring-slate-100 shadow-lg' : 'border-transparent shadow-sm'
                    }`}
                    style={{ backgroundColor: p.primary }}
                    title={p.name}
                  >
                    {primaryColor === p.primary && <Check className="h-6 w-6 text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>

              {/* Custom HEX */}
              <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label font-medium text-text-secondary uppercase tracking-wider mb-2 ml-1">
                    Custom Primary HEX
                  </label>
                  <div className="flex items-center gap-3 bg-app-bg p-2 rounded-sm border border-border focus-within:border-brand-primary/50 transition-colors">
                    <div 
                      className="w-10 h-10 rounded-lg shadow-sm border border-slate-200" 
                      style={{ backgroundColor: primaryColor }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdate('primary_color', val);
                        if (val.length === 7 && val.startsWith('#')) {
                           onLocalUpdate({ primaryColor: val });
                        }
                      }}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-mono text-sm font-bold text-slate-700 uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-label font-medium text-text-secondary uppercase tracking-wider mb-2 ml-1">
                    Custom Secondary HEX
                  </label>
                  <div className="flex items-center gap-3 bg-app-bg p-2 rounded-sm border border-border focus-within:border-brand-primary/50 transition-colors">
                    <div 
                      className="w-10 h-10 rounded shadow-sm border border-border" 
                      style={{ backgroundColor: secondaryColor }}
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => {
                         const val = e.target.value;
                         onUpdate('secondary_color', val);
                         if (val.length === 7 && val.startsWith('#')) {
                            onLocalUpdate({ secondaryColor: val });
                         }
                      }}
                      className="flex-1 bg-transparent border-none focus:ring-0 font-mono text-sm font-bold text-text-primary uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Display Mode */}
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-md border border-brand-primary/10">
                <Sun className="h-5 w-5" />
              </div>
              <h3 className="text-label font-semibold text-text-primary uppercase tracking-wider">Display Mode</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3 p-1 bg-app-surface rounded-md">
              {[
                { id: 'light', icon: Sun, label: 'Light' },
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'system', icon: Laptop, label: 'System' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onUpdate('display_mode', m.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-md transition-all ${
                    displayMode === m.id 
                    ? 'bg-app-bg shadow-sm ring-1 ring-border text-brand-primary' 
                    : 'text-text-secondary hover:bg-app-bg/50'
                  }`}
                >
                  <m.icon className="h-5 w-5 mb-1" />
                  <span className="text-caption font-bold uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="space-y-6">
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-md border border-brand-primary/10">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <h3 className="text-label font-semibold text-text-primary uppercase tracking-wider">Live Preview</h3>
              </div>
              <div className="px-2 py-0.5 bg-app-surface text-text-muted rounded text-caption font-bold uppercase">REAL-TIME</div>
            </div>

            <div className="space-y-8 p-6 bg-app-surface rounded-lg border border-border/50 shadow-inner">
              {/* Preview UI Components */}
              <div className="space-y-4">
                <div className="h-2 w-32 bg-border rounded-full" />
                <div className="h-2 w-48 bg-border/50 rounded-full" />
                
                <div className="flex gap-2">
                  <button 
                    className="px-6 py-2 rounded-md text-white font-semibold text-sm shadow-lg transition-transform active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ACTION
                  </button>
                  <div 
                    className="w-12 h-2 rounded-full self-center" 
                    style={{ backgroundColor: secondaryColor, opacity: 0.5 }}
                  />
                  <div 
                    className="w-12 h-2 rounded-full self-center" 
                    style={{ backgroundColor: secondaryColor, opacity: 0.2 }}
                  />
                </div>
              </div>

              {/* Mock Sidebar Item */}
              <div className="space-y-3">
                 <div className="h-10 w-full rounded-md flex items-center p-3 gap-3 transition-colors shadow-sm bg-app-bg ring-1 ring-border">
                    <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: primaryColor }} />
                    <div className="h-2 w-24 bg-border rounded-full" />
                    <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>3</div>
                 </div>
                 <div className="h-10 w-full rounded-md flex items-center p-3 gap-3">
                    <div className="w-5 h-5 rounded-sm bg-border/50" />
                    <div className="h-2 w-20 bg-border/30 rounded-full" />
                 </div>
              </div>
            </div>
            
            <p className="mt-6 text-[11px] text-slate-400 italic text-center">
              Changes reflect instantly in this preview. Click "SYNC IDENTITY" to apply globally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingTheme;
