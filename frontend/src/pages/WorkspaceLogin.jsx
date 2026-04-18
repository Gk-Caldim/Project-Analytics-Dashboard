import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield } from 'lucide-react';
import './WorkspaceLogin.css';

const WorkspaceLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = (e) => {
    e.preventDefault();
    navigate('/workspace-dashboard');
  };

  return (
    <div className="ws-login-root">
      {/* ── LEFT PANEL ── */}
      <div className="ws-login-left" style={{ backgroundColor: '#0D1B2A' }}>
        <div className="ws-left-content">
          <div className="ws-login-logo">
            <div className="ws-logo-mark">
            </div>
            <span className="ws-logo-text">Industrial Analytics Dashboard
            </span>
          </div>

          <div className="ws-login-promo">
            <h1 className="ws-promo-headline">
              One platform.<br />
              <span className="text-brand-red">Complete operational</span> clarity.
            </h1>
            <p className="ws-promo-subline">Everything your leadership team needs, in one place.</p>

            <div className="ws-checklist">
              <div className="ws-check-row">
                <svg className="ws-minimal-tick" width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Portfolio dashboards updated in real time</span>
              </div>
              <div className="ws-check-row">
                <svg className="ws-minimal-tick" width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Meetings tracked from agenda to action</span>
              </div>
              <div className="ws-check-row">
                <svg className="ws-minimal-tick" width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Budget alerts before they become problems</span>
              </div>
              <div className="ws-check-row">
                <svg className="ws-minimal-tick" width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Access controls for every role and team</span>
              </div>
            </div>

            <div className="ws-divider"></div>

            <div className="ws-modules-section">
              <div className="ws-module-grid">
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(200,52,26,0.18)', color: '#E8836E' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  </div>
                  <span className="ws-mod-name">Analytics</span>
                  <span className="ws-mod-stat"><span className="val">137</span> active projects</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(29,158,117,0.15)', color: '#5DCAA5' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <span className="ws-mod-name">Meetings</span>
                  <span className="ws-mod-stat"><span className="val">147</span> meetings today</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(55,138,221,0.15)', color: '#7BB8ED' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                  </div>
                  <span className="ws-mod-name">Dashboard</span>
                  <span className="ws-mod-stat"><span className="val">24</span> on track</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(186,117,23,0.15)', color: '#DBA84A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span className="ws-mod-name">Budget</span>
                  <span className="ws-mod-stat"><span className="val">68%</span> utilised</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="ws-left-footer">
          © 2026 Industrial Analytics Workspace
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="ws-login-right">
        <div className="ws-login-form-container">
          <h1 className="ws-form-title">Sign In</h1>
          <p className="ws-form-subtext">Enter your details below to continue.</p>
          
          <form className="ws-login-form" onSubmit={handleSignIn}>
            <div className="ws-input-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="ws-input-group">
              <div className="ws-label-row">
                <label>Password</label>
                <a href="#" className="ws-forgot-link">Forgot password?</a>
              </div>
              <div className="ws-password-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  className="ws-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="ws-signin-btn">
              Sign In
            </button>
          </form>

          <p className="ws-access-footer">
            New here? <a href="#" className="ws-request-link">Request access →</a>
          </p>

          <div className="ws-security-footer">
            <Shield size={11} className="ws-shield-icon" />
            <span>Your data is private and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLogin;
