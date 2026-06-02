import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Empty state components — follows Zoho's empty-state pattern.
 *
 * Composition:
 *   <Empty>
 *     <EmptyHeader>
 *       <EmptyMedia variant="icon"><SomeIcon /></EmptyMedia>
 *       <EmptyTitle>No items yet</EmptyTitle>
 *       <EmptyDescription>Get started by creating one.</EmptyDescription>
 *     </EmptyHeader>
 *     <EmptyContent>
 *       <button>Create</button>
 *     </EmptyContent>
 *   </Empty>
 */

export function Empty({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-8 text-center',
        className
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col items-center gap-4 mb-6', className)}
      {...props}
    />
  );
}

export function EmptyMedia({ className, variant = 'icon', ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-2xl',
        variant === 'icon' && 'w-16 h-16 bg-blue-50 text-blue-400',
        variant === 'image' && 'w-24 h-24',
        className
      )}
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        'text-base font-semibold text-slate-700 tracking-tight',
        className
      )}
      {...props}
    />
  );
}

export function EmptyDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-slate-400 max-w-xs leading-relaxed', className)}
      {...props}
    />
  );
}

export function EmptyContent({ className, ...props }) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props} />
  );
}
