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
      // Note: We test with what's in the database. 
      // To test current unsaved changes, we would need to pass them to the backend.
      // But usually, users sync first, then test. 
      // Or we can add a 'save and test' logic. 
      // Let's stick to testing what's in the DB for now as per the API I wrote.
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
    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h2 font-semibold text-text-primary tracking-tight">External Connections</h2>
          <p className="text-caption text-text-secondary font-bold uppercase tracking-wider mt-1">Manage your third-party integrations and service credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* SMTP Configuration Card */}
          <div className="bg-app-bg p-6 rounded-lg border border-border shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/5 text-brand-primary rounded-md shadow-sm border border-brand-primary/10">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-body-sm tracking-wide uppercase">SMTP Configuration</h3>
                  <p className="text-caption text-text-muted font-bold uppercase tracking-wider mt-0.5">Email delivery service settings</p>
                </div>
              </div>
              
              <button
                onClick={testConnection}
                disabled={isTesting}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm font-semibold text-caption tracking-widest uppercase transition-all shadow-sm ${
                  isTesting 
                    ? 'bg-app-surface text-text-muted' 
                    : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border border-brand-primary/10'
                }`}
              >
                {isTesting ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-md flex items-center gap-3 animate-in zoom-in-95 duration-300 border ${
                testResult.type === 'success' ? 'bg-status-success/5 text-status-success border-status-success/20' : 'bg-status-error/5 text-status-error border-status-error/20'
              }`}>
                {testResult.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <p className="text-caption font-bold tracking-wider uppercase">{testResult.message}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group md:col-span-1">
                <label className="block text-label font-semibold text-text-primary uppercase tracking-wider mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  SMTP Host
                </label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={getValue('smtp_host')}
                    onChange={(e) => onUpdate('smtp_host', e.target.value)}
                    className="w-full h-11 pl-12 pr-4 bg-app-surface border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary focus:bg-app-bg transition-all font-medium text-text-primary shadow-sm"
                    placeholder="smtp.gmail.com"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-label font-semibold text-text-primary uppercase tracking-wider mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  SMTP Port
                </label>
                <div className="relative">
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="number"
                    value={getValue('smtp_port')}
                    onChange={(e) => onUpdate('smtp_port', e.target.value)}
                    className="w-full h-11 pl-12 pr-4 bg-app-surface border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary focus:bg-app-bg transition-all font-medium text-text-primary shadow-sm"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-label font-semibold text-text-primary uppercase tracking-wider mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  SMTP Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    value={getValue('smtp_user')}
                    onChange={(e) => onUpdate('smtp_user', e.target.value)}
                    className="w-full h-11 pl-12 pr-4 bg-app-surface border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary focus:bg-app-bg transition-all font-medium text-text-primary shadow-sm"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-label font-semibold text-text-primary uppercase tracking-wider mb-2 px-1 transition-colors group-focus-within:text-brand-primary">
                  SMTP Password
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={getValue('smtp_pass')}
                    onChange={(e) => onUpdate('smtp_pass', e.target.value)}
                    className="w-full h-11 pl-12 pr-12 bg-app-surface border border-border rounded-sm focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary focus:bg-app-bg transition-all font-medium text-text-primary shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-app-surface rounded-md transition-colors text-text-muted hover:text-brand-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-app-surface rounded-lg border border-border flex items-start gap-4">
              <div className="p-2 bg-app-bg rounded-md shadow-sm border border-border text-text-muted">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-caption font-bold text-text-primary uppercase tracking-widest">Security Notice</h4>
                <p className="text-caption text-text-muted font-medium leading-relaxed uppercase tracking-wider">
                  Credentials are encrypted before storage. Ensure your SMTP provider allows third-party application access.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-brand-primary p-6 rounded-lg text-white shadow-lg shadow-brand-primary/20 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Wifi className="h-48 w-48" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-md flex items-center justify-center border border-white/20">
                <Wifi className="h-6 w-6" />
              </div>
              
              <div>
                <h3 className="text-h3 font-semibold tracking-tight leading-tight">Connection Hub</h3>
                <p className="text-white/60 text-caption font-bold uppercase tracking-widest mt-2">Active Integrations</p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-md border border-white/10">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 opacity-60" />
                    <span className="text-caption font-bold tracking-widest uppercase">SMTP Relay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-300">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-app-bg p-4 rounded-lg border border-border space-y-4 shadow-sm">
            <h4 className="text-label font-semibold text-text-muted uppercase tracking-wider px-1">Knowledge Base</h4>
            <div className="space-y-1">
              <button className="w-full text-left p-3 hover:bg-app-surface rounded-md transition-all group">
                <p className="text-body-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">SMTP with Gmail</p>
                <p className="text-caption text-text-muted mt-0.5 font-medium">How to use app passwords</p>
              </button>
              <button className="w-full text-left p-3 hover:bg-app-surface rounded-md transition-all group">
                <p className="text-body-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">TLS vs SSL</p>
                <p className="text-caption text-text-muted mt-0.5 font-medium">Port selection guide</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
