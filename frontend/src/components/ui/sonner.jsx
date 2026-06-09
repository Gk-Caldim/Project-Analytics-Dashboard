import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

// Simple event store for toast notifications
const toastListeners = new Set();
let toastIdCounter = 0;

export const toast = (message, options = {}) => {
  const id = options.id || ++toastIdCounter;
  const newToast = {
    id,
    message,
    type: options.type || 'default',
    description: options.description,
    action: options.action,
    duration: options.duration !== undefined ? options.duration : 4000,
    icon: options.icon,
    style: options.style,
  };
  
  toastListeners.forEach(listener => listener({ type: 'ADD', toast: newToast }));
  return id;
};

toast.success = (message, options = {}) => toast(message, { ...options, type: 'success' });
toast.error = (message, options = {}) => toast(message, { ...options, type: 'error' });
toast.info = (message, options = {}) => toast(message, { ...options, type: 'info' });
toast.warning = (message, options = {}) => toast(message, { ...options, type: 'warning' });
toast.loading = (message, options = {}) => toast(message, { ...options, type: 'loading', duration: Infinity });
toast.dismiss = (id) => {
  toastListeners.forEach(listener => listener({ type: 'DISMISS', id }));
};

export function Toaster({ theme = 'light', position = 'top-right', closeButton = true, richColors = true }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (action) => {
      if (action.type === 'ADD') {
        setToasts(prev => {
          const exists = prev.some(t => t.id === action.toast.id);
          if (exists) return prev;
          return [...prev, action.toast];
        });
      } else if (action.type === 'DISMISS') {
        setToasts(prev => prev.filter(t => t.id !== action.id));
      }
    };

    toastListeners.add(handleToastEvent);
    return () => {
      toastListeners.delete(handleToastEvent);
    };
  }, []);

  const isTop = position.includes('top');
  const isRight = position.includes('right');
  const isLeft = position.includes('left');

  return (
    <div 
      className={`fixed z-[9999] flex flex-col gap-2.5 pointer-events-none p-4 max-w-sm w-full font-sans`}
      style={{
        top: isTop ? '16px' : 'auto',
        bottom: !isTop ? '16px' : 'auto',
        right: isRight ? '16px' : 'auto',
        left: isLeft ? '16px' : (!isRight && !isLeft) ? '50%' : 'auto',
        transform: (!isRight && !isLeft) ? 'translateX(-50%)' : 'none',
        alignItems: isRight ? 'flex-end' : isLeft ? 'flex-start' : 'center',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} theme={theme} closeButton={closeButton} richColors={richColors} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast: t, theme, closeButton, richColors }) {
  useEffect(() => {
    if (t.duration === Infinity) return;
    const timer = setTimeout(() => {
      toast.dismiss(t.id);
    }, t.duration);
    return () => clearTimeout(timer);
  }, [t]);

  const isDark = theme === 'dark';
  
  let Icon = null;
  let iconColor = '';
  let bgClass = '';
  let textClass = '';
  let descClass = '';

  if (richColors) {
    switch (t.type) {
      case 'success':
        Icon = CheckCircle;
        iconColor = 'text-emerald-500 dark:text-emerald-400';
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800/60 border-l-emerald-500 shadow-emerald-950/10' : 'bg-white border-slate-150 border-l-emerald-500 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-600';
        break;
      case 'error':
        Icon = AlertTriangle;
        iconColor = 'text-rose-500 dark:text-rose-400';
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800/60 border-l-rose-500 shadow-rose-950/10' : 'bg-white border-slate-150 border-l-rose-500 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-600';
        break;
      case 'warning':
        Icon = AlertTriangle;
        iconColor = 'text-amber-500 dark:text-amber-400';
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800/60 border-l-amber-500 shadow-amber-950/10' : 'bg-white border-slate-150 border-l-amber-500 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-600';
        break;
      case 'info':
        Icon = Info;
        iconColor = 'text-blue-500 dark:text-blue-400';
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800/60 border-l-blue-500 shadow-blue-950/10' : 'bg-white border-slate-150 border-l-blue-500 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-600';
        break;
      case 'loading':
        Icon = Loader2;
        iconColor = 'text-blue-500 animate-spin';
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800 shadow-slate-950/10' : 'bg-white border-slate-150 border-l-blue-500 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-600';
        break;
      default:
        bgClass = isDark ? 'bg-slate-950/95 border-slate-800 border-l-slate-500 shadow-slate-950/10' : 'bg-white border-slate-150 border-l-slate-400 shadow-slate-200/40';
        textClass = isDark ? 'text-slate-100' : 'text-slate-900';
        descClass = isDark ? 'text-slate-400' : 'text-slate-500';
        break;
    }
  } else {
    bgClass = isDark ? 'bg-slate-950/95 border-slate-850 border-l-slate-500 shadow-slate-950/10' : 'bg-white border-slate-150 border-l-slate-400 shadow-slate-200/40';
    textClass = isDark ? 'text-slate-100' : 'text-slate-900';
    descClass = isDark ? 'text-slate-400' : 'text-slate-500';
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={t.style}
      className={`flex items-start gap-3 p-4 rounded-lg border border-l-4 shadow-lg backdrop-blur-md pointer-events-auto min-w-[320px] max-w-sm ${bgClass}`}
    >
      {/* Icon wrapper */}
      {t.icon ? (
        <div className="flex-shrink-0 mt-0.5">{t.icon}</div>
      ) : Icon ? (
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
      ) : null}

      {/* Content wrapper */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-semibold leading-normal ${textClass}`}>{t.message}</h4>
        {t.description && (
          <p className={`text-[11px] mt-1.5 leading-normal ${descClass}`}>{t.description}</p>
        )}
        {t.action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              t.action.onClick?.();
              toast.dismiss(t.id);
            }}
            className="mt-2 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-500 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer border-0"
          >
            {t.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      {closeButton && (
        <button
          onClick={() => toast.dismiss(t.id)}
          className="flex-shrink-0 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-0 bg-transparent"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}
