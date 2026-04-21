// src/utils/userUtils.js

export const getCurrentUser = () => {
  const userData = localStorage.getItem('currentUser');
  if (userData) {
    const user = JSON.parse(userData);
    return user.name || user.username || 'Unknown User';
  }
  return sessionStorage.getItem('username') || 'Demo User';
};
