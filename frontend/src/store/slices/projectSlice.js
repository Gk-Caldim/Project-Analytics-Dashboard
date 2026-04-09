import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projects: JSON.parse(sessionStorage.getItem('project_dashboard_configs') || '[]'),
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjects: (state, action) => {
      const apiProjects = action.payload;
      // Merge: Keep existing dashboardConfig if available
      state.projects = apiProjects.map(apiProj => {
        // Try to find existing project by ID first, then by normalized name
        const existing = state.projects.find(p => 
          p.id === apiProj.id || 
          p.name.trim().toLowerCase() === apiProj.name.trim().toLowerCase()
        );
        
        return {
          ...apiProj,
          // Only overwrite dashboardConfig if the new one is present/valid
          // or if no existing one exists
          dashboardConfig: (apiProj.dashboardConfig && Object.keys(apiProj.dashboardConfig).length > 0)
            ? apiProj.dashboardConfig 
            : (existing ? existing.dashboardConfig : apiProj.dashboardConfig)
        };
      });
      sessionStorage.setItem('project_dashboard_configs', JSON.stringify(state.projects));
    },
    updateProjectConfig: (state, action) => {
      const { projectId, config } = action.payload; // config can be { visibleSections: ... } or { axisConfigs: ... } etc.
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        project.dashboardConfig = {
          ...(project.dashboardConfig || {}),
          ...config
        };
        sessionStorage.setItem('project_dashboard_configs', JSON.stringify(state.projects));
      }
    }
  },
});

export const { setProjects, updateProjectConfig } = projectSlice.actions;
export default projectSlice.reducer;
