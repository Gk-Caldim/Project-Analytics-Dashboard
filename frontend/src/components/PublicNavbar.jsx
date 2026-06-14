import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
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
          <div className="public-logo-wrapper">
            <svg className="public-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="#2563EB" />
              <rect x="13" y="2" width="9" height="9" rx="2" fill="#10B981" />
              <rect x="2" y="13" width="9" height="9" rx="2" fill="#F59E0B" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="#EF4444" />
            </svg>
          </div>
          <span className="public-logo-text">Industrial Analytics Workspace</span>
        </div>
        
        <div className="public-nav-right">
          <a href="#products" className="public-nav-link" onClick={handleProductsClick}>Products</a>
          <a 
            href="/customers" 
            className={`public-nav-link ${isActive('/customers') ? 'active' : ''}`} 
            onClick={(e) => { 
              e.preventDefault(); 
              toast.info("Coming Soon", {
                description: "The Customers module is currently under development."
              });
            }}
          >
            Customers
          </a>
          <a 
            href="/pricing" 
            className={`public-nav-link ${isActive('/pricing') ? 'active' : ''}`} 
            onClick={(e) => { 
              e.preventDefault(); 
              toast.info("Coming Soon", {
                description: "The Pricing plans page is currently under development."
              });
            }}
          >
            Pricing
          </a>
          <a 
            href="/enterprise" 
            className={`public-nav-link ${isActive('/enterprise') ? 'active' : ''}`} 
            onClick={(e) => { 
              e.preventDefault(); 
              toast.info("Coming Soon", {
                description: "The Enterprise integration suite is currently under development."
              });
            }}
          >
            Enterprise
          </a>
          <button className="public-nav-login" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button className="public-btn-primary" onClick={() => navigate('/login')}>
            Access Workspace
          </button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
