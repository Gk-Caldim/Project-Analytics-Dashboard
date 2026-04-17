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
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-text-secondary text-caption font-bold tracking-widest uppercase animate-pulse">Loading application access logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-3 rounded-lg shadow-xl z-[100] animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 ${notification.type === 'success' ? 'bg-text-primary text-white' : 'bg-status-error text-white'
          }`}>
          {notification.type === 'success' ? <Check className="h-5 w-5 text-brand-primary" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-caption font-bold tracking-widest uppercase">{notification.message}</span>
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

      <div className="bg-app-bg rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-app-surface">
                <th className="px-8 py-4 text-left text-label font-semibold text-text-muted uppercase tracking-wider border-b border-border">User Details</th>
                <th className="px-8 py-4 text-left text-label font-semibold text-text-muted uppercase tracking-wider border-b border-border">Email Address</th>
                <th className="px-8 py-4 text-left text-label font-semibold text-text-muted uppercase tracking-wider border-b border-border">Last Synced</th>
                <th className="px-8 py-4 text-right text-label font-semibold text-text-muted uppercase tracking-wider border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-app-surface transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-brand-primary/5 text-brand-primary rounded-md flex items-center justify-center font-bold text-sm shadow-sm border border-brand-primary/10">
                          {record.employee_name ? record.employee_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-body-sm font-semibold text-text-primary tracking-tight">{record.employee_name || 'System User'}</p>
                          <p className="text-caption font-medium text-text-muted uppercase tracking-wider mt-0.5">ID: {record.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-body-sm font-medium text-text-secondary">
                        <Mail className="h-4 w-4 text-text-muted" />
                        {record.email}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-caption font-medium text-text-muted uppercase tracking-wider">
                        {new Date(record.updated_at).toLocaleDateString()}
                        <span className="text-border mx-2">•</span>
                        {new Date(record.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 text-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded-md transition-all"
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
                      <ShieldCheck className="h-10 w-10 text-border" />
                      <p className="text-text-muted font-bold text-caption tracking-widest uppercase">No access records found</p>
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
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-app-bg rounded-lg w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-8 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-h2 font-semibold text-text-primary tracking-tight">Credential Control</h3>
                <p className="text-text-muted text-caption font-bold uppercase tracking-widest mt-1">SECURITY LAYER ACTIVATED</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 hover:bg-app-surface rounded-md transition-colors group"
              >
                <X className="h-5 w-5 text-text-muted group-hover:text-status-error transition-colors" />
              </button>
            </div>
 
            <div className="p-8 space-y-6">
              <div className="space-y-2 group">
                <label className="text-label font-medium text-text-secondary uppercase tracking-wider px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full h-11 px-4 rounded-sm border border-border bg-app-bg focus:border-brand-primary outline-none transition-all font-medium text-text-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 group">
                  <label className="text-label font-medium text-text-secondary uppercase tracking-wider px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-colors">
                    <Key className="h-3.5 w-3.5" /> New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-11 px-4 rounded-sm border border-border bg-app-bg focus:border-brand-primary outline-none transition-all font-medium text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-brand-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest px-1">Leave blank to keep current password</p>
                </div>
 
                <div className="space-y-2 group">
                  <label className="text-label font-medium text-text-secondary uppercase tracking-wider px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-colors">
                    <Lock className="h-3.5 w-3.5" /> Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-11 px-4 rounded-sm border border-border bg-app-bg focus:border-brand-primary outline-none transition-all font-medium text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-brand-primary transition-colors"
                    >
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-app-surface flex gap-3 border-t border-border">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 h-11 rounded-sm font-semibold text-text-secondary hover:bg-app-panel transition-all uppercase tracking-widest text-caption"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-2 flex-[2] h-11 rounded-sm bg-brand-primary text-white font-semibold shadow-lg shadow-brand-primary/10 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-caption"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
        <ShieldCheck className="h-5 w-5 text-brand-primary" />
        <p className="text-caption font-bold text-brand-primary/80 uppercase tracking-widest">
          SECURITY PROTOCOL ENFORCED • ALL CHANGES ARE LOGGED FOR AUDIT PURPOSES
        </p>
      </div>
    </div>
  );
};

export default ApplicationAccess;
