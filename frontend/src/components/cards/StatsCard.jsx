import React from 'react';
import styles from './StatsCard.module.css';

/**
 * StatsCard — KPI / statistics display card
 *
 * Pure UI component. No API calls.
 *
 * @param {React.ReactElement} icon      - Lucide icon element
 * @param {string}             label     - KPI label (e.g. "Budget Utilized")
 * @param {string|number}      value     - Display value (e.g. "$2.4M")
 * @param {string}             subtext   - Additional context (e.g. "65% of $3.7M")
 * @param {object}             trend     - { direction: 'up'|'down', percent: number }
 * @param {string}             color     - CSS color for accent stripe (optional)
 * @param {string}             className - Additional class names
 * @param {string}             id        - HTML id attribute
 */
const StatsCard = ({
  icon,
  label,
  value,
  subtext,
  trend,
  color,
  className = '',
  id,
}) => {
  return (
    <div
      className={`${styles.statsCard} ${className}`.trim()}
      id={id}
    >
      {/* Accent stripe */}
      {color && (
        <div className={styles.accentStripe} style={{ background: color }} />
      )}

      {/* Top row: icon + trend */}
      <div className={styles.topRow}>
        {/* Icon */}
        {icon && (
          <div className={styles.iconWrapper} style={color ? { color } : undefined}>
            {React.cloneElement(icon, { size: icon.props.size || 20 })}
          </div>
        )}

        {/* Trend badge */}
        {trend && trend.percent !== undefined && (
          <span
            className={`${styles.trend} ${
              trend.direction === 'up' ? styles.trendUp : styles.trendDown
            }`}
          >
            <span className={styles.trendArrow}>
              {trend.direction === 'up' ? '▲' : '▼'}
            </span>
            {trend.percent}%
          </span>
        )}
      </div>

      {/* Label */}
      {label && <div className={styles.label}>{label}</div>}

      {/* Value */}
      {value !== undefined && value !== null && (
        <div className={styles.value}>{value}</div>
      )}

      {/* Subtext */}
      {subtext && <div className={styles.subtext}>{subtext}</div>}
    </div>
  );
};

export default StatsCard;
