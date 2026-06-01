import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000, // 30 seconds — accommodates cold starts and heavy processing
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Configured with Base URL:', API.defaults.baseURL);

// ── REQUEST: attach access token from storage ─────────────────────────────────
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Helpers: wipe all auth state and redirect to login ───────────────────────
function clearAuthAndRedirect() {
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('keepMeSignedIn');
  window.location.href = '/login';
}

// ── RESPONSE: retry GET on network/timeout; silent refresh on 401 ─────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // 1. Retry GET requests up to 3× on network / timeout errors
    const isGetRequest = config && config.method && config.method.toLowerCase() === 'get';
    const isNetworkError = !response;
    const isTimeout = error.code === 'ECONNABORTED';

    if ((isNetworkError || isTimeout) && isGetRequest && config) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(
          `[API] Retrying GET ${config.url} (attempt ${config.__retryCount}/3): ${error.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return API(config);
      }
    }

    // 2. Silent token refresh on 401
    // _retry flag prevents infinite loops if the refresh call itself returns 401
    if (response && response.status === 401 && !config._retry) {
      config._retry = true;

      const storedRefreshToken =
        sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');

      if (storedRefreshToken) {
        try {
          // Use a plain axios instance — NOT the API singleton — to avoid re-entering this interceptor
          const refreshResponse = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
            { refresh_token: storedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

          // Update storage (Redux state self-heals on next user action)
          sessionStorage.setItem('token', access_token);
          if (newRefreshToken) sessionStorage.setItem('refresh_token', newRefreshToken);

          // Persist to localStorage only if the user originally chose "Keep me signed in"
          if (localStorage.getItem('keepMeSignedIn') === 'true') {
            localStorage.setItem('token', access_token);
            if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Retry the original request with the new access token
          config.headers.Authorization = `Bearer ${access_token}`;
          return API(config);
        } catch (refreshError) {
          // Refresh token itself is expired or invalid — full logout
          console.warn('[API] Refresh token expired — redirecting to login.');
          clearAuthAndRedirect();
          return Promise.reject(refreshError);
        }
      }

      // No refresh token available — cannot recover, redirect to login
      clearAuthAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default API;
