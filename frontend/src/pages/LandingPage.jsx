import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const apps = [
    {
      id: 'analytics',
      title: 'Analytics',
      path: '/analytics',
      desc: 'Drill down from board-level summaries to unit-level data in seconds.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M3 3v18h18M7 14l4-4 4 4 6-6M7 14v4M11 10v8M15 14v4M21 8v10" />
        </svg>
      )
    },
    {
      id: 'meetings',
      title: 'Minutes & Meetings',
      path: '/meetings',
      desc: 'Intelligent scheduling with auto-capture meeting records. Action items assigned, tracked, and escalated automatically.',
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
      path: '/budget',
      desc: 'Track global portfolio expenditure vs strategic planning. Variance alerts before they become escalations.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'governance',
      title: 'Team Governance',
      path: '/governance',
      desc: 'Role-based access controls and audit logging. Full compliance-ready access trails for ISO and SOC 2 audits.',
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
            <a href="#products" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); const el = document.getElementById('products'); if(el) el.scrollIntoView({behavior: 'smooth'}); }}>Products</a>
            <a href="/customers" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); navigate('/customers'); }}>Customers</a>
            <a href="/pricing" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Pricing</a>
            <a href="/enterprise" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); navigate('/enterprise'); }}>Enterprise</a>
            <button className="zoho-nav-login" onClick={() => navigate('/workspace-login')}>
              Sign In
            </button>
            <button className="zoho-btn-primary" onClick={() => navigate('/workspace-login')}>
              Access Workspace
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="zoho-hero">
        <div className="zoho-hero-inner">
          
          <div className="zoho-hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              Trusted by enterprise leaders
            </div>
            <h1 className="zoho-hero-title">
              The operating system for <span className="text-brand-red">business intelligence.</span>
            </h1>
            <p className="zoho-hero-desc">
              Manage your corporate portfolio, track meeting workflows, and monitor budgets through a single unified suite. Designed for absolute operational control.
            </p>
            <div className="zoho-hero-actions">
              <button className="zoho-btn-primary zoho-btn-lg" onClick={() => navigate('/workspace-login')}>
                Get Started
              </button>
              <button className="zoho-btn-ghost zoho-btn-lg" onClick={() => navigate('/workspace-login')}>
                Request a Demo
              </button>
            </div>
            <div className="hero-trust-row">
              <div className="hero-avatars">
                <div className="hero-avatar">VP</div>
                <div className="hero-avatar">MD</div>
                <div className="hero-avatar">CX</div>
                <div className="hero-avatar">GM</div>
              </div>
              <span className="hero-trust-text">Loved by 2,400+ leaders across Fortune 500s</span>
            </div>
          </div>

          <div className="zoho-hero-visual">
            <div className="dashboard-mock">
              <div className="dash-header">
                <span className="dash-title">Portfolio Status — Q2 2026</span>
                <span className="dash-live-pill">Live</span>
              </div>
              <div className="dash-kpi-grid">
                <div className="dash-kpi">
                  <span className="kpi-label">Revenue YTD</span>
                  <div className="kpi-val-row">
                    <span className="kpi-val">₹48.2Cr</span>
                    <span className="kpi-trend positive">+14.3% vs plan</span>
                  </div>
                </div>
                <div className="dash-kpi">
                  <span className="kpi-label">Active Projects</span>
                  <div className="kpi-val-row">
                    <span className="kpi-val">137</span>
                    <span className="kpi-trend neutral">+8 this month</span>
                  </div>
                </div>
                <div className="dash-kpi">
                  <span className="kpi-label">Budget Utilized</span>
                  <div className="kpi-val-row">
                    <span className="kpi-val">68%</span>
                    <span className="kpi-trend negative">-2% behind</span>
                  </div>
                </div>
                <div className="dash-kpi">
                  <span className="kpi-label">Meeting Efficiency</span>
                  <div className="kpi-val-row">
                    <span className="kpi-val">91%</span>
                    <span className="kpi-trend neutral">On track</span>
                  </div>
                </div>
              </div>
              <div className="dash-bars">
                <div className="dash-bar-row">
                  <span className="bar-label">Q1</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: '72%'}}></div></div>
                  <span className="bar-val">72%</span>
                </div>
                <div className="dash-bar-row">
                  <span className="bar-label">Q2</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: '88%'}}></div></div>
                  <span className="bar-val">88%</span>
                </div>
                <div className="dash-bar-row">
                  <span className="bar-label">Q3</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: '54%'}}></div></div>
                  <span className="bar-val">54%</span>
                </div>
              </div>
              <div className="dash-floating-card">
                <svg className="float-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <div className="float-text">
                  <span className="float-title">Board report generated</span>
                  <span className="float-sub">Auto-synced 2 min ago</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ── LOGO STRIP ── */}
      <section className="logo-strip-section">
        <div className="logo-strip-inner">
          <p className="logo-strip-label">TRUSTED BY INDUSTRY LEADERS</p>
          <div className="logo-strip-logos">
            <span>MAHINDRA</span>
            <span className="dot">·</span>
            <span>TATA GROUP</span>
            <span className="dot">·</span>
            <span>AIRBUS</span>
            <span className="dot">·</span>
            <span>HDFC</span>
            <span className="dot">·</span>
            <span>LEYLAND</span>
            <span className="dot">·</span>
            <span>L&T</span>
          </div>
        </div>
      </section>

      {/* ── TWO-COLUMN HIGHLIGHT GRID ── */}
      <section id="products" className="zoho-apps-section">
        <div className="zoho-apps-inner">
          <div className="zoho-apps-grid">
            {apps.map(app => (
              <div key={app.id} className="zoho-app-card" onClick={() => navigate(app.path)} style={{cursor: 'pointer'}}>
                <div className="zoho-app-icon">
                  {app.icon}
                </div>
                <div className="zoho-app-info">
                  <h3 className="zoho-app-title">{app.title}</h3>
                  <p className="zoho-app-desc">{app.desc}</p>
                  <button className="zoho-app-link" onClick={(e) => { e.stopPropagation(); navigate(app.path); }}>
                    Launch module <span className="zoho-arrow">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BY THE NUMBERS ── */}
      <section className="stats-section">
        <div className="stats-inner">
          <p className="stats-label">BY THE NUMBERS</p>
          <h2 className="stats-title">Enterprises don't guess. They measure.</h2>
          <div className="stats-grid">
            <div className="stat-block">
              <h3 className="stat-val">2,400+</h3>
              <p className="stat-desc">Enterprise users across manufacturing, finance, and logistics</p>
            </div>
            <div className="stat-block">
              <h3 className="stat-val">38%</h3>
              <p className="stat-desc">Average reduction in board meeting prep time within 90 days</p>
            </div>
            <div className="stat-block">
              <h3 className="stat-val">99.9%</h3>
              <p className="stat-desc">Uptime SLA, enterprise-grade reliability</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bottom-cta-section">
        <div className="bottom-cta-box">
          <h2 className="bottom-cta-title">Ready to give your leadership team a single source of truth?</h2>
          <p className="bottom-cta-desc">Set up your workspace in under 10 minutes. No credit card required for the first 30 days.</p>
          <div className="bottom-cta-actions">
            <button className="cta-btn-white" onClick={() => navigate('/workspace-login')}>Access Workspace</button>
            <button className="cta-btn-ghost" onClick={() => navigate('/workspace-login')}>Talk to Enterprise Sales</button>
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
