import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Calendar, Clock, Plus, Search,
  Play, RefreshCw, Users, ChevronRight,
  BarChart2, CheckCircle2, AlertCircle, Eye, FileText, ArrowRight, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './MeetingsDashboardPage.css';
import API from '../../utils/api';
import { setMomData, setMeetingContext } from '../../store/slices/momSlice';
import { useRef } from 'react';

const MeetingsDashboardPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Refs for scrolling
  const upcomingRef = useRef(null);
  const historyRef = useRef(null);

  // Read current saved MOM from Redux
  const { meetingId: savedMomId, meetingName: savedMomName, projectName: savedProjName, momData, lastSaved } = useSelector(s => s.mom);
  const hasSavedMom = momData && momData.length > 0;

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [timeNow, setTimeNow] = useState(new Date());
  
  // State for expand/collapse saved MOMs
  const [expandMoms, setExpandMoms] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);

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

  const handleDeleteMom = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this MOM?')) return;
    
    try {
      const res = await API.delete(`/mom/${meetingId}`);
      if (res.data?.success) {
        toast.success('MOM deleted successfully');
        fetchMeetings(); // Refresh list to update flags and history
      }
    } catch (err) {
      toast.error('Failed to delete MOM');
      console.error(err);
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

  const momHistory = completedMeetings.filter(m => m.mom_generated);
  const showMoreMoms = momHistory.length > 2;
  const displayedMoms = expandMoms ? momHistory : momHistory.slice(0, 2);

  // Insights
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toLocaleDateString('en-CA');

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
          <div 
            className="mdp-insight-card cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => {
              setActiveFilter('all');
              historyRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="mdp-insight-icon indigo">
              <BarChart2 style={{ width: 18, height: 18 }} />
            </div>
            <div className="mdp-insight-body">
              <div className="mdp-insight-value">{totalMeetings}</div>
              <div className="mdp-insight-label">Total Meetings</div>
            </div>
          </div>

          <div 
            className="mdp-insight-card cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => {
              upcomingRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="mdp-insight-icon emerald">
              <Calendar style={{ width: 18, height: 18 }} />
            </div>
            <div className="mdp-insight-body">
              <div className="mdp-insight-value">{todayMeetings}</div>
              <div className="mdp-insight-label">Upcoming Today</div>
            </div>
          </div>

          <div 
            className="mdp-insight-card cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => {
              setActiveFilter('no_mom');
              historyRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
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
        <div className="mdp-fade-up" ref={upcomingRef}>
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

        {/* ── Saved MOMs Card Section ── */}
        {(hasSavedMom || momHistory.length > 0) && (
          <div className="mdp-fade-up" style={{ marginBottom: 20 }}>
            <div className="mdp-section-header">
              <span className="mdp-section-title">
                <FileText style={{ width: 13, height: 13 }} />
                Saved MOMs
              </span>
            </div>
            
            <div className="flex flex-col gap-3">
              {hasSavedMom && !momHistory.find(m => String(m.id) === String(savedMomId)) && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '1px solid #bae6fd',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FileText style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0c4a6e' }}>{savedMomName || 'Untitled MOM'} <span className="text-xs bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full ml-2">Just Saved</span></div>
                      <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>
                        {savedProjName ? `Project: ${savedProjName}` : ''}
                        {lastSaved ? ` · Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        {` · ${momData.length} action items`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => navigate('/dashboard/mom/view')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#0284c7', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '8px 16px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View MOM <ArrowRight style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      onClick={() => handleDeleteMom(savedMomId)}
                      className="p-2 hover:bg-sky-200 text-sky-700 rounded-lg transition-colors"
                      title="Delete MOM"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              )}

              {displayedMoms.map((momInst, i) => (
                <div key={momInst.id || i} style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: '1px solid #e2e8f0'
                    }}>
                      <FileText style={{ width: 18, height: 18, color: '#64748b' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{momInst.title || 'Meeting Minutes'}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                        {new Date(momInst.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {` · ${momInst.duration} mins`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => navigate(`/dashboard/meeting/${momInst.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
                        borderRadius: 8, padding: '8px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                    >
                      View MOM <ArrowRight style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMom(momInst.id); }}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete MOM"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              ))}
              
              {showMoreMoms && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                  <button
                    onClick={() => setExpandMoms(!expandMoms)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    {expandMoms ? (
                      <>Show Less History</>
                    ) : (
                      <>Show {momHistory.length - 2} More Saved Meetings <ChevronRight style={{ width: 14, height: 14 }} /></>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Meeting History Table */}
        <div className="mdp-table-wrap mdp-fade-up" ref={historyRef}>
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
                <th>Time</th>
                <th>Host</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr className="mdp-empty-row">
                  <td colSpan={6}>No records found</td>
                </tr>
              ) : (
                (expandHistory ? filteredHistory : filteredHistory.slice(0, 5)).map(m => {
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
                      <td>{m.time}</td>
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
          
          {filteredHistory.length > 5 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setExpandHistory(!expandHistory)}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6366f1',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {expandHistory ? 'Show Less' : `Show All ${filteredHistory.length} Meetings ↓`}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MeetingsDashboardPage;
