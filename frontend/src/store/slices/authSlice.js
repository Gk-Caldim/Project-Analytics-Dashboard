import { createSlice } from '@reduxjs/toolkit';
import API from '../../utils/api';

const getInitialUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user'));
  } catch (e) {
    return null;
  }
};

const getInitialToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token') || null;
};

const initialState = {
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { token, refresh_token, user, rememberMe } = action.payload;
      state.loading = false;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;

      // Always write to sessionStorage (cleared when browser tab closes)
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('token', token);
      if (refresh_token) sessionStorage.setItem('refresh_token', refresh_token);

      if (rememberMe) {
        // Persist across browser restarts
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        localStorage.setItem('keepMeSignedIn', 'true');
        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('keepMeSignedIn');
        localStorage.removeItem('refresh_token');
      }
    },
    // Silent update: called by api.js interceptor after a successful background refresh.
    // Keeps the user logged in; only updates the access token (+ new refresh_token if provided).
    tokenRefreshed: (state, action) => {
      const { token, refresh_token, user } = action.payload;
      state.token = token;
      if (user) state.user = user;
      state.isAuthenticated = true;

      sessionStorage.setItem('token', token);
      if (refresh_token) sessionStorage.setItem('refresh_token', refresh_token);

      // Only persist to localStorage if the user originally chose "Keep me signed in"
      if (localStorage.getItem('keepMeSignedIn') === 'true') {
        localStorage.setItem('token', token);
        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
        if (user) localStorage.setItem('user', JSON.stringify(user));
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('keepMeSignedIn');
      localStorage.removeItem('refresh_token');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      sessionStorage.setItem('user', JSON.stringify(action.payload));
      if (localStorage.getItem('keepMeSignedIn') === 'true') {
        localStorage.setItem('user', JSON.stringify(action.payload));
      }
    }
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser, tokenRefreshed } = authSlice.actions;

export const refreshUserProfile = () => async (dispatch) => {
  try {
    const response = await API.get('/auth/me');
    dispatch(setUser(response.data));
    return response.data;
  } catch (error) {
    console.error('Error refreshing user profile:', error);
  }
};

export default authSlice.reducer;

