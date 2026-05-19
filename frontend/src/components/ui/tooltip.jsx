import React, { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  return <TooltipContext.Provider value={{}}>{children}</TooltipContext.Provider>;
}

export function Tooltip({ children, delayDuration = 200 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsOpen(true), delayDuration);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsOpen(false);
  };

  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      {React.Children.map(children, child => {
        if (child.type === TooltipTrigger) {
          return React.cloneElement(child, { isOpen });
        }
        if (child.type === TooltipContent) {
          return <AnimatePresence>{isOpen && child}</AnimatePresence>;
        }
        return child;
      })}
    </div>
  );
}

export function TooltipTrigger({ children, asChild, isOpen }) {
  if (asChild) {
    return React.cloneElement(children, { 
      'data-state': isOpen ? 'delayed-open' : 'closed' 
    });
  }
  return <span>{children}</span>;
}

export function TooltipContent({ children, className = '', side = 'top', align = 'center' }) {
  const sideStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: side === 'top' ? 2 : -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`absolute z-[1000] overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-50 shadow-md animate-in fade-in-0 zoom-in-95 ${sideStyles[side]} ${className}`}
    >
      {children}
      {/* Optional: Arrow could be added here */}
    </motion.div>
  );
}
