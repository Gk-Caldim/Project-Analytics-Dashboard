import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FolderTree, CheckCircle, AlertCircle } from 'lucide-react';
import API from '../utils/api';
import ProjectTrackerManagement from '../components/project/ProjectTrackerManagement';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Fetch core project
      const projRes = await API.get(`/projects/${id}`);
      setProject(projRes.data);

      // Fetch team
      fetchTeam(projRes.data.project_id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async (projId) => {
    try {
      const tRes = await API.get(`/projects/${projId}/team`);
      setTeam(tRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return <div>Project not found</div>;

  const tabs = [
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'trackers', label: 'Trackers management', icon: FolderTree }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/dashboard/masters/project-master')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{project.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {project.status || 'Active'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">{project.project_id}</span>
              </p>
            </div>


          </div>

          {/* Tabs */}
          <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-transparent">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${isActive
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Notifications */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm border ${notification.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              : 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
            }`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="font-medium">{notification.msg}</span>
          </div>
        )}



        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Team Roster</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {team.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">{m.employee_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-sm text-slate-800 dark:text-white">{m.employee_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-100 dark:border-indigo-800/50">{m.role || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-800 dark:text-white">{project.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{m.employee_department || '-'}</span>
                      </td>
                    </tr>
                  ))}
                  {team.length === 0 && <tr key="empty-team"><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No team members assigned yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* TRACKERS MANAGEMENT TAB */}
        {activeTab === 'trackers' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <ProjectTrackerManagement
              project={project}
              showNotification={showNotif}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectDetail;
