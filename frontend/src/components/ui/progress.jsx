import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Progress — clean, Google-like linear progress bar.
 * Supports determinate progress (value prop from 0 to 100)
 * and indeterminate progress (looping bar animation) if value is not provided.
 */
export function Progress({ value, className, ...props }) {
  const isIndeterminate = value === undefined || value === null;

  return (
    <div
      className={cn(
        'google-progress-bar w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-[4px] overflow-hidden relative',
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : value}
      {...props}
    >
      <div
        className={cn(
          'indicator h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out',
          isIndeterminate ? 'indeterminate' : ''
        )}
        style={isIndeterminate ? {} : { width: `${value}%` }}
      />
    </div>
  );
}

export default Progress;
