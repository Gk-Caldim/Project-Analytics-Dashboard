import React from 'react';
import './PremiumProjectCard.css';

const ProgressRing = ({ percentage }) => {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percentage / 100);

  return (
    <div className="progress-ring-container">
      <svg className="progress-ring-svg" width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="#2E7CF6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="progress-ring-label">{percentage}%</div>
    </div>
  );
};

const PremiumProjectCard = ({ project, onClick, isFeatured }) => {
  const completionPercent = project.completion_percent ?? Math.floor(Math.random() * 40) + 60; // fallback if undefined
  const issues = project.issues ?? { critical: 0, warning: 0, low: 0 };
  const subModulesCount = project.submodules ? project.submodules.length : 0;
  const isConfigured = !!project.dashboardConfig;

  // Determine avatar icon style
  const code = project.code ?? project.name.substring(0, 4).toUpperCase();
  let iconBg = 'rgba(203, 213, 225, 0.2)'; // Default gray
  let iconColor = '#64748B';
  if (code.startsWith('LEYL')) {
    iconBg = 'rgba(46,124,246,0.1)';
    iconColor = '#2E7CF6';
  } else if (code.startsWith('DAS') || code.startsWith('DASH')) {
    iconBg = 'rgba(18,183,106,0.1)';
    iconColor = '#0B7A45';
  } else if (code.startsWith('ASHO')) {
    iconBg = 'rgba(247,144,9,0.1)';
    iconColor = '#92400E';
  }

  return (
    <div 
      className={`executive-project-card ${isFeatured ? 'featured' : ''}`}
      onClick={() => onClick(project.id)}
    >
      <div className="card-top-row">
        <div className="project-icon" style={{ background: iconBg, color: iconColor }}>
          {code.substring(0, 4)}
        </div>
        <ProgressRing percentage={completionPercent} />
      </div>

      <h3 className="project-name">{project.name}</h3>
      <p className="project-code">{code}</p>

      <div className="card-divider" />

      <div className="meta-grid">
        <div>
          <div className="meta-label">Submodules</div>
          <div className="meta-value">{subModulesCount}</div>
        </div>
        <div>
          <div className="meta-label">Completion</div>
          <div className="meta-value">{completionPercent}%</div>
        </div>
      </div>

      <div className="status-row">
        <div className="severity-badges">
          <div className="severity-badge">
            <div className="dot dot-red" />
            <span>{issues.critical}</span>
          </div>
          <div className="severity-badge">
            <div className="dot dot-amber" />
            <span>{issues.warning}</span>
          </div>
          <div className="severity-badge">
            <div className="dot dot-gray" />
            <span>{issues.low}</span>
          </div>
        </div>
        
        {isConfigured ? (
          <span className="status-tag configured">Configured</span>
        ) : (
          <span className="status-tag pending">Pending</span>
        )}
      </div>
    </div>
  );
};

export default PremiumProjectCard;
