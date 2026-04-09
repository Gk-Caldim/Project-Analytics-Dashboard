// src/utils/sidebarManager.js
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';

// Load dynamic modules from localStorage
export const loadDynamicModules = () => {
  try {
    const saved = localStorage.getItem('dynamic_modules');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading dynamic modules:', error);
    return [];
  }
};

// Save dynamic modules to localStorage
export const saveDynamicModules = (modules) => {
  try {
    localStorage.setItem('dynamic_modules', JSON.stringify(modules));
  } catch (error) {
    console.error('Error saving dynamic modules:', error);
  }
};

// Create a project module
export const createProjectModule = (projectName) => {
  const projectId = projectName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  return {
    id: `project-${projectId}`,
    name: projectName,
    icon: 'Folder',
    type: 'project',
    parentId: 'upload-trackers',
    path: `/projects/${projectId}`,
    isExpanded: false,
    submodules: [],
    createdAt: new Date().toISOString()
  };
};

// Create a file module
export const createFileModule = (fileName, trackerId, projectId) => {
  return {
    id: `file-${trackerId}`,
    name: fileName,
    icon: 'FileText',
    type: 'file',
    parentId: `project-${projectId}`,
    trackerId: trackerId,
    path: `/projects/${projectId}/${trackerId}`,
    createdAt: new Date().toISOString()
  };
};

// Add a new project with file
export const addProjectWithFile = (projectName, fileName, trackerId) => {
  const dynamicModules = loadDynamicModules();
  const projectId = projectName.toLowerCase().replace(/\s+/g, '-');
  
  // Check if project exists
  let projectModule = dynamicModules.find(m => m.id === `project-${projectId}`);
  
  if (!projectModule) {
    // Create new project
    projectModule = createProjectModule(projectName);
    dynamicModules.push(projectModule);
  }
  
  // Add file to project
  const fileModule = createFileModule(fileName, trackerId, projectId);
  projectModule.submodules.push(fileModule);
  
  // Save to localStorage
  saveDynamicModules(dynamicModules);
  
  return dynamicModules;
};

// Get project modules for a specific parent
export const getProjectModules = (parentId = 'upload-trackers') => {
  const dynamicModules = loadDynamicModules();
  return dynamicModules.filter(module => module.parentId === parentId);
};

// Delete a file module
export const deleteFileModule = (trackerId) => {
  const dynamicModules = loadDynamicModules();
  
  for (const projectModule of dynamicModules) {
    const fileIndex = projectModule.submodules.findIndex(file => file.trackerId === trackerId);
    if (fileIndex !== -1) {
      projectModule.submodules.splice(fileIndex, 1);
      
      // If project has no more files, remove it
      if (projectModule.submodules.length === 0) {
        const projectIndex = dynamicModules.findIndex(proj => proj.id === projectModule.id);
        if (projectIndex !== -1) {
          dynamicModules.splice(projectIndex, 1);
        }
      }
      
      saveDynamicModules(dynamicModules);
      return true;
    }
  }
  return false;
};