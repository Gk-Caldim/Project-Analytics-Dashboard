import React from 'react';
import './DashboardHomeLayout.css';

const DashboardHomeLayout = ({ children }) => {
  return (
    <div className="dashboard-home-layout">
      {children}
    </div>
  );
};

export default DashboardHomeLayout;
