import React from 'react';
import { cn } from '../../lib/utils';

export const Alert = React.forwardRef(({ className, variant = 'default', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
        variant === 'default' && "bg-[#EBF8FF] border border-[#BEE3F8] text-[#2A4365] rounded-lg [&>svg]:text-[#3182CE]",
        variant === 'destructive' && "bg-[#FFF5F5] border border-[#FEB2B2] text-[#9B2C2C] rounded-lg [&>svg]:text-[#E53E3E]",
        variant === 'success' && "bg-[#F0FDF4] border border-[#C6F6D5] text-[#22543D] rounded-lg [&>svg]:text-[#38A169]",
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
