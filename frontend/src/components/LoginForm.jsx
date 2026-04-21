import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';

const LoginForm = ({ onLoginSuccess, onLoginStart }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error: reduxError } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [longLoading, setLongLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onLoginStart) onLoginStart();
    setLocalError('');
    dispatch(loginStart());
    setLongLoading(false);

    // Timer to show message if it takes too long
    const timer = setTimeout(() => {
      setLongLoading(true);
    }, 3000);

    const email = formData.email;
    const password = formData.password === '**********' ? '' : formData.password;

    console.log('Logging in with:', email);

    try {
      const response = await API.post('/auth/login', { email, password });
      clearTimeout(timer);
      setLongLoading(false);

      if (response.data && response.data.access_token) {
        const { access_token, user } = response.data;
        dispatch(loginSuccess({ token: access_token, user }));
        console.log('Login success...');
        
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      clearTimeout(timer);
      setLongLoading(false);
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
      setLocalError(errorMessage);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or ID */}
        <div>
          <label className="block text-label font-medium text-text-secondary mb-1.5">
            Email or Employee ID
          </label>
          <input
            type="text"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2.5 bg-app-bg border border-border rounded-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all duration-fast text-body text-text-primary placeholder-text-muted"
            placeholder="name@company.com or EMP001"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-label font-medium text-text-secondary mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 bg-app-bg border border-border rounded-sm focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10 transition-all duration-fast text-body text-text-primary pr-10 placeholder-text-muted"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-sm border-border text-brand-primary focus:ring-brand-primary/10"
            />
            <span className="text-body-sm text-text-secondary">Remember me</span>
          </label>
          <button
            type="button"
            className="text-body-sm text-brand-primary hover:text-brand-accent font-medium transition-colors duration-fast"
          >
            Forgot password?
          </button>
        </div>

        {/* Error Message */}
        {localError && (
          <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-md">
            <p className="text-body-sm font-medium text-status-error">{localError}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary hover:bg-brand-accent text-white py-2.5 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-fast font-medium text-body mt-2 hover:-translate-y-px active:translate-y-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
