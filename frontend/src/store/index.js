import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import navReducer from './slices/navSlice';
import projectReducer from './slices/projectSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    nav: navReducer,
    project: projectReducer,
  },
});

export default store;
