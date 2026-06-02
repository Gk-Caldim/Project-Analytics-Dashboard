/**
 * projectColors.js — Shared project color palette.
 * Both Dashboard and Saved MOMs reference this file so accent colors
 * are consistent across all pages.
 */

// Named overrides for known projects
export const KNOWN_PROJECT_COLORS = {
  zoho:     { accent: '#639922', bg: '#EAF3DE', text: '#27500A' },
  untitled: { accent: '#7F77DD', bg: '#EEEDFE', text: '#3C3489' },
};

// Auto-assign palette — applied in order for unknown projects
const PALETTE = [
  '#6366f1', // indigo
  '#0d9488', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f97316', // orange
  '#ec4899', // pink
  '#64748b', // slate
];

const _cache = {};
let _idx = 0;

/**
 * Returns a hex accent color for the given project name.
 * Same name always returns the same color; new names auto-assign
 * from the palette in order.
 */
export function getProjectAccent(name) {
  if (!name) return '#64748b';
  const key = name.toLowerCase().trim();

  if (KNOWN_PROJECT_COLORS[key]) return KNOWN_PROJECT_COLORS[key].accent;

  if (!_cache[key]) {
    _cache[key] = PALETTE[_idx % PALETTE.length];
    _idx++;
  }
  return _cache[key];
}

export default getProjectAccent;
