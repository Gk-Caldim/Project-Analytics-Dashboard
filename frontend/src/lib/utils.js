import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes without conflicts.
 * Accepts strings, arrays, objects { className: boolean }, and falsy values.
 * @param  {...any} inputs
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  const classes = inputs
    .flat(Infinity)
    .flatMap(input => {
      if (!input) return [];
      if (typeof input === 'string') return [input];
      if (Array.isArray(input)) return input;
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k);
      }
      return [];
    })
    .filter(Boolean);
  return twMerge(classes.join(' '));
}

