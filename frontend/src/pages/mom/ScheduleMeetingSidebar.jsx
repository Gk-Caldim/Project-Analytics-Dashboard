// ScheduleMeetingSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import { RefreshCw } from 'lucide-react';
import './ScheduleMeetingSidebar.css';

const GoogleLogo = () => (
    <svg viewBox="0 0 533.5 544.3" style={{ width: '18px', height: '18px' }}>
      <path d="M533.5 277.3c0-19.7-1.8-38.6-5-56.6H272.1v107h146.6c-6.3 34.1-25.6 63-54.6 82.5l88.4 68.5c51.7-47.7 81-118.1 81-201.4z" fill="#4285f4"/>
      <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.4l-88.4-68.5c-24.4 16.3-55.8 26.1-92 26.1-70.8 0-130.7-47.8-152.1-112H27.9v70.5c45.2 89.9 138.2 149.3 244.2 149.3z" fill="#34a853"/>
      <path d="M120 324.4c-5.4-16.1-8.5-33.3-8.5-51.1 0-17.8 3.1-35.1 8.5-51.1V151.7H27.9c-18.1 36-28.5 76.5-28.5 119.3s10.4 83.3 28.5 119.3l92.1-71.2z" fill="#fbbc04"/>
      <path d="M272.1 107.7c40 0 75.8 13.7 104.1 40.8l78-78C407.3 26.7 345.5 1.1 272.1 1.1 166.1 1.1 73.1 60.5 27.9 150.4l92.1 71.2c21.4-64.2 81.3-113.9 152.1-113.9z" fill="#ea4335"/>
    </svg>
);

const MicrosoftLogo = () => (
    <svg viewBox="0 0 23 23" style={{ width: '18px', height: '18px' }}>
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
);

