import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    Video, Copy, Check, X, ArrowUpRight, Trash2,
    FileText, Share2, AlertCircle, Plus, GripVertical,
    Eye, EyeOff, Send, Loader
} from 'lucide-react';
import './MeetingDetailsPage.css';
import API from '../../utils/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const parseAgendaItem = (item) =>
    typeof item === 'string' ? { title: item, duration: 0, assignee: '' } : item;

const getMeetingStatus = (meeting) => {
    if (!meeting) return 'upcoming';
    if (meeting.status === 'ended' || meeting.status === 'cancelled') return meeting.status;
    const [time, mod] = (meeting.time || '12:00 AM').split(' ');
    let [h, m] = time.split(':').map(Number);
    if (mod === 'PM' && h !== 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    const start = new Date(`${meeting.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    const diff = (start.getTime() - Date.now()) / 60000;
    if (diff > 15) return 'upcoming';
    if (diff > -180) return 'live';
    return 'ended';
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date); d.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    const fmt = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (diff === 0) return `Today · ${fmt}`;
    if (diff === 1) return `Tomorrow · ${fmt}`;
    if (diff === -1) return `Yesterday · ${fmt}`;
    return fmt;
};

// ─── Component ───────────────────────────────────────────────────────────────

const MeetingDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = useSelector(s => s.auth?.user || s.user?.profile || null);
    const isHost = !currentUser || currentUser?.role === 'host' || currentUser?.role === 'admin';

    // Core state
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agenda, setAgenda] = useState([]);
    const [attendees, setAttendees] = useState([]);
    const [readiness, setReadiness] = useState({ score: 1, total: 3 });
    const [meetingStatus, setMeetingStatus] = useState('upcoming');
    const [countdown, setCountdown] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', undo: false });
    const [copiedField, setCopiedField] = useState(null);

    // Agenda input
    const [agendaInput, setAgendaInput] = useState({ show: false, title: '', duration: '', assignee: '' });
    const [dragState, setDragState] = useState({ dragging: null, over: null });

    // Attendee
    const [showAttendeeForm, setShowAttendeeForm] = useState(false);
    const [newAttendee, setNewAttendee] = useState({ email: '', role: 'attendee' });

    // Access key
    const [accessKeyRevealed, setAccessKeyRevealed] = useState(false);

    // Cancel
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelUndoTimer, setCancelUndoTimer] = useState(null);

    // Reschedule
    const [showReschedule, setShowReschedule] = useState(false);
    const [rescheduleValue, setRescheduleValue] = useState('');

    // MOM
    const [momContent, setMomContent] = useState('');
    const [generatingMom, setGeneratingMom] = useState(false);

    const toastTimeout = useRef(null);
    const agendaPanelRef = useRef(null);

    const showToast = (message, undo = false) => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToast({ show: true, message, undo });
        toastTimeout.current = setTimeout(() => setToast({ show: false, message: '', undo: false }), undo ? 5000 : 2200);
    };

    const updateReadiness = (ag, att) => {
        let score = 1;
        if (ag.length > 0) score++;
        if (att.length > 0) score++;
        setReadiness({ score, total: 3 });
    };

    const fetchMeeting = async () => {
        try {
            setLoading(true);
            const resp = await API.get(`/meetings/${id}`);
            if (resp.data.success) {
                const m = resp.data.meeting;
                setMeeting(m);
                const ag = m.agenda_text ? m.agenda_text.split('\n').filter(Boolean).map(parseAgendaItem) : [];
                const att = m.attendees || [];
                setAgenda(ag);
                setAttendees(att);
                updateReadiness(ag, att);
                setMeetingStatus(getMeetingStatus(m));
                setMomContent(ag.map(a => `## ${a.title}\n\n- \n`).join('\n'));
            }
        } catch { showToast('Failed to load meeting'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMeeting(); }, [id]);

    // Status refresh
    useEffect(() => {
        if (!meeting) return;
        const t = setInterval(() => setMeetingStatus(getMeetingStatus(meeting)), 30000);
        return () => clearInterval(t);
    }, [meeting]);

    // Countdown
    useEffect(() => {
        if (!meeting) return;
        const tick = () => {
            const [time, mod] = (meeting.time || '12:00 AM').split(' ');
            let [h, m] = time.split(':').map(Number);
            if (mod === 'PM' && h !== 12) h += 12;
            if (mod === 'AM' && h === 12) h = 0;
            const start = new Date(`${meeting.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
            const diff = start - Date.now();
            if (diff > 0) {
                const hh = Math.floor(diff / 3600000);
                const mm = Math.floor((diff % 3600000) / 60000);
                const ss = Math.floor((diff % 60000) / 1000);
                setCountdown(`${hh > 0 ? hh + 'h ' : ''}${String(mm).padStart(2,'0')}m ${String(ss).padStart(2,'0')}s`);
            }
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [meeting]);

    // Escape
    useEffect(() => {
        const fn = (e) => {
            if (e.key !== 'Escape') return;
            setShowCancelModal(false); setShowReschedule(false);
            setShowAttendeeForm(false);
            setAgendaInput({ show: false, title: '', duration: '', assignee: '' });
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, []);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        showToast('Copied to clipboard');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleRevealKey = () => {
        const next = !accessKeyRevealed;
        setAccessKeyRevealed(next);
        if (next) console.log(`[ACCESS KEY REVEALED] meeting=${id} user=${currentUser?.email} at=${new Date().toISOString()}`);
    };

    const saveAgendaPoint = async () => {
        if (!agendaInput.title.trim()) { setAgendaInput({ show: false, title: '', duration: '', assignee: '' }); return; }
        const item = { title: agendaInput.title.trim(), duration: parseInt(agendaInput.duration) || 0, assignee: agendaInput.assignee };
        const newAg = [...agenda, item];
        setAgenda(newAg);
        setAgendaInput({ show: false, title: '', duration: '', assignee: '' });
        updateReadiness(newAg, attendees);
        showToast('Agenda point added');
        try { await API.patch(`/meetings/${id}`, { agenda_text: newAg.map(a => a.title).join('\n') }); } catch {}
    };

    const deleteAgendaPoint = async (i) => {
        const newAg = agenda.filter((_, idx) => idx !== i);
        setAgenda(newAg); updateReadiness(newAg, attendees);
        try { await API.patch(`/meetings/${id}`, { agenda_text: newAg.map(a => a.title).join('\n') }); } catch {}
    };

    const handleDrop = (e, i) => {
        e.preventDefault();
        const { dragging } = dragState;
        if (dragging === null || dragging === i) { setDragState({ dragging: null, over: null }); return; }
        const newAg = [...agenda];
        const [removed] = newAg.splice(dragging, 1);
        newAg.splice(i, 0, removed);
        setAgenda(newAg); setDragState({ dragging: null, over: null });
    };

    const handleAddAttendee = async () => {
        if (!newAttendee.email.trim()) return;
        const att = { name: newAttendee.email.split('@')[0], email: newAttendee.email, role: newAttendee.role, rsvpStatus: 'PENDING', invitedAt: new Date().toISOString() };
        const newAtts = [...attendees, att];
        setAttendees(newAtts); setNewAttendee({ email: '', role: 'attendee' });
        setShowAttendeeForm(false); updateReadiness(agenda, newAtts);
        showToast('Invitation sent');
        try { await API.patch(`/meetings/${id}`, { attendees: newAtts }); } catch {}
    };

    const handleResendInvite = async (email) => {
        if (!email) return;
        showToast(`Invite resent to ${email}`);
        try { await API.post(`/meetings/${id}/resend-invite`, { email }); } catch {}
    };

    const confirmCancel = async () => {
        setShowCancelModal(false);
        showToast(`Meeting cancelled — Undo`, true);
        const timer = setTimeout(async () => {
            try { await API.post(`/meetings/${id}/cancel`, { reason: 'User requested cancellation' }); navigate('/dashboard/meetings'); } catch {}
        }, 5000);
        setCancelUndoTimer(timer);
    };

    const undoCancel = () => {
        if (cancelUndoTimer) clearTimeout(cancelUndoTimer);
        setToast({ show: false, message: '', undo: false });
        showToast('Cancellation undone');
    };

    const handleReschedule = async () => {
        if (!rescheduleValue) return;
        const dt = new Date(rescheduleValue);
        const dateStr = dt.toISOString().split('T')[0];
        const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMeeting(prev => ({ ...prev, date: dateStr, time: timeStr }));
        setShowReschedule(false);
        showToast('Meeting rescheduled. Attendees notified.');
        try { await API.patch(`/meetings/${id}`, { date: dateStr, time: timeStr }); } catch {}
    };

    const handleGenerateMOM = async () => {
        setGeneratingMom(true);
        try {
            const resp = await API.post(`/meetings/${id}/generate-mom`, { agenda, attendees, duration: totalDuration });
            setMomContent(resp.data.mom || momContent);
            showToast('MOM generated');
        } catch { showToast('Failed to generate MOM'); }
        finally { setGeneratingMom(false); }
    };

    const scrollToAgenda = () => {
        agendaPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => setAgendaInput({ show: true, title: '', duration: '', assignee: '' }), 400);
    };

    // ─── Derived ───────────────────────────────────────────────────────────────

    const totalDuration = agenda.reduce((s, a) => s + (parseInt(a.duration) || 0), 0);
    const progressRingOffset = 56.5 - (56.5 * (readiness.score / readiness.total));
    const ringColor = readiness.score === 1 ? '#92400e' : readiness.score === 2 ? '#fcd34d' : '#16a34a';

    if (loading) return <div className="meeting-details-wrapper flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!meeting) return <div className="meeting-details-wrapper p-10 font-bold text-red-500">Meeting not found</div>;

    const platformIcon = meeting.platform === 'meet' ? (
        <svg viewBox="0 0 24 24" className="w-3 h-3"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
    ) : <Video className="w-3 h-3 text-indigo-500" />;

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="meeting-details-wrapper">
            <div className="dashboard-container">

                {/* ── Hero ─────────────────────────────────────────────── */}
                <div className="hero-section stagger-item">
                    <div className="status-row">
                        {meetingStatus === 'live' && <span className="live-indicator"><span className="live-dot"></span>Live now</span>}
                        {meetingStatus === 'upcoming' && <><div className="radar-dot"></div><span className="section-label">Scheduled</span></>}
                        {meetingStatus === 'ended' && <span className="ended-pill">Ended</span>}
                        <div className="separator"></div>
                        <button className="date-reschedule-btn section-label" onClick={() => { setRescheduleValue(`${meeting.date}T09:00`); setShowReschedule(true); }}>
                            {formatDate(meeting.date)}
                        </button>
                        <div className="separator"></div>
                        <div className="platform-badge">{platformIcon}<span>{meeting.platform === 'meet' ? 'Google Meet' : 'MS Teams'}</span></div>
                    </div>

                    {showReschedule && (
                        <div className="reschedule-row">
                            <input type="datetime-local" className="reschedule-input" value={rescheduleValue} onChange={e => setRescheduleValue(e.target.value)} />
                            <button className="btn-minimal primary" onClick={handleReschedule}>Save</button>
                            <button className="btn-minimal secondary" onClick={() => setShowReschedule(false)}>Cancel</button>
                        </div>
                    )}

                    <h1 className="hero-title">{meeting.title}</h1>
                    <div className="hero-actions">
                        <button className="btn-join" onClick={() => window.open(meeting.join_url, '_blank')}>
                            <ArrowUpRight className="w-4 h-4" /> Join meeting
                        </button>
                        {meetingStatus === 'live' && <span className="live-indicator"><span className="live-dot"></span>Live now</span>}
                        {meetingStatus === 'upcoming' && <span className="timer-text font-mono">{countdown}</span>}
                        {meetingStatus === 'ended' && <span className="ended-pill">Ended</span>}
                        <button className="btn-copy-link" onClick={() => handleCopy(meeting.join_url, 'hero-link')}>
                            {copiedField === 'hero-link' ? <><Check className="w-4 h-4 text-green-500" /><span className="text-green-600">Copied ✓</span></> : <><Copy className="w-4 h-4" /><span>Copy link</span></>}
                        </button>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* ── Left Column ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-6">

                        {/* Agenda */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '30ms' }} ref={agendaPanelRef}>
                            <div className="card-label-header">
                                <span className="card-title-sm">Agenda{totalDuration > 0 ? ` · ${totalDuration} min` : ''}</span>
                                <button className="text-blue-600 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider" onClick={() => setAgendaInput({ show: true, title: '', duration: '', assignee: '' })}>
                                    <Plus className="w-3 h-3" /> Add point
                                </button>
                            </div>
                            <div className="card-content">
                                {agenda.length === 0 && !agendaInput.show ? (
                                    <div className="agenda-placeholder">
                                        <FileText className="agenda-empty-icon" />
                                        <p className="text-sm font-medium">No agenda yet</p>
                                        <p className="text-xs opacity-60 mt-1">Add topics to keep the meeting on track</p>
                                        <button className="agenda-empty-add-btn" onClick={() => setAgendaInput({ show: true, title: '', duration: '', assignee: '' })}>
                                            <Plus className="w-3 h-3" /> Add first point
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {agenda.map((item, i) => (
                                            <div key={i} className={`agenda-item group${dragState.over === i ? ' agenda-item--drag-over' : ''}`}
                                                draggable onDragStart={() => setDragState({ dragging: i, over: i })}
                                                onDragOver={e => { e.preventDefault(); setDragState(p => ({ ...p, over: i })); }}
                                                onDrop={e => handleDrop(e, i)}>
                                                <GripVertical className="agenda-drag-handle" />
                                                <div className="agenda-dot"></div>
                                                <span className="agenda-text">{item.title}</span>
                                                {item.duration > 0 && <span className="agenda-duration">{item.duration}m</span>}
                                                {item.assignee && <span className="agenda-assignee">{item.assignee.split('@')[0]}</span>}
                                                <button onClick={() => deleteAgendaPoint(i)} className="btn-delete-item opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {agendaInput.show && (
                                    <div className="agenda-add-form">
                                        <input autoFocus type="text" placeholder="Agenda topic..." className="agenda-input-field"
                                            value={agendaInput.title} onChange={e => setAgendaInput(p => ({ ...p, title: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') saveAgendaPoint(); if (e.key === 'Escape') setAgendaInput({ show: false, title: '', duration: '', assignee: '' }); }} />
                                        <div className="agenda-add-form-row">
                                            <input type="number" placeholder="Min" className="agenda-duration-input" min="0"
                                                value={agendaInput.duration} onChange={e => setAgendaInput(p => ({ ...p, duration: e.target.value }))} />
                                            <select className="agenda-assignee-select" value={agendaInput.assignee} onChange={e => setAgendaInput(p => ({ ...p, assignee: e.target.value }))}>
                                                <option value="">Assign to…</option>
                                                {attendees.map((att, i) => { const email = typeof att === 'string' ? att : att.email; const name = (att.name || email.split('@')[0]); return <option key={i} value={email}>{name}</option>; })}
                                            </select>
                                            <button onClick={saveAgendaPoint} className="btn-minimal primary" style={{ padding: '0.3rem 0.6rem' }}><Check className="w-3 h-3" /></button>
                                            <button onClick={() => setAgendaInput({ show: false, title: '', duration: '', assignee: '' })} className="btn-minimal secondary" style={{ padding: '0.3rem 0.6rem' }}><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attendees */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '60ms' }}>
                            <div className="card-label-header">
                                <span className="card-title-sm">Attendees</span>
                                <span className="text-[10px] font-bold text-gray-400">{attendees.length} members</span>
                            </div>
                            <div className="card-content">
                                <div className="space-y-1">
                                    {attendees.map((att, i) => {
                                        const email = typeof att === 'string' ? att : att.email;
                                        const name = att.name || email.split('@')[0];
                                        const isHostRow = i === 0;
                                        const rsvp = att.rsvpStatus || 'PENDING';
                                        const invitedAt = att.invitedAt ? new Date(att.invitedAt) : null;
                                        const minAgo = invitedAt ? Math.round((Date.now() - invitedAt.getTime()) / 60000) : null;
                                        let pillClass = 'tag-amber', pillLabel = 'Awaiting';
                                        if (isHostRow) { pillClass = 'tag-blue'; pillLabel = 'Host'; }
                                        else if (rsvp === 'ACCEPTED') { pillClass = 'tag-green'; pillLabel = 'Accepted'; }
                                        else if (rsvp === 'DECLINED') { pillClass = 'tag-red'; pillLabel = 'Declined'; }
                                        return (
                                            <div key={i} className="attendee-row">
                                                <div className="avatar-circle">{name.substring(0,2).toUpperCase()}</div>
                                                <div className="attendee-info">
                                                    <span className="attendee-name">{name}</span>
                                                    <span className="attendee-email">
                                                        {email}
                                                        {!isHostRow && rsvp === 'PENDING' && minAgo !== null && <span className="attendee-invited-time"> · Invited {minAgo < 1 ? 'just now' : `${minAgo}m ago`}</span>}
                                                    </span>
                                                </div>
                                                <div className="attendee-actions">
                                                    {!isHostRow && rsvp === 'PENDING' && <button className="resend-link" onClick={() => handleResendInvite(email)}>Resend</button>}
                                                    <span className={`status-tag ${pillClass}`}>{pillLabel}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {showAttendeeForm ? (
                                    <div className="attendee-add-form">
                                        <input autoFocus type="email" className="agenda-input-field" placeholder="colleague@company.com"
                                            value={newAttendee.email} onChange={e => setNewAttendee(p => ({ ...p, email: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && handleAddAttendee()} />
                                        <div className="agenda-add-form-row">
                                            <select className="agenda-assignee-select" value={newAttendee.role} onChange={e => setNewAttendee(p => ({ ...p, role: e.target.value }))}>
                                                <option value="attendee">Attendee</option>
                                                <option value="host">Host</option>
                                                <option value="observer">Observer</option>
                                            </select>
                                            <button className="btn-minimal primary" style={{ padding: '0.3rem 0.75rem', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleAddAttendee}>
                                                <Send className="w-3 h-3" /> Send
                                            </button>
                                            <button className="btn-minimal secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setShowAttendeeForm(false)}><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="w-full mt-4 py-2 border-t border-gray-50 text-[11px] font-bold text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 uppercase tracking-wider" onClick={() => setShowAttendeeForm(true)}>
                                        <Plus className="w-3 h-3" /> Add attendee
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* MOM Panel – only when ended */}
                        {meetingStatus === 'ended' && (
                            <div className="card-glass stagger-item" style={{ animationDelay: '80ms' }}>
                                <div className="card-label-header"><span className="card-title-sm">Meeting Notes</span></div>
                                <div className="card-content">
                                    <textarea className="mom-textarea" value={momContent} onChange={e => setMomContent(e.target.value)} placeholder="Notes will appear here…" rows={8} />
                                    <button className="btn-minimal primary mom-generate-btn" onClick={handleGenerateMOM} disabled={generatingMom}>
                                        {generatingMom ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><FileText className="w-3.5 h-3.5" /> Generate MOM</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Post-meeting */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '90ms' }}>
                            <div className="card-label-header"><span className="card-title-sm">After this meeting</span></div>
                            <div className="card-content flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <button disabled className="btn-minimal secondary disabled-post relative" data-tooltip="Upload a transcript first"><FileText className="w-3.5 h-3.5" /> Generate notes</button>
                                    <button className="btn-minimal secondary"><Plus className="w-3.5 h-3.5" /> Upload transcript</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Column ─────────────────────────────────────── */}
                    <div className="flex flex-col gap-6">

                        {/* Health */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '120ms' }}>
                            <div className="card-label-header readiness-header">
                                <span className="card-title-sm">Meeting Health</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold" style={{ color: ringColor }}>{readiness.score}/{readiness.total}</span>
                                    <svg width="20" height="20" className="progress-ring">
                                        <circle cx="10" cy="10" r="9" fill="transparent" stroke="#f4f3ef" strokeWidth="2" />
                                        <circle cx="10" cy="10" r="9" fill="transparent" stroke={ringColor} strokeWidth="2" strokeDasharray="56.5" strokeDashoffset={progressRingOffset} className="progress-ring-circle" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                            <div className="card-content">
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${(readiness.score / readiness.total) * 100}%`, backgroundColor: ringColor }}></div>
                                </div>
                                <div className="readiness-check-row">
                                    <span className="check-icon-circle check-icon-circle--green"><Check className="w-2.5 h-2.5" /></span>
                                    <span>Meet link configured</span>
                                </div>
                                <div className="readiness-check-row" onClick={scrollToAgenda} style={{ cursor: 'pointer' }}>
                                    {agenda.length > 0
                                        ? <span className="check-icon-circle check-icon-circle--green"><Check className="w-2.5 h-2.5" /></span>
                                        : <span className="check-icon-circle check-icon-circle--amber"><AlertCircle className="w-2.5 h-2.5" /></span>}
                                    <span className={agenda.length > 0 ? '' : 'text-amber-700'}>{agenda.length > 0 ? 'Agenda items added' : 'Agenda missing'}</span>
                                    {agenda.length === 0 && <button className="health-action-link" onClick={e => { e.stopPropagation(); scrollToAgenda(); }}>Add →</button>}
                                </div>
                                <div className="readiness-check-row">
                                    {attendees.length > 0
                                        ? <span className="check-icon-circle check-icon-circle--amber"><AlertCircle className="w-2.5 h-2.5" /></span>
                                        : <span className="check-icon-circle check-icon-circle--red"><X className="w-2.5 h-2.5" /></span>}
                                    <span className={attendees.length > 0 ? 'text-amber-700' : 'text-red-400'}>{attendees.length > 0 ? 'Invite pending' : 'No invite accepted'}</span>
                                    {attendees.length > 0 && (
                                        <button className="health-action-link" onClick={e => { e.stopPropagation(); const first = attendees.find(a => (a.rsvpStatus || 'PENDING') === 'PENDING'); if (first) handleResendInvite(first.email); }}>Resend →</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Connection – host only */}
                        {isHost && (
                            <div className="card-glass stagger-item" style={{ animationDelay: '150ms' }}>
                                <div className="card-label-header"><span className="card-title-sm">Connection</span></div>
                                <div className="card-content">
                                    <div className="kv-row">
                                        <span className="kv-label">Payload</span>
                                        <div className="kv-value">
                                            <span className="value-text">{meeting.join_url}</span>
                                            <button className={`btn-copy-pill ${copiedField === 'payload' ? 'copied' : ''}`} onClick={() => handleCopy(meeting.join_url, 'payload')}>
                                                {copiedField === 'payload' ? 'Copied ✓' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="kv-row">
                                        <span className="kv-label">Access Key</span>
                                        <div className="kv-value">
                                            <span className={`value-text font-mono${!accessKeyRevealed ? ' access-key-masked' : ''}`}>
                                                {accessKeyRevealed ? (meeting.meeting_code || 'lm8l-abc-qvg') : '••••••••'}
                                            </span>
                                            <button className="btn-reveal" onClick={handleRevealKey}>
                                                {accessKeyRevealed ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Reveal</>}
                                            </button>
                                            {accessKeyRevealed && (
                                                <button className={`btn-copy-pill ${copiedField === 'access' ? 'copied' : ''}`} onClick={() => handleCopy(meeting.meeting_code || '', 'access')}>
                                                    {copiedField === 'access' ? 'Copied ✓' : 'Copy'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Danger */}
                        <div className="stagger-item" style={{ animationDelay: '180ms' }}>
                            <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
                                <Trash2 className="w-3.5 h-3.5" /> Cancel meeting
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            <div className={`toast-pill ${toast.show ? 'show' : ''}`}>
                {toast.message}
                {toast.undo && <button className="toast-undo-btn" onClick={undoCancel}>Undo</button>}
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Cancel Meeting</span>
                            <button onClick={() => setShowCancelModal(false)}><X className="w-5 h-5 text-gray-300" /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-sm text-gray-700 font-medium">
                                Cancel this meeting? All {attendees.length} attendee{attendees.length !== 1 ? 's' : ''} will be notified.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-minimal secondary" onClick={() => setShowCancelModal(false)}>Keep meeting</button>
                            <button className="btn-minimal danger" onClick={confirmCancel}>Yes, cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingDetailsPage;
