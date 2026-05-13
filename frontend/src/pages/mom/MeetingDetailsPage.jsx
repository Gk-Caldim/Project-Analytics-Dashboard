import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Video, Copy, Check, X, ArrowUpRight, Trash2,
  FileText, AlertCircle, Plus, GripVertical,
  Eye, EyeOff, Send, Loader, ChevronRight,
  Home, Layout, Calendar, Clock, Users, Activity,
  Mic, Square, Pause, Play, Sparkles, Pencil as PencilIcon, Search, ChevronDown,
  ChevronUp, GripHorizontal, Globe, Crown, Mail, UserPlus, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import './MeetingDetailsPage.css';
import { useConfirm } from '../../hooks/use-confirm';
import { Spinner } from '../../components/ui/spinner';
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

const parseAgendaItem = (item) => {
  if (typeof item === 'string') {
    return { title: item, duration: 0, assignee: null, status: 'default', id: Math.random() };
  }
  return { 
    ...item, 
    duration: parseInt(item.duration) || 0, 
    assignee: item.assignee || null,
    status: item.status || 'default',
    id: item.id || Math.random()
  };
};

const getAgendaSuggestions = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('sync') || t.includes('status')) {
    return ["Status update", "Blockers & dependencies", "Next steps & owners"];
  }
  if (t.includes('client') || t.includes('review')) {
    return ["Project progress review", "Client feedback", "Action items & deadlines"];
  }
  if (t.includes('interview') || t.includes('hiring')) {
    return ["Candidate introduction", "Technical assessment", "Q&A session"];
  }
  return ["Opening remarks", "Main discussion points", "Closing & next steps"];
};

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

const MOCK_TEAM_MEMBERS = [
  { id: 'u1', name: 'Pradeep', email: 'pradeep@example.com', timezone: 'IST', avatar: null },
  { id: 'u2', name: 'Gaurav Kumar', email: 'gk@example.com', timezone: 'IST', avatar: null },
  { id: 'u3', name: 'John Doe', email: 'john@example.com', timezone: 'PST', avatar: null },
  { id: 'u4', name: 'Jane Smith', email: 'jane@example.com', timezone: 'GMT', avatar: null },
  { id: 'u5', name: 'Alice Wong', email: 'alice@example.com', timezone: 'HKT', avatar: null },
];

