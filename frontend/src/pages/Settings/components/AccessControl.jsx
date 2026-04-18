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
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-text-secondary text-caption font-bold tracking-widest uppercase animate-pulse">Loading synchronization layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Notification Banner */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-lg shadow-xl z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 border ${notification.type === 'success'
          ? 'bg-status-success/5 border-status-success/20 text-status-success'
          : 'bg-status-error/5 border-status-error/20 text-status-error'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <p className="text-caption font-bold tracking-wider uppercase">{notification.message}</p>
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="ml-2 p-1 hover:bg-black/5 rounded transition-colors"
          >
            <X className="h-4 w-4 opacity-50" />
          </button>
        </div>
      )}

      <div className="mb-2">
        <h1 className="text-h2 font-bold text-text-primary tracking-tight">Access Control</h1>
        <p className="text-body-sm text-text-muted">Manage system roles and functional permissions</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Available Roles */}
        <div className="xl:col-span-3 lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-label font-bold text-text-muted uppercase tracking-widest">Available Roles</h3>
              <span className="px-1.5 py-0.5 bg-app-bg border border-border text-text-muted rounded text-[10px] font-bold">{roles.length}</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 h-8 px-3 bg-brand-primary text-white rounded font-bold text-caption hover:brightness-110 active:scale-95 transition-all shadow-md shadow-brand-primary/10 uppercase tracking-widest"
            >
              <Plus className="h-3.5 w-3.5" />
              CREATE
            </button>
          </div>

          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="relative group/role">
                <button
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 rounded-lg border transition-all relative overflow-hidden ${selectedRole?.id === role.id
                    ? 'bg-app-surface border-brand-primary shadow-sm'
                    : 'bg-app-bg border-border hover:border-brand-primary/20 hover:bg-app-surface'
                    }`}
                >
                  <div className="flex items-center gap-3 pr-6">
                    <div className={`p-2 rounded border transition-colors ${selectedRole?.id === role.id ? 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary' : 'bg-app-bg border-border text-text-muted opacity-50'
                      }`}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-body-sm transition-all truncate ${selectedRole?.id === role.id ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>{role.name}</h4>
                    </div>
                  </div>
                </button>
                {!role.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 text-text-muted hover:text-status-error opacity-0 group-hover/role:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Permissions Dashboard */}
        <div className="xl:col-span-9 lg:col-span-8 bg-app-bg rounded-lg border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {selectedRole ? (
            <>
              <div className="p-6 border-b border-border flex items-center justify-between bg-app-surface sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded flex items-center justify-center border border-brand-primary/20">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-h3 font-bold text-text-primary lg:text-h2">{selectedRole.name}</h2>
                    <p className="text-caption text-text-muted uppercase tracking-widest font-bold">Permissions Profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRole(roles.find(r => r.id === selectedRole.id))}
                    className="h-9 px-4 text-text-secondary rounded font-bold text-caption tracking-widest uppercase hover:bg-app-bg transition-all"
                  >
                    DISCARD
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="h-9 px-6 bg-text-primary text-white rounded font-bold text-caption tracking-widest uppercase shadow-md active:scale-95 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    SYNC CHANGES
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-4">
                {permissionsGroups.map((group) => (
                  <div key={group.id} className="space-y-4">
                    <h4 className="text-caption font-black text-text-muted uppercase tracking-[0.2em] px-1">{group.label}</h4>
                    <div className="space-y-3">
                      {group.permissions.map((perm) => {
                        const isEnabled = selectedRole.permissions?.includes(perm.name);
                        return (
                          <div
                            key={perm.name}
                            className={`p-5 rounded-lg border transition-all ${perm.special ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-app-surface border-border hover:border-brand-primary/30'
                              } ${!isEnabled && !perm.special ? 'opacity-50 grayscale' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {perm.special && <Lock className="h-3.5 w-3.5 text-brand-primary" />}
                                  <h3 className="text-body font-bold text-text-primary">{perm.name}</h3>
                                  {perm.tags?.map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-app-bg text-text-primary text-[9px] font-bold tracking-widest uppercase rounded border border-border">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-body-sm text-text-secondary leading-relaxed max-w-2xl">
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
                              <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                {perm.subPermissions.map(sub => {
                                  const isSubEnabled = selectedRole.permissions?.includes(sub.id.includes('_') ? sub.id : `${perm.name}:${sub.id}`);
                                  return (
                                    <div key={sub.id} className="flex items-center justify-between px-4 py-2.5 rounded bg-app-bg border border-border group/sub">
                                      <span className="text-caption font-bold text-text-muted uppercase tracking-widest group-hover/sub:text-text-primary transition-colors">{sub.label}</span>
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

          <div className="mt-auto p-4 bg-app-surface border-t border-border">
            <p className="text-caption text-text-muted font-bold text-center uppercase tracking-[0.2em]">
              Role Synchronization Active • Security Level: High
            </p>
          </div>
        </div>
      </div>
      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-app-bg rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-8 border-b border-border flex items-center justify-between bg-app-surface">
              <div>
                <h3 className="text-h3 font-bold text-text-primary">Create Role</h3>
                <p className="text-caption text-text-muted uppercase tracking-widest font-bold mt-1">NEW SECURITY PROFILE</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-app-bg rounded-md transition-all">
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Quality Inspector"
                  className="w-full h-12 px-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary text-body-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Define role scope..."
                  className="w-full min-h-[100px] p-5 rounded border border-border bg-app-surface focus:border-brand-primary outline-none transition-all font-medium text-text-primary resize-none text-body-sm"
                />
              </div>

              {/* Permission Checklist */}
              <div className="space-y-4">
                <label className="text-label font-bold text-text-muted uppercase tracking-widest px-1">Initial Permissions</label>
                <div className="max-h-[260px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {permissionsGroups.map(group => (
                    <div key={group.id} className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {group.permissions.map(perm => {
                          const isChecked = newRolePermissions.includes(perm.name);
                          return (
                            <div
                              key={perm.name}
                              onClick={() => {
                                if (isChecked) {
                                  const subPermsToRemove = perm.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${perm.name}:${sp.id}`) || [];
                                  setNewRolePermissions(newRolePermissions.filter(p => p !== perm.name && !p.startsWith(`${perm.name}:`) && !subPermsToRemove.includes(p)));
                                } else {
                                  const subPerms = perm.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${perm.name}:${sp.id}`) || [];
                                  setNewRolePermissions([...newRolePermissions, perm.name, ...subPerms]);
                                }
                              }}
                              className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${isChecked ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-app-surface border-border hover:border-text-muted'
                                }`}
                            >
                              <span className={`text-[11px] font-bold uppercase tracking-wider ${isChecked ? 'text-brand-primary' : 'text-text-muted'}`}>
                                {perm.name}
                              </span>
                              {isChecked ? <CheckCircle2 className="h-4 w-4 text-brand-primary" /> : <div className="h-4 w-4 rounded-full border border-border" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-app-surface flex gap-3 border-t border-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-11 rounded font-bold text-text-secondary hover:bg-app-bg transition-all uppercase tracking-widest text-caption"
              >
                DISCARD
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-1 h-11 rounded bg-text-primary text-white font-bold shadow-md hover:brightness-110 transition-all disabled:opacity-30 uppercase tracking-widest text-caption"
              >
                {saving ? 'CREATING...' : 'CREATE ROLE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-app-bg rounded-lg w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border">
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-status-error/5 rounded-md flex items-center justify-center text-status-error mb-6 border border-status-error/10">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-h3 font-bold text-text-primary mb-2">Delete Role?</h3>
              <p className="text-caption text-text-secondary font-bold leading-relaxed uppercase tracking-widest">
                Confirm deletion of <span className="text-text-primary">"{roleToDelete?.name}"</span>. This action is irreversible.
              </p>
            </div>
            <div className="p-6 bg-app-surface flex gap-3 border-t border-border">
              <button
                onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                className="flex-1 h-11 rounded font-bold text-text-secondary hover:bg-app-bg transition-all uppercase tracking-widest text-caption"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDeleteRole}
                disabled={saving}
                className="flex-1 h-11 rounded bg-status-error text-white font-bold shadow-lg shadow-status-error/10 hover:brightness-110 transition-all disabled:opacity-30 uppercase tracking-widest text-caption"
              >
                {saving ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccessControl;
