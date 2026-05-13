import React, { useState, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../components/ui/alert-dialog';

/**
 * useConfirm — A Zoho-engineered imperative confirmation hook.
 * Avoids JSX clutter by allowing 'await confirm({...})'.
 */
const ConfirmContext = React.createContext(() => {});

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Continue',
    cancelText: 'Cancel',
    variant: 'primary'
  });

  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setState({
      open: true,
      title: options.title || 'Are you sure?',
      description: options.description || 'This action cannot be undone.',
      confirmText: options.confirmText || 'Continue',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'primary'
    });

    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleClose = useCallback((value) => {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(value);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(val) => !val && handleClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {state.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction 
              variant={state.variant} 
              onClick={() => handleClose(true)}
              className={state.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {state.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = React.useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
};
