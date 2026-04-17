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

  const subModulesCount = project.submodules ? project.submodules.length : 0;
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

  const getUrgencyColor = () => {
    switch(urgency) {
      case 'Critical': return '#F04438';
      case 'High': return '#F79009';
      case 'Medium': return '#F59E0B';
      default: return 'transparent'; // Low/None
    }
  };

  return (
    <div 
      className={`executive-project-card ${isFeatured ? 'featured' : ''} ${viewMode === 'list' ? 'list-view' : ''}`}
      style={urgency !== 'None' && urgency !== 'Low' ? { borderTop: `3px solid ${getUrgencyColor()}` } : {}}
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
          {urgency !== 'None' && (
            <span className="urgency-pill" style={{ background: `${getUrgencyColor()}15`, color: getUrgencyColor() }}>
              <div className="urgency-dot" style={{ background: getUrgencyColor() }} />
              {urgency}
            </span>
          )}
        </div>

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
                {['Low', 'Medium', 'High', 'Critical'].map(level => {
                  let lColor = level === 'Critical' ? '#F04438' : level === 'High' ? '#F79009' : level === 'Medium' ? '#F59E0B' : 'var(--text-secondary)';
                  return (
                    <button 
                      key={level}
                      className={`dropdown-item urgency-btn ${urgency === level ? 'active' : ''}`}
                      style={{ color: urgency === level ? lColor : 'inherit' }}
                      onClick={() => { onUrgencyChange(level); setMenuOpen(false); }}
                    >
                      <div className="urgency-dot-small" style={{ background: lColor }} />
                      {level}
                    </button>
                  );
                })}
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
      </div>

      <div className="card-divider" />

      <div className="card-content-wrapper">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Submodules</span>
            <span className="meta-value">{subModulesCount}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <span className={`status-tag ${isConfigured ? 'configured' : 'pending'}`}>
              {isConfigured ? 'Configured' : 'Pending Setup'}
            </span>
          </div>
        </div>

        <div className="card-actions">
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

      <div className="flex items-center gap-2 text-slate-500 font-medium pt-4 mt-auto border-t border-slate-100/80">
        <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-slate-100 transition-colors">
          <Layers className="h-4 w-4 text-slate-600" />
        </div>
        <span className="text-[13px] uppercase tracking-wider text-slate-600 group-hover:text-slate-800 transition-colors duration-300">{subModulesCount} {subModulesCount === 1 ? 'Submodule' : 'Submodules'}</span>
      </div>
    </div>
  );
};

export default PremiumProjectCard;
