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
        <h2 className="text-3xl font-bold text-[#0E1B2E] tracking-tight">External Connections</h2>
        <p className="text-sm text-gray-500 mt-2">Manage your third-party integrations, SMTP services, and bridge credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 p-8 rounded-none space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">SMTP Configuration</h3>
            <button
              onClick={testConnection}
              disabled={isTesting}
              className="h-10 px-6 border border-gray-100 text-[#0E1B2E] font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50 rounded-full"
            >
              {isTesting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              {isTesting ? 'Testing' : 'Test Bridge'}
            </button>
          </div>

          {testResult && (
            <div className={`p-4 border ${testResult.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
               <p className="text-[10px] font-bold uppercase tracking-wider">{testResult.message}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SMTP Host</label>
              <input
                type="text"
                value={getValue('smtp_host')}
                onChange={(e) => onUpdate('smtp_host', e.target.value)}
                className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium rounded-md"
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SMTP Port</label>
              <input
                type="number"
                value={getValue('smtp_port')}
                onChange={(e) => onUpdate('smtp_port', e.target.value)}
                className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium rounded-md"
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SMTP Username</label>
              <input
                type="text"
                value={getValue('smtp_user')}
                onChange={(e) => onUpdate('smtp_user', e.target.value)}
                className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium rounded-md"
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SMTP Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={getValue('smtp_pass')}
                  onChange={(e) => onUpdate('smtp_pass', e.target.value)}
                  className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium rounded-md"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E1B2E]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#0E1B2E] border border-[#1a2e4a] p-10 rounded-none text-white space-y-6">
            <Database className="h-10 w-10 opacity-20" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-tight">External Analytics Node</h3>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest leading-relaxed">
                Connect your institutional data lake for high-level cross-project comparisons and global industrial trend analysis.
              </p>
            </div>
            <button className="h-11 w-full bg-white text-[#0E1B2E] font-bold text-[10px] tracking-widest uppercase hover:bg-gray-100 transition-colors rounded-full">
               Establish Connection
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-8 rounded-none flex items-start gap-6">
            <div className="w-12 h-12 bg-white border border-gray-200 flex items-center justify-center shrink-0">
               <ShieldCheck className="h-6 w-6 text-gray-300" />
            </div>
            <div className="space-y-1">
               <p className="text-xs font-bold text-[#0E1B2E] uppercase tracking-tight">Encryption protocol</p>
               <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-relaxed">
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
