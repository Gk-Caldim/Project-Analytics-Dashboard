import React from 'react';
import { DotLottiePlayer } from '@dotlottie/react-player';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { themeSettings } = useTheme();
  const isDark = themeSettings?.displayMode === 'dark';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-6 overflow-hidden relative ${isDark ? 'bg-[#0a0a0f] text-white' : 'bg-gray-50 text-slate-900'}`}>
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px]"
          style={{ backgroundColor: `${themeSettings?.primaryColor}40` || '#6366f140' }}
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[150px]"
          style={{ backgroundColor: `${themeSettings?.secondaryColor}30` || '#0ea5e930' }}
        />
      </div>

      <div className="max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
        
        {/* Lottie Animation Section */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 w-full max-w-md aspect-square relative group"
        >
          <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700`}
               style={{ backgroundColor: themeSettings?.primaryColor || '#6366f1' }} />
          
          <div className={`relative h-full w-full rounded-3xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-white/40'} backdrop-blur-xl shadow-2xl flex items-center justify-center p-8`}>
            <DotLottiePlayer
              src="/Lonely 404.lottie"
              autoplay
              loop
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </motion.div>

        {/* Text Content Section */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="flex-1 text-center md:text-left space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20"
            >
              <Ghost className="w-3 h-3" />
              <span>Error 404</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
              Lost in <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#a855f7]"
                    style={{ backgroundImage: `linear-gradient(to right, ${themeSettings?.primaryColor}, ${themeSettings?.secondaryColor})` }}>
                Cyberspace
              </span>
            </h1>
            
            <p className={`text-lg md:text-xl font-medium max-w-md leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              The page you're looking for seems to have vanished into thin air. Let's get you back on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition-all"
              style={{ 
                backgroundColor: themeSettings?.primaryColor || '#6366f1',
                color: '#fff',
                boxShadow: `0 20px 40px -10px ${themeSettings?.primaryColor}60`
              }}
            >
              <Home className="w-5 h-5" />
              Return to Dashboard
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border transition-all ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-slate-900'}`}
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </motion.button>
          </div>

          {/* Quick Links / Help */}
          <div className="pt-8 border-t border-white/5">
            <p className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Need immediate assistance?</p>
            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
              <a href="#" className={`text-xs font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Contact Support</a>
              <a href="#" className={`text-xs font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>System Status</a>
              <a href="#" className={`text-xs font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Documentation</a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Floating Particles or effects could be added here */}
    </div>
  );
};

export default NotFound;
