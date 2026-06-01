import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import './LoginPage.css';

/* ─────────────────────────────────────────────────────────────────────────
   LoginPage — Zoho-inspired split-screen
   Views  : sign-in  |  request-access  |  forgot-password
   Layers : Presentation only — all auth / access-request logic intact.
   ───────────────────────────────────────────────────────────────────────── */
const LoginPage = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  // ── Active view ──────────────────────────────────────────────────────────
  // 'signin' | 'request' | 'forgot'
  const [view, setView] = useState('signin');

  // ── Sign-in state ────────────────────────────────────────────────────────
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [error,        setError]        = useState('');

  // ── Request-access state ─────────────────────────────────────────────────
  const [reqFormData, setReqFormData] = useState({
    name: '', email: '', role: '', password: '', confirm_password: ''
  });
  const [reqError,              setReqError]              = useState('');
  const [reqSuccess,            setReqSuccess]            = useState('');
  const [reqLoading,            setReqLoading]            = useState(false);
  const [showReqPassword,       setShowReqPassword]       = useState(false);
  const [showReqConfirmPassword, setShowReqConfirmPassword] = useState(false);
  const [roles, setRoles] = useState([]);

  // ── Forgot-password state ────────────────────────────────────────────────
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotError,   setForgotError]   = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    API.get('/roles/').then(res => setRoles(res.data)).catch(err => console.error(err));

    // Re-populate email if "Keep me signed in" was previously saved
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const goToView = (target) => {
    // Clear all messages when switching views
    setError('');
    setReqError('');    setReqSuccess('');
    setForgotError(''); setForgotSuccess('');
    setView(target);
  };

  // ── Sign-in handler ──────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    dispatch(loginStart());
    try {
      const response = await API.post('/auth/login', { email, password });
      if (response.data?.access_token) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        dispatch(loginSuccess({ token: response.data.access_token, refresh_token: response.data.refresh_token, user: response.data.user, rememberMe }));
        navigate('/dashboard');
      } else {
        throw new Error('Something went wrong. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unable to sign in. Please check your details.';
      dispatch(loginFailure(msg));
      setError(msg);
    }
  };

  // ── Request-access handler ───────────────────────────────────────────────
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setReqError('');
    setReqSuccess('');
    if (reqFormData.password !== reqFormData.confirm_password) {
      setReqError('Passwords do not match.');
      return;
    }
    setReqLoading(true);
    try {
      await API.post('/auth/request-access', reqFormData);
      setReqSuccess('Your request has been submitted. An admin will review it shortly.');
      setReqFormData({ name: '', email: '', role: '', password: '', confirm_password: '' });
      setTimeout(() => goToView('signin'), 3000);
    } catch (err) {
      setReqError(err.response?.data?.detail || 'Could not submit your request. Please try again.');
    } finally {
      setReqLoading(false);
    }
  };

  // ── Forgot-password handler ──────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail) {
      setForgotError('Please enter your work email.');
      return;
    }
    setForgotLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess('If that email is registered, a password reset link has been sent. Check your inbox (or the server console for local testing).');
      setForgotEmail('');
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Could not process the request. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="ws-login-root">

      {/* ══ LEFT PANEL — branding ══════════════════════════════════════════ */}
      <div className="ws-login-left">
        <div className="ws-left-content">

          {/* Logo */}
          <div className="ws-login-logo">
            <div className="ws-logo-mark"></div>
            <span className="ws-logo-text">Industrial Analytics Dashboard</span>
          </div>

          {/* Promo headline + checklist + module stats */}
          <div className="ws-login-promo">
            <h1 className="ws-promo-headline">
              One platform.<br />
              <span className="text-brand-red">Complete operational</span> clarity.
            </h1>
            <p className="ws-promo-subline">Everything your leadership team needs, in one place.</p>

            <div className="ws-checklist">
              {[
                'Portfolio dashboards updated in real time',
                'Meetings tracked from agenda to action',
                'Budget alerts before they become problems',
                'Access controls for every role and team',
              ].map((item) => (
                <div className="ws-check-row" key={item}>
                  <svg className="ws-minimal-tick" width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="ws-divider"></div>

            <div className="ws-modules-section">
              <div className="ws-module-grid">
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(200,52,26,0.18)', color: '#E8836E' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                  </div>
                  <span className="ws-mod-name">Analytics</span>
                  <span className="ws-mod-stat"><span className="val">137</span> active projects</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(29,158,117,0.15)', color: '#5DCAA5' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <span className="ws-mod-name">Meetings</span>
                  <span className="ws-mod-stat"><span className="val">147</span> meetings today</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(55,138,221,0.15)', color: '#7BB8ED' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                  </div>
                  <span className="ws-mod-name">Dashboard</span>
                  <span className="ws-mod-stat"><span className="val">24</span> on track</span>
                </div>
                <div className="ws-module-card">
                  <div className="ws-mod-icon-box" style={{ background: 'rgba(186,117,23,0.15)', color: '#DBA84A' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  </div>
                  <span className="ws-mod-name">Budget</span>
                  <span className="ws-mod-stat"><span className="val">68%</span> utilised</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ws-left-footer">© 2026 Industrial Analytics Workspace</div>
      </div>

      {/* ══ RIGHT PANEL — form ════════════════════════════════════════════ */}
      <div className="ws-login-right">
        <div className="ws-login-form-container">

          {/* ── VIEW: Sign In ──────────────────────────────────────────── */}
          {view === 'signin' && (
            <>
              <h1 className="ws-form-title">Sign In</h1>
              <p className="ws-form-subtext">Enter your details below to continue.</p>

              <form className="ws-login-form" onSubmit={handleSignIn} noValidate>

                <div className="ws-input-group">
                  <label htmlFor="ws-email">Email</label>
                  <input
                    id="ws-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus={!email}
                    required
                  />
                </div>

                <div className="ws-input-group">
                  <div className="ws-label-row">
                    <label htmlFor="ws-password">Password</label>
                    <button
                      type="button"
                      className="ws-forgot-link"
                      onClick={() => goToView('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="ws-password-wrapper">
                    <input
                      id="ws-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="ws-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="ws-remember-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="ws-remember-checkbox"
                  />
                  <span>Keep me signed in</span>
                </label>

                {error && (
                  <div className="ws-alert ws-alert-error" role="alert">{error}</div>
                )}

                <button
                  id="ws-submit-signin"
                  type="submit"
                  className="ws-signin-btn"
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="ws-access-footer">
                New here?{' '}
                <button
                  type="button"
                  className="ws-request-link"
                  onClick={() => goToView('request')}
                >
                  Request access →
                </button>
              </p>
            </>
          )}

          {/* ── VIEW: Request Access ───────────────────────────────────── */}
          {view === 'request' && (
            <>
              <button
                type="button"
                className="ws-back-btn"
                onClick={() => goToView('signin')}
                aria-label="Back to sign in"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>

              <h1 className="ws-form-title" style={{ marginTop: '16px' }}>Request Access</h1>
              <p className="ws-form-subtext">Submit your details — an admin will review your request.</p>

              <form className="ws-login-form" onSubmit={handleRequestAccess} noValidate>

                <div className="ws-input-group">
                  <label htmlFor="ws-req-name">Full Name</label>
                  <input
                    id="ws-req-name"
                    type="text"
                    placeholder="Your full name"
                    value={reqFormData.name}
                    onChange={e => setReqFormData({ ...reqFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="ws-input-group">
                  <label htmlFor="ws-req-email">Work Email</label>
                  <input
                    id="ws-req-email"
                    type="email"
                    placeholder="name@company.com"
                    value={reqFormData.email}
                    onChange={e => setReqFormData({ ...reqFormData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="ws-input-group">
                  <label htmlFor="ws-req-role">Requested Role</label>
                  <input
                    id="ws-req-role"
                    list="ws-roles-list"
                    placeholder="Select or type a role"
                    value={reqFormData.role}
                    onChange={e => setReqFormData({ ...reqFormData, role: e.target.value })}
                    required
                  />
                  <datalist id="ws-roles-list">
                    {roles.map(r => <option key={r.id} value={r.name} />)}
                  </datalist>
                </div>

                <div className="ws-input-group">
                  <label htmlFor="ws-req-pw">Password</label>
                  <div className="ws-password-wrapper">
                    <input
                      id="ws-req-pw"
                      type={showReqPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={reqFormData.password}
                      onChange={e => setReqFormData({ ...reqFormData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="ws-password-toggle"
                      onClick={() => setShowReqPassword(!showReqPassword)}
                      aria-label={showReqPassword ? 'Hide password' : 'Show password'}
                    >
                      {showReqPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="ws-input-group">
                  <label htmlFor="ws-req-cpw">Confirm Password</label>
                  <div className="ws-password-wrapper">
                    <input
                      id="ws-req-cpw"
                      type={showReqConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={reqFormData.confirm_password}
                      onChange={e => setReqFormData({ ...reqFormData, confirm_password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="ws-password-toggle"
                      onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                      aria-label={showReqConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showReqConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {reqError   && <div className="ws-alert ws-alert-error"   role="alert">{reqError}</div>}
                {reqSuccess && <div className="ws-alert ws-alert-success"  role="status">{reqSuccess}</div>}

                <button
                  id="ws-submit-request"
                  type="submit"
                  className="ws-signin-btn"
                  disabled={reqLoading}
                >
                  {reqLoading ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>

              <p className="ws-access-footer">
                Already have an account?{' '}
                <button type="button" className="ws-request-link" onClick={() => goToView('signin')}>
                  Sign in →
                </button>
              </p>
            </>
          )}

          {/* ── VIEW: Forgot Password ──────────────────────────────────── */}
          {view === 'forgot' && (
            <>
              <button
                type="button"
                className="ws-back-btn"
                onClick={() => goToView('signin')}
                aria-label="Back to sign in"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>

              <h1 className="ws-form-title" style={{ marginTop: '16px' }}>Reset Password</h1>
              <p className="ws-form-subtext">
                Enter your work email and we'll send you a link to reset your password.
              </p>

              <form className="ws-login-form" onSubmit={handleForgotPassword} noValidate>

                <div className="ws-input-group">
                  <label htmlFor="ws-forgot-email">Work Email</label>
                  <input
                    id="ws-forgot-email"
                    type="email"
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                {forgotError   && <div className="ws-alert ws-alert-error"   role="alert">{forgotError}</div>}
                {forgotSuccess && <div className="ws-alert ws-alert-success"  role="status">{forgotSuccess}</div>}

                <button
                  id="ws-submit-forgot"
                  type="submit"
                  className="ws-signin-btn"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="ws-access-footer">
                Remembered your password?{' '}
                <button type="button" className="ws-request-link" onClick={() => goToView('signin')}>
                  Sign in →
                </button>
              </p>
            </>
          )}

          {/* Security badge — always visible */}
          <div className="ws-security-footer">
            <Shield size={11} className="ws-shield-icon" />
            <span>Your data is private and encrypted</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
