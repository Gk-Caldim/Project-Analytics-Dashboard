import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulePages.css';

const MeetingsPage = () => {
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
            <div className="mod-breadcrumb">Platform <span>→</span> Minutes & Meetings</div>
            <h1 className="mod-hero-title">Every meeting. Captured, actioned, closed.</h1>
            <p className="mod-hero-desc">
              Auto-transcription, smart action item extraction, and follow-up tracking so nothing falls through.
            </p>
            <div className="mod-hero-actions">
              <button className="mod-btn-primary" onClick={() => navigate('/login')}>Start Free Trial</button>
              <button className="mod-btn-ghost" onClick={() => navigate('/login')}>Watch Demo</button>
            </div>
          </div>
          <div className="mod-hero-visual">
            <div className="mod-mockup mock-mt-layout">
              <div className="mock-mt-header">
                <div className="mock-mt-title">Q2 Strategic Planning Sync</div>
                <div className="mock-mt-date">April 18, 2026 • 10:00 AM</div>
              </div>
              <div className="mock-mt-body">
                <div className="mock-mt-left">
                  <div className="mock-mt-attendee">
                    <span className="mock-mt-att-name">Sarah Jenkins</span>
                    <span className="mock-mt-att-role">Chair</span>
                  </div>
                  <div className="mock-mt-attendee">
                    <span className="mock-mt-att-name">Michael Chang</span>
                    <span className="mock-mt-att-role">Member</span>
                  </div>
                  <div className="mock-mt-attendee">
                    <span className="mock-mt-att-name">Emily Davis</span>
                    <span className="mock-mt-att-role">Observer</span>
                  </div>
                </div>
                <div className="mock-mt-right">
                  <div className="mock-mt-action">
                    <div className="mock-mt-check"></div>
                    <div className="mock-mt-act-text">Finalize Q3 OPEX budget numbers</div>
                    <div className="mock-mt-act-meta">
                      <span className="mock-mt-pill open">Open</span>
                      <div className="mock-mt-avatar">MC</div>
                    </div>
                  </div>
                  <div className="mock-mt-action">
                    <div className="mock-mt-check" style={{background: '#16a34a', borderColor: '#16a34a'}}></div>
                    <div className="mock-mt-act-text" style={{textDecoration: 'line-through', opacity: 0.5}}>Distribute Q1 performance deck</div>
                    <div className="mock-mt-act-meta">
                      <span className="mock-mt-pill done">Done</span>
                      <div className="mock-mt-avatar">SJ</div>
                    </div>
                  </div>
                  <div className="mock-mt-action">
                    <div className="mock-mt-check"></div>
                    <div className="mock-mt-act-text">Approve vendor contracts for IT</div>
                    <div className="mock-mt-act-meta">
                      <span className="mock-mt-pill overdue">Overdue</span>
                      <div className="mock-mt-avatar">ED</div>
                    </div>
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
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" strokeLinejoin="miter" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <h3 className="mod-feat-title">Auto-Capture</h3>
            <p className="mod-feat-desc">Record and transcribe meetings automatically. No manual notes, no missed decisions.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            <h3 className="mod-feat-title">Action Item Extraction</h3>
            <p className="mod-feat-desc">AI identifies commitments and assigns them to the right person immediately.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strikeLinecap="square" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <h3 className="mod-feat-title">Escalation Engine</h3>
            <p className="mod-feat-desc">Overdue items surface to the right manager before they become a problem.</p>
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
              <div className="mod-step-text">Schedule or import your meeting</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">2</div>
              <div className="mod-step-text">Let the system capture and parse</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">3</div>
              <div className="mod-step-text">Track actions to closure</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="mod-testimonial">
        <div className="mod-test-inner">
          <h2 className="mod-test-quote">"Our follow-through rate went from 60% to 94% in one quarter."</h2>
          <div className="mod-test-author">Priya Nair</div>
          <div className="mod-test-role">COO, Tata Advanced Systems</div>
          <img className="mod-test-logo" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/300px-Tata_logo.svg.png" alt="Tata Placeholder" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner">
          <h2 className="mod-bottom-title">Ready to activate Minutes & Meetings?</h2>
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

export default MeetingsPage;
