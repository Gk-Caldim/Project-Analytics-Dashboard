import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Landmark, Factory, Truck, Layers, Quote } from 'lucide-react';
import './modules/ModulePages.css';

const CustomersPage = () => {
  const navigate = useNavigate();

  const caseStudies = [
    {
      company: 'Global Steel Co.',
      sector: 'Manufacturing',
      stat: '22%',
      desc: 'Reduction in operational variance across 14 global plants.',
      color: '#C8341A'
    },
    {
      company: 'Heritage Bank',
      sector: 'Finance',
      stat: '4,500',
      desc: 'Meetings automated and audited monthly for compliance.',
      color: '#0D1B2A'
    },
    {
      company: 'SkyRoute Logistics',
      sector: 'Supply Chain',
      stat: '₹14Cr',
      desc: 'Budget leakage identified and recovered in Q1 2026.',
      color: '#059669'
    }
  ];

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
             <a href="/#products" className="mod-nav-link" onClick={(e) => { e.preventDefault(); navigate('/#products'); }}>Products</a>
            <a href="/pricing" className="mod-nav-link" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Pricing</a>
            <a href="/enterprise" className="mod-nav-link" onClick={(e) => { e.preventDefault(); navigate('/enterprise'); }}>Enterprise</a>
            <button className="mod-nav-login" onClick={() => navigate('/login')}>Sign In</button>
            <button className="mod-btn-primary" onClick={() => navigate('/login')}>Access Workspace</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="mod-hero" style={{paddingBottom: '40px'}}>
        <div className="mod-hero-inner">
          <div className="mod-hero-content">
            <div className="mod-breadcrumb"><span>Global</span> Reach</div>
            <h1 className="mod-hero-title">Powers the world's most critical teams.</h1>
            <p className="mod-hero-desc">
              From heavy manufacturing to global finance, the Workspace provides the single source of truth for leaders driving industrial-scale impact.
            </p>
          </div>
          <div className="mod-hero-visual">
             <div className="mod-mockup" style={{padding: '40px', background: 'var(--navy)', color: '#fff'}}>
                <h3 style={{fontFamily: 'var(--font-serif)', fontSize: '24px', marginBottom: '20px'}}>Industry Pulse</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'}}>
                      <span>Active Workspaces</span>
                      <span style={{color: 'var(--brand-red)', fontWeight: '700'}}>2,408</span>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'}}>
                      <span>Global Regions</span>
                      <span style={{color: 'var(--brand-red)', fontWeight: '700'}}>34</span>
                   </div>
                   <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px'}}>
                      <span>Enterprise SLM Status</span>
                      <span style={{color: '#10b981', fontWeight: '700'}}>99.99%</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ── CASE STUDIES ── */}
      <section className="mod-features" style={{backgroundColor: '#fff'}}>
        <div className="mod-features-inner">
          {caseStudies.map((study, i) => (
            <div key={i} className="mod-feature" style={{padding: '32px', background: 'var(--surface)', borderRadius: '12px'}}>
              <h4 style={{color: study.color, fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase'}}>{study.sector}</h4>
              <h3 className="mod-feat-title" style={{fontSize: '24px', marginBottom: '16px'}}>{study.company}</h3>
              <div style={{fontSize: '32px', fontWeight: '700', color: study.color, marginBottom: '12px'}}>{study.stat}</div>
              <p className="mod-feat-desc">{study.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTORS ── */}
      <section className="mod-how">
        <div className="mod-how-inner">
          <div className="mod-how-header">
            <h2 className="mod-how-title">Dominating Every Sector</h2>
          </div>
          <div className="mod-how-steps">
            <div className="mod-step">
              <Factory className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Manufacturing</p>
            </div>
            <div className="mod-step">
              <Landmark className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Financial Services</p>
            </div>
            <div className="mod-step">
              <Truck className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Logistics & Supply</p>
            </div>
            <div className="mod-step">
              <Building2 className="mod-step-num" style={{backgroundColor: 'transparent'}} />
              <p className="mod-step-text">Energy & Infrastructure</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="mod-testimonial" style={{backgroundColor: '#fff'}}>
        <div className="mod-test-inner">
          <Quote size={48} className="mod-feat-icon" style={{opacity: 0.2, margin: '0 auto 32px'}} />
          <p className="mod-test-quote">"The level of transparency we have now across our APAC portfolio is unprecedented. It's not just a dashboard; it's a strategic advantage."</p>
          <div className="mod-test-author">Gokulakrishnan S.</div>
          <div className="mod-test-role">Managing Director, Global Operations</div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="mod-bottom-cta">
        <div className="mod-bottom-inner">
          <h2 className="mod-bottom-title">Join the enterprise elite.</h2>
          <button className="mod-btn-white" onClick={() => navigate('/login')}>Request a Case Study</button>
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

export default CustomersPage;
