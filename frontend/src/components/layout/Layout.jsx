import React from 'react';
import Navbar from './Navbar';
import LayoutSidebar from './Sidebar';
import styles from './Layout.module.css';

/**
 * Layout — Master wrapper combining Navbar + Sidebar + main content area
 *
 * Passes through children and Redux props unchanged.
 * Does NOT connect to Redux itself — parent provides all data via props.
 *
 * @param {React.ReactNode} children          - Main content
 * @param {object}          navbarProps        - Props forwarded to Navbar
 * @param {object}          sidebarProps       - Props forwarded to Sidebar
 * @param {boolean}         sidebarCollapsed   - Whether sidebar is collapsed
 * @param {function}        onSidebarCollapse  - Sidebar collapse toggle callback
 * @param {boolean}         fluid              - If true, content fills full width (no max-width)
 * @param {boolean}         hideSidebar        - Completely hide sidebar (e.g. public pages)
 * @param {boolean}         hideNavbar         - Completely hide navbar
 */
const Layout = ({
  children,
  navbarProps = {},
  sidebarProps = {},
  sidebarCollapsed = false,
  onSidebarCollapse,
  fluid = false,
  hideSidebar = false,
  hideNavbar = false,
}) => {
  return (
    <div className={styles.layoutRoot} id="jira-layout">
      {/* Fixed Navbar */}
      {!hideNavbar && <Navbar {...navbarProps} />}

      {/* Spacer to push content below fixed navbar */}
      {!hideNavbar && <div className={styles.navbarSpacer} />}

      {/* Body: sidebar spacer + content */}
      <div className={styles.body}>
        {/* Sidebar (fixed-position rendered inside) + spacer div */}
        {!hideSidebar && (
          <>
            <LayoutSidebar
              {...sidebarProps}
              collapsed={sidebarCollapsed}
              onCollapse={onSidebarCollapse}
            />
            <div
              className={`${styles.sidebarSpacer} ${
                sidebarCollapsed ? styles.sidebarSpacerCollapsed : ''
              }`}
            />
          </>
        )}

        {/* Main content area */}
        <main
          className={`${styles.content} ${fluid ? styles.contentFluid : ''}`}
          id="jira-main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
