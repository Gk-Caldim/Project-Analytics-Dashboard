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
    <div className="min-h-screen w-full flex bg-app-surface">
      {/* Left side - Branding (MNC Industrial Grade) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-24 bg-[#0E1B2E] relative overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>
        
        <div className="max-w-md relative z-10">
          <div className="w-11 h-11 rounded-lg bg-brand-primary flex items-center justify-center mb-10 shadow-lg shadow-brand-primary/20">
            <span className="text-white font-bold text-lg">IA</span>
          </div>

          <h1 className="text-h1 font-bold text-white mb-6 leading-tight tracking-tight">
            Advanced Project <br />
            <span className="text-brand-primary">Analytics Platform</span>
          </h1>

          <p className="text-body-lg text-white/60 leading-relaxed font-medium">
            Enterprise-grade monitoring for manufacturing and industrial excellence. 
            Real-time insights across your entire operations lifecycle.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-h3 font-bold text-white tracking-tight">50+</p>
              <p className="text-caption font-bold text-white/30 uppercase tracking-[0.2em]">Projects</p>
            </div>
            <div className="space-y-1">
              <p className="text-h3 font-bold text-white tracking-tight">200+</p>
              <p className="text-caption font-bold text-white/30 uppercase tracking-[0.2em]">Meetings</p>
            </div>
            <div className="space-y-1">
              <p className="text-h3 font-bold text-white tracking-tight">Industrial</p>
              <p className="text-caption font-bold text-white/30 uppercase tracking-[0.2em]">Standard</p>
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