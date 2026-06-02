import React, { useState, useRef, useEffect } from 'react';
import './PremiumProjectCard.css';
import { MoreVertical, Pin, CheckSquare, Square, Trash2 } from 'lucide-react';

const PremiumProjectCard = ({ 
  project, 
  onClick, 
  isFeatured, 
  viewMode = 'grid',
  selectionMode = false,
  isSelected = false,
  onSelect,
  isPinned = false,
  onPinToggle,
  urgency = 'None',
  onUrgencyChange,
  onDeleteRequest
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const isConfigured = !!project.dashboardConfig;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const URGENCY_LEVELS = ['Normal', 'Low', 'Medium', 'High', 'Critical'];

  const getUrgencyColor = (level = urgency) => {
    switch(level) {
      case 'Critical': return '#F04438';
      case 'High': return '#F79009';
      case 'Medium': return '#F59E0B';
      case 'Low':    return '#64748B';
      default:       return null; // Normal / None — no badge
    }
  };

  const urgencyColor = getUrgencyColor();

  // Render urgency menu items (shared between grid + list)
  const renderUrgencyOptions = () => URGENCY_LEVELS.map(level => {
    const lColor = getUrgencyColor(level);
    return (
      <button
        key={level}
        className={`dropdown-item urgency-btn ${urgency === level || (level === 'Normal' && (!urgency || urgency === 'None')) ? 'active' : ''}`}
        style={{ color: urgency === level && lColor ? lColor : 'inherit' }}
        onClick={() => {
          // "Normal" resets priority to 'None'
          onUrgencyChange(level === 'Normal' ? 'None' : level);
          setMenuOpen(false);
        }}
      >
        <div
          className="urgency-dot-small"
          style={{ background: lColor || '#94a3b8', opacity: lColor ? 1 : 0.4 }}
        />
        {level}
      </button>
    );
  });

  return (
    <div 
      className={`executive-project-card ${isFeatured ? 'featured' : ''} ${isPinned ? 'pinned' : ''} ${urgencyColor ? 'has-priority' : ''} ${viewMode === 'list' ? 'list-view' : ''}`}
      style={urgencyColor || isPinned ? { '--glow-color': urgencyColor || 'var(--accent)' } : {}}
      onClick={(e) => {
        if (selectionMode) {
          onSelect(!isSelected);
        } else if (!menuOpen) {
          onClick(project.id);
        }
      }}
    >
      <div className="card-header-wrapper">
        <div className="card-title-area">
          <div className="title-and-indicators">
            {selectionMode && (
              <div className="selection-indicator">
                {isSelected ? <CheckSquare size={18} color="var(--accent)" /> : <Square size={18} color="var(--text-tertiary)" />}
              </div>
            )}
            <h3 className="project-name">{project.name}</h3>
            {isPinned && (
              <div className="pin-indicator" title="Pinned Project">
                <Pin size={14} fill="var(--accent)" color="var(--accent)" style={{ transform: 'rotate(45deg)' }} />
              </div>
            )}
          </div>
          {urgencyColor && (
            <span className="urgency-pill" style={{ background: `${urgencyColor}18`, color: urgencyColor, border: `1px solid ${urgencyColor}30` }}>
              <div className="urgency-dot" style={{ background: urgencyColor }} />
              {urgency}
            </span>
          )}
        </div>

        {viewMode === 'grid' && (
          <div className="card-menu-container" ref={menuRef}>
            <button 
              className="menu-trigger"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <MoreVertical size={18} />
            </button>
            
            {menuOpen && (
              <div className="card-dropdown-menu" onClick={e => e.stopPropagation()}>
                <button className="dropdown-item" onClick={() => { onPinToggle(!isPinned); setMenuOpen(false); }}>
                  <Pin size={14} style={{ transform: isPinned ? 'none' : 'rotate(45deg)' }} /> 
                  {isPinned ? 'Unpin Project' : 'Pin to Top'}
                </button>
                
                <div className="dropdown-divider" />
                <div className="dropdown-label">Priority Level</div>
                
                <div className="urgency-options">
                  {renderUrgencyOptions()}
                </div>

                <div className="dropdown-divider" />
                <button 
                  className="dropdown-item" 
                  style={{ color: '#F04438' }} 
                  onClick={() => { onDeleteRequest(project); setMenuOpen(false); }}
                >
                  <Trash2 size={14} /> Delete Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'list' && (
        <div className="list-manager-info">
          <span className="meta-label">Manager</span>
          <span className="meta-value">{project.project_manager || 'Not Assigned'}</span>
        </div>
      )}



      <div className="card-content-wrapper">
        <div className="meta-grid">
          {viewMode === 'grid' && (
            <div className="meta-item">
              <span className="meta-label">Manager</span>
              <span className="meta-value manager-name-text">
                {project.project_manager || <span className="text-muted-value">Not Assigned</span>}
              </span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-label">Team Lead</span>
            <span className="meta-value team-lead-name-text">
              {project.employee_name || <span className="text-muted-value">Not Assigned</span>}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <span className={`status-tag ${isConfigured ? 'configured' : 'pending'}`}>
              {isConfigured ? 'Configured' : 'Pending Setup'}
            </span>
          </div>
        </div>

        <div className="card-actions">
          {viewMode === 'list' && (
            <div className="card-menu-container" ref={menuRef}>
              <button 
                className="menu-trigger"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              >
                <MoreVertical size={18} />
              </button>
              
              {menuOpen && (
                <div className="card-dropdown-menu" onClick={e => e.stopPropagation()}>
                  <button className="dropdown-item" onClick={() => { onPinToggle(!isPinned); setMenuOpen(false); }}>
                    <Pin size={14} style={{ transform: isPinned ? 'none' : 'rotate(45deg)' }} /> 
                    {isPinned ? 'Unpin Project' : 'Pin to Top'}
                  </button>
                  
                  <div className="dropdown-divider" />
                  <div className="dropdown-label">Priority Level</div>
                  
                  <div className="urgency-options">
                    {renderUrgencyOptions()}
                  </div>

                  <div className="dropdown-divider" />
                  <button 
                    className="dropdown-item" 
                    style={{ color: '#F04438' }} 
                    onClick={() => { onDeleteRequest(project); setMenuOpen(false); }}
                  >
                    <Trash2 size={14} /> Delete Project
                  </button>
                </div>
              )}
            </div>
          )}
          <button 
             className="view-button" 
             onClick={(e) => {
               e.stopPropagation();
               onClick(project.id);
             }}>
            View <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumProjectCard;
