import React from 'react';
import { Sun, Moon, CheckCircle2 } from 'lucide-react';

const BrandingTheme = ({ settings, onUpdate, onLocalUpdate }) => {
  const displayMode = settings.find(s => s.key === 'display_mode')?.value || 'light';

  const ThemeCard = ({ mode, label, description, icon: Icon, colors }) => {
    const isActive = displayMode === mode;
    
    return (
      <button
        onClick={() => {
          onUpdate('display_mode', mode);
          if (onLocalUpdate) onLocalUpdate({ displayMode: mode });
        }}
        className={`group relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
          isActive 
            ? 'border-brand-accent bg-app-surface shadow-xl ring-4 ring-brand-accent/10' 
            : 'border-border bg-app-bg hover:border-border-strong hover:bg-app-surface'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 rounded-xl transition-colors duration-300 ${
            isActive ? 'bg-brand-accent text-white' : 'bg-app-panel text-text-muted group-hover:text-text-primary'
          }`}>
            <Icon size={24} />
          </div>
          {isActive && (
            <CheckCircle2 className="text-brand-accent" size={24} />
          )}
        </div>

        <div className="space-y-1 mb-8">
          <h3 className={`text-lg font-bold transition-colors duration-300 ${
            isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
          }`}>
            {label} Mode
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Visual Preview */}
        <div className="mt-auto space-y-3">
          <div className="flex gap-2">
            {colors.map((color, i) => (
              <div 
                key={i}
                className="w-8 h-8 rounded-lg border border-border/50 shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="h-2 w-full rounded-full bg-app-panel overflow-hidden">
            <div 
              className="h-full rounded-full bg-brand-accent transition-all duration-500"
              style={{ width: isActive ? '100%' : '30%' }}
            />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-4xl space-y-12 animate-fadeIn">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-text-primary tracking-tight">Visual Identity</h2>
        <p className="text-lg text-text-secondary max-w-2xl">
          Customize your workspace appearance. Switch between light and dark modes to optimize your analysis experience across different environments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ThemeCard 
          mode="light"
          label="Light"
          description="Clean, high-contrast interface designed for daylight environments and maximum readability."
          icon={Sun}
          colors={['#F8FAFC', '#FFFFFF', '#0F172A', '#1e293b']}
        />
        <ThemeCard 
          mode="dark"
          label="Dark"
          description="Premium petroleum aesthetic optimized for focused analysis and reduced eye strain."
          icon={Moon}
          colors={['#1E242B', '#2B353F', '#E6EAF0', '#16313E']}
        />
      </div>

      <div className="bg-brand-primary/5 border border-brand-primary/10 p-8 rounded-3xl flex items-start gap-6">
        <div className="p-3 bg-white dark:bg-white/5 rounded-2xl shadow-sm">
          <div className="w-6 h-6 rounded-full bg-brand-accent animate-pulse" />
        </div>
        <div className="space-y-2">
          <h4 className="font-bold text-text-primary">System-Wide Synchronization</h4>
          <p className="text-sm text-text-secondary leading-relaxed">
            Your theme preference is synchronized across all modules. Changing this setting will immediately update the interface for your current session and persist across future logins.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandingTheme;
