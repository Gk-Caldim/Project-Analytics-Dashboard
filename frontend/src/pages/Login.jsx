import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DotLottiePlayer } from '@dotlottie/react-player';
import LoginForm from '../components/LoginForm';

// Modern easing curves for a premium feel
const transitionEasing = [0.22, 1, 0.36, 1];

const Login = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Initial loader timeout
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginStart = () => {
    setIsAuthenticating(true);
  };

  const handleLoginSuccess = () => {
    setIsExiting(true);
    // Graceful delay for 3D flip (1.2s total)
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden"
      style={{ perspective: '1500px' }}>

      {/* 
        ========================================
        1. ENTRANCE LOADER 
        ========================================
      */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="initial-loader"
            className="absolute inset-0 z-[60] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: transitionEasing }}
          >
            <div className="w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] flex items-center justify-center">
              <DotLottiePlayer
                src="/Office%20work.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        ========================================
        2. EXIT TRANSITION - REPORT PORTFOLIO FLIP
        ========================================
      */}

      {!loading && (
        <motion.div
          key="login-cover"
          className="flex-1 flex flex-col justify-center bg-white relative z-10 w-full min-h-screen overflow-hidden shadow-2xl"
          style={{ originX: 0 }}
          initial={{ rotateY: 0, opacity: 1 }}
          animate={{
            rotateY: isExiting ? -90 : (isAuthenticating ? -12 : 0),
            x: isExiting ? "-15%" : 0,
            opacity: isExiting ? 0 : 1,
            filter: isExiting ? "blur(20px)" : "blur(0px)"
          }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Subtle Page Edge Shadow (Appears on click) */}
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: isAuthenticating ? 1 : 0 }}
          />

          {/* Technical Grid Background (Matches PDF/Structure theme) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <svg width="100%" height="100%">
              <pattern id="page-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#page-grid)" />
            </svg>
          </div>
          {/* Static geometric background features to remove emptiness */}
          <div className="absolute top-0 right-0 w-2/3 h-full bg-slate-50 [clip-path:polygon(20%_0%,100%_0%,100%_100%,0%_100%)] opacity-80" />

          <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Accent lighting patches */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-red-100/40 blur-[150px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-slate-200/50 blur-[150px]" />

          {/* Abstract industrial decor lines */}
          <svg className="absolute top-0 right-0 w-1/2 h-full opacity-10" viewBox="0 0 800 1000" fill="none" preserveAspectRatio="xMaxYMax slice">
            <motion.path
              d="M 800 200 L 400 200 L 200 400 L 200 1000"
              stroke="currentColor" strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: transitionEasing, delay: 0.5 }}
            />
            <motion.path
              d="M 800 300 L 450 300 L 300 450 L 300 1000"
              stroke="currentColor" strokeWidth="1" strokeDasharray="5 5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: transitionEasing, delay: 0.7 }}
            />
            <circle cx="200" cy="400" r="4" fill="currentColor" />
            <circle cx="300" cy="450" r="3" fill="currentColor" />
          </svg>
          {/* Ported from previous block - Main page content will live inside the cover */}
          <motion.div
            className="flex-1 flex flex-col justify-center p-8 lg:p-16 xl:p-24 relative z-10 w-full max-w-screen-2xl mx-auto min-h-screen"
            animate={{
              scale: isExiting ? 0.95 : (isAuthenticating ? 0.98 : 1),
              opacity: isExiting ? 0 : 1,
              filter: isExiting ? "blur(10px)" : "blur(0px)"
            }}
            transition={{ duration: 0.8, ease: transitionEasing }}
          >
            <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24 w-full h-full">

              {/* HERO TEXT REVEAL */}
              <div className="text-center lg:text-left flex-1 max-w-2xl pt-20 lg:pt-0">

                <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
                  <div className="overflow-hidden py-1">
                    <motion.span
                      initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.9, delay: 0.3, ease: transitionEasing }}
                      className="text-slate-800 block"
                    >
                      Welcome
                    </motion.span>
                  </div>
                  <div className="overflow-hidden py-1">
                    <motion.span
                      initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.9, delay: 0.4, ease: transitionEasing }}
                      className="text-slate-800 block"
                    >
                      to the
                    </motion.span>
                  </div>
                  <div className="overflow-hidden py-1 mt-2">
                    <motion.span
                      initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.9, delay: 0.5, ease: transitionEasing }}
                      className="aurora-text block"
                    >
                      Industrial Analytics
                    </motion.span>
                  </div>
                  <div className="overflow-hidden py-1">
                    <motion.span
                      initial={{ y: "100%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.9, delay: 0.6, ease: transitionEasing }}
                      className="aurora-text block"
                    >
                      Platform
                    </motion.span>
                  </div>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1, delay: 0.8, ease: transitionEasing }}
                  className="text-slate-500 text-lg lg:text-xl leading-relaxed mt-6 max-w-xl mx-auto lg:mx-0 font-medium"
                >
                  Empowering your manufacturing with intelligent analytics, real-time insights, and next-generation connectivity.
                </motion.p>

                {/* Decorative data blocks sliding in */}
                <motion.div
                  className="flex gap-4 mt-12 justify-center lg:justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1 }}
                >
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"
                    >
                      <motion.div
                        className="h-full bg-red-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.random() * 60 + 20}%` }}
                        transition={{ duration: 1.5, delay: 1 + (i * 0.2), ease: "easeOut" }}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* FORM REVEAL */}
              <motion.div
                className="w-full max-w-[480px] relative group z-10"
                initial={{ opacity: 0, x: 100, scale: 0.95, filter: "blur(20px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.2, delay: 0.5, ease: transitionEasing }}
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-red-500/10 via-transparent to-slate-400/20 rounded-[2.5rem] blur-xl opacity-75 z-10 pointer-events-none"></div>
                <div className="relative w-full bg-white/80 backdrop-blur-xl p-10 sm:p-12 rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 z-20">
                  <LoginForm onLoginStart={handleLoginStart} onLoginSuccess={handleLoginSuccess} />
                </div>
              </motion.div>

            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Aurora text gradient style */}
      <style>{`
        @keyframes aurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .aurora-text {
          background: linear-gradient(-45deg, #dc2626, #ea580c, #0891b2, #7c3aed, #dc2626);
          background-size: 300% auto;
          color: #1e293b;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: aurora 6s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;