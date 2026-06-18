import API from '../utils/api';

export const logComplaint = async (projectId, data) => {
  const response = await API.post(`/customer/complaints/${projectId}`, data);
  return response.data;
};

export const getComplaints = async (projectId, limit = 50) => {
  const response = await API.get(`/customer/complaints/${projectId}?limit=${limit}`);
  return response.data;
};

export const updateComplaint = async (complaintId, data) => {
  const response = await API.put(`/customer/complaints/${complaintId}`, data);
  return response.data;
};

export const getSentimentTrend = async (projectId, days = 30) => {
  const response = await API.get(`/customer/sentiment-trend/${projectId}?days=${days}`);
  return response.data;
};

export const getEightDStatus = async (projectId) => {
  const response = await API.get(`/customer/8d-status/${projectId}`);
  return response.data;
};
