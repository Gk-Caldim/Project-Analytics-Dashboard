import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { LeadModal } from '../components/LeadModal';
import './PricingPage.css';

const PricingPage = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUseCase, setModalUseCase] = useState('General Inquiry');
  const [modalMode, setModalMode] = useState('sales');

  const openModal = (mode = 'sales', useCase = 'General Inquiry') => {
    setModalMode(mode);
    setModalUseCase(useCase);
    setIsModalOpen(true);
  };

  const handleCheckout = (plan) => {
    navigate(`/checkout?plan=${plan}&billing=${isAnnual ? 'annual' : 'monthly'}`);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const pricingData = {
    starter: { monthly: 4999, annual: 3999 },
    business: { monthly: 14999, annual: 11999 }
  };

  const faqs = [
    {
      q: "Can I switch plans later?",
      a: "Yes. You can upgrade or downgrade at any time. Changes take effect on your next billing cycle."
    },
    {
      q: "Is there a free trial?",
      a: "Starter and Business plans include a 30-day free trial. No credit card required."
    },
    {
      q: "What counts as a \"user\"?",
      a: "Any person with a login to the workspace. Read-only viewers and admin users both count."
    },
    {
      q: "Do you support Indian billing and GST invoicing?",
      a: "Yes. All plans support INR billing and we generate GST-compliant invoices automatically."
    },
    {
      q: "What happens to our data if we cancel?",
      a: "Your data is retained for 90 days after cancellation. You can export everything before that window closes."
    }
  ];

  const comparisonData = [
    { group: 'ANALYTICS', features: [
      { name: 'Live dashboards', starter: true, business: true, enterprise: true },
      { name: 'Drill-down reports', starter: false, business: true, enterprise: true },
      { name: 'Board-ready exports', starter: false, business: true, enterprise: true },
      { name: 'Custom KPI builder', starter: false, business: false, enterprise: true }
    ]},
    { group: 'MEETINGS', features: [
      { name: 'Auto-transcription', starter: true, business: true, enterprise: true },
      { name: 'Action item extraction', starter: true, business: true, enterprise: true },
      { name: 'Escalation engine', starter: false, business: true, enterprise: true },
      { name: 'Meeting analytics', starter: false, business: true, enterprise: true }
    ]},
    { group: 'BUDGET', features: [
      { name: 'Plan vs actual tracking', starter: false, business: true, enterprise: true },
      { name: 'Variance alerts', starter: false, business: true, enterprise: true },
      { name: 'OKR alignment', starter: false, business: false, enterprise: true },
      { name: 'Multi-currency support', starter: false, business: false, enterprise: true }
    ]},
    { group: 'GOVERNANCE', features: [
      { name: 'Role-based access', starter: false, business: true, enterprise: true },
      { name: 'Audit trail', starter: false, business: true, enterprise: true },
      { name: 'SSO integration', starter: false, business: false, enterprise: true },
      { name: 'Compliance reporting', starter: false, business: false, enterprise: true }
    ]},
    { group: 'PLATFORM', features: [
      { name: 'Users', starter: '25 users', business: '200 users', enterprise: 'Unlimited' },
      { name: 'Storage', starter: '5GB', business: '50GB', enterprise: 'Unlimited' },
      { name: 'API access', starter: false, business: true, enterprise: true },
      { name: 'SLA', starter: '-', business: '-', enterprise: '99.9% Uptime' },
      { name: 'Support tier', starter: 'Email', business: 'Email + Chat', enterprise: '24/7 Priority' },
      { name: 'Dedicated CSM', starter: false, business: false, enterprise: true },
      { name: 'On-premise option', starter: false, business: false, enterprise: true }
    ]}
  ];

  return (
    <div className="pricing-root">
      
      <Navbar
        onSignIn={() => navigate('/login')}
        onRequestDemo={() => openModal('demo')}
        onAccessProjects={() => navigate('/login')}
      />

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialUseCase={modalUseCase}
        mode={modalMode}
      />

      {/* ── HERO SECTION ── */}
      <section className="pricing-hero">
        <div className="pricing-hero-inner" style={{ paddingTop: '80px' }}>
          <div className="pricing-badge-wrapper text-center">
            <span className="pricing-badge">Transparent pricing</span>
          </div>
          <h1 className="pricing-h1 text-center">Plans designed for scalable engineering.</h1>
          <p className="pricing-subtext text-center">
            From early-stage startups to enterprise teams. Clear pricing, no hidden fees.
          </p>

          <div className="pricing-toggle-row">
            <div className="toggle-container" onClick={() => setIsAnnual(!isAnnual)}>
              <span className={!isAnnual ? 'toggle-label active' : 'toggle-label'}>Monthly</span>
              <div className="toggle-switch">
                <div className={`toggle-dot ${isAnnual ? 'annual' : 'monthly'}`}></div>
              </div>
              <span className={isAnnual ? 'toggle-label active' : 'toggle-label'}>Annual</span>
              <span className="save-badge">Save 20%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section className="pricing-cards-section">
        <div className="pricing-cards-inner">
          <div className="pricing-grid">
            
            {/* CARD 1 — STARTER */}
            <div className="pricing-card">
              <div className="card-top">
                <span className="plan-label">Starter</span>
                <div className="price-row">
                  <span className="currency">₹</span>
                  <span className="price-val">
                    {isAnnual ? pricingData.starter.annual.toLocaleString() : pricingData.starter.monthly.toLocaleString()}
                  </span>
                  <span className="period">/ month</span>
                </div>
                {isAnnual && (
                  <div className="strikethrough">₹{pricingData.starter.monthly.toLocaleString()}</div>
                )}
                <p className="plan-desc">For growing teams optimizing their operations</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Up to 25 users</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Analytics module (read-only)</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Meeting Summaries (50/mo)</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Email support</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> 5GB data storage</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Standard integrations</div>
              </div>
              <button className="card-btn ghost animate-all" onClick={() => handleCheckout('starter')}>Start Free Trial</button>
            </div>

            {/* CARD 2 — BUSINESS */}
            <div className="pricing-card featured">
              <div className="featured-badge">Most Popular</div>
              <div className="card-top">
                <span className="plan-label">Business</span>
                <div className="price-row">
                  <span className="currency">₹</span>
                  <span className="price-val">
                    {isAnnual ? pricingData.business.annual.toLocaleString() : pricingData.business.monthly.toLocaleString()}
                  </span>
                  <span className="period">/ month</span>
                </div>
                {isAnnual && (
                  <div className="strikethrough">₹{pricingData.business.monthly.toLocaleString()}</div>
                )}
                <p className="plan-desc">For organizations scaling project portfolios</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Up to 200 users</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Full Analytics with drill-down</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Unlimited meetings + auto tracking</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Resource Analytics module</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Priority email + chat support</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> 50GB data storage</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Advanced integrations + API</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Role-based access control</div>
              </div>
              <button className="card-btn primary animate-all" onClick={() => handleCheckout('business')}>Get Started</button>
            </div>

            {/* CARD 3 — ENTERPRISE */}
            <div className="pricing-card">
              <div className="card-top">
                <span className="plan-label">Enterprise</span>
                <div className="price-row">
                  <span className="price-val">Custom pricing</span>
                </div>
                <p className="plan-desc">For enterprise-grade security and compliance</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Unlimited users</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> All 4 modules fully unlocked</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Dedicated customer success manager</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> SSO + Active Directory sync</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> SOC 2 & ISO 27001 reporting</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> Custom data retention policies</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> 99.9% uptime guarantee</div>
                <div className="feat-item"><Check size={16} className="text-blue-600" /> On-premise deployment</div>
              </div>
              <button className="card-btn ghost animate-all" onClick={() => openModal('enterprise')}>Talk to Enterprise Sales</button>
              <p className="onboarding-text">Typical onboarding in under 2 weeks</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="comparison-section border-t border-slate-100 bg-white">
        <div className="comparison-inner">
          <h2 className="comparison-title text-center">Compare plans in detail</h2>
          
          <div className="table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Starter</th>
                  <th>Business</th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className="group-header">
                      <td colSpan="4">{group.group}</td>
                    </tr>
                    {group.features.map((feat, fIdx) => (
                      <tr key={fIdx}>
                        <td className="feat-name">{feat.name}</td>
                        <td className="text-center">
                          {typeof feat.starter === 'boolean' ? (feat.starter ? <Check size={18} className="text-emerald-500 mx-auto" /> : <div className="dash">—</div>) : feat.starter}
                        </td>
                        <td className="text-center">
                          {typeof feat.business === 'boolean' ? (feat.business ? <Check size={18} className="text-emerald-500 mx-auto" /> : <div className="dash">—</div>) : feat.business}
                        </td>
                        <td className="text-center">
                          {typeof feat.enterprise === 'boolean' ? (feat.enterprise ? <Check size={18} className="text-emerald-500 mx-auto" /> : <div className="dash">—</div>) : feat.enterprise}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="faq-section border-t border-slate-100 bg-slate-50/50">
        <div className="faq-inner">
          <h2 className="faq-title text-center">Common questions</h2>
          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`faq-row ${openFaq === idx ? 'open' : ''}`} onClick={() => toggleFaq(idx)}>
                <div className="faq-q">
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {openFaq === idx && <div className="faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bottom-cta-section border-t border-slate-100 bg-white">
        <div className="bottom-cta-box">
          <h2 className="bottom-cta-title">Not sure which plan fits? Let's figure it out together.</h2>
          <p className="bottom-cta-desc font-normal">Our enterprise team has helped 200+ companies choose the right tier.</p>
          <div className="bottom-cta-actions">
            <button className="cta-btn-white" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Start Free Trial</button>
            <button className="cta-btn-ghost font-semibold border-white text-white hover:bg-white hover:text-blue-600 transition-all" onClick={() => openModal('sales')} style={{ cursor: 'pointer' }}>Talk to Sales</button>
          </div>
        </div>
      </section>

      <Footer onRequestDemo={(mode) => openModal(mode || 'sales')} />
    </div>
  );
};

export default PricingPage;
