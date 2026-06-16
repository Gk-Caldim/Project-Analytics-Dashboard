import React from 'react';
import styles from './Card.module.css';

/**
 * Card — Base card component with variant support
 *
 * Pure UI component. No API calls.
 *
 * @param {object}           header    - { title, icon: ReactElement, count, action: ReactElement }
 * @param {React.ReactNode}  footer    - Footer content
 * @param {'default'|'elevated'|'outlined'|'ghost'} variant - Visual variant
 * @param {React.ReactNode}  children  - Card body content
 * @param {string}           className - Additional class names
 * @param {string}           id        - HTML id attribute
 */
const Card = ({
  header,
  footer,
  variant = 'default',
  children,
  className = '',
  id,
  ...rest
}) => {
  const variantClass = variant !== 'default' ? styles[variant] : '';

  return (
    <div
      className={`${styles.card} ${variantClass} ${className}`.trim()}
      id={id}
      {...rest}
    >
      {/* Header */}
      {header && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {header.icon && (
              <span className={styles.headerIcon}>
                {React.cloneElement(header.icon, {
                  size: header.icon.props.size || 20,
                })}
              </span>
            )}
            {header.title && (
              <h3 className={styles.headerTitle}>{header.title}</h3>
            )}
            {header.count !== undefined && header.count !== null && (
              <span className={styles.headerCount}>{header.count}</span>
            )}
          </div>
          {header.action && (
            <div className={styles.headerAction}>{header.action}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={styles.body}>{children}</div>

      {/* Footer */}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Card;
