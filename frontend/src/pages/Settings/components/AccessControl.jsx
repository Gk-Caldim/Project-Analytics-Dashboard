import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshUserProfile } from '../../../store/slices/authSlice';
import {
  Shield, Edit, Trash2, X, Save, Plus, Loader2, Check, Layout, Fingerprint
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
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none ${enabled ? 'bg-[#0E1B2E]' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform bg-white rounded-full transition duration-200 ease-in-out ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E1B2E]" />
        <p className="text-[#0E1B2E]/40 text-[10px] font-bold tracking-[0.3em] uppercase">Initializing access layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 border z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 rounded-full ${notification.type === 'success'
          ? 'bg-[#0E1B2E] border-white/10 text-white'
          : 'bg-red-600 border-none text-white'
          }`}>
          <p className="text-[10px] font-bold tracking-widest uppercase">{notification.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-[#0E1B2E] tracking-tight">Institutional Authorities</h2>
        <p className="text-sm text-gray-500 mt-2">Global orchestration of system roles, hierarchy levels, and functional permission matrices.</p>
      </div>

      {/* Roles Grid - Creative & Professional */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-bold text-[#0E1B2E]/40 uppercase tracking-[0.3em] px-1">Available Role Profiles</h3>
           <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-6 bg-[#0E1B2E] text-white font-bold text-[10px] tracking-widest uppercase rounded-full hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Provision New Role
            </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {roles.map((role) => (
            <div 
              key={role.id} 
              onClick={() => setSelectedRole(role)}
              className={`group relative p-6 cursor-pointer border transition-all duration-300 rounded-none h-full flex flex-col justify-between ${
                selectedRole?.id === role.id 
                ? 'bg-[#0E1B2E] border-[#0E1B2E] text-white shadow-xl translate-y-[-4px]' 
                : 'bg-white border-gray-100 text-[#0E1B2E] hover:border-[#0E1B2E]/20 hover:bg-gray-50/50'
              }`}
            >
              <div className="space-y-4">
                 <div className={`w-8 h-8 flex items-center justify-center rounded-full border ${selectedRole?.id === role.id ? 'border-white/20 bg-white/10' : 'border-[#0E1B2E]/10 bg-gray-50'}`}>
                    <Fingerprint className={`h-4 w-4 ${selectedRole?.id === role.id ? 'text-white' : 'text-[#0E1B2E]'}`} />
                 </div>
                 <div>
                    <p className="text-[11px] font-bold uppercase tracking-tight truncate">{role.name}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${selectedRole?.id === role.id ? 'text-white/40' : 'text-gray-400'}`}>
                       {role.permissions?.length || 0} PERMISSIONS
                    </p>
                 </div>
              </div>

              {!role.is_default && (
                <button
                  onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); setShowDeleteModal(true); }}
                  className={`mt-6 p-2 rounded-full flex items-center justify-center transition-all ${
                    selectedRole?.id === role.id 
                    ? 'hover:bg-white/10 text-white/40 hover:text-white' 
                    : 'text-gray-300 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}

              {selectedRole?.id === role.id && (
                <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                   <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      {selectedRole && (
        <div className="bg-white border border-gray-200 rounded-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-[#0E1B2E] text-white flex items-center justify-center rounded-full">
                    <Shield className="h-5 w-5" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#0E1B2E] uppercase tracking-tight">{selectedRole.name}</h3>
                    <p className="text-[10px] text-[#0E1B2E]/40 uppercase tracking-[0.2em] font-bold mt-1 leading-none">Security Configuration Protocol</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedRole(roles.find(r => r.id === selectedRole.id))}
                  className="h-10 px-6 text-gray-400 font-bold text-[10px] tracking-widest uppercase hover:text-[#0E1B2E] hover:bg-gray-100 rounded-full transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="h-10 px-8 bg-[#0E1B2E] text-white font-bold text-[10px] tracking-widest uppercase rounded-full hover:opacity-90 transition-all disabled:opacity-30 shadow-lg shadow-[#0E1B2E]/20 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {saving ? 'SYNCING...' : 'Sync Mapping'}
                </button>
              </div>
           </div>

           <div className="p-10 space-y-16">
              {permissionsGroups.map((group) => (
                <div key={group.id} className="space-y-8">
                  <div className="flex items-center gap-4">
                     <span className="h-px bg-gray-100 flex-1" />
                     <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em] whitespace-nowrap">{group.label}</h4>
                     <span className="h-px bg-gray-100 flex-1" />
                  </div>

                  <div className="space-y-4">
                    {group.permissions.map((perm) => {
                      const isEnabled = selectedRole.permissions?.includes(perm.name);
                      return (
                        <div
                          key={perm.name}
                          className={`p-8 border transition-all duration-300 rounded-none ${
                             perm.special 
                             ? 'bg-gray-50/80 border-dashed border-gray-300' 
                             : 'bg-white border-gray-100 hover:border-gray-200'
                          } ${!isEnabled && !perm.special ? 'opacity-50' : 'opacity-100'}`}
                        >
                          <div className="flex items-start justify-between gap-12">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-4 flex-wrap">
                                <h3 className="text-[13px] font-bold text-[#0E1B2E] uppercase tracking-tight">{perm.name}</h3>
                                {perm.tags?.map(tag => (
                                  <span key={tag} className="px-2.5 py-0.5 bg-gray-100 text-gray-400 text-[8px] font-bold tracking-[0.2em] uppercase border border-gray-200 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed max-w-3xl font-medium">
                                {perm.description}
                              </p>
                            </div>
                            <Toggle
                              enabled={isEnabled}
                              onChange={() => handleTogglePermission(perm.name)}
                            />
                          </div>

                          {isEnabled && perm.subPermissions && (
                            <div className="mt-10 pt-10 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {perm.subPermissions.map(sub => {
                                const isSubEnabled = selectedRole.permissions?.includes(sub.id.includes('_') ? sub.id : `${perm.name}:${sub.id}`);
                                return (
                                  <div 
                                    key={sub.id} 
                                    className={`flex items-center justify-between p-5 transition-all group/sub rounded-md border ${
                                       isSubEnabled ? 'bg-white border-[#0E1B2E]/10 shadow-sm' : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-gray-100'
                                    }`}
                                  >
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isSubEnabled ? 'text-[#0E1B2E]' : 'text-gray-400 group-hover/sub:text-[#0E1B2E]'}`}>
                                      {sub.label}
                                    </span>
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
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0E1B2E]/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl border border-gray-200 rounded-none shadow-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 text-[#0E1B2E]">
               <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">Role Provisioning</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Define structural access parameters</p>
               </div>
               <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5" />
               </button>
            </div>
            <div className="p-8 space-y-8">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-[#0E1B2E]/40 uppercase tracking-widest px-1">Institutional Identifier (Name)</label>
                 <input
                   type="text"
                   value={newRoleName}
                   onChange={(e) => setNewRoleName(e.target.value)}
                   className="w-full h-12 px-5 border border-gray-200 bg-gray-50 focus:border-[#0E1B2E] outline-none text-sm font-medium rounded-md"
                   placeholder="e.g. INFRASTRUCTURE_ADMIN"
                 />
               </div>
               <div className="space-y-4">
                 <label className="text-[10px] font-bold text-[#0E1B2E]/40 uppercase tracking-widest px-1">Functional Mapping (Permissions)</label>
                 <div className="max-h-[300px] overflow-y-auto pr-4 space-y-6 border-l-2 border-gray-100 ml-1">
                   {permissionsGroups.map(group => (
                     <div key={group.id} className="space-y-4 pl-6">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.25em] mb-4">{group.label}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                className={`p-4 border cursor-pointer border-gray-100 flex items-center justify-between transition-all rounded-md ${
                                   isChecked ? 'bg-[#0E1B2E] border-[#0E1B2E] text-white shadow-md' : 'bg-gray-50 hover:bg-white hover:border-gray-200'
                                }`}
                              >
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isChecked ? 'text-white' : 'text-gray-500'}`}>{perm.name}</span>
                                {isChecked && <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center"><Check className="h-2.5 w-2.5" /></div>}
                              </div>
                            );
                          })}
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
            <div className="p-8 bg-gray-50/50 flex gap-4 border-t border-gray-100">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-12 font-bold text-gray-400 hover:text-[#0E1B2E] hover:bg-white uppercase tracking-widest text-[10px] rounded-full transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-[2] h-12 bg-[#0E1B2E] text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:opacity-90 disabled:opacity-30 shadow-lg shadow-[#0E1B2E]/20 transition-all font-inter"
              >
                Initialize Role Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-[#0E1B2E]/80 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm border border-gray-200 p-10 text-center rounded-none shadow-2xl">
             <div className="w-20 h-20 bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-8 rounded-full">
                <Trash2 className="h-10 w-10" />
             </div>
             <h3 className="text-xl font-bold text-[#0E1B2E] mb-2 uppercase tracking-tight">Deprovision Role?</h3>
             <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest leading-relaxed">
               Destroying role profile <span className="text-[#0E1B2E] font-bold">"{roleToDelete?.name}"</span>.<br/>This instruction is irreversible.
             </p>
             <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                  className="flex-1 h-11 font-bold text-gray-400 hover:text-[#0E1B2E] hover:bg-gray-50 uppercase tracking-widest text-[10px] rounded-full transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={confirmDeleteRole}
                  className="flex-[2] h-11 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                >
                  Authorize Deletion
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
