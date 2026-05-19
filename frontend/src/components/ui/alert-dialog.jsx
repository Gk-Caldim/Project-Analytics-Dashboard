import React from 'react';
import * as ReactPortal from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Button } from './button';

const AlertDialogContext = React.createContext({ open: false, setOpen: () => {} });

export const AlertDialog = ({ open: controlledOpen, onOpenChange, children }) => {
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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

export const AlertDialogTrigger = ({ asChild, children }) => {
  const { setOpen } = React.useContext(AlertDialogContext);
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

export const AlertDialogContent = ({ className, children, ...props }) => {
  const { open, setOpen } = React.useContext(AlertDialogContext);

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
                "relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden",
                className
              )}
              {...props}
            >
              {children}
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export const AlertDialogHeader = ({ className, ...props }) => (
  <div className={cn("p-6 pb-2 space-y-2", className)} {...props} />
);

export const AlertDialogFooter = ({ className, ...props }) => (
  <div className={cn("p-6 pt-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3", className)} {...props} />
);

export const AlertDialogTitle = ({ className, ...props }) => (
  <h2 className={cn("text-lg font-bold text-slate-900", className)} {...props} />
);

export const AlertDialogDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-slate-500 leading-relaxed", className)} {...props} />
);

export const AlertDialogAction = ({ className, ...props }) => {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <Button
      variant="primary"
      className={cn("sm:w-auto", className)}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
};

export const AlertDialogCancel = ({ className, ...props }) => {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <Button
      variant="outline"
      className={cn("sm:w-auto mt-2 sm:mt-0", className)}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
};
