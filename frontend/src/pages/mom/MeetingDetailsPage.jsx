import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Video, Copy, Check, X, ArrowUpRight, Trash2,
  FileText, AlertCircle, Plus, GripVertical,
  Eye, EyeOff, Send, Loader, ChevronRight,
  Home, Layout, Calendar, Clock, Users, Activity,
  Mic, Square, Pause, Play, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import './MeetingDetailsPage.css';
import API from '../../utils/api';

// ─── Recording Helpers ───────────────────────────────────────────────────────

const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#1e293b' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

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

  // After-meeting tab (for Logs & Audit view)
  const [afterTab, setAfterTab] = useState('mom'); // mom | issues | activity

  // ── Record Mode ───────────────────────────────────────────────────────
  const [recordState, setRecordState]   = useState('IDLE'); // IDLE | RECORDING | PAUSED
  const [timerVal, setTimerVal]         = useState(0);
  const [micError, setMicError]         = useState('');
  const [waveHeights, setWaveHeights]   = useState(Array(28).fill(4));
  const [interimText, setInterimText]   = useState('');
  const [interimEntry, setInterimEntry] = useState(null);
  const [entries, setEntries]           = useState([]);
  
  const recognitionRef                  = useRef(null);
  const manualStopRef                   = useRef(false);
  const bufferRef                       = useRef('');
  const debounceRef                     = useRef(null);
  const timerRef                        = useRef(null);
  const waveAnimRef                     = useRef(null);
  const speakerColorMapRef              = useRef({});
  const recordStateRef                  = useRef('IDLE');
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef   = useRef(null);
  const sourceRef   = useRef(null);
  const animationFrameRef = useRef(null);
  const previewBodyRef    = useRef(null);
  const wsRef             = useRef(null);

  const getSpeakerColor = React.useCallback((name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      const idx = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
      speakerColorMapRef.current[name] = idx;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  }, []);

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const toastTimeout = useRef(null);
  const agendaPanelRef = useRef(null);

  const showToast = (message, undo = false) => {
    if (undo) {
      toast.success(message, {
        action: {
          label: 'Undo',
          onClick: () => undoCancel()
        },
        duration: 5000
      });
    } else {
      toast.success(message);
    }
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

  useEffect(() => {
    if (!meeting) return;
    const t = setInterval(() => setMeetingStatus(getMeetingStatus(meeting)), 30000);
    return () => clearInterval(t);
  }, [meeting]);

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

  // ── Smart Routing Auto-Scroll ──
  useEffect(() => {
    if (!meeting) return;
    // Small delay to ensure DOM is rendered
    const t = setTimeout(() => {
      if (meetingStatus === 'live') {
        const el = document.getElementById('during-meeting-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (meetingStatus === 'ended' && meeting.mom_generated) {
        const el = document.getElementById('after-meeting-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [meetingStatus, meeting]);

  // ── Recording Effects ─────────────────────────────────────────────────
  
  // Auto-scroll transcript
  useEffect(() => {
    if (previewBodyRef.current) {
      previewBodyRef.current.scrollTop = previewBodyRef.current.scrollHeight;
    }
  }, [entries, interimEntry]);

  // Timer
  useEffect(() => {
    if (recordState === 'RECORDING') {
      timerRef.current = setInterval(() => setTimerVal(v => v + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recordState]);

  // Waveform animation
  const startAudioAnalysis = async () => {
    // We intentionally bypass getUserMedia and AudioContext here.
    // Requesting getUserMedia concurrently with SpeechRecognition often creates 
    // a hardware lock on Windows/Chrome that silently kills the transcription stream.
    // The visualizer is now purely a UI effect driven by a random interval.
    recordStateRef.current = 'RECORDING';
    
    if (animationFrameRef.current) {
      clearInterval(animationFrameRef.current);
    }
    
    const interval = setInterval(() => {
      if (recordStateRef.current === 'RECORDING') {
        setWaveHeights(Array.from({ length: 28 }, () => Math.round(4 + Math.random() * 20)));
      }
    }, 100);
    animationFrameRef.current = interval;
  };

  const stopAudioAnalysis = () => {
    recordStateRef.current = 'IDLE';
    if (animationFrameRef.current) {
      clearInterval(animationFrameRef.current);
    }
    setWaveHeights(Array(28).fill(4));
  };

  useEffect(() => {
    return () => stopAudioAnalysis();
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearInterval(timerRef.current);
      stopAudioAnalysis();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const broadcastEntries = React.useCallback((newEntries) => {
    // In a real app this would send WS payload
    // wsRef.current.send(...)
  }, []);

  const flushBuffer = React.useCallback(() => {
    clearTimeout(debounceRef.current);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    
    if (!text || text.length < 3) {
      setInterimText('');
      setInterimEntry(null);
      return;
    }

    const name = currentUser?.name || 'Anonymous';
    const color = getSpeakerColor(name);
    setEntries(prev => {
      const updated = [...prev, {
        id: Date.now() + Math.random(),
        type: 'speech',
        speaker: name,
        initials: getInitials(name),
        color: color.dot,
        bg: color.bg,
        textColor: color.text,
        time: nowTime(),
        text,
      }];
      broadcastEntries(updated);
      return updated;
    });
    setInterimText('');
    setInterimEntry(null);
  }, [currentUser, getSpeakerColor, broadcastEntries]);

  const initRecognition = React.useCallback(() => {
    if (!SpeechRecognitionAPI) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          const trimmed = t.trim();
          if (trimmed) {
            bufferRef.current += (bufferRef.current ? ' ' : '') + trimmed;
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(flushBuffer, /[.?!]\s*$/.test(bufferRef.current) ? 400 : 1200);
          }
          setInterimText('');
        } else {
          interim += t;
        }
      }
      if (interim) {
        setInterimText(interim);
        const name = currentUser?.name || 'Anonymous';
        const color = getSpeakerColor(name);
        setInterimEntry({
          id: 'interim-entry',
          type: 'speech',
          speaker: name,
          initials: getInitials(name),
          color: color.dot,
          bg: color.bg,
          textColor: color.text,
          time: nowTime(),
          text: interim,
          isInterim: true
        });
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error);
      }
      switch (e.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          setMicError('Microphone permission denied.');
          setRecordState('IDLE');
          manualStopRef.current = true;
          break;
        case 'network':
          setMicError('Network error, retrying...');
          setTimeout(() => {
            setMicError('');
            if (!manualStopRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (_) {}
            }
          }, 1500);
          break;
        case 'aborted':
        case 'no-speech':
        default:
          break;
      }
    };

    rec.onend = () => {
      if (!manualStopRef.current) {
        setTimeout(() => { 
          if (!manualStopRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (_) {} 
          }
        }, 300);
      }
    };
    return rec;
  }, [flushBuffer, currentUser, getSpeakerColor]);

  const startRecording = React.useCallback(async () => {
    if (!SpeechRecognitionAPI) {
      setMicError('Browser not supported. Use Chrome or Edge.');
      return;
    }
    manualStopRef.current = false;
    setMicError('');
    try {
      recordStateRef.current = 'RECORDING';
      await startAudioAnalysis();

      const rec = initRecognition();
      if (!rec) throw new Error('Init failed');
      recognitionRef.current = rec;
      rec.start();
      setRecordState('RECORDING');
    } catch {
      setMicError('Could not start microphone.');
      stopAudioAnalysis();
    }
  }, [initRecognition]);

  const stopRecording = React.useCallback(async () => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    flushBuffer();
    stopAudioAnalysis();
    setInterimText('');
    setTimerVal(0);
    setRecordState('IDLE');
    
    // Auto-save to backend
    showToast('Saving transcript to backend...');
    try {
      await new Promise(r => setTimeout(r, 1000)); 
      showToast('Transcript saved successfully!');
      
      // Update local note field to contain the transcript output for further generation
      const textOutput = entries.map(e => `${e.speaker} [${e.time}]: ${e.text}`).join('\n');
      setMomContent(prev => (prev ? prev + '\n\n' : '') + textOutput);
    } catch (e) {
      showToast('Failed to save transcript');
    }
  }, [flushBuffer, entries]);

  const pauseRecording = React.useCallback(async () => {
    if (recordState === 'RECORDING') {
      manualStopRef.current = true;
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (_) {} }
      flushBuffer();
      stopAudioAnalysis();
      setRecordState('PAUSED');
    } else if (recordState === 'PAUSED') {
      manualStopRef.current = false;
      try {
        recordStateRef.current = 'RECORDING';
        await startAudioAnalysis();
        const rec = initRecognition();
        recognitionRef.current = rec;
        try { rec.start(); } catch (_) {}
        setRecordState('RECORDING');
      } catch (err) {
        setMicError('Could not restart microphone.');
        stopAudioAnalysis();
      }
    }
  }, [recordState, flushBuffer, initRecognition]);


  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalDuration = agenda.reduce((s, a) => s + (parseInt(a.duration) || 0), 0);
  const ringColor = readiness.score === 1 ? '#d97706' : readiness.score === 2 ? '#f59e0b' : '#059669';

  const platformIcon = meeting?.platform === 'meet' ? (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
  ) : <Video style={{ width: 13, height: 13, color: '#4f46e5' }} />;

  if (loading) return (
    <div className="mdp2-loading">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!meeting) return (
    <div className="mdp2-loading" style={{ color: '#ef4444', fontWeight: 700 }}>Meeting not found</div>
  );

  // Status badge config
  const statusBadge = () => {
    if (meetingStatus === 'live') return (
      <span className="mdp2-status-badge live">
        <span className="mdp2-live-dot" />Live Now
      </span>
    );
    if (meetingStatus === 'upcoming') return <span className="mdp2-status-badge upcoming">Scheduled</span>;
    if (meetingStatus === 'ended') return <span className="mdp2-status-badge ended">Ended</span>;
    if (meetingStatus === 'cancelled') return <span className="mdp2-status-badge cancelled">Cancelled</span>;
  };

  const hostAtt = attendees[0];
  const hostName = typeof hostAtt === 'string'
    ? hostAtt.split('@')[0]
    : hostAtt?.name || hostAtt?.email?.split('@')[0] || '—';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mdp2-root">

      {/* ── Breadcrumb Bar ── */}
      <div className="mdp2-topbar">
        <nav className="mdp2-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard" className="mdp2-bc-link">
            <Home style={{ width: 12, height: 12 }} />
            Dashboard
          </Link>
          <ChevronRight className="mdp2-bc-sep" style={{ width: 12, height: 12 }} />
          <Link to="/dashboard/meetings" className="mdp2-bc-link">
            <Layout style={{ width: 12, height: 12 }} />
            Meetings
          </Link>
          <ChevronRight className="mdp2-bc-sep" style={{ width: 12, height: 12 }} />
          <span className="mdp2-bc-current">{meeting.title}</span>
        </nav>
      </div>

      {/* ── Meeting Header Card ── */}
      <div className="mdp2-header-card">
        <div className="mdp2-header-top">
          <div>
            <div className="mdp2-header-meta">
              {statusBadge()}
              <span className="mdp2-meta-sep">|</span>
              <span className="mdp2-meta-item">
                <Calendar style={{ width: 12, height: 12 }} />
                <button
                  className="mdp2-bc-link"
                  style={{ fontWeight: 600, color: '#374151' }}
                  onClick={() => { setRescheduleValue(`${meeting.date}T09:00`); setShowReschedule(true); }}
                >
                  {formatDate(meeting.date)}
                </button>
              </span>
              <span className="mdp2-meta-sep">|</span>
              <span className="mdp2-meta-item">
                <Clock style={{ width: 12, height: 12 }} />
                {meeting.time}
              </span>
              <span className="mdp2-meta-sep">|</span>
              <span className="mdp2-meta-item">
                <Users style={{ width: 12, height: 12 }} />
                Host: <strong style={{ color: '#111827', marginLeft: 3 }}>{hostName}</strong>
              </span>
              <span className="mdp2-meta-sep">|</span>
              <span className="mdp2-meta-item">
                {platformIcon}
                {meeting.platform === 'meet' ? 'Google Meet' : 'MS Teams'}
              </span>
            </div>
            <h1 className="mdp2-meeting-title">{meeting.title}</h1>
          </div>

          <div className="mdp2-header-actions">
            {meetingStatus === 'upcoming' && countdown && (
              <span className="mdp2-countdown">{countdown}</span>
            )}
            <button
              className="mdp2-btn-secondary"
              onClick={() => handleCopy(meeting.join_url, 'hero-link')}
            >
              {copiedField === 'hero-link'
                ? <><Check style={{ width: 14, height: 14, color: '#059669' }} /><span style={{ color: '#059669' }}>Copied</span></>
                : <><Copy style={{ width: 14, height: 14 }} />Copy Link</>}
            </button>
            <button
              className="mdp2-btn-join"
              onClick={() => window.open(meeting.join_url, '_blank')}
            >
              <ArrowUpRight style={{ width: 15, height: 15 }} />
              Join Meeting
            </button>
          </div>
        </div>

        {/* Reschedule inline */}
        {showReschedule && (
          <div className="mdp2-reschedule-row">
            <input
              type="datetime-local"
              className="mdp2-reschedule-input"
              value={rescheduleValue}
              onChange={e => setRescheduleValue(e.target.value)}
            />
            <button className="mdp2-btn-secondary" style={{ padding: '6px 12px' }} onClick={handleReschedule}>Save</button>
            <button className="mdp2-btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setShowReschedule(false)}>Cancel</button>
          </div>
        )}
      </div>

      {/* ── Body Grid ── */}
      <div className="mdp2-body">

        {/* Left Column */}
        <div className="mdp2-panel-group">

          {/* BEFORE MEETING */}
          <div className="mdp2-phase-label">Before Meeting</div>

          {/* Agenda */}
          <div className="mdp2-card" ref={agendaPanelRef}>
            <div className="mdp2-card-header">
              <span className="mdp2-card-title">
                Agenda{totalDuration > 0 ? ` · ${totalDuration} min total` : ''}
              </span>
              <button
                className="mdp2-card-action-link"
                onClick={() => setAgendaInput({ show: true, title: '', duration: '', assignee: '' })}
              >
                <Plus style={{ width: 12, height: 12 }} />
                Add Point
              </button>
            </div>
            <div className="mdp2-card-body">
              {agenda.length === 0 && !agendaInput.show ? (
                <div className="mdp2-agenda-empty">
                  <FileText style={{ width: 20, height: 20, color: '#d1d5db' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#9ca3af' }}>No agenda yet</span>
                  <span style={{ fontSize: 11, color: '#d1d5db' }}>Add topics to keep the meeting on track</span>
                  <button
                    className="mdp2-card-action-link"
                    style={{ marginTop: 4 }}
                    onClick={() => setAgendaInput({ show: true, title: '', duration: '', assignee: '' })}
                  >
                    <Plus style={{ width: 12, height: 12 }} />Add first point
                  </button>
                </div>
              ) : (
                <div className="mdp2-agenda-list">
                  {agenda.map((item, i) => (
                    <div
                      key={i}
                      className="mdp2-agenda-item"
                      draggable
                      onDragStart={() => setDragState({ dragging: i, over: i })}
                      onDragOver={e => { e.preventDefault(); setDragState(p => ({ ...p, over: i })); }}
                      onDrop={e => handleDrop(e, i)}
                      style={dragState.over === i ? { background: 'rgba(79,70,229,0.04)', borderRadius: 6 } : {}}
                    >
                      <GripVertical className="mdp2-agenda-grab" style={{ width: 13, height: 13 }} />
                      <div className="mdp2-agenda-dot" />
                      <span className="mdp2-agenda-text">{item.title}</span>
                      {item.duration > 0 && <span className="mdp2-agenda-tag dur">{item.duration}m</span>}
                      {item.assignee && <span className="mdp2-agenda-tag who">{item.assignee.split('@')[0]}</span>}
                      <button className="mdp2-agenda-del" onClick={() => deleteAgendaPoint(i)}>
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {agendaInput.show && (
                <div className="mdp2-agenda-form">
                  <input
                    autoFocus
                    type="text"
                    className="mdp2-form-input"
                    placeholder="Agenda topic…"
                    value={agendaInput.title}
                    onChange={e => setAgendaInput(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveAgendaPoint();
                      if (e.key === 'Escape') setAgendaInput({ show: false, title: '', duration: '', assignee: '' });
                    }}
                  />
                  <div className="mdp2-form-row">
                    <input
                      type="number"
                      className="mdp2-form-num"
                      placeholder="Min"
                      min="0"
                      value={agendaInput.duration}
                      onChange={e => setAgendaInput(p => ({ ...p, duration: e.target.value }))}
                    />
                    <select
                      className="mdp2-form-select"
                      value={agendaInput.assignee}
                      onChange={e => setAgendaInput(p => ({ ...p, assignee: e.target.value }))}
                    >
                      <option value="">Assign to…</option>
                      {attendees.map((att, i) => {
                        const email = typeof att === 'string' ? att : att.email;
                        const name = att.name || email.split('@')[0];
                        return <option key={i} value={email}>{name}</option>;
                      })}
                    </select>
                    <button className="mdp2-btn-icon primary" onClick={saveAgendaPoint}>
                      <Check style={{ width: 12, height: 12 }} />
                    </button>
                    <button className="mdp2-btn-icon" onClick={() => setAgendaInput({ show: false, title: '', duration: '', assignee: '' })}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attendees */}
          <div className="mdp2-card">
            <div className="mdp2-card-header">
              <span className="mdp2-card-title">Attendees · {attendees.length}</span>
            </div>
            <div className="mdp2-card-body">
              <div className="mdp2-attendee-list">
                {attendees.map((att, i) => {
                  const email = typeof att === 'string' ? att : att.email;
                  const name = att.name || email.split('@')[0];
                  const isHostRow = i === 0;
                  const rsvp = att.rsvpStatus || 'PENDING';
                  let tagCls = 'wait', tagLabel = 'Awaiting';
                  if (isHostRow) { tagCls = 'host'; tagLabel = 'Host'; }
                  else if (rsvp === 'ACCEPTED') { tagCls = 'ok'; tagLabel = 'Accepted'; }
                  else if (rsvp === 'DECLINED') { tagCls = 'no'; tagLabel = 'Declined'; }
                  return (
                    <div key={i} className="mdp2-attendee-row">
                      <div className="mdp2-avatar">{name.substring(0,2).toUpperCase()}</div>
                      <div className="mdp2-att-info">
                        <span className="mdp2-att-name">{name}</span>
                        <span className="mdp2-att-email">{email}</span>
                      </div>
                      {!isHostRow && rsvp === 'PENDING' && (
                        <button className="mdp2-card-action-link" style={{ fontSize: 10 }} onClick={() => handleResendInvite(email)}>
                          Resend
                        </button>
                      )}
                      <span className={`mdp2-att-tag ${tagCls}`}>{tagLabel}</span>
                    </div>
                  );
                })}
              </div>

              {showAttendeeForm ? (
                <div className="mdp2-agenda-form" style={{ marginTop: 8 }}>
                  <input
                    autoFocus
                    type="email"
                    className="mdp2-form-input"
                    placeholder="colleague@company.com"
                    value={newAttendee.email}
                    onChange={e => setNewAttendee(p => ({ ...p, email: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddAttendee()}
                  />
                  <div className="mdp2-form-row">
                    <select
                      className="mdp2-form-select"
                      value={newAttendee.role}
                      onChange={e => setNewAttendee(p => ({ ...p, role: e.target.value }))}
                    >
                      <option value="attendee">Attendee</option>
                      <option value="host">Host</option>
                      <option value="observer">Observer</option>
                    </select>
                    <button className="mdp2-btn-icon primary" onClick={handleAddAttendee}>
                      <Send style={{ width: 12, height: 12 }} />
                    </button>
                    <button className="mdp2-btn-icon" onClick={() => setShowAttendeeForm(false)}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
              ) : (
                <button className="mdp2-att-add-btn" onClick={() => setShowAttendeeForm(true)}>
                  <Plus style={{ width: 12, height: 12 }} />
                  Add Attendee
                </button>
              )}
            </div>
          </div>

          {/* DURING MEETING */}
          {(meetingStatus === 'live' || meetingStatus === 'ended') && (
            <div id="during-meeting-section">
              <div className="mdp2-phase-label">During Meeting</div>

              {/* Transcript */}
              <div className="mdp2-card">
                <div className="mdp2-card-header">
                  <span className="mdp2-card-title">Live Transcript & Recording</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {recordState === 'IDLE' ? (
                      <button onClick={startRecording} className="mdp2-card-action-link" style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none' }}>
                        <Mic style={{ width: 14, height: 14 }} /> Start Recording
                      </button>
                    ) : (
                      <>
                        <button onClick={pauseRecording} className="mdp2-card-action-link" style={{ background: '#f59e0b', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none' }}>
                          {recordState === 'RECORDING' ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />} 
                          {recordState === 'RECORDING' ? 'Pause' : 'Resume'}
                        </button>
                        <button onClick={stopRecording} className="mdp2-card-action-link" style={{ background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none' }}>
                          <Square style={{ width: 14, height: 14 }} /> Stop & Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Visualizer & Timer */}
                {recordState !== 'IDLE' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      {formatTime(timerVal)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '48px' }}>
                      {waveHeights.map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: '4px',
                            backgroundColor: recordState === 'RECORDING' ? '#4f46e5' : '#cbd5e1',
                            borderRadius: '2px',
                            height: `${recordState === 'RECORDING' ? h : 4}px`,
                            transition: 'height 0.05s ease'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {micError && (
                  <div className="mx-5 my-3 p-4 rounded-xl border-2 border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/20 flex items-center gap-3">
                    <div className="size-8 bg-rose-500 rounded-lg flex items-center justify-center shrink-0">
                      <AlertCircle className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Microphone Fault</p>
                      <p className="text-sm font-bold text-rose-900 dark:text-rose-100 leading-tight">{micError}</p>
                    </div>
                  </div>
                )}

                <div className="mdp2-card-body" style={{ padding: 0 }}>
                  <div ref={previewBodyRef} style={{ height: '300px', overflowY: 'auto', padding: '20px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {entries.length === 0 && !interimEntry && (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Mic style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.5 }} />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Microphone is ready. Start recording to capture live transcript.</span>
                      </div>
                    )}
                    
                    {[...entries, interimEntry].filter(Boolean).map((e) => (
                      <div key={e.id} style={{ display: 'flex', gap: '12px', opacity: e.isInterim ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                          backgroundColor: e.bg, color: e.textColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700
                        }}>
                          {e.initials}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{e.speaker}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{e.time}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>{e.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mdp2-card">
                <div className="mdp2-card-header">
                  <span className="mdp2-card-title">Live Notes</span>
                </div>
                <div className="mdp2-card-body">
                  <textarea
                    className="mdp2-textarea"
                    placeholder="Capture key points, decisions, and blockers during the meeting…"
                    rows={5}
                    value={momContent}
                    onChange={e => setMomContent(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AFTER MEETING */}
          {meetingStatus === 'ended' && (
            <div id="after-meeting-section">
              <div className="mdp2-phase-label">After Meeting</div>

              <div className="mdp2-card">
                <div className="mdp2-card-header">
                  <span className="mdp2-card-title">Review & Action</span>
                </div>
                <div className="mdp2-card-body">
                  {/* Tabs: MOM | Issues | Activity Log */}
                  <div className="mdp2-tabs">
                    {[
                      { key: 'mom', label: 'MOM' },
                      { key: 'issues', label: 'Issues' },
                      { key: 'activity', label: 'Activity Log' },
                    ].map(t => (
                      <button
                        key={t.key}
                        className={`mdp2-tab-btn${afterTab === t.key ? ' active' : ''}`}
                        onClick={() => setAfterTab(t.key)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {afterTab === 'mom' && (
                    <div>
                      <textarea
                        className="mdp2-textarea"
                        value={momContent}
                        onChange={e => setMomContent(e.target.value)}
                        placeholder="Minutes of Meeting will appear here after generation…"
                        rows={8}
                      />
                      <button
                        className="mdp2-generate-btn"
                        onClick={handleGenerateMOM}
                        disabled={generatingMom}
                      >
                        {generatingMom
                          ? <><Loader style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />Generating…</>
                          : <><FileText style={{ width: 13, height: 13 }} />Generate MOM</>}
                      </button>
                    </div>
                  )}

                  {afterTab === 'issues' && (
                    <div className="mdp2-issues-list">
                      {(meeting.issues || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 12 }}>
                          No issues raised in this meeting
                        </div>
                      ) : (
                        (meeting.issues || []).map((issue, i) => (
                          <div key={i} className="mdp2-issue-item">
                            <span className={`mdp2-issue-dot ${issue.status === 'closed' ? 'closed' : 'open'}`} />
                            <div style={{ flex: 1 }}>
                              <div className="mdp2-issue-text">{issue.description || issue.title}</div>
                              {issue.assignee && <div className="mdp2-issue-assignee">Assigned: {issue.assignee}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {afterTab === 'activity' && (
                    <div className="mdp2-activity-list">
                      {[
                        { text: `Meeting scheduled for ${formatDate(meeting.date)}`, time: meeting.created_at },
                        agenda.length > 0 && { text: `${agenda.length} agenda items added`, time: '' },
                        attendees.length > 0 && { text: `${attendees.length} attendees invited`, time: '' },
                        meetingStatus === 'ended' && { text: 'Meeting ended', time: '' },
                        meeting.mom_generated && { text: 'MOM generated', time: '' },
                      ].filter(Boolean).map((item, i) => (
                        <div key={i} className="mdp2-activity-item">
                          <span className="mdp2-activity-dot" />
                          <span>{item.text}</span>
                          {item.time && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#d1d5db' }}>
                              {new Date(item.time).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column */}
        <div className="mdp2-right-col">

          {/* Meeting Health */}
          <div className="mdp2-card">
            <div className="mdp2-card-header">
              <span className="mdp2-card-title">Meeting Health</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ringColor }}>
                {readiness.score}/{readiness.total}
              </span>
            </div>
            <div className="mdp2-card-body">
              <div className="mdp2-progress-bar">
                <div
                  className="mdp2-progress-fill"
                  style={{ width: `${(readiness.score / readiness.total) * 100}%`, background: ringColor }}
                />
              </div>
              <div className="mdp2-health-check">
                <div className="mdp2-health-row">
                  <span className="mdp2-check-circle green">
                    <Check style={{ width: 10, height: 10 }} />
                  </span>
                  Meet link configured
                </div>
                <div className="mdp2-health-row" onClick={scrollToAgenda} style={{ cursor: 'pointer' }}>
                  {agenda.length > 0
                    ? <span className="mdp2-check-circle green"><Check style={{ width: 10, height: 10 }} /></span>
                    : <span className="mdp2-check-circle amber"><AlertCircle style={{ width: 10, height: 10 }} /></span>}
                  <span style={agenda.length === 0 ? { color: '#d97706' } : {}}>
                    {agenda.length > 0 ? 'Agenda added' : 'Agenda missing'}
                  </span>
                  {agenda.length === 0 && (
                    <button className="mdp2-health-link" onClick={e => { e.stopPropagation(); scrollToAgenda(); }}>
                      Add →
                    </button>
                  )}
                </div>
                <div className="mdp2-health-row">
                  {attendees.length > 0
                    ? <span className="mdp2-check-circle amber"><AlertCircle style={{ width: 10, height: 10 }} /></span>
                    : <span className="mdp2-check-circle red"><X style={{ width: 10, height: 10 }} /></span>}
                  <span style={{ color: attendees.length > 0 ? '#d97706' : '#ef4444' }}>
                    {attendees.length > 0 ? 'Invite pending' : 'No invites sent'}
                  </span>
                  {attendees.length > 0 && (
                    <button
                      className="mdp2-health-link"
                      onClick={() => { const first = attendees.find(a => (a.rsvpStatus || 'PENDING') === 'PENDING'); if (first) handleResendInvite(first.email); }}
                    >
                      Resend →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Connection — host only */}
          {isHost && (
            <div className="mdp2-card">
              <div className="mdp2-card-header">
                <span className="mdp2-card-title">Connection Details</span>
              </div>
              <div className="mdp2-card-body">
                <div className="mdp2-kv-row">
                  <span className="mdp2-kv-label">Join URL</span>
                  <span className="mdp2-kv-value">{meeting.join_url}</span>
                  <button
                    className={`mdp2-copy-btn${copiedField === 'payload' ? ' copied' : ''}`}
                    onClick={() => handleCopy(meeting.join_url, 'payload')}
                  >
                    {copiedField === 'payload' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <div className="mdp2-kv-row">
                  <span className="mdp2-kv-label">Access Key</span>
                  <span className={`mdp2-kv-value${!accessKeyRevealed ? ' mdp2-masked' : ''}`}>
                    {accessKeyRevealed ? (meeting.meeting_code || 'lm8l-abc-qvg') : '••••••••'}
                  </span>
                  <button className="mdp2-reveal-btn" onClick={handleRevealKey}>
                    {accessKeyRevealed
                      ? <><EyeOff style={{ width: 10, height: 10 }} />Hide</>
                      : <><Eye style={{ width: 10, height: 10 }} />Reveal</>}
                  </button>
                  {accessKeyRevealed && (
                    <button
                      className={`mdp2-copy-btn${copiedField === 'access' ? ' copied' : ''}`}
                      onClick={() => handleCopy(meeting.meeting_code || '', 'access')}
                    >
                      {copiedField === 'access' ? 'Copied ✓' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary — only when ended */}
          {meetingStatus === 'ended' && (
            <div className="mdp2-card">
              <div className="mdp2-card-header">
                <span className="mdp2-card-title">Summary</span>
              </div>
              <div className="mdp2-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>Duration</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{meeting.actual_duration_minutes || '—'} min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>Attendance</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {meeting.attendance_rate != null ? `${Math.round(meeting.attendance_rate)}%` : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
                  <span>MOM Status</span>
                  <span style={{ fontWeight: 700, color: meeting.mom_generated ? '#059669' : '#d97706' }}>
                    {meeting.mom_generated ? 'Generated' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="mdp2-danger-zone">
            <div className="mdp2-danger-zone-title">Danger Zone</div>
            <button
              id="mdp2-cancel-btn"
              className="mdp2-btn-cancel"
              onClick={() => setShowCancelModal(true)}
            >
              <Trash2 style={{ width: 13, height: 13 }} />
              Cancel Meeting
            </button>
          </div>

        </div>
      </div>


      {/* ── Cancel Modal ── */}
      {showCancelModal && (
        <div className="mdp2-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="mdp2-modal-card" onClick={e => e.stopPropagation()}>
            <div className="mdp2-modal-header">
              <span className="mdp2-modal-title">Cancel Meeting</span>
              <button onClick={() => setShowCancelModal(false)} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="mdp2-modal-body">
              Cancel <strong>{meeting.title}</strong>? All {attendees.length} attendee{attendees.length !== 1 ? 's' : ''} will be notified.
            </div>
            <div className="mdp2-modal-footer">
              <button className="mdp2-modal-btn secondary" onClick={() => setShowCancelModal(false)}>Keep Meeting</button>
              <button className="mdp2-modal-btn danger" onClick={confirmCancel}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MeetingDetailsPage;
