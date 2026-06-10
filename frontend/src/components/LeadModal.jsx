import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import API from '../utils/api';
import './LeadModal.css';

const ContactForm = ({ onSuccess, initialUseCase = 'General Inquiry', mode = 'sales' }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    work_email: '',
    company: '',
    team_size: '',
    use_case: initialUseCase,
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const personalEmailDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'zoho.com', 'mail.com', 'gmx.com', 'yandex.com',
      'proton.me', 'protonmail.com', 'live.com'
    ];

    const email = (formData.work_email || '').trim().toLowerCase();
    const domain = email.split('@')[1];
    if (personalEmailDomains.includes(domain)) {
      setError('Please use a corporate/work email address (e.g. name@company.com).');
      return;
    }

    setLoading(true);
    try {
      await API.post('/enterprise/lead', formData);
      onSuccess();
    } catch (err) {
      let msg = 'Failed to submit request. Please try again.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (typeof detail === 'object') {
          msg = detail.message || JSON.stringify(detail);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getSubmitText = () => {
    if (mode === 'demo') return 'Schedule My Demo';
    if (mode === 'pilot') return 'Request Enterprise Pilot';
    if (mode === 'sales') return 'Speak with Sales';
    return 'Request Access';
  };

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Full Name</label>
          <input 
            type="text" 
            name="full_name" 
            required 
            placeholder="Jane Doe"
            value={formData.full_name}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Work Email</label>
          <input 
            type="email" 
            name="work_email" 
            required 
            placeholder="jane@company.com"
            value={formData.work_email}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Company Name</label>
          <input 
            type="text" 
            name="company" 
            required 
            placeholder="Acme Corp"
            value={formData.company}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Team Size</label>
          <select name="team_size" required value={formData.team_size} onChange={handleChange}>
            <option value="">Select size</option>
            <option value="1-50">1 - 50</option>
            <option value="51-200">51 - 200</option>
            <option value="201-1000">201 - 1000</option>
            <option value="1000+">1000+</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Primary Use Case</label>
        <select name="use_case" required value={formData.use_case} onChange={handleChange}>
          <option value="Business intelligence">Portfolio Analytics</option>
          <option value="Meeting workflow">Meeting Workflow Automation</option>
          <option value="Budget tracking">Budget Intelligence</option>
          <option value="Team governance">Team Governance & Compliance</option>
          <option value="General Inquiry">General Inquiry</option>
        </select>
      </div>
      <div className="form-group">
        <label>Message (Optional)</label>
        <textarea 
          name="message" 
          rows="3" 
          placeholder={mode === 'demo' ? "Tell us about your team's specific pain points..." : "Tell us about your requirements..."}
          value={formData.message}
          onChange={handleChange}
        ></textarea>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="form-submit-btn" disabled={loading}>
        {loading ? (
          <><Loader2 className="animate-spin" size={18} /> Processing...</>
        ) : (
          <><ChevronRight size={18} /> {getSubmitText()}</>
        )}
      </button>
      <p className="form-privacy">By submitting, you agree to our <span>Privacy Policy</span>.</p>
    </form>
  );
};

const LeadModal = ({ isOpen, onClose, initialUseCase, mode = 'sales' }) => {
  const [submitted, setSubmitted] = useState(false);

  const getContent = () => {
    switch (mode) {
      case 'demo':
        return {
          title: "Experience the Workspace.",
          subtitle: "Schedule a 15-minute specialized walkthrough with a solutions architect."
        };
      case 'pilot':
        return {
          title: "Enterprise Pilot Program.",
          subtitle: "Start a 30-day cross-functional pilot with dedicated onboarding support."
        };
      case 'sales':
        return {
          title: "Contact our Sales Team.",
          subtitle: "Get a custom quote tailored to your organization's scale and security needs."
        };
      default:
        return {
          title: "Elevate your operations.",
          subtitle: "Join 2,400+ enterprises using Industrial Analytics Workspace."
        };
    }
  };

  const { title, subtitle } = getContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div 
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onClose}><X size={20} /></button>
            
            {!submitted ? (
              <div className="modal-inner">
                <div className="modal-header">
                  <h2 className="modal-title">{title}</h2>
                  <p className="modal-subtitle">{subtitle}</p>
                </div>
                <ContactForm 
                  initialUseCase={initialUseCase} 
                  mode={mode}
                  onSuccess={() => setSubmitted(true)} 
                />
              </div>
            ) : (
              <motion.div 
                className="modal-success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="success-icon-box">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <h3>Request Received!</h3>
                <p>Our solutions architect will reach out to your team within 24 hours to schedule a deep-dive session.</p>
                <button className="success-done-btn" onClick={onClose}>Done</button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export { LeadModal, ContactForm };
