import React, { useState } from 'react';
import { Sun, Moon, CheckCircle2, Loader2 } from 'lucide-react';
import API from '../../../utils/api';
import { toast } from 'sonner';

const BrandingTheme = ({ settings, onSaveSuccess, onLocalUpdate }) => {
  const [localEdits, setLocalEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const activeMode = localEdits.display_mode !== undefined 
    ? localEdits.display_mode 
    : (settings.find(s => s.key === 'display_mode')?.value || 'light');

  const hasChanges = Object.keys(localEdits).length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const originalSetting = settings.find(s => s.key === 'display_mode');
      await API.patch('/settings/bulk', {
        settings: [{
          key: 'display_mode',
          value: localEdits.display_mode,
          category: originalSetting?.category || 'Branding',
          type: originalSetting?.type || 'text'
        }]
      });
      setLocalEdits({});
      toast.success('Visual theme saved successfully');
      if (onSaveSuccess) await onSaveSuccess();
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocalEdits({});
    const originalMode = settings.find(s => s.key === 'display_mode')?.value || 'light';
    if (onLocalUpdate) onLocalUpdate({ displayMode: originalMode });
    toast.success('Changes discarded');
  };

  const ThemeCard = ({ mode, label, description, icon: Icon, colors }) => {
    const isActive = activeMode === mode;

    return (
      <button
        onClick={() => {
          setLocalEdits({ display_mode: mode });
          if (onLocalUpdate) onLocalUpdate({ displayMode: mode });
        }}
        className={`group relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 text-left ${isActive
          ? 'border-brand-accent bg-app-surface shadow-xl ring-4 ring-brand-accent/10'
          : 'border-border bg-app-bg hover:border-border-strong hover:bg-app-surface'
          }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 rounded-xl transition-colors duration-300 ${isActive ? 'bg-brand-accent text-white' : 'bg-app-panel text-text-muted group-hover:text-text-primary'
            }`}>
            <Icon size={24} />
          </div>
          {isActive && (
            <CheckCircle2 className="text-brand-accent" size={24} />
          )}
        </div>

        <div className="space-y-1 mb-8">
          <h3 className={`text-lg font-bold transition-colors duration-300 ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
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
    <div className="max-w-4xl space-y-12 animate-fadeIn relative">
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

      {/* Floating Save/Discard Panel */}
      {hasChanges && (
        <div className="fixed bottom-6 left-[240px] right-6 flex justify-center z-50 animate-slideInUp">
          <div className="bg-app-surface/95 dark:bg-slate-900/95 backdrop-blur-md border border-border-strong/30 shadow-2xl px-6 py-4 flex items-center justify-between gap-12 max-w-3xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              <div>
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Unsaved Changes</span>
                <p className="text-[10px] text-text-muted mt-0.5">You have modified the workspace theme preferences.</p>
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

export default BrandingTheme;
