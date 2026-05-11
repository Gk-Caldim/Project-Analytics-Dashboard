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

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/application-access/${id}`);
      await fetchUsersAndRoles();
      showNotification('User deleted successfully');
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
        <Loader2 className="h-8 w-8 animate-spin text-[#0004ab]" />
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">Syncing account directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#000000] tracking-tight">Application Access</h2>
          <p className="text-sm text-gray-500 mt-2">Manage user accounts, authentication profiles and system access levels.</p>
        </div>
        <button
          onClick={() => setShowRequestsDrawer(true)}
          className="h-11 px-6 bg-[#0004ab] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center gap-3 rounded-full relative"
        >
          {requests.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] shadow-lg">
              {requests.length}
            </span>
          )}
          Incoming Request
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Profile</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identity</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Level</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={`emp-${user.employee_id}`} className="hover:bg-gray-50/50 transition-colors rounded-full">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center text-[#0004ab] font-bold text-xs uppercase">
                        {(user.username || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#000000]">{user.username}</p>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-tight">{user.is_active ? 'Active Connection' : 'Inactive'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-[#0004ab] text-white text-[9px] font-bold tracking-widest uppercase border border-white/10 rounded-full">
                      {user.role || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-gray-400 font-medium">
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
                        className="text-gray-400 hover:text-[#0004ab] transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
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
        <div className="fixed inset-0 bg-[#0004ab]/80 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg border border-gray-200 flex flex-col shadow-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50 text-[#000000]">
               <h3 className="text-xl font-bold uppercase tracking-tight">
                 Manage Credentials
               </h3>
               <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-[#0004ab] w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                 <X className="h-6 w-6" />
               </button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium rounded-md"
                  placeholder="e.g. user@enterprise.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New Password (Leave blank to keep current)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium rounded-md"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0004ab]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {formData.password && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium rounded-md"
                    placeholder="••••••••"
                  />
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-12 font-bold text-gray-400 hover:text-[#0004ab] uppercase tracking-widest text-[10px] transition-all rounded-full"
              >
                Discard
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={saving}
                className="flex-[2] h-12 bg-[#0004ab] text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-30 transition-all rounded-full"
              >
                {saving ? 'Processing...' : 'Save Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Requests Drawer */}
      {showRequestsDrawer && (
        <div className="fixed inset-0 z-[300] bg-[#0004ab]/80 backdrop-blur-sm animate-in fade-in flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl animate-in slide-in-from-right flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-[#000000]">Incoming Requests</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Review and manage application access requests</p>
              </div>
              <button onClick={() => setShowRequestsDrawer(false)} className="text-gray-400 hover:text-[#0004ab] w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Shield className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className="border border-gray-200 rounded-xl p-6 hover:border-[#0004ab]/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-[#000000]">{req.name}</h4>
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold tracking-widest uppercase rounded-full">
                              {req.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{req.email}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                            Requested on {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          {req.is_employee_match ? (
                            <div className="flex items-center gap-1.5 text-[#166534] bg-[#f0fdf4] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              <Check className="h-3 w-3" /> Employee Match Verified
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1 text-right">
                              <div className="flex items-center gap-1.5 text-[#dc2626] bg-[#fef2f2] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                <X className="h-3 w-3" /> No Employee Match
                              </div>
                              <p className="text-[9px] text-gray-400 max-w-[180px] mt-1 leading-snug">
                                Name, email, and role must exactly match an existing employee master record before approval.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-4 py-2 border border-gray-200 text-gray-500 hover:text-[#dc2626] hover:border-[#dc2626] hover:bg-[#fef2f2] text-[10px] font-bold uppercase tracking-widest rounded-full transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              disabled={!req.is_employee_match}
                              className="px-6 py-2 bg-[#0004ab] text-white disabled:bg-gray-200 disabled:text-gray-400 text-[10px] font-bold uppercase tracking-widest rounded-full hover:opacity-90 transition-all"
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
    </div>
  );
};

export default ApplicationAccess;