export function ScheduleMeetingSidebar({ isOpen, onClose, momData }) {
  // State
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    platform: null,
    description: '',
    duration: '60',
    attendees: '',
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    errors: {},
    successMessage: '',
    timezone: 'UTC+5:30',
  });

  const [meetingResult, setMeetingResult] = useState(null);

  // Get current timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    setUiState(prev => ({ ...prev, timezone: tz || `UTC${offset > 0 ? '-' : '+'}${Math.abs(offset / 60)}` }));
  }, []);

  // Form change handlers
  const handleDateChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
    validateField('date', e.target.value);
  }, []);

  const handleTimeChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, time: e.target.value }));
    validateField('time', e.target.value);
  }, []);
  
  const handleTitleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
    validateField('title', e.target.value);
  }, []);

  const selectPlatform = useCallback((platform, event) => {
    setFormData(prev => ({ ...prev, platform }));
    validateField('platform', platform);
    triggerRipple(event.currentTarget); // Ripple effect
  }, []);

  const validateField = useCallback((field, value) => {
    const rules = {
      title: (v) => v.trim().length > 0,
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      time: (v) => /^\d{2}:\d{2}$/.test(v),
      platform: (v) => ['teams', 'meet', 'gmeet'].includes(v),
    };

    const isValid = rules[field]?.(value) ?? true;
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: !isValid ? `Invalid ${field}` : null }
    }));
  }, []);

  // Submit handler
  const handlePublish = useCallback(async () => {
    // Validate
    if (!formData.title || !formData.date || !formData.time || !formData.platform) {
      setUiState(prev => ({
        ...prev,
        errors: {
          title: !formData.title ? 'Title required' : null,
          date: !formData.date ? 'Date required' : null,
          time: !formData.time ? 'Time required' : null,
          platform: !formData.platform ? 'Platform required' : null,
        }
      }));
      return;
    }

    setUiState(prev => ({ ...prev, isLoading: true, errors: {} }));

    try {
      let attendeesList = [];
      if (typeof formData.attendees === 'string') {
        attendeesList = formData.attendees.split(',').map(e => e.trim()).filter(e => e);
      }
        
      const response = await API.post('/meetings/publish', {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        platform: formData.platform === 'meet' ? 'gmeet' : formData.platform,
        attendees: attendeesList,
        duration_minutes: parseInt(formData.duration),
        timezone: uiState.timezone,
        organizer_email: 'noreply@antigravity.com' // Mock
      });

      const result = response.data;

      if (result.success) {
        setMeetingResult(result.meeting);
        setUiState(prev => ({
          ...prev,
          successMessage: `Meeting published successfully!`
        }));
      } else {
        setUiState(prev => ({
          ...prev,
          errors: { submit: result.error || 'Failed to publish meeting' }
        }));
      }
    } catch (error) {
      setUiState(prev => ({
        ...prev,
        errors: { submit: error.response?.data?.detail || error.response?.data?.error || 'Failed to publish meeting' }
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [formData, uiState.timezone]);

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      platform: null,
      description: '',
      duration: '60',
      attendees: '',
    });
    setUiState(prev => ({
      ...prev,
      errors: {},
      successMessage: '',
    }));
    setMeetingResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const triggerRipple = (element) => {
    if (!element) return;
    const ripple = document.createElement('div');
    ripple.className = 'button-ripple';
    ripple.style.left = '10px';
    ripple.style.top = '50%';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const isFormValid = formData.title && formData.date && formData.time && formData.platform;

  return (
    <div className={`schedule-meeting-sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <h3>Publish Meeting internally</h3>
        <button className="close-button" onClick={handleClose}>×</button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        
        {meetingResult ? (
          <div className="meeting-result-card" style={{ padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ color: '#166534', marginTop: 0, fontSize: '16px' }}>✓ Meeting Published!</h3>
            <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Platform:</strong> {meetingResult.platform.toUpperCase()}</p>
            <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Meeting Code:</strong> {meetingResult.meeting_code || 'N/A'}</p>
            <p style={{ margin: '5px 0', fontSize: '13px', color: meetingResult.invites_sent ? '#166534' : '#9ca3af' }}>
              <strong>Invites Sent:</strong> {meetingResult.invites_sent ? '✓ Yes' : '✗ No'}
            </p>
            
            {meetingResult.join_url && (
              <div className="join-section" style={{ marginTop: '15px' }}>
                <a 
                  href={meetingResult.join_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="primary-button"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '36px', textDecoration: 'none', marginBottom: '10px' }}
                >
                  Join Meeting
                </a>
                <p style={{ wordBreak: 'break-all', fontSize: '11px', color: '#6b7280', margin: 0 }}>{meetingResult.join_url}</p>
              </div>
            )}
            
            <button 
              onClick={() => setMeetingResult(null)} 
              style={{ marginTop: '15px', padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%' }}
            >
              Publish Another
            </button>
          </div>
        ) : (
          <>
            
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Meeting Title <span className="badge">Required</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Ex: Sync Status"
                className={`form-input ${uiState.errors.title ? 'error' : ''}`}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
              {uiState.errors.title && <p className="error-text">{uiState.errors.title}</p>}
            </div>

            {/* Platform Selection */}
            <div className="form-group">
              <label className="form-label">
                Publish via <span className="badge">1 required</span>
              </label>

              <div className="platform-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'teams', name: 'Microsoft Teams', icon: <MicrosoftLogo />, color: '#00a1f1' },
                  { id: 'meet', name: 'Google Meet', icon: <GoogleLogo />, color: '#ea4335' },
                ].map(platform => (
                  <button
                    key={platform.id}
                    className={`platform-button ${formData.platform === platform.id ? 'selected' : ''}`}
                    onClick={(e) => selectPlatform(platform.id, e)}
                    onMouseDown={(e) => triggerRipple(e.currentTarget)}
                    style={{
                        position: 'relative',
                        padding: '10px 4px',
                        border: '1px solid',
                        borderColor: formData.platform === platform.id ? '#4f46e5' : '#e5e7eb',
                        background: formData.platform === platform.id ? '#f5f7ff' : '#ffffff',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                  >
                    <div style={{
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: formData.platform === platform.id ? '#ffffff' : '#f9fafb',
                        borderRadius: '6px',
                    }}>
                        {platform.icon}
                    </div>
                    <span style={{ fontWeight: '600', fontSize: '9px', color: formData.platform === platform.id ? '#4338ca' : '#6b7280', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{platform.name.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
              {uiState.errors.platform && <p className="error-text">{uiState.errors.platform}</p>}
            </div>

            {/* Date & Time */}
            <div className="form-group">
              <label className="form-label">
                Date & time <span className="badge">Required</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                />
                <input
                  type="time"
                  value={formData.time}
                  onChange={handleTimeChange}
                  className={uiState.errors.time ? 'error' : ''}
                />
              </div>
              <div className="timezone-info">
                {uiState.timezone} • {new Date().toLocaleDateString('en-US', { timeZoneName: 'long' })}
              </div>
              {uiState.errors.date && <p className="error-text">{uiState.errors.date}</p>}
              {uiState.errors.time && <p className="error-text">{uiState.errors.time}</p>}
            </div>

            {/* Attendees */}
            <div className="form-group">
              <label className="form-label">Attendees (comma-separated emails)</label>
              <textarea 
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="email1@example.com, email2@example.com"
                className="form-textarea"
                rows="2"
              />
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="form-select"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add meeting details..."
                className="form-textarea"
                rows="3"
              />
            </div>

            {/* Error Messages */}
            {uiState.errors.submit && (
              <div className="error-banner" style={{ marginTop: '10px' }}>{uiState.errors.submit}</div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!meetingResult && (
        <div className="sidebar-footer">
          <button
            className={`primary-button ${uiState.isLoading ? 'loading' : ''} ${isFormValid ? '' : 'disabled'}`}
            onClick={handlePublish}
            disabled={!isFormValid || uiState.isLoading}
            style={{ width: '100%' }}
          >
            {uiState.isLoading ? 'Publishing...' : 'Publish & Send Invites'}
          </button>
        </div>
      )}
    </div>
  );
}
