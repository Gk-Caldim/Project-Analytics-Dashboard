import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import './PricingPage.css';

const PricingPage = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

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
      
      {/* ── NAVBAR ── */}
      <nav className="zoho-nav">
        <div className="zoho-nav-inner">
          <div className="zoho-logo-area" onClick={() => navigate('/')} style={{cursor: 'pointer'}}>
            <div className="zoho-logo-box"></div>
            <span className="zoho-logo-text">Industrial Analytics Workspace</span>
          </div>
          <div className="zoho-nav-right">
            <a href="/#products" className="zoho-nav-link" onClick={() => navigate('/')}>Products</a>
            <a href="/customers" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); navigate('/customers'); }}>Customers</a>
            <a href="/pricing" className="zoho-nav-link active" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Pricing</a>
            <a href="/enterprise" className="zoho-nav-link" onClick={(e) => { e.preventDefault(); navigate('/enterprise'); }}>Enterprise</a>
            <button className="zoho-nav-login" onClick={() => navigate('/workspace-login')}>Sign In</button>
            <button className="zoho-btn-primary" onClick={() => navigate('/workspace-login')}>Access Workspace</button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="pricing-hero">
        <div className="pricing-hero-inner">
          <div className="pricing-badge-wrapper text-center">
            <span className="pricing-badge">Simple, transparent pricing</span>
          </div>
          <h1 className="pricing-h1 text-center">The right plan for every stage of growth.</h1>
          <p className="pricing-subtext text-center">
            Start lean. Scale to enterprise. No hidden fees, no lock-in surprises.
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
                <p className="plan-desc">For growing teams getting serious about operations</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Up to 25 users</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Analytics module (read-only)</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Minutes & Meetings (50/mo)</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Email support</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> 5GB data storage</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Standard integrations</div>
              </div>
              <button className="card-btn ghost" onClick={() => navigate('/workspace-login')}>Start Free Trial</button>
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
                <p className="plan-desc">For organizations running serious portfolio operations</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Up to 200 users</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Full Analytics with drill-down</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Unlimited meetings + auto tracking</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Budget Intelligence module</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Priority email + chat support</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> 50GB data storage</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Advanced integrations + API</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Role-based access control</div>
              </div>
              <button className="card-btn primary" onClick={() => navigate('/workspace-login')}>Get Started</button>
            </div>

            {/* CARD 3 — ENTERPRISE */}
            <div className="pricing-card">
              <div className="card-top">
                <span className="plan-label">Enterprise</span>
                <div className="price-row">
                  <span className="price-val">Custom pricing</span>
                </div>
                <p className="plan-desc">For conglomerates, listed companies, and regulated industries</p>
              </div>
              <div className="card-features">
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Unlimited users</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> All 4 modules fully unlocked</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Dedicated customer success manager</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> SSO + Active Directory sync</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> SOC 2 & ISO 27001 reporting</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> Custom data retention policies</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> 99.9% uptime guarantee</div>
                <div className="feat-item"><Check size={16} className="text-brand-red" /> On-premise deployment</div>
              </div>
              <button className="card-btn ghost" onClick={() => navigate('/workspace-login')}>Talk to Enterprise Sales</button>
              <p className="onboarding-text">Typical onboarding in under 2 weeks</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="comparison-section">
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
      <section className="faq-section">
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
      <section className="bottom-cta-section">
        <div className="bottom-cta-box">
          <h2 className="bottom-cta-title">Not sure which plan fits? Let's figure it out together.</h2>
          <p className="bottom-cta-desc">Our enterprise team has helped 200+ companies choose the right tier.</p>
          <div className="bottom-cta-actions">
            <button className="cta-btn-white" onClick={() => navigate('/workspace-login')}>Start Free Trial</button>
            <button className="cta-btn-ghost" onClick={() => navigate('/workspace-login')}>Talk to Sales</button>
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

export default PricingPage;
