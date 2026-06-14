import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Clock,
  MessageSquare,
  Save,
  Users,
  Database,
  Wallet
} from 'lucide-react';
import './ModulesPanel.css';

const ModulesPanel = ({
  projects,
  handleProjectSelect,
  dispatch,
  setActiveModule,
  setExpandedModules,
  navigate
}) => {
  const meetingsItems = [
    { label: 'Calendar', path: '/dashboard/calendar', moduleId: 'calendar', icon: <Calendar size={12} className="item-icon" /> },
    { label: 'Schedule Meeting', path: '/dashboard/schedule-meeting', moduleId: 'schedule-meeting', icon: <Clock size={12} className="item-icon" /> },
    { label: 'Minutes of Meeting', path: '/dashboard/mom', moduleId: 'mom-module', icon: <MessageSquare size={12} className="item-icon" /> },
    { label: 'Saved MOMs', path: '/dashboard/saved-moms', moduleId: 'saved-moms', icon: <Save size={12} className="item-icon" /> }
  ];

  const masterItems = [
    { label: 'Employee Master', path: '/dashboard/masters/employees', moduleId: 'employee-master', icon: <Users size={12} className="item-icon" /> },
    { label: 'Project Master', path: '/dashboard/masters/project-master', moduleId: 'project-master', icon: <FolderKanban size={12} className="item-icon" /> },
    { label: 'Budget Master', path: '/dashboard/masters/budget-master', moduleId: 'budget-master', icon: <Wallet size={12} className="item-icon" /> }
  ];

  return (
    <div className="modules-panel-col modules-panel-container">
      {/* Centralized section title header */}
      <div className="modules-header-row">
        <div className="title-accent-group">
          <span className="accent-bar" />
          <h2 className="section-title">Application Modules</h2>
        </div>
      </div>

      {/* Modules Cards Stack */}
      <div className="modules-stack">
        
        {/* Dashboard Card */}
        <div className="module-card card-dashboard">
          <button
            className="module-card-header"
            onClick={() => {
              dispatch(setActiveModule('project-dashboard'));
              navigate('/dashboard/projects');
            }}
          >
            <div className="header-icon-container">
              <LayoutDashboard size={14} className="header-icon" />
            </div>
            <div className="header-info">
              <span className="header-title">Dashboard</span>
              <span className="header-subtext">Project tracking & analytics</span>
            </div>
          </button>
          
          <div className="module-card-items">
            <button
              className="module-sub-item primary-sub-item"
              onClick={() => {
                dispatch(setActiveModule('project-dashboard'));
                navigate('/dashboard/projects');
              }}
            >
              <FolderKanban size={12} className="item-icon" />
              Project Dashboard
            </button>
            {projects.slice(0, 3).map((p) => (
              <button
                key={p.id}
                className="module-sub-item"
                onClick={() => handleProjectSelect(p.id)}
              >
                <FolderKanban size={12} className="item-icon" />
                {p.name}
              </button>
            ))}
            {projects.length > 3 && (
              <div className="more-projects-label">
                +{projects.length - 3} more projects
              </div>
            )}
          </div>
        </div>

        {/* Meetings Card */}
        <div className="module-card card-meetings">
          <div className="module-card-header static">
            <div className="header-icon-container">
              <Calendar size={14} className="header-icon" />
            </div>
            <div className="header-info">
              <span className="header-title">Meetings</span>
              <span className="header-subtext">MOM, scheduling & calendar</span>
            </div>
          </div>
          
          <div className="module-card-items">
            {meetingsItems.map((item) => (
              <button
                key={item.moduleId}
                className="module-sub-item"
                onClick={() => {
                  dispatch(setActiveModule(item.moduleId));
                  dispatch(setExpandedModules({ mom: true }));
                  navigate(item.path);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master Card */}
        <div className="module-card card-master">
          <button
            className="module-card-header"
            onClick={() => {
              dispatch(setActiveModule('masters-main'));
              dispatch(setExpandedModules({ masters: true }));
              navigate('/dashboard/masters/employees');
            }}
          >
            <div className="header-icon-container">
              <Database size={14} className="header-icon" />
            </div>
            <div className="header-info">
              <span className="header-title">Master</span>
              <span className="header-subtext">Configuration & data management</span>
            </div>
          </button>
          
          <div className="module-card-items">
            {masterItems.map((item) => (
              <button
                key={item.moduleId}
                className="module-sub-item"
                onClick={() => {
                  dispatch(setActiveModule(item.moduleId));
                  dispatch(setExpandedModules({ masters: true }));
                  navigate(item.path);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModulesPanel;
