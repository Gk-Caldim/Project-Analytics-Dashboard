import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshUserProfile } from '../../../store/slices/authSlice';
import {
  Shield, UserCheck, Lock, ChevronRight, CheckCircle2, Circle, Search, Plus, Boxes, LayoutDashboard,
  FileText, Settings, Users, ClipboardList, Briefcase, FileSearch, HelpCircle, Key, Activity,
  Info, AlertCircle, Save, X, ToggleLeft, ToggleRight, Trash2, Loader2
} from 'lucide-react';
import API from '../../../utils/api';

const ROLE_ORDER = {
  'Super Admin': 1,
  'Admin': 2,
  'Project Manager': 3,
  'Team Lead': 4,
  'Employee': 5
};

const AccessControl = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Show notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const permissionsGroups = [
    {
      id: 'core',
      label: 'CORE MODULES',
      permissions: [
        { name: 'Dashboard', description: 'Access to real-time analytics and KPIs', tags: ['VIEW'] },
        { name: 'MOM', description: 'Minutes of Meeting management', tags: ['CREATE', 'VIEW'] },
      ]
    },
  {
      id: 'masters',
      label: 'MASTER DATA',
      permissions: [
        {
          name: 'Employee Master',
          description: 'Global staff records and role assignments',
          tags: ['MANAGE'],
          subPermissions: [
            { id: 'ADD', label: 'Add Employee' },
            { id: 'EDIT', label: 'Edit Employee' },
            { id: 'DELETE', label: 'Delete Employee' },
            { id: 'CUSTOM_COLUMNS', label: 'Add Custom Columns' }
          ]
        },
        {
          name: 'Project Master',
          description: 'Project lifecycle and resource tracking',
          tags: ['MANAGE'],
          subPermissions: [
            { id: 'ADD', label: 'Add Project' },
            { id: 'EDIT', label: 'Edit Project' },
            { id: 'DELETE', label: 'Delete Project' },
            { id: 'CUSTOM_COLUMNS', label: 'Add Custom Columns' },
            { id: 'VIEW-SUBCATEGORY', label: 'View Subcategory' },
            { id: 'EDIT-SUBCATEGORY', label: 'Edit Subcategory' },
            { id: 'DELETE-SUBCATEGORY', label: 'Delete Subcategory' }
          ]
        },
      ]
    },
    {
      id: 'utilities',
      label: 'UTILITIES & TOOLS',
      permissions: [
        {
          name: 'Upload Trackers',
          description: 'Bulk data upload and tracking systems',
          tags: ['UPLOAD', 'VIEW', 'DELETE'],
          subPermissions: [
            { id: 'upload_tracker', label: 'Upload' },
            { id: 'view_tracker', label: 'View' },
            { id: 'delete_tracker', label: 'Delete' }
          ]
        },
        {
          name: 'Budget Upload',
          description: 'Financial forecasting and budget management',
          tags: ['UPLOAD', 'VIEW', 'DELETE'],
          subPermissions: [
            { id: 'upload_budget', label: 'Upload' },
            { id: 'view_budget', label: 'View' },
            { id: 'delete_budget', label: 'Delete' }
          ]
        },
        { name: 'Settings', description: 'System-wide configuration and security', tags: ['ADMIN'], special: true },
      ]
    }
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const sortRoles = (rolesList) => {
    return [...rolesList].sort((a, b) => {
      const orderA = ROLE_ORDER[a.name] || 999;
      const orderB = ROLE_ORDER[b.name] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // For roles with the same priority (mostly custom roles), sort alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await API.get('/roles/');
      const sortedRoles = sortRoles(response.data);
      setRoles(sortedRoles);

      if (sortedRoles.length > 0 && !selectedRole) {
        setSelectedRole(sortedRoles[0]);
      } else if (selectedRole) {
        const updated = sortedRoles.find(r => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (moduleName, subPermId = null) => {
    if (!selectedRole) return;

    let currentPermissions = selectedRole.permissions || [];
    let updatedPermissions;

    // Find the module object to know its sub-permissions
    const moduleObj = permissionsGroups.flatMap(g => g.permissions).find(p => p.name === moduleName);
    const moduleSubPermIds = moduleObj?.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${moduleName}:${sp.id}`) || [];

    if (subPermId) {
      // Toggle a specific sub-permission
      const fullSubPerm = subPermId.includes('_') ? subPermId : `${moduleName}:${subPermId}`;
      updatedPermissions = currentPermissions.includes(fullSubPerm)
        ? currentPermissions.filter(p => p !== fullSubPerm)
        : [...currentPermissions, fullSubPerm];
    } else {
      // Toggle the main module
      const isEnabled = currentPermissions.includes(moduleName);
      if (isEnabled) {
        // Disable main module AND its specific sub-permissions ONLY
        updatedPermissions = currentPermissions.filter(p =>
          p !== moduleName && !moduleSubPermIds.includes(p)
        );
      } else {
        // Enable main module AND all its sub-permissions by default
        updatedPermissions = [...new Set([...currentPermissions, moduleName, ...moduleSubPermIds])];
      }
    }

    setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPermissions } : r));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      await API.patch(`/roles/${selectedRole.id}`, {
        permissions: selectedRole.permissions
      });
      
      // Auto-reflect: Refresh the user's profile if the updated role is the current user's role
      if (selectedRole.name === currentUser?.role) {
        await dispatch(refreshUserProfile());
      }
      
      showNotification('Permissions updated successfully!');
    } catch (error) {
      console.error('Error saving role changes:', error);
      showNotification('Failed to update permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      setSaving(true);
      const response = await API.post('/roles/', {
        name: newRoleName,
        description: newRoleDescription,
        permissions: newRolePermissions
      });
      const updatedRoles = sortRoles([...roles, response.data]);
      setRoles(updatedRoles);
      setSelectedRole(response.data);
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePermissions([]);
      showNotification(`Role "${response.data.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Failed to create custom role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setSaving(true);
      await API.delete(`/roles/${roleToDelete.id}`);
      const updatedRoles = roles.filter(r => r.id !== roleToDelete.id);
      setRoles(updatedRoles);
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(updatedRoles.length > 0 ? updatedRoles[0] : null);
      }
      setShowDeleteModal(false);
      setRoleToDelete(null);
      showNotification(`Role deleted successfully!`);
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('Failed to delete role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button
      onClick={() => !disabled && onChange && onChange(!enabled)}
      type="button"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-opacity-75 ${enabled ? 'bg-[#1E3A8A]' : 'bg-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">Toggle permission</span>
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
        <p className="text-slate-500 font-medium">Loading synchronization layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Notification Banner */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 border ${notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : 'bg-red-50 border-red-100 text-red-800'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
          <p className="text-sm font-bold">{notification.message}</p>
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 opacity-50" />
          </button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-3xl font-bold text-[#1E293B]">Access Control</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Available Roles */}
        <div className="xl:col-span-3 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Available Roles</h3>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{roles.length}</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 h-7 px-2.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-[10px] hover:bg-indigo-100 transition-colors uppercase tracking-wider"
            >
              <Plus className="h-3 w-3" />
              Create
            </button>
          </div>

          <div className="space-y-3">
            {roles.map((role) => (
              <div key={role.id} className="relative group">
                <button
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden ${selectedRole?.id === role.id
                    ? 'bg-white border-[#1E3A8A] shadow-lg shadow-indigo-100/40'
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                    }`}
                >
                  {selectedRole?.id === role.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1E3A8A]" />
                  )}

                  <div className="flex items-center gap-3 pr-6">
                    <div className={`p-2 rounded-lg shadow-sm border ${selectedRole?.id === role.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-[#1E293B]">{role.name}</h4>
                      </div>


                    </div>
                  </div>
                </button>
                {/* Delete button only for non-primary roles if you want, or just all */}
                {!role.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm rounded-md border border-slate-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Permissions Dashboard */}
        <div className="xl:col-span-9 lg:col-span-8 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {selectedRole ? (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center text-white shadow-md">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">{selectedRole.name} Permissions</h3>

                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedRole(roles.find(r => r.id === selectedRole.id))}
                    className="h-9 px-4 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="h-9 px-4 bg-[#1E3A8A] text-white rounded-lg font-bold text-xs shadow-md shadow-indigo-100 hover:bg-[#1e2e6b] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 bg-slate-50/30">
                {permissionsGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="space-y-3">
                      {group.permissions.map((perm) => {
                        const isEnabled = selectedRole.permissions?.includes(perm.name);
                        return (
                          <div
                            key={perm.name}
                            className={`p-4 rounded-xl border transition-all ${perm.special ? 'bg-indigo-50/30 border-indigo-100/50' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                              } ${!isEnabled && !perm.special ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {perm.special && <Lock className="h-4 w-4 text-indigo-600" />}
                                  <h5 className="text-sm font-bold text-[#1E293B]">{perm.name}</h5>
                                  {perm.tags?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black tracking-widest uppercase rounded border border-indigo-100">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                  {perm.description}
                                </p>
                              </div>
                              <Toggle
                                enabled={isEnabled}
                                onChange={() => handleTogglePermission(perm.name)}
                              />
                            </div>

                            {/* Granular Sub-Permissions */}
                            {isEnabled && perm.subPermissions && (
                              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
                                {perm.subPermissions.map(sub => {
                                  const isSubEnabled = selectedRole.permissions?.includes(sub.id.includes('_') ? sub.id : `${perm.name}:${sub.id}`);
                                  return (
                                    <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{sub.label}</span>
                                      <Toggle
                                        enabled={isSubEnabled}
                                        onChange={() => handleTogglePermission(perm.name, sub.id)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
              <Shield className="h-16 w-16 mb-4 opacity-20" />
              <p className="font-bold text-sm tracking-widest">SELECT A ROLE TO MANAGE PERMISSIONS</p>
            </div>
          )}

          <div className="mt-auto p-4 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">
              Role Synchronization Active • Security Level: High
            </p>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1E293B]">Create Custom Role</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Quality Inspector"
                  className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Define the scope of this role..."
                  className="w-full min-h-[100px] p-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-slate-700 resize-none text-sm"
                />
              </div>

              {/* Permission Checklist */}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Permissions</label>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {permissionsGroups.map(group => (
                    <div key={group.id} className="space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        {group.permissions.map(perm => {
                          const isChecked = newRolePermissions.includes(perm.name);
                          return (
                            <div key={perm.name} className="space-y-2">
                              <div
                                onClick={() => {
                                  if (isChecked) {
                                    const subPermsToRemove = perm.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${perm.name}:${sp.id}`) || [];
                                    setNewRolePermissions(newRolePermissions.filter(p => p !== perm.name && !p.startsWith(`${perm.name}:`) && !subPermsToRemove.includes(p)));
                                  } else {
                                    const subPerms = perm.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${perm.name}:${sp.id}`) || [];
                                    setNewRolePermissions([...newRolePermissions, perm.name, ...subPerms]);
                                  }
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
                                  }`}
                              >
                                <span className={isChecked ? 'text-indigo-900 font-bold text-xs' : 'text-slate-600 text-xs font-medium'}>
                                  {perm.name}
                                </span>
                                {isChecked ? <CheckCircle2 className="h-4 w-4 text-indigo-600" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-200" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-1 h-14 rounded-2xl bg-[#1E3A8A] text-white font-bold shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1E293B] mb-2">Delete Role?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-700">"{roleToDelete?.name}"</span>? This action cannot be undone and may affect assigned employees.
              </p>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button
                onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRole}
                disabled={saving}
                className="flex-1 h-14 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
