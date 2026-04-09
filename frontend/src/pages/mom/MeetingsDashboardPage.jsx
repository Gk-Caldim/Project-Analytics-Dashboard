import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, Plus, Search,
  Play, FileText, CheckCircle2,
  RefreshCw, Users, MoreHorizontal, Sun, Archive, Trash, Download, RotateCcw,
  Sparkles, X, ChevronRight, FilePlus
} from 'lucide-react';
import './MeetingsDashboardPage.css';
import API from '../../utils/api';

const MeetingsDashboardPage = () => {
  const navigate = useNavigate();

  // State
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeNow, setTimeNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, mom, no_mom

  // AI Context Panel State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTargetMeeting, setAiTargetMeeting] = useState(null);
  const [aiContextText, setAiContextText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Animated Count-up Helper
  const useCountUp = (end, duration = 600) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      if (end === null || end === undefined) return;
      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, [end, duration]);
    return count;
  };

  // Fetch Logic
  const fetchMeetings = async () => {
    try {
      const resp = await API.get('/meetings');
      if (resp.data && resp.data.success) {
        setMeetings(resp.data.meetings);
      }
    } catch (err) {
      setError('Failed to load meetings calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Time Engine
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Helpers
  const parseMeetingTimes = (m) => {
    const dateStr = m.date;
    let [time, modifier] = (m.time || '12:00 AM').split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();

    const startTime = new Date(`${dateStr}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
    const endTime = new Date(startTime.getTime() + (parseInt(m.duration || 60) * 60000));
    const startingSoonTime = new Date(startTime.getTime() - (10 * 60000));

    return { startTime, endTime, startingSoonTime };
  };

  const getMeetingState = (m) => {
    if (m.status === 'cancelled') return 'cancelled';
    const { startTime, endTime, startingSoonTime } = parseMeetingTimes(m);
    if (timeNow > endTime) return 'completed';
    if (timeNow >= startTime && timeNow <= endTime) return 'live';
    if (timeNow >= startingSoonTime && timeNow < startTime) return 'starting';
    return 'scheduled';
  };

  // derived lists
  const activeMeetings = meetings.filter(m => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return m.title.toLowerCase().includes(term);
    }
    return true;
  });

  const liveMeetings = activeMeetings.filter(m => {
    const s = getMeetingState(m);
    return s === 'live' || s === 'starting';
  });

  const upcomingMeetings = activeMeetings
    .filter(m => getMeetingState(m) === 'scheduled')
    .sort((a, b) => parseMeetingTimes(a).startTime - parseMeetingTimes(b).startTime);

  const completedMeetings = activeMeetings
    .filter(m => getMeetingState(m) === 'completed' || getMeetingState(m) === 'cancelled')
    .sort((a, b) => parseMeetingTimes(b).startTime - parseMeetingTimes(a).startTime);

  // Filter history
  const filteredHistory = completedMeetings.filter(m => {
    if (activeFilter === 'mom') return m.mom_generated;
    if (activeFilter === 'no_mom') return !m.mom_generated;
    return true;
  });

  // Calculate 7 day strip
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const dayStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const dayEvents = upcomingMeetings.filter(m => m.date === dayStr);

    return {
      date: d,
      events: dayEvents
    }
  });

  // Analytics Logic - Strictly Truthy
  const currentMonthCount = meetings.filter(m => m.date.startsWith(today.toLocaleDateString("en-CA").substring(0, 7))).length;
  const recordedDurations = meetings.map(m => m.actual_duration_minutes).filter(d => d !== null && d !== undefined);
  const avgDuration = recordedDurations.length > 0 ? Math.round(recordedDurations.reduce((a, b) => a + b, 0) / recordedDurations.length) : null;
  const recordedAttendance = meetings.map(m => m.attendance_rate).filter(a => a !== null && a !== undefined);
  const avgAttendance = recordedAttendance.length > 0 ? Math.round(recordedAttendance.reduce((a, b) => a + b, 0) / recordedAttendance.length) : null;

  const animCurrentMonthCount = useCountUp(currentMonthCount);
  const animAvgDuration = useCountUp(avgDuration);
  const animAvgAttendance = useCountUp(avgAttendance);

  // AI Generation Trigger
  const triggerMomGeneration = (m) => {
    // Gate requirement: Must have context (agenda, notes) OR some attendance.
    // E.g. we simulate that checking by existence of agenda_text, or real attendance rate
    const hasContext = !!m.agenda_text || (m.attendance_rate > 0);

    if (hasContext) {
      // Navigate to generation or run generation directly
      alert(`Generating MOM for ${m.title}...`);
      navigate(`/dashboard/mom`);
    } else {
      // Open Side Panel to collect context manually
      setAiTargetMeeting(m);
      setAiContextText('');
      setAiPanelOpen(true);
    }
  };

  const submitManualContext = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setAiPanelOpen(false);
      alert('Context submitted and MOM successfully generated.');
      setMeetings(meetings.map(m => m.id === aiTargetMeeting.id ? { ...m, mom_generated: true } : m));
    }, 1500);
  };

  if (loading) return <div className="h-full flex items-center justify-center p-8"><RefreshCw className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="mom-page meetings-dashboard-page h-full overflow-y-auto w-full flex relative bg-gray-50/20">
      <div className="flex-1 p-[24px_32px] space-y-10">

        {/* Header - Strictly Hierarchy */}
        <div className="animate-fadeInUp flex flex-col md:flex-row justify-between items-start md:items-center gap-8" style={{ animationDelay: '50ms' }}>
          <div>
            <h1 className="text-[40px] leading-tight font-extrabold text-gray-900 tracking-tight">Manage
              Meetings</h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all font-medium shadow-sm"
              />
            </div>
            {/* Primary Button */}
            <button
              onClick={() => navigate('/dashboard/schedule-meeting')}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Schedule
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">

          {/* Left Column (Priority: Live & Upcoming Strip) */}
          <div className="xl:col-span-2 space-y-16 animate-fadeInUp" style={{ animationDelay: '100ms' }}>

            {/* LIVE MEETINGS */}
            {liveMeetings.length > 0 && (
              <section className="animate-fadeIn space-y-4">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Action Required Now
                </h2>
                <div className="space-y-4">
                  {liveMeetings.map(m => (
                    <div
                      key={m.id}
                      className="bg-white border border-red-100 hover:border-red-300 shadow-sm rounded-xl p-4 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 cursor-pointer transition-colors relative overflow-hidden"
                      onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-red-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div> Live
                          </span>
                          <span className="text-gray-500 text-xs font-semibold tracking-wider uppercase">{m.time} • {m.duration}m</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{m.title}</h3>
                        <p className="text-sm text-gray-600 font-medium">
                          <strong className="text-gray-900">{m.attendees?.length || 0}</strong> Attendees waiting in lobby
                        </p>
                      </div>

                      <div className="w-full md:w-auto mt-4 md:mt-0">
                        {/* Primary Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/meeting/${m.id}`); }}
                          className="w-full md:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-sm font-extrabold shadow-sm transition-all active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" /> Enter Lobby
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* UPCOMING EVENTS - 7 Day Calendar Week View */}
            <section className="space-y-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming Track
              </h2>

              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm overflow-x-auto custom-scrollbar">
                <div className="flex gap-4 min-w-max">
                  {weekDays.map((day, idx) => {
                    const isToday = idx === 0;
                    return (
                      <div key={idx} className={`w-40 min-h-[100px] flex flex-col rounded-2xl p-[12px_8px] border ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-transparent border-gray-100'}`}>

                        <div className="flex flex-col items-center border-b border-gray-200 pb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                            {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className={`text-xl font-extrabold mt-0.5 ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {day.date.getDate()}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center pt-1 min-h-[60px]">
                          {day.events.length === 0 ? (
                            <div className="flex-1 flex items-start justify-center pt-2">
                              <button
                                onClick={() => navigate('/dashboard/schedule-meeting', { state: { prefilledDate: day.date.toISOString() } })}
                                className="text-[10px] text-gray-400 hover:text-indigo-600 font-semibold text-center leading-relaxed transition-colors group"
                              >
                                No meetings scheduled
                                <span className="block text-indigo-400 group-hover:text-indigo-600 font-bold mt-0.5">+ Add one</span>
                              </button>
                            </div>
                          ) : (
                            day.events.map((e, eIdx) => (
                              <div key={eIdx} onClick={() => navigate(`/dashboard/meeting/${e.id}`)} className="bg-indigo-50/50 border border-indigo-100 border-l-2 border-l-indigo-500 rounded-xl p-3 cursor-pointer hover:bg-indigo-100 hover:shadow-sm transition-all group">
                                <div className="text-[9px] font-extrabold text-indigo-600 tracking-wider mb-0.5 uppercase flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {e.time}
                                </div>
                                <div className="text-xs font-bold text-gray-900 leading-tight truncate">{e.title}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {upcomingMeetings.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm space-y-8">
                  <h3 className="text-2xl font-extrabold text-gray-900">Your calendar is clear</h3>
                  <p className="text-base font-medium text-gray-500 max-w-md">No schedule blocks found. Secure uninterrupted deep work or orchestrate an alignment session.</p>
                  {/* Secondary Outline Button */}
                  <button onClick={() => navigate('/dashboard/schedule-meeting')} className="bg-transparent border-2 border-indigo-600 text-indigo-600 font-extrabold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors active:scale-95">
                    Schedule Block
                  </button>
                </div>
              )}
            </section>

          </div>

          {/* Right Column (Analytics & History) */}
          <div className="space-y-16 animate-fadeInUp" style={{ animationDelay: '150ms' }}>

            {/* Aggregate Stats Bar */}
            <div className="bg-white border border-gray-200 border-l-4 border-l-indigo-200 rounded-2xl p-8 shadow-sm relative overflow-hidden space-y-8">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Analytics</h2>

              <div className="flex justify-between items-center text-gray-900 relative z-10 divide-x divide-gray-100">
                <div className="text-center flex-1 px-2">
                  <span className="block text-[32px] leading-none font-black text-gray-900">{animCurrentMonthCount}</span>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Booked</span>
                </div>
                <div className="text-center flex-1 px-2">
                  {avgDuration ? (
                    <span className="block text-[32px] leading-none font-black text-gray-900">{animAvgDuration}<span className="text-base text-gray-500 ml-1">m</span></span>
                  ) : (
                    <span
                      className="block text-[28px] leading-none font-black text-gray-400 mt-1 cursor-default"
                      title="Available after meetings are logged"
                    >—</span>
                  )}
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Avg Session</span>
                </div>
                <div className="text-center flex-1 px-2">
                  {avgAttendance !== null ? (
                    <span className="block text-[32px] leading-none font-black text-indigo-600">{animAvgAttendance}<span className="text-base text-gray-400 ml-1">%</span></span>
                  ) : (
                    <span
                      className="block text-[28px] leading-none font-black text-gray-400 mt-1 cursor-default"
                      title="Available after meetings are logged"
                    >—</span>
                  )}
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Turnout</span>
                </div>
              </div>
            </div>

            {/* History Panel */}
            <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Log & Audit
                </h2>
                <div className="bg-gray-50 p-1 flex rounded-lg border border-gray-200">
                  <button onClick={() => setActiveFilter('all')} className={`text-xs font-bold px-4 py-2 rounded-md transition-colors ${activeFilter === 'all' ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>All</button>
                  <button onClick={() => setActiveFilter('mom')} className={`text-xs font-bold px-4 py-2 rounded-md transition-colors ${activeFilter === 'mom' ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>Has MOM</button>
                  <button onClick={() => setActiveFilter('no_mom')} className={`text-xs font-bold px-4 py-2 rounded-md transition-colors ${activeFilter === 'no_mom' ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>No MOM</button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-16 text-center space-y-4">
                  <Archive className="w-10 h-10 text-gray-200" />
                  <p className="text-sm font-medium text-gray-500 italic">No historical records match parameters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.slice(0, 8).map(m => {
                    const s = getMeetingState(m);
                    return (
                      <div
                        key={m.id}
                        onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                        className="group flex items-center justify-between px-4 h-[52px] bg-white border border-gray-100 rounded-xl hover:border-l-2 hover:border-l-indigo-500 hover:bg-[#f8f8ff] transition-all shadow-sm cursor-pointer"
                      >
                        <div className="flex flex-col overflow-hidden">
                          <h4 className="text-[14px] font-[500] text-gray-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">{m.title}</h4>
                          <span className="text-[12px] text-gray-500 font-medium">{m.date}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {m.status === 'cancelled' ? (
                             <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-widest">Cancelled</span>
                          ) : m.mom_generated ? (
                             <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-widest">Completed</span>
                          ) : (
                             <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-widest">Pending</span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                    )
                  })}

                  {filteredHistory.length > 5 && (
                    <button className="w-full text-center text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-gray-700 pt-4 pb-2 transition-colors">
                      View Deep History
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>

        </div>
      </div>

      {/* 
         AI CONTEXT SIDE PANEL 
         Standard: "Clicking opens a side panel — not a modal — to collect context first"
      */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${aiPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Provide Context
          </h2>
          {/* Tertiary Icon action */}
          <button onClick={() => setAiPanelOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 mb-1">{aiTargetMeeting?.title}</h3>
            <p className="text-xs text-gray-500 font-medium">No recorded duration, transcript, or agenda found. Give the orchestrator data to synthesize.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Manual Notes / Transcript Dump</label>
            <textarea
              className="w-full min-h-[300px] border border-gray-300 rounded-xl p-4 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:border-indigo-500"
              placeholder="Paste any rough notes from the meeting..."
              value={aiContextText}
              onChange={e => setAiContextText(e.target.value)}
            />
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50">
          {/* Primary Final Action */}
          <button
            onClick={submitManualContext}
            disabled={aiContextText.trim().length === 0 || aiGenerating}
            className="w-full py-4 text-sm font-extrabold uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {aiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
            {aiGenerating ? 'Synthesizing...' : 'Generate MOM'}
          </button>
        </div>
      </div>

      {/* Overlay to dismiss panel */}
      {aiPanelOpen && <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-[1px] z-40 transition-opacity" onClick={() => setAiPanelOpen(false)}></div>}

    </div>
  );
};

export default MeetingsDashboardPage;
