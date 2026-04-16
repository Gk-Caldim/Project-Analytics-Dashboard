import React from 'react';
import { Layers } from 'lucide-react';
import './PremiumProjectCard.css';

const PremiumProjectCard = ({ project, onClick, isFeatured }) => {
  const subModulesCount = project.submodules ? project.submodules.length : 0;
  const isConfigured = !!project.dashboardConfig;

  return (
    <div 
      className={`executive-project-card group flex flex-col justify-between ${isFeatured ? 'featured' : ''}`}
      onClick={() => onClick(project.id)}
      style={{ minHeight: '140px' }}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[1rem] font-bold text-slate-800 leading-snug pr-4 group-hover:text-slate-900 transition-colors duration-300">
          {project.name}
        </h3>
        {isConfigured ? (
          <span className="status-tag configured shrink-0">Configured</span>
        ) : (
          <span className="status-tag pending shrink-0">Pending</span>
        )}
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
