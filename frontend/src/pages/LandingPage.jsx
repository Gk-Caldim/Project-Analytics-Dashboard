import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { LeadModal } from '../components/LeadModal';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUseCase, setModalUseCase] = useState('General Inquiry');
  const [modalMode, setModalMode] = useState('sales');

  React.useEffect(() => {
    if (location.hash === '#products') {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  const openModal = (mode = 'sales', useCase = 'General Inquiry') => {
    setModalMode(mode);
    setModalUseCase(useCase);
    setIsModalOpen(true);
  };

  const apps = [
    {
      id: 'analytics',
      title: 'Analytics',
      path: '/analytics',
      desc: 'Drill down from board-level summaries to unit-level data in seconds.',
      features: ['Real-time Telemetry', 'Multi-variant Charts', 'Drilldown Grid'],
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
      features: ['AI Transcription', 'Task Auto-Assign', 'ISO Compliance'],
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
      features: ['Variance Alerts', 'Forecasting Engine', 'Multi-currency Config'],
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
      features: ['SOC 2 Audit Trails', 'Granular RBAC', 'MFA Enforcement'],
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
      
      <PublicNavbar />

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialUseCase={modalUseCase}
        mode={modalMode}
      />

      {/* ── HERO ── */}
      <section className="zoho-hero">
        <div className="zoho-hero-inner">
          
          <div className="zoho-hero-content">

            <h1 className="zoho-hero-title">
              The operating system for <span className="text-brand-primary">business intelligence.</span>
            </h1>
            <p className="zoho-hero-desc">
              Manage your corporate portfolio, track meeting workflows, and monitor budgets through a single unified suite. Designed for absolute operational control.
            </p>
            <div className="zoho-hero-actions">
              <button className="zoho-btn-primary zoho-btn-lg" onClick={() => navigate('/login')}>
                Get Started
              </button>
              <button className="zoho-btn-ghost zoho-btn-lg" onClick={() => openModal('demo')}>
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
              {/* Browser Window Header */}
              <div className="mock-window-header">
                <div className="mock-window-dots">
                  <span className="mock-dot red"></span>
                  <span className="mock-dot yellow"></span>
                  <span className="mock-dot green"></span>
                </div>
                <div className="mock-window-title">workspace.industrialanalytics.com</div>
              </div>

              <div className="mock-window-body">
                {/* Sidebar Mock inside dashboard */}
                <div className="mock-sidebar">
                  <div className="mock-sidebar-logo">
                    <svg className="mock-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#2563EB" />
                      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="#10B981" />
                      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="#F59E0B" />
                      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#EF4444" />
                    </svg>
                  </div>
                  <div className="mock-sidebar-nav">
                    <div className="mock-nav-item active">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mock-nav-svg">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                      </svg>
                    </div>
                    <div className="mock-nav-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mock-nav-svg">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div className="mock-nav-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mock-nav-svg">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <div className="mock-nav-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mock-nav-svg">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Main Content inside dashboard mockup */}
                <div className="mock-main">
                  <div className="dash-header">
                    <span className="dash-title">Portfolio Status — Q2 2026</span>
                    <span className="dash-live-pill">Live Telemetry</span>
                  </div>
                  
                  <div className="dash-kpi-grid">
                    <div className="dash-kpi">
                      <span className="kpi-label">Revenue YTD</span>
                      <div className="kpi-val-row">
                        <span className="kpi-val">₹48.2Cr</span>
                        <span className="kpi-trend positive">+14.3%</span>
                      </div>
                      <div className="sparkline-wrapper">
                        <svg className="sparkline-svg" viewBox="0 0 100 30" width="100%" height="30">
                          <defs>
                            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 25 L15 22 L30 15 L45 18 L60 8 L75 12 L90 3 L100 5 L100 30 L0 30 Z" fill="url(#blueGrad)"/>
                          <path d="M0 25 L15 22 L30 15 L45 18 L60 8 L75 12 L90 3 L100 5" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="100" cy="5" r="3" fill="#2563EB"/>
                        </svg>
                      </div>
                    </div>

                    <div className="dash-kpi">
                      <span className="kpi-label">Active Projects</span>
                      <div className="kpi-val-row">
                        <span className="kpi-val">137</span>
                        <span className="kpi-trend positive">+8</span>
                      </div>
                      <div className="sparkline-wrapper">
                        <svg className="sparkline-svg" viewBox="0 0 100 30" width="100%" height="30">
                          <defs>
                            <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 28 L15 28 L30 20 L45 22 L60 14 L75 10 L90 4 L100 2 L100 30 L0 30 Z" fill="url(#tealGrad)"/>
                          <path d="M0 28 L15 28 L30 20 L45 22 L60 14 L75 10 L90 4 L100 2" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="100" cy="2" r="3" fill="#10B981"/>
                        </svg>
                      </div>
                    </div>

                    <div className="dash-kpi">
                      <span className="kpi-label">Budget Utilized</span>
                      <div className="kpi-val-row">
                        <span className="kpi-val">68%</span>
                        <span className="kpi-trend negative">-2%</span>
                      </div>
                      <div className="sparkline-wrapper">
                        <svg className="sparkline-svg" viewBox="0 0 100 30" width="100%" height="30">
                          <defs>
                            <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 10 L15 14 L30 18 L45 12 L60 22 L75 18 L90 20 L100 24 L100 30 L0 30 Z" fill="url(#orangeGrad)"/>
                          <path d="M0 10 L15 14 L30 18 L45 12 L60 22 L75 18 L90 20 L100 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="100" cy="24" r="3" fill="#F59E0B"/>
                        </svg>
                      </div>
                    </div>

                    <div className="dash-kpi">
                      <span className="kpi-label">Meeting Efficiency</span>
                      <div className="kpi-val-row">
                        <span className="kpi-val">91%</span>
                        <span className="kpi-trend neutral">Stable</span>
                      </div>
                      <div className="sparkline-wrapper">
                        <svg className="sparkline-svg" viewBox="0 0 100 30" width="100%" height="30">
                          <defs>
                            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/>
                              <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 8 L15 9 L30 6 L45 8 L60 4 L75 6 L90 5 L100 4 L100 30 L0 30 Z" fill="url(#greenGrad)"/>
                          <path d="M0 8 L15 9 L30 6 L45 8 L60 4 L75 6 L90 5 L100 4" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="100" cy="4" r="3" fill="#10B981"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="dash-bars">
                    <div className="dash-bar-row">
                      <span className="bar-label">Q1</span>
                      <div className="bar-track"><div className="bar-fill q1" style={{ width: '72%' }}></div></div>
                      <span className="bar-val">72%</span>
                    </div>
                    <div className="dash-bar-row">
                      <span className="bar-label">Q2</span>
                      <div className="bar-track"><div className="bar-fill q2" style={{ width: '88%' }}></div></div>
                      <span className="bar-val">88%</span>
                    </div>
                    <div className="dash-bar-row">
                      <span className="bar-label">Q3</span>
                      <div className="bar-track"><div className="bar-fill q3" style={{ width: '54%' }}></div></div>
                      <span className="bar-val">54%</span>
                    </div>
                  </div>
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
          <div className="section-header">
            <span className="section-tag">Enterprise Modules</span>
            <h2 className="section-title">Robust modular applications for complete operational command</h2>
          </div>
          
          <div className="zoho-apps-grid">
            {apps.map(app => (
              <div key={app.id} className="zoho-app-card" onClick={() => navigate(app.path)} style={{cursor: 'pointer'}}>
                <div className="zoho-app-icon-wrapper">
                  <div className="zoho-app-icon">
                    {app.icon}
                  </div>
                </div>
                <div className="zoho-app-info">
                  <h3 className="zoho-app-title">{app.title}</h3>
                  <p className="zoho-app-desc">{app.desc}</p>
                  
                  {/* High Information Density: Feature Pills */}
                  <div className="zoho-app-features">
                    {app.features.map((feat, idx) => (
                      <span key={idx} className="zoho-app-feat-pill">{feat}</span>
                    ))}
                  </div>

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
          <span className="stats-label">BY THE NUMBERS</span>
          <h2 className="stats-title">Enterprises don't guess. They measure.</h2>
          <div className="stats-grid">
            <div className="stat-block">
              <span className="stat-accent-bar"></span>
              <h3 className="stat-val">2,400+</h3>
              <p className="stat-desc">Enterprise users across manufacturing, finance, and logistics</p>
            </div>
            <div className="stat-block">
              <span className="stat-accent-bar"></span>
              <h3 className="stat-val">38%</h3>
              <p className="stat-desc">Average reduction in board meeting prep time within 90 days</p>
            </div>
            <div className="stat-block">
              <span className="stat-accent-bar"></span>
              <h3 className="stat-val">99.9%</h3>
              <p className="stat-desc">Uptime SLA, enterprise-grade reliability</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bottom-cta-section">
        <div className="bottom-cta-box">
          <div className="bottom-cta-glow"></div>
          <h2 className="bottom-cta-title">Ready to give your leadership team a single source of truth?</h2>
          <p className="bottom-cta-desc">Set up your workspace in under 10 minutes. No credit card required for the first 30 days.</p>
          <div className="bottom-cta-actions">
            <button className="cta-btn-white" onClick={() => navigate('/login')}>Access Workspace</button>
            <button className="cta-btn-ghost" onClick={() => openModal('sales')}>Talk to Enterprise Sales</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="zoho-footer">
        <div className="zoho-footer-inner">
          <div className="zoho-logo-area">
            <div className="public-logo-wrapper">
              <svg className="public-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="9" height="9" rx="2" fill="#2563EB" />
                <rect x="13" y="2" width="9" height="9" rx="2" fill="#10B981" />
                <rect x="2" y="13" width="9" height="9" rx="2" fill="#F59E0B" />
                <rect x="13" y="13" width="9" height="9" rx="2" fill="#EF4444" />
              </svg>
            </div>
            <span className="zoho-logo-text">Industrial Analytics Workspace</span>
          </div>
          <div className="zoho-footer-links">
            <span className="zoho-footer-text">© {new Date().getFullYear()} Industrial Analytics Workspace. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
