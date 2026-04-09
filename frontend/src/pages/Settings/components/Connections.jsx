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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">External Connections</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your third-party integrations and service credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* SMTP Configuration Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-8 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/20">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm tracking-widest uppercase">SMTP Configuration</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Email delivery service settings</p>
                </div>
              </div>
              
              <button
                onClick={testConnection}
                disabled={isTesting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all ${
                  isTesting 
                    ? 'bg-slate-100 text-slate-400' 
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100'
                }`}
              >
                {isTesting ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                testResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {testResult.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <p className="text-xs font-bold tracking-tight">{testResult.message}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  SMTP Host
                </label>
                <div className="relative">
                  <Server className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={getValue('smtp_host')}
                    onChange={(e) => onUpdate('smtp_host', e.target.value)}
                    className="w-full h-14 pl-12 pr-6 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                    placeholder="smtp.gmail.com"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  SMTP Port
                </label>
                <div className="relative">
                  <Database className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    value={getValue('smtp_port')}
                    onChange={(e) => onUpdate('smtp_port', e.target.value)}
                    className="w-full h-14 pl-12 pr-6 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  SMTP Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={getValue('smtp_user')}
                    onChange={(e) => onUpdate('smtp_user', e.target.value)}
                    className="w-full h-14 pl-12 pr-6 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              <div className="group md:col-span-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 transition-colors group-focus-within:text-indigo-500">
                  SMTP Password
                </label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={getValue('smtp_pass')}
                    onChange={(e) => onUpdate('smtp_pass', e.target.value)}
                    className="w-full h-14 pl-12 pr-12 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 focus:bg-white transition-all font-bold text-slate-700 shadow-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Security Notice</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Credentials are encrypted before storage and used solely for system-generated notifications and reports. Ensure your SMTP provider allows third-party application access.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Wifi className="h-48 w-48" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <Wifi className="h-6 w-6" />
              </div>
              
              <div>
                <h3 className="text-xl font-black tracking-tight leading-tight">Connection Hub</h3>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">Active Integrations</p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 opacity-60" />
                    <span className="text-xs font-black tracking-widest uppercase">SMTP Relay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-emerald-300">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Knowledge Base</h4>
            <div className="space-y-1">
              <button className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-all group">
                <p className="text-[12px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">SMTP with Gmail</p>
                <p className="text-[10px] text-slate-400 mt-0.5">How to use app passwords</p>
              </button>
              <button className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-all group">
                <p className="text-[12px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">TLS vs SSL</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Port selection guide</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
