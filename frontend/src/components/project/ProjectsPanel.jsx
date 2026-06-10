import React from 'react';
import PremiumProjectCard from './PremiumProjectCard';
import { Layout, Search } from 'lucide-react';
import './ProjectsPanel.css';

const ProjectsPanel = ({
  filteredAndSortedProjects,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  selectionMode,
  setSelectionMode,
  selectedProjects,
  setSelectedProjects,
  pinnedProjects,
  setPinnedProjects,
  projectUrgency,
  setProjectUrgency,
  setProjectToDelete,
  viewMode,
  setViewMode,
  handleProjectSelect,
  handleBulkPin,
  handleBulkUrgency
}) => {
  return (
    <div className="projects-panel-col projects-panel-container">
      {/* Centralized section title header with badge */}
      <div className="projects-header-row">
        <div className="title-accent-group">
          <span className="accent-bar" />
          <h2 className="section-title">Project Dashboard</h2>
        </div>
        <span className="project-count-badge">
          {filteredAndSortedProjects.length} Projects
        </span>
      </div>

      {/* Projects control row */}
      <div className="projects-controls-container">
        {/* Selection mode menu */}
        {selectionMode && selectedProjects.length > 0 && (
          <div className="bulk-actions-bar">
            <span className="bulk-selection-count">
              {selectedProjects.length} selected
            </span>
            <button
              onClick={() => handleBulkPin(true)}
              className="bulk-action-btn"
            >
              Pin
            </button>
            <button
              onClick={() => handleBulkPin(false)}
              className="bulk-action-btn"
            >
              Unpin
            </button>
            <button
              onClick={() => {
                setSelectionMode(false);
                setSelectedProjects([]);
              }}
              className="bulk-clear-btn"
            >
              Clear
            </button>
          </div>
        )}

        <div className="controls-right">
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedProjects([]);
            }}
            className={`select-mode-trigger ${selectionMode ? 'active' : ''}`}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </button>

          <span className="divider-line" />

          {/* View mode buttons */}
          <div className="view-mode-selector">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              aria-label="Grid view"
            >
              <Layout size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              aria-label="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid or List */}
      <div className={`projects-listing-container ${viewMode}`}>
        {filteredAndSortedProjects.length === 0 ? (
          <div className="no-projects-view">
            <Search size={32} className="no-projects-icon" />
            <p>No projects match your current filters or search query.</p>
          </div>
        ) : (
          filteredAndSortedProjects
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((project, idx) => (
              <PremiumProjectCard
                key={project.id}
                project={project}
                onClick={handleProjectSelect}
                isFeatured={false}
                viewMode={viewMode}
                selectionMode={selectionMode}
                isSelected={selectedProjects.includes(project.id)}
                onSelect={(selected) => {
                  if (selected) setSelectedProjects((prev) => [...prev, project.id]);
                  else setSelectedProjects((prev) => prev.filter((id) => id !== project.id));
                }}
                isPinned={pinnedProjects.includes(project.id)}
                onPinToggle={(pin) => {
                  if (pin) setPinnedProjects((prev) => [...new Set([...prev, project.id])]);
                  else setPinnedProjects((prev) => prev.filter((id) => id !== project.id));
                }}
                urgency={projectUrgency[project.id] || 'None'}
                onUrgencyChange={(level) => {
                  setProjectUrgency((prev) => ({ ...prev, [project.id]: level }));
                }}
                onDeleteRequest={(p) => setProjectToDelete(p)}
              />
            ))
        )}
      </div>

      {/* Pagination Footer */}
      {filteredAndSortedProjects.length > itemsPerPage && (
        <div className="projects-pagination-footer">
          <span className="pagination-info">
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSortedProjects.length)} of {filteredAndSortedProjects.length}
          </span>
          <div className="pagination-buttons">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(Math.ceil(filteredAndSortedProjects.length / itemsPerPage), p + 1)
                )
              }
              disabled={currentPage === Math.ceil(filteredAndSortedProjects.length / itemsPerPage)}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPanel;
