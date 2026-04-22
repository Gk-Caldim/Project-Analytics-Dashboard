import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PublicNavbar.css';

const PublicNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  const handleProductsClick = (e) => {
    e.preventDefault();
    if (currentPath === '/') {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#products');
    }
  };

  return (
    <nav className="public-nav">
      <div className="public-nav-inner">
        <div className="public-logo-area" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="public-logo-box"></div>
          <span className="public-logo-text">Industrial Analytics Workspace</span>
        </div>
        
        <div className="public-nav-right">
          <a href="#products" className="public-nav-link" onClick={handleProductsClick}>Products</a>
          <a 
            href="/customers" 
            className={`public-nav-link ${isActive('/customers') ? 'active' : ''}`} 
            onClick={(e) => { e.preventDefault(); navigate('/customers'); }}
          >
            Customers
          </a>
          <a 
            href="/pricing" 
            className={`public-nav-link ${isActive('/pricing') ? 'active' : ''}`} 
            onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}
          >
            Pricing
          </a>
          <a 
            href="/enterprise" 
            className={`public-nav-link ${isActive('/enterprise') ? 'active' : ''}`} 
            onClick={(e) => { e.preventDefault(); navigate('/enterprise'); }}
          >
            Enterprise
          </a>
          <button className="public-nav-login" onClick={() => navigate('/workspace-login')}>
            Sign In
          </button>
          <button className="public-btn-primary" onClick={() => navigate('/workspace-login')}>
            Access Workspace
          </button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
