import React, { useState, useEffect } from 'react';
import {
  Shield, User, Mail, Plus, X, Trash2, Edit, Save, Loader2, Check, Lock, Eye, EyeOff
} from 'lucide-react';
import API from '../../../utils/api';
import { toast } from 'react-hot-toast';

const ApplicationAccess = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUsersAndRoles(true);
  }, []);

  const fetchUsersAndRoles = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [usersRes, rolesRes, reqRes] = await Promise.all([
        API.get('/application-access'),
        API.get('/roles/'),
        API.get('/auth/access-requests')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setRequests(reqRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (formData.password && formData.password !== formData.confirm_password) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = { email: formData.email, employee_id: selectedUser.employee_id };
      if (formData.password) {
        payload.password = formData.password;
        payload.confirm_password = formData.confirm_password;
      }
      
      if (selectedUser.is_active) {
        await API.patch(`/application-access/${selectedUser.id}`, payload);
      } else {
        await API.post(`/application-access`, payload);
      }
      await fetchUsersAndRoles();
      setShowEditModal(false);
      showNotification(selectedUser.is_active ? 'Credentials updated successfully' : 'Access granted successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification(error.response?.data?.detail || 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await API.delete(`/application-access/${userToDelete.id}`);
      await fetchUsersAndRoles();
      showNotification('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await API.post(`/auth/access-requests/${id}/approve`);
      await fetchUsersAndRoles();
      showNotification('Request approved successfully');
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Failed to approve request', 'error');
      await fetchUsersAndRoles();
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await API.post(`/auth/access-requests/${id}/reject`);
      await fetchUsersAndRoles();
      showNotification('Request rejected successfully');
    } catch (error) {
      showNotification(error.response?.data?.detail || 'Failed to reject request', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-hover)]" />
        <p className="text-[var(--text-muted)] text-xs font-bold tracking-widest uppercase">Syncing account directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Application Access</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Manage user accounts, authentication profiles and system access levels.</p>
        </div>
        <button
          onClick={() => setShowRequestsDrawer(true)}
          className="h-11 px-6 bg-[var(--accent-hover)] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center gap-3 rounded-full relative"
        >
          {requests.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] shadow-lg">
              {requests.length}
            </span>
          )}
          Incoming Request
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border-subtle)]/50 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--elevated-card)] border-b border-[var(--border-subtle)]/50">
                <th className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">User Profile</th>
                <th className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Identity</th>
                <th className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Security Level</th>
                <th className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Joined</th>
                <th className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/20">
              {users.map((user) => (
                <tr key={`emp-${user.employee_id}`} className="hover:bg-[var(--bg)] transition-colors rounded-full">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[var(--bg)] border border-[var(--border-subtle)]/50 flex items-center justify-center text-[var(--accent-hover)] font-bold text-xs uppercase">
                        {(user.username || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{user.username}</p>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-tight">{user.is_active ? 'Active Connection' : 'Inactive'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-[var(--text-secondary)] font-medium">{user.email}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-[var(--accent-hover)] text-white text-[9px] font-bold tracking-widest uppercase border border-white/10 rounded-full">
                      {user.role || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      {new Date(user.date_joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({ email: user.email, password: '', confirm_password: '' });
                          setShowEditModal(true);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-hover)] transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(user)}
                        className="text-[var(--text-muted)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && (
        <div className="app-modal-overlay z-[250]">
          <div className="app-modal-container max-w-lg w-full mx-4">
            <div className="app-modal-header bg-[var(--elevated-card)] text-[var(--text-primary)]">
               <h3 className="app-modal-title">
                 Manage Credentials
               </h3>
               <button onClick={() => setShowEditModal(false)} className="app-modal-close-btn">
                 <X className="h-5 w-5" />
               </button>
            </div>
            
            <div className="app-modal-body space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-12 px-5 border border-[var(--border-subtle)] bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md"
                  placeholder="e.g. user@enterprise.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">New Password (Leave blank to keep current)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-12 px-5 border border-[var(--border-subtle)]/50 bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md"
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
              {formData.password && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full h-12 px-5 border border-[var(--border-subtle)] bg-[var(--bg)] focus:border-[var(--accent-hover)] outline-none text-sm font-medium text-[var(--text-primary)] rounded-md"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <div className="app-modal-footer bg-[var(--elevated-card)] border-t border-[var(--border-subtle)]/30 flex gap-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-12 font-bold text-[var(--text-muted)] hover:text-[var(--accent-hover)] uppercase tracking-widest text-[10px] transition-all rounded-full"
              >
                Discard
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={saving}
                className="flex-[2] h-12 bg-[var(--accent-hover)] text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-30 transition-all rounded-full"
              >
                {saving ? 'Processing...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Requests Drawer */}
      {showRequestsDrawer && (
        <div className="app-modal-overlay z-[300] justify-end p-0 items-stretch">
          <div className="bg-[var(--surface)] w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right flex flex-col border-l border-[var(--border-subtle)]/30">
            <div className="p-8 border-b border-[var(--border-subtle)]/30 flex items-center justify-between bg-[var(--elevated-card)]">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-[var(--text-primary)]">Incoming Requests</h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Review and manage application access requests</p>
              </div>
              <button onClick={() => setShowRequestsDrawer(false)} className="text-[var(--text-muted)] hover:text-[var(--accent-hover)] w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--bg)]">
                <X className="h-6 w-6" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-[var(--surface)] scrollbar-hide">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                  <Shield className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className="border border-[var(--border-subtle)]/50 rounded-xl p-6 hover:border-[var(--accent-hover)]/30 transition-colors bg-[var(--bg)]/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-[var(--text-primary)]">{req.name}</h4>
                            <span className="px-2.5 py-0.5 bg-[var(--bg)] text-[var(--text-muted)] text-[9px] font-bold tracking-widest uppercase rounded-full border border-[var(--border-subtle)]/30">
                               {req.role}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">{req.email}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-4">
                            Requested on {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          {req.is_employee_match ? (
                            <div className="flex items-center gap-1.5 text-[#166534] bg-[#f0fdf4] dark:bg-[#064e3b]/20 dark:text-[#4ade80] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              <Check className="h-3 w-3" /> Employee Match Verified
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1 text-right">
                              <div className="flex items-center gap-1.5 text-[#dc2626] bg-[#fef2f2] dark:bg-[#450a0a]/20 dark:text-[#f87171] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                <X className="h-3 w-3" /> No Employee Match
                              </div>
                              <p className="text-[9px] text-[var(--text-muted)] max-w-[180px] mt-1 leading-snug">
                                Name, email, and role must exactly match an existing employee master record before approval.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-4 py-2 border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-600/50 hover:bg-red-600/5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              disabled={!req.is_employee_match}
                              className="px-6 py-2 bg-[var(--accent-hover)] text-white disabled:bg-[var(--bg)] disabled:text-[var(--text-muted)]/30 text-[10px] font-bold uppercase tracking-widest rounded-full hover:opacity-90 transition-all"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="app-modal-overlay z-[350]">
          <div className="app-modal-container max-w-sm w-full mx-4 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-6 rounded-full border border-red-500/20">
              <Trash2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 uppercase tracking-tight">Delete User Access?</h3>
            <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-widest leading-relaxed">
               The user <span className="text-red-600 font-bold">"{userToDelete?.username}"</span> will be permanently removed.
            </p>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="flex-1 h-11 font-bold text-[var(--text-muted)] hover:text-[var(--accent-hover)] hover:bg-[var(--bg)] uppercase tracking-widest text-[10px] rounded-full transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteUser}
                className="flex-[2] h-11 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-red-700 transition-all"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationAccess;
