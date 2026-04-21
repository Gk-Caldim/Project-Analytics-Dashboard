import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart2,
  MessageSquare,
  Wallet,
  Gavel,
  Settings,
  HelpCircle,
  LogOut,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './WorkspaceDashboard.css';

const WorkspaceDashboard = () => {
  const navigate = useNavigate();

  const activityData = [
    { id: 1, type: 'green', text: '"Q2 Analytics dashboard synced"', time: '2 hours ago' },
    { id: 2, type: 'green', text: '"Board meeting minutes captured — Apr 15"', time: 'Yesterday' },
    { id: 3, type: 'amber', text: '"Budget alert: R&D unit at 91% utilization"', time: '2 days ago' },
    { id: 4, type: 'red', text: '"Action item overdue: Vikram — Supply chain review"', time: '3 days ago' },
    { id: 5, type: 'gray', text: '"3 new users invited to Governance module"', time: 'Apr 12' },
  ];

  const modules = [
    {
      id: 'analytics',
      title: 'Analytics',
      status: 'Connected',
      statusType: 'green',
      icon: <BarChart2 size={24} />,
      cta: 'View dashboards'
    },
    {
      id: 'meetings',
      title: 'Minutes & Meetings',
      status: 'Connected',
      statusType: 'green',
      icon: <MessageSquare size={24} />,
      cta: 'View records'
    },
    {
      id: 'budget',
      title: 'Budget Intelligence',
      status: 'Not configured',
      statusType: 'amber',
      icon: <Wallet size={24} />,
      cta: 'Setup module'
    },
    {
      id: 'governance',
      title: 'Team Governance',
      status: 'Not configured',
      statusType: 'amber',
      icon: <Gavel size={24} />,
      cta: 'Setup module'
    },
  ];

  return (
    <div className="ws-dash-root">

      {/* ── SIDEBAR ── */}
      <aside className="ws-sidebar">
        <div className="ws-sidebar-top">
          <div className="ws-sidebar-logo" onClick={() => navigate('/')}>
            <div className="ws-logo-box"></div>
            <span className="ws-logo-text">Industrial Analytics</span>
          </div>

          <nav className="ws-side-nav">
            <div className="ws-nav-item active" style={{cursor:'pointer'}} onClick={() => navigate('/workspace-dashboard')}>
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </div>
            <div className="ws-nav-item" style={{cursor:'pointer'}} onClick={() => navigate('/analytics')}>
              <BarChart2 size={18} />
              <span>Analytics</span>
            </div>
            <div className="ws-nav-item" style={{cursor:'pointer'}} onClick={() => navigate('/meetings')}>
              <MessageSquare size={18} />
              <span>Meetings</span>
            </div>
            <div className="ws-nav-item" style={{cursor:'pointer'}} onClick={() => navigate('/budget')}>
              <Wallet size={18} />
              <span>Budget</span>
            </div>
            <div className="ws-nav-item" style={{cursor:'pointer'}} onClick={() => navigate('/governance')}>
              <Gavel size={18} />
              <span>Governance</span>
            </div>
          </nav>
        </div>

        <div className="ws-sidebar-bottom">
          <div className="ws-nav-item" style={{cursor:'pointer'}} onClick={() => navigate('/dashboard/settings')}>
            <Settings size={18} />
            <span>Settings</span>
          </div>
          <div className="ws-nav-item">
            <HelpCircle size={18} />
            <span>Help</span>
          </div>
          <div className="ws-user-profile">
            <div className="ws-user-avatar">PK</div>
            <div className="ws-user-info">
              <span className="ws-user-name">Pradeep K.</span>
              <span className="ws-user-role">Admin</span>
            </div>
            <LogOut size={14} className="ws-logout-icon" onClick={() => navigate('/workspace-login')} />
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="ws-main">

        {/* Navbar */}
        <header className="ws-navbar">
          <div className="ws-nav-inner">
            <div className="ws-nav-left"></div>
            <div className="ws-nav-right">
              <a href="/pricing" className="ws-nav-link" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Pricing</a>
              <div className="ws-nav-user">
                <div className="ws-user-avatar small">PK</div>
                <span className="ws-nav-user-name">Pradeep K.</span>
              </div>
            </div>
          </div>
        </header>

        <div className="ws-content">
          <div className="ws-greeting">
            <h1 className="ws-greeting-title">Good morning, Pradeep. Here's your workspace overview.</h1>
            <p className="ws-greeting-date">Saturday, April 18, 2026</p>
          </div>

          <div className="ws-onboarding-banner">
            <div className="ws-banner-content">
              <h3 className="ws-banner-title">Complete your setup — 2 of 4 steps done</h3>
              <div className="ws-progress-row">
                <div className="ws-progress-track">
                  <div className="ws-progress-fill" style={{ width: '50%' }}></div>
                </div>
                <span className="ws-progress-percent">50%</span>
              </div>
            </div>
            <button className="ws-banner-btn">
              Continue Setup <ArrowRight size={16} />
            </button>
          </div>

          <div className="ws-dashboard-grid">

            {/* Module Grid */}
            <div className="ws-grid-left">
              <div className="ws-module-grid">
                {modules.map(mod => (
                  <div key={mod.id} className="ws-module-card" style={{cursor:'pointer'}} onClick={() => navigate(`/${mod.id}`)}>  
                    <div className="ws-mod-header">
                      <div className="ws-mod-icon-wrapper">
                        {mod.icon}
                      </div>
                      <span className={`ws-mod-status ${mod.statusType}`}>
                        {mod.status}
                      </span>
                    </div>
                    <div className="ws-mod-body">
                      <h4 className="ws-mod-title">{mod.title}</h4>
                      <span className="ws-mod-cta">{mod.cta} →</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ws-activity-section">
                <h3 className="ws-section-title">Recent Activity</h3>
                <div className="ws-activity-list">
                  {activityData.map(act => (
                    <div key={act.id} className="ws-activity-row">
                      <div className={`ws-activity-dot ${act.type}`}></div>
                      <span className="ws-activity-text">{act.text}</span>
                      <span className="ws-activity-time">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <aside className="ws-grid-right">
              <div className="ws-quick-actions-card">
                <h3 className="ws-qa-title">Quick Actions</h3>
                <div className="ws-qa-buttons">
                  <button className="ws-qa-btn" onClick={() => navigate('/analytics')}>View Analytics</button>
                  <button className="ws-qa-btn" onClick={() => navigate('/meetings')}>Start a Meeting</button>
                  <button className="ws-qa-btn" onClick={() => navigate('/budget')}>Check Budget</button>
                  <button className="ws-qa-btn" onClick={() => navigate('/governance')}>Manage Users</button>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceDashboard;
