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
          <h1 className="text-h2 font-bold text-text-primary tracking-tight">Application Access</h1>
          <p className="text-body-sm text-text-muted">Manage user credentials and security protocols</p>
        </div>

        <div className="relative group min-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted group-focus-within:text-brand-primary transition-colors" />
          <input
            type="text"
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary text-body-sm"
          />
        </div>
      </div>

      <div className="bg-app-surface rounded-lg border border-border overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-app-bg/50 border-b border-border text-left">
                <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">User Profile</th>
                <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">Identity</th>
                <th className="px-6 py-3 text-label font-bold text-text-muted uppercase tracking-widest">Synchronization</th>
                <th className="px-6 py-3 text-right text-label font-bold text-text-muted uppercase tracking-widest">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0 border-border hover:bg-app-bg/30 transition-colors group/row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-primary/5 text-brand-primary rounded flex items-center justify-center font-bold text-xs border border-brand-primary/10">
                          {record.employee_name ? record.employee_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-body-sm font-bold text-text-primary tracking-tight">{record.employee_name || 'System Principal'}</p>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">UID: {record.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-body-sm font-medium text-text-secondary">
                        <Mail className="h-3.5 w-3.5 text-text-muted" />
                        {record.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-body-sm font-semibold text-text-secondary">{new Date(record.updated_at).toLocaleDateString()}</p>
                        <p className="text-caption font-bold text-text-muted uppercase tracking-widest">{new Date(record.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 text-text-muted hover:text-brand-primary hover:bg-brand-primary/5 rounded border border-transparent hover:border-brand-primary/10 transition-all"
                      >
                        <Edit className="h-3.5 w-3.5" />
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
            <div className="p-8 border-b border-border flex items-center justify-between bg-app-surface">
              <div>
                <h3 className="text-h3 font-bold text-text-primary">Credential Control</h3>
                <p className="text-caption text-text-muted uppercase tracking-widest font-bold mt-1">IDENTITY MANAGEMENT</p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-2 hover:bg-app-bg rounded-md transition-all"
              >
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>
 
            <div className="p-8 space-y-6">
              <div className="space-y-2 group">
                <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-all">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full h-11 px-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary text-body-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 group">
                  <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-all">
                    <Key className="h-3.5 w-3.5" /> New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-11 px-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary text-body-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-brand-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] px-1 opacity-70">Leave blank to retain current</p>
                </div>
 
                <div className="space-y-2 group">
                  <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1 flex items-center gap-2 group-focus-within:text-brand-primary transition-all">
                    <Lock className="h-3.5 w-3.5" /> Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-11 px-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary text-body-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-brand-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-app-surface flex gap-3 border-t border-border">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 h-11 rounded font-bold text-text-secondary hover:bg-app-bg transition-all uppercase tracking-widest text-caption"
              >
                DISCARD
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] h-11 rounded bg-text-primary text-white font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-caption"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                SYNC CREDENTIALS
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-app-surface rounded border border-border group">
        <ShieldCheck className="h-4 w-4 text-brand-primary" />
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">
          Security Protocol Active • Real-time synchronization enabled • All access events logged
        </p>
      </div>
    </div>
  );
};

export default ApplicationAccess;
