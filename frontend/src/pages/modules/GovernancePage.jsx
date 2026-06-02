import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulePages.css';

const GovernancePage = () => {
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
            <div className="mod-breadcrumb">Platform <span>→</span> Team Governance</div>
            <h1 className="mod-hero-title">Control who sees what. Know who did what.</h1>
            <p className="mod-hero-desc">
              Role-based access, complete audit trails, and compliance-ready logging for enterprise governance requirements.
            </p>
            <div className="mod-hero-actions">
              <button className="mod-btn-primary" onClick={() => navigate('/login')}>Start Free Trial</button>
              <button className="mod-btn-ghost" onClick={() => navigate('/login')}>Watch Demo</button>
            </div>
          </div>
          <div className="mod-hero-visual">
            <div className="mod-mockup mock-gv-layout">
              <div className="mock-gv-sidebar">
                <div className="mock-gv-nav active">Users</div>
                <div className="mock-gv-nav">Roles</div>
                <div className="mock-gv-nav">Audit Log</div>
                <div className="mock-gv-nav">Compliance</div>
              </div>
              <div className="mock-gv-main">
                <div className="mock-gv-top">
                  <div className="mock-gv-search">Search users...</div>
                  <button className="mock-gv-btn">Invite User</button>
                </div>
                <div className="mock-gv-table">
                  <div className="mock-gv-tr">
                    <div className="mock-gv-th">Name</div>
                    <div className="mock-gv-th">Department</div>
                    <div className="mock-gv-th">Access</div>
                    <div className="mock-gv-th" style={{textAlign:'right'}}>Status</div>
                  </div>
                  <div className="mock-gv-tr">
                    <div className="mock-gv-td" style={{fontWeight:600}}>Raj Patel</div>
                    <div className="mock-gv-td">Finance</div>
                    <div className="mock-gv-td"><span className="mock-gv-pill-acc admin">Admin</span></div>
                    <div className="mock-gv-td mock-gv-status active" style={{textAlign:'right'}}>Active</div>
                  </div>
                  <div className="mock-gv-tr">
                    <div className="mock-gv-td" style={{fontWeight:600}}>Anita Rao</div>
                    <div className="mock-gv-td">Operations</div>
                    <div className="mock-gv-td"><span className="mock-gv-pill-acc editor">Editor</span></div>
                    <div className="mock-gv-td mock-gv-status active" style={{textAlign:'right'}}>Active</div>
                  </div>
                  <div className="mock-gv-tr">
                    <div className="mock-gv-td" style={{fontWeight:600}}>Sunil Gupta</div>
                    <div className="mock-gv-td">External</div>
                    <div className="mock-gv-td"><span className="mock-gv-pill-acc viewer">Viewer</span></div>
                    <div className="mock-gv-td mock-gv-status susp" style={{textAlign:'right'}}>Suspended</div>
                  </div>
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
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="square" /><path strokeLinecap="square" d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <h3 className="mod-feat-title">Role-Based Access Control</h3>
            <p className="mod-feat-desc">Assign granular permissions per module, per department, per user. Nothing more, nothing less.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <h3 className="mod-feat-title">Full Audit Trail</h3>
            <p className="mod-feat-desc">Every action logged with timestamp, user, and IP. SOC 2 and ISO 27001 ready.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="square" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path strokeLinecap="square" d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <h3 className="mod-feat-title">SSO & Directory Sync</h3>
            <p className="mod-feat-desc">Integrate with your existing Active Directory or Google Workspace in under 30 minutes.</p>
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
              <div className="mod-step-text">Define your role hierarchy</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">2</div>
              <div className="mod-step-text">Invite users and assign access</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">3</div>
              <div className="mod-step-text">Monitor activity via audit dashboard</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="mod-testimonial">
        <div className="mod-test-inner">
          <h2 className="mod-test-quote">"Our security audit passed with zero findings for the first time."</h2>
          <div className="mod-test-author">Anand Kumar</div>
          <div className="mod-test-role">CISO, Airbus India</div>
          <img className="mod-test-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Airbus_Logo.svg/300px-Airbus_Logo.svg.png" alt="Airbus Placeholder" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner">
          <h2 className="mod-bottom-title">Ready to activate Team Governance?</h2>
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

export default GovernancePage;
