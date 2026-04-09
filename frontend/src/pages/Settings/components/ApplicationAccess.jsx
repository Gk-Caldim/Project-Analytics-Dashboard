import React, { useState, useEffect } from 'react';
import {
  Users, Key, Search, Edit, Trash2, X, Check, Save,
  AlertCircle, Loader2, ShieldCheck, Mail, Lock, User, Eye, EyeOff
} from 'lucide-react';
import API from '../../../utils/api';

const ApplicationAccess = () => {
  const [accessRecords, setAccessRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Edit Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchAccessRecords();
  }, []);

  const fetchAccessRecords = async () => {
    try {
      setLoading(true);
      const response = await API.get('/application-access');
      setAccessRecords(response.data);
    } catch (error) {
      console.error('Error fetching access records:', error);
      showNotification('Failed to load application access data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      email: record.email,
      password: '',
      confirm_password: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSave = async () => {
    if (!formData.email) {
      showNotification('Email is required', 'error');
      return;
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const response = await API.patch(`/application-access/${editingRecord.id}`, formData);
      setAccessRecords(prev => prev.map(r => r.id === editingRecord.id ? response.data : r));
      setEditingRecord(null);
      showNotification('Application access updated successfully');
    } catch (error) {
      console.error('Error updating access:', error);
      const detail = error.response?.data?.detail || 'Failed to update access';
      showNotification(detail, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = accessRecords.filter(record =>
    record.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.employee_name && record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium tracking-wide">Loading application access logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 ${notification.type === 'success' ? 'bg-[#1E293B] text-white' : 'bg-red-600 text-white'
          }`}>
          {notification.type === 'success' ? <Check className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-[11px] font-black tracking-[0.2em] uppercase">{notification.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h2 className="text-3xl font-bold text-[#1E293B] tracking-tight">Application Access</h2>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[350px] h-12 pl-12 pr-6 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/50 outline-none transition-all font-medium text-slate-700"
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">User Details</th>
                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Email Address</th>
                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Last Synced</th>
                <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                          {record.employee_name ? record.employee_name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1E293B]">{record.employee_name || 'System User'}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: {record.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Mail className="h-4 w-4 text-slate-300" />
                        {record.email}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(record.updated_at).toLocaleDateString()}
                        <span className="text-slate-300 mx-2">•</span>
                        {new Date(record.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShieldCheck className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">No access records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-[#1E293B]">Credential Control</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">SECURITY LAYER ACTIVATED</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors group"
              >
                <X className="h-6 w-6 text-slate-400 group-hover:text-red-500 transition-colors" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full h-16 px-8 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-slate-700 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <Key className="h-3 w-3" /> New Password
                  </label>
                  <div className="relative group/pass">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-16 px-8 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-slate-700 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-2">Leave blank to keep current password</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                    <Lock className="h-3 w-3" /> Confirm Password
                  </label>
                  <div className="relative group/pass-confirm">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-16 px-8 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-slate-700 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/80 flex gap-4">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 h-16 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-2 flex-[2] h-16 rounded-2xl bg-[#1E3A8A] text-white font-bold shadow-xl shadow-indigo-100 hover:bg-[#1e2e6b] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
        <ShieldCheck className="h-5 w-5 text-indigo-600" />
        <p className="text-xs font-bold text-indigo-900/60 uppercase tracking-widest">
          SECURITY PROTOCOL ENFORCED • ALL CHANGES ARE LOGGED FOR AUDIT PURPOSES
        </p>
      </div>
    </div>
  );
};

export default ApplicationAccess;