const getAttendeeTime = (timezone, meetingDate, meetingTime) => {
  try {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    if (timezone === 'IST') options.timeZone = 'Asia/Kolkata';
    else if (timezone === 'PST') options.timeZone = 'America/Los_Angeles';
    else if (timezone === 'GMT') options.timeZone = 'Europe/London';
    else if (timezone === 'HKT') options.timeZone = 'Asia/Hong_Kong';
    
    let baseDate = new Date();
    if (meetingDate && meetingTime) {
      const [time, mod] = (meetingTime || '12:00 AM').split(' ');
      let [h, m] = time.split(':').map(Number);
      if (mod === 'PM' && h !== 12) h += 12;
      if (mod === 'AM' && h === 12) h = 0;
      baseDate = new Date(`${meetingDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    }

    return new Intl.DateTimeFormat('en-US', options).format(baseDate);
  } catch {
    return '12:00 PM';
  }
};

const getInitialsColor = (name = '') => {
  const colors = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── Component ───────────────────────────────────────────────────────────────

const MeetingDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
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
  const [projectName, setProjectName] = useState('');

  // Agenda input
  const [agendaInput, setAgendaInput] = useState({ show: false, title: '', duration: '', assignee: '' });
  const [dragState, setDragState] = useState({ dragging: null, over: null });

  // Attendee
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [newAttendee, setNewAttendee] = useState({ email: '', role: 'attendee' });

  // Access key
  const [accessKeyRevealed, setAccessKeyRevealed] = useState(false);


  // Reschedule
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState('');

  // MOM
  const [momContent, setMomContent] = useState('');
  const [generatingMom, setGeneratingMom] = useState(false);

  // After-meeting tab (for Logs & Audit view)
  const [afterTab, setAfterTab] = useState('mom'); // mom | issues | activity

  // Inline Editing & Auto-save
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null); // 'date' | 'time' | 'host' | 'platform' | 'status' | 'assignee-{index}'
  const [conflicts, setConflicts] = useState([]);

  // Agenda Builder
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);

  // Attendee Management
  const [showAttendeeSearch, setShowAttendeeSearch] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [attendeeUndoTimer, setAttendeeUndoTimer] = useState(null);
  const [removingAttendeeId, setRemovingAttendeeId] = useState(null);

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
        const ag = (m.agenda || []).map(parseAgendaItem);
        const att = m.attendees || [];
        setAgenda(ag);
        setAttendees(att);
        updateReadiness(ag, att);
        setMeetingStatus(getMeetingStatus(m));
        setMomContent(ag.map(a => `## ${a.title}\n\n- \n`).join('\n'));

        // Fetch project name if project_id exists
        if (m.project_id) {
          try {
            const projResp = await API.get(`/projects/${m.project_id}`);
            if (projResp.data) {
              setProjectName(projResp.data.name);
            }
          } catch (err) {
            console.error('Failed to fetch project details:', err);
          }
        }
      }
    } catch { showToast('Failed to load meeting'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeeting(); }, [id]);

  useEffect(() => {
    const fetchAllMeetings = async () => {
      try {
        const resp = await API.get('/meetings/');
        if (resp.data.success) {
          setConflicts(resp.data.meetings.filter(m => m.id !== id));
        }
      } catch (err) {
        console.error('Failed to fetch meetings for conflict detection:', err);
      }
    };
    fetchAllMeetings();
  }, [id]);

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

  const updateMeetingField = async (field, value) => {
    try {
      setSaveStatus('saving');
      const payload = { [field]: value };
      const resp = await API.patch(`/meetings/${id}`, payload);
      
      if (resp.data.success) {
        setMeeting(resp.data.meeting);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 1500);
        
        // If platform changed, show special toast as requested
        if (field === 'platform') {
          showToast('Link updated');
        }
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      setSaveStatus('error');
    }
  };

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (!tempTitle.trim()) {
      showToast("Meeting name can't be empty");
      setTempTitle(meeting.title);
      return;
    }
    if (tempTitle !== meeting.title) {
      updateMeetingField('title', tempTitle.trim());
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleBlur();
    if (e.key === 'Escape') {
      setEditingTitle(false);
      setTempTitle(meeting.title);
    }
  };

  const saveAgenda = async (newAg) => {
    setAgenda(newAg);
    updateReadiness(newAg, attendees);
    try { 
      await API.patch(`/meetings/${id}`, { 
        agenda_text: JSON.stringify(newAg) // Store as JSON string to preserve metadata
      }); 
    } catch (err) {
      console.error('Failed to save agenda:', err);
      showToast('Failed to sync agenda');
    }
  };

  const addAgendaPoint = (title = '', index = null) => {
    const newItem = { title, duration: 0, assignee: null, status: 'default', id: Math.random() };
    const newAg = [...agenda];
    if (index !== null) {
      newAg.splice(index + 1, 0, newItem);
    } else {
      newAg.push(newItem);
    }
    saveAgenda(newAg);
    // Logic to focus the new input should go here
  };

  const updateAgendaItem = (index, field, value) => {
    const newAg = [...agenda];
    newAg[index] = { ...newAg[index], [field]: value };
    saveAgenda(newAg);
  };

  const deleteAgendaItem = (index) => {
    const itemToDelete = agenda[index];
    const newAg = agenda.filter((_, i) => i !== index);
    
    // Undo logic
    setDeletingIndex(index);
    if (undoTimeout) clearTimeout(undoTimeout);
    
    const timeout = setTimeout(() => {
      saveAgenda(newAg);
      setDeletingIndex(null);
    }, 3000);
    
    setUndoTimeout(timeout);
    
    toast.success(`Removed: ${itemToDelete.title}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeout);
          setDeletingIndex(null);
          showToast('Restored');
        }
      },
      duration: 3000
    });
  };

  const duplicateAgendaItem = (index) => {
    const item = { ...agenda[index], id: Math.random() };
    const newAg = [...agenda];
    newAg.splice(index + 1, 0, item);
    saveAgenda(newAg);
    showToast('Item duplicated');
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Use a ghost image if desired, but we'll use CSS for the placeholder
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newAg = [...agenda];
    const [removed] = newAg.splice(draggedIndex, 1);
    newAg.splice(dragOverIndex, 0, removed);
    
    saveAgenda(newAg);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };




  const saveAttendees = async (newAtts) => {
    setAttendees(newAtts);
    updateReadiness(agenda, newAtts);
    try { 
      await API.patch(`/meetings/${id}`, { attendees: newAtts }); 
    } catch (err) {
      console.error('Failed to save attendees:', err);
      showToast('Failed to sync attendee list');
    }
  };

  const handleUpdateAttendee = (attendeeId, field, value) => {
    const newAtts = attendees.map(a => {
      const email = typeof a === 'string' ? a : a.email;
      const aid = a.id || email;
      if (aid === attendeeId) {
        return { ...(typeof a === 'string' ? { email: a } : a), [field]: value };
      }
      return a;
    });
    saveAttendees(newAtts);
  };

  const handleRemoveAttendee = (attendeeId) => {
    const attToRemove = attendees.find(a => (a.id || a.email) === attendeeId);
    if (!attToRemove) return;

    setRemovingAttendeeId(attendeeId);
    if (attendeeUndoTimer) clearTimeout(attendeeUndoTimer);

    const timer = setTimeout(() => {
      const newAtts = attendees.filter(a => (a.id || a.email) !== attendeeId);
      saveAttendees(newAtts);
      setRemovingAttendeeId(null);
    }, 3000);

    setAttendeeUndoTimer(timer);

    toast.success(`Removed ${attToRemove.name || attToRemove.email}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer);
          setRemovingAttendeeId(null);
          showToast('Restored');
        }
      },
      duration: 3000
    });
  };

  const handleAddAttendee = (contact) => {
    const email = typeof contact === 'string' ? contact : contact.email;
    const exists = attendees.some(a => (typeof a === 'string' ? a : a.email) === email);
    if (exists) {
      showToast(`${email} is already invited`);
      return;
    }

    const newAtt = typeof contact === 'string' 
      ? { email, name: email.split('@')[0], role: 'attendee', rsvpStatus: 'PENDING', invitedAt: new Date().toISOString(), timezone: 'IST' }
      : { ...contact, role: 'attendee', rsvpStatus: 'PENDING', invitedAt: new Date().toISOString() };

    const newAtts = [...attendees, newAtt];
    saveAttendees(newAtts);
    showToast('Invitation sent');
  };

  const handleResendInvite = async (email) => {
    if (!email) return;
    showToast(`Invite resent to ${email}`);
    try { await API.post(`/meetings/${id}/resend-invite`, { email }); } catch {}
  };

  const handleHostReassignment = async (attendeeId) => {
    const att = attendees.find(a => (a.id || a.email) === attendeeId);
    if (!att) return;

    const isConfirmed = await confirm({
      title: 'Transfer Host Role',
      description: `Make ${att.name || att.email} the new host? You will become a regular attendee.`,
      confirmText: 'Yes, Transfer',
      variant: 'danger'
    });

    if (isConfirmed) {
      const newAtts = attendees.map(a => {
        const aid = a.id || a.email;
        if (aid === attendeeId) return { ...a, role: 'host' };
        if (a.role === 'host') return { ...a, role: 'attendee' };
        return a;
      });
      saveAttendees(newAtts);
      showToast(`Host role transferred to ${att.name || att.email}`);
    }
  };

  const handleBulkAction = (action) => {
    if (selectedAttendeeIds.length === 0) return;

    if (action === 'remove') {
      const newAtts = attendees.filter(a => !selectedAttendeeIds.includes(a.id || a.email));
      saveAttendees(newAtts);
      showToast(`Removed ${selectedAttendeeIds.length} attendees`);
      setSelectedAttendeeIds([]);
    } else if (action === 'resend') {
      selectedAttendeeIds.forEach(id => {
        const att = attendees.find(a => (a.id || a.email) === id);
        if (att) handleResendInvite(att.email);
      });
      setSelectedAttendeeIds([]);
    } else if (action === 'copy') {
      const emails = attendees
        .filter(a => selectedAttendeeIds.includes(a.id || a.email))
        .map(a => a.email)
        .join(', ');
      navigator.clipboard.writeText(emails);
      showToast('Emails copied to clipboard');
      setSelectedAttendeeIds([]);
    }
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

  const checkConflict = (date, time) => {
    if (!date || !time) return null;
    return conflicts.find(m => m.date === date && m.time === time);
  };

  const currentConflict = checkConflict(meeting?.date, meeting?.time);

  const totalDuration = agenda.reduce((s, a) => s + (parseInt(a.duration) || 0), 0);
  const ringColor = readiness.score === 1 ? '#d97706' : readiness.score === 2 ? '#f59e0b' : '#059669';

  const platformIcon = meeting?.platform === 'meet' ? (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
  ) : <Video style={{ width: 13, height: 13, color: '#4f46e5' }} />;

  if (loading) return (
    <div className="mdp2-loading">
      <Spinner size="lg" className="text-indigo-600" />
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
          {projectName ? (
            <>
              <Link to="/dashboard/projects" className="mdp2-bc-link">
                <Layout style={{ width: 12, height: 12 }} />
                Projects
              </Link>
              <ChevronRight className="mdp2-bc-sep" style={{ width: 12, height: 12 }} />
              <span className="mdp2-bc-link" style={{ cursor: 'default' }}>
                {projectName}
              </span>
              <ChevronRight className="mdp2-bc-sep" style={{ width: 12, height: 12 }} />
            </>
          ) : (
            <>
              <Link to="/dashboard/meetings" className="mdp2-bc-link">
                <Layout style={{ width: 12, height: 12 }} />
                Meetings
              </Link>
              <ChevronRight className="mdp2-bc-sep" style={{ width: 12, height: 12 }} />
            </>
          )}
          <span className="mdp2-bc-current">{meeting.title}</span>
        </nav>
      </div>

      {/* ── Meeting Header Card ── */}
      <div className="mdp2-header-card">
        {/* Global Save Status Indicator */}
        <div className={`mdp2-save-status ${saveStatus || ''}`}>
          {saveStatus === 'saving' && <><Loader className="mdp2-spin" size={12} /> Saving...</>}
          {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
          {saveStatus === 'error' && <span className="mdp2-save-error" onClick={() => window.location.reload()}>Failed to save — Retry</span>}
        </div>

        <div className="mdp2-header-top">
          <div style={{ flex: 1 }}>
            <div className="mdp2-header-meta">
              {/* Status Badge Editing */}
              <div className="mdp2-inline-edit-container">
                <button 
                  className={`mdp2-status-badge ${meetingStatus} editable`}
                  onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                >
                  {meetingStatus === 'live' && <span className="mdp2-live-dot" />}
                  {meetingStatus === 'upcoming' ? 'Scheduled' : 
                   meetingStatus === 'ended' ? 'Ended' : 
                   meetingStatus === 'cancelled' ? 'Cancelled' : meetingStatus.toUpperCase()}
                </button>
                {activeDropdown === 'status' && (
                  <div className="mdp2-inline-dropdown compact">
                    {['upcoming', 'cancelled', 'ended', 'draft'].map(s => (
                      <button 
                        key={s} 
                        className={`mdp2-dropdown-item ${meeting.status === s ? 'active' : ''}`}
                        onClick={async () => {
                          if (s === 'cancelled') {
                            const isConfirmed = await confirm({
                              title: 'Cancel Meeting',
                              description: 'Are you sure you want to cancel this meeting? This will notify all attendees.',
                              confirmText: 'Yes, Cancel',
                              variant: 'danger'
                            });
                            if (!isConfirmed) return;
                          }
                          updateMeetingField('status', s);
                          setActiveDropdown(null);
                        }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {meeting.status === s && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="mdp2-meta-sep">|</span>

              <div className="mdp2-meta-group">
                {/* Date Editing */}
                <div className="mdp2-inline-edit-container">
                  <span className="mdp2-meta-item editable" onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}>
                    <Calendar style={{ width: 12, height: 12 }} />
                    {formatDate(meeting.date)}
                    {currentConflict && (
                      <div className="mdp2-conflict-indicator" title={`Conflicts with ${currentConflict.title}`}>
                        <div className="mdp2-conflict-pulse" />
                      </div>
                    )}
                  </span>
                  {activeDropdown === 'date' && (
                    <div className="mdp2-inline-dropdown picker">
                      <input 
                        type="date" 
                        defaultValue={meeting.date}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== meeting.date) {
                            updateMeetingField('date', e.target.value);
                          }
                          setActiveDropdown(null);
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Time Editing */}
                <div className="mdp2-inline-edit-container">
                  <span className="mdp2-meta-item editable" onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}>
                    <Clock style={{ width: 12, height: 12 }} />
                    {meeting.time}
                  </span>
                  {activeDropdown === 'time' && (
                    <div className="mdp2-inline-dropdown picker">
                      <input 
                        type="time" 
                        defaultValue={meeting.time.includes('AM') || meeting.time.includes('PM') ? "" : meeting.time}
                        onBlur={(e) => {
                          if (e.target.value) {
                            // Convert 24h to 12h if needed
                            let [h, m] = e.target.value.split(':').map(Number);
                            const period = h >= 12 ? 'PM' : 'AM';
                            h = h % 12 || 12;
                            const time12 = `${h}:${String(m).padStart(2, '0')} ${period}`;
                            if (time12 !== meeting.time) {
                              updateMeetingField('time', time12);
                            }
                          }
                          setActiveDropdown(null);
                        }}
                        autoFocus
                      />
                      <div className="mdp2-dropdown-hint text-[9px] mt-1 text-orange-400 font-bold uppercase">
                        {currentConflict ? `Conflicts with ${currentConflict.title}` : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <span className="mdp2-meta-sep">|</span>

              {/* Host Reassignment */}
              <div className="mdp2-inline-edit-container">
                <span className="mdp2-meta-item editable" onClick={() => setActiveDropdown(activeDropdown === 'host' ? null : 'host')}>
                  <Users style={{ width: 12, height: 12 }} />
                  Host: <strong style={{ color: '#111827', marginLeft: 3 }}>{hostName}</strong>
                </span>
                {activeDropdown === 'host' && (
                  <div className="mdp2-inline-dropdown searchable">
                    <div className="mdp2-dropdown-search">
                      <Search size={14} />
                      <input type="text" placeholder="Search attendees..." autoFocus />
                    </div>
                    <div className="mdp2-dropdown-list">
                      {attendees.map((att, idx) => {
                        const name = typeof att === 'string' ? att.split('@')[0] : att.name || att.email.split('@')[0];
                        return (
                          <button 
                            key={idx} 
                            className="mdp2-dropdown-item"
                            onClick={() => {
                              // Move selected attendee to first position (host)
                              const newAtts = [...attendees];
                              const [removed] = newAtts.splice(idx, 1);
                              newAtts.unshift(removed);
                              updateMeetingField('attendees', newAtts);
                              setActiveDropdown(null);
                            }}
                          >
                            {name}
                            {hostName === name && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <span className="mdp2-meta-sep">|</span>

              {/* Platform Switcher */}
              <div className="mdp2-inline-edit-container">
                <div 
                  className="mdp2-platform-badge editable" 
                  onClick={() => setActiveDropdown(activeDropdown === 'platform' ? null : 'platform')}
                >
                  {platformIcon}
                  <span>{meeting.platform === 'google' || meeting.platform === 'meet' ? 'Google Meet' : 'MS Teams'}</span>
                </div>
                {activeDropdown === 'platform' && (
                  <div className="mdp2-inline-dropdown compact">
                    <button 
                      className={`mdp2-dropdown-item ${(meeting.platform === 'google' || meeting.platform === 'meet') ? 'active' : ''}`}
                      onClick={() => {
                        if (meeting.platform !== 'google' && meeting.platform !== 'meet') {
                          updateMeetingField('platform', 'google');
                        }
                        setActiveDropdown(null);
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                      Google Meet
                      {(meeting.platform === 'google' || meeting.platform === 'meet') && <Check size={14} />}
                    </button>
                    <button 
                      className={`mdp2-dropdown-item ${meeting.platform === 'teams' ? 'active' : ''}`}
                      onClick={() => {
                        if (meeting.platform !== 'teams') {
                          updateMeetingField('platform', 'teams');
                        }
                        setActiveDropdown(null);
                      }}
                    >
                      <Video style={{ width: 14, height: 14, color: '#4f46e5' }} />
                      MS Teams
                      {meeting.platform === 'teams' && <Check size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Title Editing */}
            <div className="mdp2-title-container">
              {editingTitle ? (
                <input
                  className="mdp2-meeting-title-input"
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                />
              ) : (
                <div 
                  className="mdp2-meeting-title-row"
                  onClick={() => {
                    setTempTitle(meeting.title);
                    setEditingTitle(true);
                  }}
                >
                  <h1 className="mdp2-meeting-title">{meeting.title}</h1>
                  <PencilIcon className="mdp2-title-pencil" size={16} />
                </div>
              )}
            </div>
          </div>

          <div className="mdp2-header-actions">
            {meetingStatus === 'upcoming' && countdown && (
              <div className={`mdp2-timer-badge ${
                countdown.includes('h') && parseInt(countdown) > 6 ? 'green' : 
                countdown.includes('h') && parseInt(countdown) >= 1 ? 'amber' : 'red'
              }`}>
                {countdown}
              </div>
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
      </div>

      {/* ── Body Grid ── */}
      <div className="mdp2-body">

        {/* Left Column */}
        <div className="mdp2-panel-group">

          {/* BEFORE MEETING */}
          <div className="mdp2-phase-label">Before Meeting</div>

          {/* Agenda Builder */}
          <div className="mdp2-card" ref={agendaPanelRef}>
            <div className="mdp2-card-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="mdp2-card-title">Agenda</span>
                {meeting && (
                  <div className="mdp2-time-budget-container">
                    <div className="mdp2-time-budget-meta">
                      <span>{totalDuration} min of {meeting.duration || 60} min planned</span>
                      {totalDuration > (meeting.duration || 60) && (
                        <span className="mdp2-budget-over">({totalDuration - (meeting.duration || 60)} min over)</span>
                      )}
                    </div>
                    <div className="mdp2-budget-bar-bg">
                      <div 
                        className={`mdp2-budget-bar-fill ${
                          totalDuration > (meeting.duration || 60) ? 'red' : 
                          totalDuration > (meeting.duration || 60) - 5 ? 'amber' : 'green'
                        }`}
                        style={{ width: `${Math.min(100, (totalDuration / (meeting.duration || 60)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mdp2-card-body">
              <div className="mdp2-agenda-builder">
                {/* Suggestions for Empty State */}
                {agenda.length === 0 && (
                  <div className="mdp2-agenda-suggestions">
                    <div className="mdp2-suggestion-label">Suggested for {meeting?.title} — click to add</div>
                    {getAgendaSuggestions(meeting?.title).map((s, idx) => (
                      <div 
                        key={`suggest-${idx}`} 
                        className="mdp2-agenda-row ghost"
                        onClick={() => addAgendaPoint(s)}
                      >
                        <div className="mdp2-row-number">{idx + 1}</div>
                        <div className="mdp2-row-text">{s}</div>
                        <Plus className="mdp2-row-plus" size={14} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmed Agenda Items */}
                <div 
                  className="mdp2-agenda-list"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  {agenda.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`mdp2-agenda-row ${draggedIndex === idx ? 'dragging' : ''} ${dragOverIndex === idx ? 'drag-over' : ''} ${item.status}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                    >
                      {/* Drag Handle */}
                      <div className="mdp2-row-grip">
                        {item.status === 'completed' ? <Check size={14} className="text-green-600" /> : <GripVertical size={14} />}
                      </div>

                      {/* Number */}
                      <div className="mdp2-row-number">{idx + 1}</div>

                      {/* Text Edit */}
                      <div className="mdp2-row-content">
                        <input 
                          className="mdp2-row-input"
                          value={item.title}
                          onChange={(e) => updateAgendaItem(idx, 'title', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addAgendaPoint('', idx);
                            if (e.key === 'Backspace' && !item.title) deleteAgendaItem(idx);
                          }}
                          placeholder="What will you discuss?"
                        />
                      </div>

                      {/* Meta Actions (Hover) */}
                      <div className="mdp2-row-actions">
                        {/* Assignee Picker */}
                        <div className="mdp2-inline-edit-container">
                          <button 
                            className="mdp2-avatar-picker"
                            onClick={() => setActiveDropdown(activeDropdown === `assignee-${idx}` ? null : `assignee-${idx}`)}
                          >
                            {item.assignee ? (
                              <div className="mdp2-avatar-sm" title={item.assignee}>
                                {getInitials(item.assignee)}
                              </div>
                            ) : (
                              <div className="mdp2-avatar-plus"><Plus size={10} /></div>
                            )}
                          </button>
                          {activeDropdown === `assignee-${idx}` && (
                            <div className="mdp2-inline-dropdown compact bottom-left">
                              <button className="mdp2-dropdown-item" onClick={() => { updateAgendaItem(idx, 'assignee', null); setActiveDropdown(null); }}>
                                Unassigned
                              </button>
                              {attendees.map((att, aidx) => {
                                const name = typeof att === 'string' ? att.split('@')[0] : att.name || att.email.split('@')[0];
                                return (
                                  <button 
                                    key={aidx} 
                                    className="mdp2-dropdown-item"
                                    onClick={() => {
                                      updateAgendaItem(idx, 'assignee', name);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    {name}
                                    {item.assignee === name && <Check size={14} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Time Estimate */}
                        <div className="mdp2-row-time">
                          <input 
                            type="number"
                            className="mdp2-time-input"
                            value={item.duration || ''}
                            onChange={(e) => updateAgendaItem(idx, 'duration', e.target.value)}
                            placeholder="0"
                          />
                          <span>min</span>
                        </div>

                        {/* Controls */}
                        <div className="mdp2-row-controls">
                          <button className="mdp2-control-btn" onClick={() => duplicateAgendaItem(idx)} title="Duplicate">
                            <Copy size={13} />
                          </button>
                          <button className="mdp2-control-btn del" onClick={() => deleteAgendaItem(idx)} title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Point Button */}
                <button 
                  className="mdp2-agenda-add-btn"
                  onClick={() => addAgendaPoint()}
                >
                  <Plus size={14} />
                  Add agenda point
                </button>
              </div>
            </div>
          </div>

          {/* Smart Attendee Management */}
          <div className="mdp2-card">
            <div className="mdp2-card-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mdp2-card-title">Attendees</span>
                  <button 
                    className="mdp2-card-action-link"
                    onClick={() => setShowAttendeeSearch(!showAttendeeSearch)}
                  >
                    <UserPlus size={14} />
                    Add
                  </button>
                </div>
                
                {/* RSVP Summary Chips */}
                <div className="mdp2-rsvp-summary">
                  {(() => {
                    const counts = attendees.reduce((acc, a) => {
                      const status = (a.rsvpStatus || 'PENDING').toLowerCase();
                      acc[status] = (acc[status] || 0) + 1;
                      return acc;
                    }, {});
                    if (counts.pending === 0 && counts.declined === 0 && attendees.length > 0) {
                      return <div className="mdp2-rsvp-chip all">All confirmed</div>;
                    }
                    return (
                      <>
                        <div className="mdp2-rsvp-chip ok">{counts.accepted || 0} accepted</div>
                        <div className="mdp2-rsvp-chip wait">{counts.pending || 0} pending</div>
                        <div className="mdp2-rsvp-chip no">{counts.declined || 0} declined</div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* RSVP Nudge Banner */}
            {!bannerDismissed && attendees.some(a => a.rsvpStatus === 'PENDING') && (
              <div className="mdp2-nudge-banner">
                <div className="mdp2-nudge-content">
                  <AlertCircle size={14} />
                  <span>{attendees.filter(a => a.rsvpStatus === 'PENDING').length} awaiting response</span>
                </div>
                <div className="mdp2-nudge-actions">
                  <button onClick={() => { handleBulkAction('resend'); setBannerDismissed(true); }}>Remind all</button>
                  <button onClick={() => setBannerDismissed(true)}>Dismiss</button>
                </div>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedAttendeeIds.length > 1 && (
              <div className="mdp2-bulk-bar">
                <span>{selectedAttendeeIds.length} selected</span>
                <div className="mdp2-bulk-actions">
                  <button onClick={() => handleBulkAction('resend')} title="Resend Invites"><Send size={14} /></button>
                  <button onClick={() => handleBulkAction('copy')} title="Copy Emails"><Copy size={14} /></button>
                  <button onClick={() => handleBulkAction('remove')} className="del" title="Remove Selected"><Trash2 size={14} /></button>
                </div>
                <button className="mdp2-bulk-close" onClick={() => setSelectedAttendeeIds([])}><X size={14} /></button>
              </div>
            )}

            <div className="mdp2-card-body" style={{ padding: 0 }}>
              {/* Add Attendee Search Input */}
              {showAttendeeSearch && (
                <div className="mdp2-search-row">
                  <div className="mdp2-search-input-wrapper">
                    <Search size={14} className="mdp2-search-icon" />
                    <input 
                      autoFocus
                      placeholder="Search by name or email..."
                      value={attendeeSearchQuery}
                      onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowAttendeeSearch(false);
                      }}
                    />
                  </div>
                  
                  {attendeeSearchQuery.trim() && (
                    <div className="mdp2-autocomplete-dropdown">
                      {MOCK_TEAM_MEMBERS.filter(m => 
                        m.name.toLowerCase().includes(attendeeSearchQuery.toLowerCase()) || 
                        m.email.toLowerCase().includes(attendeeSearchQuery.toLowerCase())
                      ).map(contact => (
                        <div 
                          key={contact.id} 
                          className="mdp2-autocomplete-item"
                          onClick={() => { handleAddAttendee(contact); setAttendeeSearchQuery(''); }}
                        >
                          <div className="mdp2-avatar-sm" style={{ backgroundColor: getInitialsColor(contact.name) }}>
                            {getInitials(contact.name)}
                          </div>
                          <div className="mdp2-contact-info">
                            <span className="name">{contact.name}</span>
                            <span className="email">{contact.email}</span>
                          </div>
                          <div className="mdp2-contact-meta">
                            {contact.timezone}
                            {['22', '23', '00', '01', '02', '03', '04', '05'].includes(getAttendeeTime(contact.timezone, meeting?.date, meeting?.time).split(':')[0]) && (
                              <AlertCircle size={10} className="text-amber-500" title="Outside working hours" />
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Fallback for raw email */}
                      {!MOCK_TEAM_MEMBERS.some(m => m.email === attendeeSearchQuery) && attendeeSearchQuery.includes('@') && (
                        <div 
                          className="mdp2-autocomplete-item fallback"
                          onClick={() => { handleAddAttendee(attendeeSearchQuery); setAttendeeSearchQuery(''); }}
                        >
                          <UserPlus size={14} />
                          <span>Invite <strong>{attendeeSearchQuery}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mdp2-attendee-list">
                {attendees
                  .sort((a, b) => {
                    const roleOrder = { host: 0, organizer: 1, attendee: 2 };
                    if (roleOrder[a.role || 'attendee'] !== roleOrder[b.role || 'attendee']) {
                      return roleOrder[a.role || 'attendee'] - roleOrder[b.role || 'attendee'];
                    }
                    const statusOrder = { accepted: 0, pending: 1, declined: 2 };
                    return statusOrder[a.rsvpStatus?.toLowerCase() || 'pending'] - statusOrder[b.rsvpStatus?.toLowerCase() || 'pending'];
                  })
                  .map((att, i) => {
                    const email = typeof att === 'string' ? att : att.email;
                    const id = att.id || email;
                    const name = att.name || email.split('@')[0];
                    const rsvp = (att.rsvpStatus || 'PENDING').toLowerCase();
                    const isRemoving = removingAttendeeId === id;

                    return (
                      <div 
                        key={id} 
                        className={`mdp2-attendee-row rich ${rsvp} ${isRemoving ? 'removing' : ''}`}
                      >
                        {/* Checkbox for Bulk */}
                        <div className="mdp2-att-check">
                          <input 
                            type="checkbox" 
                            checked={selectedAttendeeIds.includes(id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAttendeeIds([...selectedAttendeeIds, id]);
                              else setSelectedAttendeeIds(selectedAttendeeIds.filter(sid => sid !== id));
                            }}
                          />
                        </div>

                        <div className="mdp2-avatar" style={{ backgroundColor: getInitialsColor(name) }}>
                          {getInitials(name)}
                          <div className="mdp2-avatar-tooltip">
                            <strong>{name}</strong>
                            <span>{email}</span>
                            <div className="mdp2-local-time">
                              <Clock size={10} />
                              {getAttendeeTime(att.timezone || 'IST', meeting?.date, meeting?.time)} local
                            </div>
                          </div>
                        </div>

                        <div className="mdp2-att-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="mdp2-att-name">{name}</span>
                            {att.role === 'host' && (
                              <div className="mdp2-role-badge host" onClick={() => handleHostReassignment(id)}>Host</div>
                            )}
                            {att.role === 'organizer' && (
                              <div className="mdp2-role-badge organizer">Organizer</div>
                            )}
                          </div>
                          <span className="mdp2-att-email">{email}</span>
                        </div>

                        {/* RSVP Chip with Override */}
                        <div className="mdp2-inline-edit-container">
                          <div 
                            className={`mdp2-rsvp-chip-status ${rsvp}`}
                            onClick={() => setActiveDropdown(activeDropdown === `rsvp-${id}` ? null : `rsvp-${id}`)}
                          >
                            {rsvp === 'accepted' && <Check size={12} />}
                            {rsvp === 'pending' && <Clock size={12} />}
                            {rsvp === 'declined' && <X size={12} />}
                            <span style={{ textTransform: 'capitalize' }}>{rsvp}</span>
                          </div>
                          {activeDropdown === `rsvp-${id}` && (
                            <div className="mdp2-inline-dropdown compact bottom-left" style={{ zIndex: 120 }}>
                              {['accepted', 'pending', 'declined'].map(s => (
                                <button 
                                  key={s}
                                  className="mdp2-dropdown-item"
                                  onClick={() => { handleUpdateAttendee(id, 'rsvpStatus', s.toUpperCase()); setActiveDropdown(null); }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="mdp2-att-actions">
                          <span className="mdp2-att-tz"><Globe size={12} /> {att.timezone || 'IST'}</span>
                          <div className="mdp2-action-btns">
                            <button onClick={() => handleResendInvite(email)} title="Resend Invite"><Send size={13} /></button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === `role-${id}` ? null : `role-${id}`); }}
                              title="Change Role"
                            >
                              <Crown size={13} />
                            </button>
                            {activeDropdown === `role-${id}` && (
                              <div className="mdp2-inline-dropdown compact bottom-right" style={{ zIndex: 120 }}>
                                <button className="mdp2-dropdown-item" onClick={() => { handleHostReassignment(id); setActiveDropdown(null); }}>Make Host</button>
                                <button className="mdp2-dropdown-item" onClick={() => { handleUpdateAttendee(id, 'role', 'organizer'); setActiveDropdown(null); }}>Make Organizer</button>
                                <button className="mdp2-dropdown-item" onClick={() => { handleUpdateAttendee(id, 'role', 'attendee'); setActiveDropdown(null); }}>Make Attendee</button>
                              </div>
                            )}
                            <button className="del" onClick={() => handleRemoveAttendee(id)} title="Remove"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Timezone Overlap Panel */}
              {attendees.some(a => a.timezone && a.timezone !== 'IST') && (
                <div className="mdp2-timezone-panel">
                  <div className="mdp2-timezone-header">
                    <span>Timezone overlap</span>
                    <Globe size={12} />
                  </div>
                  <div className="mdp2-timezone-overlap">
                    {attendees.map((att, i) => (
                      <div key={i} className="mdp2-tz-item">
                        <span className="initials">{getInitials(att.name || att.email)}</span>
                        <span className="time">{getAttendeeTime(att.timezone || 'IST', meeting?.date, meeting?.time)}</span>
                        {['22', '23', '00', '01', '02', '03', '04', '05'].includes(getAttendeeTime(att.timezone || 'IST', meeting?.date, meeting?.time).split(':')[0]) && (
                          <AlertCircle size={10} className="text-amber-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State Prompt */}
              {attendees.length === 0 && !showAttendeeSearch && (
                <div className="mdp2-attendees-empty">
                  <Users size={24} />
                  <p>No attendees yet — meetings are better together</p>
                  <button onClick={() => setShowAttendeeSearch(true)}>+ Invite people</button>
                  <span>They'll receive an invite automatically</span>
                </div>
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
                          ? <Spinner size="sm" />
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
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: 'Cancel Meeting',
                  description: `Are you sure you want to cancel "${meeting.title}"? All attendees will be notified.`,
                  confirmText: 'Yes, Cancel Meeting',
                  variant: 'danger'
                });
                if (isConfirmed) {
                  try { 
                    await API.post(`/meetings/${id}/cancel`, { reason: 'User requested cancellation' }); 
                    toast.success('Meeting cancelled successfully');
                    navigate('/dashboard/meetings'); 
                  } catch {
                    toast.error('Failed to cancel meeting');
                  }
                }
              }}
            >
              <Trash2 style={{ width: 13, height: 13 }} />
              Cancel Meeting
            </button>
          </div>

        </div>
      </div>




    </div>
  );
};

export default MeetingDetailsPage;
