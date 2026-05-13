import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Skeleton — shimmer placeholder for loading states.
 * Usage: <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80',
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
