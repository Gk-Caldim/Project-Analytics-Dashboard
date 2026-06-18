import API from '../utils/api';

export const getDashboard = async (projectId, module = null) => {
  const url = module
    ? `/dashboard/${projectId}?module=${encodeURIComponent(module)}`
    : `/dashboard/${projectId}`;
  const response = await API.get(url);
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await API.get('/dashboard/summary');
  return response.data;
};

export const getDashboardSummaryAnalytics = async () => {
  const response = await API.get('/dashboard/summary/analytics');
  return response.data;
};

/** All project structures — used for site operations tab */
export const getProjectStructures = async () => {
  const response = await API.get('/projects/all/structures');
  return response.data;
};

/** All employees — used for workforce tab */
export const getEmployees = async () => {
  const response = await API.get('/employees');
  return response.data || [];
};

/** All issues (optionally filtered by project_id or priority) */
export const getAllIssues = async ({ project_id, priority } = {}) => {
  const params = new URLSearchParams();
  if (project_id) params.set('project_id', project_id);
  if (priority) params.set('priority', priority);
  const query = params.toString();
  const response = await API.get(`/issues${query ? '?' + query : ''}`);
  return Array.isArray(response.data) ? response.data : [];
};

/** Budget revisions — used for overview spend tracking */
export const getBudgetRevisions = async () => {
  const response = await API.get('/budget/revisions/');
  return response.data || [];
};

/** Meetings — used for compliance / activity feed */
export const getMeetings = async () => {
  const response = await API.get('/meetings');
  return response.data?.meetings || [];
};
