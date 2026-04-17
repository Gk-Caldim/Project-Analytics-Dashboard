import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const apps = [
    {
      id: 'analytics',
      title: 'Analytics',
      desc: 'Real-time corporate dashboards and executive KPIs.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M3 3v18h18M7 14l4-4 4 4 6-6M7 14v4M11 10v8M15 14v4M21 8v10" />
        </svg>
      )
    },
    {
      id: 'mom',
      title: 'Minutes & Meetings',
      desc: 'Intelligent scheduling with auto-capture meeting records.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="square" strokeLinejoin="miter" />
          <path strokeLinecap="square" strokeLinejoin="miter" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    },
    {
      id: 'budget',
      title: 'Budget Intelligence',
      desc: 'Track global portfolio expenditure vs strategic planning.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'governance',
      title: 'Team Governance',
      desc: 'Role-based access controls and audit logging.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" strokeLinecap="square" strokeLinejoin="miter" />
          <path strokeLinecap="square" strokeLinejoin="miter" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ];

  return (
    <div className="zoho-lp-root">
      
      {/* ── NAVBAR ── */}
      <nav className="zoho-nav">
        <div className="zoho-nav-inner">
          <div className="zoho-logo-area">
            <div className="zoho-logo-box"></div>
            <span className="zoho-logo-text">Industrial Analytics Workspace</span>
          </div>
          
          <div className="zoho-nav-right">
            <a href="#products" className="zoho-nav-link">Products</a>
            <a href="#customers" className="zoho-nav-link">Customers</a>
            <button className="zoho-nav-login" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="zoho-btn-primary" onClick={() => navigate('/login')}>
              Access Workspace
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="zoho-hero">
        <div className="zoho-hero-inner">
          
          <div className="zoho-hero-content">
            <h1 className="zoho-hero-title">
              The operating system for business intelligence.
            </h1>
            <p className="zoho-hero-desc">
              Manage your corporate portfolio, track meeting workflows, and monitor budgets through a single unified suite. Designed for absolute operational control.
            </p>
            <div className="zoho-hero-actions">
              <button className="zoho-btn-primary zoho-btn-lg" onClick={() => navigate('/login')}>
                Get Started
              </button>
            </div>
          </div>

          <div className="zoho-hero-visual">
            <div className="zoho-hero-card-stack">
              <div className="zoho-hero-card front">
                <div className="zoho-card-header">
                  <span className="zoho-card-title">Portfolio Status</span>
                  <span className="zoho-card-indicator line-red"></span>
                </div>
                <div className="zoho-card-body">
                  <div className="zoho-fake-line"></div>
                  <div className="zoho-fake-line short"></div>
                </div>
              </div>
              <div className="zoho-hero-card middle"></div>
              <div className="zoho-hero-card back"></div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ── TWO-COLUMN HIGHLIGHT GRID ── */}
      <section id="products" className="zoho-apps-section">
        <div className="zoho-apps-inner">
          <div className="zoho-apps-grid">
            {apps.map(app => (
              <div key={app.id} className="zoho-app-card">
                <div className="zoho-app-icon">
                  {app.icon}
                </div>
                <div className="zoho-app-info">
                  <h3 className="zoho-app-title">{app.title}</h3>
                  <p className="zoho-app-desc">{app.desc}</p>
                  <button className="zoho-app-link" onClick={() => navigate('/login')}>
                    Launch module <span className="zoho-arrow">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="zoho-footer">
        <div className="zoho-footer-inner">
          <div className="zoho-logo-area">
            <div className="zoho-logo-box"></div>
            <span className="zoho-logo-text">Industrial Analytics Workspace</span>
          </div>
          <div className="zoho-footer-links">
            <span className="zoho-footer-text">© {new Date().getFullYear()} Corporation All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
