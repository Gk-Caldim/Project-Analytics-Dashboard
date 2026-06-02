import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Globe, Lock, Cpu, BarChart3, Users, Zap } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import { LeadModal } from '../components/LeadModal';
import './modules/ModulePages.css';

const EnterprisePage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUseCase, setModalUseCase] = useState('Team governance');
  const [modalMode, setModalMode] = useState('sales');

  const openModal = (mode = 'sales', useCase = 'Team governance') => {
    setModalMode(mode);
    setModalUseCase(useCase);
    setIsModalOpen(true);
  };

  return (
    <div className="module-page-root">
      
      <PublicNavbar />

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialUseCase={modalUseCase}
        mode={modalMode}
      />

      {/* ── HERO ── */}
      <section className="mod-hero">
        <div className="mod-hero-inner" style={{ paddingTop: '100px' }}>
          <div className="mod-hero-content">
            <div className="mod-breadcrumb"><span>Enterprise</span> Grade</div>
            <h1 className="mod-hero-title">Operational clarity at global scale.</h1>
            <p className="mod-hero-desc">
              Security, compliance, and governance for the world's most demanding industrial operations. 
              Deploy across thousands of units with millisecond precision.
            </p>
            <div className="mod-hero-actions">
              <button className="mod-btn-primary" onClick={() => openModal('sales')}>Contact Sales</button>
              <button className="mod-btn-ghost" onClick={() => openModal('demo')}>Request Demo</button>
            </div>
          </div>
          <div className="mod-hero-visual">
            <div className="mod-mockup">
              <div className="mock-gv-layout">
                <div className="mock-gv-sidebar">
                  <div className="mock-gv-nav active">Global Config</div>
                  <div className="mock-gv-nav">Identity</div>
                  <div className="mock-gv-nav">Audit Logs</div>
                  <div className="mock-gv-nav">Network</div>
                </div>
                <div className="mock-gv-main">
                  <div className="mock-gv-top">
                    <div className="mock-gv-search">Search nodes...</div>
                    <div className="mock-gv-btn">Deploy Config</div>
                  </div>
                  <div className="mock-gv-table">
                    <div className="mock-gv-tr">
                      <span className="mock-gv-th">Region</span>
                      <span className="mock-gv-th">Status</span>
                      <span className="mock-gv-th">Identity</span>
                    </div>
                    {[
                      { r: 'EU-West-1', s: 'Active', a: 'Admin' },
                      { r: 'US-East-2', s: 'Active', a: 'Editor' },
                      { r: 'AP-South-1', s: 'Syncing', a: 'Viewer' }
                    ].map((item, i) => (
                      <div key={i} className="mock-gv-tr">
                        <span className="mock-gv-td">{item.r}</span>
                        <span className="mock-gv-td"><span className={`mock-gv-status ${item.s === 'Active' ? 'active' : ''}`}>{item.s}</span></span>
                        <span className="mock-gv-td"><span className={`mock-gv-pill-acc ${item.a.toLowerCase()}`}>{item.a}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY & COMPLIANCE ── */}
      <section className="mod-features">
        <div className="mod-features-inner">
          <div className="mod-feature">
            <Shield className="mod-feat-icon" />
            <h3 className="mod-feat-title">Advanced Security</h3>
            <p className="mod-feat-desc">AES-256 encryption at rest and TLS 1.3 in transit. Bring your own key (BYOK) support for maximum data sovereignty.</p>
          </div>
          <div className="mod-feature">
            <Lock className="mod-feat-icon" />
            <h3 className="mod-feat-title">Role-Based RBAC</h3>
            <p className="mod-feat-desc">Granular permissions at the unit, plant, or region level. Integrate with SAML, Okta, or Azure AD.</p>
          </div>
          <div className="mod-feature">
            <Globe className="mod-feat-icon" />
            <h3 className="mod-feat-title">Global Residency</h3>
            <p className="mod-feat-desc">Choice of data hosting locations to meet local residency requirements (GDPR, PDPA, and more).</p>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE CAPABILITIES ── */}
      <section className="mod-how">
        <div className="mod-how-inner">
          <div className="mod-how-header">
            <h2 className="mod-how-title">Built for Complex Architectures</h2>
          </div>
          <div className="mod-how-steps">
            <div className="mod-step">
              <Cpu className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Custom API & IoT Integrations</p>
            </div>
            <div className="mod-step">
              <BarChart3 className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Cross-portfolio Analytics</p>
            </div>
            <div className="mod-step">
              <Users className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Hierarchical Team Governance</p>
            </div>
            <div className="mod-step">
              <Zap className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">24/7 Priority Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE BADGES ── */}
      <section className="mod-testimonial" style={{backgroundColor: '#fff'}}>
        <div className="mod-test-inner">
          <h3 className="mod-test-author" style={{marginBottom: '40px', fontSize: '14px', letterSpacing: '0.1em'}}>COMPLIANCE STANDARDS</h3>
          <div style={{display: 'flex', gap: '64px', opacity: 0.5, filter: 'grayscale(100%)'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700'}}>ISO 27001</div>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700'}}>SOC 2 TYPE II</div>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700'}}>HIPAA</div>
             <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700'}}>GDPR</div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner" style={{ padding: '80px 0' }}>
          <h2 className="mod-bottom-title">Consolidate your operations today.</h2>
          <button className="mod-btn-white" onClick={() => openModal('pilot')}>Request Enterprise Pilot</button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mod-footer">
        <div className="mod-footer-inner">
          <div className="mod-logo-area">
            <div className="mod-logo-box"></div>
            <span className="mod-logo-text">Industrial Analytics Workspace</span>
          </div>
          <span className="mod-footer-text">© 2026 Corporation. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default EnterprisePage;
