import React from 'react';
import { X, Settings } from 'lucide-react';
import ProjectTrackerManagement from './project/ProjectTrackerManagement';

const SubCategoryModal = ({ isOpen, onClose, project, showNotification }) => {
  if (!isOpen) return null;

  return (
    <div className="app-modal-overlay z-[60]">
      <div className="app-modal-container max-w-6xl w-full max-h-[92vh]">
        
        {/* Header */}
        <div className="app-modal-header">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Settings className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Trackers management</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{project?.project_id}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{project?.name}</span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="app-modal-close-btn">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="app-modal-body overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
            <ProjectTrackerManagement 
                project={project}
                showNotification={showNotification}
            />
        </div>
      </div>
    </div>
  );
};

export default SubCategoryModal;
