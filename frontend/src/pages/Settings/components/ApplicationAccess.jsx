import React, { useState, useEffect } from 'react';
import {
  Shield, User, Mail, Plus, X, Trash2, Edit, Save, Loader2, Check, Lock, Eye, EyeOff
} from 'lucide-react';
import API from '../../../utils/api';

const ApplicationAccess = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: '',
    password: ''
  });

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        API.get('/auth/users/'),
        API.get('/roles/')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleCreateUser = async () => {
    if (!formData.username || !formData.email || !formData.role || !formData.password) {
      showNotification('Please fill all required fields', 'error');
      return;
    }
    try {
      setSaving(true);
      await API.post('/auth/register/', formData);
      await fetchUsersAndRoles();
      setShowAddModal(false);
      setFormData({ username: '', email: '', role: '', password: '' });
      showNotification('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await API.patch(`/auth/users/${selectedUser.id}/`, {
        role: formData.role
      });
      await fetchUsersAndRoles();
      setShowEditModal(false);
      showNotification('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/auth/users/${id}/`);
      await fetchUsersAndRoles();
      showNotification('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Failed to delete user', 'error');
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
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 border z-[300] animate-in fade-in slide-in-from-right-8 duration-300 ${notification.type === 'success' ? 'bg-[#0004ab] text-white border-white/10' : 'bg-red-600 text-white border-none'}`}>
          <p className="text-xs font-bold tracking-wider uppercase">{notification.message}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#0004ab] tracking-tight">Application Access</h2>
          <p className="text-sm text-gray-500 mt-2">Manage user accounts, authentication profiles and system access levels.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ username: '', email: '', role: '', password: '' });
            setShowAddModal(true);
          }}
          className="h-11 px-6 bg-[#0004ab] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center gap-3 rounded-full"
        >
          <Plus className="h-4 w-4" />
          Add Account
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
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors rounded-full">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex items-center justify-center text-[#0004ab] font-bold text-xs uppercase">
                        {user.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0004ab]">{user.username}</p>
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
                          setFormData({ role: user.role });
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

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-[#0004ab]/80 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg border border-gray-200 flex flex-col shadow-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50 text-[#0004ab]">
               <h3 className="text-xl font-bold uppercase tracking-tight">
                 {showAddModal ? 'New Account Profile' : 'Modify Access Level'}
               </h3>
               <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-gray-400 hover:text-[#0004ab] w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
                 <X className="h-6 w-6" />
               </button>
            </div>
            
            <div className="p-8 space-y-8">
              {showAddModal && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium rounded-md"
                      placeholder="e.g. john_doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium rounded-md"
                      placeholder="john@enterprise.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Level (Role)</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium appearance-none rounded-md"
                    >
                      <option value="">Select Role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Password</label>
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
                </>
              )}

              {showEditModal && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Access Level for {selectedUser?.username}</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0004ab] outline-none text-sm font-medium appearance-none rounded-md"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="flex-1 h-12 font-bold text-gray-400 hover:text-[#0004ab] uppercase tracking-widest text-[10px] transition-all rounded-full"
              >
                Discard
              </button>
              <button
                onClick={showAddModal ? handleCreateUser : handleUpdateUser}
                disabled={saving}
                className="flex-[2] h-12 bg-[#0004ab] text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-30 transition-all rounded-full"
              >
                {saving ? 'Processing...' : (showAddModal ? 'Register Profile' : 'Save Alignment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationAccess;
