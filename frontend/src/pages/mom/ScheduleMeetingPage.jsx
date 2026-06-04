import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Calendar, Clock, MapPin, Users, Video, RefreshCw, Menu, ChevronLeft, ChevronRight, ChevronDown, Check, X, Bell, Target, AlignLeft, CheckCircle2, ArrowRight, Pencil, Plus, Lock, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import { useConfirm } from '../../hooks/use-confirm';
import { Spinner } from '../../components/ui/spinner';
import './ScheduleMeetingPage.css';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip';
import API from '../../utils/api'; // Assuming axios instance is set up

// --- Utility Helpers (Hoisted outside to avoid TDZ issues) ---
const to12Hour = (timeStr, useLower = false) => {
  if (!timeStr) return '';
  if (typeof timeStr === 'string' && timeStr.includes('T')) {
    const d = new Date(timeStr);
    timeStr = `${d.getHours()}:${d.getMinutes()}`;
  }
  const parts = String(timeStr).split(':');
  const h = Number(parts[0]) || 0;
  const m = parts.length > 1 ? Number(parts[1]) : 0;
  const period = h >= 12 ? (useLower ? 'pm' : 'PM') : (useLower ? 'am' : 'AM');
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
};

const parseTimeTo24 = (timeStr) => {
  if (!timeStr) return { h: 0, m: 0 };
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return { h: d.getHours(), m: d.getMinutes() };
  }
  const [timePart, period] = timeStr.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return { h, m: m || 0 };
};

const addMinutes = (time24, mins) => {
  const [h, m] = time24.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};

