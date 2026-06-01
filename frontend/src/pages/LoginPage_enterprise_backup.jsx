import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Lock } from 'lucide-react';
import './LoginPage.css';

/* ─── LoginPage — Enterprise Clean Design ──────────────────────────────────
   Layout : Centered single card on a light gray page. Logo above, footer below.
   Layers : Presentation only — all auth/access-request logic unchanged.
   ─────────────────────────────────────────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  // ── Auth form state ──────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // ── Request-access form state ────────────────────────────────────────────
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

  // ── Forgot password form state ───────────────────────────────────────────
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    // Fetch available roles for the request-access form
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
        dispatch(loginSuccess({ token: response.data.access_token, user: response.data.user }));
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
      setTimeout(() => setShowRequestForm(false), 3000);
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
      setForgotSuccess('If the email exists, a password reset link has been printed to the server console and sent.');
      setForgotEmail('');
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Could not process password reset. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="ep-page">

      {/* ── LOGO AREA (above card) ──────────────────────────────────────── */}
      <header className="ep-logo-area" aria-label="CALDIM branding">
        <span className="ep-logo-name">Analytics Dashboard</span>
        <span className="ep-logo-sub">by CALDIM Engineering</span>
      </header>

      {/* ── MAIN CARD ──────────────────────────────────────────────────── */}
      <main className="ep-card" role="main">

        {/* Sign-in view */}
        {!showRequestForm && !showForgotForm ? (
          <>
            <div className="ep-card-header">
              <h1 className="ep-heading">Sign in to Analytics Dashboard</h1>
            </div>

            <form className="ep-form" onSubmit={handleSignIn} noValidate>

              {/* Work email */}
              <div className="ep-field">
                <label htmlFor="ep-email" className="ep-label">Email</label>
                <input
                  id="ep-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus={!email}
                  className="ep-input"
                />
              </div>

              {/* Password */}
              <div className="ep-field">
                <label htmlFor="ep-password" className="ep-label">Password</label>
                <div className="ep-input-wrap">
                  <input
                    id="ep-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="ep-input ep-input-pw"
                  />
                  <button
                    type="button"
                    className="ep-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Options row */}
              <div className="ep-options-row">
                <label className="ep-remember">
                  <input
                    type="checkbox"
                    id="ep-remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="ep-checkbox"
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  className="ep-link-muted"
                  style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                  onClick={() => { setError(''); setForgotError(''); setForgotSuccess(''); setShowForgotForm(true); }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error message */}
              {error && <p className="ep-error" role="alert">{error}</p>}

              {/* Primary CTA */}
              <button
                id="ep-submit-signin"
                type="submit"
                className="ep-btn ep-btn-primary"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              {/* Divider */}
              <div className="ep-divider" aria-hidden="true">
                <span className="ep-divider-text">or</span>
              </div>

              {/* Microsoft SSO */}
              <button
                id="ep-signin-microsoft"
                type="button"
                className="ep-btn ep-btn-secondary"
              >
                <svg className="ep-ms-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" aria-hidden="true">
                  <rect x="0" y="0" width="10" height="10" fill="#f25022" />
                  <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
                  <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
                  <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
                </svg>
                Sign in with Microsoft
              </button>

            </form>

            {/* Request access */}
            <p className="ep-card-footer-text">
              Don't have an account?{' '}
              <button
                type="button"
                className="ep-link-inline"
                onClick={() => { setError(''); setShowRequestForm(true); }}
              >
                Request access
              </button>
            </p>
          </>

        ) : showRequestForm ? (

          /* ── Request access view ─────────────────────────────────────── */
          <>
            <div className="ep-card-header">
              <h1 className="ep-heading">Request access</h1>
              <p className="ep-subtext">Fill in your details and an admin will review your request.</p>
            </div>

            <form className="ep-form" onSubmit={handleRequestAccess} noValidate>

              <div className="ep-field">
                <label htmlFor="ep-req-name" className="ep-label">Full name</label>
                <input
                  id="ep-req-name"
                  type="text"
                  placeholder="Your full name"
                  value={reqFormData.name}
                  onChange={e => setReqFormData({ ...reqFormData, name: e.target.value })}
                  required
                  className="ep-input"
                />
              </div>

              <div className="ep-field">
                <label htmlFor="ep-req-email" className="ep-label">Work email</label>
                <input
                  id="ep-req-email"
                  type="email"
                  placeholder="name@company.com"
                  value={reqFormData.email}
                  onChange={e => setReqFormData({ ...reqFormData, email: e.target.value })}
                  required
                  className="ep-input"
                />
              </div>

              <div className="ep-field">
                <label htmlFor="ep-req-role" className="ep-label">Your role</label>
                <input
                  id="ep-req-role"
                  list="ep-roles-list"
                  placeholder="e.g. Project Manager"
                  value={reqFormData.role}
                  onChange={e => setReqFormData({ ...reqFormData, role: e.target.value })}
                  required
                  className="ep-input"
                />
                <datalist id="ep-roles-list">
                  {roles.map(r => <option key={r.id} value={r.name} />)}
                </datalist>
              </div>

              <div className="ep-field">
                <label htmlFor="ep-req-pw" className="ep-label">Choose a password</label>
                <div className="ep-input-wrap">
                  <input
                    id="ep-req-pw"
                    type={showReqPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={reqFormData.password}
                    onChange={e => setReqFormData({ ...reqFormData, password: e.target.value })}
                    required
                    className="ep-input ep-input-pw"
                  />
                  <button
                    type="button"
                    className="ep-pw-toggle"
                    onClick={() => setShowReqPassword(!showReqPassword)}
                    aria-label={showReqPassword ? 'Hide password' : 'Show password'}
                  >
                    {showReqPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="ep-field">
                <label htmlFor="ep-req-cpw" className="ep-label">Confirm password</label>
                <div className="ep-input-wrap">
                  <input
                    id="ep-req-cpw"
                    type={showReqConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={reqFormData.confirm_password}
                    onChange={e => setReqFormData({ ...reqFormData, confirm_password: e.target.value })}
                    required
                    className="ep-input ep-input-pw"
                  />
                  <button
                    type="button"
                    className="ep-pw-toggle"
                    onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                    aria-label={showReqConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showReqConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {reqError && <p className="ep-error" role="alert">{reqError}</p>}
              {reqSuccess && <p className="ep-success" role="status">{reqSuccess}</p>}

              <button
                id="ep-submit-request"
                type="submit"
                className="ep-btn ep-btn-primary"
                disabled={reqLoading}
              >
                {reqLoading ? 'Submitting…' : 'Submit request'}
              </button>

            </form>

            <p className="ep-card-footer-text">
              Already have an account?{' '}
              <button
                type="button"
                className="ep-link-inline"
                onClick={() => { setReqError(''); setReqSuccess(''); setShowRequestForm(false); }}
              >
                Sign in
              </button>
            </p>
          </>

        ) : (

          /* ── Forgot password view ─────────────────────────────────────── */
          <>
            <div className="ep-card-header">
              <h1 className="ep-heading">Reset your password</h1>
              <p className="ep-subtext">Enter your work email and we will send a password reset link.</p>
            </div>

            <form className="ep-form" onSubmit={handleForgotPassword} noValidate>

              <div className="ep-field">
                <label htmlFor="ep-forgot-email" className="ep-label">Work email</label>
                <input
                  id="ep-forgot-email"
                  type="email"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  className="ep-input"
                  autoFocus
                />
              </div>

              {forgotError && <p className="ep-error" role="alert">{forgotError}</p>}
              {forgotSuccess && <p className="ep-success" role="status">{forgotSuccess}</p>}

              <button
                id="ep-submit-forgot"
                type="submit"
                className="ep-btn ep-btn-primary"
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Sending…' : 'Send reset link'}
              </button>

            </form>

            <p className="ep-card-footer-text">
              Remembered your password?{' '}
              <button
                type="button"
                className="ep-link-inline"
                onClick={() => { setForgotError(''); setForgotSuccess(''); setShowForgotForm(false); }}
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </main>

      {/* ── PAGE FOOTER ──────────────────────────────────────────────── */}
      <footer className="ep-footer" aria-label="Page footer">
        <a href="#" className="ep-footer-link" onClick={e => e.preventDefault()}>Privacy</a>
        <span className="ep-footer-sep" aria-hidden="true">·</span>
        <a href="#" className="ep-footer-link ep-footer-link--security" onClick={e => e.preventDefault()}>
          <Lock size={11} aria-hidden="true" />
          Security
        </a>
        <span className="ep-footer-sep" aria-hidden="true">·</span>
        <a href="#" className="ep-footer-link" onClick={e => e.preventDefault()}>Help</a>
        <span className="ep-footer-sep" aria-hidden="true">·</span>
        <span className="ep-footer-copy">© 2026 CALDIM Engineering</span>
      </footer>

    </div>
  );
};

export default LoginPage;
