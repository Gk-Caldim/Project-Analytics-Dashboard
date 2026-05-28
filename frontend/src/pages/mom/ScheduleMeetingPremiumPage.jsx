import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Settings, X, Plus, Calendar, Clock, Video, Globe, AlertCircle, Check, Loader2, Info, Bell, MapPin, Users, Monitor, Search, Repeat } from 'lucide-react';
import { Textarea } from "../../components/ui/textarea";
import { useConfirm } from "../../hooks/use-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import './ScheduleMeetingPremiumPage.css';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import API from '../../utils/api';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { EVENT_COLORS } from '../constants';
import { Skeleton } from '../../components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
dayjs.extend(customParseFormat);

// --- Utility Helpers ---
const to12Hour = (hour) => {
  const h = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h} ${ampm}`;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

const getAvatarColor = (str) => {
  const colors = [
    '#ec4899', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const GoogleLogo = () => (
  <svg viewBox="0 0 533.5 544.3" className="w-4 h-4">
    <path d="M533.5 277.3c0-19.7-1.8-38.6-5-56.6H272.1v107h146.6c-6.3 34.1-25.6 63-54.6 82.5l88.4 68.5c51.7-47.7 81-118.1 81-201.4z" fill="#4285f4"/>
    <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.4l-88.4-68.5c-24.4 16.3-55.8 26.1-92 26.1-70.8 0-130.7-47.8-152.1-112H27.9v70.5c45.2 89.9 138.2 149.3 244.2 149.3z" fill="#34a853"/>
    <path d="M120 324.4c-5.4-16.1-8.5-33.3-8.5-51.1 0-17.8 3.1-35.1 8.5-51.1V151.7H27.9c-18.1 36-28.5 76.5-28.5 119.3s10.4 83.3 28.5 119.3l92.1-71.2z" fill="#fbbc04"/>
    <path d="M272.1 107.7c40 0 75.8 13.7 104.1 40.8l78-78C407.3 26.7 345.5 1.1 272.1 1.1 166.1 1.1 73.1 60.5 27.9 150.4l92.1 71.2c21.4-64.2 81.3-113.9 152.1-113.9z" fill="#ea4335"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg viewBox="0 0 23 23" className="w-4 h-4">
    <path fill="#f35325" d="M1 1h10v10H1z"/>
    <path fill="#81bc06" d="M12 1h10v10H12z"/>
    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
    <path fill="#ffba08" d="M12 12h10v10H12z"/>
  </svg>
);

const ZoomLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#2D8CFF"/>
    <path d="M6 8.5C6 7.67157 6.67157 7 7.5 7H13.5C14.3284 7 15 7.67157 15 8.5V15.5C15 16.3284 14.3284 17 13.5 17H7.5C6.67157 17 6 16.3284 6 15.5V8.5Z" fill="white"/>
    <path d="M16 10.2L18.4 8.4C18.7 8.2 19 8.4 19 8.7V15.3C19 15.6 18.7 15.8 18.4 15.6L16 13.8V10.2Z" fill="white"/>
  </svg>
);

const DatePopover = ({ selectedDate, onSelect, onClose }) => {
  const [viewDate, setViewDate] = useState(dayjs(selectedDate));
  
  const daysInMonth = viewDate.daysInMonth();
  const startOfMonth = viewDate.startOf('month');
  const emptyDays = startOfMonth.day();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, 'day'));
  const padding = Array.from({ length: emptyDays }, (_, i) => i);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[200] p-4 w-[280px]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-[13px]">{viewDate.format('MMMM YYYY')}</span>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setViewDate(viewDate.subtract(1, 'month'))}><ChevronLeft size={14} /></button>
          <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setViewDate(viewDate.add(1, 'month'))}><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[10px] font-bold text-gray-400">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {padding.map(p => <div key={`pad-${p}`} />)}
        {days.map(d => {
          const isSelected = d.format('YYYY-MM-DD') === dayjs(selectedDate).format('YYYY-MM-DD');
          return (
            <button
              key={d.format('YYYY-MM-DD')}
              className={`h-7 rounded-lg text-[12px] font-medium flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
              onClick={() => { onSelect(d.format('YYYY-MM-DD')); onClose(); }}
            >
              {d.date()}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

// --- Mock Platform & Defaults ---
const PLATFORMS = [
  { id: 'meet', name: 'Google Meet', connected: true, icon: <GoogleLogo /> },
  { id: 'teams', name: 'Microsoft Teams', connected: false, icon: <MicrosoftLogo /> },
  { id: 'zoom', name: 'Zoom Meeting', connected: true, icon: <ZoomLogo /> }
];



const MOCK_MEETINGS = [
  { id: 'm1', title: 'Weekly Product Strategy Sync', start_time: '2026-05-14T11:00:00', end_time: '2026-05-14T12:00:00', color: '#2563eb' },
  { id: 'm2', title: 'Design Review & Feedback', start_time: '2026-05-14T14:00:00', end_time: '2026-05-14T15:00:00', color: '#10b981' }
];

const INITIAL_DEFAULT_TYPES = [
  { label: 'Project Review', duration: 60 },
  { label: 'Interview', duration: 30 },
  { label: 'Daily Standup', duration: 15 }
];

