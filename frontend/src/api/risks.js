import API from '../utils/api';

export const logRisk = async (projectId, data) => {
  const response = await API.post(`/risks/project/${projectId}`, data);
  return response.data;
};

export const getProjectRisks = async (projectId) => {
  const response = await API.get(`/risks/project/${projectId}`);
  return response.data;
};

export const updateProjectRisk = async (riskId, data) => {
  const response = await API.put(`/risks/${riskId}`, data);
  return response.data;
};

export const deleteProjectRisk = async (riskId) => {
  const response = await API.delete(`/risks/${riskId}`);
  return response.data;
};
