import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Shield } from 'lucide-react';
import './WorkspaceLogin.css';

const WorkspaceLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqFormData, setReqFormData] = useState({
    name: '', email: '', role: '', password: '', confirm_password: ''
  });
  const [reqError, setReqError] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [showReqPassword, setShowReqPassword] = useState(false);
  const [showReqConfirmPassword, setShowReqConfirmPassword] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    API.get('/roles/').then(res => setRoles(res.data)).catch(err => console.error(err));
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    dispatch(loginStart());
    try {
      const response = await API.post('/auth/login', { email, password });
      if (response.data && response.data.access_token) {
        const { access_token, user } = response.data;
        dispatch(loginSuccess({ token: access_token, user }));
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
      setError(errorMessage);
    }
  };

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setReqError('');
    setReqSuccess('');
    if (reqFormData.password !== reqFormData.confirm_password) {
      setReqError('Passwords do not match');
      return;
    }
    setReqLoading(true);
    try {
      await API.post('/auth/request-access', reqFormData);
      setReqSuccess('Request submitted successfully. Pending admin approval.');
      setReqFormData({ name: '', email: '', role: '', password: '', confirm_password: '' });
      setTimeout(() => setShowRequestForm(false), 3000);
    } catch (err) {
      setReqError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setReqLoading(false);
    }
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
          {!showRequestForm ? (
            <>
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

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '4px' }}>
                    <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
                  </div>
                )}

                <button type="submit" className="ws-signin-btn" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="ws-access-footer">
                New here? <button onClick={() => setShowRequestForm(true)} className="ws-request-link" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Request access →</button>
              </p>
            </>
          ) : (
            <>
              <h1 className="ws-form-title">Request Access</h1>
              <p className="ws-form-subtext">Submit your details to request an account.</p>
              
              <form className="ws-login-form" onSubmit={handleRequestAccess}>
                <div className="ws-input-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={reqFormData.name}
                    onChange={(e) => setReqFormData({...reqFormData, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="ws-input-group" style={{ marginTop: '12px' }}>
                  <label>Email</label>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={reqFormData.email}
                    onChange={(e) => setReqFormData({...reqFormData, email: e.target.value})}
                    required 
                  />
                </div>
                <div className="ws-input-group" style={{ marginTop: '12px' }}>
                  <label>Requested Role</label>
                  <input 
                    list="roles-list"
                    value={reqFormData.role}
                    onChange={(e) => setReqFormData({...reqFormData, role: e.target.value})}
                    placeholder="Select or type a role"
                    required
                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px', outline: 'none' }}
                  />
                  <datalist id="roles-list">
                    {roles.map(r => <option key={r.id} value={r.name} />)}
                  </datalist>
                </div>
                <div className="ws-input-group" style={{ marginTop: '12px' }}>
                  <label>Password</label>
                  <div className="ws-password-wrapper">
                    <input 
                      type={showReqPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={reqFormData.password}
                      onChange={(e) => setReqFormData({...reqFormData, password: e.target.value})}
                      required 
                    />
                    <button 
                      type="button" 
                      className="ws-password-toggle"
                      onClick={() => setShowReqPassword(!showReqPassword)}
                    >
                      {showReqPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="ws-input-group" style={{ marginTop: '12px', marginBottom: '16px' }}>
                  <label>Confirm Password</label>
                  <div className="ws-password-wrapper">
                    <input 
                      type={showReqConfirmPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={reqFormData.confirm_password}
                      onChange={(e) => setReqFormData({...reqFormData, confirm_password: e.target.value})}
                      required 
                    />
                    <button 
                      type="button" 
                      className="ws-password-toggle"
                      onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                    >
                      {showReqConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {reqError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                    <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{reqError}</p>
                  </div>
                )}
                {reqSuccess && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                    <p style={{ color: '#166534', fontSize: '13px', margin: 0 }}>{reqSuccess}</p>
                  </div>
                )}

                <button type="submit" className="ws-signin-btn" disabled={reqLoading}>
                  {reqLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>

              <p className="ws-access-footer">
                Already have an account? <button onClick={() => setShowRequestForm(false)} className="ws-request-link" style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>Sign in →</button>
              </p>
            </>
          )}

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
