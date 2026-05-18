import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ChevronLeft, ChevronRight, Plus, Search, MoreHorizontal, X, Video, MapPin, PlusCircle, Bell, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './CalendarPage.css';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu';
import CalendarGrid from './components/CalendarGrid';
import API from '../../utils/api';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

const MiniMonthPicker = ({ viewDate, setViewDate }) => {
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
          
          return (
            <div 
              key={i} 
              className={`mini-cal-cell ${d.otherMonth ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setViewDate(d.date)}
            >
              {d.date.date()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const navigate = useNavigate();
  const user = useSelector(state => state.auth?.user);
  const [viewDate, setViewDate] = useState(dayjs());
  const [activeView, setActiveView] = useState('Week'); // Day, Week, Month
  const [calendars, setCalendars] = useState([
    { id: 'personal', name: 'My Meetings', color: '#2563EB', visible: true },
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
          const personal = prev.find(c => c.id === 'personal') || { id: 'personal', name: 'My Meetings', color: '#2563EB', visible: true };
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

  // Live clock — updates every second
  const [liveClock, setLiveClock] = useState(() => dayjs().format('h:mm A'));
  useEffect(() => {
    const tick = setInterval(() => setLiveClock(dayjs().format('h:mm A')), 1000);
    return () => clearInterval(tick);
  }, []);

  // Event Colors persistent state
  const [selectedEventColor, setSelectedEventColor] = useState(() => {
    return localStorage.getItem('caldim_default_event_color') || '#2563EB';
  });

  const handleColorSelect = (c) => {
    setSelectedEventColor(c);
    localStorage.setItem('caldim_default_event_color', c);
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
  const [joinProjectId, setJoinProjectId] = useState('');

  // Processed Events List
  const processedEvents = useMemo(() => {
    return (Array.isArray(meetings) ? meetings : [])
      .filter(m => {
        const cal = calendars.find(c => c.name === m.project_name || c.id === m.project_id);
        if (cal && !cal.visible) return false;
        if (!filters.showDeclined && m.rsvp_status === 'Declined') return false;
        
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title?.toLowerCase().includes(q);
          const matchProj = m.project_name?.toLowerCase().includes(q);
          const matchPlatform = m.platform?.toLowerCase().includes(q);
          const matchAttendees = m.attendees?.some(a => a?.toLowerCase().includes(q));
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
        const calColor = savedColors[m.id] || calendars.find(c => c.name === m.project_name || c.id === m.project_id)?.color || '#2563EB';

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
  }, [meetings, calendars, filters.showDeclined, searchQuery]);

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
        <div className="header-left">
          <CalendarIcon className="header-logo" />
          <div className="header-title">Calendar</div>
          {/* Live clock */}
          <div className="header-live-clock">{liveClock} · IST</div>
        </div>

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
          {/* New Event — primary CTA */}
          <button
            className="btn-create-primary"
            onClick={() => navigate('/dashboard/schedule-meeting')}
          >
            <Plus size={15} /> New Event
          </button>

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

          <button className="btn-today-ghost" onClick={() => setViewDate(dayjs())}>
            Today
          </button>

          <div className="avatar-circle" title={user?.full_name || 'User'}>
            {getUserInitial()}
          </div>
        </div>
      </header>

      {/* ── 3-Zone Body ────────────────────────────────────────── */}
      <div className="calendar-body-3zone">
        
        {/* Zone 1: Left Sidebar */}
        <aside className="zone-card calendar-left-sidebar custom-scrollbar">
          <div className="sidebar-section">
            <MiniMonthPicker viewDate={viewDate} setViewDate={setViewDate} />
          </div>

          <div className="sidebar-section">
            <div className="section-label">MY CALENDARS</div>
            <div className="calendar-list">
              {calendars.map(cal => (
                <div key={cal.id} className="calendar-list-row" onClick={() => toggleCalendar(cal.id)}>
                  <div className="cal-color-dot" style={{ backgroundColor: cal.color }} />
                  <span className="cal-name" style={{ opacity: cal.visible ? 1 : 0.6 }}>{cal.name}</span>
                  <div className="cal-toggle ml-auto">
                    {cal.visible && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-label">
              GROUP CALENDARS
              <Plus size={14} className="cursor-pointer hover:text-gray-900 float-right" onClick={() => setIsJoinModalOpen(true)} />
            </div>
            <button className="btn-ghost-action text-blue-600 mt-2" onClick={() => setIsJoinModalOpen(true)}>
              <PlusCircle size={16} /> Add Calendar
            </button>
          </div>

          <div className="sidebar-section">
            <div className="section-label mb-2">EVENT COLORS</div>
            <div className="flex flex-wrap gap-2 mt-2 px-1">
              {['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'].map((c) => (
                <div
                  key={c}
                  className="w-5 h-5 rounded-full cursor-pointer transition-transform"
                  style={{ 
                    backgroundColor: c,
                    transform: selectedEventColor === c ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: selectedEventColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}40` : 'none'
                  }}
                  onClick={() => handleColorSelect(c)}
                  title="Set default event color"
                />
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-label">FILTERS</div>
            <div className="filter-chips-container">
              <div className={`filter-chip ${!filters.showDeclined ? 'active' : ''}`} onClick={() => toggleFilter('showDeclined')}>
                Hide declined events
              </div>
              <div className={`filter-chip ${!filters.showWeekends ? 'active' : ''}`} onClick={() => toggleFilter('showWeekends')}>
                Hide weekends
              </div>
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
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedEvent(null)}>
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
                
                <div className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Attendees</div>
                <div className="event-attendee-row">
                  <div className="attendee-sm-avatar">GK</div>
                  <span>Gokul K</span>
                </div>
                <div className="event-attendee-row">
                  <div className="attendee-sm-avatar">PR</div>
                  <span>Pradeep R</span>
                </div>

                <div className="mt-auto pt-4 flex gap-2">
                  <button className="btn-outline-action flex-1" onClick={() => navigate(`/dashboard/schedule-meeting?edit=${selectedEvent.id}`)}>Edit</button>
                  <button className="btn-outline-action flex-1" onClick={() => navigate(`/dashboard/meeting/${selectedEvent.id}`)}>Details</button>
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

      {/* Join Group Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setIsJoinModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm border border-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Join Group Calendar</h3>
                <X size={20} className="cursor-pointer text-gray-400" onClick={() => setIsJoinModalOpen(false)} />
              </div>
              <p className="text-sm text-gray-500 mb-4">Enter a project ID or share code to join.</p>
              <input 
                type="text" 
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg mb-4 text-sm outline-none focus:border-blue-500" 
                placeholder="e.g. PRJ-2024-X" 
                value={joinProjectId}
                onChange={(e) => setJoinProjectId(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100" onClick={() => setIsJoinModalOpen(false)}>Cancel</button>
                <button className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700" onClick={() => { toast.success(`Joined ${joinProjectId}`); setIsJoinModalOpen(false); }}>Join</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;
