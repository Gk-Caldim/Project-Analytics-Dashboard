import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FolderTree, Activity, DollarSign, Calendar, Clock, Edit, Trash2, User, History } from 'lucide-react';
import API from '../utils/api';
import ManageTeamModal from '../components/project/ManageTeamModal';
import ProjectSubCategoryMaster from '../components/project/ProjectSubCategoryMaster';
import { CheckCircle, AlertCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import useCurrency from '../hooks/useCurrency';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const { format, symbol } = useCurrency();

  // Calculated Department-wise Breakdown
  const projectDepts = useMemo(() => {
    if (!project) return [];
    const deptMap = {};
    
    // 1. Group by Sub-Categories
    subCategories.forEach(sc => {
      const dName = sc.department || 'Unassigned';
      if (!deptMap[dName]) {
        deptMap[dName] = { name: dName, roll_alloc: 0, roll_util: 0, budget_allocation: 0, utilized_budget: 0 };
      }
      deptMap[dName].roll_alloc += (sc.estimated_value || 0);
      deptMap[dName].roll_util += (sc.utilized_value || 0);
      // For compatibility with legacy chart keys
      deptMap[dName].budget_allocation = deptMap[dName].roll_alloc;
      deptMap[dName].utilized_budget = deptMap[dName].roll_util;
      deptMap[dName].balance_budget = deptMap[dName].budget_allocation - deptMap[dName].utilized_budget;
    });

    return Object.values(deptMap);
  }, [project, subCategories]);

  const budgetStats = useMemo(() => {
    const totalAlloc = projectDepts.reduce((sum, d) => sum + (d.roll_alloc || 0), 0);
    const totalUtil = projectDepts.reduce((sum, d) => sum + (d.roll_util || 0), 0);
    const masterBudget = project?.budget || 0;
    return {
      totalAlloc,
      totalUtil,
      totalBalance: totalAlloc - totalUtil,
      masterBudget,
      unallocated: masterBudget - totalAlloc,
      utilPct: totalAlloc > 0 ? (totalUtil / totalAlloc) * 100 : 0,
      allocPct: masterBudget > 0 ? (totalAlloc / masterBudget) * 100 : 0
    };
  }, [projectDepts, project]);

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
      
      // Fetch Audit Logs - Get all activity related to this project (Project + SubCategories)
      const logRes = await API.get(`/audit-logs?entity_id=${projRes.data.project_id}`);
      setLogs(logRes.data);
      

      // Fetch Sub-categories for roll-up budget
      const subRes = await API.get(`/project-sub-categories/${projRes.data.project_id}`);
      setSubCategories(subRes.data || []);
      
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
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return <div>Project not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'subcategories', label: 'Sub Categories', icon: FolderTree },
    { id: 'budget', label: 'Budget Analysis', icon: DollarSign },
    { id: 'history', label: 'Activity Logs', icon: Clock }
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
            
            <div className="ml-auto flex gap-3">
              <button 
                 onClick={() => setShowTeamModal(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg font-medium transition-colors"
              >
                <Users size={18} /> Manage Team
              </button>
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
                  className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive 
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
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm border ${
            notification.type === 'error' 
              ? 'bg-red-50 text-red-800 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-medium">{notification.msg}</span>
          </div>
        )}
        
        {/* OVERVIEW TAB */}
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              {/* Main Info Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-6 text-slate-800 dark:text-white">Project Details</h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Timeline</span>
                    <p className="font-medium text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400"/> {project.timeline || 'Not Set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Allocation</span>
                    <p className="font-semibold text-slate-800 dark:text-white mt-1 text-lg">{format(budgetStats.totalAlloc)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Utilized Budget</span>
                    <p className="font-semibold text-amber-600 dark:text-amber-400 mt-1 text-lg">{format(budgetStats.totalUtil)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Balance Budget</span>
                    <p className={`font-bold mt-1 text-lg ${budgetStats.totalBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {format(budgetStats.totalBalance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Department wise budget breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white">Department wise Budget Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Department</th>
                        <th className="px-6 py-3">Allocation</th>
                        <th className="px-6 py-3">Utilized</th>
                        <th className="px-6 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {projectDepts.length === 0 ? (
                        <tr key="empty-depts">
                          <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">No sub-categories assigned to departments for this project.</td>
                        </tr>
                      ) : (
                        projectDepts.map(dept => (
                          <tr key={dept.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-3.5 font-medium text-slate-800 dark:text-white">
                              {dept.name}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">{format(dept.roll_alloc || 0)}</td>
                            <td className="px-6 py-3.5 text-amber-600 font-medium">{format(dept.roll_util || 0)}</td>
                            <td className={`px-6 py-3.5 text-right font-bold ${(dept.roll_alloc - dept.roll_util) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {format(dept.roll_alloc - dept.roll_util)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Quick Team Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Allocated Team</h2>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full font-medium">{team.length} Members</span>
                </div>
                <div className="space-y-3">
                  {team.slice(0, 5).map(m => (
                    <div key={m.id} className="flex flex-col border-b border-slate-100 dark:border-slate-700 py-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold tracking-tight">#{m.employee_id}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 capitalize">{m.employee_role || 'Member'}</span>
                        </div>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{m.employee_department || 'N/A'}</span>
                      </div>
                      <span className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{m.employee_name}</span>
                    </div>
                  ))}
                  {team.length > 5 && <div className="text-xs text-indigo-600 pt-2 text-center clickable" onClick={()=>setActiveTab('team')}>View all members...</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Team Roster</h2>
              <button onClick={()=>setShowTeamModal(true)} className="btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Users size={16}/> Modify Team
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
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
                            <span className="text-sm text-slate-600 dark:text-slate-400">{m.employee_department || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-sm text-slate-600 dark:text-slate-400 lowercase">{m.employee_email || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium border border-indigo-100 dark:border-indigo-800/50">{m.employee_role || '-'}</span>
                        </td>
                    </tr>
                  ))}
                  {team.length === 0 && <tr key="empty-team"><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No team members assigned yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {/* SUB CATEGORY TAB */}
        {activeTab === 'subcategories' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <ProjectSubCategoryMaster 
                    project={project} 
                    showNotification={showNotif}
                    onRefresh={fetchProjectData}
                    inline={true}
                />
            </div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            {(() => {
              const fmt = (n) => n >= 1_000_000
                ? `${symbol}${(n/1_000_000).toFixed(2)}M`
                : n >= 1_000 ? `${symbol}${(n/1_000).toFixed(1)}K` : format(n);
                
              const { totalAlloc, totalUtil, totalBalance, masterBudget, unallocated, utilPct, allocPct } = budgetStats;

              /* ---------- CHART 1: Donut – Allocation Split ---------- */
              const donutOption = {
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'item',
                  formatter: p => `<b>${p.name}</b><br/>Allocation: ${fmt(p.value)}<br/>Share: ${p.percent.toFixed(1)}%`
                },
                legend: { bottom: 0, left: 'center', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#94a3b8', fontSize: 11 } },
                series: [{
                  type: 'pie',
                  radius: ['48%', '72%'],
                  center: ['50%', '44%'],
                  avoidLabelOverlap: true,
                  itemStyle: { borderRadius: 6, borderColor: '#f8fafc', borderWidth: 3 },
                  label: { show: false },
                  emphasis: {
                    scale: true,
                    label: { show: true, fontSize: 13, fontWeight: 'bold', formatter: p => `${p.percent.toFixed(1)}%` }
                  },
                  data: projectDepts.map(d => ({ value: d.budget_allocation || 0, name: d.name }))
                }],
                color: ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f59e0b','#10b981','#06b6d4','#3b82f6','#14b8a6']
              };

              /* ---------- CHART 2: Grouped Bar – Alloc vs Util ---------- */
              const barOption = {
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' },
                  formatter: params => {
                    const dept = params[0].name;
                    return params.map(p => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px"></span><b>${p.seriesName}</b>: ${fmt(p.value)}`).join('<br/>');
                  }
                },
                legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#94a3b8', fontSize: 11 } },
                grid: { left: 16, right: 16, bottom: 40, top: 36, containLabel: true },
                xAxis: {
                  type: 'category',
                  data: projectDepts.map(d => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name),
                  axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 20 },
                  axisLine: { lineStyle: { color: '#e2e8f0' } }
                },
                yAxis: {
                  type: 'value',
                  axisLabel: { color: '#94a3b8', fontSize: 10, formatter: v => fmt(v) },
                  splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
                },
                series: [
                  {
                    name: 'Allocated',
                    type: 'bar',
                    barMaxWidth: 28,
                    data: projectDepts.map(d => d.budget_allocation || 0),
                    itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#818cf8' }, { offset: 1, color: '#6366f1' }] }, borderRadius: [4, 4, 0, 0] }
                  },
                  {
                    name: 'Utilized',
                    type: 'bar',
                    barMaxWidth: 28,
                    data: projectDepts.map(d => d.utilized_budget || 0),
                    itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#f59e0b' }] }, borderRadius: [4, 4, 0, 0] }
                  }
                ]
              };

              /* ---------- CHART 3: Horizontal Bar – Utilisation % ---------- */
              const hBarOption = {
                backgroundColor: 'transparent',
                tooltip: {
                  trigger: 'axis',
                  axisPointer: { type: 'shadow' },
                  formatter: params => {
                    const p = params[0];
                    const dept = projectDepts.find(d => d.name === p.name || d.name.startsWith(p.name.replace('…', '')));
                    const bal = dept ? fmt(dept.balance_budget || 0) : '$0';
                    return `<b>${p.name}</b><br/>Utilization: <b>${p.value.toFixed(1)}%</b><br/>Balance: ${bal}`;
                  }
                },
                grid: { left: 100, right: 24, bottom: 16, top: 16, containLabel: false },
                xAxis: {
                  type: 'value', max: 100,
                  axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 10 },
                  splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
                },
                yAxis: {
                  type: 'category',
                  data: projectDepts.map(d => d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name),
                  axisLabel: { color: '#64748b', fontSize: 10 },
                  axisLine: { show: false },
                  axisTick: { show: false }
                },
                series: [{
                  type: 'bar',
                  barMaxWidth: 16,
                  data: projectDepts.map(d => {
                    const pct = d.budget_allocation > 0 ? Math.min((d.utilized_budget / d.budget_allocation) * 100, 100) : 0;
                    return {
                      value: pct,
                      itemStyle: {
                        color: pct > 90 ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#ef4444' }] }
                             : pct > 70 ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#fde68a' }, { offset: 1, color: '#f59e0b' }] }
                             :            { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#a5b4fc' }, { offset: 1, color: '#6366f1' }] },
                        borderRadius: [0, 6, 6, 0]
                      }
                    };
                  }),
                  label: { show: true, position: 'right', formatter: p => `${p.value.toFixed(1)}%`, color: '#64748b', fontSize: 10 },
                  backgroundStyle: { color: '#f1f5f9', borderRadius: [0, 6, 6, 0] },
                  showBackground: true
                }]
              };

              const healthBadge = pct => {
                if (pct > 90) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</span>;
                if (pct > 70) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">At Risk</span>;
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">On Track</span>;
              };

              return (
                <>
                  {/* ── TOP REPORT BANNER ── */}
                  <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                      <div>
                        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest">Budget Analysis Report</p>
                        <h2 className="text-xl font-bold mt-0.5">{project.name}</h2>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">{project.status || 'Active'}</span>
                        {allocPct > 100 && <span className="px-3 py-1 rounded-full bg-red-400/40 text-xs font-bold">⚠ Over-allocated</span>}
                        {utilPct > 90 && <span className="px-3 py-1 rounded-full bg-amber-400/40 text-xs font-bold">⚠ Critical Burn</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Master Budget', value: fmt(masterBudget), sub: 'Project Master total' },
                        { label: 'Dept Allocated', value: fmt(totalAlloc), sub: `${allocPct.toFixed(1)}% of master` },
                        { label: 'Utilized', value: fmt(totalUtil), sub: `${utilPct.toFixed(1)}% of allocation` },
                        { label: 'Dept Balance', value: fmt(totalBalance), sub: 'Remaining in depts', highlight: totalBalance < 0 }
                      ].map(c => (
                        <div key={c.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-wider">{c.label}</p>
                          <p className={`text-2xl font-extrabold mt-1 ${c.highlight ? 'text-red-300' : 'text-white'}`}>{c.value}</p>
                          <p className="text-indigo-200/80 text-[10px] mt-0.5">{c.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Dual progress bar: Allocation vs Master, Util vs Alloc */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs text-indigo-200 mb-1">
                          <span>Allocation coverage</span><span>{allocPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${allocPct > 100 ? 'bg-red-400' : 'bg-white'}`} style={{ width: `${Math.min(allocPct, 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-indigo-200 mb-1">
                          <span>Budget utilization</span><span>{utilPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${utilPct > 90 ? 'bg-red-400' : utilPct > 70 ? 'bg-yellow-300' : 'bg-emerald-400'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Unallocated stat */}
                    {masterBudget > 0 && (
                      <div className="mt-4 flex items-center gap-2 text-sm bg-white/10 rounded-xl px-4 py-2 w-fit border border-white/20">
                        <span className="text-indigo-200">Unallocated Budget:</span>
                        <span className={`font-bold ${unallocated < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{fmt(Math.abs(unallocated))}</span>
                        <span className="text-indigo-200 text-xs">{unallocated < 0 ? '(over-allocated)' : 'available'}</span>
                      </div>
                    )}
                  </div>

                  {/* ── CHARTS ROW ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Donut */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allocation Split</p>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5 mb-4">By Department</h3>
                      <div className="h-[260px]">
                        {projectDepts.length > 0
                          ? <ReactECharts option={donutOption} style={{ height: '100%', width: '100%' }} />
                          : <div className="flex h-full items-center justify-center text-slate-400 text-sm">No department data</div>
                        }
                      </div>
                    </div>

                    {/* Grouped Bar */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comparison</p>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5 mb-4">Allocated vs Utilized</h3>
                      <div className="h-[260px]">
                        {projectDepts.length > 0
                          ? <ReactECharts option={barOption} style={{ height: '100%', width: '100%' }} />
                          : <div className="flex h-full items-center justify-center text-slate-400 text-sm">No department data</div>
                        }
                      </div>
                    </div>

                    {/* Horizontal Utilisation Bar */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Burn Rate</p>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5 mb-4">Utilization % per Dept</h3>
                      <div className="h-[260px]">
                        {projectDepts.length > 0
                          ? <ReactECharts option={hBarOption} style={{ height: '100%', width: '100%' }} />
                          : <div className="flex h-full items-center justify-center text-slate-400 text-sm">No department data</div>
                        }
                      </div>
                    </div>
                  </div>

                  {/* ── DETAIL TABLE ── */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Department-wise Budget Detail</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{projectDepts.length} departments linked to this project</p>
                      </div>
                      <div className="flex gap-2 text-[10px] items-center">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>On Track</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>At Risk</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Critical</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          <tr>
                            <th className="px-6 py-3 text-left">Department</th>
                            <th className="px-6 py-3 text-right">Allocated</th>
                            <th className="px-6 py-3 text-right">Utilized</th>
                            <th className="px-6 py-3 text-right">Balance</th>
                            <th className="px-6 py-3 text-center min-w-[140px]">Utilization</th>
                            <th className="px-6 py-3 text-center">Health</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                          {projectDepts.length === 0 && (
                            <tr key="empty-budget-detail"><td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic text-sm">No departments allocated to this project yet.</td></tr>
                          )}
                          {projectDepts.map(d => {
                            const uPct = d.budget_allocation > 0 ? Math.min((d.utilized_budget / d.budget_allocation) * 100, 100) : 0;
                            const bal = d.balance_budget || 0;
                            return (
                              <tr key={d.name} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-3.5">
                                  <span className="font-semibold text-slate-800 dark:text-white">{d.name}</span>
                                </td>
                                <td className="px-6 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(d.budget_allocation || 0)}</td>
                                <td className="px-6 py-3.5 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">{fmt(d.utilized_budget || 0)}</td>
                                <td className={`px-6 py-3.5 text-right font-mono font-bold ${bal < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(bal)}</td>
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${uPct > 90 ? 'bg-red-500' : uPct > 70 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                                        style={{ width: `${uPct}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-500 w-8 text-right">{uPct.toFixed(0)}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-center">{healthBadge(uPct)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {projectDepts.length > 0 && (
                          <tfoot className="bg-slate-50 dark:bg-slate-900/40 border-t-2 border-slate-200 dark:border-slate-600">
                            <tr>
                              <td className="px-6 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">Totals</td>
                              <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{fmt(totalAlloc)}</td>
                              <td className="px-6 py-3 text-right font-mono text-xs font-bold text-amber-600">{fmt(totalUtil)}</td>
                              <td className={`px-6 py-3 text-right font-mono text-xs font-bold ${totalBalance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(totalBalance)}</td>
                              <td className="px-6 py-3 text-center">
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${utilPct > 90 ? 'bg-red-500' : utilPct > 70 ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] text-slate-500">{utilPct.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-center">{healthBadge(utilPct)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Activity Logs</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Chronological history of project & sub-category changes</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                <History size={12} />
                <span>{logs.length} total actions recorded</span>
              </div>
            </div>
            
            <div className="p-6">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                      <Clock size={32} className="opacity-20" />
                   </div>
                   <p className="text-sm font-medium">No activity recorded for this project yet.</p>
                   <p className="text-[10px] text-slate-400 mt-1">Changes to project master or sub-categories will appear here.</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-700/50">
                  {logs.map((log, idx) => {
                    const isActionCreate = log.action === 'CREATED';
                    const isActionUpdate = log.action === 'UPDATED';
                    const isActionDelete = log.action === 'DELETED';
                    
                    return (
                      <div key={log.id} className="relative pl-12 group">
                        {/* Timeline Marker */}
                        <div className={`absolute left-0 top-0 w-9 h-9 rounded-xl flex items-center justify-center z-10 transition-all group-hover:scale-110 shadow-sm
                          ${isActionCreate ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                            isActionUpdate ? 'bg-blue-600 text-white shadow-blue-500/20' : 
                            'bg-red-500 text-white shadow-red-500/20'}`}
                        >
                          {isActionCreate ? <CheckCircle size={18} /> : 
                           isActionUpdate ? <Edit size={18} /> : 
                           <Trash2 size={18} />}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                           <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-lg
                               ${isActionCreate ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 
                                 isActionUpdate ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 
                                 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}
                             >
                               {log.action}
                             </span>
                             <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.module}</span>
                           </div>
                           <div className="flex items-center gap-3 text-[10px] text-slate-400">
                             <div className="flex items-center gap-1.5">
                               <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-600">
                                 <User size={10} />
                               </div>
                               <span className="font-bold text-slate-700 dark:text-slate-200">{log.user_name || log.user_id || 'System'}</span>
                               {log.user_role && (
                                 <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 font-medium">
                                   {log.user_role}
                                 </span>
                                )}
                             </div>
                             <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                             <div className="flex items-center gap-1">
                               <Clock size={10} />
                               <span>{new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                             </div>
                           </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-all">
                           <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {isActionCreate && `New ${log.module === 'Sub Category' ? 'sub-category entry' : 'project master'} was established.`}
                              {isActionUpdate && `Modification applied to ${log.module === 'Sub Category' ? `sub-category "${log.details?.sub_category || 'Unknown'}"` : 'the project master'}.`}
                              {isActionDelete && `Removal of ${log.module === 'Sub Category' ? `sub-category "${log.details?.sub_category || 'Unknown'}"` : 'the project'} completed.`}
                           </p>
                           
                           {log.details && Object.keys(log.details).length > 0 && (
                             <div className="mt-3 flex flex-wrap gap-2">
                               {Object.entries(log.details).map(([key, val]) => (
                                 <div key={key} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px]">
                                   <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                                   <span className="font-bold text-slate-700 dark:text-slate-200">
                                      {typeof val === 'number' ? 
                                        (key.includes('value') || key.includes('budget') ? format(val) : val.toLocaleString()) : 
                                        String(val)}
                                   </span>
                                 </div>
                               ))}
                             </div>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* Modals */}
      <ManageTeamModal 
        isOpen={showTeamModal} 
        onClose={()=>setShowTeamModal(false)}
        project={project}
        onTeamUpdated={fetchProjectData}
      />
    </div>
  );
};

export default ProjectDetail;
