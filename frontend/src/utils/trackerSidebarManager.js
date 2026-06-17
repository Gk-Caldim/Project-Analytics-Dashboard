// src/utils/trackerSidebarManager.js

export const trackerSidebarManager = {
  // ============== HIERARCHY 1: UPLOAD TRACKERS MODULE ==============
  loadUploadTrackerModules: () => {
    try {
      const saved = localStorage.getItem('upload_tracker_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading upload tracker modules:', error);
      return [];
    }
  },

  saveUploadTrackerModules: (modules) => {
    try {
      localStorage.setItem('upload_tracker_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving upload tracker modules:', error);
    }
  },

  createUploadTrackerProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `upload-project-${projectId}-${Date.now()}`,
      moduleId: `upload-project-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'upload-trackers',
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}`,
      isExpanded: false,
      submodules: [],
      stats: {
        fileCount: 0,
        lastUpload: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createUploadTrackerFile: (fileName, trackerId, projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let cleanedName = fileName;
    if (projectName) {
      const prefixUnderscore = projectName.replace(/\s+/g, '_') + '_';
      if (cleanedName.toLowerCase().startsWith(prefixUnderscore.toLowerCase())) {
        cleanedName = cleanedName.substring(prefixUnderscore.length);
      } else {
        const prefixSpace = projectName + '_';
        if (cleanedName.toLowerCase().startsWith(prefixSpace.toLowerCase())) {
          cleanedName = cleanedName.substring(prefixSpace.length);
        }
      }
    }

    return {
      id: `upload-file-${trackerId}`,
      moduleId: `upload-file-${trackerId}`,
      name: fileName,
      displayName: cleanedName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `upload-project-${projectId}`,
      trackerId: trackerId,
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'upload',
        department: null,
        employeeName: null,
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString()
      }
    };
  },

  addToUploadTrackers: (projectName, fileName, trackerId, metadata = {}) => {
    const modules = trackerSidebarManager.loadUploadTrackerModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let projectModule = modules.find(m =>
      m.moduleId === `upload-project-${projectId}` &&
      m.context === 'upload-management'
    );

    if (!projectModule) {
      projectModule = trackerSidebarManager.createUploadTrackerProject(projectName);
      modules.push(projectModule);
    }

    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'upload-management'
    );

    if (!existingFile) {
      const fileModule = trackerSidebarManager.createUploadTrackerFile(fileName, trackerId, projectName);
      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null,
        employeeName: metadata.employeeName || null
      };

      if (!projectModule.stats) {
        projectModule.stats = {
          fileCount: 0,
          lastUpload: null
        };
      }
      projectModule.stats.fileCount = projectModule.submodules.length;
      projectModule.stats.lastUpload = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();
      projectModule.submodules.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      trackerSidebarManager.saveUploadTrackerModules(modules);
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'upload-management' }
      }));
    }
    return modules;
  },

  removeFromUploadTrackers: (trackerId) => {
    const modules = trackerSidebarManager.loadUploadTrackerModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'upload-management'
      );

      if (fileIndex !== -1) {
        projectModule.submodules.splice(fileIndex, 1);
        if (!projectModule.stats) {
          projectModule.stats = {
            fileCount: 0,
            lastUpload: null
          };
        }
        projectModule.stats.fileCount = projectModule.submodules.length;
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        trackerSidebarManager.saveUploadTrackerModules(modules);
        window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
          detail: { type: 'delete', trackerId, context: 'upload-management' }
        }));
        break;
      }
    }
    return removed;
  },

  // ============== HIERARCHY 2: PROJECT DASHBOARD MODULE ==============
  loadProjectDashboardModules: () => {
    try {
      const saved = localStorage.getItem('project_dashboard_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading project dashboard modules:', error);
      return [];
    }
  },

  saveProjectDashboardModules: (modules) => {
    try {
      localStorage.setItem('project_dashboard_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving project dashboard modules:', error);
    }
  },

  createProjectDashboardProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-dashboard-${projectId}-${Date.now()}`,
      moduleId: `project-dashboard-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'projects-root',
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}`,
      isExpanded: false,
      submodules: [],
      projectStats: {
        totalFiles: 0,
        contributors: [],
        lastActivity: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createProjectDashboardFile: (fileName, trackerId, projectName, employeeName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-file-${trackerId}`,
      moduleId: `project-file-${trackerId}`,
      name: fileName,
      displayName: (projectName && fileName.startsWith(projectName + "_"))
        ? fileName.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
        : fileName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `project-dashboard-${projectId}`,
      trackerId: trackerId,
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      owner: employeeName,
      contributors: [employeeName],
      metadata: {
        source: 'project',
        uploadedBy: employeeName,
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString(),
        version: 1,
        lastModifiedBy: employeeName
      }
    };
  },

  addToProjectDashboard: (projectName, fileName, trackerId, employeeName, metadata = {}) => {
    const modules = trackerSidebarManager.loadProjectDashboardModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let projectModule = modules.find(m =>
      m.moduleId === `project-dashboard-${projectId}` &&
      m.context === 'project-dashboard'
    );

    if (!projectModule) {
      projectModule = trackerSidebarManager.createProjectDashboardProject(projectName);
      modules.push(projectModule);
    }

    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'project-dashboard'
    );

    if (!existingFile) {
      const fileModule = trackerSidebarManager.createProjectDashboardFile(
        fileName,
        trackerId,
        projectName,
        employeeName
      );

      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null
      };

      if (!projectModule.projectStats) {
        projectModule.projectStats = {
          totalFiles: 0,
          contributors: [],
          lastActivity: null
        };
      }
      if (!projectModule.projectStats.contributors.includes(employeeName)) {
        projectModule.projectStats.contributors.push(employeeName);
      }

      projectModule.submodules.push(fileModule);
      projectModule.projectStats.totalFiles = projectModule.submodules.length;
      projectModule.projectStats.lastActivity = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();
      projectModule.submodules.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      trackerSidebarManager.saveProjectDashboardModules(modules);
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'project-dashboard' }
      }));
    }
    return modules;
  },

  removeFromProjectDashboard: (trackerId) => {
    const modules = trackerSidebarManager.loadProjectDashboardModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'project-dashboard'
      );

      if (fileIndex !== -1) {
        projectModule.submodules.splice(fileIndex, 1);
        if (!projectModule.projectStats) {
          projectModule.projectStats = {
            totalFiles: 0,
            contributors: [],
            lastActivity: null
          };
        }
        projectModule.projectStats.totalFiles = projectModule.submodules.length;
        projectModule.projectStats.lastActivity = new Date().toISOString();
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        trackerSidebarManager.saveProjectDashboardModules(modules);
        window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
          detail: { type: 'delete', trackerId, context: 'project-dashboard' }
        }));
        break;
      }
    }
    return removed;
  },

  updateProjectNameInUploadTrackers: (oldProjectName, newProjectName, trackerId) => {
    const modules = trackerSidebarManager.loadUploadTrackerModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `upload-project-${oldProjectId}` &&
      m.context === 'upload-management'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `upload-project-${newProjectId}`;
      projectModule.path = `/upload-trackers/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `upload-project-${newProjectId}`;
          file.path = `/upload-trackers/${newProjectId}/${file.trackerId}`;
        }
      });

      trackerSidebarManager.saveUploadTrackerModules(modules);
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    }
  },

  updateProjectNameInProjectDashboard: (oldProjectName, newProjectName, trackerId) => {
    const modules = trackerSidebarManager.loadProjectDashboardModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `project-dashboard-${oldProjectId}` &&
      m.context === 'project-dashboard'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `project-dashboard-${newProjectId}`;
      projectModule.path = `/projects/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `project-dashboard-${newProjectId}`;
          file.path = `/projects/${newProjectId}/${file.trackerId}`;
        }
      });

      trackerSidebarManager.saveProjectDashboardModules(modules);
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    }
  },

  deleteFileFromAllContexts: (trackerId) => {
    const removedFromUpload = trackerSidebarManager.removeFromUploadTrackers(trackerId);
    const removedFromProject = trackerSidebarManager.removeFromProjectDashboard(trackerId);
    return { removedFromUpload, removedFromProject };
  },

  repairAllModules: () => {
    try {
      const uploadModules = trackerSidebarManager.loadUploadTrackerModules();
      const savedTrackers = localStorage.getItem('upload_trackers');
      const trackers = savedTrackers ? JSON.parse(savedTrackers) : [];
      let uploadModified = false;

      uploadModules.forEach(project => {
        const projectName = project.name;
        if (project.submodules) {
          project.submodules.forEach(file => {
            const correctDisplayName = (projectName && file.name.startsWith(projectName + "_"))
              ? file.name.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
              : file.name.replace(/\.[^/.]+$/, "");

            if (file.displayName !== correctDisplayName) {
              file.displayName = correctDisplayName;
              uploadModified = true;
            }

            const tracker = trackers.find(t => t.id === file.trackerId);
            if (tracker && (!file.metadata?.employeeName)) {
              if (!file.metadata) file.metadata = {};
              file.metadata.employeeName = tracker.employeeName;
              uploadModified = true;
            }
          });
        }
      });

      if (uploadModified) {
        trackerSidebarManager.saveUploadTrackerModules(uploadModules);
      }

      const projectModules = trackerSidebarManager.loadProjectDashboardModules();
      let projectModified = false;

      projectModules.forEach(project => {
        const projectName = project.name;
        if (project.submodules) {
          project.submodules.forEach(file => {
            const correctDisplayName = (projectName && file.name.startsWith(projectName + "_"))
              ? file.name.substring(projectName.length + 1).replace(/\.[^/.]+$/, "")
              : file.name.replace(/\.[^/.]+$/, "");

            if (file.displayName !== correctDisplayName) {
              file.displayName = correctDisplayName;
              projectModified = true;
            }
          });
        }
      });

      if (projectModified) {
        trackerSidebarManager.saveProjectDashboardModules(projectModules);
      }

      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    } catch (error) {
      console.error('Error repairing modules:', error);
    }
  },

  getUploadTrackerFiles: () => {
    const modules = trackerSidebarManager.loadUploadTrackerModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({ ...file, projectName: project.name, projectId: project.moduleId });
      });
    });
    return files;
  },

  getProjectDashboardFiles: () => {
    const modules = trackerSidebarManager.loadProjectDashboardModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({ ...file, projectName: project.name, projectId: project.moduleId });
      });
    });
    return files;
  },

  clearAllData: () => {
    localStorage.removeItem('upload_tracker_modules');
    localStorage.removeItem('project_dashboard_modules');
    window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
  }
};
