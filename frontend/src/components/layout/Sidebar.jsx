import React, { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import styles from './Sidebar.module.css';

/**
 * Default navigation items per frontend.md Section 2.
 * Consumers can override via the `items` prop.
 */
const DEFAULT_NAV_ITEMS = [
  {
    id: 'projects',
    icon: LayoutDashboard,
    label: 'Projects',
    subMenu: [
      { label: 'All Projects', url: '/projects' },
      { label: 'My Projects', url: '/projects/mine' },
      { label: 'Archived', url: '/projects/archived' },
      { label: 'Create New', url: '/projects/new', action: true },
    ],
  },
  {
    id: 'issues',
    icon: ListTodo,
    label: 'Issues',
    subMenu: [
      { label: 'Assigned to me', url: '/issues?assignee=me' },
      { label: 'Recently viewed', url: '/issues/recent' },
      { label: 'All issues', url: '/issues' },
      { label: 'Filters', url: '/issues/filters', divider: true },
    ],
  },
  {
    id: 'roadmap',
    icon: Calendar,
    label: 'Roadmap',
    subMenu: [
      { label: 'Timeline', url: '/roadmap' },
      { label: 'Milestones', url: '/roadmap/milestones' },
      { label: 'Releases', url: '/roadmap/releases' },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics',
    subMenu: [
      { label: 'Dashboard', url: '/analytics' },
      { label: 'Reports', url: '/analytics/reports' },
      { label: 'Metrics', url: '/analytics/metrics' },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    url: '/settings',
  },
];

/**
 * Sidebar — Fixed left navigation panel (240px / 60px collapsed)
 *
 * Pure UI component. No API calls.
 * Reads Redux props indirectly via parent — does NOT connect to store itself.
 *
 * @param {string}   activeItem   - Currently active nav item id
 * @param {function} onNavigate   - Callback: (item: { id, url, label }) => void
 * @param {Array}    items        - Override nav items (default: Jira-style nav)
 * @param {boolean}  collapsed    - Controlled collapsed state (optional)
 * @param {function} onCollapse   - Callback when collapse toggle is clicked
 */
const LayoutSidebar = ({
  activeItem = 'projects',
  onNavigate,
  items,
  collapsed: controlledCollapsed,
  onCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const navItems = items || DEFAULT_NAV_ITEMS;

  const toggleCollapse = useCallback(() => {
    if (onCollapse) {
      onCollapse(!isCollapsed);
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  }, [isCollapsed, onCollapse]);

  const toggleSubMenu = useCallback((itemId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }, []);

  const handleItemClick = useCallback(
    (item) => {
      if (item.subMenu && item.subMenu.length > 0) {
        toggleSubMenu(item.id);
      }
      if (onNavigate) {
        onNavigate(item);
      }
    },
    [onNavigate, toggleSubMenu]
  );

  const handleSubItemClick = useCallback(
    (parentItem, subItem) => {
      if (onNavigate) {
        onNavigate({ ...subItem, parentId: parentItem.id });
      }
    },
    [onNavigate]
  );

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}
      id="jira-sidebar"
      aria-label="Main navigation"
    >
      <nav className={styles.navScroll}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const hasSubMenu = item.subMenu && item.subMenu.length > 0;
          const isExpanded = expandedMenus[item.id];

          return (
            <div key={item.id}>
              {/* Nav item */}
              <div
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick(item)}
                title={isCollapsed ? item.label : undefined}
                role="button"
                tabIndex={0}
                aria-expanded={hasSubMenu ? isExpanded : undefined}
              >
                {Icon && <Icon size={18} className={styles.navItemIcon} />}
                <span className={styles.navItemLabel}>{item.label}</span>
                {hasSubMenu && (
                  <ChevronRight
                    size={14}
                    className={`${styles.navItemChevron} ${isExpanded ? styles.navItemChevronOpen : ''}`}
                  />
                )}
              </div>

              {/* Sub-menu */}
              {hasSubMenu && isExpanded && !isCollapsed && (
                <div className={styles.subMenu}>
                  {item.subMenu.map((sub, subIdx) => (
                    <React.Fragment key={sub.label + subIdx}>
                      {sub.divider && <div className={styles.subMenuDivider} />}
                      <div
                        className={`${styles.subMenuItem} ${
                          activeItem === sub.url ? styles.subMenuItemActive : ''
                        }`}
                        onClick={() => handleSubItemClick(item, sub)}
                        role="button"
                        tabIndex={0}
                      >
                        {sub.label}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        className={styles.collapseBtn}
        onClick={toggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        id="jira-sidebar-collapse"
      >
        {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </aside>
  );
};

export default LayoutSidebar;
