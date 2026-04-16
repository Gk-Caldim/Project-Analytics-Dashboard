import React, { useState, useRef, useEffect } from 'react';
import './PremiumProjectCard.css';
import { MoreVertical, Pin, CheckSquare, Square } from 'lucide-react';

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
  onUrgencyChange
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
      {/* Top Header Row with Status / Menu */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectionMode && (
            <div style={{ color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)', cursor: 'pointer' }}>
              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
          )}
          {isPinned && <Pin size={14} fill="var(--accent)" color="var(--accent)" />}
          {urgency !== 'None' && (
            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', padding: '2px 6px', background: `${getUrgencyColor()}20`, color: getUrgencyColor(), borderRadius: '4px' }}>
              {urgency}
            </span>
          )}
        </div>

        <div className="card-menu-container" ref={menuRef} style={{ position: 'relative' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <MoreVertical size={16} />
          </button>
          
          {menuOpen && (
            <div style={{ position: 'absolute', top: '100%', right: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px', zIndex: 10, minWidth: '140px' }} onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => { onPinToggle(!isPinned); setMenuOpen(false); }}
                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', borderRadius: '4px' }}
              >
                {isPinned ? 'Unpin Project' : 'Pin Project'}
              </button>
              <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
                Set Urgency
              </div>
              {['Low', 'Medium', 'High', 'Critical'].map(level => (
                <button 
                  key={level}
                  onClick={() => { onUrgencyChange(level); setMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: urgency === level ? 'var(--bg)' : 'none', border: 'none', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', color: level === 'Critical' ? '#F04438' : 'inherit' }}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <h3 className="project-name" style={{ marginTop: 0 }}>{project.name}</h3>

      <div className="card-divider" />

      <div className="meta-grid">
        <div className="meta-item">
          <span className="meta-label">Submodules</span>
          <span className="meta-value">{subModulesCount}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">State</span>
          <span className={`status-tag ${isConfigured ? 'configured' : 'pending'}`}>
            {isConfigured ? 'Configured' : 'Not Configured'}
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
  );
};

export default PremiumProjectCard;
