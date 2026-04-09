

import axios from "axios";

// Use environment variable if available, otherwise default to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const API_URL = `${API_BASE_URL}/mom`;

// GET all MOMs
export const getMOMs = () => {
  return axios.get(`${API_URL}/list`);
};

// CREATE new MOM
export const createMOM = (data) => {
  return axios.post(`${API_URL}/create`, data);
};

// UPDATE MOM (close / edit)
export const updateMOM = (id, data) => {
  return axios.put(`${API_URL}/update/${id}`, data);
};

// DELETE MOM
export const deleteMOM = (id) => {
  return axios.delete(`${API_URL}/delete/${id}`);
};

