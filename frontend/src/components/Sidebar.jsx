import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInLeft } from '../utils/animations';

// ─── Inline SVGs ────────────────────────────────────────────────────────────
const IconProjects = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    </svg>
);

const IconMOM = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const IconMasters = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7h-9"></path>
        <path d="M14 17H5"></path>
        <circle cx="17" cy="17" r="3"></circle>
        <circle cx="7" cy="7" r="3"></circle>
    </svg>
);

const IconUpload = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

const IconSettings = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const IconFile = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
);

const IconChevron = ({ expanded }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const LogoBlock = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 16px 16px' }}>
        <div style={{ width: '32px', height: '32px', background: '#2E7CF6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', letterSpacing: '-0.02em', lineHeight: '1.2' }}>Caldim</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', letterSpacing: '0.02em', lineHeight: '1' }}>Industrial MOM</div>
        </div>
    </div>
);

// ─── Main Sidebar ────────────────────────────────────────────────────────────
const Sidebar = ({
    activeModule,
    expandedModules,
    sidebarCollapsed,
    sidebarRef,
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

    const renderProjectDashboardModule = () => {
        const isActive = activeModule === 'project-dashboard';
        const isExpanded = expandedModules['project-dashboard'];
        const hasDynamicModules = projectDashboardModules && projectDashboardModules.length > 0;

        return (
            <div>
                <div
                    onClick={() => handleModuleClick('project-dashboard')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <IconProjects />
                        {!sidebarCollapsed && <span style={{ fontSize: '13px' }}>Projects</span>}
                    </div>
                    {!sidebarCollapsed && hasDynamicModules && (
                        <div onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('project-dashboard', e); }}>
                            <IconChevron expanded={isExpanded} />
                        </div>
                    )}
                </div>
                {/* Embedded files drop-down (keeping exact original logic) */}
                <AnimatePresence>
                    {isExpanded && (!sidebarCollapsed) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ paddingLeft: '32px', overflow: 'hidden' }}
                        >
                            {projectDashboardModules.map((pm, idx) => (
                                <div key={pm.id || idx} style={{ marginBottom: '4px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', marginTop: '6px' }}>{pm.name}</div>
                                    {pm.submodules && pm.submodules.map(fileModule => {
                                        const isSelected = isFileSelected(fileModule, 'project-dashboard');
                                        return (
                                            <div
                                                key={fileModule.id}
                                                onClick={() => handleProjectFileClick({ ...fileModule, projectName: pm.name })}
                                                className={`sidebar-nav-item ${isSelected ? 'sidebar-nav-item-active' : ''}`}
                                                style={{ marginLeft: '-8px', padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <IconFile />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {fileModule.displayName || fileModule.name.replace(/\.[^/.]+$/, "")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderMOMModule = () => {
        const isActive = activeModule === 'mom-module';
        return (
            <div
                onClick={() => handleModuleClick('mom-module')}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IconMOM />
                    {!sidebarCollapsed && <span style={{ fontSize: '13px' }}>MOM</span>}
                </div>
            </div>
        );
    };

    const renderMastersModule = () => {
        const isExpanded = expandedModules['masters'];
        const hasSubmodules = mastersSubmodules && mastersSubmodules.length > 0;
        const isAnyMasterActive = activeModule === 'masters' || mastersSubmodules?.some(s => activeModule === s.id);

        return (
            <div>
                <div
                    onClick={() => handleModuleClick('masters')}
                    className={`sidebar-nav-item ${isAnyMasterActive && !activeModule.startsWith('masters-') ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <IconMasters />
                        {!sidebarCollapsed && <span style={{ fontSize: '13px' }}>Masters</span>}
                    </div>
                    {!sidebarCollapsed && hasSubmodules && (
                        <div onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('masters', e); }}>
                            <IconChevron expanded={isExpanded} />
                        </div>
                    )}
                </div>
                <AnimatePresence>
                    {isExpanded && (!sidebarCollapsed) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ paddingLeft: '24px', overflow: 'hidden' }}
                        >
                            {mastersSubmodules.map(module => {
                                const isActive = activeModule === module.id;
                                return (
                                    <div
                                        key={module.id}
                                        onClick={() => handleModuleClick(module.id)}
                                        className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                    >
                                        {module.name}
                                    </div>
                                );
                            })}
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
            <div>
                <div
                    onClick={() => handleModuleClick('upload-trackers')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <IconUpload />
                        {!sidebarCollapsed && <span style={{ fontSize: '13px' }}>Uploads</span>}
                    </div>
                    {!sidebarCollapsed && hasDynamicModules && (
                        <div onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('upload-trackers', e); }}>
                            <IconChevron expanded={isExpanded} />
                        </div>
                    )}
                </div>
                <AnimatePresence>
                    {isExpanded && (!sidebarCollapsed) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ paddingLeft: '32px', overflow: 'hidden' }}
                        >
                            {uploadTrackerModules.map(pm => (
                                <div key={pm.id} style={{ marginBottom: '4px' }}>
                                    {pm.submodules && pm.submodules.map(fileModule => {
                                        const isSelected = isFileSelected(fileModule, 'upload-trackers');
                                        return (
                                            <div
                                                key={fileModule.id}
                                                onClick={() => handleFileModuleClick(fileModule)}
                                                className={`sidebar-nav-item ${isSelected ? 'sidebar-nav-item-active' : ''}`}
                                                style={{ marginLeft: '-8px', padding: '6px 12px', fontSize: '12px' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <IconFile />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {fileModule.displayName || fileModule.name.replace(/\.[^/.]+$/, "")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IconSettings />
                        {!sidebarCollapsed && <span style={{ fontSize: '13px' }}>{module.name}</span>}
                    </div>
                </div>
            );
        });
    };

    return (
        <motion.div
            ref={sidebarRef}
            className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
        >
            <LogoBlock />

            <div className="sidebar-scroll">
                {!sidebarCollapsed && <div className="sidebar-section-label">WORKSPACE</div>}
                {(!hasAccess || hasAccess('Dashboard')) && renderProjectDashboardModule()}
                {(!hasAccess || hasAccess('MOM')) && renderMOMModule()}
                
                {!sidebarCollapsed && <div className="sidebar-section-label" style={{ marginTop: '12px' }}>CONFIGURATION</div>}
                {renderMastersModule()}
                {(!hasAccess || hasAccess('Upload Trackers')) && renderUploadTrackersModule()}
                {renderOtherModules()}
            </div>

            <div className="sidebar-footer">
                <div style={{ 
                    width: '30px', height: '30px', borderRadius: '50%', 
                    background: 'rgba(255,255,255,0.1)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: '#fff', fontWeight: 'bold'
                }}>
                    PR
                </div>
                {!sidebarCollapsed && (
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ color: '#fff', fontSize: '12px', fontWeight: '500', truncate: 'true' }}>Pradeep R.</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Administrator</div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Sidebar;