const MOCK_ROOMS = [
  { id: 'r1', name: 'Conference Room A', capacity: 12, equipment: ['Video', 'Whiteboard'], available: true },
  { id: 'r2', name: 'Focus Room 1', capacity: 4, equipment: ['Screen'], available: true },
  { id: 'r3', name: 'Boardroom', capacity: 20, equipment: ['Video', 'Audio', 'Whiteboard'], available: false },
];

const ScheduleMeetingPremiumPage = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  
  // Load custom saved types from model storage with mutable prebuilt defaults
  const [customEventTypes, setCustomEventTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('caldim_custom_event_types_v2');
      return saved ? JSON.parse(saved) : INITIAL_DEFAULT_TYPES;
    } catch { return INITIAL_DEFAULT_TYPES; }
  });

  // State variables
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState(() => {
    try {
      const saved = localStorage.getItem('caldim_custom_event_types_v2');
      const parsed = saved ? JSON.parse(saved) : INITIAL_DEFAULT_TYPES;
      return parsed[0]?.label || '';
    } catch { return INITIAL_DEFAULT_TYPES[0].label; }
  });
  const location = useLocation();
  const editId = new URLSearchParams(location.search).get('edit');
  const isEditMode = !!editId;

  // Pre-fill date & time when coming from calendar quick-create "More options"
  const [date, setDate] = useState(() => {
    const p = new URLSearchParams(location.search);
    return p.get('date') || dayjs().format('YYYY-MM-DD');
  });
  const [viewDate, setViewDate] = useState(() => {
    const p = new URLSearchParams(location.search);
    const d = p.get('date');
    return d ? new Date(d) : new Date();
  });
  const [startTime, setStartTime] = useState(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('time'); // e.g. "2:30 PM"
    if (t) {
      // Convert 12h format to 24h HH:mm for internal state
      const parsed = dayjs(`2000-01-01 ${t}`, 'YYYY-MM-DD h:mm A');
      return parsed.isValid() ? parsed.format('HH:mm') : '10:00';
    }
    return '10:00';
  });
  const [endTime, setEndTime] = useState(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('time');
    if (t) {
      const parsed = dayjs(`2000-01-01 ${t}`, 'YYYY-MM-DD h:mm A');
      if (parsed.isValid()) {
        return parsed.add(1, 'hour').format('HH:mm');
      }
    }
    return '11:00';
  });
  const [platform, setPlatform] = useState('meet');
  const [connectedPlatforms, setConnectedPlatforms] = useState(() => {
    try {
      const saved = localStorage.getItem('caldim_connected_platforms');
      const parsed = saved ? JSON.parse(saved) : {};
      return { meet: true, teams: false, zoom: false, ...parsed };
    } catch {
      return { meet: true, teams: false, zoom: false };
    }
  });
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [agenda, setAgenda] = useState(() => {
    const p = new URLSearchParams(location.search);
    const urlAgenda = p.get('agenda');
    return urlAgenda ? [urlAgenda] : [];
  });
  const [timezone, setTimezone] = useState(new Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [reminder, setReminder] = useState(15);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [eventColor, setEventColor] = useState(EVENT_COLORS[0].hex);
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState('none');

  // Custom addition UI inputs
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customDuration, setCustomDuration] = useState(30);

  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState(null);

  const upcomingEvents = useMemo(() => {
    return meetings
      .filter(m => {
        const start = dayjs(`${m.date} ${m.time}`, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
        return start.isAfter(dayjs().subtract(1, 'hour'));
      })
      .sort((a, b) => {
        const aStart = dayjs(`${a.date} ${a.time}`, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
        const bStart = dayjs(`${b.date} ${b.time}`, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
        return aStart.diff(bStart);
      })
      .slice(0, 4);
  }, [meetings]);

  // Drawer states
  const [isRoomDrawerOpen, setIsRoomDrawerOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Column resizing layout state
  const [columnWidth, setColumnWidth] = useState(62);
  const [isResizing, setIsResizing] = useState(false);
  const rightGridRef = useRef(null);

  // Load Projects and Meetings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          API.get('/projects/'),
          API.get('/meetings/')
        ]);
        if (Array.isArray(pRes.data)) setProjects(pRes.data);
        if (mRes.data?.meetings) setMeetings(mRes.data.meetings);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoadingMeetings(false);
      }
    };
    fetchData();
  }, []);

  // Sync state defaults
  useEffect(() => {
    localStorage.setItem('caldim_custom_event_types_v2', JSON.stringify(customEventTypes));
  }, [customEventTypes]);

  useEffect(() => {
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [date]);

  // Fetch meeting data if in edit mode
  useEffect(() => {
    if (editId) {
      const fetchMeeting = async () => {
        try {
          const res = await API.get(`/meetings/${editId}`);
          if (res.data?.success && res.data.meeting) {
            const m = res.data.meeting;
            setTitle(m.title || '');
            if (m.date) {
              setDate(m.date);
              setViewDate(new Date(m.date));
            }
            if (m.time) {
              // Time from backend could be "10:00 AM" or "10:00"
              const parsedStart = dayjs(`2000-01-01 ${m.time}`, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
              if (parsedStart.isValid()) {
                setStartTime(parsedStart.format('HH:mm'));
                if (m.duration) {
                  setEndTime(parsedStart.add(m.duration, 'minute').format('HH:mm'));
                }
              }
            }
            if (m.platform) setPlatform(m.platform);
            if (m.attendees) setAttendees(m.attendees);
            if (m.description) setDescription(m.description);
            if (m.reminder_minutes !== undefined && m.reminder_minutes !== null) {
              setReminder(m.reminder_minutes);
            } else {
              setReminder(15);
            }
            if (m.project_id) {
              setProjectId(m.project_id);
            } else {
              setProjectId('');
            }
            if (m.agenda && m.agenda.length > 0) setAgenda(m.agenda);
          }
        } catch (error) {
          toast.error("Failed to fetch meeting for edit");
        }
      };
      fetchMeeting();
    }
  }, [editId]);

  // Sync sidebar timeline scroll smoothly roughly centered on start time
  useEffect(() => {
    if (startTime && rightGridRef.current) {
      const startMin = parseTimeToMinutes(startTime);
      const scrollPos = (startMin - 7 * 60) - 240;
      rightGridRef.current.scrollTo({ top: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [startTime]);

  const durationText = useMemo(() => {
    if (!startTime || !endTime) return '';
    const diff = parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
    if (diff <= 0) return '';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }, [startTime, endTime]);

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const recurrenceOptions = useMemo(() => {
    const d = dayjs(date);
    const dayName = d.isValid() ? d.format('dddd') : 'day';
    const dom = d.isValid() ? d.date() : 1;
    const monthDay = d.isValid() ? d.format('MMMM D') : '';
    
    return [
      { key: 'none',     label: 'Does not repeat' },
      { key: 'daily',    label: 'Daily' },
      { key: 'weekly',   label: `Weekly on ${dayName}` },
      { key: 'weekday',  label: 'Every weekday (Monday - Friday)' },
      { key: 'monthly',  label: `Monthly on the ${getOrdinal(dom)}` },
      { key: 'yearly',   label: `Yearly on ${monthDay}` }
    ];
  }, [date]);

  const recurrenceLabel = useMemo(() => {
    const found = recurrenceOptions.find(o => o.key === recurrence);
    return found ? found.label : 'Does not repeat';
  }, [recurrence, recurrenceOptions]);

  // Dynamic Validation tracking
  const remainingFields = useMemo(() => {
    let missing = 0;
    if (!title.trim()) missing++;
    if (!date) missing++;
    if (!startTime || !endTime || parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) missing++;
    if (attendees.length === 0) missing++;
    return missing;
  }, [title, date, startTime, endTime, attendees]);

  const isFormValid = remainingFields === 0;
  
  // Pulse animation state
  const [prevFormValid, setPrevFormValid] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (isFormValid && !prevFormValid) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 300);
    }
    setPrevFormValid(isFormValid);
  }, [isFormValid, prevFormValid]);

  const previewBlock = useMemo(() => {
    if (!startTime || !endTime || !date) return null;
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    const duration = endMin - startMin;
    if (duration <= 0) return null;
    
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const dayMeetings = meetings.filter(m => m.date === dateStr && String(m.id) !== String(editId));
    
    const conflict = dayMeetings.find(m => {
      const mStart = parseTimeToMinutes(m.time);
      const mDuration = m.duration_minutes || 60;
      const mEnd = mStart + mDuration;
      return (startMin < mEnd && endMin > mStart);
    });

    return {
      top: (startMin - 7 * 60),
      height: duration,
      hasConflict: !!conflict,
      conflictTitle: conflict?.title
    };
  }, [startTime, endTime, date, meetings]);

  const handleTimelineClick = (e) => {
    // Find the relative Y coordinate of the click within the timeline-canvas
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    
    // 1 hour = 60px -> 1 minute = 1px!
    const clickedMinsFrom7AM = Math.max(0, y);
    const clickedTotalMins = clickedMinsFrom7AM + 7 * 60; // 7:00 AM starts at 420 mins
    
    // Snap to the nearest 15-minute slot (0, 15, 30, 45)
    const snappedMins = Math.floor(clickedTotalMins / 15) * 15;
    
    // Limit starting time to 11:45 PM
    const finalStartMins = Math.min(snappedMins, 23 * 60 + 45);
    
    const startH = Math.floor(finalStartMins / 60);
    const startM = finalStartMins % 60;
    const newStartTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    
    // Fetch currently selected event type's duration or fallback to current form duration or 60 mins
    const activeType = customEventTypes.find(t => t.label === eventType);
    let duration = 60;
    if (activeType) {
      duration = activeType.duration;
    } else {
      const currentStart = parseTimeToMinutes(startTime);
      const currentEnd = parseTimeToMinutes(endTime);
      duration = (currentEnd > currentStart) ? (currentEnd - currentStart) : 60;
    }
    
    const finalEndMins = Math.min(finalStartMins + duration, 24 * 60);
    const endH = Math.floor(finalEndMins / 60);
    const endM = finalEndMins % 60;
    const newEndTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    
    setStartTime(newStartTimeStr);
    setEndTime(newEndTimeStr);
  };

  const PLATFORM_NAMES = { meet: 'Google Meet', teams: 'Microsoft Teams', zoom: 'Zoom' };

  const handleConnectPlatform = (e, platformId) => {
    e.stopPropagation();
    const name = PLATFORM_NAMES[platformId] || platformId;
    const toastId = toast.loading(`Connecting to ${name}...`);
    setTimeout(() => {
      setConnectedPlatforms(prev => {
        const next = { ...prev, [platformId]: true };
        localStorage.setItem('caldim_connected_platforms', JSON.stringify(next));
        return next;
      });
      toast.success(`${name} connected!`, { id: toastId });
    }, 1200);
  };

  const handleDisconnectPlatform = (e, platformId) => {
    e.stopPropagation();
    const name = PLATFORM_NAMES[platformId] || platformId;
    setConnectedPlatforms(prev => {
      const next = { ...prev, [platformId]: false };
      localStorage.setItem('caldim_connected_platforms', JSON.stringify(next));
      return next;
    });
    toast.success(`${name} disconnected.`);
  };

  const handleCheckAvailability = () => {
    if (attendees.length === 0) {
      toast.error('Add participants to check availability');
      return;
    }
    setIsCheckingAvailability(true);
    setAvailabilityResults(null);
    
    setTimeout(() => {
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      
      const dayMeetings = meetings.filter(m => m.date === dateStr && String(m.id) !== String(editId));
      const hasConflict = dayMeetings.some(m => {
        const mStart = parseTimeToMinutes(m.time);
        const mDuration = m.duration_minutes || 60;
        const mEnd = mStart + mDuration;
        return (startMin < mEnd && endMin > mStart);
      });

      const results = attendees.map((email, i) => ({
        email,
        initials: email.substring(0, 2).toUpperCase(),
        status: (hasConflict && i < 2) ? 'busy' : 'free'
      }));
      
      setAvailabilityResults(results);
      setIsCheckingAvailability(false);
      
      if (hasConflict) toast.error('Conflicts found on schedule');
      else toast.success('Everyone is available!');
    }, 600);
  };

  const handleSaveCustomType = () => {
    if (!customInput.trim()) return;
    const newType = { label: customInput.trim(), duration: Number(customDuration) };
    const updated = [...customEventTypes, newType];
    setCustomEventTypes(updated);
    setEventType(newType.label);
    
    const startMin = parseTimeToMinutes(startTime);
    const endMin = startMin + newType.duration;
    setEndTime(`${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`);
    
    setCustomInput('');
    setShowCustomInput(false);
  };
  const handlePublish = async () => {
    if (!isFormValid || isPublishing) return;

    setIsPublishing(true);
    const loadingToast = toast.loading(isEditMode ? 'Saving Changes...' : 'Sending Invites...');
    try {
      const payload = {
        title, date, time: startTime,
        duration_minutes: parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime),
        platform, attendees, agenda_text: agenda.join('\n'),
        timezone, project_id: projectId || null,
        reminder_minutes: reminder, description, color: eventColor,
        recurrence
      };
      
      let response;
      if (isEditMode) {
        payload.duration = payload.duration_minutes;
        delete payload.duration_minutes;
        response = await API.patch(`/meetings/${editId}`, payload);
      } else {
        response = await API.post('/meetings/publish', payload);
      }
      
      if (response.data?.success) {
        toast.success(isEditMode ? 'Event edited successfully' : 'Meeting scheduled successfully', { id: loadingToast });
        setTimeout(() => {
          if (isEditMode) {
             navigate('/dashboard/calendar');
          } else {
             navigate(`/dashboard/meeting/${response.data.meeting.id}`);
          }
        }, 1500);
      } else {
        throw new Error(response.data?.error || 'Failed to publish');
      }
    } catch (err) {
      toast.error('Failed to schedule meeting: ' + err.message, { id: loadingToast });
      setIsPublishing(false);
    }
  };

  // Popover state triggers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [is24Hour, setIs24Hour] = useState(false);

  // Mouse resizing events
  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newW = (e.clientX / window.innerWidth) * 100;
      if (newW >= 40 && newW <= 80) setColumnWidth(newW);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Mini-Month Matrix Logic for Sidebar
  const miniMonthDays = useMemo(() => {
    const currentView = dayjs(viewDate);
    const startOfMonth = currentView.startOf('month');
    const daysInMonth = currentView.daysInMonth();
    const emptyDays = startOfMonth.day();
    
    const prevPadding = Array.from({ length: emptyDays }, (_, i) => i);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => startOfMonth.add(i, 'day'));
    
    // Fill remaining to ensure clean matrix row structure
    const totalSlots = Math.ceil((emptyDays + daysInMonth) / 7) * 7;
    const nextPadding = Array.from({ length: totalSlots - (emptyDays + daysInMonth) }, (_, i) => i);
    
    return { currentView, prevPadding, monthDays, nextPadding };
  }, [viewDate]);

  const TimePicker = ({ value, onSelect, onClose }) => {
    const [h, m] = value.split(':').map(Number);
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';

    const handleSelect = (newH, newM, newAmpm) => {
      let finalH = newH;
      if (newAmpm === 'PM' && finalH !== 12) finalH += 12;
      if (newAmpm === 'AM' && finalH === 12) finalH = 0;
      onSelect(`${String(finalH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    };

    return (
      <motion.div 
        layout initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
        className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[200] p-3 flex gap-3 w-[220px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hr</div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(hr => (
            <button 
              key={hr} 
              className={`w-full text-left px-2 py-1 rounded text-[12px] font-medium transition-colors ${hour12 === hr ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
              onClick={() => handleSelect(hr, m, ampm)}
            >
              {hr}
            </button>
          ))}
        </div>
        <div className="flex-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Min</div>
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(min => (
            <button 
              key={min} 
              className={`w-full text-left px-2 py-1 rounded text-[12px] font-medium transition-colors ${m === min ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
              onClick={() => handleSelect(hour12, min, ampm)}
            >
              {String(min).padStart(2, '0')}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 justify-center border-l pl-2 border-gray-100">
          {['AM', 'PM'].map(a => (
            <button 
              key={a} 
              className={`px-2 py-1.5 rounded font-bold text-[10px] transition-all ${ampm === a ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              onClick={() => handleSelect(hour12, m, a)}
            >
              {a}
            </button>
          ))}
        </div>
      </motion.div>
    );
  };

  if (loadingMeetings) {
    return (
      <div className="schedule-premium-page">
        <div className="schedule-content">
          {/* Left Column Form Skeleton */}
          <section className="column-left" style={{ flex: '0 0 62%', padding: '24px', minHeight: 'calc(100vh - 100px)' }}>
            <div className="top-action-strip flex items-center mb-4">
              <Skeleton className="h-5 w-48 rounded" />
            </div>
            
            {/* Title Input Placeholder */}
            <div className="title-section-container mb-6">
              <Skeleton className="h-12 w-3/4 rounded-lg" />
            </div>

            {/* Event Types Pill Placeholder */}
            <div className="form-section space-y-3 mb-6">
              <Skeleton className="h-4 w-12" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </div>

            {/* Project Select Placeholder */}
            <div className="form-section space-y-3 mb-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Grid for Date, Time, Duration */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Description Textarea Placeholder */}
            <div className="form-section space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </section>

          {/* Resizer handle placeholder */}
          <div className="resizer-handle" style={{ cursor: 'default' }}>
            <div className="resizer-line" />
          </div>

          {/* Right Column Timeline/Mini-Month Skeleton */}
          <section className="column-right" style={{ flex: '0 0 38%', padding: '24px' }}>
            <div className="sidebar-calendar-container space-y-6">
              <div className="flex flex-col gap-3">
                <div className="mini-month-header flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
                {/* Compact Month Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-6 w-6 rounded-full mx-auto" />
                  ))}
                </div>
              </div>

              {/* Timeline Placeholder */}
              <div className="timeline-section space-y-3 pt-6 border-t border-gray-100">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-premium-page" onClick={() => { setShowDatePicker(false); setShowStartTimePicker(false); setShowEndTimePicker(false); }}>
      <main className="schedule-content">
        
        <section className="column-left" style={{ flex: `0 0 ${columnWidth}%` }}>
          
          {/* Top Permanent Action Bar — Sleek, fixed inline at the document root to avoid scroll clipping */}
          <div className="top-action-strip">
            <div className="validation-hint-inline">
              {remainingFields > 0 ? (
                <>
                  <Info size={13} className="text-red-500 flex-shrink-0" />
                  <span>Complete required fields to save ({remainingFields} left)</span>
                </>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check size={13} /> Form Ready
                </span>
              )}
            </div>
            {/* Buttons moved to the bottom */}
          </div>
          
          {/* Section: Meeting Title Container flowing natively inside the scroll layout */}
          <div className="title-section-container">
            <input 
              type="text" 
              className="title-input-premium" 
              placeholder="Meeting title *" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              autoFocus
            />
          </div>

          {/* Section: Dynamic Custom Saved Type Selection (Deleted Prebuilt Model) */}
          <div className="form-section">
            <label className="form-label">Type *</label>
            <div className="pill-group">
              {customEventTypes.map((type) => (
                <div key={type.label} className="relative group">
                  <button 
                    className={`pill-item ${eventType === type.label ? 'selected' : ''}`}
                    onClick={() => {
                      setEventType(type.label);
                      setShowCustomInput(false);
                      const startMin = parseTimeToMinutes(startTime);
                      const endMin = startMin + type.duration;
                      setEndTime(`${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`);
                    }}
                  >
                    {type.label} ({type.duration}m)
                  </button>
                  <button 
                    className="absolute -top-1 -right-1 bg-white border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = customEventTypes.filter(t => t.label !== type.label);
                      setCustomEventTypes(filtered);
                      if (eventType === type.label) {
                        setEventType(filtered[0]?.label || '');
                      }
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              
              <div className={`pill-item-expanding ${showCustomInput ? 'expanded' : ''}`}>
                {!showCustomInput ? (
                  <button className="flex items-center gap-1.5 h-full px-3 text-[13px] font-medium text-gray-500 hover:text-gray-900 border-none bg-transparent cursor-pointer w-full" onClick={() => setShowCustomInput(true)}>
                    <Plus size={13} /> {customEventTypes.length === 0 ? "Add custom type" : "Custom"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 h-full pl-3 pr-1">
                    <input 
                      type="text" 
                      className="bg-transparent border-none outline-none text-[12px] flex-1 font-medium text-gray-900"
                      placeholder="Type name..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustomType();
                        if (e.key === 'Escape') setShowCustomInput(false);
                      }}
                    />
                    <select 
                      className="bg-transparent border-none outline-none text-[11px] font-bold text-blue-600 cursor-pointer pr-1"
                      value={customDuration ?? 30}
                      onChange={(e) => setCustomDuration(Number(e.target.value))}
                    >
                      {[15, 30, 45, 60, 90, 120].map(m => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                    <button className="p-1 hover:bg-blue-600 hover:text-white rounded-full transition-colors border-none bg-transparent text-blue-600 cursor-pointer" onClick={handleSaveCustomType}>
                      <Check size={12} />
                    </button>
                    <button className="p-1 hover:bg-red-50 text-red-400 rounded-full transition-colors border-none bg-transparent cursor-pointer" onClick={() => setShowCustomInput(false)}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Pristine Line-Free Date & Time Card */}
          <div className="form-section">
            <label className="form-label">Date & Time *</label>
            <div className="hairline-card">
              <div className="datetime-inner-layout">
                <div className="date-trigger-row" onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}>
                  <Calendar size={16} className="text-blue-600" />
                  <span className="date-label-text">{dayjs(date).format('dddd, MMMM D, YYYY')}</span>
                  <AnimatePresence>
                    {showDatePicker && (
                      <DatePopover 
                        selectedDate={date} 
                        onSelect={(d) => setDate(d)} 
                        onClose={() => setShowDatePicker(false)} 
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="time-trigger-strip">
                  <div className="relative" onClick={(e) => { e.stopPropagation(); setShowStartTimePicker(!showStartTimePicker); setShowEndTimePicker(false); }}>
                    <div className="time-input-pill">
                      <Clock size={13} className="text-blue-600" />
                      <span>{dayjs(`2000-01-01 ${startTime}`).format(is24Hour ? 'HH:mm' : 'h:mm A')}</span>
                    </div>
                    <AnimatePresence>
                      {showStartTimePicker && <TimePicker value={startTime} onSelect={(t) => { setStartTime(t); setShowStartTimePicker(false); }} onClose={() => setShowStartTimePicker(false)} />}
                    </AnimatePresence>
                  </div>

                  <span className="text-[12px] font-bold text-gray-300">to</span>

                  <div className="relative" onClick={(e) => { e.stopPropagation(); setShowEndTimePicker(!showEndTimePicker); setShowStartTimePicker(false); }}>
                    <div className="time-input-pill">
                      <Clock size={13} className="text-blue-600" />
                      <span>{dayjs(`2000-01-01 ${endTime}`).format(is24Hour ? 'HH:mm' : 'h:mm A')}</span>
                    </div>
                    <AnimatePresence>
                      {showEndTimePicker && <TimePicker value={endTime} onSelect={(t) => { setEndTime(t); setShowEndTimePicker(false); }} onClose={() => setShowEndTimePicker(false)} />}
                    </AnimatePresence>
                  </div>

                  {durationText && <span className="duration-tag">{durationText}</span>}

                  <div className="timezone-selector-inline" onClick={() => setIs24Hour(!is24Hour)}>
                    <Globe size={13} />
                    <span>{timezone.split('/').pop().replace('_', ' ')} ({is24Hour ? '24h' : '12h'})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <Repeat size={13} className="text-blue-600" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer select-none"
                      >
                        {recurrenceLabel}
                        <ChevronDown size={12} className="opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50">
                      {recurrenceOptions.map(opt => (
                        <DropdownMenuItem
                          key={opt.key}
                          onClick={() => setRecurrence(opt.key)}
                          className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 rounded transition-colors cursor-pointer outline-none text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Integrated Participants Card */}
          <div className="form-section">
            <label className="form-label">Participants *</label>
            <div className="hairline-card">
              <div className="participants-inner-layout">
                {attendees.length > 0 && (
                  <div className="attendees-chips-flow">
                    {attendees.map(email => {
                      const color = getAvatarColor(email);
                      return (
                        <div key={email} className="attendee-chip-sleek">
                          <div className="attendee-mini-avatar" style={{ backgroundColor: `${color}15`, color }}>
                            {email.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{email}</span>
                          <button className="border-none bg-transparent p-0.5 text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => setAttendees(attendees.filter(a => a !== email))}>
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <input 
                  type="text" 
                  className="attendee-inline-input" 
                  placeholder={attendees.length === 0 ? "Add participants by email..." : "Add another participant..."} 
                  value={attendeeInput} 
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && attendeeInput.trim() && !attendees.includes(attendeeInput.trim())) {
                      setAttendees([...attendees, attendeeInput.trim()]);
                      setAttendeeInput('');
                    }
                  }}
                />

                <div className="participants-footer-strip">
                  <button 
                    className="btn-check-availability-sleek" 
                    onClick={handleCheckAvailability} 
                    disabled={isCheckingAvailability}
                  >
                    {isCheckingAvailability ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                    <span>Check Availability</span>
                  </button>

                  {availabilityResults && (
                    <div className="flex items-center gap-3 text-[11px] font-semibold bg-gray-50 px-2.5 py-1 rounded-full">
                      <span className="text-emerald-600">● {availabilityResults.filter(r => r.status === 'free').length} Free</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-red-500">● {availabilityResults.filter(r => r.status === 'busy').length} Busy</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Video Call Platform Options */}
          <div className="form-section">
            <label className="form-label">Video Call *</label>
            <div className="platforms-grid">
              {PLATFORMS.map(p => {
                const isSelected = platform === p.id;
                const isConnected = !!connectedPlatforms[p.id];
                return (
                  <div 
                    key={p.id} 
                    className={`hairline-card cursor-pointer p-4 ${isSelected ? 'active-surface' : ''}`}
                    onClick={async () => {
                      if (!connectedPlatforms[p.id]) {
                        const ok = await confirm({
                          title: 'Connection Required',
                          description: `To use ${p.name} for video calling, you must link your workspace account first. Would you like to connect now?`,
                          confirmText: 'Connect Now',
                          cancelText: 'Maybe Later',
                          variant: 'primary'
                        });
                        
                        if (ok) {
                          const toastId = toast.loading(`Connecting to ${p.name}...`);
                          setTimeout(() => {
                            setConnectedPlatforms(prev => {
                              const next = { ...prev, [p.id]: true };
                              localStorage.setItem('caldim_connected_platforms', JSON.stringify(next));
                              return next;
                            });
                            toast.success(`${p.name} connected!`, { id: toastId });
                            setPlatform(p.id);
                          }, 1200);
                        }
                      } else {
                        setPlatform(p.id);
                      }
                    }}
                  >
                    <div className="platform-card-inner">
                      <div className="platform-card-header">
                        {p.icon}
                        <span className="text-[13px] font-semibold">{p.name}</span>
                      </div>
                      <div className="platform-status-strip">
                        <div className={`status-dot-mini ${isConnected ? 'connected' : 'disconnected'}`} />
                        {isConnected ? (
                          <span className="text-gray-400 text-[11px] font-medium">
                            <span className="text-emerald-600 font-semibold mr-1">Connected</span>
                            · <span className="hover:text-red-500 cursor-pointer font-bold hover:underline ml-1" onClick={(e) => handleDisconnectPlatform(e, p.id)}>Disconnect</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-medium">
                            Not connected · <span className="text-blue-500 font-bold hover:underline cursor-pointer ml-1" onClick={(e) => handleConnectPlatform(e, p.id)}>Connect</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Progressive Details Toggle — Encapsulated in Hairline Cards to match Look */}
          <div className="form-section">
            <Collapsible
              open={isMoreOptionsOpen}
              onOpenChange={setIsMoreOptionsOpen}
            >
              <CollapsibleTrigger asChild>
                <button 
                  className={`btn-more-settings-sleek mb-4 ${isMoreOptionsOpen ? 'active' : ''}`}
                >
                  <Settings size={14} className={isMoreOptionsOpen ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
                  <span>{isMoreOptionsOpen ? 'Less settings' : 'More settings'}</span>
                  {isMoreOptionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="overflow-hidden mt-2 space-y-4">

                  {/* Card 1: Reminder & Linked Workspace Project */}
                  <div className="hairline-card">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Reminder</label>
                        <select className="ui-select-premium" value={reminder ?? 15} onChange={(e) => setReminder(Number(e.target.value))}>
                          <option value={0}>At event start</option>
                          <option value={5}>5 minutes before</option>
                          <option value={15}>15 minutes before</option>
                          <option value={30}>30 minutes before</option>
                          <option value={60}>1 hour before</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Link Workspace Project</label>
                        <select className="ui-select-premium" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value)}>
                          <option value="">No project linked</option>
                          {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Event Color Accent Selector */}
                  <div className="hairline-card">
                    <label className="form-label">Event Color Accent</label>
                    <div className="color-grid-labeled">
                      {EVENT_COLORS.map(c => (
                        <div key={c.hex} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setEventColor(c.hex)}>
                          <div className={`color-dot-wrapper ${eventColor === c.hex ? 'selected' : ''}`} style={{ color: c.hex }}>
                            <div className="color-selection-ring" />
                            <div className="color-dot" style={{ backgroundColor: c.hex }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Meeting Agenda / Description */}
                  <div className="hairline-card">
                    <label className="form-label">Meeting Agenda / Description</label>
                    <Textarea 
                      className="textarea-sleek" 
                      placeholder="Add meeting agenda outlines or helpful preparation guidelines..." 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                    />
                  </div>

              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Bottom Action Bar */}
          <div className="bottom-action-strip mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3 pb-8 px-4">
            <button className="btn-cancel-link" onClick={() => navigate(-1)}>Cancel</button>
            <button 
              className={`btn-send-invites ${isPulsing ? 'pulse-animation' : ''}`} 
              disabled={!isFormValid || isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? 'Saving...' : 'Save'}
            </button>
          </div>
        </section>

        {/* Resizer Divider */}
        <div className="resizer-handle" onMouseDown={startResizing}>
          <div className="resizer-line" />
        </div>

        {/* Right Column — Synchronized Live Scheduling Aid Sidebar */}
        <section className="column-right" style={{ flex: `0 0 ${100 - columnWidth}%` }}>
          
          <div className="sidebar-calendar-container">
            
            {/* Upper Right: Gorgeous Zoho Compact Mini-Month Matrix */}
            <div className="flex flex-col gap-3">
              <div className="mini-month-header">
                <span className="mini-month-title">{miniMonthDays.currentView.format('MMMM YYYY')}</span>
                <div className="mini-month-nav">
                  <button className="btn-mini-nav" onClick={() => setViewDate(miniMonthDays.currentView.subtract(1, 'month').toDate())}><ChevronLeft size={14} /></button>
                  <button className="btn-mini-nav" onClick={() => setViewDate(miniMonthDays.currentView.add(1, 'month').toDate())}><ChevronRight size={14} /></button>
                </div>
              </div>

              <div className="mini-month-matrix">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <span key={idx} className="mini-day-label">{d}</span>
                ))}
                {miniMonthDays.prevPadding.map(p => <div key={`prev-${p}`} className="mini-day-cell empty" />)}
                {miniMonthDays.monthDays.map(d => {
                  const dateStr = d.format('YYYY-MM-DD');
                  const isSelected = dateStr === dayjs(date).format('YYYY-MM-DD');
                  const isToday = dateStr === dayjs().format('YYYY-MM-DD');
                  return (
                    <div 
                      key={dateStr}
                      className={`mini-day-cell ${isSelected ? 'selected' : isToday ? 'today' : ''}`}
                      onClick={() => setDate(dateStr)}
                    >
                      {d.date()}
                    </div>
                  );
                })}
                {miniMonthDays.nextPadding.map(p => <div key={`next-${p}`} className="mini-day-cell empty" />)}
              </div>
            </div>



            {/* Lower Right: Synchronous Pure Line-Free Daily Timeline */}
            <div className="flex flex-col flex-1 min-h-0 mt-2">
              <div className="timeline-header-strip">
                <span className="selected-day-display">{dayjs(date).format('dddd, MMM D')}</span>
                <button 
                  className="border-none bg-transparent text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer p-0" 
                  onClick={() => setDate(dayjs().format('YYYY-MM-DD'))}
                >
                  Jump to Today
                </button>
              </div>

              <div 
                className="timeline-canvas custom-scrollbar" 
                ref={rightGridRef}
                onClick={handleTimelineClick}
              >
                {Array.from({ length: 15 }, (_, i) => i + 7).map(hour => (
                  <div key={hour} className="timeline-hour-row">
                    <span className="timeline-hour-label">{to12Hour(hour)}</span>
                    <div className="timeline-hour-track" />
                  </div>
                ))}

                {meetings.filter(m => m.date === dayjs(date).format('YYYY-MM-DD') && String(m.id) !== String(editId)).map(m => {
                  const mStart = parseTimeToMinutes(m.time);
                  const mDuration = m.duration_minutes || 60;
                  const cardColor = m.color || '#2563eb';
                  return (
                    <div 
                      key={m.id} 
                      className="timeline-event-floating"
                      style={{ 
                        top: (mStart - 7 * 60), 
                        height: mDuration,
                        borderLeftColor: cardColor,
                        backgroundColor: `${cardColor}1A`, // 10% opacity matching calendar grid
                        color: cardColor
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="event-title truncate" style={{ color: cardColor }}>{m.title}</span>
                      {mDuration >= 30 && (
                        <span className="event-time" style={{ color: cardColor, opacity: 0.75 }}>{m.time}</span>
                      )}
                    </div>
                  );
                })}

                {previewBlock && (
                  <div 
                    className="timeline-event-floating live-preview"
                    style={{ 
                      top: previewBlock.top, 
                      height: previewBlock.height,
                      borderLeftColor: previewBlock.hasConflict ? '#f59e0b' : eventColor,
                      backgroundColor: previewBlock.hasConflict ? '#fffbeb' : `${eventColor}1A`,
                      color: previewBlock.hasConflict ? '#b45309' : eventColor
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="event-title truncate" style={{ color: previewBlock.hasConflict ? '#b45309' : eventColor }}>
                        {title || 'Your new meeting'}
                      </span>
                      {previewBlock.hasConflict ? <AlertCircle size={11} className="text-amber-600 flex-shrink-0 ml-1" /> : <Check size={11} className="flex-shrink-0 ml-1" style={{ color: eventColor }} />}
                    </div>
                    <span className="event-time" style={{ opacity: 0.75 }}>
                      {previewBlock.hasConflict ? `⚠ Conflict detected` : `✓ Live scheduling space`}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>



        </section>
      </main>
      </div>

  );
};

export default ScheduleMeetingPremiumPage;
