import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

/* ─── LoginPage ──────────────────────────────────────────────────────────────
   Layout: Cinematic Full-Screen Auth Portal (Stripe / IBM inspired)
   Background: Full-viewport sketch illustration under a dark gradient overlay
               and a subtle white dot grid pattern.
   Left Zone: 420px column with large padding containing brand logo, 
              Playfair headings, outline fields, and gold actions.
   Right Zone: Bottom-aligned Playfair pull-quote and corporate client trust.
   ──────────────────────────────────────────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);

  const [showPassword,           setShowPassword]           = useState(false);
  const [email,                  setEmail]                  = useState('');
  const [password,               setPassword]               = useState('');
  const [rememberMe,             setRememberMe]             = useState(false);
  const [error,                  setError]                  = useState('');

  const [showRequestForm,        setShowRequestForm]        = useState(false);
  const [reqFormData,            setReqFormData]            = useState({ name: '', email: '', role: '', password: '', confirm_password: '' });
  const [reqError,               setReqError]               = useState('');
  const [reqSuccess,             setReqSuccess]             = useState('');
  const [reqLoading,             setReqLoading]             = useState(false);
  const [showReqPassword,        setShowReqPassword]        = useState(false);
  const [showReqConfirmPassword, setShowReqConfirmPassword] = useState(false);
  const [roles,                  setRoles]                  = useState([]);

  useEffect(() => {
    API.get('/roles/').then(res => setRoles(res.data)).catch(err => console.error(err));
    
    // Auto-populate email if "Remember Me" was previously cached
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    dispatch(loginStart());
    try {
      const response = await API.post('/auth/login', { email, password });
      if (response.data?.access_token) {
        // Save or clear email in localStorage based on Remember Me state
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        dispatch(loginSuccess({ token: response.data.access_token, user: response.data.user }));
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Login failed';
      dispatch(loginFailure(msg));
      setError(msg);
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
      setReqSuccess('Request submitted. Pending admin approval.');
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

      {/* ── BACKGROUND ILLUMINATION LAYERS ── */}
      <img
        src="/login_page.png"
        alt="Pencil Sketch Roadmap Illustration"
        className="ws-bg-image"
      />
      <div className="ws-bg-overlay"></div>
      <div className="ws-dot-grid"></div>

      {/* ── FOREGROUND CONTENT ── */}
      <div className="ws-foreground">

        {/* ── LEFT ZONE: Spaced vertically from Top to Bottom ── */}
        <div className="ws-left-zone">

          {/* TOP: Brand Logo Header */}
          <div className="ws-brand">
            <div className="ws-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>
            <span className="ws-brand-name">Analytics Insights</span>
          </div>

          {/* MIDDLE: Atmospheric Login/Access Forms */}
          <div className="ws-form-wrapper">
            
            <h1 className={`ws-heading ${!showRequestForm ? 'ws-no-subtext' : ''}`}>
              {showRequestForm ? 'Request Access' : 'Welcome back.'}
            </h1>
            {showRequestForm && (
              <p className="ws-subtext">
                Register for your platform credentials.
              </p>
            )}

            {!showRequestForm ? (
              <>
                <form className="ws-form" onSubmit={handleSignIn} noValidate>
                  <div className="ws-field-group">
                    <label htmlFor="ws-email" className="ws-label">Email</label>
                    <input
                      id="ws-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus={!email}
                      className="ws-input"
                    />
                  </div>

                  <div className="ws-field-group">
                    <label htmlFor="ws-password" className="ws-label">Password</label>
                    <div className="ws-pw-row">
                      <input
                        id="ws-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="ws-input"
                      />
                      <button
                        type="button"
                        className="ws-pw-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password"
                      >
                        {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>

                  {/* Options: Remember Me Checkbox + Gold Forgot Password */}
                  <div className="ws-form-options">
                    <label className="ws-remember-me">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="ws-checkbox"
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="ws-link-gold" onClick={e => e.preventDefault()}>Forgot Password?</a>
                  </div>

                  {error && <p className="ws-error" role="alert">{error}</p>}

                  {/* Sign In button with 13px DM Sans uppercase tracked */}
                  <button type="submit" className="ws-submit" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                {/* Request Demo link */}
                <div className="ws-demo-row">
                  <button type="button" className="ws-link-demo" onClick={() => { setError(''); setShowRequestForm(true); }}>
                    Request demo
                  </button>
                </div>
              </>
            ) : (
              /* Request Access Form */
              <>
                <form className="ws-form" onSubmit={handleRequestAccess} noValidate>
                  <div className="ws-field-group">
                    <label className="ws-label">Full Name</label>
                    <input type="text" placeholder="Enter full name" value={reqFormData.name}
                      onChange={e => setReqFormData({...reqFormData, name: e.target.value})}
                      required className="ws-input"/>
                  </div>

                  <div className="ws-field-group">
                    <label className="ws-label">Work Email</label>
                    <input type="email" placeholder="name@company.com" value={reqFormData.email}
                      onChange={e => setReqFormData({...reqFormData, email: e.target.value})}
                      required className="ws-input"/>
                  </div>

                  <div className="ws-field-group">
                    <label className="ws-label">Role</label>
                    <input list="ws-roles" placeholder="Select your role" value={reqFormData.role}
                      onChange={e => setReqFormData({...reqFormData, role: e.target.value})}
                      required className="ws-input"/>
                    <datalist id="ws-roles">
                      {roles.map(r => <option key={r.id} value={r.name}/>)}
                    </datalist>
                  </div>

                  <div className="ws-field-group">
                    <label className="ws-label">Password</label>
                    <div className="ws-pw-row">
                      <input type={showReqPassword ? 'text' : 'password'} placeholder="Create a password"
                        value={reqFormData.password}
                        onChange={e => setReqFormData({...reqFormData, password: e.target.value})}
                        required className="ws-input"/>
                      <button type="button" className="ws-pw-eye"
                        onClick={() => setShowReqPassword(!showReqPassword)}>
                        {showReqPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>

                  <div className="ws-field-group">
                    <label className="ws-label">Confirm Password</label>
                    <div className="ws-pw-row">
                      <input type={showReqConfirmPassword ? 'text' : 'password'} placeholder="Confirm password"
                        value={reqFormData.confirm_password}
                        onChange={e => setReqFormData({...reqFormData, confirm_password: e.target.value})}
                        required className="ws-input"/>
                      <button type="button" className="ws-pw-eye"
                        onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}>
                        {showReqConfirmPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>

                  {reqError   && <p className="ws-error"   role="alert">{reqError}</p>}
                  {reqSuccess && <p className="ws-success" role="status">{reqSuccess}</p>}

                  <button type="submit" className="ws-submit" disabled={reqLoading}>
                    {reqLoading ? 'Submitting…' : 'Submit Request'}
                  </button>
                </form>

                <div className="ws-demo-row">
                  <button type="button" className="ws-link-demo"
                    onClick={() => { setReqError(''); setReqSuccess(''); setShowRequestForm(false); }}>
                    ← Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>

          {/* BOTTOM: SSL secure note */}
          <div className="ws-trust">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ws-trust-icon">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>256-bit SSL secure connection</span>
          </div>

        </div>

        {/* ── RIGHT ZONE: Spacer zone for sketch background illustration ── */}
        <div className="ws-right-zone">
          {/* Content removed to reduce noise as requested */}
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
