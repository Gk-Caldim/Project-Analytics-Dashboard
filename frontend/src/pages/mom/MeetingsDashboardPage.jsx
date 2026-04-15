import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Plus, Search,
  Play, RefreshCw, Users, ChevronRight,
  BarChart2, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';
import './MeetingsDashboardPage.css';
import API from '../../utils/api';

const MeetingsDashboardPage = () => {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [timeNow, setTimeNow] = useState(new Date());

  // Fetch
  const fetchMeetings = async () => {
    try {
      const resp = await API.get('/meetings');
      if (resp.data?.success) setMeetings(resp.data.meetings);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, []);

  useEffect(() => {
    const t = setInterval(() => setTimeNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  // Helpers
  const parseTimes = (m) => {
    const dateStr = m.date;
    let [time, modifier] = (m.time || '12:00 AM').split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    const startTime = new Date(`${dateStr}T${hours.padStart(2,'0')}:${minutes.padStart(2,'0')}:00`);
    const endTime = new Date(startTime.getTime() + (parseInt(m.duration || 60) * 60000));
    return { startTime, endTime };
  };

  const getMeetingState = (m) => {
    if (m.status === 'cancelled') return 'cancelled';
    const { startTime, endTime } = parseTimes(m);
    const soon = new Date(startTime.getTime() - 10 * 60000);
    if (timeNow > endTime) return 'completed';
    if (timeNow >= startTime && timeNow <= endTime) return 'live';
    if (timeNow >= soon && timeNow < startTime) return 'starting';
    return 'scheduled';
  };

  // Derived
  const searched = meetings.filter(m =>
    !searchTerm || m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const liveMeetings = searched.filter(m => {
    const s = getMeetingState(m);
    return s === 'live' || s === 'starting';
  });

  const upcomingMeetings = searched
    .filter(m => getMeetingState(m) === 'scheduled')
    .sort((a, b) => parseTimes(a).startTime - parseTimes(b).startTime);

  const completedMeetings = searched
    .filter(m => ['completed', 'cancelled'].includes(getMeetingState(m)))
    .sort((a, b) => parseTimes(b).startTime - parseTimes(a).startTime);

  const filteredHistory = completedMeetings.filter(m => {
    if (activeFilter === 'mom') return m.mom_generated;
    if (activeFilter === 'no_mom') return !m.mom_generated;
    return true;
  });

  // Insights
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toLocaleDateString('en-CA');
  const monthStr = todayStr.substring(0, 7);

  const totalMeetings = meetings.length;
  const todayMeetings = meetings.filter(m => m.date === todayStr).length;
  const delayedActions = meetings.filter(m => getMeetingState(m) === 'completed' && !m.mom_generated).length;

  // 7-day calendar
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayStr = d.toLocaleDateString('en-CA');
    return {
      date: d,
      events: upcomingMeetings.filter(m => m.date === dayStr),
    };
  });

  // Status display info
  const getStatusInfo = (m) => {
    const s = getMeetingState(m);
    if (s === 'cancelled') return { label: 'Cancelled', cls: 'cancelled' };
    if (s === 'live' || s === 'starting') return { label: 'Live', cls: 'live' };
    if (s === 'completed') return m.mom_generated
      ? { label: 'Completed', cls: 'completed' }
      : { label: 'Pending MOM', cls: 'pending' };
    return { label: 'Scheduled', cls: 'live' };
  };

  if (loading) return (
    <div className="mdp-root">
      <div className="mdp-loading-center">
        <RefreshCw className="animate-spin text-indigo-500" style={{ width: 28, height: 28 }} />
      </div>
    </div>
  );

  return (
    <div className="mdp-root">

      {/* ── Top Bar ── */}
      <div className="mdp-topbar">
        <div className="mdp-topbar-left">
          <h1>Manage Meetings</h1>
        </div>
        <div className="mdp-topbar-right">
          <div className="mdp-search-wrap">
            <Search />
            <input
              id="mdp-search"
              type="text"
              className="mdp-search-input"
              placeholder="Search meetings…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            id="mdp-schedule-btn"
            className="mdp-btn-schedule"
            onClick={() => navigate('/dashboard/schedule-meeting')}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mdp-body">

        {/* 1. Meeting Insights */}
        <div className="mdp-insights mdp-fade-up">
          <div className="mdp-insight-card">
            <div className="mdp-insight-icon indigo">
              <BarChart2 style={{ width: 18, height: 18 }} />
            </div>
            <div className="mdp-insight-body">
              <div className="mdp-insight-value">{totalMeetings}</div>
              <div className="mdp-insight-label">Total Meetings</div>
            </div>
          </div>

          <div className="mdp-insight-card">
            <div className="mdp-insight-icon emerald">
              <Calendar style={{ width: 18, height: 18 }} />
            </div>
            <div className="mdp-insight-body">
              <div className="mdp-insight-value">{todayMeetings}</div>
              <div className="mdp-insight-label">Upcoming Today</div>
            </div>
          </div>

          <div className="mdp-insight-card">
            <div className="mdp-insight-icon amber">
              <AlertCircle style={{ width: 18, height: 18 }} />
            </div>
            <div className="mdp-insight-body">
              <div className="mdp-insight-value">{delayedActions}</div>
              <div className="mdp-insight-label">Delayed MOM Actions</div>
            </div>
          </div>
        </div>

        {/* 2. Live Meetings Banner */}
        {liveMeetings.map(m => (
          <div
            key={m.id}
            className="mdp-live-banner mdp-fade-up"
            onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span className="mdp-live-badge">
                  <span className="mdp-live-dot" />
                  Live Now
                </span>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{m.time} · {m.duration}m</span>
              </div>
              <div className="mdp-live-title">{m.title}</div>
              <div className="mdp-live-meta">
                <Users style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                {m.attendees?.length || 0} attendees
              </div>
            </div>
            <button
              className="mdp-btn-enter"
              onClick={e => { e.stopPropagation(); navigate(`/dashboard/meeting/${m.id}`); }}
            >
              <Play style={{ width: 13, height: 13 }} />
              Enter Lobby
            </button>
          </div>
        ))}

        {/* 3. Upcoming Meetings — 7-Day Calendar Strip */}
        <div className="mdp-fade-up">
          <div className="mdp-section-header">
            <span className="mdp-section-title">
              <Calendar style={{ width: 13, height: 13 }} />
              Upcoming Meetings
            </span>
          </div>
          <div className="mdp-calendar-strip">
            <div className="mdp-calendar-days">
              {weekDays.map((day, idx) => (
                <div key={idx} className={`mdp-cal-day${idx === 0 ? ' today' : ''}`}>
                  <div className="mdp-cal-day-header">
                    <span className="mdp-cal-day-name">
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="mdp-cal-day-num">{day.date.getDate()}</span>
                  </div>
                  <div className="mdp-cal-events">
                    {day.events.length === 0 ? (
                      <div className="mdp-cal-empty">No meetings</div>
                    ) : (
                      day.events.map((ev, ei) => (
                        <div
                          key={ei}
                          className="mdp-cal-event-pill"
                          onClick={() => navigate(`/dashboard/meeting/${ev.id}`)}
                        >
                          <div className="mdp-cal-event-time">
                            <Clock style={{ width: 8, height: 8, display: 'inline', marginRight: 2 }} />
                            {ev.time}
                          </div>
                          <div className="mdp-cal-event-name">{ev.title}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Meeting History Table */}
        <div className="mdp-table-wrap mdp-fade-up">
          <div className="mdp-table-header">
            <span className="mdp-section-title">
              <CheckCircle2 style={{ width: 13, height: 13 }} />
              Meeting History
            </span>
            <div className="mdp-table-filter-group">
              {[
                { key: 'all', label: 'All' },
                { key: 'mom', label: 'Has MOM' },
                { key: 'no_mom', label: 'Pending' },
              ].map(f => (
                <button
                  key={f.key}
                  className={`mdp-table-filter-btn${activeFilter === f.key ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <table className="mdp-history-table">
            <thead>
              <tr>
                <th>Meeting Name</th>
                <th>Date</th>
                <th>Host</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr className="mdp-empty-row">
                  <td colSpan={5}>No records found</td>
                </tr>
              ) : (
                filteredHistory.map(m => {
                  const { label, cls } = getStatusInfo(m);
                  const host = m.attendees?.[0];
                  const hostName = typeof host === 'string'
                    ? host.split('@')[0]
                    : host?.name || host?.email?.split('@')[0] || '—';
                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                    >
                      <td>
                        <span className="mdp-meeting-name-cell">{m.title}</span>
                      </td>
                      <td>{m.date}</td>
                      <td>{hostName}</td>
                      <td>
                        <span className={`mdp-status-pill ${cls}`}>{label}</span>
                      </td>
                      <td>
                        <button
                          className="mdp-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/meeting/${m.id}`); }}
                        >
                          <Eye style={{ width: 11, height: 11 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default MeetingsDashboardPage;
