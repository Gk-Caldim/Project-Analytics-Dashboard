import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import './LoginPage.css';

/* ─── ResetPasswordPage — Enterprise Clean Design ─────────────────────────
   Layout : Centered single card matching the login page layout.
   Layers : Presentation layer, with inline validation and secure API dispatch.
   ─────────────────────────────────────────────────────────────────────────── */
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // ── Form State ───────────────────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Password Requirement States ──────────────────────────────────────────
  const isMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password && password === confirmPassword;
  const isPasswordValid = isMinLength && hasNumber && hasSpecialChar;

  useEffect(() => {
    // Basic query params validation on load
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset link.');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token || !email) {
      setError('Missing token or email parameters. Please request a new link.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all complexity requirements.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        token,
        email,
        password
      });

      setSuccess('Your password has been reset successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setLoading(false);
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
        <div className="ep-card-header">
          <h1 className="ep-heading">Set new password</h1>
          <p className="ep-subtext">Please choose a secure, strong password for {email || 'your account'}.</p>
        </div>

        {error && !success && (
          <div className="ep-error" style={{ marginBottom: '18px' }} role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="ep-success" style={{ marginBottom: '18px' }} role="status">
            {success}
          </div>
        )}

        {(!token || !email) && !success ? (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              className="ep-btn ep-btn-primary"
              onClick={() => navigate('/login')}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          !success && (
            <form className="ep-form" onSubmit={handleSubmit} noValidate>
              
              {/* New Password */}
              <div className="ep-field">
                <label htmlFor="ep-reset-pw" className="ep-label">New Password</label>
                <div className="ep-input-wrap">
                  <input
                    id="ep-reset-pw"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="ep-input ep-input-pw"
                    autoFocus
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

              {/* Confirm Password */}
              <div className="ep-field">
                <label htmlFor="ep-reset-cpw" className="ep-label">Confirm Password</label>
                <div className="ep-input-wrap">
                  <input
                    id="ep-reset-cpw"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="ep-input ep-input-pw"
                  />
                  <button
                    type="button"
                    className="ep-pw-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength dynamic checklist */}
              <div className="ep-pw-requirements">
                <p className="ep-requirements-title">
                  Password requirements:
                </p>
                <ul className="ep-requirements-list">
                  <li className={`ep-requirements-item ${isMinLength ? 'met' : 'unmet'}`}>
                    {isMinLength ? (
                      <Check size={14} className="ep-requirements-icon-met" />
                    ) : (
                      <X size={14} className="ep-requirements-icon-unmet" />
                    )}
                    <span>At least 8 characters</span>
                  </li>
                  <li className={`ep-requirements-item ${hasNumber ? 'met' : 'unmet'}`}>
                    {hasNumber ? (
                      <Check size={14} className="ep-requirements-icon-met" />
                    ) : (
                      <X size={14} className="ep-requirements-icon-unmet" />
                    )}
                    <span>At least 1 number</span>
                  </li>
                  <li className={`ep-requirements-item ${hasSpecialChar ? 'met' : 'unmet'}`}>
                    {hasSpecialChar ? (
                      <Check size={14} className="ep-requirements-icon-met" />
                    ) : (
                      <X size={14} className="ep-requirements-icon-unmet" />
                    )}
                    <span>At least 1 special character (!@#$%^&*)</span>
                  </li>
                  {confirmPassword && (
                    <li className={`ep-requirements-item ${passwordsMatch ? 'met' : 'unmet'}`}>
                      {passwordsMatch ? (
                        <Check size={14} className="ep-requirements-icon-met" />
                      ) : (
                        <X size={14} className="ep-requirements-icon-unmet" />
                      )}
                      <span>Passwords match</span>
                    </li>
                  )}
                </ul>
              </div>

              <button
                id="ep-submit-reset"
                type="submit"
                className="ep-btn ep-btn-primary"
                disabled={loading || !isPasswordValid || !passwordsMatch}
              >
                {loading ? 'Updating password…' : 'Reset password'}
              </button>

            </form>
          )
        )}

        <p className="ep-card-footer-text">
          Back to{' '}
          <button
            type="button"
            className="ep-link-inline"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
        </p>
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

export default ResetPasswordPage;
