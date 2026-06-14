import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { loginStart, loginSuccess, loginFailure, logout } from '../store/slices/authSlice';
import API from '../utils/api';
import { Eye, EyeOff, Shield, ArrowLeft, Timer, CheckCircle2, AlertCircle, SunIcon as Sunburst, Sun, Moon, Globe, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
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

const carouselSlides = [
  {
    title: "Project Dashboard",
    subtitle: "Milestones & Program Analytics",
    description: "Track program milestones, active trial gates, and operational metrics in a single unified view.",
    stats: [
      { label: "KPIs Tracked", value: "Real-time" },
      { label: "Executive Rollups", value: "VP Analytics" }
    ],
    bg: "from-orange-500/10 to-transparent",
    color: "#FF6B00",
    tags: ["Milestones", "KPIs"]
  },
  {
    title: "Audio MOM Capture",
    subtitle: "Meeting Minutes & Action Items",
    description: "Record alignment meetings, view transcriptions, capture alignments, and auto-sync action items to project timelines.",
    stats: [
      { label: "Audio Recorder", value: "Web Integrated" },
      { label: "Pending Tasks", value: "Auto-Sync" }
    ],
    bg: "from-blue-500/10 to-transparent",
    color: "#3b82f6",
    tags: ["MOM Capture", "Action Items"]
  },
  {
    title: "Consolidated Trackers",
    subtitle: "Excel Spreadsheet Grid Parser",
    description: "Upload vendor Excel sheets, parse them, and view/edit cell contents in an interactive web grid.",
    stats: [
      { label: "Excel Upload", value: "Automated" },
      { label: "Interactive Grid", value: "Online Sync" }
    ],
    bg: "from-emerald-500/10 to-transparent",
    color: "#10b981",
    tags: ["Excel Tracker", "Grid Sync"]
  },
  {
    title: "CapEx Budget Tracking",
    subtitle: "Tooling & Financial Variance",
    description: "Upload tooling lists, track cost distributions, and monitor program expenditure details with visual budget summaries.",
    stats: [
      { label: "Budget Summary", value: "Automatic" },
      { label: "Cost Variance", value: "Visualized" }
    ],
    bg: "from-amber-500/10 to-transparent",
    color: "#f59e0b",
    tags: ["CapEx Budget", "Finances"]
  }
];

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, isAuthenticated, user } = useSelector((state) => state.auth);
  const isServerOnline = useSelector((state) => state.nav.isServerOnline);
  const { themeSettings, toggleTheme } = useTheme();
  
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

  // ── PROFILE CACHE & CAROUSEL STATE ──
  const [cachedUser, setCachedUser] = useState(() => {
    try {
      const item = localStorage.getItem('caldim_last_user');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  });
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  // ── CAROUSEL INTERVAL ──
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

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
      await API.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess('OTP has been resent successfully.');
      setCountdown(120);
    } catch (err) {
      setForgotError(err.response?.data?.detail || 'Failed to resend OTP');
    }
  };

  // Authentication redirect is handled explicitly on the landing page and via the Active Session card.

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
        
        // Cache user info for Quick profile card login
        const userProfile = {
          name: user.full_name || user.email.split('@')[0],
          email: user.email,
          avatar: ''
        };
        localStorage.setItem('caldim_last_user', JSON.stringify(userProfile));
        setCachedUser(userProfile);

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

  const handleQuickSignIn = async (e) => {
    e.preventDefault();
    if (!cachedUser) return;
    setError('');
    dispatch(loginStart());
    try {
      const response = await API.post('/auth/login', { email: cachedUser.email, password });
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

  const handleGoogleSignIn = (e) => {
    e.preventDefault();
    toast.info('Google Sign-In is coming soon!');
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
    if (!reqFormData.role) {
      setReqError('Please select a role');
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
      setTimeout(() => setShowRequestForm(false), 3500);
    } catch (err) {
      setReqError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0f1115] flex items-center justify-center p-4 md:p-8 relative overflow-y-auto font-sans transition-colors duration-300"
      style={{
        backgroundImage: themeSettings.displayMode === 'dark'
          ? 'radial-gradient(#1e293b 1.5px, transparent 1.5px)'
          : 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        backgroundPosition: 'center'
      }}
    >
      
      {/* The Centered Floating Card */}
      <div className="w-full max-w-5xl rounded-xl overflow-hidden flex flex-col md:flex-row shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.01)] border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#161a22] transition-colors duration-300">
        
        {/* ── LEFT SIDE OF CARD: Product Blueprint Showcase Carousel ── */}
        <div className="bg-[#0F172A] text-white p-8 md:p-10 md:w-1/2 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 rounded-t-xl md:rounded-r-none md:rounded-l-xl select-none">
          {/* Active slide gradient glow */}
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${carouselSlides[carouselIndex].bg} opacity-70 transition-all duration-1000`} 
          />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              {/* Brand Logo Header */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: '#FF6B00' }}>
                  <Sunburst className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight text-white font-sans">
                  CALDIM
                </span>
              </div>

              {/* Value Copy Headline & Slider */}
              <div className="min-h-[170px] flex flex-col justify-end mt-4">
                <span className="text-[10px] uppercase tracking-widest font-bold font-mono" style={{ color: carouselSlides[carouselIndex].color }}>
                  {carouselSlides[carouselIndex].subtitle}
                </span>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight text-white mt-1.5 mb-3 max-w-sm transition-all duration-500">
                  {carouselSlides[carouselIndex].title}
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mb-4 transition-all duration-500">
                  {carouselSlides[carouselIndex].description}
                </p>
              </div>

              {/* Slider Dots Indicator */}
              <div className="flex gap-2 mb-6">
                {carouselSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === carouselIndex ? 'w-6 bg-[#FF6B00]' : 'w-1.5 bg-slate-700 hover:bg-slate-500'}`}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Bento Feature details */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4 flex flex-col gap-2 backdrop-blur-sm transition-all hover:border-slate-700/50">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {carouselSlides[carouselIndex].tags.map((tag, idx) => (
                    <span key={idx} className="text-[9px] px-2 py-0.5 rounded bg-slate-800 border border-slate-750 text-slate-300 font-mono tracking-tight font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1 border-t border-slate-800/60 pt-2.5">
                  {carouselSlides[carouselIndex].stats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</span>
                      <span className="text-xs text-white font-bold font-mono mt-0.5" style={{ color: carouselSlides[carouselIndex].color }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Showcase Footer */}
            <div className="flex items-center justify-between text-[10px] text-slate-550 border-t border-slate-800/50 pt-4">
              <div className="flex items-center gap-1.5">
        
              
              </div>
              <div className="flex items-center gap-1">
     
              
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE OF CARD: Zoho-Style Light/Dark Login Flow ── */}
        <div className="bg-white dark:bg-[#161a22] text-slate-950 dark:text-slate-100 p-8 md:p-12 md:w-1/2 flex flex-col justify-between relative min-h-[520px] rounded-b-xl md:rounded-l-none md:rounded-r-xl transition-colors duration-300">
          
          {/* Header diagnostics and early theme switch */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            

            {/* Dark mode switch */}
            <button 
              type="button" 
              onClick={toggleTheme} 
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer"
              aria-label="Toggle display theme"
            >
              {themeSettings.displayMode === 'dark' ? <Sun size={13.5} /> : <Moon size={13.5} />}
            </button>
          </div>

          <div className="w-full max-w-sm mx-auto my-auto pt-4">
            {showForgotPasswordForm ? (
              <>
                {/* ── FORGOT PASSWORD FLOW ── */}
                {resetStep === 1 && (
                  <form onSubmit={handleRequestOtp} className="flex flex-col gap-5" noValidate>
                    <div className="ws-back-btn-row">
                      <button 
                        type="button" 
                        onClick={() => { setShowForgotPasswordForm(false); setForgotError(''); setForgotSuccess(''); }} 
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Sign In</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">Reset Password</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        Enter your account email. We will send you a 6-digit OTP code to verify your identity.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</label>
                      <input 
                        type="email" 
                        id="forgot-email"
                        placeholder="name@company.com" 
                        className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required 
                      />
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-lg flex items-start gap-2.5 text-xs">
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
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Email</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">Enter Code</h2>
                      <p className="text-xs text-slate-550 text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        We've sent a secure 6-digit verification code to <strong className="text-slate-800 dark:text-slate-200 font-semibold">{forgotEmail}</strong>.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enter 6-Digit OTP</label>
                      <input 
                        type="text" 
                        id="otp"
                        maxLength="6"
                        placeholder="000000" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="ws-otp-input text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-750 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-500" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    {forgotSuccess && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 p-3 rounded-lg flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                        <span>{forgotSuccess}</span>
                      </div>
                    )}

                    <div className="ws-timer-row">
                      <Timer size={13} className="ws-timer-icon" />
                      {countdown > 0 ? (
                        <span className="ws-countdown-text text-slate-500 dark:text-slate-400">Resend code in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
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
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-none border-none p-0 outline-none"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Email</span>
                      </button>
                    </div>

                    <div className="flex flex-col mb-2">
                      <div className="text-[#FF6B00] mb-3">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">Create Password</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        Set a secure password for your account.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                      <label htmlFor="new-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</label>
                      <div className="relative">
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          id="new-pwd"
                          placeholder="••••••••" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
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
                          <span className="ws-strength-title text-slate-500 dark:text-slate-400 font-medium">Password Strength:</span>
                          <span className="ws-strength-badge font-bold" style={{ color: newPasswordStrength.color }}>
                            {newPasswordStrength.label}
                          </span>
                        </div>
                        <div className="ws-strength-bar-bg bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden w-full">
                          <div 
                            className="ws-strength-bar-fill h-full transition-all duration-300" 
                            style={{ 
                              width: `${newPasswordStrength.score}%`, 
                              backgroundColor: newPasswordStrength.color 
                            }}
                          ></div>
                        </div>
                        <ul className="ws-strength-hints text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mt-2">
                          <li className={newPassword.length >= 8 ? "valid text-green-600 font-semibold" : "text-slate-400"}>
                            At least 8 characters
                          </li>
                          <li className={/[0-9]/.test(newPassword) ? "valid text-green-600 font-semibold" : "text-slate-400"}>
                            Contains a number
                          </li>
                          <li className={/[^A-Za-z0-9]/.test(newPassword) ? "valid text-green-600 font-semibold" : "text-slate-400"}>
                            Contains a special character
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 relative">
                      <label htmlFor="confirm-new-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm New Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmResetPassword ? "text" : "password"} 
                          id="confirm-new-pwd"
                          placeholder="••••••••" 
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                          required 
                        />
                        <button 
                          type="button" 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer"
                          onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                        >
                          {showConfirmResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-750 p-3 rounded-lg flex items-start gap-2.5 text-xs">
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
                    <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white mb-2">Reset Successful</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs leading-relaxed">
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
                {/* ── SIGN IN FORM OR QUICK PROFILE LOGIN ── */}
                {isAuthenticated ? (
                  <div className="flex flex-col text-center pt-2">
                    {/* User profile card */}
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/20 text-[#FF6B00] font-bold text-xl flex items-center justify-center border border-orange-200/40 dark:border-orange-900/40 shadow-sm mx-auto mb-3 uppercase select-none">
                      {user?.full_name ? user.full_name.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : 'US')}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Active Session Found</h2>
                    <p className="text-xs text-slate-550 text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      You are currently signed in as <strong className="text-slate-800 dark:text-slate-200 font-semibold">{user?.full_name || user?.email.split('@')[0]}</strong> ({user?.email}).
                    </p>

                    <div className="flex flex-col gap-3 mt-6 text-left">
                      <button 
                        type="button" 
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm font-sans"
                      >
                        Go to Dashboard
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          dispatch(logout());
                          localStorage.removeItem('caldim_last_user');
                          setCachedUser(null);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold py-3.5 px-4 border border-slate-200 dark:border-slate-850 rounded-lg hover:shadow-sm active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm font-sans"
                      >
                        Sign Out / Switch Account
                      </button>
                    </div>
                  </div>
                ) : cachedUser ? (
                  <div className="flex flex-col text-center pt-2">
                    {/* Cached Quick login card */}
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/20 text-[#FF6B00] font-bold text-xl flex items-center justify-center border border-orange-200/40 dark:border-orange-900/40 shadow-sm mx-auto mb-3 uppercase select-none">
                      {cachedUser.name.slice(0, 2)}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cachedUser.name} ({cachedUser.email})</p>

                    <form onSubmit={handleQuickSignIn} className="flex flex-col gap-4 mt-6 text-left" noValidate>
                      <div className="flex flex-col gap-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="quick-signin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                          <a 
                            href="#" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setShowForgotPasswordForm(true); 
                              setResetStep(1); 
                              setForgotError(''); 
                              setForgotSuccess(''); 
                            }} 
                            className="text-xs text-[#FF6B00] hover:underline font-semibold"
                          >
                            Forgot password?
                          </a>
                        </div>
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            id="quick-signin-password"
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                            required 
                            autoFocus
                          />
                          <button 
                            type="button" 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer bg-none border-none p-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-500" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm font-sans"
                        disabled={loading}
                      >
                        {loading ? 'Signing In...' : 'Sign In'}
                      </button>

                      <div className="flex items-center justify-between mt-3 text-xs">
                        <button 
                          type="button"
                          onClick={() => {
                            setCachedUser(null);
                            localStorage.removeItem('caldim_last_user');
                          }}
                          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium cursor-pointer"
                        >
                          Switch account
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowRequestForm(true)} 
                          className="text-[#FF6B00] hover:underline font-semibold cursor-pointer"
                        >
                          Request access
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col mb-8">
                      <div className="text-[#FF6B00] mb-3.5">
                        <Sunburst className="h-9 w-9" />
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">Sign In</h2>
                    </div>

                    <form onSubmit={handleSignIn} className="flex flex-col gap-5" noValidate>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signin-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your email</label>
                        <input 
                          type="email" 
                          id="signin-email"
                          placeholder="hi@hextastudio.in"
                          className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required 
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 relative">
                        <div className="flex justify-between items-center">
                          <label htmlFor="signin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
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
                            className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                            required 
                          />
                          <button 
                            type="button" 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer bg-none border-none p-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-500" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm font-sans"
                        disabled={loading}
                      >
                        {loading ? 'Signing In...' : 'Sign In'}
                      </button>

                      {/* Google Sign-In Option */}
                      <div className="relative flex items-center justify-center my-1 select-none">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                        </div>
                        <span className="relative px-3 bg-white dark:bg-[#161a22] text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold font-mono">
                          Or sign in with
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 border border-slate-200 dark:border-slate-850 rounded-lg hover:shadow-sm active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow-sm"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Google</span>
                      </button>

                      <div className="text-center text-slate-555 text-slate-500 dark:text-slate-400 text-sm mt-4">
                        Don't have an account?{" "}
                        <button 
                          type="button"
                          onClick={() => setShowRequestForm(true)} 
                          className="text-[#FF6B00] hover:underline font-semibold cursor-pointer transition-colors bg-none border-none p-0"
                        >
                          Request access
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col mb-5">
                  <div className="text-[#FF6B00] mb-3.5">
                    <Sunburst className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">Get Started</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Submit your details to request an account.
                  </p>
                </div>

                <form onSubmit={handleRequestAccess} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="req-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</label>
                    <input 
                      type="text" 
                      id="req-name"
                      placeholder="Full Name" 
                      value={reqFormData.name}
                      onChange={(e) => setReqFormData({...reqFormData, name: e.target.value})}
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                      required 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="req-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</label>
                    <input 
                      type="email" 
                      id="req-email"
                      placeholder="name@company.com" 
                      value={reqFormData.email}
                      onChange={(e) => setReqFormData({...reqFormData, email: e.target.value})}
                      className="text-sm w-full py-3.5 px-4 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                      required 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requested Role</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { name: 'Manager', label: 'Program Manager', desc: 'Manage trial runs, budgets & SOP gates' },
                        { name: 'User', label: 'Team Member', desc: 'Read analytics, edit MOM meetings & actions' },
                        { name: 'Admin', label: 'Platform Admin', desc: 'Full configuration, users & settings management' }
                      ].map((roleObj) => {
                        const isSelected = reqFormData.role === roleObj.name;
                        return (
                          <button
                            key={roleObj.name}
                            type="button"
                            onClick={() => setReqFormData({ ...reqFormData, role: roleObj.name })}
                            className={`text-left p-3 rounded-lg border text-sm transition-all duration-200 flex items-center justify-between cursor-pointer ${
                              isSelected 
                                ? 'border-[#FF6B00] bg-orange-50/10 dark:bg-orange-950/10 text-[#FF6B00] ring-1 ring-[#FF6B00]' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-xs uppercase tracking-wide font-sans">{roleObj.label}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">{roleObj.desc}</div>
                            </div>
                            {isSelected && <Check size={14} className="text-[#FF6B00] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label htmlFor="req-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                    <div className="relative">
                      <input 
                        type={showReqPassword ? "text" : "password"} 
                        id="req-pwd"
                        placeholder="••••••••" 
                        value={reqFormData.password}
                        onChange={(e) => setReqFormData({...reqFormData, password: e.target.value})}
                        className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                      <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer bg-none border-none p-0"
                        onClick={() => setShowReqPassword(!showReqPassword)}
                      >
                        {showReqPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label htmlFor="req-confirm-pwd" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showReqConfirmPassword ? "text" : "password"} 
                        id="req-confirm-pwd"
                        placeholder="••••••••" 
                        value={reqFormData.confirm_password}
                        onChange={(e) => setReqFormData({...reqFormData, confirm_password: e.target.value})}
                        className="text-sm w-full py-3.5 px-4 pr-11 border rounded-lg bg-[#F8FAFC] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 border-[#CBD5E1] dark:border-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-[#FF6B00] transition-all duration-200"
                        required 
                      />
                      <button 
                        type="button" 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 cursor-pointer bg-none border-none p-0"
                        onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                      >
                        {showReqConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {reqError && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-750 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                      <span>{reqError}</span>
                    </div>
                  )}
                  {reqSuccess && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 p-3.5 rounded-lg flex items-start gap-2.5 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      <span>{reqSuccess}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold py-3.5 px-4 rounded-lg hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer text-center text-sm shadow-sm font-sans"
                    disabled={reqLoading}
                  >
                    {reqLoading ? 'Submitting...' : 'Submit Request'}
                  </button>

                  <div className="text-center text-slate-500 dark:text-slate-400 text-sm mt-4">
                    Already have an account?{" "}
                    <button 
                      type="button"
                      onClick={() => setShowRequestForm(false)} 
                      className="text-[#FF6B00] hover:underline font-semibold cursor-pointer transition-colors bg-none border-none p-0"
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
