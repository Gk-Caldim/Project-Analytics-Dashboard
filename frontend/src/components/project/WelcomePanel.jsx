import React from 'react';
import { Search, FolderKanban, X } from 'lucide-react';
import './WelcomePanel.css';

const WelcomePanel = ({
  user,
  searchQuery,
  setSearchQuery,
  homeSearchFocused,
  setHomeSearchFocused,
  filteredAndSortedProjects,
  handleProjectSelect,
  getUserInitials,
  getGreeting
}) => {
  return (
    <div className="welcome-panel-col welcome-panel-container">
      <div className="welcome-left-content">
        {/* Profile and Greeting Card */}
        <div className="enterprise-profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {getUserInitials()}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{user?.full_name || 'Welcome back'}</h3>
              <span className="profile-role">{user?.role || 'Member'}</span>
            </div>
          </div>
          <div className="profile-greeting-area">
            <p className="greeting-label">{getGreeting()}</p>
            <p className="greeting-subtext">
              Your workspace is ready — review projects, schedule meetings, and manage settings.
            </p>
          </div>
        </div>

        {/* Search area */}
        <div className="search-wrapper">
          <div className="search-input-container">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setHomeSearchFocused(true)}
              onBlur={() => setTimeout(() => setHomeSearchFocused(false), 160)}
              className="search-input"
              aria-label="Search projects"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {homeSearchFocused && searchQuery && filteredAndSortedProjects.length > 0 && (
            <div className="search-results-dropdown">
              <div className="dropdown-section-title">Projects</div>
              {filteredAndSortedProjects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  onMouseDown={() => {
                    handleProjectSelect(project.id);
                    setSearchQuery('');
                  }}
                  className="dropdown-result-item"
                >
                  <FolderKanban size={13} className="result-icon" />
                  <span className="result-name">{project.name}</span>
                  <span className="result-badge">Project</span>
                </button>
              ))}
            </div>
          )}
          
          {homeSearchFocused && searchQuery && filteredAndSortedProjects.length === 0 && (
            <div className="search-no-results">
              No projects match "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Centered SVG Illustration on the right */}
      <div className="svg-illustration-container">
        <img
          src="/real-time-analytics.svg"
          alt="Real-time Analytics"
          className="svg-illustration"
        />
      </div>
    </div>
  );
};

export default WelcomePanel;
