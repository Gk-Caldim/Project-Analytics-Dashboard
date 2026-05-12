import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Item — Zoho-style list row components.
 *
 * Composition:
 *   <Item variant="outline">
 *     <ItemMedia>...</ItemMedia>
 *     <ItemContent>
 *       <ItemTitle>...</ItemTitle>
 *       <ItemDescription>...</ItemDescription>
 *     </ItemContent>
 *     <ItemActions>...</ItemActions>
 *   </Item>
 */

export function Item({ className, variant = 'default', style, ...props }) {
  return (
    <div
      className={cn(
        // Base
        'group relative flex items-center gap-4 bg-white transition-all duration-200',
        // Variants
        variant === 'outline' && [
          'border border-slate-200 rounded-xl px-5 py-4',
          'hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/80',
          'hover:-translate-y-[1px]',
        ],
        variant === 'default' && 'px-4 py-3 border-b border-slate-100 last:border-b-0',
        className
      )}
      style={style}
      {...props}
    />
  );
}

export function ItemMedia({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg',
        className
      )}
      {...props}
    />
  );
}

export function ItemContent({ className, ...props }) {
  return (
    <div className={cn('flex-1 min-w-0', className)} {...props} />
  );
}

export function ItemTitle({ className, ...props }) {
  return (
    <p
      className={cn(
        'text-sm font-semibold text-slate-800 truncate leading-snug',
        'group-hover:text-blue-700 transition-colors duration-150',
        className
      )}
      {...props}
    />
  );
}

export function ItemDescription({ className, ...props }) {
  return (
    <p
      className={cn(
        'mt-0.5 text-xs text-slate-500 flex items-center flex-wrap gap-1.5 leading-snug',
        className
      )}
      {...props}
    />
  );
}

export function ItemActions({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 flex items-center gap-1 ml-auto',
        className
      )}
      {...props}
    />
  );
}
