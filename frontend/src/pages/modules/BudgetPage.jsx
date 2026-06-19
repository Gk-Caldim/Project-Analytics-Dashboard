import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { LeadModal } from '../../components/LeadModal';
import './ModulePages.css';

const BudgetPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('sales');

  const openModal = (mode = 'sales') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  return (
    <div className="module-page-root">
      
      <Navbar
        onSignIn={() => navigate('/login')}
        onRequestDemo={() => openModal('demo')}
        onAccessProjects={() => navigate('/login')}
      />

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialUseCase="Budget tracking"
        mode={modalMode}
      />

      {/* ── HERO ── */}
      <section className="mod-hero">
        <div className="mod-hero-inner" style={{ paddingTop: '80px' }}>
          <div className="mod-hero-content">
            <div className="mod-breadcrumb">Platform <span>→</span> Budget Intelligence</div>
            <h1 className="mod-hero-title">Expenditure visibility across your entire portfolio.</h1>
            <p className="mod-hero-desc">
              Plan vs actual tracking, variance alerts, and strategic budget allocation — updated in real time.
            </p>
            <div className="mod-hero-actions">
              <button className="mod-btn-primary" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Start Free Trial</button>
              <button className="mod-btn-ghost" onClick={() => openModal('demo')} style={{ cursor: 'pointer' }}>Watch Demo</button>
            </div>
          </div>
          <div className="mod-hero-visual">
            <div className="mod-mockup mock-bg-layout">
              <div className="mock-bg-table">
                <div className="mock-bg-row">
                  <div className="mock-bg-th" style={{flex: 1.5}}>Business Unit</div>
                  <div className="mock-bg-th" style={{flex: 1}}>Allocated</div>
                  <div className="mock-bg-th" style={{flex: 1}}>Spent</div>
                  <div className="mock-bg-th" style={{flex: 1, textAlign: 'right'}}>Variance</div>
                </div>
                <div className="mock-bg-row">
                  <div className="mock-bg-td mock-bg-unit" style={{flex: 1.5}}>Operations</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹45.0Cr</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹43.2Cr</div>
                  <div className="mock-bg-td" style={{flex: 1, textAlign: 'right'}}><span className="mock-bg-var green">-4.0%</span></div>
                </div>
                <div className="mock-bg-row">
                  <div className="mock-bg-td mock-bg-unit" style={{flex: 1.5}}>R&D</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹12.0Cr</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹11.8Cr</div>
                  <div className="mock-bg-td" style={{flex: 1, textAlign: 'right'}}><span className="mock-bg-var green">-1.6%</span></div>
                </div>
                <div className="mock-bg-row">
                  <div className="mock-bg-td mock-bg-unit" style={{flex: 1.5}}>Sales</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹28.5Cr</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹31.0Cr</div>
                  <div className="mock-bg-td" style={{flex: 1, textAlign: 'right'}}><span className="mock-bg-var amber">+8.7%</span></div>
                </div>
                <div className="mock-bg-row">
                  <div className="mock-bg-td mock-bg-unit" style={{flex: 1.5}}>HR & Admin</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹8.5Cr</div>
                  <div className="mock-bg-td" style={{flex: 1}}>₹10.2Cr</div>
                  <div className="mock-bg-td" style={{flex: 1, textAlign: 'right'}}><span className="mock-bg-var red">+20.0%</span></div>
                </div>
              </div>
              <div className="mock-bg-chart">
                <div className="mock-bg-donut">
                  <div className="mock-bg-donut-inner">₹94Cr</div>
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
            <h3 className="mod-feat-title">Portfolio-Wide Tracking</h3>
            <p className="mod-feat-desc">See every rupee across every unit on one screen. No spreadsheet consolidation.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="square" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <h3 className="mod-feat-title">Variance Alerts</h3>
            <p className="mod-feat-desc">Get notified the moment spending deviates from plan — not at month end.</p>
          </div>
          <div className="mod-feature">
            <svg className="mod-feat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path strokeLinecap="square" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path strokeLinecap="square" d="M2 12h20" /></svg>
            <h3 className="mod-feat-title">Strategic Planning Integration</h3>
            <p className="mod-feat-desc">Align budgets to OKRs and strategic initiatives, not just cost centers.</p>
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
              <div className="mod-step-text">Import your budget structure</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">2</div>
              <div className="mod-step-text">Connect finance data sources</div>
            </div>
            <div className="mod-step">
              <div className="mod-step-num">3</div>
              <div className="mod-step-text">Set alert thresholds per unit</div>
            </div>
          </div>
        </div>
      </section>



      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner">
          <h2 className="mod-bottom-title">Ready to activate Budget Intelligence?</h2>
          <button className="mod-btn-white" onClick={() => openModal('demo')} style={{ cursor: 'pointer' }}>Get Started</button>
        </div>
      </section>

      <Footer onRequestDemo={(mode) => openModal(mode || 'sales')} />
    </div>
  );
};

export default BudgetPage;
