import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronRight, Loader2, Calendar, Clock, Globe, ArrowLeft, ArrowRight } from 'lucide-react';
import API from '../utils/api';
import './LeadModal.css';

// Corporate Form for Sales / Pilot modes
const CorporateForm = ({ onSuccess, initialUseCase = 'General Inquiry', mode = 'sales' }) => {
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
        if (typeof detail === 'string') msg = detail;
        else if (Array.isArray(detail)) msg = detail.map(e => e.msg || e.message).join(', ');
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
    if (mode === 'pilot') return 'Request Enterprise Pilot';
    return 'Speak with Sales';
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
          placeholder="Tell us about your requirements..."
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

// Scheduler Wizard for Demo booking mode
const DemoScheduler = ({ onSuccess }) => {
  const [step, setStep] = useState(1); // 1 = Select slot, 2 = Enter details
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timezone, setTimezone] = useState('GMT+5:30 (IST)');
  
  const [formData, setFormData] = useState({
    full_name: '',
    work_email: '',
    company: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate next 5 business days
  const getDates = () => {
    const dates = [];
    const today = new Date();
    let current = new Date(today);
    
    while (dates.length < 5) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // skip Sat/Sun
        dates.push(new Date(current));
      }
    }
    return dates;
  };

  const dates = getDates();
  const timeSlots = ["10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM", "5:00 PM"];

  const handleNext = () => {
    if (selectedDate && selectedTime) {
      setStep(2);
    }
  };

  const handleBooking = async (e) => {
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
      const payload = {
        ...formData,
        use_case: `Demo Schedule: ${selectedDate} at ${selectedTime} (${timezone})`,
        team_size: 'N/A'
      };
      await API.post('/enterprise/lead', payload);
      onSuccess();
    } catch (err) {
      setError('Failed to book schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === 1 ? (
        <div className="scheduler-layout animate-in fade-in duration-200">
          {/* Timezone line */}
          <div className="timezone-row flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-semibold mb-4">
            <span className="flex items-center gap-1.5 font-mono"><Globe size={14} className="text-blue-500" /> Timezone:</span>
            <select 
              value={timezone} 
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-transparent border-0 font-sans focus:outline-none text-slate-700 cursor-pointer font-bold"
            >
              <option value="GMT+5:30 (IST)">India Standard Time (GMT+5:30)</option>
              <option value="GMT+0:00 (UTC)">Coordinated Universal Time (GMT+0:00)</option>
              <option value="GMT-5:00 (EST)">Eastern Standard Time (GMT-5:00)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dates Grid */}
            <div className="date-picker-col border border-slate-200/80 rounded-xl p-3 bg-white">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 font-mono">Select a Date</span>
              <div className="space-y-1.5">
                {dates.map((d) => {
                  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                      className={`w-full text-left py-2 px-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer flex justify-between items-center ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/20 text-blue-600 shadow-sm' 
                          : 'border-slate-150 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2"><Calendar size={13.5} /> {dateStr}</span>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="time-picker-col border border-slate-200/80 rounded-xl p-3 bg-white flex flex-col">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 font-mono">Select Time Slot</span>
              {!selectedDate ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-150 bg-slate-50/30 rounded-lg text-xs text-slate-400">
                  <Clock size={20} className="mb-2 text-slate-300" />
                  Select a date first
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-1 text-center rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50/20 text-blue-600 font-bold' 
                            : 'border-slate-150 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleNext}
            disabled={!selectedDate || !selectedTime}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
          >
            Confirm Time Slot <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleBooking} className="lead-form animate-in fade-in duration-200">
          <div className="back-row mb-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              <ArrowLeft size={14} /> Back to Scheduler
            </button>
          </div>

          <div className="p-3 bg-blue-50/30 border border-blue-100/60 rounded-xl text-xs text-blue-700 font-semibold mb-2 flex flex-col gap-1">
            <div className="flex items-center gap-1.5"><Calendar size={13.5} /> Selected: {selectedDate}</div>
            <div className="flex items-center gap-1.5"><Clock size={13.5} /> Time: {selectedTime} ({timezone})</div>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="full_name" 
              required 
              placeholder="Jane Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Work Email</label>
              <input 
                type="email" 
                name="work_email" 
                required 
                placeholder="jane@company.com"
                value={formData.work_email}
                onChange={(e) => setFormData({...formData, work_email: e.target.value})}
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
                onChange={(e) => setFormData({...formData, company: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Specific Topics to Cover (Optional)</label>
            <textarea 
              name="message" 
              rows="2" 
              placeholder="E.g., custom spreadsheet templates, compliance audits..."
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            ></textarea>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="form-submit-btn shadow-md" disabled={loading}>
            {loading ? (
              <><Loader2 className="animate-spin" size={18} /> Scheduling...</>
            ) : (
              <><CheckCircle2 size={16} /> Confirm Booking</>
            )}
          </button>
          <p className="form-privacy">By booking, you agree to our <span>Privacy Policy</span>.</p>
        </form>
      )}
    </div>
  );
};

export const LeadModal = ({ isOpen, onClose, initialUseCase, mode = 'sales' }) => {
  const [submitted, setSubmitted] = useState(false);

  const getHeaderInfo = () => {
    switch (mode) {
      case 'demo':
        return {
          title: "Schedule a Demo",
          subtitle: "Select a date and time to reserve a 15-minute live overview with an analyst."
        };
      case 'pilot':
        return {
          title: "Enterprise Pilot Request",
          subtitle: "Evaluate CALDIM with your program team. Submit credentials to request an active pilot trial."
        };
      case 'sales':
      default:
        return {
          title: "Contact Sales Team",
          subtitle: "Learn about team plans, multi-plant deployments, and compliance standards."
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

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
            <button className="modal-close" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
            
            {!submitted ? (
              <div className="modal-inner">
                <div className="modal-header">
                  <h2 className="modal-title">{title}</h2>
                  <p className="modal-subtitle">{subtitle}</p>
                </div>
                {mode === 'demo' ? (
                  <DemoScheduler onSuccess={() => setSubmitted(true)} />
                ) : (
                  <CorporateForm 
                    initialUseCase={initialUseCase} 
                    mode={mode}
                    onSuccess={() => setSubmitted(true)} 
                  />
                )}
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
                <h3>{mode === 'demo' ? 'Walkthrough Booked!' : 'Request Received!'}</h3>
                <p>
                  {mode === 'demo' 
                    ? 'A calendar invite has been sent. Our team will meet you at the selected time.' 
                    : 'Our team will review your application and contact you within 24 business hours.'}
                </p>
                <button className="success-done-btn" onClick={onClose}>Done</button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LeadModal;
