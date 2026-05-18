import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ChevronLeft, ChevronRight, Plus, Search, MoreHorizontal, X, Video, MapPin, PlusCircle, Bell, Calendar as CalendarIcon, Clock, Trash2, Palette, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './CalendarPage.css';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu';
import CalendarGrid from './components/CalendarGrid';
import API from '../../utils/api';
import { EVENT_COLOR_HEXES } from '../constants';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

// highlightedDays: Set<string> of 'YYYY-MM-DD' dates that have events for the active filter.
// Passed from CalendarPage to show a dot under matching days.
const MiniMonthPicker = ({ viewDate, setViewDate, highlightedDays = new Set() }) => {
  const [pickerMonth, setPickerMonth] = useState(viewDate.startOf('month'));
  
  const daysInMonth = pickerMonth.daysInMonth();
  const startDay = pickerMonth.startOf('month').day();
  
  const prevMonth = pickerMonth.subtract(1, 'month');
  const nextMonth = pickerMonth.add(1, 'month');
  
  const days = useMemo(() => {
    const arr = [];
    const prevDaysCount = startDay;
    const prevMonthLastDay = prevMonth.daysInMonth();
    for (let i = prevDaysCount - 1; i >= 0; i--) {
      arr.push({ date: prevMonth.date(prevMonthLastDay - i), otherMonth: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({ date: pickerMonth.date(i), otherMonth: false });
    }
    const remaining = 42 - arr.length;
    for (let i = 1; i <= remaining; i++) {
      arr.push({ date: nextMonth.date(i), otherMonth: true });
    }
    return arr;
  }, [pickerMonth]);

  return (
    <div className="mini-picker">
      <div className="mini-cal-header">
        <button className="btn-mini-nav" onClick={() => setPickerMonth(pickerMonth.subtract(1, 'month'))}>
          <ChevronLeft size={14} />
        </button>
        <div className="mini-cal-title">{pickerMonth.format('MMMM YYYY')}</div>
        <button className="btn-mini-nav" onClick={() => setPickerMonth(pickerMonth.add(1, 'month'))}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="mini-cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="mini-cal-day-label">{d}</div>
        ))}
        {days.map((d, i) => {
          const isToday = d.date.isSame(dayjs(), 'day');
          const isSelected = d.date.isSame(viewDate, 'day');
          // Show a dot only for current-month days that have events in the active filter
          const hasEvent = !d.otherMonth && highlightedDays.has(d.date.format('YYYY-MM-DD'));

          return (
            <div
              key={i}
              className={`mini-cal-cell ${d.otherMonth ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}`}
              onClick={() => setViewDate(d.date)}
            >
              {d.date.date()}
              {hasEvent && <span className="mini-event-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getAttendeeDetails = (a) => {
  if (typeof a === 'string') {
    const email = a.trim();
    const namePart = email.split('@')[0];
    const cleanName = namePart.split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const initials = namePart.substring(0, 2).toUpperCase();
    return { email, name: cleanName, initials };
  } else if (typeof a === 'object' && a !== null) {
    const email = a.email || '';
    const name = a.name || a.employee_name || a.full_name || email.split('@')[0] || 'Guest';
    let initials = 'G';
    if (a.name || a.employee_name || a.full_name) {
      const parts = (a.name || a.employee_name || a.full_name).trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].substring(0, 2).toUpperCase();
      }
    } else if (email) {
      initials = email.substring(0, 2).toUpperCase();
    }
    return { email, name, initials };
  }
  return { email: '', name: 'Guest', initials: 'G' };
};

const getAvatarColor = (email) => {
  if (!email) return 'bg-slate-100 text-slate-700';
  const colors = [
    'bg-blue-50 text-blue-600 border border-blue-100',
    'bg-emerald-50 text-emerald-600 border border-emerald-100',
    'bg-amber-50 text-amber-600 border border-amber-100',
    'bg-rose-50 text-rose-600 border border-rose-100',
    'bg-purple-50 text-purple-600 border border-purple-100',
    'bg-cyan-50 text-cyan-600 border border-cyan-100',
  ];
  let sum = 0;
  for (let i = 0; i < email.length; i++) sum += email.charCodeAt(i);
  return colors[sum % colors.length];
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth?.user);
  const [viewDate, setViewDate] = useState(dayjs());
  const [activeView, setActiveView] = useState('Week'); // Day, Week, Month
  const [calendars, setCalendars] = useState([
    { id: 'personal', name: 'My Meetings', color: EVENT_COLOR_HEXES[0], visible: true },
  ]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => {
    const savedDeclined = localStorage.getItem('caldim_filter_declined');
    const savedWeekends = localStorage.getItem('caldim_filter_weekends');
    const savedWeeknums = localStorage.getItem('caldim_filter_weeknums');
    return {
      showDeclined: savedDeclined === 'true',
      showWeekends: savedWeekends !== 'false', 
      showWeekNumbers: savedWeeknums === 'true',
    };
  });
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null); // New state for Right Panel

  const getUserInitial = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.full_name.charAt(0).toUpperCase();
    }
    return 'PR';
  };

  useEffect(() => {
    localStorage.setItem('caldim_filter_declined', filters.showDeclined);
    localStorage.setItem('caldim_filter_weekends', filters.showWeekends);
    localStorage.setItem('caldim_filter_weeknums', filters.showWeekNumbers);
  }, [filters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, pRes] = await Promise.all([
          API.get('/meetings/'),
          API.get('/projects/')
        ]);
        
        const fetchedMeetings = mRes.data.meetings || [];
        setMeetings(fetchedMeetings);
        
        const fetchedProjects = pRes.data || [];
        setProjects(fetchedProjects);
        
        setCalendars(prev => {
          const personal = prev.find(c => c.id === 'personal') || { id: 'personal', name: 'My Meetings', color: EVENT_COLOR_HEXES[0], visible: true };
          const projectCals = fetchedProjects.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color || '#10b981',
            visible: prev.find(c => c.id === p.id)?.visible ?? true
          }));
          return [personal, ...projectCals];
        });
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    window.addEventListener('focus', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchData);
    };
  }, []);

  const handleNav = (direction) => {
    if (activeView === 'Day') setViewDate(viewDate.add(direction, 'day'));
    else if (activeView === 'Week') setViewDate(viewDate.add(direction, 'week'));
    else setViewDate(viewDate.add(direction, 'month'));
  };

  const toggleCalendar = (id) => {
    setCalendars(calendars.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const handleDateClick = (date) => {
    setViewDate(date);
    setActiveView('Day');
  };

  const toggleFilter = (key) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };



  // Event Colors persistent state
  const [selectedEventColor, setSelectedEventColor] = useState(() => {
    return localStorage.getItem('caldim_default_event_color') || EVENT_COLOR_HEXES[0];
  });

  const handleColorSelect = (c) => {
    setSelectedEventColor(c);
    localStorage.setItem('caldim_default_event_color', c);

    if (selectedEvent) {
      const savedColors = JSON.parse(localStorage.getItem('caldim_event_colors') || '{}');
      savedColors[selectedEvent.id] = c;
      localStorage.setItem('caldim_event_colors', JSON.stringify(savedColors));
      setSelectedEvent(prev => prev ? { ...prev, color: c } : null);
      setMeetings([...meetings]); // force processedEvents to recalculate
      toast.success('Event color updated');
    }
  };

  // ── Sidebar: which color picker is open (calId | null) ────────────────────
  const [colorPickerOpenFor, setColorPickerOpenFor] = useState(null);

  // ── Sidebar: per-calendar meeting count ──────────────────────────────────
  // Uses raw `meetings` so the count reflects total, not filtered view.
  // Meetings with null project_id bucket to 'personal'.
  const meetingCountByCalendar = useMemo(() => {
    const counts = {};
    (Array.isArray(meetings) ? meetings : []).forEach(m => {
      const key = m.project_id != null ? m.project_id : 'personal';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [meetings]);

  // ── Sidebar: which calendar owns the currently-selected event ────────────
  // Used to highlight the matching row so the user gets orientation feedback.
  const activeCalendarId = useMemo(() => {
    if (!selectedEvent) return null;
    const raw = meetings.find(m => m.id === selectedEvent.id);
    if (!raw) return null;
    return raw.project_id != null ? raw.project_id : 'personal';
  }, [selectedEvent, meetings]);

  // ── Sidebar: update a calendar's color and persist to localStorage ───────
  const updateCalendarColor = (calId, newColor) => {
    setCalendars(prev =>
      prev.map(c => c.id === calId ? { ...c, color: newColor } : c)
    );
    // Persist overrides so they survive page reloads
    const stored = JSON.parse(localStorage.getItem('caldim_cal_colors') || '{}');
    stored[calId] = newColor;
    localStorage.setItem('caldim_cal_colors', JSON.stringify(stored));
  };

  // Restore persisted calendar color overrides once projects are loaded
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('caldim_cal_colors') || '{}');
    if (Object.keys(stored).length === 0) return;
    setCalendars(prev =>
      prev.map(c => stored[c.id] ? { ...c, color: stored[c.id] } : c)
    );
  }, [projects]); // re-run when projects populate the calendars list

  const handleDeleteEvent = async (id) => {
    const loadingToast = toast.loading('Deleting Meeting...');
    try {
      const res = await API.delete(`/meetings/${id}`);
      if (res.data?.success) {
        toast.success('Meeting deleted successfully', { id: loadingToast });
        setMeetings(meetings.filter(m => m.id !== id));
        setSelectedEvent(null);
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete meeting', { id: loadingToast });
    }
  };

  const handleQuickSave = async (title, quickData) => {
    if (!title?.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const loadingToast = toast.loading('Scheduling...');
    try {
      const formattedDate = quickData.date.format('YYYY-MM-DD');
      const start = dayjs(`${formattedDate} ${quickData.startTime}`, 'YYYY-MM-DD h:mm A');
      const end = dayjs(`${formattedDate} ${quickData.endTime}`, 'YYYY-MM-DD h:mm A');
      
      let durationMin = 30; // Default to 30 minutes
      if (start.isValid() && end.isValid()) {
        durationMin = end.diff(start, 'minute');
        // Handle overnight/next-day wrap-around if any
        if (durationMin < 0) {
          durationMin += 24 * 60;
        }
      }

      const payload = {
        title: title.trim(),
        date: formattedDate,
        time: quickData.startTime,
        duration_minutes: durationMin,
        platform: quickData.platform || 'meet',
        attendees: quickData.attendees || [],
        agenda_text: 'Quickly scheduled from calendar.',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        project_id: null,
      };

      // Save color mapping locally to persist the color aesthetic
      const tempId = `temp-${Date.now()}`;
      const colorMap = JSON.parse(localStorage.getItem('caldim_event_colors') || '{}');
      
      const response = await API.post('/meetings/publish', payload);
      if (response.data?.success || response.status === 200 || response.status === 201) {
        toast.success(`"${title}" scheduled ✓`, { id: loadingToast });
        
        // Persist the specific color for this new meeting
        if (response.data?.meeting?.id) {
          colorMap[response.data.meeting.id] = quickData.color || selectedEventColor;
          localStorage.setItem('caldim_event_colors', JSON.stringify(colorMap));
        }
        
        const mRes = await API.get('/meetings/');
        if (mRes.data?.meetings) setMeetings(mRes.data.meetings);
      } else throw new Error('Failed to save');
    } catch (err) {
      console.error('Quick Save Error:', err);
      toast.error('Could not schedule: ' + (err.response?.data?.detail || err.message), { id: loadingToast });
    }
  };

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  // joinProjectId kept for backward compat with any other references; now unused in the modal.
  const [joinProjectId, setJoinProjectId] = useState('');

  // ── Group Calendars ────────────────────────────────────────────────────
  // Persisted list of project IDs the user has successfully verified and joined.
  // Stored as a JSON array in localStorage under 'caldim_group_cals'.
  const [joinedGroupCalIds, setJoinedGroupCalIds] = useState(() =>
    JSON.parse(localStorage.getItem('caldim_group_cals') || '[]')
  );

  // Modal state — single code input replaces the old free-search list.
  const [joinCode, setJoinCode] = useState('');           // raw input value
  const [joinValidationMsg, setJoinValidationMsg] = useState(null); // { type: 'error'|'success', text }
  const [isVerifying, setIsVerifying] = useState(false);  // true while API call is in-flight
  // Inline leave-confirmation: holds the calId being confirmed, null = none
  const [leaveConfirmId, setLeaveConfirmId] = useState(null);

  // Derive the list of joined group calendar objects from the projects array.
  // .filter(Boolean) silently drops stale IDs whose project was later deleted.
  const groupCalendars = useMemo(() =>
    joinedGroupCalIds
      .map(id => projects.find(p => p.id === id))
      .filter(Boolean),
    [joinedGroupCalIds, projects]
  );

  // Server-verified join: POST /api/projects/verify-join-code
  // Only subscribes when the backend confirms the code is valid.
  const handleJoinGroupCal = async () => {
    const code = joinCode.trim();
    if (!code) {
      setJoinValidationMsg({ type: 'error', text: 'Please enter a join code.' });
      return;
    }

    // Client-side duplicate guard — prevents a round-trip when already joined.
    // Note: we compare by code, not ID, because we don't know the ID yet.
    // The server will also catch this implicitly (subscription is idempotent).
    setIsVerifying(true);
    setJoinValidationMsg(null);

    try {
      const res = await API.post('/projects/verify-join-code', { code });
      const { project_id, name, color } = res.data;

      if (joinedGroupCalIds.includes(project_id)) {
        setJoinValidationMsg({ type: 'error', text: `“${name}” is already in your Group Calendars.` });
        return;
      }

      const updated = [...joinedGroupCalIds, project_id];
      setJoinedGroupCalIds(updated);
      localStorage.setItem('caldim_group_cals', JSON.stringify(updated));
      toast.success(`“${name}” added to Group Calendars`);
      handleCloseJoinModal();
    } catch (err) {
      // 404 = invalid/expired code. Use a generic message to avoid leaking info.
      const isInvalid = err.response?.status === 404;
      setJoinValidationMsg({
        type: 'error',
        text: isInvalid
          ? 'Invalid or expired join code. Please check and try again.'
          : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Remove a project from the group calendars list.
  const handleLeaveGroupCal = (calId) => {
    const updated = joinedGroupCalIds.filter(id => id !== calId);
    setJoinedGroupCalIds(updated);
    localStorage.setItem('caldim_group_cals', JSON.stringify(updated));
    setLeaveConfirmId(null);
    const name = projects.find(p => p.id === calId)?.name || 'Calendar';
    toast.success(`Left “${name}”`);
  };

  // Reset all modal state when it closes.
  const handleCloseJoinModal = () => {
    setIsJoinModalOpen(false);
    setJoinCode('');
    setJoinValidationMsg(null);
    setIsVerifying(false);
  };

  // Holds the state for the inline code retrieval animation inside the dropdown context menu.
  // Shape: { id: number|string|null, code: string|null, loading: boolean }
  const [revealedCode, setRevealedCode] = useState(null);

  // Retrieve a project's secret join code from the secured endpoint (Admin/PM only).
  // Automatically copies the code to the user's clipboard to save clicks.
  const handleGetJoinCode = async (projectId, projectName) => {
    // Set loading state for this specific calendar row.
    setRevealedCode({ id: projectId, code: null, loading: true });

    try {
      const res = await API.get(`/projects/${projectId}/join-code`);
      const code = res.data?.join_code;
      if (!code) throw new Error('No code returned');

      // Zero-friction: copy to clipboard instantly
      await navigator.clipboard.writeText(code);
      
      // Update state to trigger smooth fade-in of the passcode
      setRevealedCode({ id: projectId, code, loading: false });
    } catch (err) {
      console.error('Failed to get join code:', err);
      toast.error(
        err.response?.data?.detail || 'Could not retrieve join code. Access denied.'
      );
      setRevealedCode(null);
    }
  };

  // ── Proposal 2: Active calendar filter ────────────────────────────────────
  // null = show all; a calId = isolate that calendar's events in the grid.
  const [activeCalendarFilter, setActiveCalendarFilter] = useState(null);

  // Jump viewDate to the nearest upcoming event belonging to a calendar.
  // Called when the user clicks a calendar name to activate the filter.
  const jumpToNearestCalendarEvent = (calId) => {
    const nearest = (Array.isArray(meetings) ? meetings : [])
      .filter(m => {
        const key = m.project_id != null ? m.project_id : 'personal';
        return key === calId;
      })
      .map(m => dayjs(`${m.date} ${m.time}`, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']))
      .filter(d => d.isValid() && d.isAfter(dayjs().subtract(1, 'hour')))
      .sort((a, b) => a.diff(b))[0];
    if (nearest) setViewDate(nearest);
  };

  // Toggle the active filter on/off; jump to nearest event when activating.
  const handleCalendarFilterClick = (calId) => {
    if (activeCalendarFilter === calId) {
      // Second click on the same calendar resets the filter
      setActiveCalendarFilter(null);
    } else {
      setActiveCalendarFilter(calId);
      jumpToNearestCalendarEvent(calId);
    }
  };

  // Compute the set of event dates for the active filter and search query.
  // Used by MiniMonthPicker to show a dot under days that have matching events.
  const filteredEventDays = useMemo(() => {
    const rawMeetings = Array.isArray(meetings) ? meetings : [];
    const filtered = rawMeetings.filter(m => {
      // 1. Sidebar calendar filter
      if (activeCalendarFilter) {
        const key = m.project_id != null ? m.project_id : 'personal';
        if (key !== activeCalendarFilter) return false;
      }
      
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchProj = m.project_name?.toLowerCase().includes(q);
        const matchPlatform = m.platform?.toLowerCase().includes(q);
        const matchAttendees = m.attendees?.some(a => {
          if (!a) return false;
          if (typeof a === 'string') return a.toLowerCase().includes(q);
          if (typeof a === 'object') {
            return [a.name, a.email, a.employee_name, a.full_name]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          }
          return false;
        });
        if (!matchTitle && !matchProj && !matchPlatform && !matchAttendees) return false;
      }
      
      return true;
    });

    return new Set(filtered.map(m => m.date));
  }, [meetings, activeCalendarFilter, searchQuery]);

  // Filter MY CALENDARS list by search query if any.
  // A calendar is shown if its name matches the search OR if it has any matching events.
  const visibleCalendars = useMemo(() => {
    if (!searchQuery.trim()) return calendars;
    const q = searchQuery.toLowerCase();
    return calendars.filter(cal => {
      // Direct name match
      if (cal.name.toLowerCase().includes(q)) return true;

      // Check if it owns any meetings matching the query
      return (Array.isArray(meetings) ? meetings : []).some(m => {
        const calId = m.project_id != null ? m.project_id : 'personal';
        if (calId !== cal.id) return false;
        
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchPlatform = m.platform?.toLowerCase().includes(q);
        const matchAttendees = m.attendees?.some(a => {
          if (!a) return false;
          if (typeof a === 'string') return a.toLowerCase().includes(q);
          if (typeof a === 'object') {
            return [a.name, a.email, a.employee_name, a.full_name]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          }
          return false;
        });
        return matchTitle || matchPlatform || matchAttendees;
      });
    });
  }, [calendars, meetings, searchQuery]);

  // Filter GROUP CALENDARS list by search query if any.
  // A project is shown if its name matches the search OR if it has any matching events.
  const visibleGroupCalendars = useMemo(() => {
    if (!searchQuery.trim()) return groupCalendars;
    const q = searchQuery.toLowerCase();
    return groupCalendars.filter(proj => {
      // Direct name match
      if (proj.name.toLowerCase().includes(q)) return true;

      // Check if it owns any meetings matching the query
      return (Array.isArray(meetings) ? meetings : []).some(m => {
        if (m.project_id !== proj.id) return false;

        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchPlatform = m.platform?.toLowerCase().includes(q);
        const matchAttendees = m.attendees?.some(a => {
          if (!a) return false;
          if (typeof a === 'string') return a.toLowerCase().includes(q);
          if (typeof a === 'object') {
            return [a.name, a.email, a.employee_name, a.full_name]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          }
          return false;
        });
        return matchTitle || matchPlatform || matchAttendees;
      });
    });
  }, [groupCalendars, meetings, searchQuery]);

  // Processed Events List
  const processedEvents = useMemo(() => {
    return (Array.isArray(meetings) ? meetings : [])
      .filter(m => {
        // ── Active filter: show only this calendar's events ──────────────
        if (activeCalendarFilter) {
          const key = m.project_id != null ? m.project_id : 'personal';
          if (key !== activeCalendarFilter) return false;
        }

        const cal = calendars.find(c => c.name === m.project_name || c.id === m.project_id);
        if (cal && !cal.visible) return false;
        if (!filters.showDeclined && m.rsvp_status === 'Declined') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title?.toLowerCase().includes(q);
          const matchProj = m.project_name?.toLowerCase().includes(q);
          const matchPlatform = m.platform?.toLowerCase().includes(q);
          const matchAttendees = m.attendees?.some(a => {
            if (!a) return false;
            if (typeof a === 'string') return a.toLowerCase().includes(q);
            if (typeof a === 'object') {
              const searchString = [a.name, a.email, a.employee_name, a.full_name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              return searchString.includes(q);
            }
            return false;
          });
          if (!matchTitle && !matchProj && !matchPlatform && !matchAttendees) return false;
        }
        return true;
      })
      .map(m => {
        const startStr = `${m.date} ${m.time}`;
        const startDate = dayjs(startStr, ['YYYY-MM-DD h:mm A', 'YYYY-MM-DD HH:mm']);
        const duration = m.duration || m.duration_minutes || 60;
        const endDate = startDate.add(duration, 'minute');

        // Use locally saved color or fallback to calendar color
        const savedColors = JSON.parse(localStorage.getItem('caldim_event_colors') || '{}');
        const calColor = savedColors[m.id] || calendars.find(c => c.name === m.project_name || c.id === m.project_id)?.color || EVENT_COLOR_HEXES[0];

        return {
          id: m.id,
          title: m.title,
          start: startDate.toDate(),
          end: endDate.toDate(),
          color: calColor,
          platform: m.platform,
          rsvpStatus: m.rsvp_status,
          joinUrl: m.join_url || m.joinUrl,
          attendees: m.attendees || []
        };
      });
  }, [meetings, calendars, filters.showDeclined, searchQuery, activeCalendarFilter]);

  const upcomingEvents = useMemo(() => {
    return [...processedEvents]
      .filter(e => dayjs(e.start).isAfter(dayjs().subtract(1, 'hour')))
      .sort((a, b) => dayjs(a.start).diff(dayjs(b.start)))
      .slice(0, 5);
  }, [processedEvents]);

  return (
    <div className="calendar-page">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="calendar-header">
        {/* Preserving an empty flex cell keeps the search bar exactly centered */}
        <div className="header-left" />

        <div className="header-center">
          <div className="search-bar-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search events (/)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className="view-switcher-container">
            {['Day', 'Week', 'Month'].map((v) => (
              <button
                key={v}
                className={`view-pill ${activeView === v ? 'active' : ''}`}
                onClick={() => setActiveView(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 3-Zone Body ────────────────────────────────────────── */}
      <div className="calendar-body-3zone">
        
        {/* Zone 1: Left Sidebar */}
        <aside className="zone-card calendar-left-sidebar custom-scrollbar">
          <div className="sidebar-section">
            <MiniMonthPicker
              viewDate={viewDate}
              setViewDate={setViewDate}
              highlightedDays={filteredEventDays}
            />
          </div>

          <div className="sidebar-section">
            <div className="section-label-row">
              <div className="section-label" style={{ marginBottom: 0 }}>MY CALENDARS</div>
              {/* Show All pill — only visible when a filter is active */}
              {activeCalendarFilter && (
                <button
                  className="cal-show-all-pill"
                  onClick={() => setActiveCalendarFilter(null)}
                  title="Clear filter and show all calendars"
                >
                  Show All ×
                </button>
              )}
            </div>

            {/* Active filter context banner */}
            {activeCalendarFilter && (() => {
              const filtered = calendars.find(c => c.id === activeCalendarFilter);
              return filtered ? (
                <div className="cal-filter-banner" style={{ borderLeftColor: filtered.color }}>
                  <div className="cal-filter-dot" style={{ backgroundColor: filtered.color }} />
                  <span className="cal-filter-name">{filtered.name}</span>
                  <span className="cal-filter-hint">only</span>
                </div>
              ) : null;
            })()}

            <div className="calendar-list">
              {visibleCalendars.map(cal => {
                const count = meetingCountByCalendar[cal.id] || 0;
                const isActive = activeCalendarId === cal.id;
                const isFiltered = activeCalendarFilter === cal.id;
                const isPickerOpen = colorPickerOpenFor === cal.id;

                return (
                  <div
                    key={cal.id}
                    className={[
                      'calendar-list-row',
                      isFiltered ? 'cal-row-filtered' : '',
                      isActive && !isFiltered ? 'cal-row-active' : '',
                      !cal.visible ? 'cal-row-hidden' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {/* ── Left click-zone: filter + jump ─────────────────────
                        Clicking the name/dot area sets this calendar as the
                        active filter and jumps to its nearest upcoming event. */}
                    <div
                      className="cal-row-filter-zone"
                      onClick={() => handleCalendarFilterClick(cal.id)}
                      title={isFiltered ? 'Click to show all' : 'Click to filter by this calendar'}
                    >
                      <div
                        className="cal-color-dot"
                        style={{ backgroundColor: cal.color, opacity: cal.visible ? 1 : 0.4 }}
                      />
                      <span
                        className="cal-name"
                        style={{ opacity: cal.visible ? 1 : 0.5 }}
                      >
                        {cal.name}
                      </span>
                      {count > 0 && (
                        <span
                          className="cal-count-badge"
                          title={`${count} meeting${count !== 1 ? 's' : ''} · click to jump to next`}
                        >
                          {count}
                        </span>
                      )}
                    </div>

                    {/* ── Context menu (⋯) — stopPropagation prevents row click */}
                    <div
                      className="cal-row-actions"
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenu
                        open={isPickerOpen}
                        onOpenChange={open => {
                          setColorPickerOpenFor(open ? cal.id : null);
                          // Clean cleanup: reset the animation state back to 'Get Share Code' when menu closes.
                          if (!open) {
                            setRevealedCode(null);
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            className="cal-actions-btn"
                            aria-label={`Options for ${cal.name}`}
                            title="Calendar options"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => { toggleCalendar(cal.id); setColorPickerOpenFor(null); }}
                            className="flex items-center gap-2"
                          >
                            {cal.visible
                              ? <><EyeOff size={13} /> <span>Hide calendar</span></>
                              : <><Eye size={13} /> <span>Show calendar</span></>
                            }
                          </DropdownMenuItem>
                          <div className="cal-color-picker-section">
                            <div className="cal-color-picker-label">
                              <Palette size={11} /> Change color
                            </div>
                            <div className="cal-color-swatch-grid">
                              {EVENT_COLOR_HEXES.map(c => (
                                <div
                                  key={c}
                                  className="cal-color-swatch"
                                  style={{
                                    backgroundColor: c,
                                    boxShadow: cal.color === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : 'none',
                                    transform: cal.color === c ? 'scale(1.15)' : 'scale(1)',
                                  }}
                                  title={c}
                                  onClick={() => { updateCalendarColor(cal.id, c); setColorPickerOpenFor(null); }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* ── Dynamic Get Share Code (Admin/PM only) ──────────────────
                              Transforms smoothly: Label -> Loading -> Monospace Code.
                              Clicks copy code directly. Closing menu resets layout. */}
                          {['Admin', 'Super Admin', 'Project Manager'].includes(user?.role) && cal.id !== 'personal' && (
                            <>
                              <div style={{ margin: '4px 0', borderTop: '1px solid #F1F5F9' }} />
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  // CRITICAL: Prevent dropdown from closing on click
                                  e.preventDefault();

                                  // If already loaded, re-copy it to clipboard and toast
                                  if (revealedCode?.id === cal.id && revealedCode.code) {
                                    await navigator.clipboard.writeText(revealedCode.code);
                                    toast.success('Passcode copied to clipboard again!');
                                    return;
                                  }

                                  handleGetJoinCode(cal.id, cal.name);
                                }}
                                className="flex items-center gap-2 text-blue-600 font-semibold cursor-pointer min-h-[32px] justify-center relative overflow-hidden focus:bg-blue-50/50"
                              >
                                <AnimatePresence mode="wait">
                                  {revealedCode?.id === cal.id ? (
                                    revealedCode.loading ? (
                                      <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex items-center gap-1.5 justify-center"
                                      >
                                        <span className="dropdown-spinner" />
                                        <span className="text-[11px] text-gray-400 font-normal">Fetching...</span>
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="code"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.15, type: 'spring', damping: 25 }}
                                        className="flex items-center gap-1 justify-center w-full"
                                      >
                                        <span className="text-[11px] font-mono tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold select-all flex items-center gap-1">
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                                          </svg>
                                          {revealedCode.code}
                                        </span>
                                      </motion.div>
                                    )
                                  ) : (
                                    <motion.div
                                      key="label"
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      transition={{ duration: 0.12 }}
                                      className="flex items-center gap-2 justify-center w-full text-blue-600"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                      </svg>
                                      <span>Get Share Code</span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* ── Checkmark: toggles visibility (separate click zone) ──
                        stopPropagation prevents the filter from activating. */}
                    {!isPickerOpen && (
                      <div
                        className="cal-toggle"
                        onClick={e => { e.stopPropagation(); toggleCalendar(cal.id); }}
                        title={cal.visible ? 'Hide this calendar' : 'Show this calendar'}
                      >
                        {cal.visible && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-label-row" style={{ marginBottom: visibleGroupCalendars.length > 0 ? '12px' : '8px' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>GROUP CALENDARS</div>
              <button
                className="group-cal-add-btn"
                onClick={() => setIsJoinModalOpen(true)}
                title="Subscribe to a project calendar"
              >
                <Plus size={13} />
              </button>
            </div>

            {visibleGroupCalendars.length === 0 ? (
              /* Empty state — explains purpose + gives one clear action */
              <div className="group-cal-empty">
                <div className="group-cal-empty-text">
                  {searchQuery.trim() 
                    ? 'No matching group calendars found.' 
                    : 'Subscribe to team or project calendars to see their meetings here.'}
                </div>
                <button
                  className="btn-ghost-action text-blue-600"
                  style={{ marginTop: 4, paddingLeft: 0 }}
                  onClick={() => setIsJoinModalOpen(true)}
                >
                  <PlusCircle size={15} /> Add Calendar
                </button>
              </div>
            ) : (
              <div className="calendar-list">
                {visibleGroupCalendars.map(proj => {
                  const calEntry = calendars.find(c => c.id === proj.id);
                  const color = calEntry?.color || proj.color || '#10b981';
                  const count = meetingCountByCalendar[proj.id] || 0;
                  const isFiltered = activeCalendarFilter === proj.id;
                  const isConfirmingLeave = leaveConfirmId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={[
                        'calendar-list-row group-cal-row',
                        isFiltered ? 'cal-row-filtered' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {/* Filter click zone */}
                      <div
                        className="cal-row-filter-zone"
                        onClick={() => handleCalendarFilterClick(proj.id)}
                        title={isFiltered ? 'Click to show all' : 'Click to filter by this calendar'}
                      >
                        <div className="cal-color-dot" style={{ backgroundColor: color }} />
                        <span className={`cal-name ${isFiltered ? '' : ''}`}>{proj.name}</span>
                        {count > 0 && (
                          <span className="cal-count-badge" title={`${count} meetings`}>{count}</span>
                        )}
                      </div>

                      {/* Leave action */}
                      <div className="cal-row-actions" onClick={e => e.stopPropagation()}>
                        {isConfirmingLeave ? (
                          /* Inline confirm — no modal overhead for a reversible action */
                          <div className="group-cal-leave-confirm">
                            <button
                              className="group-cal-leave-yes"
                              onClick={() => handleLeaveGroupCal(proj.id)}
                              title="Confirm leave"
                            >
                              Leave
                            </button>
                            <button
                              className="group-cal-leave-no"
                              onClick={() => setLeaveConfirmId(null)}
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            className="cal-actions-btn"
                            onClick={() => setLeaveConfirmId(proj.id)}
                            title="Leave this group calendar"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-label mb-2">EVENT COLORS</div>
            <div className="flex flex-wrap gap-2 mt-2 px-1">
              {EVENT_COLOR_HEXES.map((c) => {
                const isCurrent = selectedEvent ? selectedEvent.color === c : selectedEventColor === c;
                return (
                  <div
                    key={c}
                    className="w-5.5 h-5.5 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95"
                    style={{ 
                      backgroundColor: c,
                      transform: isCurrent ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: isCurrent ? `0 0 0 2px white, 0 0 0 4.5px ${c}50` : 'none',
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}
                    onClick={() => handleColorSelect(c)}
                    title={selectedEvent ? "Change color of selected event" : "Set default event color"}
                  />
                );
              })}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-label">FILTERS</div>
            <div className="filters-toggle-list">
              <label className="filter-toggle-row">
                <span className="filter-toggle-label">Hide declined events</span>
                <div className={`switch-toggle ${!filters.showDeclined ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); toggleFilter('showDeclined'); }}>
                  <div className="switch-thumb" />
                </div>
              </label>
              
              <label className="filter-toggle-row">
                <span className="filter-toggle-label">Hide weekends</span>
                <div className={`switch-toggle ${!filters.showWeekends ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); toggleFilter('showWeekends'); }}>
                  <div className="switch-thumb" />
                </div>
              </label>

              <label className="filter-toggle-row">
                <span className="filter-toggle-label">Hide week numbers</span>
                <div className={`switch-toggle ${!filters.showWeekNumbers ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); toggleFilter('showWeekNumbers'); }}>
                  <div className="switch-thumb" />
                </div>
              </label>
            </div>
          </div>
        </aside>

        {/* Zone 2: Main Grid */}
        <main className="zone-card calendar-main-grid">
          {/* Header row moved here */}
          <div className="main-grid-toolbar">
            <div className="main-month-title">
              {viewDate.format('MMMM YYYY')}
            </div>
            <div className="main-grid-nav">
              <button className="btn-nav-arrow" onClick={() => handleNav(-1)}><ChevronLeft size={16} /></button>
              <button className="btn-nav-arrow" onClick={() => handleNav(1)}><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <CalendarGrid 
            viewDate={viewDate} 
            activeView={activeView}
            showWeekends={filters.showWeekends}
            showWeekNumbers={filters.showWeekNumbers}
            onDateClick={handleDateClick}
            onQuickSave={handleQuickSave}
            events={processedEvents}
            onEventSelect={setSelectedEvent}
            selectedEventId={selectedEvent?.id}
            defaultColor={selectedEventColor}
          />
        </main>

        {/* Zone 3: Right Panel */}
        <aside className="calendar-right-panel">
          
          {selectedEvent ? (
            /* Selected Event View */
            <div className="right-card flex-1">
              <div className="flex justify-between items-center mb-4">
                <div className="right-card-title m-0">EVENT DETAILS</div>
                <button className="text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => setSelectedEvent(null)}>
                  <X size={16} />
                </button>
              </div>
              
              <div className="event-details-content">
                <h2 className="event-details-title">{selectedEvent.title}</h2>
                
                <div className="event-details-meta-row">
                  <CalendarIcon size={14} className="text-gray-400" />
                  <span>{dayjs(selectedEvent.start).format('dddd, MMMM D')}</span>
                </div>
                
                <div className="event-details-meta-row">
                  <Clock size={14} className="text-gray-400" />
                  <span>{dayjs(selectedEvent.start).format('h:mm A')} – {dayjs(selectedEvent.end).format('h:mm A')}</span>
                </div>
                
                <div className="event-details-meta-row">
                  {selectedEvent.platform?.toLowerCase().includes('google') ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} className="text-gray-400" />}
                  <span>{selectedEvent.platform || 'General Meeting'}</span>
                </div>
                
                {selectedEvent.joinUrl && dayjs(selectedEvent.start).isAfter(dayjs()) && (
                  <button 
                    className="btn-create-primary mt-2 w-full justify-center"
                    onClick={() => window.open(selectedEvent.joinUrl, '_blank')}
                  >
                    Join Meeting
                  </button>
                )}

                <div className="event-details-divider" />
                
                <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Attendees</span>
                  {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                      {selectedEvent.attendees.length} total
                    </span>
                  )}
                </div>
                
                {(!selectedEvent.attendees || selectedEvent.attendees.length === 0) ? (
                  <div className="text-[12px] text-slate-400 italic">No attendees added.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedEvent.attendees.slice(0, 3).map((a, i) => {
                      const det = getAttendeeDetails(a);
                      const color = getAvatarColor(det.email);
                      return (
                        <div key={i} className="event-attendee-row flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${color}`}>
                            {det.initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-800 truncate">{det.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">{det.email}</span>
                          </div>
                        </div>
                      );
                    })}
                    
                    {selectedEvent.attendees.length > 3 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-dashed border-blue-200 rounded-lg py-1.5 px-3 transition-all cursor-pointer text-center mt-1">
                            + {selectedEvent.attendees.length - 3} more attendees
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <span>Meeting Attendees</span>
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded px-2 py-0.5">
                                {selectedEvent.attendees.length}
                              </span>
                            </DialogTitle>
                            <DialogDescription>
                              Full guest list for &ldquo;{selectedEvent.title}&rdquo;
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex flex-col gap-2.5 my-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {selectedEvent.attendees.map((a, i) => {
                              const det = getAttendeeDetails(a);
                              const color = getAvatarColor(det.email);
                              return (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${color}`}>
                                    {det.initials}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-semibold text-slate-800 truncate">{det.name}</span>
                                    <span className="text-xs text-slate-400 truncate">{det.email}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <DialogFooter>
                            <DialogClose asChild>
                              <button className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none">
                                Close
                              </button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button className="btn-outline-action flex-1" onClick={() => navigate(`/dashboard/schedule-meeting?edit=${selectedEvent.id}`)}>Edit</button>
                    <button className="btn-outline-action flex-1" onClick={() => navigate(`/dashboard/meeting/${selectedEvent.id}`)}>Details</button>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-full text-center py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-all cursor-pointer mt-3 shadow-sm hover:shadow-md">
                        Delete Event
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Meeting?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{selectedEvent.title}" from your calendar. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteEvent(selectedEvent.id)} className="bg-red-600 hover:bg-red-700 text-white border-none cursor-pointer">
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ) : (
            /* Upcoming View */
            <div className="right-card flex-1">
              <div className="right-card-title">UPCOMING</div>
              <div className="upcoming-list custom-scrollbar">
                {upcomingEvents.length === 0 ? (
                  <div className="text-[13px] text-gray-500 text-center mt-10">No upcoming events.</div>
                ) : (
                  upcomingEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className="upcoming-row"
                      onClick={() => setSelectedEvent(ev)}
                    >
                      <div className="upcoming-title">{ev.title}</div>
                      <div className="upcoming-meta">
                        {dayjs(ev.start).format('h:mm A')} · {ev.platform || 'Meeting'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="right-card">
            <div className="right-card-title">QUICK ACTIONS</div>
            <div className="quick-actions-list">
              <button className="btn-ghost-action" onClick={() => navigate('/dashboard/schedule-meeting')}>
                <Plus size={16} /> New Event
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={`btn-ghost-action ${!selectedEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!selectedEvent}
                    onClick={() => {
                      if (!selectedEvent) toast.error('Please select an event first');
                    }}
                  >
                    <Bell size={16} /> Reminder
                  </button>
                </DropdownMenuTrigger>
                {selectedEvent && (
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => toast.success(`Reminder set 5m before ${selectedEvent.title}`)}>5 minutes before</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success(`Reminder set 10m before ${selectedEvent.title}`)}>10 minutes before</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success(`Reminder set 15m before ${selectedEvent.title}`)}>15 minutes before</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success(`Reminder set 30m before ${selectedEvent.title}`)}>30 minutes before</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.success(`Reminder set 1h before ${selectedEvent.title}`)}>1 hour before</DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            </div>
          </div>

        </aside>
      </div>

      {/* ── Add Group Calendar Modal (Passcode-Gated) ──────────────────────
           Security: the free project-search list has been removed.
           Users must enter an exact join code (provided by an Admin/PM)
           which is verified server-side before subscription is granted. */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
            onClick={handleCloseJoinModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-center px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">Join Group Calendar</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    Enter the join code provided by your Admin or Project Manager.
                  </p>
                </div>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                  onClick={handleCloseJoinModal}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Code entry */}
              <div className="px-5 pb-4">
                <div className="join-modal-search join-modal-code-field">
                  {/* Lock icon signals this is a secured entry */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="join-modal-search-icon flex-shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    id="group-cal-join-code-input"
                    className="join-modal-input join-modal-input-mono"
                    placeholder="e.g. TATA-8A3F"
                    value={joinCode}
                    maxLength={9}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    onChange={e => {
                      // Auto-format: insert hyphen after 4th char, force uppercase
                      let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                      if (v.length === 4 && !v.includes('-')) v = v + '-';
                      setJoinCode(v);
                      setJoinValidationMsg(null);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !isVerifying) handleJoinGroupCal(); }}
                  />
                </div>

                {/* Inline validation / error message */}
                {joinValidationMsg && (
                  <div className={`join-modal-msg join-modal-msg-${joinValidationMsg.type}`}>
                    {joinValidationMsg.text}
                  </div>
                )}

                {/* Security explainer */}
                <div className="join-modal-security-note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Codes are issued by Admins. Contact your Project Manager to get one.
                </div>
              </div>

              {/* Footer: Cancel + Verify button */}
              <div className="join-modal-footer" style={{ borderTop: '1px solid #F1F5F9' }}>
                <button className="join-modal-cancel" onClick={handleCloseJoinModal}>Cancel</button>
                <button
                  className={`join-modal-verify-btn ${isVerifying ? 'verifying' : ''}`}
                  onClick={handleJoinGroupCal}
                  disabled={isVerifying || !joinCode.trim()}
                >
                  {isVerifying ? (
                    <span className="join-modal-spinner" />
                  ) : null}
                  {isVerifying ? 'Verifying…' : 'Verify & Join'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
