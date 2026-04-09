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
}