// --- New Component: CollisionIndicator ---
const CollisionIndicator = ({ groupMeetings, to12Hour }) => {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <motion.div 
          className="collision-pulse-dot"
          animate={{ 
            scale: [1, 1.2, 1],
            backgroundColor: ["#f97316", "#fb923c", "#f97316"] 
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-gray-900 border-none shadow-2xl p-0 overflow-hidden min-w-[200px]">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Conflict Detected</span>
            <span className="text-[9px] font-bold text-gray-400">{groupMeetings.length} Events</span>
          </div>
          <div className="space-y-1.5">
            {groupMeetings.map((m, idx) => (
              <div key={idx} className="flex flex-col border-l-2 border-orange-500/50 pl-2 py-0.5">
                <span className="text-[11px] font-bold text-white truncate">{m.title}</span>
                <span className="text-[9px] text-gray-400">{to12Hour(m.time, true)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-orange-500/10 px-3 py-1.5 border-t border-white/5">
          <p className="text-[8px] font-bold text-orange-300 uppercase tracking-tighter">Nearly at same time</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

const ScheduleMeetingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
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

  // ── Current time position for live indicator ──
  const [currentTimePx, setCurrentTimePx] = useState(null);

  // ── Mini Cal & View State ──
  const [miniCalMonth, setMiniCalMonth] = useState(new Date().getMonth());
  const [miniCalYear, setMiniCalYear] = useState(new Date().getFullYear());
  const [eventColor, setEventColor] = useState('#4f46e5');
  const [activeView, setActiveView] = useState('Week');
  const [isViewDropOpen, setIsViewDropOpen] = useState(false);

  // ── Existing Meetings State ──
  const [existingMeetings, setExistingMeetings] = useState([]);
  const [selectedMeetingForDetails, setSelectedMeetingForDetails] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null); // { x, y } position
  const [copiedPopoverLink, setCopiedPopoverLink] = useState(false);

  // ── Drag and Drop Rescheduling ──
  const [selectedMeetingIds, setSelectedMeetingIds] = useState([]); // Multi-selection for Method 2
  const [draggedMeeting, setDraggedMeeting] = useState(null);
  const [draggedType, setDraggedType] = useState(null); // The type object being dragged from sidebar
  const [dragOverInfo, setDragOverInfo] = useState(null); // { date, time, topPx }
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [highlightedMeetingId, setHighlightedMeetingId] = useState(null);

  // ── Zoho-inspired premium color map ──
  const MEETING_TYPE_COLORS = {
    quickSync:      { bg: '#e8f0fe', border: '#1a73e8', text: '#174ea6' }, // Blue
    clientMeeting:  { bg: '#fef7e0', border: '#fbbc04', text: '#b06000' }, // Yellow/Amber
    interview:      { bg: '#e6f4ea', border: '#1e8e3e', text: '#0d652d' }, // Green
    deepWork:       { bg: '#fce8e6', border: '#d93025', text: '#a50e0e' }, // Red/Coral
    webinar:        { bg: '#f3e8fd', border: '#9334e6', text: '#681da8' }, // Purple
    custom:         { bg: '#e4f7fb', border: '#00bcd4', text: '#00838f' }, // Cyan
  };

  const getMeetingColor = (type) => MEETING_TYPE_COLORS[type] || MEETING_TYPE_COLORS['quickSync'];

  // ── Adaptive Timezone ──
  const adaptiveTimezone = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      return tzPart ? tzPart.value : `GMT${new Date().getTimezoneOffset() < 0 ? '+' : '-'}${Math.abs(new Date().getTimezoneOffset() / 60)}`;
    } catch(e) {
      return 'GMT';
    }
  }, []);

  // ── Auto-scroll to 8 AM on mount + live current-time line ──
  useEffect(() => {
    // Use rAF so DOM is painted before we scroll
    requestAnimationFrame(() => {
      if (timeSlotsRef.current) {
        timeSlotsRef.current.scrollTop = 60; // 8 AM = 1hr × 60px
      }
    });

    const updateTimePx = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const px = (h - 7) * 60 + m; // 7 AM = 0px baseline
      setCurrentTimePx(h >= 7 && h < 21 ? px : null);
    };

    updateTimePx();
    const timer = setInterval(updateTimePx, 60000);
    return () => clearInterval(timer);
  }, []);

  const reduxProjects = useSelector(state => state.project?.projects) || [];
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // --- Form State ---
  const [platform, setPlatform] = useState('meet'); // default: Google Meet
  const [teamsAuthChecking, setTeamsAuthChecking] = useState(false);
  const [meetingType, setMeetingType] = useState('quickSync');
  const [reminder, setReminder] = useState(30);
  const [description, setDescription] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('none');
  const [isRecurrenceDropOpen, setIsRecurrenceDropOpen] = useState(false);

  // Get dynamic recurrence option labels based on chosen selectedDate
  const recurrenceOptions = useMemo(() => {
    const baseDate = selectedDate || new Date();
    
    const getOrdinalSuffix = (num) => {
      const j = num % 10, k = num % 100;
      if (j === 1 && k !== 11) return num + "st";
      if (j === 2 && k !== 12) return num + "nd";
      if (j === 3 && k !== 13) return num + "rd";
      return num + "th";
    };
    
    const getWeekdayOrdinalInMonth = (date) => {
      const day = date.getDate();
      const weekIdx = Math.floor((day - 1) / 7);
      const ordinals = ["first", "second", "third", "fourth", "fifth"];
      
      const temp = new Date(date);
      temp.setDate(temp.getDate() + 7);
      const isLast = temp.getMonth() !== date.getMonth();
      
      return isLast ? "last" : ordinals[weekIdx];
    };
    
    const weekdayName = baseDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = baseDate.toLocaleDateString('en-US', { month: 'long' });
    const dayWithSuffix = getOrdinalSuffix(baseDate.getDate());
    const ordinalName = getWeekdayOrdinalInMonth(baseDate);
    
    return [
      { id: 'none', label: 'Does not repeat' },
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: `Weekly on ${weekdayName}` },
      { id: 'every_weekday', label: 'Every weekday (Monday - Friday)' },
      { id: 'monthly_day', label: `Monthly on ${dayWithSuffix}` },
      { id: 'monthly_weekday', label: `Monthly on ${ordinalName} ${weekdayName}` },
      { id: 'yearly', label: `Yearly on ${monthName} ${dayWithSuffix}` },
      { id: 'custom', label: 'Custom...' }
    ];
  }, [selectedDate]);

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

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (popoverAnchor && !e.target.closest('.meeting-popover') && !e.target.closest('.existing-meeting')) {
        setSelectedMeetingForDetails(null);
        setPopoverAnchor(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [popoverAnchor]);

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

  // --- Fetch Existing Meetings (only within visible window ±1 week) ---
  useEffect(() => {
    const fetchAllMeetings = async () => {
      try {
        const resp = await API.get('/meetings/');
        let meetings = [];
        if (resp.data && resp.data.success) {
          meetings = resp.data.meetings || [];
        } else if (Array.isArray(resp.data)) {
          meetings = resp.data;
        }
        // Filter: only show meetings that have a valid future or current-week date
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const filtered = meetings.filter(m => {
          if (!m.date) return false;
          if (m.status === 'cancelled') return false;
          const mDate = new Date(m.date);
          // Only show meetings from today onwards
          return mDate >= now;
        });
        setExistingMeetings(filtered);
      } catch (err) {
        console.error('Failed to fetch existing meetings', err);
      }
    };
    fetchAllMeetings();
  }, [currentWeekStart]);

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
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Re-hydrate the JSX icon because React elements cannot be serialized to JSON.
      // If we don't do this, React will throw: "Objects are not valid as a React child"
      return parsed.map(t => ({
        ...t,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
          </svg>
        )
      }));
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

    // Define the icon for the new type
    const icon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>;

    const newType = {
      id: `custom_${Date.now()}`,
      label: customReasonInput.trim(),
      icon
    };

    const updated = [...customEventTypes, newType];
    setCustomEventTypes(updated);

    // Save to localStorage, but strip the icon JSX because it can't be serialized.
    // It will be re-added in initialCustomTypes via useMemo on next load.
    const toSave = updated.map(({ icon, ...rest }) => rest);
    localStorage.setItem('custom_event_types', JSON.stringify(toSave));

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
    if (activeView === 'Day') {
      const targetDate = selectedDate || new Date();
      return [targetDate];
    }
    if (activeView === 'Work') {
      return [...Array(5)].map((_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + 1 + i); // Mon - Fri
        return d;
      });
    }
    return [...Array(7)].map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart, activeView, selectedDate]);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

  // --- 1. Detect and Split Overlapping Events (Logic) ---
  const meetingsByDay = useMemo(() => {
    const dayMap = {};
    weekDays.forEach(d => {
      const key = d.toDateString();
      const dayMeetings = existingMeetings.filter(m => {
        if (!m.date) return false;
        const mDate = new Date(m.date);
        return mDate.toDateString() === key;
      }).sort((a, b) => {
        const aT = parseTimeTo24(a.time);
        const bT = parseTimeTo24(b.time);
        return (aT.h * 60 + aT.m) - (bT.h * 60 + bT.m);
      });

      if (!dayMeetings.length) {
        dayMap[key] = {};
        return;
      }

      const layoutMap = {};
      const groups = [];

      // Create connected components of overlapping meetings
      dayMeetings.forEach(m => {
        const { h, m: min } = parseTimeTo24(m.time);
        const start = h * 60 + min;
        const end = start + (m.duration || 60);
        m._start = start;
        m._end = end;

        let foundGroup = false;
        for (let group of groups) {
          if (group.some(gm => start < gm._end && end > gm._start)) {
            group.push(m);
            foundGroup = true;
            break;
          }
        }
        if (!foundGroup) groups.push([m]);
      });

      // For each group, assign columns side-by-side
      groups.forEach(group => {
        const columns = [];
        group.sort((a, b) => a._start - b._start).forEach(m => {
          let colIdx = 0;
          while (columns[colIdx] && columns[colIdx].some(cm => m._start < cm._end && m._end > cm._start)) {
            colIdx++;
          }
          if (!columns[colIdx]) columns[colIdx] = [];
          columns[colIdx].push(m);
          m._colIdx = colIdx;
        });

        const maxCols = columns.length;
        group.forEach(m => {
          layoutMap[m.id] = {
            left: (m._colIdx * 100) / maxCols,
            width: 100 / maxCols,
            totalInGroup: group.length,
            isConflict: maxCols > 1
          };
        });
      });
      dayMap[key] = layoutMap;
    });
    return dayMap;
  }, [existingMeetings, weekDays]);

  // ── Drag to Schedule State ──
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState(null);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isResizing && dragStartInfo && timeSlotsRef.current) {
        const gridRect = timeSlotsRef.current.getBoundingClientRect();
        const relativeY = e.clientY - gridRect.top + timeSlotsRef.current.scrollTop;
        const currentMinFromStart = relativeY;
        const totalMinAtMouse = (7 * 60) + currentMinFromStart;
        const snappedMin = Math.round(totalMinAtMouse / 15) * 15;
        const minEndMin = dragStartInfo.totalMin + 15;
        const finalEndMin = Math.max(snappedMin, minEndMin);
        const eH = Math.floor(finalEndMin / 60);
        const eM = finalEndMin % 60;
        
        requestAnimationFrame(() => {
          setEndTime(`${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`);
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setDraggedMeeting(null);
      setDraggedType(null);
      setDragOverInfo(null);
      document.body.classList.remove('resizing-active');
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, dragStartInfo]);

  const handleSlotMouseDown = (date, hour, min) => {
    if (isPastSlot(date, hour, min)) return;
    
    const totalMin = hour * 60 + min;
    setDragStartInfo({ date, totalMin });
    setIsDragging(true);
    
    setSelectedDate(date);
    setUseCustomTime(true);
    
    const start24 = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    setStartTime(start24);
    setEndTime(addMinutes(start24, 30));
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    const time12 = `${h12}:${String(min).padStart(2, '0')} ${period}`;
    setSelectedTime(time12);
    setTimeError('');
  };

  const handleSlotMouseEnter = (date, hour, min) => {
    if ((!isDragging && !isResizing) || !dragStartInfo) return;
    if (date.getDate() !== dragStartInfo.date.getDate()) return; // constrain to same day
    
    const currMin = hour * 60 + min;

    if (isDragging) {
      if (isPastSlot(date, hour, min)) return;
      const startMin = Math.min(dragStartInfo.totalMin, currMin);
      const endMin = Math.max(dragStartInfo.totalMin, currMin) + 30; // inclusive
      
      const sH = Math.floor(startMin / 60);
      const sM = startMin % 60;
      const eH = Math.floor(endMin / 60);
      const eM = endMin % 60;

      requestAnimationFrame(() => {
        setStartTime(`${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`);
        setEndTime(`${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`);
      });
    }
  };

  const handleExistingMeetingClick = (e, meeting) => {
    e.stopPropagation();
    setCopiedPopoverLink(false);
    
    // Multi-selection logic (Method 2)
    if (e.ctrlKey || e.metaKey) {
      setSelectedMeetingIds(prev => 
        prev.includes(meeting.id) ? prev.filter(id => id !== meeting.id) : [...prev, meeting.id]
      );
      setSelectedMeetingForDetails(null);
      setPopoverAnchor(null);
      return;
    }

    // Requirement 5: Open Breakdown panel with pre-filled details
    setSelectedMeetingIds([meeting.id]);
    
    // Populate form fields for the "Breakdown" sidebar
    if (meeting.date) setSelectedDate(new Date(meeting.date));
    if (meeting.project_id) setSelectedProjectId(String(meeting.project_id));
    
    // Handle attendees (backend might return list of objects or emails)
    const atts = Array.isArray(meeting.attendees) 
      ? meeting.attendees.map(a => typeof a === 'object' ? a.email : a)
      : [];
    setAttendees(atts);
    
    // Handle agenda
    const ag = typeof meeting.agenda_text === 'string' 
      ? meeting.agenda_text.split('\n').filter(Boolean)
      : (Array.isArray(meeting.agenda) ? meeting.agenda : []);
    setAgenda(ag);
    
    // Handle Platform
    if (meeting.platform) setPlatform(meeting.platform);
    
    // Handle Time
    const { h, m } = parseTimeTo24(meeting.time);
    const start24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setStartTime(start24);
    setUseCustomTime(true);
    setPresetDuration(meeting.duration || 60);
    setEndTime(addMinutes(start24, meeting.duration || 60));
    setMeetingType(meeting.meeting_type || 'quickSync');
    setDescription(meeting.description || '');

    // Existing popover logic
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 340;
    const padding = 10;
    
    let x = rect.right + padding;
    if (x + popoverWidth > window.innerWidth) {
      x = rect.left - popoverWidth - padding;
    }
    
    const y = Math.min(rect.top, window.innerHeight - 400);
    setPopoverAnchor({ x, y });
    setSelectedMeetingForDetails(meeting);
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

  // ── Drag and Drop Handlers ──
  const handleDragStart = (e, meeting) => {
    if (isRescheduling) { e.preventDefault(); return; }
    
    // If dragging a selected meeting, move the whole batch
    const batch = selectedMeetingIds.includes(meeting.id) ? selectedMeetingIds : [meeting.id];
    e.dataTransfer.setData('meetingIds', JSON.stringify(batch));
    e.dataTransfer.effectAllowed = 'move';
    
    setDraggedMeeting(meeting);
    setDraggedType(null);
    
    setTimeout(() => {
      batch.forEach(id => {
        const el = document.getElementById(`meeting-${id}`);
        if (el) el.style.opacity = '0.3';
      });
    }, 0);
  };

  const handleMeetingTypeDragStart = (e, type) => {
    e.dataTransfer.setData('meetingType', type.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedType(type);
    setDraggedMeeting(null);
  };

  const handleDragEnd = (e, meeting) => {
    setDraggedMeeting(null);
    setDraggedType(null);
    setDragOverInfo(null);
    if (meeting) {
      const el = document.getElementById(`meeting-${meeting.id}`);
      if (el) el.style.opacity = '1';
    }
  };

  const handleDragOver = (e, date) => {
    e.preventDefault(); 
    if (!draggedMeeting && !draggedType) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    
    const minutesSinceStart = relativeY;
    const totalMinutes = hours[0] * 60 + minutesSinceStart;
    
    const snappedMinutes = Math.round(totalMinutes / 15) * 15;
    const finalTop = (snappedMinutes - hours[0] * 60);
    
    const h = Math.floor(snappedMinutes / 60);
    const m = snappedMinutes % 60;
    const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    
    // Axis Locking Logic: If drag is primarily horizontal, preserve the original time
    let finalTime = time24;
    const isHorizontalDrag = Math.abs(e.movementX || 0) > Math.abs(e.movementY || 0) * 1.5;
    
    if (isHorizontalDrag && draggedMeeting) {
      finalTime = draggedMeeting.time_24 || time24; // Use helper if available
    }

    // Throttle state updates for smoothness
    if (!dragOverInfo || dragOverInfo.time !== finalTime || dragOverInfo.date.getTime() !== date.getTime()) {
      requestAnimationFrame(() => {
        setDragOverInfo({ date, time: finalTime, topPx: finalTop });
      });
    }
  };

  const handleDrop = async (e, date) => {
    e.preventDefault();
    const batchData = e.dataTransfer.getData('meetingIds');
    const meetingIds = batchData ? JSON.parse(batchData) : [];
    const typeId = e.dataTransfer.getData('meetingType');
    
    if (!dragOverInfo) return;

    if (meetingIds.length > 0) {
      const targetDate = date.toISOString().split('T')[0];
      const targetTime = to12Hour(dragOverInfo.time);
      
      // Calculate time offset for batch moves (preserving relative distance)
      const baseMeeting = existingMeetings.find(m => m.id === meetingIds[0]);
      
      setDraggedMeeting(null);
      setDragOverInfo(null);

      // Perform batch move
      for (const id of meetingIds) {
        await handleRescheduleMeeting(id, targetDate, targetTime);
      }
      setSelectedMeetingIds([]);
    } else if (typeId) {
      setMeetingType(typeId);
      setSelectedDate(date);
      setUseCustomTime(true);
      
      let finalTime;
      if (dragOverInfo.isHeader) {
        finalTime = '09:00'; // Default for header drop
      } else {
        finalTime = dragOverInfo.time;
      }
      
      setStartTime(finalTime);
      setEndTime(addMinutes(finalTime, presetDuration));
      setSelectedTime(to12Hour(finalTime));
      
      setDraggedType(null);
      setDragOverInfo(null);
      
      // Focus the form
      const formEl = document.querySelector('.form-column');
      if (formEl) formEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRescheduleMeeting = async (meetingId, newDate, newTime) => {
    try {
      setIsRescheduling(true);
      
      // Optimistic update
      const oldMeetings = [...existingMeetings];
      setExistingMeetings(prev => prev.map(m => 
        String(m.id) === String(meetingId) ? { ...m, date: newDate, time: newTime } : m
      ));

      const resp = await API.patch(`/meetings/${meetingId}`, {
        date: newDate,
        time: newTime
      });

      if (resp.data.success) {
        toast.success('Meeting rescheduled');
      } else {
        setExistingMeetings(oldMeetings);
        toast.error('Failed to reschedule');
      }
    } catch (err) {
      toast.error('Error rescheduling meeting');
      console.error(err);
    } finally {
      setIsRescheduling(false);
    }
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

  const handleAutoMove = async (meeting) => {
    // ── Resolution Intelligence: Find Next Free Slot ──
    const mDate = new Date(meeting.date);
    const dayKey = mDate.toDateString();
    const dayMeetings = existingMeetings.filter(m => new Date(m.date).toDateString() === dayKey && m.id !== meeting.id);
    
    // Convert all meetings to ranges in minutes
    const ranges = dayMeetings.map(m => {
      const { h, m: min } = parseTimeTo24(m.time);
      const start = h * 60 + min;
      const end = start + (m.duration || 60);
      return { start, end };
    }).sort((a, b) => a.start - b.start);

    const duration = meeting.duration || 60;
    const workdayStart = 8 * 60; // 8 AM
    const workdayEnd = 18 * 60;  // 6 PM
    
    let targetStart = null;
    let currentPos = workdayStart;

    // Check for gaps
    for (const r of ranges) {
      if (r.start - currentPos >= duration) {
        targetStart = currentPos;
        break;
      }
      currentPos = Math.max(currentPos, r.end);
    }

    // Check after last meeting
    if (targetStart === null && workdayEnd - currentPos >= duration) {
      targetStart = currentPos;
    }

    if (targetStart !== null) {
      const h = Math.floor(targetStart / 60);
      const m = targetStart % 60;
      const newTime24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      try {
        setLoading(true);
        // Optimistic UI update
        const updated = { ...meeting, time: newTime24 };
        setExistingMeetings(prev => prev.map(ex => ex.id === meeting.id ? updated : ex));
        
        // Perspective update: API call
        await API.patch(`/meetings/${meeting.id}`, { time: newTime24 });
        
        // Feedback
        setHighlightedMeetingId(meeting.id);
        setTimeout(() => setHighlightedMeetingId(null), 2500);
      } catch (err) {
        console.error('Failed to auto-move meeting', err);
        // Rollback on failure
        setExistingMeetings(prev => prev.map(ex => ex.id === meeting.id ? meeting : ex));
      } finally {
        setLoading(false);
      }
    } else {
      alert("No free slots found on this day. Try another date.");
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    const isConfirmed = await confirm({
      title: 'Cancel Meeting',
      description: 'Are you sure you want to cancel this meeting? This will notify all attendees.',
      confirmText: 'Yes, Cancel Meeting',
      variant: 'danger'
    });
    
    if (!isConfirmed) return;
    
    try {
      setLoading(true);
      const resp = await API.post(`/meetings/${meetingId}/cancel`, {
        reason: 'User cancelled from schedule grid',
        notify_attendees: true
      });
      
      if (resp.data.success) {
        setExistingMeetings(prev => prev.filter(m => m.id !== meetingId));
        setSelectedMeetingForDetails(null);
        setPopoverAnchor(null);
      }
    } catch (err) {
      console.error('Failed to cancel meeting', err);
      alert('Failed to cancel meeting. Please try again.');
    } finally {
      setLoading(false);
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
          recurrence_rule: recurrenceRule,
        });

        if (resp.data.success) {
          // Redirect to the internal meeting details page
          navigate(`/dashboard/meeting/${resp.data.meeting_id}`);
        } else {
          setError(resp.data.error || 'Failed to schedule Teams meeting.');
        }
      } catch (err) {
        const detail = err.response?.data?.detail || err.response?.data?.error || 'Teams meeting creation failed.';
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
      project_id: Number(selectedProjectId),
      recurrence_rule: recurrenceRule,
    };

    try {
      const resp = await API.post('/meetings/publish', payload);
      if (resp.data.success) {
        // Redirect to the internal meeting details page
        navigate(`/dashboard/meeting/${resp.data.meeting.id}`);
      } else {
        setError(resp.data.error || 'Failed to schedule meeting.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(err.response.data?.detail || err.response.data?.error || 'Authentication required. Please reconnect your account.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.detail || 'An error occurred. Make sure backend is running properly.');
      }
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
    setRecurrenceRule('none');
    setIsRecurrenceDropOpen(false);
  };

  // --- Render ---

  // --- Recommendation Logic ---
  const recommendedPlatform = useMemo(() => {
    const internalTypes = ['quickSync', 'deepWork', 'interview'];
    return internalTypes.includes(meetingType) ? 'teams' : 'meet';
  }, [meetingType]);

  return (
    <TooltipProvider>
      <div className="schedule-meeting-page h-full w-full">
      {/* ───── LEFT COLUMN (MINI CAL & SETTINGS) ───── */}
      <div className="sidebar-left flex flex-col gap-5 h-full overflow-y-auto pr-2 pb-4">
        
        {/* Workspace Brand / Header inside sidebar to save vertical space */}
        <div className="mb-2">
          <h1 className="text-gray-900 font-extrabold text-2xl tracking-tight">Schedule</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Configure your workspace</p>
        </div>

        {/* Mini Calendar */}
        <div className="glass-panel rounded-2xl border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-shadow">
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
        <div className="glass-panel rounded-2xl border border-gray-200/50 p-4 shadow-sm hover:shadow-md transition-shadow">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Event Type</label>
          <div className="flex flex-col gap-2">
            {meetingTypes.map(type => (
              <button
                key={type.id}
                draggable={true}
                onDragStart={(e) => handleMeetingTypeDragStart(e, type)}
                onDragEnd={() => handleDragEnd(null, null)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-grab active:cursor-grabbing ${
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
        <div className="glass-panel rounded-2xl border border-gray-200/50 p-4 shadow-sm mb-4 hover:shadow-md transition-shadow">
           <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Event Color</label>
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
      <div className="calendar-column h-full overflow-y-auto pb-6 pr-1 custom-scrollbar">
        {/* Calendar Card (Weekly View) */}
        <div className="glass-panel rounded-2xl border border-gray-200/50 p-4 shadow-sm transition-all h-full flex flex-col hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between mb-3 px-1 gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors shadow-sm"
                onClick={handleToday}
              >
                Today
              </button>
              <div className="flex items-center gap-2">
                <button 
                  className="p-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg border border-gray-200 transition-colors shadow-sm focus:outline-none" 
                  onClick={handlePrevTime}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                  className="p-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 rounded-lg border border-gray-200 transition-colors shadow-sm focus:outline-none" 
                  onClick={handleNextTime}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 key={calendarKey} className="text-sm lg:text-base font-bold text-gray-800 tracking-tight select-none cal-month-label-anim ml-1 whitespace-nowrap truncate max-w-[130px] sm:max-w-none">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: activeView === 'Day' ? 'numeric' : undefined })}
              </h2>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsViewDropOpen(!isViewDropOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors shadow-sm"
              >
                {activeView === 'Work' ? 'Work Week' : activeView}
                <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
              </button>
              
              {isViewDropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsViewDropOpen(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    {['Day', 'Work', 'Week', 'Agenda'].map(v => (
                      <button 
                        key={v}
                        onClick={() => {
                          setActiveView(v);
                          setIsViewDropOpen(false);
                          if (v === 'Day' && !selectedDate) setSelectedDate(new Date());
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${activeView === v ? 'text-indigo-600 bg-indigo-50/70' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                      >
                        {v === 'Work' ? 'Work Week' : v}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline Grid */}
          <div key={calendarKey} className={`weekly-calendar-container flex-1 overflow-hidden flex flex-col cal-slide-${calendarDir === -1 ? 'from-left' : 'from-right'}`}>
            {activeView === 'Agenda' ? (
              <div className="agenda-view-wrapper flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-gray-50/30">
                {(() => {
                  const futureMeetings = existingMeetings.filter(m => {
                    const { h, m: min } = parseTimeTo24(m.time);
                    return !isPastSlot(m.date, h, min);
                  });
                  futureMeetings.sort((a,b) => new Date(a.date) - new Date(b.date));
                  if(futureMeetings.length === 0) return <div className="text-gray-400 mt-10 text-center font-medium">No upcoming meetings. Enjoy your time back!</div>;
                  
                  let lastDate = '';
                    return futureMeetings.map(m => {
                      const mDateStr = new Date(m.date).toLocaleDateString();
                      const showHeader = mDateStr !== lastDate;
                      lastDate = mDateStr;
                      const mColor = getMeetingColor(m.meeting_type || m.type || 'quickSync');
                      const isSelected = selectedMeetingIds.includes(m.id);

                      return (
                        <React.Fragment key={m.id || Math.random()}>
                          {showHeader && (
                            <div 
                              className={`text-sm font-extrabold text-gray-800 mt-6 mb-3 border-b border-gray-100 pb-1 transition-colors ${dragOverInfo && dragOverInfo.date.getTime() === new Date(m.date).setHours(0,0,0,0) ? 'text-indigo-600 border-indigo-400 bg-indigo-50/50 rounded-t-lg' : ''}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                const d = new Date(m.date);
                                d.setHours(0,0,0,0);
                                if (!dragOverInfo || dragOverInfo.date.getTime() !== d.getTime()) {
                                  setDragOverInfo({ date: d, isHeader: true });
                                }
                              }}
                              onDragLeave={() => setDragOverInfo(null)}
                              onDrop={(e) => handleDrop(e, new Date(m.date))}
                            >
                              {new Date(m.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                          )}
                          
                          <motion.div 
                            key={m.id || Math.random()}
                            id={`agenda-meeting-${m.id}`}
                            layoutId={`meeting-${m.id}`}
                            draggable={isSelected}
                            onDragStart={(e) => handleDragStart(e, m)}
                            onDragEnd={(e) => handleDragEnd(e, m)}
                            className={`flex items-center gap-4 py-3 px-4 mb-2 transition-all shadow-sm border ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100 opacity-100' : 'bg-white/50 grayscale-[0.3] opacity-70 hover:opacity-100 hover:grayscale-0 border-gray-100'} rounded-xl cursor-pointer`}
                            onClick={(e) => handleExistingMeetingClick(e, m)}
                            whileHover={{ scale: 1.005 }}
                          >
                            <div className={`w-20 text-xs font-bold whitespace-nowrap text-right pr-2 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>{to12Hour(m.time)}</div>
                            <div className="w-1 h-10 rounded-full opacity-40" style={{ backgroundColor: mColor.border }}></div>
                            <div className="flex-1">
                              <div className={`font-bold text-sm flex items-center gap-2 ${isSelected ? 'text-indigo-900' : 'text-gray-400'}`}>
                                {isSelected ? <ArrowRight className="w-3 h-3 text-indigo-500" /> : <Lock className="w-3 h-3 opacity-50" />}
                                {m.recurrence_rule && m.recurrence_rule !== 'none' && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                                {m.title}
                              </div>
                              <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>{m.duration} min • {m.meeting_type || 'General'}</div>
                            </div>
                            {m.attendees && (
                              <div className={`flex flex-shrink-0 -space-x-1.5 overflow-hidden hidden sm:flex pl-2 ${isSelected ? 'opacity-100' : 'opacity-50'}`}>
                              {Array.isArray(m.attendees) ? m.attendees.filter(a => a).map((a, i) => {
                                const initial = (typeof a === 'object' ? (a.name || a.email || '?') : String(a)).trim().charAt(0).toUpperCase() || '?';
                                return (
                                <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: mColor.bg, color: mColor.text, borderColor: mColor.border, borderWidth: '1px' }}>
                                  {initial !== '?' && initial !== '[' ? initial : 'A'}
                                </div>
                              )}) : null}
                            </div>
                          )}
                          </motion.div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            ) : (
            <>
            <div 
              className="weekly-calendar-header border-b border-gray-200 bg-gray-50/50" 
              style={{ display: 'grid', gridTemplateColumns: `60px repeat(${weekDays.length}, minmax(0, 1fr))` }}
            >
              <div className="time-gutter-header">{adaptiveTimezone}</div>
              {weekDays.map(d => (
                <div key={d.toISOString()} className={`day-header${isToday(d) ? ' today-header' : ''}`}>
                  <span className={`day-name${isToday(d) ? ' today-name' : ''}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className={`day-number ${isToday(d) ? 'today shadow-md shadow-indigo-200' : ''}`}>{d.getDate()}</span>
                </div>
              ))}
            </div>
            
            <div className="weekly-calendar-scroll-area flex-1 overflow-y-auto custom-scrollbar" ref={timeSlotsRef}>
              <div className="weekly-calendar-body relative">
                {/* 1. Time Gutter */}
                <div className="time-gutter relative">
                  {/* Zoho style current-time axis pill */}
                  {currentTimePx !== null && (
                    <div
                      className="current-time-axis-pill absolute right-2 -translate-y-1/2 bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-sm z-20 pointer-events-none"
                      style={{ top: `${currentTimePx}px` }}
                    >
                      {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  {hours.map(h => (
                    <div key={h} className="time-label">
                      {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                    </div>
                  ))}
                </div>

              <div
                className="days-grid"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}
              >
                {/* Live current-time indicator — renders across all columns */}
                {currentTimePx !== null && (
                  <div
                    className="current-time-indicator"
                    style={{ top: `${currentTimePx}px`, left: 0, right: 0, position: 'absolute', zIndex: 15 }}
                  >
                    <div className="current-time-dot" />
                    <div className="current-time-line" />
                  </div>
                )}
                {weekDays.map(d => {
                  // For rendering the selected block visually on the grid
                  const hasSelection = selectedDate && 
                                       selectedDate.getDate() === d.getDate() && 
                                       selectedDate.getMonth() === d.getMonth() &&
                                       startTime && endTime && !selectedMeetingForDetails;
                  let topPx = 0;
                  let heightPx = 0;
                  let isCollision = false;

                  if (hasSelection) {
                    const [sh, sm] = startTime.split(':').map(Number);
                    const [eh, em] = endTime.split(':').map(Number);
                    const startMin = sh * 60 + sm;
                    const endMin = eh * 60 + em;
                    
                    topPx = (startMin - hours[0] * 60);
                    heightPx = Math.max(endMin - startMin, 15); // min 15px

                    // Collision checking for visual overlap warning
                    const blockStartMin = startMin;
                    const blockEndMin = endMin;
                    
                    isCollision = existingMeetings.some(m => {
                      if (!m.date) return false;
                      const mDate = new Date(m.date);
                      if (mDate.getDate() !== d.getDate() || mDate.getMonth() !== d.getMonth() || mDate.getFullYear() !== d.getFullYear()) return false;
                      
                      const { h, m: min } = parseTimeTo24(m.time);
                      const mStartMin = h * 60 + min;
                      const mEndMin = mStartMin + (m.duration || 60);
                      
                      return blockStartMin < mEndMin && blockEndMin > mStartMin; // Overlap formula
                    });
                  }

                  return (
                    <div 
                      key={d.toISOString()} 
                      className={`day-col relative${isToday(d) ? ' today-col' : ''}${dragOverInfo && dragOverInfo.date.getTime() === d.getTime() ? ' drag-over' : ''}`}
                      onDragOver={(e) => handleDragOver(e, d)}
                      onDrop={(e) => handleDrop(e, d)}
                    >
                      {/* Rescheduling Ghost Preview */}
                      {dragOverInfo && (draggedMeeting || draggedType) && dragOverInfo.date.getTime() === d.getTime() && (
                        <div 
                          className="event-block ghost-preview absolute left-[4px] right-[4px] z-0 opacity-40 pointer-events-none border-2 border-dashed border-indigo-400 rounded-lg flex flex-col p-2"
                          style={{ 
                            top: `${dragOverInfo.topPx}px`, 
                            height: `${(draggedMeeting?.duration || draggedMeeting?.duration_minutes) || 60}px`,
                            backgroundColor: '#e0e7ff',
                          }}
                        >
                          <span className="text-[10px] font-extrabold text-indigo-600 uppercase mb-1">{to12Hour(dragOverInfo.time, true)}</span>
                          {draggedType && <span className="text-[9px] font-bold text-indigo-500 truncate">{draggedType.label}</span>}
                          {draggedMeeting && <span className="text-[9px] font-bold text-indigo-500 truncate">{draggedMeeting.title}</span>}
                        </div>
                      )}
                      
                      {hours.map(h => (
                        <div key={h} className="hour-slot-group">
                          <div
                            className={`half-hour ${isPastSlot(d, h, 0) ? 'past' : ''}`}
                            data-time={`${h === 12 ? '12' : h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`}
                            onMouseDown={() => handleSlotMouseDown(d, h, 0)}
                            onMouseEnter={() => handleSlotMouseEnter(d, h, 0)}
                          />
                          <div
                            className={`half-hour ${isPastSlot(d, h, 30) ? 'past' : ''}`}
                            data-time={`${h === 12 ? '12' : h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`}
                            onMouseDown={() => handleSlotMouseDown(d, h, 30)}
                            onMouseEnter={() => handleSlotMouseEnter(d, h, 30)}
                          />
                        </div>
                      ))}
                      
                      
                      {/* Render EXISTING Meetings for this day (with intelligent overlap layout) */}
                      {(() => {
                        const dayKey = d.toDateString();
                        const dayLayouts = meetingsByDay[dayKey] || {};
                        const dayMeetings = existingMeetings.filter(m => {
                          if (!m.date) return false;
                          const mDate = new Date(m.date);
                          return mDate.toDateString() === dayKey;
                        });

                        return dayMeetings.map(m => {
                          const layout = dayLayouts[m.id] || { left: 0, width: 100, isConflict: false, totalInGroup: 1 };
                          const { h: mH, m: mM } = parseTimeTo24(m.time);
                          const dur = m.duration || 60;
                          const blockTop = (mH - hours[0]) * 60 + mM;
                          const blockHeight = Math.max(dur, 40); // Requirement 4: Consistent min-height
                          const mColor = getMeetingColor(m.meeting_type || m.type || 'quickSync');

                          const start24 = `${String(mH).padStart(2, '0')}:${String(mM).padStart(2, '0')}`;
                          const end24 = addMinutes(start24, dur);
                          const timeRange = `${to12Hour(m.time, true)} - ${to12Hour(end24, true)}`;
                          const isSelected = selectedMeetingIds.includes(m.id);
                          
                          const isUltraShort = dur < 30;
                          const isShort = dur < 45;

                          return (
                            <motion.div 
                              key={m.id || Math.random()}
                              id={`meeting-${m.id}`}
                              layoutId={`meeting-${m.id}`}
                              className={`event-block existing-meeting absolute flex ${isUltraShort ? 'flex-row items-center justify-between' : 'flex-col justify-start'} transition-all shadow-sm ${isSelected ? 'selected-card z-50' : 'z-10'} ${highlightedMeetingId === m.id ? 'focused-conflict-card' : ''}`}
                              onClick={(e) => handleExistingMeetingClick(e, m)} 
                              whileHover={{ scale: 1.02, zIndex: 60, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              style={{ 
                                top: `${blockTop}px`, 
                                height: `${blockHeight}px`,
                                left: `${layout.left}%`,
                                width: `${layout.width}%`,
                                backgroundColor: `${mColor.border}15`, 
                                borderLeft: `3px solid ${mColor.border}`, 
                                borderRadius: '4px',
                                padding: isUltraShort ? '4px 8px' : '6px 8px',
                                pointerEvents: 'auto', // Re-enabled to allow Tooltip interaction
                                overflow: 'visible',
                                cursor: 'pointer'
                              }}
                            >
                              {/* New Tooltip-based Collision Hub */}
                              {layout.isConflict && (
                                <div className="absolute top-1 right-1 z-[100]">
                                  <CollisionIndicator 
                                    groupMeetings={dayMeetings.filter(dm => {
                                      const { h, m: min } = parseTimeTo24(dm.time);
                                      const s = h * 60 + min;
                                      const e = s + (dm.duration || 60);
                                      const { h: mh, m: mm } = parseTimeTo24(m.time);
                                      const ms = mh * 60 + mm;
                                      const me = ms + (m.duration || 60);
                                      return s < me && e > ms;
                                    })} 
                                    to12Hour={to12Hour}
                                  />
                                </div>
                              )}

                              <div className={`flex ${isUltraShort ? 'flex-1 items-center gap-2' : 'flex-col'} overflow-hidden`}>
                                <div className="flex items-center gap-1 overflow-hidden">
                                  {isSelected && <ArrowRight className="w-2.5 h-2.5 text-indigo-600 shrink-0" />}
                                  <span className={`truncate ${isUltraShort ? 'text-[10px]' : 'text-[11px]'} font-bold text-gray-800 leading-tight flex items-center gap-1`}>
                                    {m.recurrence_rule && m.recurrence_rule !== 'none' && <RefreshCw className="w-2.5 h-2.5 text-gray-400 shrink-0" />}
                                    {m.title}
                                  </span>
                                </div>
                                
                                {!isUltraShort && (
                                  <span className={`text-[10px] font-medium text-gray-500 truncate ${isShort ? '' : 'mb-1'}`}>
                                    {isShort ? to12Hour(m.time, true) : timeRange}
                                  </span>
                                )}
                              </div>
                              
                              {isUltraShort && (
                                <span className="text-[9px] font-black text-gray-400 whitespace-nowrap ml-2">
                                  {to12Hour(m.time, true)}
                                </span>
                              )}

                              {!isShort && m.attendees?.length > 0 && (
                                <div className="mt-auto flex -space-x-1.5 overflow-hidden">
                                  {m.attendees.slice(0, 3).map((a, i) => {
                                    const initial = (typeof a === 'object' ? (a.name || a.email || '?') : String(a)).trim().charAt(0).toUpperCase() || '?';
                                    return (
                                      <div key={i} className="w-4 h-4 rounded-full border border-white bg-slate-100 flex items-center justify-center text-[7px] font-black text-slate-700 shadow-sm">
                                        {initial}
                                      </div>
                                    );
                                  })}
                                  {m.attendees.length > 3 && (
                                    <div className="w-4 h-4 rounded-full border border-white bg-slate-100 flex items-center justify-center text-[7px] font-bold text-slate-500 shadow-sm">
                                      +{m.attendees.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          );
                        });
                      })()}

                      {/* Render DRAFT / SELECTION Meeting (Only if not viewing existing meeting details) */}
                      {hasSelection && !selectedMeetingForDetails && (() => {
                          const isUltraShort = (draggedMeeting?.duration || draggedMeeting?.duration_minutes || heightPx) < 30;
                          const isShort = (draggedMeeting?.duration || draggedMeeting?.duration_minutes || heightPx) < 45;

                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`event-block active flex ${isUltraShort ? 'flex-row items-center justify-between' : 'flex-col justify-center'} absolute left-0 right-0 z-30 transition-all cursor-grab active:cursor-grabbing ${isCollision ? 'error-collision' : ''}`}
                              style={{ 
                                top: `${topPx}px`, 
                                height: `${heightPx}px`, 
                                backgroundColor: isCollision ? '#fef2f2' : `${eventColor}25`,
                                borderLeft: `4px solid ${isCollision ? '#ef4444' : eventColor}`,
                                borderRadius: '6px',
                                padding: isUltraShort ? '0 8px' : '0 12px',
                                boxShadow: isCollision ? `0 2px 8px rgba(220, 38, 38, 0.15)` : `0 12px 40px ${eventColor}45`,
                                color: isCollision ? '#c5221f' : eventColor,
                                fontSize: isUltraShort ? '10px' : '11px',
                                fontWeight: '700',
                                lineHeight: '1.2',
                                pointerEvents: (isDragging || isResizing) ? 'none' : 'auto'
                              }}
                            >
                              <div className={`flex ${isUltraShort ? 'items-center gap-2' : 'flex-col mb-1'} overflow-hidden`}>
                                {!isUltraShort && (
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="px-1.5 py-0.5 bg-white/90 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm border border-black/5">Draft</span>
                                    {heightPx > 50 && (
                                      <span className="text-[9px] font-bold opacity-60 uppercase truncate ml-2">
                                        {projects.find(p => p.id === selectedProjectId)?.name || 'Select Project...'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className={`font-bold truncate ${isUltraShort ? 'text-[10px]' : 'text-[12px]'}`}>
                                  {isCollision ? 'Collision!' : effectiveTitle}
                                </div>
                              </div>

                              {!isUltraShort && (
                                <span className="opacity-80 text-[10px] font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {selectedTime} ({formatDuration(Math.round(heightPx))})
                                </span>
                              )}

                              {isUltraShort && (
                                <span className="text-[9px] font-black opacity-60 whitespace-nowrap">{to12Hour(startTime, true)}</span>
                              )}
                          
                              {/* Premium Drag handle to resize block downwards */}
                              <div 
                                className={`absolute bottom-[-5px] left-0 right-0 h-[12px] cursor-ns-resize group z-40 flex items-center justify-center transition-all ${isResizing ? 'opacity-100 scale-y-125' : 'opacity-0 hover:opacity-100'}`}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setIsRescheduling(true); // Fixed: was using setIsRescheduling but in draft context
                                  setIsResizing(true);
                                  const [sh, sm] = startTime.split(':').map(Number);
                                  setDragStartInfo({ date: selectedDate, totalMin: sh * 60 + sm });
                                  document.body.classList.add('resizing-active');
                                }}
                              >
                                <div className="w-14 h-[4px] bg-white rounded-full shadow-md border border-black/5" />
                              </div>
                            </motion.div>
                          );
                      })()}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* ───── RIGHT COLUMN (FORM) ───── */}
      <div className="form-column h-full overflow-y-auto pb-6 pl-1 custom-scrollbar">
        <div className="sticky-panel glass-panel border border-gray-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">

          {/* Live Summary Box - Leaner & Neutral */}
          <div className="summary-box mb-6 bg-gray-50/50 border border-gray-100 p-4 rounded-xl text-[12px]">
            <h4 className="font-bold text-gray-400 mb-3 uppercase tracking-[0.15em] text-[10px]">Meeting Breakdown</h4>
            <div className="space-y-2.5 text-gray-700 font-medium">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Date</span>
                <span className="font-bold">{selectedDate ? selectedDate.toLocaleDateString() : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Time</span>
                <span className="font-mono font-black text-indigo-600">
                  {useCustomTime
                    ? (startTime && endTime ? `${to12Hour(startTime)} → ${to12Hour(endTime)}` : '--')
                    : (selectedTime || '--')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Duration</span>
                <span className={`font-bold ${effectiveDuration ? 'text-gray-900' : 'text-gray-300'}`}>{formatDuration(effectiveDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Users className="w-3 h-3" /> Attendees</span>
                <span className="font-bold">{attendees.length} people</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1.5"><Video className="w-3 h-3" /> Platform</span>
                <span className="font-bold">{platform ? platforms.find(p => p.id === platform).name : '--'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-1">
                <span className="text-gray-400 flex items-center gap-1.5"><Pencil className="w-3 h-3" /> Type</span>
                <span className="text-[11px] font-black truncate max-w-[55%] text-right text-indigo-600">{effectiveTitle}</span>
              </div>
              <div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-100">
                <span className="text-gray-400 flex items-center gap-1.5"><Target className="w-3 h-3" /> Project</span>
                <span className="text-[11px] truncate max-w-[55%] text-right font-black text-indigo-600 uppercase tracking-tighter">
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

            {/* Platform Selector - Leaner Cards */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Platform</label>
              <div className="platform-grid flex gap-2">
                {platforms.map(p => (
                  <button
                    key={p.id} type="button"
                    disabled={teamsAuthChecking && p.id === 'teams'}
                    className={`flex-1 group flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${platform === p.id
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-sm'
                        : 'border-gray-100 bg-gray-50/30 hover:border-indigo-200 hover:bg-white'
                      } ${teamsAuthChecking && p.id === 'teams' ? 'opacity-60 cursor-wait' : ''}`}
                    onClick={() => handlePlatformSelect(p.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${platform === p.id ? 'bg-white shadow-sm' : 'bg-white/50'}`}>
                      {teamsAuthChecking && p.id === 'teams' ? <RefreshCw className="animate-spin text-indigo-500 w-3.5 h-3.5" /> : p.icon}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black tracking-wide uppercase ${platform === p.id ? 'text-indigo-900' : 'text-gray-500'}`}>{p.name}</span>
                      {platform === p.id ? (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-tight">Active</span>
                        </div>
                      ) : recommendedPlatform === p.id ? (
                        <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-tighter italic">Suggested</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Section - Leaner */}
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-indigo-500" /> Meeting Duration
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {presetDurations.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setPresetDuration(d.value);
                      setUseCustomTime(false);
                      if (startTime) setEndTime(addMinutes(startTime, d.value));
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-black border transition-all duration-200 ${!useCustomTime && presetDuration === d.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
                      }`}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-black border transition-all duration-200 ${useCustomTime
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
                    }`}
                >
                  Custom...
                </button>
              </div>

              {/* Precise Timing - Leaner Layout */}
              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black text-gray-300 uppercase tracking-widest">Precise Timing</label>
                  {computedDuration && !timeError && (
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {formatDuration(computedDuration)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="time"
                      className={`ui-select w-full font-mono text-[11px] font-black tracking-widest bg-gray-50/50 border-gray-100 focus:bg-white rounded-lg px-2 py-1.5 ${startTime ? 'text-indigo-800' : ''}`}
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                    />
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-200" />
                  <div className="flex-1">
                    <input
                      type="time"
                      className={`ui-select w-full font-mono text-[11px] font-black tracking-widest bg-gray-50/50 border-gray-100 focus:bg-white rounded-lg px-2 py-1.5 ${endTime ? 'text-indigo-800' : ''} ${timeError ? 'border-red-400 bg-red-50' : ''}`}
                      value={endTime}
                      min={startTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                    />
                  </div>
                </div>
                {timeError && (
                  <p className="text-[9px] text-red-500 mt-2 font-bold flex items-center gap-1">
                    <X className="w-2.5 h-2.5" /> {timeError}
                  </p>
                )}
              </div>
            </div>

            {/* Recurrence Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" /> Repeat Settings
              </label>
              
              <button
                type="button"
                onClick={() => setIsRecurrenceDropOpen(!isRecurrenceDropOpen)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all bg-white cursor-pointer flex items-center justify-between font-medium text-gray-700"
              >
                <span>{recurrenceOptions.find(o => o.id === recurrenceRule)?.label || 'Does not repeat'}</span>
                <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
              </button>

              {isRecurrenceDropOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsRecurrenceDropOpen(false)} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    {recurrenceOptions.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setRecurrenceRule(option.id);
                          setIsRecurrenceDropOpen(false);
                          if (option.id === 'custom') {
                            toast('Custom settings will repeat daily by default.', { icon: '⚙️' });
                          }
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${recurrenceRule === option.id ? 'text-indigo-600 bg-indigo-50/70' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
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
              {loading ? <Spinner size="sm" /> : 'Publish & Send Invites'}
            </button>
            {!validateForm() && (
              <p className="text-center text-xs text-gray-400 mt-2">Please complete required fields (*)</p>
            )}

          </form>
        </div>
      </div>
      {/* ───── ZO-STYLE MEETING POPOVER ───── */}
      {selectedMeetingForDetails && popoverAnchor && (
        <div 
          className="meeting-popover fixed z-[100] w-[340px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden animate-fadeIn animate-scaleIn"
          style={{ 
            left: popoverAnchor.x, 
            top: popoverAnchor.y,
            borderLeft: `5px solid ${getMeetingColor(selectedMeetingForDetails.meeting_type || selectedMeetingForDetails.type).border}` 
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight mb-2 truncate" title={selectedMeetingForDetails.title}>
                  {selectedMeetingForDetails.title}
                </h3>
                <div className="flex items-center">
                  <div 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md border"
                    style={{ 
                      backgroundColor: `${getMeetingColor(selectedMeetingForDetails.meeting_type || selectedMeetingForDetails.type).border}10`,
                      borderColor: `${getMeetingColor(selectedMeetingForDetails.meeting_type || selectedMeetingForDetails.type).border}30`
                    }}
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: getMeetingColor(selectedMeetingForDetails.meeting_type || selectedMeetingForDetails.type).border }}
                    />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-tighter">
                      {selectedMeetingForDetails.meeting_type || 'General'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-all active:scale-95" 
                  title="Quick Edit"
                  onClick={() => {
                    handleExistingMeetingClick({ stopPropagation: () => {} }, selectedMeetingForDetails);
                    setSelectedMeetingForDetails(null);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all active:scale-95" 
                  title="Delete"
                  onClick={() => handleDeleteMeeting(selectedMeetingForDetails.id)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-all ml-1 active:scale-95"
                  onClick={() => setSelectedMeetingForDetails(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-5 border-t border-gray-50 bg-white">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50/50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-gray-800">{new Date(selectedMeetingForDetails.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                <span className="text-[10px] font-medium text-gray-500 mt-0.5">Primary Schedule</span>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50/50 flex items-center justify-center shrink-0 border border-amber-100/50">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-gray-800">{to12Hour(selectedMeetingForDetails.time)} • {selectedMeetingForDetails.duration || 30} minutes</span>
                <span className="text-[10px] font-medium text-gray-500 mt-0.5">Time Duration</span>
              </div>
            </div>

            {selectedMeetingForDetails.attendees && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50/50 flex items-center justify-center shrink-0 border border-emerald-100/50">
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[12px] font-bold text-gray-800 mb-2">Attendees ({Array.isArray(selectedMeetingForDetails.attendees) ? selectedMeetingForDetails.attendees.length : 0})</span>
                  <div className="flex -space-x-1.5 overflow-hidden flex-wrap gap-y-1">
                    {Array.isArray(selectedMeetingForDetails.attendees) ? (
                      selectedMeetingForDetails.attendees.filter(a => a).slice(0, 6).map((a, i) => {
                        const initial = (typeof a === 'object' ? (a.name || a.email || '?') : String(a)).trim().charAt(0).toUpperCase() || '?';
                        return (
                          <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-700 border border-slate-200 shadow-sm" title={typeof a === 'string' ? a : a.name || a.email}>
                            {initial !== '?' && initial !== '[' ? initial : 'A'}
                          </div>
                        );
                      })
                    ) : null}
                    {Array.isArray(selectedMeetingForDetails.attendees) && selectedMeetingForDetails.attendees.length > 6 && (
                      <div className="h-6 w-6 rounded-full ring-2 ring-white bg-indigo-600 flex items-center justify-center text-[8px] font-black text-white border border-indigo-700 shadow-sm">
                        +{selectedMeetingForDetails.attendees.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-4 bg-gray-50/80 flex flex-col gap-3">
            <button 
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[13px] font-extrabold transition-all shadow-lg shadow-indigo-200/50 flex items-center justify-center gap-2 active:scale-[0.98]"
              onClick={() => {
                if (selectedMeetingForDetails.join_url) {
                  window.open(selectedMeetingForDetails.join_url, '_blank');
                } else {
                  navigate(`/dashboard/meeting/${selectedMeetingForDetails.id}`);
                }
              }}
            >
              <Video className="w-4 h-4" /> Join Virtual Room
            </button>
            <div className="flex gap-2">
              <button 
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                  copiedPopoverLink 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={(e) => {
                   e.preventDefault();
                   const link = window.location.origin + `/dashboard/meeting/${selectedMeetingForDetails.id}`;
                   navigator.clipboard.writeText(link);
                   setCopiedPopoverLink(true);
                   setTimeout(() => setCopiedPopoverLink(false), 2000);
                }}
              >
                {copiedPopoverLink ? (
                  <><Check className="w-3 h-3" /> Link Copied!</>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Copy Link
                  </>
                )}
              </button>
              <button 
                className="flex-none px-4 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-tight hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                onClick={() => navigate(`/dashboard/meeting/${selectedMeetingForDetails.id}`)}
              >
                Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};

export default ScheduleMeetingPage;
