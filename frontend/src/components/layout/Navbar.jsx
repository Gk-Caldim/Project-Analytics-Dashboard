import React, { useCallback } from 'react';
import { Search, Plus, Filter, Bell, HelpCircle, User } from 'lucide-react';
import styles from './Navbar.module.css';

/**
 * Navbar — Fixed top navigation bar (56px)
 *
 * Pure UI component. No API calls or state management.
 *
 * @param {string}   searchValue       - Current search input value
 * @param {function} onSearch          - Callback: (value: string) => void
 * @param {Array}    breadcrumbs       - Array of { label, href?, active? }
 * @param {object}   user              - { name, initials, avatarUrl }
 * @param {number}   notificationCount - Badge count for bell icon
 * @param {function} onNewIssue        - Quick action: create issue
 * @param {function} onFilter          - Quick action: toggle filter panel
 * @param {function} onHelp            - Quick action: show help
 * @param {function} onUserClick       - Quick action: user menu
 * @param {React.ReactNode} logo       - Optional custom logo element
 */
const Navbar = ({
  searchValue = '',
  onSearch,
  breadcrumbs = [],
  user = {},
  notificationCount = 0,
  onNewIssue,
  onFilter,
  onHelp,
  onUserClick,
  logo,
}) => {
  const handleSearchChange = useCallback(
    (e) => {
      if (onSearch) onSearch(e.target.value);
    },
    [onSearch]
  );

  const userInitials = user?.initials || (user?.name ? user.name.charAt(0).toUpperCase() : 'U');

  return (
    <nav className={styles.navbar} id="jira-navbar">
      {/* Logo */}
      <div className={styles.logoSection}>
        {logo || (
          <span className={styles.logoText}>PA</span>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input
          id="jira-navbar-search"
          type="text"
          className={styles.searchInput}
          placeholder="Search issues, projects, documents..."
          value={searchValue}
          onChange={handleSearchChange}
          aria-label="Search"
        />
      </div>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb} aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const isActive = crumb.active || isLast;
          return (
            <React.Fragment key={crumb.label + idx}>
              {idx > 0 && (
                <span className={styles.breadcrumbSeparator}>/</span>
              )}
              <span
                className={`${styles.breadcrumbItem} ${isActive ? styles.breadcrumbItemActive : ''}`}
                onClick={!isActive && crumb.href ? () => window.location.assign(crumb.href) : undefined}
                role={isActive ? undefined : 'link'}
                tabIndex={isActive ? undefined : 0}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={onNewIssue}
          title="New Issue (C)"
          aria-label="New Issue"
          id="jira-action-new-issue"
        >
          <Plus size={18} />
        </button>

        <button
          className={styles.actionBtn}
          onClick={onFilter}
          title="Filter"
          aria-label="Filter"
          id="jira-action-filter"
        >
          <Filter size={18} />
        </button>

        <button
          className={styles.actionBtn}
          onClick={() => {}}
          title="Notifications"
          aria-label="Notifications"
          id="jira-action-notifications"
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className={styles.notifBadge}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        <button
          className={styles.actionBtn}
          onClick={onHelp}
          title="Help"
          aria-label="Help"
          id="jira-action-help"
        >
          <HelpCircle size={18} />
        </button>

        <button
          className={styles.userBtn}
          onClick={onUserClick}
          title={user?.name || 'User menu'}
          aria-label="User menu"
          id="jira-action-user"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            userInitials
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
