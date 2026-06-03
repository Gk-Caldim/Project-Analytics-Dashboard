import React from 'react';
import { cn } from '../../lib/utils';

export const Alert = React.forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
        variant === 'default' && "bg-white text-slate-900 border-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800 [&>svg]:text-slate-900 dark:[&>svg]:text-slate-50",
        variant === 'destructive' && "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 [&>svg]:text-red-600 dark:[&>svg]:text-red-400",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight text-sm", className)}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[13px] leading-relaxed text-inherit opacity-95", className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
