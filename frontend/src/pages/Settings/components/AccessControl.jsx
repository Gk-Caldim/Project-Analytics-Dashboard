import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshUserProfile } from '../../../store/slices/authSlice';
import {
  Shield, Edit, Trash2, X, Save, Plus, Loader2, Check
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
      if (orderA !== orderB) return orderA - orderB;
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
    const moduleObj = permissionsGroups.flatMap(g => g.permissions).find(p => p.name === moduleName);
    const moduleSubPermIds = moduleObj?.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${moduleName}:${sp.id}`) || [];

    if (subPermId) {
      const fullSubPerm = subPermId.includes('_') ? subPermId : `${moduleName}:${subPermId}`;
      updatedPermissions = currentPermissions.includes(fullSubPerm)
        ? currentPermissions.filter(p => p !== fullSubPerm)
        : [...currentPermissions, fullSubPerm];
    } else {
      const isEnabled = currentPermissions.includes(moduleName);
      if (isEnabled) {
        updatedPermissions = currentPermissions.filter(p =>
          p !== moduleName && !moduleSubPermIds.includes(p)
        );
      } else {
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
      if (selectedRole.name === currentUser?.role) {
        await dispatch(refreshUserProfile());
      }
      showNotification('Permissions synced successfully!');
    } catch (error) {
      console.error('Error saving role changes:', error);
      showNotification('Failed to sync permissions.', 'error');
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
      showNotification(`Role created successfully!`);
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Failed to create role.', 'error');
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

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button
      onClick={() => !disabled && onChange && onChange(!enabled)}
      type="button"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none ${enabled ? 'bg-[#0E1B2E]' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform bg-white transition duration-200 ease-in-out ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1B2E]" />
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">Initializing access layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 border z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 ${notification.type === 'success'
          ? 'bg-[#0E1B2E] border-white/10 text-white'
          : 'bg-red-600 border-none text-white'
          }`}>
          <p className="text-xs font-bold tracking-wider uppercase">{notification.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-[#0E1B2E] tracking-tight">Access Control</h2>
        <p className="text-sm text-gray-500 mt-2">Manage system roles and functional permissions mapping.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Roles */}
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Available Roles</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-8 px-3 bg-[#0E1B2E] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {roles.map((role) => (
              <div key={role.id} className="group relative">
                <button
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left px-4 py-4 border transition-all ${selectedRole?.id === role.id
                    ? 'bg-[#0E1B2E] border-[#0E1B2E] text-white font-bold'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#0E1B2E] hover:text-[#0E1B2E]'
                    }`}
                >
                  <span className="text-xs uppercase tracking-tight truncate block pr-8">{role.name}</span>
                </button>
                {!role.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); setShowDeleteModal(true); }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity ${selectedRole?.id === role.id ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-red-600'}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Permissions */}
        <div className="xl:col-span-9 bg-white border border-gray-200 p-0 overflow-hidden flex flex-col min-h-[600px]">
          {selectedRole ? (
            <>
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-[#0E1B2E]">{selectedRole.name}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold mt-1">Permission Profile</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedRole(roles.find(r => r.id === selectedRole.id))}
                    className="h-10 px-6 text-gray-400 font-bold text-[10px] tracking-widest uppercase hover:text-[#0E1B2E] transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="h-10 px-8 bg-[#0E1B2E] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    {saving ? '...' : 'Sync Changes'}
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-12">
                {permissionsGroups.map((group) => (
                  <div key={group.id} className="space-y-6">
                    <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.3em] px-1">{group.label}</h4>
                    <div className="space-y-2">
                      {group.permissions.map((perm) => {
                        const isEnabled = selectedRole.permissions?.includes(perm.name);
                        return (
                          <div
                            key={perm.name}
                            className={`p-6 border transition-all ${perm.special ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 hover:border-gray-200'
                              } ${!isEnabled && !perm.special ? 'opacity-40 grayscale' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-8">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <h3 className="text-sm font-bold text-[#0E1B2E] uppercase tracking-tight">{perm.name}</h3>
                                  {perm.tags?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold tracking-widest uppercase border border-gray-200">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed max-w-2xl font-medium">
                                  {perm.description}
                                </p>
                              </div>
                              <Toggle
                                enabled={isEnabled}
                                onChange={() => handleTogglePermission(perm.name)}
                              />
                            </div>
 
                            {isEnabled && perm.subPermissions && (
                              <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                {perm.subPermissions.map(sub => {
                                  const isSubEnabled = selectedRole.permissions?.includes(sub.id.includes('_') ? sub.id : `${perm.name}:${sub.id}`);
                                  return (
                                    <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 hover:bg-white transition-colors group/sub">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover/sub:text-[#0E1B2E] transition-colors">{sub.label}</span>
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50">
              <p className="font-bold text-xs text-gray-300 tracking-[0.3em] uppercase">Select role to configure</p>
            </div>
          )}

          <div className="mt-auto p-4 bg-gray-50 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-[0.3em]">
              Security synchronization active • Production Grade Controls
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0E1B2E]/80 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl border border-gray-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50 text-[#0E1B2E]">
               <h3 className="text-xl font-bold uppercase tracking-tight">Create Role</h3>
               <button onClick={() => setShowCreateModal(false)} className="hover:opacity-60"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 space-y-8">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Role Name</label>
                 <input
                   type="text"
                   value={newRoleName}
                   onChange={(e) => setNewRoleName(e.target.value)}
                   className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium"
                 />
               </div>
               <div className="space-y-4">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Initial Permissions Mapping</label>
                 <div className="max-h-[300px] overflow-y-auto pr-4 space-y-4 border-l border-gray-100 ml-1">
                   {permissionsGroups.map(group => (
                     <div key={group.id} className="space-y-3 pl-4">
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-4">{group.label}</p>
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
                                className={`p-4 border cursor-pointer flex items-center justify-between transition-colors ${isChecked ? 'bg-[#0E1B2E] border-[#0E1B2E] text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-widest">{perm.name}</span>
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                            );
                          })}
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
            <div className="p-8 bg-gray-50 flex gap-4 border-t border-gray-100">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-12 font-bold text-gray-400 hover:text-[#0E1B2E] uppercase tracking-widest text-[10px]"
              >
                Discard
              </button>
              <button 
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-[2] h-12 bg-[#0E1B2E] text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90 disabled:opacity-30"
              >
                Create Role Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-[#0E1B2E]/80 backdrop-blur-sm z-[250] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm border border-gray-200 p-10 text-center">
             <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-8">
                <Trash2 className="h-8 w-8" />
             </div>
             <h3 className="text-xl font-bold text-[#0E1B2E] mb-2">Delete Role?</h3>
             <p className="text-xs text-gray-500 font-medium uppercase tracking-widest leading-relaxed">
               Destroying role profile <span className="text-[#0E1B2E] font-bold">"{roleToDelete?.name}"</span>. This action cannot be reversed.
             </p>
             <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                  className="flex-1 h-11 font-bold text-gray-400 hover:text-[#0E1B2E] uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteRole}
                  className="flex-[2] h-11 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] hover:opacity-90"
                >
                  Confirm Delete
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
