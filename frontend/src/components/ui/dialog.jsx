import React from 'react';
import * as ReactPortal from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { X } from 'lucide-react';

const DialogContext = React.createContext({ open: false, setOpen: () => {} });

export const Dialog = ({ open: controlledOpen, onOpenChange, children }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (val) => {
    if (isControlled) {
      onOpenChange?.(val);
    } else {
      setUncontrolledOpen(val);
    }
  };

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ asChild, children }) => {
  const { setOpen } = React.useContext(DialogContext);
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        setOpen(true);
      },
    });
  }
  return <Button onClick={() => setOpen(true)}>{children}</Button>;
};

const Portal = ({ children }) => {
  return ReactPortal.createPortal(children, document.body);
};

export const DialogContent = ({ className, children, ...props }) => {
  const { open, setOpen } = React.useContext(DialogContext);

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]",
                className
              )}
              {...props}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer z-10"
              >
                <X size={16} />
              </button>

              {children}
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("p-6 pb-2 space-y-2 border-b border-slate-100", className)} {...props} />
);

export const DialogFooter = ({ className, ...props }) => (
  <div className={cn("p-6 pt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 border-t border-slate-100 bg-slate-50/50", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }) => (
  <h2 className={cn("text-lg font-bold text-slate-900", className)} {...props} />
);

export const DialogDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
);

export const DialogClose = ({ asChild, children }) => {
  const { setOpen } = React.useContext(DialogContext);
  if (asChild) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        setOpen(false);
      },
    });
  }
  return <Button variant="outline" onClick={() => setOpen(false)}>{children}</Button>;
};
