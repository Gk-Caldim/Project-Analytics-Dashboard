import React from 'react';
import styles from './Badge.module.css';

/**
 * Status-to-CSS-class mapping.
 * Keys are normalized (lowercase, no spaces) for robust matching.
 */
const STATUS_CLASS_MAP = {
  open: 'open',
  'in progress': 'inProgress',
  inprogress: 'inProgress',
  'in review': 'inReview',
  inreview: 'inReview',
  blocked: 'blocked',
  done: 'done',
  completed: 'done',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

/**
 * Normalize a status string to match the class map.
 * @param {string} status
 * @returns {string} CSS module class name or 'neutral'
 */
const getStatusClass = (status) => {
  if (!status) return 'neutral';
  const normalized = status.toLowerCase().trim();
  return STATUS_CLASS_MAP[normalized] || 'neutral';
};

/**
 * Badge — Status indicator or count pill
 *
 * Pure UI component. No API calls.
 *
 * @param {string}           status    - Status text (e.g. "In Progress")
 * @param {number|string}    count     - Count to display (renders count-only variant if no status)
 * @param {'status'|'count'} variant   - Render mode. Default: 'status' if status is provided.
 * @param {string}           className - Additional class names
 */
const Badge = ({ status, count, variant, className = '' }) => {
  // Determine variant
  const effectiveVariant = variant || (status ? 'status' : 'count');

  if (effectiveVariant === 'count' && !status) {
    return (
      <span className={`${styles.badge} ${styles.countOnly} ${className}`.trim()}>
        {count}
      </span>
    );
  }

  const statusClass = getStatusClass(status);

  return (
    <span
      className={`${styles.badge} ${styles[statusClass] || styles.neutral} ${className}`.trim()}
    >
      <span className={styles.dot} />
      {status}
      {count !== undefined && count !== null && (
        <> ({count})</>
      )}
    </span>
  );
};

export default Badge;
