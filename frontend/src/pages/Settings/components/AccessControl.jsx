import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshUserProfile } from '../../../store/slices/authSlice';
import {
  Shield, Edit, Trash2, X, Save, Plus, Loader2, Check, Layout, ChevronDown, ChevronUp, Settings2, Command,
  User, UserCheck, ShieldCheck, Briefcase, Users, UserCircle
} from 'lucide-react';
import API from '../../../utils/api';
import { toast } from 'react-hot-toast';
import Skeleton from '../../../components/ui/skeleton';

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
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Creation States
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  
  // Logic States
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const showNotification = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  const getRoleIcon = (roleName) => {
    const name = (roleName || '').toLowerCase();
    if (name.includes('super admin') || name.includes('admin')) return <ShieldCheck className="h-5 w-5" />;
    if (name.includes('project manager')) return <Briefcase className="h-5 w-5" />;
    if (name.includes('lead') || name.includes('supervisor')) return <Users className="h-5 w-5" />;
    if (name.includes('employee') || name.includes('staff')) return <User className="h-5 w-5" />;
    return <UserCircle className="h-5 w-5" />;
  };

  const permissionsGroups = [
    {
      id: 'core',
      label: 'CORE MODULES',
      permissions: [
        { id: 'dashboard', name: 'Dashboard', description: 'Monitor organizational KPIs, resource allocation, and project statuses.', tags: ['ANALYTICS'] },
        { id: 'mom', name: 'MOM', description: 'Manage meeting minutes, agenda tracking, and action items.', tags: ['GOVERNANCE'] },
      ]
    },
    {
      id: 'masters',
      label: 'MASTER REGISTRY',
      permissions: [
        {
          id: 'employee_master',
          name: 'Employee Master',
          description: 'Employee directory management and role assignments.',
          tags: ['HRIS'],
          subPermissions: [
            { id: 'ADD', label: 'Add' },
            { id: 'EDIT', label: 'Edit' },
            { id: 'DELETE', label: 'Delete' },
            { id: 'CUSTOM_COLUMNS', label: 'Custom Columns' }
          ]
        },
        {
          id: 'project_master',
          name: 'Project Master',
          description: 'Project orchestration and primary stakeholder directory.',
          tags: ['OPERATIONS'],
          subPermissions: [
            { id: 'ADD', label: 'Add' },
            { id: 'EDIT', label: 'Edit' },
            { id: 'DELETE', label: 'Delete' },
            { id: 'CUSTOM_COLUMNS', label: 'Custom Columns' },
            { id: 'VIEW-SUBCATEGORY', label: 'View Sub-Ops' },
            { id: 'EDIT-SUBCATEGORY', label: 'Modify Sub-Ops' },
            { id: 'DELETE-SUBCATEGORY', label: 'Remove Sub-Ops' }
          ]
        },
        {
          id: 'budget_master',
          name: 'Budget Master',
          description: 'Budget planning, allocation, upload, and expenditure tracking for projects.',
          tags: ['FINANCE'],
          subPermissions: [
            { id: 'upload_budget', label: 'Upload Budget' },
            { id: 'view_budget', label: 'View Budget' },
            { id: 'edit_row', label: 'Edit Row' },
            { id: 'delete_row', label: 'Delete Row' },
            { id: 'add_row', label: 'Add Row' },
            { id: 'add_column', label: 'Add Column' },
            { id: 'edit_column', label: 'Edit Column' },
            { id: 'save_budget', label: 'Save Budget' },
            { id: 'budget_audits', label: 'Budget Audits' },
          ]
        },
      ]
    },
    {
      id: 'utilities',
      label: 'UTILITIES',
      permissions: [
        {
          id: 'upload_trackers',
          name: 'Upload Trackers',
          description: 'Data synchronization and tracker health monitoring.',
          tags: ['DATA'],
          subPermissions: [
            { id: 'upload_tracker', label: 'Upload' },
            { id: 'view_tracker', label: 'View' },
            { id: 'delete_tracker', label: 'Delete' }
          ]
        },
        { id: 'settings', name: 'Settings', description: 'System configurations and security guardrails.', tags: ['ADMIN'], special: true },
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

  const handleTogglePermission = (role, moduleName, subPermId = null) => {
    let currentPermissions = role?.permissions || [];
    let updatedPermissions;
    const moduleObj = permissionsGroups.flatMap(g => g.permissions).find(p => p.name === moduleName);
    // Include both flat and prefixed IDs for subpermissions to handle legacy clean-up properly
    const moduleSubPermIds = moduleObj?.subPermissions?.flatMap(sp => [sp.id, `${moduleName}:${sp.id}`]) || [];

    if (subPermId) {
      const fullSubPerm = `${moduleName}:${subPermId}`;
      const flatSubPerm = subPermId;
      const isEnabled = currentPermissions.includes(fullSubPerm) || currentPermissions.includes(flatSubPerm);
      
      if (isEnabled) {
        // Toggle OFF: remove both versions
        updatedPermissions = currentPermissions.filter(p => p !== fullSubPerm && p !== flatSubPerm);
      } else {
        // Toggle ON: save the prefixed version
        updatedPermissions = [...currentPermissions, fullSubPerm];
      }
    } else {
      const isEnabled = currentPermissions.includes(moduleName) || 
                        (moduleName === 'Budget Master' && currentPermissions.includes('Budget Upload'));
      if (isEnabled) {
        // Toggle OFF: remove module name, legacy budget name, and all its sub-permissions
        updatedPermissions = currentPermissions.filter(p =>
          p !== moduleName && p !== 'Budget Upload' && !moduleSubPermIds.includes(p)
        );
      } else {
        // Toggle ON: save module name and all its prefixed sub-permissions
        const toAdd = [moduleName, ...(moduleObj?.subPermissions?.map(sp => `${moduleName}:${sp.id}`) || [])];
        updatedPermissions = [...new Set([...currentPermissions, ...toAdd])];
      }
    }
    
    if (showCreateModal) {
      setNewRolePermissions(updatedPermissions);
    } else {
      setSelectedRole({ ...role, permissions: updatedPermissions });
    }
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
      showNotification('Role permissions successfully updated.');
      setShowConfigModal(false);
      fetchRoles();
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
      showNotification(`Role "${newRoleName}" created.`);
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
      showNotification(`Role successfully deleted.`);
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('Failed to delete role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button
      onClick={(e) => { e.stopPropagation(); !disabled && onChange && onChange(!enabled); }}
      type="button"
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 outline-none ${enabled ? 'bg-[var(--accent-hover)]' : 'bg-gray-200'} ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform bg-white rounded-full shadow-sm transition duration-300 ease-in-out ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
      />
    </button>
  );

  const PermissionsAccordion = ({ currentPermissions, onToggle }) => {
    return (
      <div className="space-y-3 font-['Inter']">
        {permissionsGroups.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <div className="flex items-center gap-3 py-1">
               <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">{group.label}</h4>
               <span className="h-px bg-[var(--border-subtle)]/30 flex-1" />
            </div>
            
            <div className="space-y-2">
              {group.permissions.map((perm) => {
                const isActive = activeModuleId === perm.id;
                const isEnabled = (currentPermissions || []).includes(perm.name) || 
                                  (perm.name === 'Budget Master' && (currentPermissions || []).includes('Budget Upload'));
                
                // Calculate selection count correctly without double counting
                const enabledCount = (perm.subPermissions || []).filter(sub => {
                  const fullId = `${perm.name}:${sub.id}`;
                  const flatId = sub.id;
                  return (currentPermissions || []).includes(fullId) || (currentPermissions || []).includes(flatId);
                }).length + (isEnabled ? 1 : 0);
                const totalOptions = 1 + (perm.subPermissions?.length || 0);

                return (
                  <div key={perm.id} className={`transition-all duration-300 rounded-none overflow-hidden border ${isActive ? 'border-[var(--accent-hover)] bg-[var(--active-menu)]/5' : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border-strong)]'}`}>
                    <button
                      onClick={() => setActiveModuleId(isActive ? null : perm.id)}
                      className={`w-full flex items-center justify-between p-3.5 transition-colors group border-l-4 ${isActive ? 'border-[var(--accent-hover)]' : 'border-transparent hover:border-[var(--border-strong)]'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${enabledCount > 0 ? 'bg-[var(--accent-hover)]' : 'bg-[var(--border-strong)]'}`} />
                        <div className="text-left flex items-center gap-3">
                          <span className={`text-[12px] font-bold uppercase tracking-tight block ${isActive ? 'text-[var(--accent-hover)]' : 'text-[var(--text-primary)]'}`}>{perm.name}</span>
                          {!isActive && enabledCount > 0 && (
                            <span className="text-[9px] font-bold text-[var(--accent-hover)] bg-[var(--accent-hover)]/5 px-2 py-0.5 rounded-full border border-[var(--accent-hover)]/10">
                              {enabledCount} / {totalOptions} Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          {isActive ? 'Hide' : 'Configure'}
                        </span>
                        {isActive ? <ChevronUp className="h-4 w-4 text-[var(--accent-hover)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
                      </div>
                    </button>
                    
                    {isActive && (
                      <div className="px-6 pb-6 pt-2 bg-[var(--surface)] animate-in slide-in-from-top-1 duration-300 space-y-6 border-t border-[var(--border-subtle)]/50">
                        <div className="flex items-start justify-between gap-12 pt-4">
                          <div className="space-y-1">
                            <h5 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">Base Permissions</h5>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed max-w-lg">{perm.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Enable Module</span>
                            <Toggle enabled={isEnabled} onChange={() => onToggle(perm.name)} />
                          </div>
                        </div>
                        
                        {isEnabled && perm.subPermissions && (
                          <div className="space-y-3">
                             <h5 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">Sub-Level Access Control</h5>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {perm.subPermissions.map(sub => {
                                  const fullId = `${perm.name}:${sub.id}`;
                                  const flatId = sub.id;
                                  const isSubEnabled = (currentPermissions || []).includes(fullId) || (currentPermissions || []).includes(flatId);
                                  return (
                                    <div 
                                      key={sub.id} 
                                      onClick={() => onToggle(perm.name, sub.id)}
                                      className={`flex items-center justify-between p-3 cursor-pointer rounded-md border transition-all ${isSubEnabled ? 'bg-[var(--surface)] border-[var(--accent-hover)] shadow-sm' : 'bg-[var(--bg)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                         <div className={`w-1 h-1 rounded-full ${isSubEnabled ? 'bg-[var(--accent-hover)]' : 'bg-[var(--border-strong)]'}`} />
                                         <span className={`text-[10px] font-bold uppercase tracking-widest ${isSubEnabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{sub.label}</span>
                                      </div>
                                      <Toggle enabled={isSubEnabled} onChange={() => onToggle(perm.name, sub.id)} />
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-12 pb-24 font-inter animate-pulse">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded" />
            <Skeleton className="h-4 w-96 max-w-full rounded" />
          </div>
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>

        {/* Roles Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="p-6 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-none flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>

              <Skeleton className="mt-8 w-full h-9 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 font-inter">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Role Management</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Manage system access profiles, functional groups, and secure permission mappings.</p>
        </div>
        <button
          onClick={() => {
            setNewRolePermissions([]);
            setShowCreateModal(true);
          }}
          className="h-11 px-6 bg-[var(--accent-hover)] text-white font-bold text-[10px] tracking-widest uppercase rounded-full hover:opacity-90 transition-all flex items-center gap-3"
        >
          <Plus className="h-4 w-4" />
          Create New Role
        </button>
      </div>

      {/* Roles Grid - Compact Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {roles.map((role) => (
          <div 
            key={role.id} 
            className="group relative p-6 cursor-default bg-[var(--surface)] border border-[var(--border-subtle)] rounded-none transition-all duration-300 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between min-h-[220px]"
          >
            <div className="space-y-6">
               <div className="flex items-start justify-between">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg)] border border-[var(--border-subtle)] group-hover:bg-[var(--accent-hover)]/5 transition-colors">
                    <span className="text-[var(--accent-hover)]">{getRoleIcon(role.name)}</span>
                  </div>
                  {!role.is_default && (
                    <button
                      onClick={() => { setRoleToDelete(role); setShowDeleteModal(true); }}
                      className="text-[var(--text-muted)] hover:text-red-600 p-1.5 rounded-full transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
               </div>
               
               <div className="space-y-1">
                  <p className="text-[12px] font-bold uppercase tracking-tight text-[var(--text-primary)] leading-none">{role.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                     {role.permissions?.length || 0} Modules Assigned
                  </p>
               </div>
            </div>

            <button
              onClick={() => {
                setSelectedRole(role);
                setActiveModuleId(null);
                setShowConfigModal(true);
              }}
              className="mt-8 w-full h-9 border border-[var(--accent-hover)]/10 group-hover:border-[var(--accent-hover)] text-[var(--accent-hover)] font-bold text-[9px] tracking-widest uppercase rounded-full transition-all flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] hover:text-white"
            >
              <Settings2 className="h-3 w-3" />
              Configure Role
            </button>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && selectedRole && (
        <div className="app-modal-overlay z-[450]">
          <div className="app-modal-container max-w-2xl w-full mx-4">
             <div className="app-modal-header bg-[var(--elevated-card)]">
                <div className="flex flex-col">
                   <h3 className="app-modal-title">{selectedRole.name}</h3>
                   <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mt-1">Permission Settings</p>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="app-modal-close-btn">
                   <X className="h-5 w-5" />
                </button>
             </div>

             <div className="app-modal-body">
                <PermissionsAccordion 
                  currentPermissions={selectedRole.permissions || []} 
                  onToggle={(name, sub) => handleTogglePermission(selectedRole, name, sub)} 
                />
             </div>

             <div className="app-modal-footer bg-[var(--elevated-card)]">
                <button
                  onClick={() => {
                    fetchRoles();
                    setShowConfigModal(false);
                  }}
                  className="flex-1 h-11 text-[var(--text-muted)] font-bold text-[10px] tracking-widest uppercase hover:text-[var(--accent-hover)] rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex-[2] h-11 bg-[var(--accent-hover)] text-white font-bold text-[10px] tracking-widest uppercase rounded-full hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? 'UPDATING...' : 'Update Permissions'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="app-modal-overlay z-[500]">
          <div className="app-modal-container max-w-2xl w-full mx-4">
            <div className="app-modal-header bg-[var(--elevated-card)] text-[var(--text-primary)]">
               <div>
                  <h3 className="app-modal-title">Provision Role</h3>
                  <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Create system access profile</p>
               </div>
               <button onClick={() => setShowCreateModal(false)} className="app-modal-close-btn">
                  <X className="h-5 w-5" />
               </button>
            </div>
            
            <div className="app-modal-body space-y-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1 block">Role Name</label>
                 <input
                   type="text"
                   value={newRoleName}
                   onChange={(e) => setNewRoleName(e.target.value)}
                   className="w-full h-12 px-5 border border-[var(--border-subtle)] bg-[var(--bg)] focus:border-[var(--accent-hover)] focus:bg-[var(--surface)] outline-none text-sm font-bold text-[var(--text-primary)] rounded-md transition-all placeholder:text-[var(--text-muted)]/30"
                   placeholder="e.g. OPERATIONS_EXECUTIVE"
                 />
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1 block">Permissions</label>
                  <PermissionsAccordion 
                    currentPermissions={newRolePermissions} 
                    onToggle={(name, sub) => handleTogglePermission({ permissions: newRolePermissions }, name, sub)} 
                  />
               </div>
            </div>

             <div className="app-modal-footer bg-[var(--elevated-card)]">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-11 font-bold text-[var(--text-muted)] hover:text-[var(--accent-hover)] hover:bg-[var(--surface)] uppercase tracking-widest text-[10px] rounded-full transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-[2] h-11 bg-[var(--accent-hover)] text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:opacity-90 disabled:opacity-30 transition-all"
              >
                {saving ? 'SAVING...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <div className="app-modal-overlay z-[550]">
          <div className="app-modal-container max-w-sm w-full mx-4 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-600 flex items-center justify-center mx-auto mb-6 rounded-full border border-red-500/20">
              <Trash2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 uppercase tracking-tight">Delete Role?</h3>
            <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-widest leading-relaxed">
               The profile <span className="text-red-600 font-bold">"{roleToDelete?.name}"</span> will be permanently removed.
            </p>
            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                className="flex-1 h-11 font-bold text-[var(--text-muted)] hover:text-[var(--accent-hover)] hover:bg-[var(--bg)] uppercase tracking-widest text-[10px] rounded-full transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteRole}
                className="flex-[2] h-11 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-full hover:bg-red-700 transition-all"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
