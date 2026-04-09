import React, { useState, useEffect } from 'react';
import { Search, X, UserPlus, Trash2, CheckCircle } from 'lucide-react';
import API from '../../utils/api';
import { getEmployees } from '../../utils/employeeApi';
import ReactSelect from 'react-select';

const ManageTeamModal = ({ isOpen, onClose, project, onTeamUpdated }) => {
  const [team, setTeam] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState({ value: 'Engineer', label: 'Engineer' });
  const [notification, setNotification] = useState(null);

  const roles = [
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Engineer', label: 'Engineer' },
    { value: 'Viewer', label: 'Viewer' }
  ];

  useEffect(() => {
    if (isOpen && project) {
      fetchTeam();
      fetchEmployees();
    }
  }, [isOpen, project]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/projects/${project.project_id}/team`);
      setTeam(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      // Format for react-select
      const opts = res.data.map(emp => ({
        value: emp.employee_id,
        label: `${emp.name} (${emp.email})`,
        data: emp
      }));
      setEmployees(opts);
    } catch (err) {
      console.error(err);
    }
  };

  const showNotif = (msg, type='success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAssign = async () => {
    if (!selectedEmployee) return;
    
    try {
      await API.post(`/projects/${project.project_id}/team`, {
        employee_id: selectedEmployee.value,
        project_id: project.project_id,
        role: selectedRole.value,
        allocation_percentage: 100
      });
      showNotif('Team member assigned!');
      setSelectedEmployee(null);
      fetchTeam();
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      showNotif(err.response?.data?.detail || 'Error assigning employee', 'error');
    }
  };

  const handleRemove = async (allocationId) => {
    try {
      await API.delete(`/projects/${project.project_id}/team/${allocationId}`);
      showNotif('Team member removed');
      fetchTeam();
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      showNotif('Error removing member', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manage Team</h2>
            <p className="text-sm text-slate-500">{project?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {notification && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              notification.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <CheckCircle size={18} />
              <span className="text-sm font-medium">{notification.msg}</span>
            </div>
          )}

          {/* Add Member Section */}
          <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <UserPlus size={16} /> Assign New Member
            </h3>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <ReactSelect 
                  options={employees} 
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  placeholder="Search employee..."
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
              <div className="w-full md:w-48">
                <ReactSelect 
                  options={roles}
                  value={selectedRole}
                  onChange={setSelectedRole}
                  isSearchable={false}
                />
              </div>
              <button 
                onClick={handleAssign}
                disabled={!selectedEmployee}
                className="btn-primary whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>

          {/* Team List */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Current Members ({team.length})</h3>
            </div>
            
            {loading ? (
              <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : team.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No team members assigned yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {team.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">{member.employee_id}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                          {member.employee_name || member.employee_id}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {member.employee_department || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 lowercase max-w-[120px] truncate" title={member.employee_email}>
                          {member.employee_email || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-medium border border-indigo-100 dark:border-indigo-800/50">
                            {member.employee_role || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleRemove(member.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors inline-flex"
                            title="Remove Member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTeamModal;
