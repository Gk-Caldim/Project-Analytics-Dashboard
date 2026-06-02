import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000, // 30 seconds timeout to allow for cold starts or heavy processing
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Configured with Base URL:', API.defaults.baseURL);

// Add token to requests
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    const isGetRequest = config && config.method && config.method.toLowerCase() === 'get';
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED';

    // Retry only GET requests on network/timeout errors up to 3 times
    if ((isNetworkError || isTimeout) && isGetRequest && config) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(`[API] Retrying GET request ${config.url} (Attempt ${config.__retryCount}/3) due to: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return API(config);
      }
    }

    if (error.response && error.response.status === 401) {
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
