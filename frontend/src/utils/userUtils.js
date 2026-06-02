// src/utils/userUtils.js

export const getCurrentUser = () => {
  const sessionUserStr = sessionStorage.getItem('user');
  if (sessionUserStr) {
    try {
      const user = JSON.parse(sessionUserStr);
      return user.name || user.username || user.email?.split('@')[0] || 'Unknown User';
    } catch (e) {
      console.error('Error parsing session user', e);
    }
  }

  const userData = localStorage.getItem('currentUser');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.name || user.username || user.email?.split('@')[0] || 'Unknown User';
    } catch (e) {
      console.error('Error parsing local user', e);
    }
  }
  return sessionStorage.getItem('username') || 'Demo User';
};
