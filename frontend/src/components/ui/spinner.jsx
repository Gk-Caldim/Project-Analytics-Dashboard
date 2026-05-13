import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Spinner — lightweight animated loading indicator.
 * Variants: 'sm' (14px), 'md' (20px, default), 'lg' (28px)
 * Color follows text color (currentColor) unless overridden via className.
 */
export function Spinner({ size = 'md', className, ...props }) {
  const sizeMap = { sm: 14, md: 20, lg: 28 };
  const px = sizeMap[size] ?? 20;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('animate-spin', className)}
      aria-label="Loading"
      role="status"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default Spinner;
