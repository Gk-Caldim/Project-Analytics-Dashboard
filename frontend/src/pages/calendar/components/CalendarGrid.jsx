import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Calendar, Clock, Video, MapPin, Users, ChevronDown, X, AlertCircle, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './CalendarGrid.css';
import { EVENT_COLORS } from '../../constants';

dayjs.extend(isoWeek);

// ── Utility Helpers ──────────────────────────────────────────────
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s+(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const getAvatarColor = (str) => {
  const colors = ['#ec4899', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ── Inline Time Picker (Premium 3-Column) ────────────────────────
const TimePicker = ({ selectedTime, onSelect, onClose }) => {
  // Parse incoming "h:mm A"
  const match = selectedTime.match(/(\d+):(\d+)\s+(AM|PM)/i);
  const hour12 = match ? parseInt(match[1], 10) : 10;
  const m = match ? parseInt(match[2], 10) : 0;
  const ampm = match ? match[3].toUpperCase() : 'AM';

  const handleSelect = (newH, newM, newAmpm) => {
    onSelect(`${newH}:${String(newM).padStart(2, '0')} ${newAmpm}`);
  };

  return (
    <motion.div 
      layout initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className="premium-time-picker-dropdown"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
        <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hr</div>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(hr => (
          <button 
            key={hr} 
            className={`w-full text-left px-2 py-1 rounded text-[12px] font-medium transition-colors ${hour12 === hr ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'} border-none cursor-pointer`}
            style={hour12 === hr ? { backgroundColor: '#2563eb', color: '#fff' } : { background: 'transparent' }}
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
            className={`w-full text-left px-2 py-1 rounded text-[12px] font-medium transition-colors ${m === min ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'} border-none cursor-pointer`}
            style={m === min ? { backgroundColor: '#2563eb', color: '#fff' } : { background: 'transparent' }}
            onClick={() => handleSelect(hour12, min, ampm)}
          >
            {String(min).padStart(2, '0')}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 justify-center border-l pl-2 border-gray-100" style={{ borderLeft: '1px solid #f3f4f6' }}>
        {['AM', 'PM'].map(a => (
          <button 
            key={a} 
            className={`px-2 py-1.5 rounded font-bold text-[10px] transition-all cursor-pointer border-none`}
            style={ampm === a ? { backgroundColor: '#2563eb', color: '#fff' } : { backgroundColor: '#f9fafb', color: '#6b7280' }}
            onClick={() => handleSelect(hour12, m, a)}
          >
            {a}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// ── Inline Date Picker ───────────────────────────────────────────
const DatePicker = ({ selectedDate, onSelect, onClose }) => {
  const [pickerMonth, setPickerMonth] = useState(selectedDate.startOf('month'));
  
  const days = useMemo(() => {
    const start = pickerMonth.startOf('month').startOf('week');
    const end = pickerMonth.endOf('month').endOf('week');
    const arr = [];
    let curr = start;
    while (curr.isBefore(end) || curr.isSame(end, 'day')) {
      arr.push(curr);
      curr = curr.add(1, 'day');
    }
    return arr;
  }, [pickerMonth]);

  return (
    <div className="inline-picker-card date-picker-dropdown">
      <div className="date-picker-header">
        <div className="date-picker-month">{pickerMonth.format('MMMM YYYY')}</div>
        <div className="date-picker-nav">
          <button className="date-picker-nav-btn" onClick={() => setPickerMonth(pickerMonth.subtract(1, 'month'))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="date-picker-nav-btn" onClick={() => setPickerMonth(pickerMonth.add(1, 'month'))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      <div className="date-picker-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`} className="weekday-label">{d}</div>)}
      </div>
      <div className="date-picker-grid">
        {days.map((d, i) => (
          <div
            key={i}
            className={`date-picker-cell ${d.isSame(selectedDate, 'day') ? 'selected' : ''} ${d.isSame(dayjs(), 'day') ? 'today' : ''} ${!d.isSame(pickerMonth, 'month') ? 'muted' : ''}`}
            onClick={() => { onSelect(d); onClose(); }}
          >
            {d.date()}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Helpers & Icons ──────────────────────────────────────────────────
const GoogleLogo = () => (
  <svg viewBox="0 0 533.5 544.3" width="16" height="16">
    <path d="M533.5 277.3c0-19.7-1.8-38.6-5-56.6H272.1v107h146.6c-6.3 34.1-25.6 63-54.6 82.5l88.4 68.5c51.7-47.7 81-118.1 81-201.4z" fill="#4285f4"/>
    <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.4l-88.4-68.5c-24.4 16.3-55.8 26.1-92 26.1-70.8 0-130.7-47.8-152.1-112H27.9v70.5c45.2 89.9 138.2 149.3 244.2 149.3z" fill="#34a853"/>
    <path d="M120 324.4c-5.4-16.1-8.5-33.3-8.5-51.1 0-17.8 3.1-35.1 8.5-51.1V151.7H27.9c-18.1 36-28.5 76.5-28.5 119.3s10.4 83.3 28.5 119.3l92.1-71.2z" fill="#fbbc04"/>
    <path d="M272.1 107.7c40 0 75.8 13.7 104.1 40.8l78-78C407.3 26.7 345.5 1.1 272.1 1.1 166.1 1.1 73.1 60.5 27.9 150.4l92.1 71.2c21.4-64.2 81.3-113.9 152.1-113.9z" fill="#ea4335"/>
  </svg>
);

const MicrosoftLogo = () => (
  <svg viewBox="0 0 23 23" width="16" height="16">
    <path fill="#f35325" d="M1 1h10v10H1z"/>
    <path fill="#81bc06" d="M12 1h10v10H1z"/>
    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
    <path fill="#ffba08" d="M12 12h10v10H1z"/>
  </svg>
);

const ZoomLogo = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#2D8CFF"/>
    <path d="M6 8.5C6 7.67157 6.67157 7 7.5 7H13.5C14.3284 7 15 7.67157 15 8.5V15.5C15 16.3284 14.3284 17 13.5 17H7.5C6.67157 17 6 16.3284 6 15.5V8.5Z" fill="white"/>
    <path d="M16 10.2L18.4 8.4C18.7 8.2 19 8.4 19 8.7V15.3C19 15.6 18.7 15.8 18.4 15.6L16 13.8V10.2Z" fill="white"/>
  </svg>
);

const PLATFORMS = [
  { id: 'meet', name: 'Google Meet', icon: <GoogleLogo /> },
  { id: 'teams', name: 'Microsoft Teams', icon: <MicrosoftLogo /> },
  { id: 'zoom', name: 'Zoom Meeting', icon: <ZoomLogo /> }
];



// ── Quick Schedule Popup (Zoho One-Liner Aesthetic) ─────────────────────
const QuickSchedulePopup = ({ position, events, onClose, onSave, onMoreOptions, defaultColor }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(position.date);
  const [startTime, setStartTime] = useState(position.startTime);
  const [endTime, setEndTime] = useState(position.endTime);
  
  // States for the new features
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
  const [eventColor, setEventColor] = useState(defaultColor || EVENT_COLORS[0].hex);
  const [agenda, setAgenda] = useState('');
  
  // UI States
  const [activePicker, setActivePicker] = useState(null); // 'date', 'startTime', 'endTime', 'platform', 'color'
  const inputRef = useRef(null);

  const isPast = useMemo(() => {
    const start = dayjs(`${date.format('YYYY-MM-DD')} ${startTime}`, 'YYYY-MM-DD h:mm A');
    return start.isBefore(dayjs());
  }, [date, startTime]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title.trim(), { 
      date, 
      startTime, 
      endTime, 
      platform: selectedPlatform.id,
      attendees,
      color: eventColor,
      agenda: agenda.trim()
    });
  };

  const addAttendee = () => {
    if (attendeeInput.trim() && !attendees.includes(attendeeInput.trim())) {
      setAttendees([...attendees, attendeeInput.trim()]);
      setAttendeeInput('');
    }
  };

  const handleStartTimeChange = (newTime) => {
    setStartTime(newTime);
    const start = dayjs(`2026-01-01 ${newTime}`, 'YYYY-MM-DD h:mm A');
    if (start.isValid()) {
      setEndTime(start.add(30, 'minute').format('h:mm A'));
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.98, opacity: 0 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="zoho-quick-popup"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => {
        e.stopPropagation();
        setActivePicker(null);
      }}
    >
      {isPast && (
        <div className="zoho-popup-warning">
          <AlertCircle size={16} />
          <span>The event you are creating is in the past</span>
        </div>
      )}

      <button className="zoho-popup-close" onClick={onClose}><X size={16} /></button>

      <div className="zoho-popup-content">
        {/* Title & Color Row */}
        <div className="zoho-row">
          <div className="zoho-icon-col relative">
            <div 
              className="zoho-title-circle cursor-pointer" 
              style={{ backgroundColor: eventColor }} 
              onClick={(e) => { e.stopPropagation(); setActivePicker(activePicker === 'color' ? null : 'color'); }}
            />
            <AnimatePresence>
              {activePicker === 'color' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="zoho-color-popover"
                >
                  {EVENT_COLORS.map(c => (
                    <div 
                      key={c.hex} 
                      className="zoho-color-option" 
                      style={{ backgroundColor: c.hex }}
                      onClick={() => { setEventColor(c.hex); setActivePicker(null); }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="zoho-input-col">
            <input
              ref={inputRef}
              className="zoho-title-input"
              placeholder="Add a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Time & Date Row */}
        <div className="zoho-row">
          <div className="zoho-icon-col"><Clock size={18} className="zoho-icon" /></div>
          <div className="zoho-input-col flex-row gap-2">
            <div className="zoho-datetime-box" onClick={(e) => { e.stopPropagation(); setActivePicker(activePicker === 'date' ? null : 'date'); }}>
              {date.format('DD MMM YYYY')}
            </div>
            <div className="zoho-datetime-box" onClick={(e) => { e.stopPropagation(); setActivePicker(activePicker === 'startTime' ? null : 'startTime'); }}>
              {startTime}
            </div>
            <div className="zoho-arrow">→</div>
            <div className="zoho-datetime-box" onClick={(e) => { e.stopPropagation(); setActivePicker(activePicker === 'endTime' ? null : 'endTime'); }}>
              {endTime}
            </div>

            <AnimatePresence>
              {activePicker === 'date' && (
                <div className="zoho-picker-anchor"><DatePicker selectedDate={date} onSelect={setDate} onClose={() => setActivePicker(null)} /></div>
              )}
              {activePicker === 'startTime' && (
                <div className="zoho-picker-anchor"><TimePicker selectedTime={startTime} onSelect={handleStartTimeChange} onClose={() => setActivePicker(null)} /></div>
              )}
              {activePicker === 'endTime' && (
                <div className="zoho-picker-anchor"><TimePicker selectedTime={endTime} onSelect={(t) => { setEndTime(t); setActivePicker(null); }} onClose={() => setActivePicker(null)} /></div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Participants Row */}
        <div className="zoho-row items-start">
          <div className="zoho-icon-col pt-1"><Users size={18} className="zoho-icon" /></div>
          <div className="zoho-input-col">
            <div className="zoho-attendee-container">
              {attendees.map(email => {
                const color = getAvatarColor(email);
                return (
                  <div key={email} className="zoho-attendee-chip">
                    <div className="zoho-chip-avatar" style={{ backgroundColor: `${color}20`, color }}>
                      {email.substring(0, 1).toUpperCase()}
                    </div>
                    <span>{email}</span>
                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => setAttendees(attendees.filter(a => a !== email))} />
                  </div>
                );
              })}
              <input 
                className="zoho-inline-input" 
                placeholder="Add participants by email..."
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addAttendee();
                }}
              />
            </div>
          </div>
        </div>

        {/* Platform Row */}
        <div className="zoho-row">
          <div className="zoho-icon-col"><Video size={18} className="zoho-icon" /></div>
          <div className="zoho-input-col">
            <div className="relative w-full">
              <div 
                className="zoho-select-box" 
                onClick={(e) => { e.stopPropagation(); setActivePicker(activePicker === 'platform' ? null : 'platform'); }}
              >
                <div className="flex items-center gap-2">
                  {selectedPlatform.icon}
                  <span>{selectedPlatform.name}</span>
                </div>
                <ChevronDown size={14} />
              </div>
              
              <AnimatePresence>
                {activePicker === 'platform' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="zoho-platform-dropdown"
                  >
                    {PLATFORMS.map(p => {
                      return (
                        <div 
                          key={p.id} 
                           className="zoho-dropdown-item"
                          onClick={() => { setSelectedPlatform(p); setActivePicker(null); }}
                        >
                          {p.icon}
                          <span>{p.name}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Agenda Row */}
        <div className="zoho-row items-start">
          <div className="zoho-icon-col pt-1"><AlignLeft size={18} className="zoho-icon" /></div>
          <div className="zoho-input-col">
            <textarea
              className="zoho-agenda-textarea"
              placeholder="Add agenda or description..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="zoho-popup-footer">
        <button className="zoho-btn-save" onClick={handleSave} disabled={!title.trim()}>Save</button>
        <button className="zoho-btn-more" onClick={() => onMoreOptions({ date, startTime, attendees, agenda: agenda.trim() })}>More Options</button>
      </div>
    </motion.div>
  );
};

// ── CalendarGrid ───────────────────────────────────────────────────
const CalendarGrid = ({
  viewDate,
  activeView,
  events,
  showWeekends,
  showWeekNumbers,
  onDateClick,
  onQuickSave,
  onEventSelect,
  selectedEventId,
  defaultColor,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [nowPos, setNowPos] = useState(0);
  const [nowTime, setNowTime] = useState('');
  const [quickSchedule, setQuickSchedule] = useState(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // Measure scrollbar width dynamically to align header columns with body columns
  useEffect(() => {
    const updateScrollbarWidth = () => {
      if (scrollRef.current) {
        const width = scrollRef.current.offsetWidth - scrollRef.current.clientWidth;
        setScrollbarWidth(width);
      }
    };
    updateScrollbarWidth();
    const timer = setTimeout(updateScrollbarWidth, 100);
    window.addEventListener('resize', updateScrollbarWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollbarWidth);
    };
  }, [activeView, showWeekends, showWeekNumbers]);

  // ── Real-time now position (updates every minute) ──
  useEffect(() => {
    const updateNow = () => {
      const now = dayjs();
      const mins = now.hour() * 60 + now.minute();
      setNowPos(mins); // 1px = 1min
      setNowTime(now.format('h:mm A'));
    };
    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Scroll to current time on mount (or view change) ──
  useEffect(() => {
    if (scrollRef.current && activeView !== 'Month') {
      const now = dayjs();
      const currentMins = now.hour() * 60 + now.minute();
      // Show 2 hours before current time
      const targetScroll = Math.max(0, currentMins - 120);
      requestAnimationFrame(() => {
        scrollRef.current.scrollTop = targetScroll;
      });
    }
  }, [activeView]);

  // ── Visible days for week / day view ──
  const weekDays = useMemo(() => {
    const start = viewDate.startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
    if (!showWeekends && activeView !== 'Month') {
      return days.filter((d) => d.day() !== 0 && d.day() !== 6);
    }
    return days;
  }, [viewDate, showWeekends, activeView]);

  const weekNumber = useMemo(() => viewDate.isoWeek(), [viewDate]);

  // ── Click on empty grid area → show QuickSchedule ──
  const handleGridClick = (e, date) => {
    // Stop propagation so parent containers don't eat this click
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    // y position within column is e.clientY - rect.top (rect.top dynamically includes scroll offset)
    const y = e.clientY - rect.top;
    const clickedMins = Math.max(0, Math.floor(y));
    const startHour = Math.floor(clickedMins / 60);
    const startMin = Math.floor((clickedMins % 60) / 15) * 15; // snap to 15-min

    const startTime = dayjs(date).hour(startHour).minute(startMin);
    const endTime = startTime.add(30, 'minute'); // Default to half an hour schedule

    const popupWidth = 480; // Match .zoho-quick-popup CSS width
    const popupHeight = 420; // Safe vertical height estimate

    // 1. Accurate Horizontal Positioning:
    // Finds the columns container to constrain positioning within grid boundaries
    const container = e.currentTarget.parentElement;
    const containerRect = container ? container.getBoundingClientRect() : null;
    
    let popupX;
    const isNarrowColumn = rect.width < 250;
    
    if (isNarrowColumn && containerRect) {
      popupX = rect.right + 12;
      // If it overflows the columns container on the right, place it to the left of the column
      if (popupX + popupWidth > containerRect.right) {
        popupX = rect.left - popupWidth - 12;
      }
    } else {
      popupX = e.clientX + 16;
      // If it overflows the viewport on the right, place it to the left of the click
      if (popupX + popupWidth > window.innerWidth) {
        popupX = e.clientX - popupWidth - 16;
      }
    }
    
    // Ensure it doesn't go off the left edge of the viewport
    if (popupX < 16) {
      popupX = 16;
    }

    // 2. Accurate Vertical Positioning:
    // Calculates the viewport Y coordinate of the snapped 30-minute block
    const snappedMins = startHour * 60 + startMin;
    const snappedY = rect.top + snappedMins;
    
    // Centers the popup vertically relative to the 30px snapped slot (15px is the center)
    let popupY = snappedY + 15 - (popupHeight / 2);

    // Enforce viewport boundaries
    if (popupY + popupHeight > window.innerHeight - 16) {
      popupY = window.innerHeight - popupHeight - 16;
    }
    if (popupY < 80) {
      popupY = 80; // Avoid overlapping top headers
    }

    setQuickSchedule({
      x: popupX,
      y: popupY,
      date: dayjs(date),
      startTime: startTime.format('h:mm A'),
      endTime: endTime.format('h:mm A'),
      rawStart: startTime,
      gridY: startHour * 60 + startMin, // Snapped minute position for ghost block
    });

    if (onEventSelect) onEventSelect(null);
  };

  const handleEventClick = (e, ev) => {
    e.stopPropagation();
    setQuickSchedule(null);
    if (onEventSelect) onEventSelect(ev);
  };

  // ── Compute tiled layout for overlapping events ──
  // Returns array of { event, left, width } with correct side-by-side positioning
  const getEventLayout = (dayEvents) => {
    // Sort by start time, then by title for determinism
    const sorted = [...dayEvents].sort((a, b) => {
      const diff = dayjs(a.start).diff(dayjs(b.start));
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    });

    const layouts = sorted.map((ev) => {
      // Find all events that temporally overlap with ev (including ev itself)
      const overlapGroup = sorted.filter(
        (other) =>
          dayjs(ev.start).isBefore(dayjs(other.end)) &&
          dayjs(ev.end).isAfter(dayjs(other.start))
      );
      // My position within the overlap group
      const myIndex = overlapGroup.findIndex((o) => o.id === ev.id);
      const groupSize = overlapGroup.length;

      const widthPct = groupSize > 1 ? 88 / groupSize : 92;
      const leftPct = groupSize > 1 ? myIndex * (88 / groupSize) : 4;

      return {
        event: ev,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      };
    });

    return layouts;
  };

  // ── Week / Day View ───────────────────────────────────────────────
  if (activeView === 'Week' || activeView === 'Day') {
    const displayDays = activeView === 'Day' ? [viewDate] : weekDays;
    const isCurrentWeek =
      activeView === 'Week'
        ? viewDate.isSame(dayjs(), 'week')
        : viewDate.isSame(dayjs(), 'day');

    return (
      <div className="calendar-grid-container">
        {/* Day column headers */}
        <div className="grid-header-row" style={{ paddingRight: scrollbarWidth }}>
          <div className="time-gutter-header">
            {showWeekNumbers && (
              <span className="week-num-label">W{weekNumber}</span>
            )}
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              GMT+5:30
            </span>
          </div>
          {displayDays.map((day, i) => {
            const isToday = day.isSame(dayjs(), 'day');
            return (
              <div
                key={i}
                className={`day-column-header ${isToday ? 'today-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDateClick) onDateClick(day);
                }}
              >
                <span className="day-abbr">{day.format('ddd')}</span>
                <span className={`day-number ${isToday ? 'today' : ''}`}>
                  {day.date()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div className="grid-scroll-area" ref={scrollRef}>
          {/* Time gutter */}
          <div className="time-gutter">
            {Array.from({ length: 25 }).map((_, h) => (
              <div
                key={h}
                className="hour-label"
                style={{ top: h * 60 }} // 1px = 1min
              >
                {h === 0
                  ? ''
                  : h > 12
                  ? `${h - 12} pm`
                  : h === 12
                  ? '12 pm'
                  : `${h} am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="grid-columns-container">
            {displayDays.map((day, i) => {
              const isToday = day.isSame(dayjs(), 'day');
              const dayEvents = events.filter((ev) =>
                dayjs(ev.start).isSame(day, 'day')
              );
              const layouts = getEventLayout(dayEvents);

              return (
                <div
                  key={i}
                  className={`grid-day-column ${isToday ? 'today-highlight' : ''}`}
                  onClick={(e) => handleGridClick(e, day)}
                >
                  {/* Ghost Block */}
                  {quickSchedule && quickSchedule.date.isSame(day, 'day') && (
                    <div 
                      className="ghost-event-block"
                      style={{
                        top: quickSchedule.gridY,
                        height: 26, // 30 mins (default)
                        width: '92%',
                        left: '4%',
                      }}
                    >
                      New event
                    </div>
                  )}

                  {layouts.map(({ event: ev, left, width }) => {
                    const startMins =
                      dayjs(ev.start).hour() * 60 + dayjs(ev.start).minute();
                    const duration = dayjs(ev.end).diff(dayjs(ev.start), 'minute');
                    const isSelected = selectedEventId === ev.id;
                    const isDeclined = ev.rsvpStatus === 'Declined';

                    // Zoho card: selected = solid fill, unselected = tinted bg
                    const bgColor = isSelected
                      ? ev.color
                      : `${ev.color}1A`; // 10% opacity
                    const textColor = isSelected ? '#fff' : ev.color;

                    return (
                      <div
                        key={ev.id}
                        className={`event-block ${isDeclined ? 'declined' : ''} ${isSelected ? 'is-selected' : ''}`}
                        style={{
                          top: startMins, // 1px = 1min
                          height: Math.max(duration, 22),
                          backgroundColor: bgColor,
                          color: textColor,
                          borderLeftColor: ev.color,
                          left,
                          width,
                          zIndex: isSelected ? 90 : 10,
                        }}
                        onClick={(e) => handleEventClick(e, ev)}
                        title={`${ev.title}\n${dayjs(ev.start).format('h:mm A')} – ${dayjs(ev.end).format('h:mm A')}`}
                      >
                        <div className="event-title">{ev.title}</div>
                        {duration >= 30 && (
                          <div className="event-time">
                            {dayjs(ev.start).format('h:mm A')}
                            {duration >= 45 && ` – ${dayjs(ev.end).format('h:mm A')}`}
                          </div>
                        )}
                        {/* Platform icon for tall events */}
                        {duration >= 60 && ev.platform && (
                          <div style={{
                            position: 'absolute',
                            bottom: 5,
                            right: 7,
                            opacity: 0.55,
                            display: 'flex',
                            alignItems: 'center',
                          }}>
                            {ev.platform?.toLowerCase().includes('meet') ||
                            ev.platform?.toLowerCase().includes('google') ||
                            ev.platform?.toLowerCase().includes('video') ? (
                              <Video size={10} />
                            ) : (
                              <MapPin size={10} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Horizontal grid lines overlay — spans full width of all columns */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {Array.from({ length: 25 }).map((_, h) => (
                <React.Fragment key={h}>
                  <div className="hour-line" style={{ top: h * 60 }} />
                  {h < 24 && (
                    <div className="half-hour-line" style={{ top: h * 60 + 30 }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Now indicator — only visible when current week/day is in view */}
            {isCurrentWeek && (
              <div
                className="now-indicator"
                style={{ top: nowPos }}
                title={`Now · ${nowTime}`}
              >
                <div className="now-dot" />
              </div>
            )}
          </div>
        </div>

        {/* Quick Schedule Popup */}
        <AnimatePresence>
          {quickSchedule && (
            <>
              <div className="quick-create-overlay" onClick={() => setQuickSchedule(null)} />
              <QuickSchedulePopup
                position={quickSchedule}
                events={events}
                defaultColor={defaultColor}
                onClose={() => setQuickSchedule(null)}
                onSave={(title, extraData) => {
                  onQuickSave(title, { ...quickSchedule, ...extraData });
                  setQuickSchedule(null);
                }}
                onMoreOptions={(extraData) => {
                  const dateStr = extraData?.date?.format('YYYY-MM-DD') || quickSchedule.date.format('YYYY-MM-DD');
                  const timeStr = extraData?.startTime || quickSchedule.startTime;
                  const selectedCol = extraData?.color || defaultColor;
                  setQuickSchedule(null);
                  navigate(
                    `/dashboard/schedule-meeting?date=${dateStr}&time=${encodeURIComponent(timeStr)}${selectedCol ? `&color=${encodeURIComponent(selectedCol)}` : ''}`
                  );
                }}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Month View ────────────────────────────────────────────────────
  if (activeView === 'Month') {
    const startOfMonth = viewDate.startOf('month');
    const endOfMonth = viewDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const calendarDays = [];
    let curr = startDate;
    while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
      calendarDays.push(curr);
      curr = curr.add(1, 'day');
    }

    return (
      <div className="calendar-grid-container">
        {/* Month day-name header */}
        <div
          className="grid-header-row"
          style={{ height: 36, alignItems: 'center' }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--cg-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRight: '1px solid var(--cg-border-light)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="month-grid">
          {calendarDays.map((day, i) => {
            const isToday = day.isSame(dayjs(), 'day');
            const isOtherMonth = !day.isSame(viewDate, 'month');
            const dayEvents = events.filter((ev) =>
              dayjs(ev.start).isSame(day, 'day')
            );

            return (
              <div
                key={i}
                className={`month-cell ${isToday ? 'today-cell' : ''} ${
                  isOtherMonth ? 'other-month' : ''
                }`}
                onClick={() => {
                  if (onDateClick) onDateClick(day);
                }}
              >
                <div
                  className={`month-date-num ${isToday ? 'today' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDateClick) onDateClick(day);
                  }}
                >
                  {day.date()}
                </div>

                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="event-chip"
                    style={{
                      backgroundColor: `${ev.color}18`,
                      color: ev.color,
                      borderLeftColor: ev.color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEventSelect) onEventSelect(ev);
                    }}
                  >
                    {ev.title}
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div className="more-events-link">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Schedule Popup for Month view */}
        <AnimatePresence>
          {quickSchedule && (
            <>
              <div className="quick-create-overlay" onClick={() => setQuickSchedule(null)} />
              <QuickSchedulePopup
                position={quickSchedule}
                events={events}
                defaultColor={defaultColor}
                onClose={() => setQuickSchedule(null)}
                onSave={(title, extraData) => {
                  onQuickSave(title, { ...quickSchedule, ...extraData });
                  setQuickSchedule(null);
                }}
                onMoreOptions={(extraData) => {
                  const dateStr = extraData?.date?.format('YYYY-MM-DD') || quickSchedule.date.format('YYYY-MM-DD');
                  const timeStr = extraData?.startTime || quickSchedule.startTime;
                  const selectedCol = extraData?.color || defaultColor;
                  setQuickSchedule(null);
                  navigate(
                    `/dashboard/schedule-meeting?date=${dateStr}&time=${encodeURIComponent(timeStr)}${selectedCol ? `&color=${encodeURIComponent(selectedCol)}` : ''}`
                  );
                }}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
};

export default CalendarGrid;
