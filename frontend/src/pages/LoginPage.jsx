import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Shield, ArrowLeft, Timer, CheckCircle2, AlertCircle, SunIcon as Sunburst } from 'lucide-react';
import { toast } from 'sonner';
import './LoginPage.css';

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: 'None', color: '#64748b' };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;

  if (score <= 1) return { score: 25, label: 'Weak', color: '#ef4444' }; // Red
  if (score === 2 || score === 3) return { score: 65, label: 'Medium', color: '#eab308' }; // Yellow
  return { score: 100, label: 'Strong', color: '#22c55e' }; // Green
};

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Invalid email address format');
      return;
    }
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
        toast.error('Account locked', { description: 'Security alert sent to your email.' });
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
        toast.error('Account locked', { description: 'Security alert sent to your email.' });
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
    if (newPasswordStrength.label === 'Weak') {
      setForgotError('Password is too weak. Please use a medium or strong password.');
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

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email address format');
      dispatch(loginFailure('Invalid email address format'));
      return;
    }
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reqFormData.email)) {
      setReqError('Invalid email address format');
      return;
    }
    if (reqFormData.password !== reqFormData.confirm_password) {
      setReqError('Passwords do not match');
      return;
    }
    const strength = getPasswordStrength(reqFormData.password);
    if (strength.label === 'Weak') {
      setReqError('Password is too weak. Please use a medium or strong password.');
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
    <div 
      className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 md:p-8 relative overflow-y-auto font-sans"
      style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        backgroundPosition: 'center'
      }}
    >
      
      {/* The Centered Floating Card */}
      <div className="w-full max-w-5xl rounded-xl overflow-hidden flex flex-col md:flex-row shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.01)] border border-slate-200/60 bg-white">
        
        {/* ── LEFT SIDE OF CARD: Product Blueprint ── */}
        <div className="bg-[#0F172A] text-white p-8 md:p-10 md:w-1/2 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 rounded-t-xl md:rounded-r-none md:rounded-l-xl">
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              {/* Brand Logo Header */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6.5 h-6.5 rounded bg-[#FF6B00] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sunburst className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm tracking-tight text-white font-sans">
                  CALDIM
                </span>
              </div>

              {/* Value Copy Headline */}
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight text-white mb-3 max-w-sm">
                One platform.<br />
                <span className="text-[#FF6B00]">Complete operational</span> clarity.
              </h1>
              <p className="text-xs text-slate-450 text-slate-400 leading-relaxed mb-8 max-w-xs opacity-90">
                Designed to standardize program governance and consolidate tooling CapEx workflows in engineering operations.
              </p>

              {/* Bento Feature Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                
                {/* Cell 1: Program Portfolio */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-2 transition-colors hover:border-slate-700/50">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-orange-500/10 text-[#FF6B00]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-white">Program Portfolio</span>
                  <p className="text-[11px] text-slate-400 leading-normal">Track SOP readiness, trial runs, and milestone gates in real time.</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">SOP Gates</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Drift</span>
                  </div>
                </div>

                {/* Cell 2: Consolidated Trackers */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-2 transition-colors hover:border-slate-700/50">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-450 text-emerald-405 text-emerald-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-white">Consolidated Trackers</span>
                  <p className="text-[11px] text-slate-400 leading-normal">Consolidate supplier trackers into a database with strict change logs.</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Excel Parser</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Diffs</span>
                  </div>
                </div>

                {/* Cell 3: MOM Intelligence */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-2 transition-colors hover:border-slate-700/50">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-white">MOM Intelligence</span>
                  <p className="text-[11px] text-slate-400 leading-normal">Capture alignments, transcribe audio minutes, and auto-assign actions.</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Audio MOM</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Actions</span>
                  </div>
                </div>

                {/* Cell 4: Tooling CapEx */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-2 transition-colors hover:border-slate-700/50">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-amber-500/10 text-amber-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-white">Tooling CapEx</span>
                  <p className="text-[11px] text-slate-400 leading-normal">Monitor capital expenditures and tooling budgets against limits.</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Variance</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-850/40 text-slate-350 text-slate-300 font-mono font-medium tracking-tight hover:bg-slate-800 transition-colors">Audits</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT SIDE OF CARD: Zoho-Style Light Login Flow ── */}
        <div className="bg-white text-slate-950 p-8 md:p-12 md:w-1/2 flex flex-col justify-between relative min-h-[500px] rounded-b-xl md:rounded-l-none md:rounded-r-xl">
          <div className="w-full max-w-sm mx-auto my-auto">
            {showForgotPasswordForm ? (
              <>
                {/* ── FORGOT PASSWORD FLOW ── */}
                {resetStep === 1 && (
                  <form onSubmit={handleRequestOtp} className="flex flex-col gap-5" noValidate>
                    <div className="ws-back-btn-row">
                      <button 
                        type="button" 
                        onClick={() => { setShowForgotPasswordForm(false); setForgotError(''); setForgotSuccess(''); }} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Sign In</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Reset Password</h2>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Enter your account email. We will send you a 6-digit OTP code to verify your identity.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</label>
                      <input 
                        type="email" 
                        id="forgot-email"
                        placeholder="name@company.com" 
                        className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required 
                      />
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Sending OTP...' : 'Send Verification Code'}
                    </button>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5" noValidate>
                    <div className="ws-back-btn-row">
                      <button 
                        type="button" 
                        onClick={() => { setResetStep(1); setForgotError(''); setForgotSuccess(''); }} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Email</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Enter Code</h2>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        We've sent a secure 6-digit verification code to <strong className="text-slate-800 font-semibold">{forgotEmail}</strong>.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Enter 6-Digit OTP</label>
                      <input 
                        type="text" 
                        id="otp"
                        maxLength="6"
                        placeholder="000000" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="ws-otp-input text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 border border-red-200 text-red-750 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    {forgotSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                        <span>{forgotSuccess}</span>
                      </div>
                    )}

                    <div className="ws-timer-row">
                      <Timer size={13} className="ws-timer-icon" />
                      {countdown > 0 ? (
                        <span className="ws-countdown-text text-slate-500">Resend code in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                      ) : (
                        <button type="button" onClick={handleResendOtp} className="ws-resend-btn text-[#FF6B00] hover:text-orange-600 font-semibold cursor-pointer">
                          Resend Code Now
                        </button>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleResetPassword} className="flex flex-col gap-5" noValidate>
                    <div className="ws-back-btn-row">
                      <button 
                        type="button" 
                        onClick={() => { setResetStep(1); setForgotError(''); setForgotSuccess(''); }} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Email</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Create Password</h2>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Set a secure, high-entropy password for your account.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                      <label htmlFor="new-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</label>
                      <div className="relative">
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          id="new-pwd"
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                          required 
                        />
                        <button 
                          type="button" 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                        >
                          {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="ws-strength-meter-container my-1">
                        <div className="ws-strength-labels flex justify-between items-center text-xs mb-1.5">
                          <span className="ws-strength-title text-slate-500 font-medium">Password Strength:</span>
                          <span className="ws-strength-badge font-bold" style={{ color: newPasswordStrength.color }}>
                            {newPasswordStrength.label}
                          </span>
                        </div>
                        <div className="ws-strength-bar-bg bg-slate-200 h-1.5 rounded-full overflow-hidden w-full">
                          <div 
                            className="ws-strength-bar-fill h-full transition-all duration-300" 
                            style={{ 
                              width: `${newPasswordStrength.score}%`, 
                              backgroundColor: newPasswordStrength.color 
                            }}
                          ></div>
                        </div>
                        <ul className="ws-strength-hints text-[11px] text-slate-500 space-y-1 mt-2">
                          <li className={newPassword.length >= 8 ? "valid text-green-600 font-semibold" : "text-slate-405"}>
                            At least 8 characters
                          </li>
                          <li className={/[0-9]/.test(newPassword) ? "valid text-green-600 font-semibold" : "text-slate-405"}>
                            Contains a number
                          </li>
                          <li className={/[^A-Za-z0-9]/.test(newPassword) ? "valid text-green-600 font-semibold" : "text-slate-405"}>
                            Contains a special character
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 relative">
                      <label htmlFor="confirm-new-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm New Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmResetPassword ? "text" : "password"} 
                          id="confirm-new-pwd"
                          placeholder="••••••••" 
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                          required 
                        />
                        <button 
                          type="button" 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                          onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                        >
                          {showConfirmResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 border border-red-200 text-red-750 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Updating...' : 'Save & Reset Password'}
                    </button>
                  </form>
                )}

                {resetStep === 4 && (
                  <div className="ws-success-state text-center flex flex-col items-center justify-center">
                    <div className="ws-success-icon-container bg-green-500/10 p-4 rounded-full text-green-600 mb-4 animate-rec-pulse">
                      <CheckCircle2 size={40} className="ws-success-icon" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] mb-2">Reset Successful</h2>
                    <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
                      Your password has been successfully updated. You can now sign in using your new credentials.
                    </p>
                    <button 
                      type="button" 
                      className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
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
                {/* ── SIGN IN FORM ── */}
                <div className="flex flex-col mb-8">
                  <div className="text-[#FF6B00] mb-3.5">
                    <Sunburst className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Sign In</h2>
                </div>

                <form onSubmit={handleSignIn} className="flex flex-col gap-5" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signin-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your email</label>
                    <input 
                      type="email" 
                      id="signin-email"
                      placeholder="hi@hextastudio.in"
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <div className="flex justify-between items-center">
                      <label htmlFor="signin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                      <a 
                        href="#" 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setShowForgotPasswordForm(true); 
                          setResetStep(1); 
                          setForgotError(''); 
                          setForgotSuccess(''); 
                        }} 
                        className="text-xs text-[#FF6B00] hover:underline font-semibold transition-colors"
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        id="signin-password"
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                      <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-655 text-red-600 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-550 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
                    disabled={loading}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  <div className="text-center text-slate-500 text-sm mt-6">
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => setShowRequestForm(true)} 
                      className="text-[#FF6B00] hover:underline font-semibold cursor-pointer transition-colors"
                    >
                      Request access
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* ── REQUEST ACCESS FORM ── */}
                <div className="flex flex-col mb-5">
                  <div className="text-[#FF6B00] mb-3.5">
                    <Sunburst className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1E293B]">Get Started</h2>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Submit your details to request an account.
                  </p>
                </div>

                <form onSubmit={handleRequestAccess} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="req-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</label>
                    <input 
                      type="text" 
                      id="req-name"
                      placeholder="Full Name" 
                      value={reqFormData.name}
                      onChange={(e) => setReqFormData({...reqFormData, name: e.target.value})}
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                      required 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="req-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</label>
                    <input 
                      type="email" 
                      id="req-email"
                      placeholder="name@company.com" 
                      value={reqFormData.email}
                      onChange={(e) => setReqFormData({...reqFormData, email: e.target.value})}
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                      required 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="req-role" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Requested Role</label>
                    <input 
                      list="roles-list"
                      id="req-role"
                      value={reqFormData.role}
                      onChange={(e) => setReqFormData({...reqFormData, role: e.target.value})}
                      placeholder="Select or type a role"
                      required
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                    />
                    <datalist id="roles-list">
                      {roles.map(r => <option key={r.id} value={r.name} />)}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label htmlFor="req-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</label>
                    <div className="relative">
                      <input 
                        type={showReqPassword ? "text" : "password"} 
                        id="req-pwd"
                        placeholder="••••••••" 
                        value={reqFormData.password}
                        onChange={(e) => setReqFormData({...reqFormData, password: e.target.value})}
                        className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                      <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                        onClick={() => setShowReqPassword(!showReqPassword)}
                      >
                        {showReqPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label htmlFor="req-confirm-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showReqConfirmPassword ? "text" : "password"} 
                        id="req-confirm-pwd"
                        placeholder="••••••••" 
                        value={reqFormData.confirm_password}
                        onChange={(e) => setReqFormData({...reqFormData, confirm_password: e.target.value})}
                        className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] text-slate-900 border-[#CBD5E1] placeholder-slate-400 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                      <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                        onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                      >
                        {showReqConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {reqError && (
                    <div className="bg-red-50 border border-red-200 text-red-750 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      <span>{reqError}</span>
                    </div>
                  )}
                  {reqSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      <span>{reqSuccess}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm"
                    disabled={reqLoading}
                  >
                    {reqLoading ? 'Submitting...' : 'Submit Request'}
                  </button>

                  <div className="text-center text-slate-500 text-sm mt-4">
                    Already have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => setShowRequestForm(false)} 
                      className="text-[#FF6B00] hover:underline font-semibold cursor-pointer transition-colors"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
