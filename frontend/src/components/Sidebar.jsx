import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { slideInLeft } from '../utils/animations';
import { 
    Layout as LayoutIcon, 
    Calendar, 
    Database, 
    FileUp, 
    Settings,
    ChevronDown,
    ChevronRight,
    Star
} from 'lucide-react';

// ─── Logo Block ─────────────────────────────────────────────────────────────
const LogoBlock = () => (
    <div className="h-[72px] flex items-center px-6 border-b border-white/5">
        <div className="text-white text-2xl font-bold tracking-[0.15em] font-primary">CALDIM</div>
    </div>
);

// ─── Main Sidebar Component ─────────────────────────────────────────────────
const Sidebar = ({
    activeModule,
    expandedModules,
    handleModuleClick,
    toggleModuleExpansion,
    projectDashboardModules,
    uploadTrackerModules,
    mastersSubmodules,
    otherModules,
    isFileSelected,
    handleFileModuleClick,
    handleProjectFileClick,
    hasAccess
}) => {
    const { 
        sidebarDashboardLimit = 10, 
        sidebarDashboardMode = 'custom',
        navigationHistory = []
    } = useSelector(state => state.nav);

    const renderProjectDashboardModule = () => {
        const isActive = activeModule === 'project-dashboard';
        const isExpanded = expandedModules['project-dashboard'];
        const hasDynamicModules = projectDashboardModules && projectDashboardModules.length > 0;

        return (
            <div key="project-dashboard">
                <div
                    onClick={() => handleModuleClick('project-dashboard')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <LayoutIcon size={20} />
                        <span className="text-[16px] font-medium tracking-tight">Dashboard</span>
                    </div>
                    {hasDynamicModules && (
                        <div onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('project-dashboard', e); }}>
                            {isExpanded ? <ChevronDown size={14} className="text-white/70" /> : <ChevronRight size={14} className="text-white/70" />}
                        </div>
                    )}
                </div>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="sidebar-tree-container">
                                {(() => {
                                    let displayedModules = projectDashboardModules || [];
                                    if (sidebarDashboardMode === 'recent') {
                                        const recentProjectIds = navigationHistory
                                            .filter(h => h.type === 'project' || h.context === 'project-dashboard')
                                            .map(h => h.dbProjectId || h.id)
                                            .filter(id => id);
                                        const uniqueRecentIds = [...new Set(recentProjectIds)].slice(0, 2);
                                        
                                        if (uniqueRecentIds.length > 0) {
                                            displayedModules = projectDashboardModules.filter(pm => 
                                                uniqueRecentIds.includes(pm.id || pm.projectId)
                                            );
                                        } else {
                                            displayedModules = projectDashboardModules.slice(0, 2);
                                        }
                                    } else {
                                        displayedModules = projectDashboardModules.slice(0, sidebarDashboardLimit);
                                    }
                                    
                                    return (
                                        <>
                                            {displayedModules.map((pm, idx) => {
                                                const projectKey = pm.id || pm.projectId || pm.name;
                                                const uniqueId = `project-dashboard-${projectKey}`;
                                                const isProjExpanded = expandedModules[uniqueId];

                                                return (
                                                    <div key={pm.id || idx} className="py-1">
                                                        <div 
                                                            className="flex items-center justify-between px-6 py-2 cursor-pointer group"
                                                            onClick={(e) => toggleModuleExpansion(uniqueId, e)}
                                                        >
                                                            <span className="text-[13px] font-bold text-white/30 uppercase tracking-widest truncate">{pm.name}</span>
                                                            {pm.submodules?.length > 0 && (
                                                                <div className="opacity-100 group-hover:opacity-100 transition-opacity">
                                                                    {isProjExpanded ? <ChevronDown size={12} className="text-white/70" /> : <ChevronRight size={12} className="text-white/70" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {isProjExpanded && pm.submodules && (
                                                            <div className="sidebar-tree-container ml-4 border-l border-white/5">
                                                                {pm.submodules.map(fileModule => {
                                                                    const isSelected = isFileSelected(fileModule, 'project-dashboard');
                                                                    return (
                                                                        <div
                                                                            key={fileModule.id}
                                                                            onClick={() => handleProjectFileClick({ ...fileModule, projectName: pm.name })}
                                                                            className={`sidebar-sub-item ${isSelected ? 'sidebar-sub-item-active' : ''}`}
                                                                        >
                                                                            <span className="truncate">
                                                                                {fileModule.displayName || fileModule.name.replace(/\.[^/.]+$/, "")}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {sidebarDashboardMode === 'recent' && projectDashboardModules.length > 2 && (
                                                <div 
                                                    className="sidebar-sub-item text-[11px] text-white/30 italic hover:text-white/60 mt-2 px-10"
                                                    onClick={() => handleModuleClick('project-dashboard')}
                                                >
                                                    View all projects in Dashboard...
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderMOMModule = () => {
        const isActive = activeModule === 'mom-module' || activeModule === 'meetings' || activeModule === 'schedule-meeting' || activeModule === 'saved-moms' || activeModule === 'calendar';
        const isExpanded = expandedModules['mom'];

        return (
            <div key="mom">
                <div
                    onClick={() => toggleModuleExpansion('mom')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <Calendar size={20} />
                        <span className="text-[16px] font-medium tracking-tight">Meetings</span>
                    </div>
                    <div>
                        {isExpanded ? <ChevronDown size={14} className="text-white/70" /> : <ChevronRight size={14} className="text-white/70" />}
                    </div>
                </div>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="sidebar-tree-container">
                                <div
                                    onClick={() => handleModuleClick('calendar')}
                                    className={`sidebar-sub-item ${activeModule === 'calendar' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span>My Calendar</span>
                                    </div>
                                </div>
                                <div
                                    onClick={() => handleModuleClick('meetings')}
                                    className={`sidebar-sub-item ${activeModule === 'meetings' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    All Meetings
                                </div>
                                <div
                                    onClick={() => handleModuleClick('schedule-meeting')}
                                    className={`sidebar-sub-item ${activeModule === 'schedule-meeting' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    Schedule Meeting
                                </div>
                                <div
                                    onClick={() => handleModuleClick('mom-module')}
                                    className={`sidebar-sub-item ${activeModule === 'mom-module' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    Create MOM
                                </div>
                                <div
                                    onClick={() => handleModuleClick('saved-moms')}
                                    className={`sidebar-sub-item ${activeModule === 'saved-moms' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    Saved MOMs
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderMastersModule = () => {
        const isExpanded = expandedModules['masters'];
        const isAnyMasterActive = activeModule === 'masters' || mastersSubmodules?.some(s => activeModule === s.id);

        return (
            <div key="masters">
                <div
                    onClick={() => toggleModuleExpansion('masters')}
                    className={`sidebar-nav-item ${isAnyMasterActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <Database size={20} />
                        <span className="text-[16px] font-medium tracking-tight">Master</span>
                    </div>
                    <div>
                        {isExpanded ? <ChevronDown size={14} className="text-white/70" /> : <ChevronRight size={14} className="text-white/70" />}
                    </div>
                </div>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="sidebar-tree-container">
                                {mastersSubmodules.map(module => {
                                    const isActive = activeModule === module.id;
                                    return (
                                        <div
                                            key={module.id}
                                            onClick={() => handleModuleClick(module.id)}
                                            className={`sidebar-sub-item ${isActive ? 'sidebar-sub-item-active' : ''}`}
                                        >
                                            {module.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderUploadTrackersModule = () => {
        const isActive = activeModule === 'upload-trackers';
        const isExpanded = expandedModules['upload-trackers'];
        const hasDynamicModules = uploadTrackerModules && uploadTrackerModules.length > 0;

        return (
            <div key="upload-trackers">
                <div
                    onClick={() => toggleModuleExpansion('upload-trackers')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <FileUp size={20} />
                        <span className="text-[16px] font-medium tracking-tight">Uploads</span>
                    </div>
                    {hasDynamicModules && (
                        <div>
                            {isExpanded ? <ChevronDown size={14} className="text-white/70" /> : <ChevronRight size={14} className="text-white/70" />}
                        </div>
                    )}
                </div>
                
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="sidebar-tree-container">
                                <div
                                    onClick={() => handleModuleClick('upload-trackers')}
                                    className={`sidebar-sub-item ${activeModule === 'upload-trackers' ? 'sidebar-sub-item-active' : ''}`}
                                >
                                    Trackers
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderOtherModules = () => {
        const allowedOtherModules = hasAccess && otherModules ? otherModules.filter(m => hasAccess(m.name)) : (otherModules || []);
        return allowedOtherModules.filter(m => m.id !== 'upload-trackers').map((module) => {
            const isActive = activeModule === module.id;
            return (
                <div
                    key={module.id}
                    onClick={() => handleModuleClick(module.id)}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div className="flex items-center gap-3 flex-1">
                        <Settings size={20} />
                        <span className="text-[16px] font-medium tracking-tight">{module.name}</span>
                    </div>
                </div>
            );
        });
    };

    return (
        <motion.div
            className="app-sidebar h-screen sticky top-0"
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
        >
            <LogoBlock />

            <div className="sidebar-scroll scrollbar-hide py-4">
                <div className="sidebar-section-label">WORKSPACE</div>
                {(!hasAccess || hasAccess('Dashboard')) && renderProjectDashboardModule()}
                {(!hasAccess || hasAccess('MOM')) && renderMOMModule()}

                <div className="sidebar-section-label" style={{ marginTop: '16px' }}>CONFIGURATION</div>
                {renderMastersModule()}
                {(!hasAccess || hasAccess('Upload Trackers')) && renderUploadTrackersModule()}
                {renderOtherModules()}
            </div>
        </motion.div>
    );
};

export default Sidebar;
