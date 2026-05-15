import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import * as ReactPortal from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

const PopoverContext = createContext({
  open: false,
  setOpen: () => {},
  triggerRef: null,
});

export const Popover = ({ children }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  );
};

export const PopoverTrigger = ({ asChild, children, ...props }) => {
  const { setOpen, triggerRef } = useContext(PopoverContext);

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref: triggerRef,
      onClick: (e) => {
        children.props.onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <button ref={triggerRef} onClick={handleClick} {...props}>
      {children}
    </button>
  );
};

const Portal = ({ children }) => {
  return ReactPortal.createPortal(children, document.body);
};

export const PopoverContent = ({ className, align = "center", sideOffset = 4, children, ...props }) => {
  const { open, setOpen, triggerRef } = useContext(PopoverContext);
  const contentRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Simple positioning logic
      setCoords({
        top: rect.bottom + window.scrollY + sideOffset,
        left: rect.left + window.scrollX,
      });
    }
  }, [open, sideOffset, triggerRef]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target) && 
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, setOpen, triggerRef]);

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              zIndex: 1000,
            }}
            className={cn(
              "z-50 w-72 rounded-md border border-slate-200 bg-white p-4 text-slate-950 shadow-md outline-none",
              className
            )}
            {...props}
          >
            {children}
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};
