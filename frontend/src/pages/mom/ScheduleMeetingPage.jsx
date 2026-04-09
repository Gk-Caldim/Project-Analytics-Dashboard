import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Video, RefreshCw, Menu, ChevronLeft, ChevronRight, Check, X, Bell, Target, AlignLeft, CheckCircle2, ArrowRight, Pencil } from 'lucide-react';
import './ScheduleMeetingPage.css';
import API from '../../utils/api'; // Assuming axios instance is set up

const ScheduleMeetingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // --- Calendar State ---
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

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
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    }
  }, []); // run once on mount

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

  const meetingTypes = [
    { id: 'quickSync', label: 'Quick Sync', icon: <Clock className="w-4 h-4" /> },
    { id: 'client', label: 'Client Meeting', icon: <Target className="w-4 h-4" /> },
    { id: 'interview', label: 'Interview', icon: <Users className="w-4 h-4" /> },
    { id: 'deepWork', label: 'Deep Work', icon: <AlignLeft className="w-4 h-4" /> },
    { id: 'webinar', label: 'Webinar', icon: <Video className="w-4 h-4" /> },
    { id: 'custom', label: 'Custom', icon: <Pencil className="w-4 h-4" /> },
  ];

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
        setSelectedTime(null); // Reset time when attendees change (availability shifts)
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
  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return selectedDate && date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  };

  const isPast = (date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const renderCalendarGrid = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDay = new Date(currentYear, currentMonth, 1).getDay();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Fill previous month
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(
        <button key={`prev-${i}`} className="calendar-day other-month" disabled>
          {prevMonthDays - i}
        </button>
      );
    }

    // Fill current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const isPastDate = isPast(date);

      days.push(
        <button
          key={`current-${i}`}
          className={`calendar-day ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
          onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
          disabled={isPastDate}
        >
          {i}
          {/* Visual indicator for highly available vs low available could go here */}
        </button>
      );
    }

    // Fill next month
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(<button key={`next-${i}`} className="calendar-day other-month" disabled>{i}</button>);
    }
    return days;
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
    return selectedDate && hasTime && platform && attendees.length > 0;
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
      organizer_email: 'noreply@antigravity.com'
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
    <div className="schedule-meeting-page h-full overflow-y-auto w-full">
      {/* ───── LEFT COLUMN ───── */}
      <div className="calendar-column">
        <div className="page-header mb-8">
          <div>
            <h1 className="text-gray-900 font-bold tracking-tight">Schedule Workspace</h1>
          </div>
        </div>

        {/* Meeting Type / Reason Chips */}
        <div className="meeting-type-selector mb-6 flex flex-wrap gap-2">
          {meetingTypes.map(type => (
            <button
              key={type.id}
              className={`mt-chip ${meetingType === type.id ? 'active' : ''}`}
              onClick={() => {
                setMeetingType(type.id);
                if (type.id !== 'custom') setCustomReasonInput('');
              }}
            >
              {type.icon}
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Reason Input — only visible when 'Custom' is selected */}
        {meetingType === 'custom' && (
          <div className="mb-5 animate-fadeIn">
            <div className="relative">
              <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
              <input
                type="text"
                className="w-full border border-indigo-200 bg-indigo-50/40 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
                placeholder="e.g. Progress on project, Status check..."
                value={customReasonInput}
                onChange={(e) => setCustomReasonInput(e.target.value)}
                autoFocus
              />
              {customReasonInput && (
                <button type="button" onClick={() => setCustomReasonInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6 transition-all">
          <div className="calendar-header mb-6">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex space-x-2">
              <button className="nav-btn bg-gray-50 hover:bg-gray-100 border border-gray-200" onClick={handleToday}>
                Today
              </button>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button className="nav-btn-icon bg-gray-50 hover:bg-gray-100" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="w-px bg-gray-200"></div>
                <button className="nav-btn-icon bg-gray-50 hover:bg-gray-100" onClick={handleNextMonth}>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday-header text-gray-500">{day}</div>
            ))}
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Timeslots Panel */}
        <div className={`transition-all duration-300 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 tracking-tight">
                Available Times <span className="text-gray-400 font-normal ml-2">for {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </h3>
              {loadingAvailability && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
            </div>

            {availableTimeslots.length === 0 && !loadingAvailability ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm font-medium">No slots available on this date.</p>
                <button type="button" onClick={() => setUseCustomTime(true)} className="mt-4 text-xs bg-white border border-gray-200 px-4 py-2 rounded-lg font-bold text-gray-700 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all focus:outline-none">
                  Set Custom Time
                </button>
              </div>
            ) : (
              <div className="timeslot-grid items-center flex flex-wrap gap-2">
                {availableTimeslots.map(time => (
                  <button
                    key={time}
                    className={`timeslot-btn ${selectedTime === time && !useCustomTime ? 'selected' : ''} ${loadingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleTimeslotSelect(time)}
                    disabled={loadingAvailability}
                  >
                    {time}
                  </button>
                ))}
                
                <div className={`flex items-center gap-2 border p-1 rounded-xl transition-colors ${useCustomTime ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'}`}>
                  <span className="text-xs text-gray-500 font-medium pl-2 whitespace-nowrap">Custom:</span>
                  <input 
                    type="time" 
                    className="flex-1 bg-transparent border-none text-sm font-mono tracking-wider focus:ring-0 !p-1.5 cursor-pointer text-gray-700 outline-none"
                    value={startTime}
                    onChange={(e) => {
                      setUseCustomTime(true);
                      handleStartTimeChange(e.target.value);
                      if (presetDuration && (!endTime || useCustomTime === false)) {
                         setEndTime(addMinutes(e.target.value, presetDuration));
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ───── RIGHT COLUMN (FORM) ───── */}
      <div className="form-column">
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
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

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

              {/* Custom time pickers — only shown when Custom chip is active */}
              {useCustomTime && (
                <div className="animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">Start</label>
                      <input
                        type="time"
                        className={`ui-select font-mono text-sm tracking-wider ${startTime ? 'border-indigo-300 bg-indigo-50/40 text-indigo-800' : ''
                          }`}
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <span className="text-gray-400 font-bold text-lg mt-5">→</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">End</label>
                      <input
                        type="time"
                        className={`ui-select font-mono text-sm tracking-wider ${endTime ? 'border-indigo-300 bg-indigo-50/40 text-indigo-800' : ''
                          } ${timeError ? 'border-red-400 bg-red-50' : ''}`}
                        value={endTime}
                        min={startTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                      />
                    </div>
                  </div>
                  {timeError && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                      <X className="w-3 h-3" /> {timeError}
                    </p>
                  )}
                  {computedDuration && !timeError && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <Check className="w-3 h-3" /> Duration: {formatDuration(computedDuration)}
                    </div>
                  )}
                </div>
              )}
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
