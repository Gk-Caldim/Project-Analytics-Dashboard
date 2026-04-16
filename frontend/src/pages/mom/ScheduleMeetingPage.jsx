import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Calendar, Clock, MapPin, Users, Video, RefreshCw, Menu, ChevronLeft, ChevronRight, Check, X, Bell, Target, AlignLeft, CheckCircle2, ArrowRight, Pencil, Plus } from 'lucide-react';
import './ScheduleMeetingPage.css';
import API from '../../utils/api'; // Assuming axios instance is set up

const ScheduleMeetingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // --- Calendar State ---
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });
  // ── Calendar animation state ──
  const [calendarDir, setCalendarDir] = useState(0);     // -1 = going left, 1 = going right
  const [calendarKey, setCalendarKey] = useState(0);     // forces re-mount for animation
  const [calendarAnimating, setCalendarAnimating] = useState(false);
  
  // ── Scroll ref for auto-scroll to timeslots ──
  const timeSlotsRef = useRef(null);

  // ── Mini Cal & View State ──
  const [miniCalMonth, setMiniCalMonth] = useState(new Date().getMonth());
  const [miniCalYear, setMiniCalYear] = useState(new Date().getFullYear());
  const [eventColor, setEventColor] = useState('#4f46e5');
  const [activeView, setActiveView] = useState('Week');
  const reduxProjects = useSelector(state => state.project?.projects) || [];
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // --- Form State ---
  const [platform, setPlatform] = useState('meet'); // default: Google Meet
  const [teamsAuthChecking, setTeamsAuthChecking] = useState(false);
  const [meetingType, setMeetingType] = useState('quickSync');
  const [reminder, setReminder] = useState(30);
  const [description, setDescription] = useState('');

  // --- Duration (preset OR custom) ---
  const [presetDuration, setPresetDuration] = useState(60); // minutes
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState('');

  // --- Custom Reason (extension of meetingType) ---
  const [customReasonInput, setCustomReasonInput] = useState('');

  const presetDurations = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hr', value: 60 },
    { label: '1.5 hr', value: 90 },
  ];

  // --- Attendees System ---
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');

  // --- Agenda System ---
  const [agenda, setAgenda] = useState([]);
  const [agendaInput, setAgendaInput] = useState('');

  // --- Availability System ---
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableTimeslots, setAvailableTimeslots] = useState([]);

  // --- Transaction State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Constants
  const GoogleLogo = () => (
    <svg viewBox="0 0 533.5 544.3" className="w-5 h-5">
      <path d="M533.5 277.3c0-19.7-1.8-38.6-5-56.6H272.1v107h146.6c-6.3 34.1-25.6 63-54.6 82.5l88.4 68.5c51.7-47.7 81-118.1 81-201.4z" fill="#4285f4"/>
      <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.4l-88.4-68.5c-24.4 16.3-55.8 26.1-92 26.1-70.8 0-130.7-47.8-152.1-112H27.9v70.5c45.2 89.9 138.2 149.3 244.2 149.3z" fill="#34a853"/>
      <path d="M120 324.4c-5.4-16.1-8.5-33.3-8.5-51.1 0-17.8 3.1-35.1 8.5-51.1V151.7H27.9c-18.1 36-28.5 76.5-28.5 119.3s10.4 83.3 28.5 119.3l92.1-71.2z" fill="#fbbc04"/>
      <path d="M272.1 107.7c40 0 75.8 13.7 104.1 40.8l78-78C407.3 26.7 345.5 1.1 272.1 1.1 166.1 1.1 73.1 60.5 27.9 150.4l92.1 71.2c21.4-64.2 81.3-113.9 152.1-113.9z" fill="#ea4335"/>
    </svg>
  );

  const MicrosoftLogo = () => (
    <svg viewBox="0 0 23 23" className="w-5 h-5">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  );

  const platforms = [
    { id: 'teams', name: 'Microsoft Teams', icon: <MicrosoftLogo />, color: '#00a1f1' },
    { id: 'meet', name: 'Google Meet', icon: <GoogleLogo />, color: '#ea4335' }
  ];

  // --- Pre-fill date from calendar "+ Add one" click ---
  useEffect(() => {
    const prefilledDate = location.state?.prefilledDate;
    if (prefilledDate) {
      const d = new Date(prefilledDate);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        const start = new Date(d);
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        setCurrentWeekStart(start);
      }
    }
  }, []); // run once on mount

  // --- Fetch Projects ---
  useEffect(() => {
    const fetchProjects = async () => {
      if (reduxProjects && reduxProjects.length > 0) {
        setProjects(reduxProjects);
        return;
      }
      try {
        const resp = await API.get('/projects/');
        const data = resp.data?.success ? resp.data.projects : (Array.isArray(resp.data) ? resp.data : []);
        setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();
  }, [reduxProjects]);

  // --- Auth Intercept Effects ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('teams_auth') === 'success') {
      setPlatform('teams');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth') === 'success') {
      window.history.replaceState({}, document.title, '/dashboard/schedule-meeting');
    } else if (params.get('error')) {
      setError('Authentication integration failed. Please try reconnecting your account.');
      window.history.replaceState({}, document.title, '/dashboard/schedule-meeting');
    }
  }, []);

  // --- Custom Event Types ---
  const initialCustomTypes = useMemo(() => {
    try {
      const stored = localStorage.getItem('custom_event_types');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }, []);
  const [customEventTypes, setCustomEventTypes] = useState(initialCustomTypes);

  const baseMeetingTypes = [
    { id: 'quickSync', label: 'Quick Sync', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { id: 'client', label: 'Client Meeting', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'interview', label: 'Interview', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'deepWork', label: 'Deep Work', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { id: 'webinar', label: 'Webinar', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> },
  ];

  const meetingTypes = [
    ...baseMeetingTypes,
    ...customEventTypes,
    { id: 'custom', label: 'Custom...', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
  ];

  const saveCustomEventType = (e) => {
    e.preventDefault();
    if (!customReasonInput.trim()) return;
    const newType = {
      id: `custom_${Date.now()}`,
      label: customReasonInput.trim(),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
    };
    const updated = [...customEventTypes, newType];
    setCustomEventTypes(updated);
    localStorage.setItem('custom_event_types', JSON.stringify(updated));
    setMeetingType(newType.id);
    setCustomReasonInput('');
  };

  // --- Helpers ---
  const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- Handlers: Attendees ---
  const handleAddAttendee = (e) => {
    if (e.key === 'Enter' || e.type === 'blur' || e.key === ',') {
      e.preventDefault();
      const val = attendeeInput.trim().replace(/,/g, '');
      if (val && isEmail(val) && !attendees.includes(val)) {
        setAttendees([...attendees, val]);
        setAttendeeInput('');
        setSelectedTime(null);
      }
    }
  };

  const removeAttendee = (emailToRemove) => {
    setAttendees(attendees.filter(a => a !== emailToRemove));
    setSelectedTime(null);
    setStartTime('');
    setEndTime('');
  };

  // --- Handlers: Agenda ---
  const handleAddAgendaItem = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = agendaInput.trim();
      if (val && !agenda.includes(val)) {
        setAgenda([...agenda, val]);
        setAgendaInput('');
      }
    }
  };

  const removeAgendaItem = (indexToRemove) => {
    setAgenda(agenda.filter((_, idx) => idx !== indexToRemove));
  };

  // --- Fetch Availability ---
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimeslots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const attendeesQuery = attendees.join(',');
        const endpoint = `/meetings/availability?date=${dateStr}&attendees=${encodeURIComponent(attendeesQuery)}`;

        // Use your API utility
        const response = await API.get(endpoint);

        if (response.data && response.data.availableSlots) {
          setAvailableTimeslots(response.data.availableSlots);
        } else {
          setAvailableTimeslots([]);
        }
      } catch (err) {
        console.error('Failed to fetch availability', err);
        // Fallback or error state
        setAvailableTimeslots([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, attendees]);

  // --- Handlers: Calendar Nav ---
  const handlePrevTime = () => {
    if (calendarAnimating) return;
    setCalendarDir(-1);
    setCalendarAnimating(true);
    setTimeout(() => {
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() - (activeView === 'Day' ? 1 : 7));
      setCurrentWeekStart(newStart);
      setCalendarKey(k => k + 1);
      setCalendarAnimating(false);
    }, 220);
  };
  const handleNextTime = () => {
    if (calendarAnimating) return;
    setCalendarDir(1);
    setCalendarAnimating(true);
    setTimeout(() => {
      const newStart = new Date(currentWeekStart);
      newStart.setDate(newStart.getDate() + (activeView === 'Day' ? 1 : 7));
      setCurrentWeekStart(newStart);
      setCalendarKey(k => k + 1);
      setCalendarAnimating(false);
    }, 220);
  };
  const handleToday = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    setCurrentWeekStart(start);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isPast = (date) => {
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isPastSlot = (date, hour, minute) => {
    const today = new Date();
    const slotDate = new Date(date);
    slotDate.setHours(hour, minute, 0, 0);
    return slotDate < today;
  };

  // --- Grid Generation ---
  const weekDays = useMemo(() => {
    const days = activeView === 'Day' ? 1 : 7;
    return [...Array(days)].map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart, activeView]);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

  const handleGridSlotSelect = (date, hour, min) => {
    if (isPastSlot(date, hour, min)) return;
    
    // Set date
    setSelectedDate(date);
    setUseCustomTime(false);
    
    // Convert slot to 24h & 12h
    const start24 = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    setStartTime(start24);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    const time12 = `${h12}:${String(min).padStart(2, '0')} ${period}`;
    setSelectedTime(time12);
    
    // End time
    setEndTime(addMinutes(start24, presetDuration));
    setTimeError('');
  };

  // --- Custom Time Helpers ---
  const computedDuration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    return diffMins > 0 ? diffMins : null;
  }, [startTime, endTime]);

  const effectiveDuration = useCustomTime ? computedDuration : presetDuration;

  const formatDuration = (mins) => {
    if (!mins) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const to12Hour = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Add preset duration minutes to a 24h time string
  const addMinutes = (time24, mins) => {
    const [h, m] = time24.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (val) => {
    setStartTime(val);
    setTimeError('');
    if (endTime) {
      const [sh, sm] = val.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if ((eh * 60 + em) <= (sh * 60 + sm)) setTimeError('End time must be after start time.');
    }
    setSelectedTime(val ? to12Hour(val) : null);
  };

  const handleEndTimeChange = (val) => {
    setEndTime(val);
    setTimeError('');
    if (startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = val.split(':').map(Number);
      if ((eh * 60 + em) <= (sh * 60 + sm)) setTimeError('End time must be after start time.');
    }
  };

  // When a timeslot is picked from Available Times panel
  const handleTimeslotSelect = (time12) => {
    if (loadingAvailability) return;
    setUseCustomTime(false);
    setSelectedTime(time12);
    // Convert 12h to 24h for the custom pickers (in case user later switches)
    const [timePart, period] = time12.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const start24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setStartTime(start24);
    setEndTime(addMinutes(start24, presetDuration));
    setTimeError('');
  };

  // Effective meeting title/reason
  const effectiveTitle = meetingType === 'custom'
    ? (customReasonInput.trim() || 'Custom Meeting')
    : (meetingTypes.find(t => t.id === meetingType)?.label || 'Team Sync');

  // --- Handlers: Submission ---
  const validateForm = () => {
    const hasTime = useCustomTime
      ? (startTime && endTime && computedDuration && !timeError)
      : selectedTime !== null;
    return selectedDate && hasTime && platform && attendees.length > 0 && selectedProjectId;
  };

  // --- Teams platform click handler ---
  const handlePlatformSelect = async (platformId) => {
    if (platformId !== 'teams') {
      setPlatform(platformId);
      return;
    }
    // Teams: check auth status first
    setTeamsAuthChecking(true);
    try {
      const statusResp = await API.get('/teams/status');
      if (statusResp.data.authenticated) {
        setPlatform('teams');
      } else {
        // Fetch auth URL and redirect user to Microsoft login
        const authResp = await API.get('/teams/auth');
        window.location.href = authResp.data.auth_url;
      }
    } catch (err) {
      setError('Could not reach Teams auth service. Ensure the backend is running.');
    } finally {
      setTeamsAuthChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true); setError('');

    const dateStr = selectedDate.toISOString().split('T')[0];
    const timeStr = useCustomTime ? to12Hour(startTime) : selectedTime;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    // ── Teams path ─────────────────────────────────────────────────────────
    if (platform === 'teams') {
      try {
        // Build ISO start/end for the Teams Graph API
        const [sh, sm] = (startTime || '09:00').split(':').map(Number);
        const startDt = new Date(selectedDate);
        startDt.setHours(sh, sm, 0, 0);
        const endDt = new Date(startDt.getTime() + (effectiveDuration || 60) * 60000);
        const toISO = (d) => d.toISOString(); // UTC — Graph API converts

        const resp = await API.post('/teams/create-meeting', {
          title: effectiveTitle,
          start: toISO(startDt),
          end: toISO(endDt),
        });

        if (resp.data.success) {
          // POST-SCHEDULE REDIRECT (Correct Flow Architecture)
          // No window.open to external URL here.
          navigate(`/dashboard/meeting/${resp.data.meeting_id}`);
        } else {
          setError(resp.data.error || 'Failed to schedule Teams meeting.');
        }
      } catch (err) {
        const detail = err.response?.data?.detail || 'Teams meeting creation failed.';
        setError(detail);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Google Meet path (standard flow) ──────────────────────────────────
    const payload = {
      title: effectiveTitle,
      date: dateStr,
      time: timeStr,
      end_time: useCustomTime ? to12Hour(endTime) : (startTime ? to12Hour(addMinutes(startTime, presetDuration)) : null),
      platform,
      duration_minutes: effectiveDuration,
      attendees,
      description: description || '',
      agenda_text: agenda.join('\n'),
      reason: meetingType === 'custom' ? customReasonInput : (meetingTypes.find(t => t.id === meetingType)?.label || ''),
      timezone: tz,
      organizer_email: 'noreply@antigravity.com',
      project_id: Number(selectedProjectId)
    };

    try {
      const resp = await API.post('/meetings/publish', payload);
      if (resp.data.success) {
        // POST-SCHEDULE REDIRECT (Correct Flow Architecture)
        // No window.open to external URL here.
        navigate(`/dashboard/meeting/${resp.data.meeting.id}`);
      } else {
        setError(resp.data.error || 'Failed to schedule meeting.');
      }
    } catch (err) {
      setError('An error occurred. Make sure backend is running properly.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setStartTime('');
    setEndTime('');
    setTimeError('');
    setUseCustomTime(false);
    setPresetDuration(60);
    setMeetingType('quickSync');
    setCustomReasonInput('');
    setSelectedProjectId('');
    setAgenda([]);
    setAttendees([]);
    setDescription('');
  };

  // --- Render ---

  // --- Recommendation Logic ---
  const recommendedPlatform = useMemo(() => {
    const internalTypes = ['quickSync', 'deepWork', 'interview'];
    return internalTypes.includes(meetingType) ? 'teams' : 'meet';
  }, [meetingType]);

  return (
    <div className="schedule-meeting-page h-full w-full">
      {/* ───── LEFT COLUMN (MINI CAL & SETTINGS) ───── */}
      <div className="sidebar-left flex flex-col gap-5 h-full overflow-y-auto pr-2 pb-4">
        
        {/* Workspace Brand / Header inside sidebar to save vertical space */}
        <div className="mb-2">
          <h1 className="text-gray-900 font-extrabold text-2xl tracking-tight">Schedule</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure your workspace</p>
        </div>

        {/* View Switch */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {['Day', 'Week'].map(v => (
              <button 
                key={v}
                onClick={() => setActiveView(v)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all ${activeView === v ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 text-sm">
              {new Date(miniCalYear, miniCalMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-1">
              <button 
                className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  if (miniCalMonth === 0) { setMiniCalMonth(11); setMiniCalYear(y => y - 1); }
                  else { setMiniCalMonth(m => m - 1); }
                }}
              >
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <button 
                className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  if (miniCalMonth === 11) { setMiniCalMonth(0); setMiniCalYear(y => y + 1); }
                  else { setMiniCalMonth(m => m + 1); }
                }}
              >
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-gray-400 text-[10px] text-center font-bold py-1 uppercase">{d}</div>
            ))}
            {(() => {
              const daysInMonth = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
              const startDay = new Date(miniCalYear, miniCalMonth, 1).getDay();
              const days = [];
              for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="p-1" />);
              for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(miniCalYear, miniCalMonth, i);
                const isPastDate = isPast(date);
                
                // Active week highlight
                const isCurrWeek = selectedDate && (
                   date >= currentWeekStart && 
                   date < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                );
                const isCurrDay = selectedDate && date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth();
                const todayCheck = isToday(date);
                
                let btnClass = 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer';
                if (isCurrDay) btnClass = 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200';
                else if (isCurrWeek) btnClass = 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100';
                else if (todayCheck) btnClass = 'text-indigo-600 font-bold bg-indigo-50/50';
                else if (isPastDate) btnClass = 'text-gray-300 cursor-not-allowed';

                days.push(
                  <button
                    key={`mini-${i}`}
                    disabled={isPastDate}
                    onClick={(e) => {
                       e.preventDefault();
                       const start = new Date(date);
                       start.setDate(start.getDate() - start.getDay());
                       start.setHours(0,0,0,0);
                       setCurrentWeekStart(start);
                       setSelectedDate(date);
                    }}
                    className={`text-center w-7 h-7 rounded-full text-xs mx-auto flex items-center justify-center transition-all ${btnClass}`}
                  >
                    {i}
                  </button>
                );
              }
              return days;
            })()}
          </div>
        </div>

        {/* Meeting Type Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Event Type</label>
          <div className="flex flex-col gap-2">
            {meetingTypes.map(type => (
              <button
                key={type.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  meetingType === type.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'border-transparent hover:bg-gray-50 text-gray-600 hover:border-gray-200'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setMeetingType(type.id);
                  if (type.id !== 'custom') setCustomReasonInput('');
                }}
              >
                <div className={`${meetingType === type.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {type.icon}
                </div>
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Reason Input & Save */}
          {meetingType === 'custom' && (
            <div className="mt-4 animate-fadeIn">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">New Type Name</label>
              <div className="relative">
                <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
                <input
                  type="text"
                  className="w-full border border-indigo-200 bg-white rounded-t-xl rounded-b-none pl-9 pr-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400 shadow-inner"
                  placeholder="e.g. Sales Pitch, QBW..."
                  value={customReasonInput}
                  onChange={(e) => setCustomReasonInput(e.target.value)}
                  autoFocus
                />
              </div>
              <button 
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2.5 rounded-b-xl border border-t-0 border-indigo-200 transition-colors flex items-center justify-center gap-1"
                onClick={saveCustomEventType}
              >
                <Plus className="w-3.5 h-3.5" /> Save to Event Types
              </button>
            </div>
          )}
        </div>
        
        {/* Color Coding */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4">
           <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Event Color</label>
           <div className="flex flex-wrap gap-2">
            {[
              '#4f46e5', // indigo
              '#10b981', // emerald
              '#f59e0b', // amber
              '#ef4444', // red
              '#ec4899', // pink
              '#0ea5e9', // sky blue
              '#8b5cf6', // purple
              '#1e293b'  // slate
            ].map(c => (
              <button
                key={c}
                onClick={(e) => { e.preventDefault(); setEventColor(c); }}
                className="w-[26px] h-[26px] rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center border-2 border-white shadow-sm"
                style={{ backgroundColor: c, outline: eventColor === c ? `2px solid ${c}` : 'none', outlineOffset: '1px' }}
              >
                {eventColor === c && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───── CENTER COLUMN (CALENDAR) ───── */}
      <div className="calendar-column h-full overflow-y-auto pb-6 pr-2 custom-scrollbar">
        {/* Calendar Card (Weekly View) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm transition-all h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 px-1">
            <button 
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors shadow-sm"
              onClick={handleToday}
            >
              Today
            </button>
            <div className="flex items-center gap-4">
              <button 
                className="p-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg border border-gray-200 transition-colors shadow-sm focus:outline-none" 
                onClick={handlePrevTime}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <h2 key={calendarKey} className="text-base font-bold text-gray-800 tracking-tight select-none cal-month-label-anim w-40 text-center">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: activeView === 'Day' ? 'numeric' : undefined })}
              </h2>
              
              <button 
                className="p-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg border border-gray-200 transition-colors shadow-sm focus:outline-none" 
                onClick={handleNextTime}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Timeline Grid */}
          <div key={calendarKey} className={`weekly-calendar-container flex-1 overflow-hidden flex flex-col cal-slide-${calendarDir === -1 ? 'from-left' : 'from-right'}`}>
            <div 
              className="weekly-calendar-header border-b border-gray-200 bg-gray-50/50" 
              style={{ display: 'grid', gridTemplateColumns: `60px repeat(${weekDays.length}, minmax(0, 1fr))` }}
            >
              <div className="time-gutter-header">GMT{new Date().getTimezoneOffset() < 0 ? '+' : '-'}{Math.abs(new Date().getTimezoneOffset() / 60)}</div>
              {weekDays.map(d => (
                <div key={d.toISOString()} className="day-header">
                  <span className={`day-name ${isToday(d) ? 'text-indigo-600' : ''}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className={`day-number ${isToday(d) ? 'today shadow-md shadow-indigo-200' : ''}`}>{d.getDate()}</span>
                </div>
              ))}
            </div>
            
            <div className="weekly-calendar-scroll-area flex-1 overflow-y-auto custom-scrollbar" ref={timeSlotsRef}>
              <div className="weekly-calendar-body relative">
                {/* 1. Time Gutter */}
                <div className="time-gutter">
                  {hours.map(h => (
                    <div key={h} className="time-label">
                      {h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`}
                    </div>
                  ))}
                </div>
              
              <div 
                className="days-grid"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {weekDays.map(d => {
                  // Check if selected block belongs to this day column
                  const hasSelection = selectedDate && 
                                       selectedDate.getDate() === d.getDate() && 
                                       selectedDate.getMonth() === d.getMonth() &&
                                       startTime && !useCustomTime;
                  let topPx = 0;
                  let heightPx = 0;
                  if (hasSelection) {
                    const [sh, sm] = startTime.split(':').map(Number);
                    const dur = presetDuration || 60;
                    topPx = (sh - hours[0]) * 60 + sm;
                    heightPx = dur + 1; // 1 min per px
                  }

                  return (
                    <div key={d.toISOString()} className="day-col">
                      {hours.map(h => (
                        <div key={h} className="hour-slot-group">
                          <div 
                            className={`half-hour ${isPastSlot(d, h, 0) ? 'past' : ''}`} 
                            onClick={() => handleGridSlotSelect(d, h, 0)} 
                          />
                          <div 
                            className={`half-hour ${isPastSlot(d, h, 30) ? 'past' : ''}`} 
                            onClick={() => handleGridSlotSelect(d, h, 30)} 
                          />
                        </div>
                      ))}
                      
                      {hasSelection && (
                        <div 
                          className="event-block active shadow-lg flex flex-col justify-start"
                          style={{ 
                            top: `${topPx}px`, 
                            height: `${heightPx}px`, 
                            background: `linear-gradient(135deg, ${eventColor}, ${eventColor}dd)`,
                            boxShadow: `0 4px 12px ${eventColor}40`
                          }}
                        >
                          <span className="font-bold tracking-tight leading-tight">{effectiveTitle}</span>
                          <span className="opacity-90">{selectedTime}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── RIGHT COLUMN (FORM) ───── */}
      <div className="form-column h-full overflow-y-auto pb-6 pl-2 custom-scrollbar">
        <div className="sticky-panel bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">

          {/* Live Summary Box */}
          <div className="summary-box mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-xl text-sm">
            <h4 className="font-bold text-indigo-900 mb-3 uppercase tracking-wider text-xs">Meeting Breakdown</h4>
            <div className="space-y-2 text-indigo-950 font-medium">
              <div className="flex justify-between items-center">
                <span className="text-indigo-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</span>
                <span>{selectedDate ? selectedDate.toLocaleDateString() : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</span>
                <span className="font-mono">
                  {useCustomTime
                    ? (startTime && endTime ? `${to12Hour(startTime)} → ${to12Hour(endTime)}` : '--')
                    : (selectedTime || '--')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Duration</span>
                <span className={effectiveDuration ? 'text-indigo-900' : 'text-gray-400'}>{formatDuration(effectiveDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Attendees</span>
                <span>{attendees.length} people</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Platform</span>
                <span>{platform ? platforms.find(p => p.id === platform).name : '--'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-indigo-100 mt-1">
                <span className="text-indigo-700 flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5" /> Type</span>
                <span className="text-xs truncate max-w-[55%] text-right">{effectiveTitle}</span>
              </div>
              <div className="flex justify-between items-center pt-1 mt-1 border-t border-indigo-100">
                <span className="text-indigo-700 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Project</span>
                <span className="text-xs truncate max-w-[55%] text-right font-bold">
                  {selectedProjectId ? projects.find(p => String(p.id || p.project_id) === String(selectedProjectId))?.name || 'Selected' : '--'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Project Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none bg-white cursor-pointer"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
              >
                <option value="">Select Project...</option>
                {projects.map(p => (
                  <option key={p.id || p.project_id} value={p.id || p.project_id}>
                    {p.name || p.project_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Attendees Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Attendees <span className="text-red-500">*</span>
              </label>
              <div className="attendees-container border border-gray-300 rounded-xl p-2 bg-white flex flex-wrap gap-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                {attendees.map((a, i) => (
                  <div key={i} className="attendee-chip bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-sm">
                    {a}
                    <button type="button" onClick={() => removeAttendee(a)} className="hover:text-red-500 focus:outline-none"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <input
                  type="email"
                  className="flex-1 min-w-[120px] outline-none text-sm bg-transparent px-2 py-1 placeholder-gray-400"
                  placeholder={attendees.length === 0 ? "Add email and press Enter..." : "Add another..."}
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={handleAddAttendee}
                  onBlur={handleAddAttendee}
                />
              </div>
            </div>

            {/* Agenda Builder */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Agenda Points</label>
              <div className="agenda-builder space-y-2">
                {agenda.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                    <span className="text-indigo-500 font-bold text-xs bg-indigo-50 w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                    <span className="text-sm font-medium text-gray-700 flex-1">{item}</span>
                    <button type="button" onClick={() => removeAgendaItem(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <input
                  type="text"
                  className="w-full text-sm border-b border-gray-300 px-2 py-2 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent placeholder-gray-400"
                  placeholder="Type a point & press Enter..."
                  value={agendaInput}
                  onChange={(e) => setAgendaInput(e.target.value)}
                  onKeyDown={handleAddAgendaItem}
                />
              </div>
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Platform <span className="text-red-500">*</span></label>
              <div className="platform-grid flex gap-3">
                {platforms.map(p => (
                  <button
                    key={p.id} type="button"
                    disabled={teamsAuthChecking && p.id === 'teams'}
                    className={`flex-1 group flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${platform === p.id
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-indigo-200'
                      } ${teamsAuthChecking && p.id === 'teams' ? 'opacity-60 cursor-wait' : ''}`}
                    onClick={() => handlePlatformSelect(p.id)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${platform === p.id ? 'bg-white shadow-sm' : 'bg-gray-50/50'}`}>
                      {teamsAuthChecking && p.id === 'teams' ? <RefreshCw className="animate-spin text-indigo-500 w-4 h-4" /> : p.icon}
                    </div>
                    <div className="text-center">
                      <span className={`text-[11px] font-semibold tracking-wide uppercase ${platform === p.id ? 'text-indigo-900' : 'text-gray-600'}`}>{p.name}</span>
                      {platform === p.id ? (
                        <div className="mt-1 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tight">Active</span>
                        </div>
                      ) : recommendedPlatform === p.id ? (
                        <div className="mt-1">
                          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-tighter">Recommended</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
              {teamsAuthChecking && (
                <p className="text-xs text-blue-500 mt-2 font-medium">Checking Teams authentication...</p>
              )}
            </div>

            {/* Duration — Preset chips + optional Custom time range */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" /> Duration
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetDurations.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setPresetDuration(d.value);
                      setUseCustomTime(false);
                      // If a start time already exists, auto-recalculate end time
                      if (startTime) setEndTime(addMinutes(startTime, d.value));
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all duration-200 ${!useCustomTime && presetDuration === d.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                  >
                    {!useCustomTime && presetDuration === d.value && <Check className="w-3 h-3 inline mr-1" />}
                    {d.label}
                  </button>
                ))}
                {/* Custom chip */}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all duration-200 ${useCustomTime
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                    }`}
                >
                  {useCustomTime && <Check className="w-3 h-3 inline mr-1" />}
                  Custom
                </button>
              </div>

              {/* Universal Time Inspector */}
              <div className="animate-fadeIn mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-inner">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Precise Timing</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 font-semibold">Start</label>
                    <input
                      type="time"
                      className={`ui-select w-full font-mono text-sm tracking-wider bg-white ${startTime ? 'border-indigo-300 text-indigo-800' : ''}`}
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <span className="text-gray-300 font-bold text-lg mt-5">→</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 font-semibold">End</label>
                    <input
                      type="time"
                      className={`ui-select w-full font-mono text-sm tracking-wider bg-white ${endTime ? 'border-indigo-300 text-indigo-800' : ''} ${timeError ? 'border-red-400 bg-red-50' : ''}`}
                      value={endTime}
                      min={startTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                    />
                  </div>
                </div>
                {timeError && (
                  <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                    <X className="w-3 h-3" /> {timeError}
                  </p>
                )}
                {computedDuration && !timeError && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full">
                    <Check className="w-3 h-3" /> Duration: {formatDuration(computedDuration)}
                  </div>
                )}
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-gray-400" /> Reminder
              </label>
              <select className="ui-select" value={reminder} onChange={e => setReminder(Number(e.target.value))}>
                <option value={5}>5 min before</option>
                <option value={10}>10 min before</option>
                <option value={30}>30 min before</option>
                <option value={60}>1 hour before</option>
              </select>
            </div>

            {/* Description fallback */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Additional Description</label>
              <textarea
                className="ui-textarea"
                placeholder="Provide extra context to attendees..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">{error}</div>}

            <button
              type="submit"
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md ${!validateForm() || loading ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gray-900 hover:bg-black hover:shadow-lg active:scale-[0.98]'}`}
              disabled={!validateForm() || loading}
            >
              {loading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Finalizing...</>
              ) : (
                'Publish & Send Invites'
              )}
            </button>
            {!validateForm() && (
              <p className="text-center text-xs text-gray-400 mt-2">Please complete required fields (*)</p>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingPage;
