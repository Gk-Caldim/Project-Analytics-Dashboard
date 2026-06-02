import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulePages.css';

const AnalyticsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="module-page-root">
      
      {/* ── NAVBAR ── */}
      <nav className="mod-nav">
        <div className="mod-nav-inner">
          <div className="mod-logo-area" onClick={() => navigate('/')}>
            <div className="mod-logo-box"></div>
            <span className="mod-logo-text">Industrial Analytics Workspace</span>
          </div>
          <div className="mod-nav-right">
            <a href="#products" className="mod-nav-link" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Products</a>
            <a href="#customers" className="mod-nav-link">Customers</a>
            <a href="/pricing" className="mod-nav-link" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Pricing</a>
            <a href="/enterprise_v1.html" className="mod-nav-link">Enterprise</a>
            <button className="mod-nav-login" onClick={() => navigate('/login')}>Sign In</button>
            <button className="mod-btn-primary" onClick={() => navigate('/login')}>Access Workspace</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="mod-hero">
        <div className="mod-hero-inner">
          <div className="mod-hero-content">
            <div className="mod-breadcrumb">Platform <span>→</span> Analytics</div>
            <h1 className="mod-hero-title">Real-time intelligence for every decision.</h1>
            <p className="mod-hero-desc">
              Executive dashboards, KPI tracking, and drill-down reporting — all updated live across your entire portfolio.
            </p>
            <div className="mod-hero-actions">
              <button className="mod-btn-primary" onClick={() => navigate('/login')}>Start Free Trial</button>
              <button className="mod-btn-ghost" onClick={() => navigate('/login')}>Watch Demo</button>
            </div>
          </div>
          <div className="mod-hero-visual">
            <div className="mod-mockup mock-an-layout">
              <div className="mock-an-sidebar">
                <div className="mock-an-nav-item"></div>
                <div className="mock-an-nav-item" style={{opacity: 0.5}}></div>
                <div className="mock-an-nav-item" style={{opacity: 0.5}}></div>
              </div>
              <div className="mock-an-main">
                <div className="mock-an-top">
                  <div className="mock-an-filters">
                    <span className="mock-an-filter">Business Unit: All ▾</span>
                    <span className="mock-an-filter">Quarter: Q2 2026 ▾</span>
                  </div>
                </div>
                <div className="mock-an-kpis">
                  <div className="mock-an-kpi">
                    <div className="mock-an-kpi-label">Revenue</div>
                    <div className="mock-an-kpi-val">₹48.2Cr</div>
                  </div>
                  <div className="mock-an-kpi">
                    <div className="mock-an-kpi-label">Margin</div>
                    <div className="mock-an-kpi-val">24.5%</div>
                  </div>
                  <div className="mock-an-kpi">
                    <div className="mock-an-kpi-label">Burn Rate</div>
                    <div className="mock-an-kpi-val">₹1.2Cr/mo</div>
                  </div>
                </div>
                <div className="mock-an-chart">
                  <div className="mock-an-line-3"></div>
                  <div className="mock-an-line-2"></div>
                  <div className="mock-an-line-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY FEATURES ── */}
      <section className="mod-features">
        <div className="mod-features-inner">
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" strokeLinejoin="miter" d="M3 3v18h18M7 14l4-4 4 4 6-6M7 14v4M11 10v8M15 14v4M21 8v10" /></svg>
            <h3 className="mod-feat-title">Live KPI Monitoring</h3>
            <p className="mod-feat-desc">Track 50+ metrics across units in real time with configurable alert thresholds.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" strokeLinejoin="miter" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            <h3 className="mod-feat-title">Drill-Down Reports</h3>
            <p className="mod-feat-desc">Click any metric to decompose it by region, team, or time period instantly.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="square" strokeLinejoin="miter" /><path strokeLinecap="square" strokeLinejoin="miter" d="M3 9h18M9 21V9" /></svg>
            <h3 className="mod-feat-title">Board-Ready Exports</h3>
            <p className="mod-feat-desc">One-click PDF and PPT exports formatted for C-suite presentations.</p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="mod-how">
        <div className="mod-how-inner">
          <div className="mod-how-header">
            <h2 className="mod-how-title">How it works</h2>
          </div>
          <div className="mod-how-steps">
            <div className="mod-step">
              <div className="mod-step-num">1</div>
              <div className="mod-step-text">Connect your data sources</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">2</div>
              <div className="mod-step-text">Configure your KPI framework</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">3</div>
              <div className="mod-step-text">Share dashboards with stakeholders</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="mod-testimonial">
        <div className="mod-test-inner">
          <h2 className="mod-test-quote">"We reduced our monthly board prep from 3 days to 4 hours."</h2>
          <div className="mod-test-author">Rajesh Menon</div>
          <div className="mod-test-role">CFO, Mahindra Logistics</div>
          <img className="mod-test-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Mahindra_logo_2021.svg/300px-Mahindra_logo_2021.svg.png" alt="Mahindra Placeholder" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner">
          <h2 className="mod-bottom-title">Ready to activate Analytics?</h2>
          <button className="mod-btn-white" onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mod-footer">
        <div className="mod-footer-inner">
          <div className="mod-logo-area" onClick={() => navigate('/')}>
            <div className="mod-logo-box"></div>
            <span className="mod-logo-text">Industrial Analytics Workspace</span>
          </div>
          <div className="mod-footer-links">
            <span className="mod-footer-text">© {new Date().getFullYear()} Corporation All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AnalyticsPage;
