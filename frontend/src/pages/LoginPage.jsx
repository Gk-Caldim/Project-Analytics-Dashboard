import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Shield, ArrowLeft, Timer, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.auth);
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
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await API.get('/roles/');
      return res.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // ── FORGOT PASSWORD STATE ──
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const newPasswordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);

  // ── OTP TIMER COUNTDOWN ──
  useEffect(() => {
    let timer;
    if (countdown > 0 && showForgotPasswordForm && resetStep === 2) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, showForgotPasswordForm, resetStep]);

  // ── FORGOT PASSWORD API ACTIONS ──
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    try {
      const response = await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(response.data.message);
      setResetStep(2);
      setCountdown(120); // 2 minutes resend delay
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to request password reset';
      setForgotError(errMsg);
      if (errMsg.includes('temporarily locked')) {
        toast.error('Security alert sent to your email', {
          style: {
            border: '2px solid #C8341A',
            padding: '12px 16px',
            color: '#C8341A',
            background: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          iconTheme: {
            primary: '#C8341A',
            secondary: '#ffffff',
          },
          duration: 6000,
        });
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    try {
      const response = await API.post('/auth/verify-otp', { email: forgotEmail, otp: otpCode });
      setForgotSuccess(response.data.message);
      setResetToken(response.data.reset_token);
      setResetStep(3);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'OTP verification failed';
      setForgotError(errMsg);
      if (errMsg.includes('temporarily locked')) {
        toast.error('Security alert sent to your email', {
          style: {
            border: '2px solid #C8341A',
            padding: '12px 16px',
            color: '#C8341A',
            background: '#ffffff',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          iconTheme: {
            primary: '#C8341A',
            secondary: '#ffffff',
          },
          duration: 6000,
        });
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long');
      return;
    }
    setForgotLoading(true);
    try {
      const response = await API.post('/auth/reset-password', {
        email: forgotEmail,
        reset_token: resetToken,
        new_password: newPassword
      });
      setForgotSuccess(response.data.message);
      setResetStep(4);
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setForgotError('');
    setForgotSuccess('');
    try {
      const response = await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess('OTP has been resent successfully.');
      setCountdown(120);
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Failed to resend OTP');
    }
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: '#E5E5E2' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: '#dc2626' }; // Red
    if (score === 2 || score === 3) return { score: 65, label: 'Medium', color: '#eab308' }; // Yellow
    return { score: 100, label: 'Strong', color: '#16a34a' }; // Green
  };



  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
          {showForgotPasswordForm ? (
            <>
              {/* ── FORGOT PASSWORD WIZARD (ZOHO-STYLE) ── */}
              {resetStep === 1 && (
                <form className="ws-login-form" onSubmit={handleRequestOtp}>
                  <div className="ws-back-btn-row">
                    <button 
                      type="button" 
                      onClick={() => setShowForgotPasswordForm(false)} 
                      className="ws-back-to-login"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                  
                  <h1 className="ws-form-title">Forgot Password</h1>
                  <p className="ws-form-subtext">Enter your account email. We will send you a 6-digit OTP code to verify your identity.</p>

                  <div className="ws-input-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@company.com" 
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required 
                    />
                  </div>

                  {forgotError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}

                  <button type="submit" className="ws-signin-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </form>
              )}

              {resetStep === 2 && (
                <form className="ws-login-form" onSubmit={handleVerifyOtp}>
                  <div className="ws-back-btn-row">
                    <button 
                      type="button" 
                      onClick={() => { setResetStep(1); setForgotError(''); setForgotSuccess(''); }} 
                      className="ws-back-to-login"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Email</span>
                    </button>
                  </div>

                  <h1 className="ws-form-title">Enter Code</h1>
                  <p className="ws-form-subtext">We've sent a secure 6-digit verification code to <strong>{forgotEmail}</strong>.</p>

                  <div className="ws-input-group">
                    <label>Enter 6-Digit OTP</label>
                    <input 
                      type="text" 
                      maxLength="6"
                      placeholder="000000" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="ws-otp-input"
                      required 
                    />
                  </div>



                  {forgotError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}
                  {forgotSuccess && (
                    <Alert variant="success" className="mb-4">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>{forgotSuccess}</AlertDescription>
                    </Alert>
                  )}

                  <div className="ws-timer-row">
                    <Timer size={13} className="ws-timer-icon" />
                    {countdown > 0 ? (
                      <span className="ws-countdown-text">Resend code in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                    ) : (
                      <button type="button" onClick={handleResendOtp} className="ws-resend-btn">
                        Resend Code Now
                      </button>
                    )}
                  </div>

                  <button type="submit" className="ws-signin-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
              )}

              {resetStep === 3 && (
                <form className="ws-login-form" onSubmit={handleResetPassword}>
                  <div className="ws-back-btn-row">
                    <button 
                      type="button" 
                      onClick={() => { setResetStep(1); setForgotError(''); setForgotSuccess(''); }} 
                      className="ws-back-to-login"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Email</span>
                    </button>
                  </div>

                  <h1 className="ws-form-title">Create Password</h1>
                  <p className="ws-form-subtext">Set a secure, high-entropy password for your account.</p>

                  <div className="ws-input-group">
                    <label>New Password</label>
                    <div className="ws-password-wrapper">
                      <input 
                        type={showResetPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required 
                      />
                      <button 
                        type="button" 
                        className="ws-password-toggle"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                      >
                        {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="ws-strength-meter-container">
                      <div className="ws-strength-labels">
                        <span className="ws-strength-title">Password Strength:</span>
                        <span className="ws-strength-badge" style={{ color: newPasswordStrength.color }}>
                          {newPasswordStrength.label}
                        </span>
                      </div>
                      <div className="ws-strength-bar-bg">
                        <div 
                          className="ws-strength-bar-fill" 
                          style={{ 
                            width: `${newPasswordStrength.score}%`, 
                            backgroundColor: newPasswordStrength.color 
                          }}
                        ></div>
                      </div>
                      <ul className="ws-strength-hints">
                        <li className={newPassword.length >= 8 ? "valid" : ""}>
                          At least 8 characters
                        </li>
                        <li className={/[0-9]/.test(newPassword) ? "valid" : ""}>
                          Contains a number
                        </li>
                        <li className={/[^A-Za-z0-9]/.test(newPassword) ? "valid" : ""}>
                          Contains a special character
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="ws-input-group">
                    <label>Confirm New Password</label>
                    <div className="ws-password-wrapper">
                      <input 
                        type={showConfirmResetPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required 
                      />
                      <button 
                        type="button" 
                        className="ws-password-toggle"
                        onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                      >
                        {showConfirmResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {forgotError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{forgotError}</AlertDescription>
                    </Alert>
                  )}

                  <button type="submit" className="ws-signin-btn" disabled={forgotLoading}>
                    {forgotLoading ? 'Updating...' : 'Save & Reset Password'}
                  </button>
                </form>
              )}

              {resetStep === 4 && (
                <div className="ws-success-state">
                  <div className="ws-success-icon-container">
                    <CheckCircle2 size={40} className="ws-success-icon" />
                  </div>
                  <h1 className="ws-form-title" style={{ textAlign: 'center', marginTop: '16px' }}>Reset Successful</h1>
                  <p className="ws-form-subtext" style={{ textAlign: 'center', marginBottom: '24px' }}>
                    Your password has been successfully updated. You can now sign in using your new credentials.
                  </p>
                  <button 
                    type="button" 
                    className="ws-signin-btn"
                    onClick={() => {
                      setShowForgotPasswordForm(false);
                      setResetStep(1);
                      setForgotEmail('');
                      setOtpCode('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setResetToken('');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                  >
                    Go to Sign In
                  </button>
                </div>
              )}
            </>
          ) : !showRequestForm ? (
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
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotPasswordForm(true); setResetStep(1); setForgotError(''); setForgotSuccess(''); }} className="ws-forgot-link">Forgot password?</a>
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
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
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
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{reqError}</AlertDescription>
                  </Alert>
                )}
                {reqSuccess && (
                  <Alert variant="success" className="mb-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{reqSuccess}</AlertDescription>
                  </Alert>
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

export default LoginPage;
