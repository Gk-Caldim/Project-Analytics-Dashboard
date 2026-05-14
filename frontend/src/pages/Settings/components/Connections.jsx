import React, { useState } from 'react';
import { Mail, Server, Key, Database, Wifi, ShieldCheck, Eye, EyeOff, RefreshCcw, Check, AlertCircle } from 'lucide-react';
import API from '../../../utils/api';

const Connections = ({ settings, onUpdate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const getValue = (key) => settings.find(s => s.key === key)?.value || '';

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await API.post('/email/test');
      setTestResult({ type: 'success', message: response.data.message });
    } catch (error) {
      setTestResult({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Connection failed. Please ensure you have synced your updates first.' 
      });
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">External Connections</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">Manage your third-party integrations, SMTP services, and bridge credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--surface)] border border-[var(--border-subtle)]/50 p-8 rounded-none space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">SMTP Configuration</h3>
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="h-10 px-6 border border-[var(--border-subtle)]/30 text-[var(--accent-hover)] font-bold text-[10px] tracking-widest uppercase hover:bg-[var(--bg)] transition-colors flex items-center gap-3 disabled:opacity-50 rounded-full"
            >
              {isTesting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              {isTesting ? 'Testing' : 'Test Bridge'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 border ${testResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
               <p className="text-[10px] font-bold uppercase tracking-wider">{testResult.message}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">SMTP Host</label>
              <input
                type="text"
                value={getValue('smtp_host')}
                onChange={(e) => onUpdate('smtp_host', e.target.value)}
                className="w-full h-12 px-5 border border-[var(--border-subtle)]/50 bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md transition-all"
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">SMTP Port</label>
              <input
                type="number"
                value={getValue('smtp_port')}
                onChange={(e) => onUpdate('smtp_port', e.target.value)}
                className="w-full h-12 px-5 border border-[var(--border-subtle)]/50 bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md transition-all"
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">SMTP Username</label>
              <input
                type="text"
                value={getValue('smtp_user')}
                onChange={(e) => onUpdate('smtp_user', e.target.value)}
                className="w-full h-12 px-5 border border-[var(--border-subtle)]/50 bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md transition-all"
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">SMTP Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={getValue('smtp_pass')}
                  onChange={(e) => onUpdate('smtp_pass', e.target.value)}
                  className="w-full h-12 px-5 border border-[var(--border-subtle)]/50 bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent-hover)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[var(--active-menu)]/10 border border-[var(--border-subtle)]/50 p-10 rounded-none text-[var(--text-primary)] space-y-6">
            <Database className="h-10 w-10 text-[var(--accent-hover)]" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-tight">External Analytics Node</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-widest leading-relaxed">
                Connect your institutional data lake for high-level cross-project comparisons and global industrial trend analysis.
              </p>
            </div>
            <button className="h-11 w-full bg-[var(--accent-hover)] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-all rounded-full">
               Establish Connection
            </button>
          </div>

          <div className="bg-[var(--elevated-card)] border border-[var(--border-subtle)]/50 p-8 rounded-none flex items-start gap-6">
            <div className="w-12 h-12 bg-[var(--bg)] border border-[var(--border-subtle)]/50 flex items-center justify-center shrink-0">
               <ShieldCheck className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <div className="space-y-1">
               <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">Encryption protocol</p>
               <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider leading-relaxed">
                  All external credentials are encrypted using AES-256 standard before being committed to the system vault.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
