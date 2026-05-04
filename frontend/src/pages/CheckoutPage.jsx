import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, CreditCard, ArrowRight, Loader2, Lock, Globe } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import './CheckoutPage.css';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Parse plan from URL: /checkout?plan=business&billing=annual
  const params = new URLSearchParams(location.search);
  const plan = params.get('plan') || 'starter';
  const billing = params.get('billing') || 'annual';

  const planData = {
    starter: {
      name: 'Starter Plan',
      monthly: 4999,
      annual: 3999,
      features: ['Up to 25 users', 'Analytics module', '50 Meetings/mo', 'Email support']
    },
    business: {
      name: 'Business Plan',
      monthly: 14999,
      annual: 11999,
      features: ['Up to 200 users', 'Full Analytics drill-down', 'Unlimited Meetings', 'Budget Intelligence', 'Priority Support']
    }
  };

  const selectedPlan = planData[plan.toLowerCase()] || planData.starter;
  const price = billing === 'annual' ? selectedPlan.annual : selectedPlan.monthly;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="checkout-root">
        <PublicNavbar />
        <div className="checkout-success-container">
          <div className="success-card">
            <div className="success-check-pulse">
              <Check size={40} className="text-white" />
            </div>
            <h1>Subscription Activated!</h1>
            <p>Welcome to the Industrial Analytics Workspace. Your workspace is being provisioned across our global regions.</p>
            <div className="success-actions">
              <button className="success-primary-btn" onClick={() => navigate('/workspace-dashboard')}>
                Go to Workspace <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-root">
      <PublicNavbar />
      
      <div className="checkout-container">
        <div className="checkout-grid">
          
          {/* ────── LEFT: FORM ────── */}
          <div className="checkout-form-section">
            <div className="checkout-header">
              <h1 className="checkout-title">Complete your subscription</h1>
              <p className="checkout-subtitle">Secure checkout powered by Enterprise Vault Analytics.</p>
            </div>

            <form className="checkout-form" onSubmit={handleSubmit}>
              <div className="checkout-section-block">
                <h3 className="section-title"><User size={18} /> Contact Information</h3>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="John Doe" required />
                </div>
                <div className="input-group">
                  <label>Work Email</label>
                  <input type="email" placeholder="john@enterprise.com" required />
                </div>
              </div>

              <div className="checkout-section-block">
                <h3 className="section-title"><CreditCard size={18} /> Payment details</h3>
                <div className="input-group">
                  <label>Card number</label>
                  <div className="card-input-wrapper">
                    <input type="text" placeholder="xxxx xxxx xxxx xxxx" required />
                    <Lock size={16} className="input-lock" />
                  </div>
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Expiry date</label>
                    <input type="text" placeholder="MM / YY" required />
                  </div>
                  <div className="input-group">
                    <label>CVC</label>
                    <input type="text" placeholder="xxx" required />
                  </div>
                </div>
              </div>

              <div className="checkout-guarantee">
                <ShieldCheck size={20} className="text-emerald-600" />
                <span>Secure 256-bit AES encrypted payment. No card data is stored on our servers.</span>
              </div>

              <button className="checkout-submit-btn" disabled={loading}>
                {loading ? (
                  <><Loader2 className="animate-spin" size={20} /> Authorizing...</>
                ) : (
                  `Pay ₹ ${price.toLocaleString()} now`
                )}
              </button>
            </form>
          </div>

          {/* ────── RIGHT: SUMMARY ────── */}
          <div className="checkout-summary-section">
            <div className="summary-card">
              <h2 className="summary-title">Order Summary</h2>
              
              <div className="plan-badge">
                <div className="plan-badge-icon">W</div>
                <div className="plan-badge-info">
                  <span className="plan-name">{selectedPlan.name}</span>
                  <span className="plan-billing">{billing === 'annual' ? 'Billed annually' : 'Billed monthly'}</span>
                </div>
              </div>

              <div className="summary-items">
                <div className="summary-item">
                  <span>Standard Subscription</span>
                  <span>₹ {price.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span>Platform Fee</span>
                  <span className="text-emerald-600">Free</span>
                </div>
                <div className="summary-total">
                  <span>Total due today</span>
                  <span>₹ {price.toLocaleString()}</span>
                </div>
              </div>

              <div className="summary-benefits">
                <p className="benefits-title">Included in your plan:</p>
                {selectedPlan.features.map((f, i) => (
                  <div className="benefit-row" key={i}>
                    <Check size={14} className="text-emerald-500" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="summary-footer">
                <div className="footer-stat">
                  <Globe size={14} /> <span>Available in 34 regions</span>
                </div>
                <div className="footer-stat">
                  <ShieldCheck size={14} /> <span>SOC2 Type II Compliant</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const User = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default CheckoutPage;
