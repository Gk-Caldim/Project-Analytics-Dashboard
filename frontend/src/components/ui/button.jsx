import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Button — Zoho-style button with multiple variants.
 *
 * Variants: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * Sizes:    'sm' | 'md' | 'lg' | 'icon'
 */
export const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center justify-center gap-1.5 font-medium',
          'rounded-lg transition-all duration-150 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50 select-none',

          // Variants
          variant === 'primary' && [
            'bg-blue-600 text-white shadow-sm shadow-blue-200',
            'hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98]',
          ],
          variant === 'secondary' && [
            'bg-slate-100 text-slate-700 border border-slate-200',
            'hover:bg-slate-200 active:bg-slate-300 active:scale-[0.98]',
          ],
          variant === 'outline' && [
            'border border-slate-300 text-slate-700 bg-white',
            'hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]',
          ],
          variant === 'ghost' && [
            'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
            'active:bg-slate-200 active:scale-[0.98]',
          ],
          variant === 'danger' && [
            'bg-red-600 text-white shadow-sm shadow-red-200',
            'hover:bg-red-700 active:bg-red-800 active:scale-[0.98]',
          ],

          // Sizes
          size === 'sm' && 'h-7 px-3 text-xs',
          size === 'md' && 'h-9 px-4 text-sm',
          size === 'lg' && 'h-11 px-5 text-sm',
          size === 'icon' && 'h-9 w-9 p-0',

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
