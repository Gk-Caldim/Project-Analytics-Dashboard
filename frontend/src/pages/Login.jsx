import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const Login = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen w-full flex bg-app-bg">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 bg-app-surface border-r border-border">
        <div className="max-w-md">
          <div className="w-12 h-12 rounded-lg bg-brand-primary flex items-center justify-center mb-6">
            <span className="text-white font-bold text-lg">IA</span>
          </div>

          <h1 className="text-h1 font-semibold text-text-primary mb-4">
            Industrial Analytics Platform
          </h1>

          <p className="text-body-lg text-text-secondary leading-relaxed">
            Streamline your manufacturing operations with data-driven insights.
            Track projects, manage meetings, and monitor performance.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="p-4 bg-app-bg rounded-lg border border-border">
              <p className="text-h3 font-semibold text-brand-primary">50+</p>
              <p className="text-caption text-text-muted mt-1">Projects</p>
            </div>
            <div className="p-4 bg-app-bg rounded-lg border border-border">
              <p className="text-h3 font-semibold text-brand-primary">200+</p>
              <p className="text-caption text-text-muted mt-1">Meetings</p>
            </div>
            <div className="p-4 bg-app-bg rounded-lg border border-border">
              <p className="text-h3 font-semibold text-brand-primary">99%</p>
              <p className="text-caption text-text-muted mt-1">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 rounded-lg bg-brand-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">IA</span>
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-h2 font-semibold text-text-primary mb-2">
              Sign in
            </h2>
            <p className="text-body text-text-secondary">
              Access your workspace
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Login;