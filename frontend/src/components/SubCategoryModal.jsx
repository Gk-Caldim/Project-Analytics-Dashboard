import React from 'react';
import { X, Settings } from 'lucide-react';
import ProjectSubCategoryMaster from './project/ProjectSubCategoryMaster';

const SubCategoryModal = ({ isOpen, onClose, project, showNotification, onRefresh }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Settings className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Sub Category Master</h2>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{project?.project_id}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{project?.name}</span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all text-slate-500 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <ProjectSubCategoryMaster 
            project={project}
            showNotification={showNotification}
            onRefresh={onRefresh}
        />
      </div>
    </div>
  );
};

export default SubCategoryModal;
