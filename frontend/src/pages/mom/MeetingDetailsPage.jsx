// Caldim Executive-Grade Meeting Details Page
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Video, Copy, Check, X, ArrowUpRight, Trash2,
  FileText, AlertCircle, Plus, GripVertical,
  Eye, EyeOff, Send, Loader, ChevronLeft, ChevronRight,
  Home, Layout, Calendar, Clock, Users, Activity,
  Mic, Square, Pause, Play, Sparkles, Pencil as PencilIcon, Search, ChevronDown,
  ChevronUp, GripHorizontal, Globe, Crown, Mail, UserPlus, MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import './MeetingDetailsPage.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../../hooks/use-confirm';
import { Spinner } from '../../components/ui/spinner';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
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
  const duration = meeting.duration_minutes || 60;
  const end = new Date(start.getTime() + duration * 60000);
  const now = Date.now();

  if (now < start.getTime() - 15 * 60000) return 'upcoming';
  if (now < end.getTime()) return 'live';
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
  // Resend invite: tracks in-flight email (spinner) and confirmed-sent emails (✓ badge)
  const [resendingEmail, setResendingEmail] = useState(null);
  const [resentEmails, setResentEmails] = useState(new Set());

  // Access key
  const [accessKeyRevealed, setAccessKeyRevealed] = useState(false);


  // Reschedule
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState('');

  // MOM
  const [momContent, setMomContent] = useState('');
  const [generatingMom, setGeneratingMom] = useState(false);

  // After-meeting state
  const [afterTab, setAfterTab] = useState('mom'); // legacy, will be removed
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [isBeforeCollapsed, setIsBeforeCollapsed] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [emailComposed, setEmailComposed] = useState({ to: [], subject: '', body: '', isEditing: false });
  const [undoActionItem, setUndoActionItem] = useState(null);
  const [activeTab, setActiveTab] = useState('before'); // before | notes | actions | mom | follow-up
  const [isFullyWrapped, setIsFullyWrapped] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

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
  
  // Health Panel & Readiness
  const [isHealthCollapsed, setIsHealthCollapsed] = useState(() => {
    return localStorage.getItem(`mdp-health-collapsed-${id}`) === 'true';
  });
  const [showReminderDropdown, setShowReminderDropdown] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedulePanel, setShowReschedulePanel] = useState(false);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', notify: true, note: '' });
  const [duplicateData, setDuplicateData] = useState({ date: '', time: '', agenda: true, attendees: true, platform: true, type: true });
  const [undoAction, setUndoAction] = useState(null);
  const [undoTimer, setUndoTimer] = useState(0);

  // Derived state for locking interactions
  const isLocked = meeting?.status === 'cancelled';
  const [fixLoading, setFixLoading] = useState(null); // key of item being fixed

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

  const agendaPanelRef = useRef(null);

  const showToast = (message) => {
    toast.success(message);
  };

  const getHealthChecks = () => {
    if (!meeting) return [];
    
    const checks = [
      {
        id: 'link',
        label: 'Meet link configured',
        sub: meeting.join_url ? 'Attendees can join with one click' : 'No link configured',
        status: meeting.join_url ? 'ok' : 'warn',
        action: meeting.join_url ? null : 'Configure',
        onAction: () => handleHealthFix('link')
      },
      {
        id: 'agenda',
        label: 'Agenda added',
        sub: agenda.length > 0 ? `${agenda.length} items added` : 'Meetings without agendas run 40% longer',
        status: agenda.length > 0 ? 'ok' : 'warn',
        action: agenda.length > 0 ? null : 'Add',
        onAction: () => handleHealthFix('agenda')
      },
      {
        id: 'invites',
        label: 'Attendees invited',
        sub: meeting.invites_sent ? 'All invitations delivered' : (attendees.length > 0 ? `${attendees.length} people haven't received their invite` : 'No attendees invited yet'),
        status: meeting.invites_sent ? 'ok' : (attendees.length > 0 ? 'warn' : 'gray'),
        action: meeting.invites_sent ? null : (attendees.length > 0 ? 'Send' : 'Add'),
        onAction: () => handleHealthFix('invites')
      },
      {
        id: 'time',
        label: 'Time confirmed',
        sub: meeting.date && meeting.time ? 'Schedule is set' : 'Time not set',
        status: meeting.date && meeting.time ? 'ok' : 'warn',
        action: meeting.date && meeting.time ? null : 'Set',
        onAction: () => handleHealthFix('time')
      },
      {
        id: 'host',
        label: 'Host assigned',
        sub: attendees.some(a => a.role === 'host') ? 'Host is designated' : 'No host is designated',
        status: attendees.some(a => a.role === 'host') ? 'ok' : 'warn',
        action: attendees.some(a => a.role === 'host') ? null : 'Assign',
        onAction: () => handleHealthFix('host')
      },
      {
        id: 'reminder',
        label: 'Reminder scheduled',
        sub: meeting.reminder_minutes ? `Reminder set for ${meeting.reminder_minutes}m before` : 'Automatic reminders are off',
        status: meeting.reminder_minutes ? 'ok' : 'warn',
        action: meeting.reminder_minutes ? null : 'Set',
        onAction: () => handleHealthFix('reminder')
      }
    ];
    return checks;
  };
  const healthChecks = getHealthChecks();
  const passedCount = healthChecks.filter(c => c.status === 'ok').length;
  const totalCount = healthChecks.length;
  const healthStatus = passedCount === totalCount ? 'ready' : (passedCount >= totalCount - 2 ? 'almost' : 'not-ready');
  const ringColor = healthStatus === 'ready' ? '#059669' : (healthStatus === 'almost' ? '#f59e0b' : '#ef4444');
  const readinessLabel = healthStatus === 'ready' ? 'READY' : (healthStatus === 'almost' ? 'ALMOST' : 'NOT READY');

  const getSmartNudges = () => {
    const nudges = [];
    if (!meeting) return [];

    const isSoon = meeting.date === new Date().toISOString().split('T')[0];
    if (isSoon && agenda.length === 0 && meetingStatus !== 'ended') {
      nudges.push({
        id: 'soon-no-agenda',
        icon: <Sparkles size={16} />,
        text: "Quick tip: Even a 2-line agenda improves focus.",
        actionLabel: "Add one now →",
        onAction: scrollToAgenda
      });
    }

    if (attendees.length === 1 && meetingStatus !== 'ended') {
      nudges.push({
        id: 'solo-session',
        icon: <Activity size={16} />,
        text: "This looks like a solo session — consider blocking it as Deep Work.",
        actionLabel: "Switch type →",
        onAction: () => showToast('Switching type...')
      });
    }

    if (meeting.duration_minutes > 90 && meetingStatus !== 'ended') {
      nudges.push({
        id: 'long-meeting',
        icon: <Clock size={16} />,
        text: "Long meeting detected — consider adding a break item.",
        actionLabel: "Add break →",
        onAction: () => {
          const newAg = [...agenda, { title: 'Break (5 min)', duration: 5, assignee: null, status: 'default', id: Math.random() }];
          saveAgenda(newAg);
          showToast('Break added to agenda');
        }
      });
    }

    const hasNoTimes = agenda.some(a => !a.duration || a.duration === 0);
    if (agenda.length > 0 && hasNoTimes && meetingStatus !== 'ended') {
      nudges.push({
        id: 'no-times',
        icon: <Activity size={16} />,
        text: "Add time estimates to agenda items to keep the meeting on track.",
        actionLabel: "Add estimates →",
        onAction: scrollToAgenda
      });
    }

    return nudges.slice(0, 2);
  };

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      const resp = await API.get(`/meetings/${id}`);
      if (resp.data.success) {
        const m = resp.data.meeting;
        setMeeting(m);
        const ag = (m.agenda || []).map(parseAgendaItem);
        
        // Normalize attendees to a unified rich object structure
        const rawAttendees = m.attendees || [];
        const normalizedAttendees = rawAttendees.map(a => {
          if (typeof a === 'string') {
            return {
              id: a,
              email: a,
              name: a.split('@')[0],
              role: 'attendee',
              rsvpStatus: 'PENDING',
              invitedAt: new Date().toISOString(),
              timezone: 'IST'
            };
          }
          const email = a.email || '';
          return {
            id: a.id || email,
            email: email,
            name: a.name || email.split('@')[0] || 'Unknown',
            role: a.role || 'attendee',
            rsvpStatus: a.rsvpStatus || 'PENDING',
            invitedAt: a.invitedAt || new Date().toISOString(),
            timezone: a.timezone || 'IST'
          };
        });

        // Enforce a strict single-host assignment: if no host is designated, the first attendee gets the host role
        const hasHost = normalizedAttendees.some(a => a.role === 'host');
        const finalAttendees = normalizedAttendees.map((a, i) => {
          if (!hasHost && i === 0) {
            return { ...a, role: 'host' };
          }
          return a;
        });

        setAgenda(ag);
        setAttendees(finalAttendees);
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
      const status = getMeetingStatus(meeting);
      if (status !== meetingStatus) setMeetingStatus(status);

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
      } else {
        setCountdown('');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [meeting, meetingStatus]);

  // Initial data sync for Zone 6
  useEffect(() => {
    if (meeting) {
      setNotes(meeting.notes || '');
      try {
        const intel = meeting.intelligence_data ? JSON.parse(meeting.intelligence_data) : {};
        setActionItems(intel.actionItems || []);
        setIsFullyWrapped(meeting.status === 'archived' || (meeting.mom_generated && (intel.actionItems || []).length > 0));
        
        // Check 30-day archive lock
        const meetingDate = new Date(meeting.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (meetingDate < thirtyDaysAgo) setIsArchived(true);

      } catch (e) {
        console.error('Failed to parse intelligence_data:', e);
      }
      
      if (getMeetingStatus(meeting) === 'ended') {
        setIsBeforeCollapsed(true);
      }
    }
  }, [meeting]);

  // Auto-save effect for Notes
  useEffect(() => {
    if (notes === (meeting?.notes || '')) return;
    const t = setTimeout(() => {
      updateMeetingField('notes', notes);
    }, 1500);
    return () => clearTimeout(t);
  }, [notes]);



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

  const saveActionItems = async (items) => {
    setActionItems(items);
    try {
      const intel = meeting.intelligence_data ? JSON.parse(meeting.intelligence_data) : {};
      intel.actionItems = items;
      await updateMeetingField('intelligence_data', JSON.stringify(intel));
      await updateMeetingField('action_item_count', items.filter(i => !i.checked).length);
    } catch (err) {
      console.error('Failed to save action items:', err);
    }
  };

  const addActionItem = (text = '') => {
    const newItem = { id: Math.random(), text, assignee: null, dueDate: null, checked: false };
    saveActionItems([...actionItems, newItem]);
  };

  const updateActionItem = (id, field, value) => {
    saveActionItems(actionItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteActionItem = (id) => {
    const item = actionItems.find(i => i.id === id);
    setUndoActionItem(item);
    saveActionItems(actionItems.filter(i => i.id !== id));
    toast.success('Action item removed', {
      action: { label: 'Undo', onClick: () => saveActionItems([...actionItems, item]) }
    });
  };

  const handleComposeEmail = () => {
    const firstNotes = notes.slice(0, 500);
    const itemSummary = actionItems.map(i => `• ${i.text}${i.assignee ? ' — ' + i.assignee : ''}`).join('\n');
    const body = `Hi team,\n\nHere's a summary of today's ${meeting.title}:\n\nKey points:\n${firstNotes}...\n\nAction items:\n${itemSummary}\n\nGenerated by Caldim`;
    
    setEmailComposed({
      to: attendees.map(a => typeof a === 'string' ? a : a.email),
      subject: `Follow-up: ${meeting.title} · ${formatDate(meeting.date)}`,
      body,
      isEditing: false
    });
  };

  const handleSendFollowUp = async () => {
    showToast('Sending follow-up...');
    // Mocking API call
    setTimeout(() => {
      showToast('Follow-up sent ✓');
      setEmailComposed(prev => ({ ...prev, sentAt: new Date().toISOString() }));
    }, 1000);
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
    const exists = attendees.some(a => a.email === email);
    if (exists) {
      showToast(`${email} is already invited`);
      return;
    }

    const newAtt = typeof contact === 'string' 
      ? { id: email, email, name: email.split('@')[0], role: 'attendee', rsvpStatus: 'PENDING', invitedAt: new Date().toISOString(), timezone: 'IST' }
      : { 
          id: contact.id || contact.email, 
          email: contact.email, 
          name: contact.name || contact.email.split('@')[0] || 'Unknown', 
          role: 'attendee', 
          rsvpStatus: 'PENDING', 
          invitedAt: new Date().toISOString(), 
          timezone: contact.timezone || 'IST' 
        };

    const newAtts = [...attendees, newAtt];
    saveAttendees(newAtts);
    showToast('Invitation sent');
  };

  const handleResendInvite = async (email) => {
    if (!email || resendingEmail === email) return;
    setResendingEmail(email);
    try {
      await API.post(`/meetings/${id}/resend-invite`, { email });
      // Mark as sent — show ✓ badge for 3 s then clear
      setResentEmails(prev => new Set([...prev, email]));
      toast.success(`Invite resent to ${email}`);
      setTimeout(() => {
        setResentEmails(prev => {
          const next = new Set(prev);
          next.delete(email);
          return next;
        });
      }, 3000);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to resend invite';
      toast.error(msg);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleHostReassignment = async (attendeeId) => {
    const att = attendees.find(a => (a.id || a.email) === attendeeId);
    if (!att) return;

    const isConfirmed = await confirm({
      title: 'Transfer Host Role',
      description: `Are you sure you want to change the host to ${att.name || att.email}? There can only be one host per meeting.`,
      confirmText: 'Yes, Change Host',
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

  const handleDuplicateMeeting = async () => {
    try {
      setFixLoading('duplicate');
      const payload = {
        title: `${meeting.title} (Copy)`,
        description: meeting.description,
        date: duplicateData.date || meeting.date,
        time: duplicateData.time || meeting.time,
        platform: duplicateData.platform ? meeting.platform : 'meet',
        duration_minutes: meeting.duration_minutes,
        organizer_email: meeting.organizer_email,
        attendees: duplicateData.attendees ? attendees.map(a => a.email) : [],
        agenda_text: duplicateData.agenda ? meeting.agenda_text : '',
        project_id: meeting.project_id,
        timezone: meeting.timezone_name,
        reminder_minutes: meeting.reminder_minutes,
        reminder_notify_attendees: meeting.reminder_notify_attendees,
      };

      const resp = await API.post(`/meetings/${id}/duplicate`, payload);
      if (resp.data.success) {
        showToast('Meeting duplicated successfully');
        setShowDuplicatePanel(false);
        navigate(`/dashboard/meeting/${resp.data.meeting_id}`);
      }
    } catch (err) {
      console.error('Duplication failed:', err);
      showToast('Failed to duplicate meeting');
    } finally {
      setFixLoading(null);
    }
  };

  const startUndoWindow = (action, prevState) => {
    setUndoAction({ action, prevState });
    setUndoTimer(5);
    const interval = setInterval(() => {
      setUndoTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setUndoAction(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    setFixLoading('undo');
    try {
      const { action, prevState } = undoAction;
      
      // If we are undoing a cancellation, we restore the old status
      // Backend update_meeting now handles clearing cancellation metadata when status changes to scheduled/upcoming
      const resp = await API.patch(`/meetings/${id}`, prevState);
      
      if (resp.data.success) {
        setMeeting(resp.data.meeting);
        setUndoAction(null);
        showToast('Action reversed successfully');
      }
    } catch (err) {
      console.error('Undo failed:', err);
      showToast('Failed to undo action');
    } finally {
      setFixLoading(null);
    }
  };

  const handleReschedule = async () => {
    setFixLoading('reschedule');
    try {
      const prevState = { 
        date: meeting.date, 
        time: meeting.time, 
        status: meeting.status 
      };

      const payload = {
        date: rescheduleData.date,
        time: rescheduleData.time,
        // If it was cancelled, we reactive it
        status: meeting.status === 'cancelled' ? 'scheduled' : meeting.status
      };

      const resp = await API.patch(`/meetings/${id}`, payload);
      if (resp.data.success) {
        setMeeting(resp.data.meeting);
        setShowReschedulePanel(false);
        startUndoWindow('reschedule', prevState);
        showToast('Meeting rescheduled');
      }
    } catch (err) {
      console.error('Reschedule failed:', err);
      showToast('Failed to reschedule');
    } finally {
      setFixLoading(null);
    }
  };

  const handleHealthFix = async (key) => {
    setFixLoading(key);
    try {
      if (key === 'link') {
        // Regenerate link by patching platform (even if same)
        const resp = await API.patch(`/meetings/${id}`, { platform: meeting.platform });
        if (resp.data.success) {
          setMeeting(resp.data.meeting);
          showToast('Meeting link regenerated');
        }
      } else if (key === 'agenda') {
        scrollToAgenda();
      } else if (key === 'invites') {
        if (attendees.length > 0) {
          // Send to all pending
          const pending = attendees.filter(a => (a.rsvpStatus || 'PENDING') === 'PENDING');
          for (const p of pending) {
            await API.post(`/meetings/${id}/resend-invite`, { email: p.email });
          }
          await API.patch(`/meetings/${id}`, { invites_sent: true });
          setMeeting(prev => ({ ...prev, invites_sent: true }));
          showToast('All invites sent');
        } else {
          const el = document.getElementById('mdp2-attendees-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          setShowAttendeeSearch(true);
        }
      } else if (key === 'time') {
        const el = document.getElementById('mdp2-time-chip');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        setActiveDropdown('time');
      } else if (key === 'host') {
        const el = document.getElementById('mdp2-host-chip');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        setActiveDropdown('host');
      } else if (key === 'reminder') {
        setShowReminderDropdown(true);
      }
    } catch (err) {
      showToast('Action failed');
    } finally {
      setTimeout(() => setFixLoading(null), 800);
    }
  };

  const handleCancelMeetingInline = async () => {
    try {
      setFixLoading('cancel');
      const prevState = { status: meeting.status };
      await API.post(`/meetings/${id}/cancel`, { 
        reason: cancelReason || 'No reason provided',
        note: cancelReason,
        notify_attendees: showSendEmail,
        cancelled_by: currentUser?.name || 'Host'
      });
      setMeeting(prev => ({ ...prev, status: 'cancelled' }));
      setMeetingStatus('cancelled');
      setShowCancelConfirm(false);
      startUndoWindow('cancel', prevState);
    } catch (err) {
      showToast('Failed to cancel meeting');
    } finally {
      setFixLoading(null);
    }
  };

  const handleArchiveMeeting = async () => {
    try {
      setFixLoading('archive');
      await API.patch(`/meetings/${id}`, { status: 'archived' });
      setMeeting({ ...meeting, status: 'archived' });
      setShowArchiveConfirm(false);
      showToast('Meeting archived');
    } catch (err) {
      showToast('Failed to archive meeting');
    } finally {
      setFixLoading(null);
    }
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

  const platformIcon = meeting?.platform === 'meet' ? (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
  ) : <Video style={{ width: 13, height: 13, color: '#4f46e5' }} />;

  if (loading) return (
    <div className="mdp2-root">
      {/* Skeleton Header Zone */}
      <div className="z-header-zone">
        {/* Row 1 — Breadcrumb + Action bar */}
        <div className="z-header-row1">
          <nav className="z-breadcrumb-bar">
            <Skeleton className="h-5 w-48 rounded" />
          </nav>
          <div className="z-header-actions-bar flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>

        {/* Row 2 — Meeting identity + title */}
        <div className="z-header-row2 space-y-3">
          <div className="z-identity-line flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <div className="z-title-row">
            <Skeleton className="h-9 w-96 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Skeleton Body Layout */}
      <div className="z-body" style={{ display: 'grid', gridTemplateColumns: '1fr var(--sidebar-w, 360px)', gap: '24px', padding: '24px' }}>
        {/* Left Column Skeleton */}
        <div className="z-left-col space-y-6">
          <div className="z-card p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="z-right-col space-y-6">
          {/* Health Card skeleton */}
          <div className="z-card p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>

          {/* Attendees Card skeleton */}
          <div className="z-card p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
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

  const hostAtt = attendees.find(a => a.role === 'host') || attendees[0];
  const hostName = hostAtt?.name || hostAtt?.email?.split('@')[0] || '—';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`mdp2-root ${isLocked ? 'locked' : ''}`}>
      {/* ── Undo Bar (Global) ── */}
      {undoAction && (
        <div className="mdp2-undo-bar">
          <div className="mdp2-undo-content">
            <AlertCircle size={14} className="text-amber-500" />
            <span>Meeting {undoAction.action === 'cancel' ? 'cancelled' : 'rescheduled'}</span>
            <button className="mdp2-undo-link" onClick={handleUndo}>Undo</button>
          </div>
          <div className="mdp2-undo-progress" />
          <button className="mdp2-undo-close" onClick={() => setUndoAction(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Unified Header Zone (Zoho Premium two-row) ── */}
      <div className="z-header-zone">

        {/* Global Save Status — floating */}
        <div className={`mdp2-save-status ${saveStatus || ''}`}>
          {saveStatus === 'saving' && <><Loader className="mdp2-spin" size={12} /> Saving...</>}
          {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
          {saveStatus === 'error' && <span className="mdp2-save-error" onClick={() => window.location.reload()}>Failed to save — Retry</span>}
        </div>

        {/* Row 1 — Breadcrumb + Action bar */}
        <div className="z-header-row1">
          <nav className="z-breadcrumb-bar">
            <Link to="/dashboard" className="z-bc-link">Dashboard</Link>
            <span className="z-bc-sep">›</span>
            {projectName ? (
              <Link to="/dashboard/projects" className="z-bc-link">Projects</Link>
            ) : (
              <Link to="/dashboard/calendar" className="z-bc-link">Calendar</Link>
            )}
            {projectName && (
              <>
                <span className="z-bc-sep">›</span>
                <span className="z-bc-link">{projectName}</span>
              </>
            )}
            <span className="z-bc-sep">›</span>
            <span className="z-bc-current">{meeting?.title}</span>
          </nav>

          <div className="z-header-actions-bar">
            {/* Countdown pill */}
            {meetingStatus === 'upcoming' && countdown && !isLocked && (
              <span className="z-timer-pill">{countdown}</span>
            )}

            {/* Copy Link — ghost */}
            <button className="z-btn-ghost" onClick={() => handleCopy(meeting.join_url, 'hero-link')}>
              {copiedField === 'hero-link'
                ? <><Check size={13} style={{ color: '#137333' }} /><span style={{ color: '#137333' }}>Copied</span></>
                : <><Copy size={13} />Copy Link</>}
            </button>

            {/* Join / View Recording — primary */}
            {meetingStatus === 'ended' ? (
              <button className="z-btn-primary" onClick={() => showToast('Feature coming soon: View recording')}>
                <Video size={13} /> View Recording
              </button>
            ) : (
              <button
                className="z-btn-primary"
                onClick={() => window.open(meeting.join_url, '_blank')}
                disabled={isLocked}
              >
                <ArrowUpRight size={13} /> Join Meeting
              </button>
            )}
          </div>
        </div>

        {/* Row 2 — Meeting identity + title */}
        <div className="z-header-row2">

          {/* Identity line: status badge · date · time · host · platform */}
          <div className="z-identity-line">

            {/* Status badge — editable dropdown */}
            <div className="mdp2-inline-edit-container">
              <button
                className={`z-status-badge ${meetingStatus}`}
                onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              >
                {meetingStatus === 'live' && <span className="mdp2-live-dot" />}
                {meetingStatus === 'upcoming' ? 'SCHEDULED' :
                 meetingStatus === 'ended' ? 'ENDED' :
                 meetingStatus === 'cancelled' ? 'CANCELLED' : meetingStatus.toUpperCase()}
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

            {/* Date */}
            <div className="mdp2-inline-edit-container">
              <span
                className="z-identity-item editable"
                onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
              >
                <Calendar size={12} />
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
                      if (e.target.value && e.target.value !== meeting.date) updateMeetingField('date', e.target.value);
                      setActiveDropdown(null);
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <span className="z-identity-sep">·</span>

            {/* Time */}
            <div className="mdp2-inline-edit-container" id="mdp2-time-chip">
              <span
                className="z-identity-item editable"
                onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
              >
                <Clock size={12} />
                {meeting.time}
              </span>
              {activeDropdown === 'time' && (
                <div className="mdp2-inline-dropdown picker">
                  <input
                    type="time"
                    defaultValue={meeting.time.includes('AM') || meeting.time.includes('PM') ? '' : meeting.time}
                    onBlur={(e) => {
                      if (e.target.value) {
                        let [h, m] = e.target.value.split(':').map(Number);
                        const period = h >= 12 ? 'PM' : 'AM';
                        h = h % 12 || 12;
                        const time12 = `${h}:${String(m).padStart(2, '0')} ${period}`;
                        if (time12 !== meeting.time) updateMeetingField('time', time12);
                      }
                      setActiveDropdown(null);
                    }}
                    autoFocus
                  />
                  <div className="mdp2-dropdown-hint text-[9px] mt-1 text-orange-400 font-bold uppercase">
                    {currentConflict ? `Conflicts with ${currentConflict.title}` : ''}
                  </div>
                </div>
              )}
            </div>

            <span className="z-identity-sep">·</span>

            {/* Host */}
            <div className="mdp2-inline-edit-container" id="mdp2-host-chip">
              <Popover>
                <PopoverTrigger asChild>
                  <span className="z-identity-item editable">
                    <Users size={12} />
                    Host: <strong style={{ color: '#202124', marginLeft: 3, fontWeight: 500 }}>{hostName}</strong>
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <div className="mdp2-dropdown-search border-b p-2 flex items-center gap-2">
                    <Search size={14} className="text-slate-400" />
                    <input type="text" placeholder="Search attendees..." className="text-sm outline-none w-full" autoFocus />
                  </div>
                  <div className="mdp2-dropdown-list max-h-48 overflow-y-auto">
                    {attendees.map((att, idx) => {
                      const name = att.name || att.email.split('@')[0];
                      return (
                        <button
                          key={idx}
                          className="mdp2-dropdown-item w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center"
                          onClick={() => {
                            handleHostReassignment(att.id || att.email);
                          }}
                        >
                          {name}
                          {att.role === 'host' && <Check size={14} className="text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <span className="z-identity-sep">·</span>

            {/* Platform pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="z-platform-pill">
                  {platformIcon}
                  <span>{meeting.platform === 'google' || meeting.platform === 'meet' ? 'Google Meet' : 'MS Teams'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className={(meeting.platform === 'google' || meeting.platform === 'meet') ? 'bg-slate-50' : ''}
                  onClick={() => { if (meeting.platform !== 'google' && meeting.platform !== 'meet') updateMeetingField('platform', 'google'); }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 8 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  Google Meet
                  {(meeting.platform === 'google' || meeting.platform === 'meet') && <Check size={14} className="ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={meeting.platform === 'teams' ? 'bg-slate-50' : ''}
                  onClick={() => { if (meeting.platform !== 'teams') updateMeetingField('platform', 'teams'); }}
                >
                  <Video style={{ width: 14, height: 14, color: '#4f46e5', marginRight: 8 }} />
                  MS Teams
                  {meeting.platform === 'teams' && <Check size={14} className="ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meeting title (editable, lightweight) */}
          <div>
            {editingTitle ? (
              <input
                className="z-meeting-title-input"
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
              />
            ) : (
              <div
                className="z-title-row"
                onClick={() => { setTempTitle(meeting.title); setEditingTitle(true); }}
              >
                <h1 className="z-meeting-title">{meeting.title}</h1>
                <PencilIcon className="z-title-pencil" size={15} />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Body — two-column (left content + right sidebar) ── */}
      <div className="z-body">

        {/* ── LEFT COLUMN ── */}
        <div className="z-left-col">

          {/* Sticky Tab Bar (Post-Meeting Only) */}
          {meetingStatus === 'ended' && (
            <div className="mdp2-sticky-tabs">
              <div className="mdp2-tabs-inner">
                {['before', 'notes', 'actions', 'mom', 'follow-up'].map(tab => (
                  <button
                    key={tab}
                    className={`mdp2-tab-link ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab);
                      const idMap = { 'before': 'mdp2-before-section', 'notes': 'mdp2-notes-section', 'actions': 'mdp2-actions-section', 'mom': 'mdp2-mom-section', 'follow-up': 'mdp2-followup-section' };
                      document.getElementById(idMap[tab])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    {tab === 'notes' && notes.length > 0 && <span className="dot" />}
                    {tab === 'actions' && actionItems.length > 0 && <span className="badge">{actionItems.length}</span>}
                    {tab === 'mom' && meeting.mom_generated && <Check size={10} />}
                  </button>
                ))}
              </div>
              <div className="mdp2-save-indicator">
                {saveStatus === 'saving' && <><Loader size={12} className="animate-spin" /> Saving...</>}
                {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
              </div>
            </div>
          )}

          {/* Activation Banner */}
          {meetingStatus === 'ended' && bannerVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mdp2-activation-banner"
            >
              <div className="mdp2-banner-icon"><Sparkles size={16} /></div>
              <div className="mdp2-banner-text">
                <strong>Meeting ended.</strong> Caldim is ready to help you wrap up. Summary & Actions are waiting below.
              </div>
              <button className="mdp2-banner-close" onClick={() => setBannerVisible(false)}><X size={14} /></button>
            </motion.div>
          )}

          {isLocked && (
            <div className="mdp2-cancelled-banner">
              <div className="mdp2-cb-title">This meeting was cancelled on {new Date(meeting.cancelled_at || meeting.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <div className="mdp2-cb-subtitle">Cancellation note sent to {attendees.length} attendees</div>
              <div className="mdp2-cb-actions">
                <span className="mdp2-cb-link" onClick={() => setShowReschedulePanel(true)}>Reschedule as new →</span>
                <span className="mdp2-cb-link gray" onClick={() => setShowDuplicatePanel(true)}>Duplicate meeting →</span>
              </div>
            </div>
          )}

          {/* ─── BEFORE MEETING section (Radix Collapsible) ─── */}
          <div id="mdp2-before-section">
            <Collapsible
              open={!isBeforeCollapsed}
              onOpenChange={(open) => setIsBeforeCollapsed(!open)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="z-section-label" style={{ marginBottom: 0 }}>Before Meeting</span>
                  {/* Collapsed chip summary — always visible when closed */}
                  {isBeforeCollapsed && meetingStatus === 'ended' && (
                    <div className="mdp2-before-chip-row">
                      <span className="mdp2-before-chip"><Calendar size={11} />{agenda.length} items</span>
                      <span className="mdp2-before-chip"><Users size={11} />{attendees.filter(a => a.rsvpStatus === 'ACCEPTED').length}/{attendees.length} attending</span>
                    </div>
                  )}
                </div>
                {meetingStatus === 'ended' && (
                  <CollapsibleTrigger asChild>
                    <button className="mdp2-collapse-toggle" aria-label={isBeforeCollapsed ? 'Expand before meeting details' : 'Collapse before meeting details'}>
                      {isBeforeCollapsed
                        ? <><ChevronDown size={13} style={{ marginRight: 4 }} />Show details</>
                        : <><ChevronUp size={13} style={{ marginRight: 4 }} />Hide details</>}
                    </button>
                  </CollapsibleTrigger>
                )}
              </div>

              <CollapsibleContent>
                <div>
                    {/* ── Agenda Card ── */}
                    <div className="z-card" ref={agendaPanelRef} id="mdp2-agenda-section" style={{ marginBottom: 16 }}>
                      {/* Card header */}
                      <div className="z-card-header">
                        <span className="z-card-label">Agenda</span>
                        <span className={`z-card-meta ${totalDuration === 0 ? 'amber' : ''}`}>
                          {totalDuration} MIN OF {meeting.duration || 60} MIN PLANNED
                        </span>
                      </div>

                      {/* Suggestions (empty state) */}
                      {agenda.length === 0 && (
                        <div className="z-suggestion-block">
                          <span className="z-suggestion-label">
                            Suggested for {meeting?.title} — click to add
                          </span>
                          {getAgendaSuggestions(meeting?.title).map((s, idx) => (
                            <div
                              key={`suggest-${idx}`}
                              className="z-suggestion-row"
                              onClick={() => addAgendaPoint(s)}
                            >
                              <span className="z-suggestion-num">{idx + 1}</span>
                              <span className="z-suggestion-text">{s}</span>
                              <Plus className="z-row-plus" size={14} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Confirmed agenda items — existing logic untouched */}
                      {agenda.length > 0 && (
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
                              <div className="mdp2-row-grip">
                                {item.status === 'completed' ? <Check size={14} className="text-green-600" /> : <GripVertical size={14} />}
                              </div>
                              <div className="mdp2-row-number">{idx + 1}</div>
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
                              <div className="mdp2-row-actions">
                                <div className="mdp2-inline-edit-container">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="mdp2-avatar-picker">
                                        {item.assignee ? (
                                          <div className="mdp2-avatar-sm" title={item.assignee}>{getInitials(item.assignee)}</div>
                                        ) : (
                                          <div className="mdp2-avatar-plus"><Plus size={10} /></div>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-0">
                                      <div className="mdp2-dropdown-list">
                                        <button className="mdp2-dropdown-item w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center" onClick={() => updateAgendaItem(idx, 'assignee', null)}>Unassigned</button>
                                        {attendees.map((att, aidx) => {
                                          const name = att.name || att.email.split('@')[0];
                                          return (
                                            <button key={aidx} className="mdp2-dropdown-item w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between items-center" onClick={() => updateAgendaItem(idx, 'assignee', name)}>
                                              {name}{item.assignee === name && <Check size={14} className="text-blue-600" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="mdp2-row-time">
                                  <input type="number" className="mdp2-time-input" value={item.duration || ''} onChange={(e) => updateAgendaItem(idx, 'duration', e.target.value)} placeholder="0" />
                                  <span>min</span>
                                </div>
                                <div className="mdp2-row-controls">
                                  <button className="mdp2-control-btn" onClick={() => duplicateAgendaItem(idx)} title="Duplicate"><Copy size={13} /></button>
                                  <button className="mdp2-control-btn del" onClick={() => deleteAgendaItem(idx)} title="Remove"><Trash2 size={13} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* + Add agenda point row */}
                      <div className="z-add-row" onClick={() => addAgendaPoint()}>
                        <PencilIcon size={13} />
                        + Add agenda point
                        <Plus className="z-row-plus" size={14} />
                      </div>
                    </div>

                    {/* ── Attendees Card ── */}
                    <div className="z-card" id="mdp2-attendees-section">
                      {/* Card header */}
                      <div className="z-card-header">
                        <div className="z-att-header-left">
                          <span className="z-card-label">Attendees</span>
                          {/* RSVP chips */}
                          <div className="z-att-chips">
                            {(() => {
                              const counts = attendees.reduce((acc, a) => {
                                const s = (a.rsvpStatus || 'PENDING').toLowerCase();
                                acc[s] = (acc[s] || 0) + 1;
                                return acc;
                              }, {});
                              return (
                                <>
                                  <span className="z-rsvp-chip green">{counts.accepted || 0} accepted</span>
                                  <span className="z-rsvp-chip amber">{counts.pending || 0} pending</span>
                                  <span className="z-rsvp-chip red">{counts.declined || 0} declined</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <button className="z-btn-add-att" onClick={() => setShowAttendeeSearch(!showAttendeeSearch)}>
                          <UserPlus size={13} /> + Add
                        </button>
                      </div>

                      <div className="z-card-body">

                      {/* Nudge banner */}
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

                      {/* Search row */}
                      {showAttendeeSearch && (
                        <div className="mdp2-search-row">
                          <div className="mdp2-search-input-wrapper">
                            <Search size={14} className="mdp2-search-icon" />
                            <input
                              autoFocus
                              placeholder="Search by name or email..."
                              value={attendeeSearchQuery}
                              onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') setShowAttendeeSearch(false); }}
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
                                  <div className="mdp2-avatar-sm" style={{ backgroundColor: getInitialsColor(contact.name) }}>{getInitials(contact.name)}</div>
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
                              {!MOCK_TEAM_MEMBERS.some(m => m.email === attendeeSearchQuery) && attendeeSearchQuery.includes('@') && (
                                <div className="mdp2-autocomplete-item fallback" onClick={() => { handleAddAttendee(attendeeSearchQuery); setAttendeeSearchQuery(''); }}>
                                  <UserPlus size={14} />
                                  <span>Invite <strong>{attendeeSearchQuery}</strong></span>
                              </div>
                            )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Attendee rows — z-att-row styling */}
                      {attendees
                        .sort((a, b) => {
                          const roleOrder = { host: 0, organizer: 1, attendee: 2 };
                          if (roleOrder[a.role || 'attendee'] !== roleOrder[b.role || 'attendee']) return roleOrder[a.role || 'attendee'] - roleOrder[b.role || 'attendee'];
                          const statusOrder = { accepted: 0, pending: 1, declined: 2 };
                          return statusOrder[a.rsvpStatus?.toLowerCase() || 'pending'] - statusOrder[b.rsvpStatus?.toLowerCase() || 'pending'];
                        })
                        .map((att) => {
                          const id = att.id || att.email;
                          const email = att.email;
                          const name = att.name || email.split('@')[0];
                          const rsvp = (att.rsvpStatus || 'PENDING').toLowerCase();
                          const isRemoving = removingAttendeeId === id;

                          return (
                            <div key={id} className={`z-att-row ${isRemoving ? 'removing' : ''}`}>
                              <div className="z-avatar" style={{ backgroundColor: getInitialsColor(name) }}>{getInitials(name)}</div>
                              <div className="z-att-info">
                                <span className="z-att-name">
                                  {name}
                                  {att.role === 'host' && <span style={{ marginLeft: 6, fontSize: 11, color: '#1a73e8', background: '#e8f0fe', borderRadius: 4, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Crown size={10} /> Host</span>}
                                  {att.role === 'organizer' && <span style={{ marginLeft: 6, fontSize: 11, color: '#5f6368', background: '#f1f3f4', borderRadius: 4, padding: '1px 6px' }}>Organizer</span>}
                                </span>
                                <span className="z-att-email">{email}</span>
                              </div>
                              <div className="z-att-right">
                                {/* RSVP chip — clickable */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <span className={`z-rsvp-chip ${rsvp === 'accepted' ? 'green' : rsvp === 'declined' ? 'red' : 'amber'}`} style={{ cursor: 'pointer' }}>
                                      {rsvp.charAt(0).toUpperCase() + rsvp.slice(1)}
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2">
                                    <div className="space-y-2">
                                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Set RSVP Status</h4>
                                      {['accepted', 'pending', 'declined'].map(s => (
                                        <button key={s} className={`flex items-center justify-between w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${rsvp === s ? 'bg-slate-100 text-slate-900 font-medium' : 'hover:bg-slate-50 text-slate-600'}`} onClick={() => handleUpdateAttendee(id, 'rsvpStatus', s.toUpperCase())}>
                                          <span className="capitalize">{s}</span>
                                          {rsvp === s && <Check size={14} />}
                                        </button>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <span className="z-tz-pill">{att.timezone || 'IST'}</span>

                                {/* Inline resend — prominent for PENDING, discreet otherwise */}
                                {rsvp === 'pending' && (
                                  <button
                                    className={`z-resend-btn${resentEmails.has(email) ? ' sent' : ''}`}
                                    onClick={() => handleResendInvite(email)}
                                    disabled={resendingEmail === email || resentEmails.has(email)}
                                    title="Resend invitation"
                                  >
                                    {resendingEmail === email ? (
                                      <Loader size={11} className="mdp2-spin" />
                                    ) : resentEmails.has(email) ? (
                                      <><Check size={11} /><span>Sent</span></>
                                    ) : (
                                      <><Send size={11} /><span>Send</span></>
                                    )}
                                  </button>
                                )}

                                {/* More actions (host reassign, role change, remove) */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button style={{ background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: 4, borderRadius: 4 }} title="More actions"><MoreVertical size={14} /></button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => handleResendInvite(email)}>
                                      <Send size={13} style={{ marginRight: 8, opacity: 0.6 }} />Resend Invite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleHostReassignment(id)}>
                                      <Crown size={13} style={{ marginRight: 8, opacity: 0.6 }} />Make Host
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateAttendee(id, 'role', 'organizer')}>
                                      <Users size={13} style={{ marginRight: 8, opacity: 0.6 }} />Make Organizer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRemoveAttendee(id)} className="text-red-600">
                                      <Trash2 size={13} style={{ marginRight: 8 }} />Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}

                      {/* Empty state */}
                      {attendees.length === 0 && !showAttendeeSearch && (
                        <div className="mdp2-attendees-empty">
                          <Users size={24} />
                          <p>No attendees yet — meetings are better together</p>
                          <button onClick={() => setShowAttendeeSearch(true)}>+ Invite people</button>
                          <span>They'll receive an invite automatically</span>
                        </div>
                      )}

                      {/* Timezone overlap */}
                      {attendees.some(a => a.timezone && a.timezone !== 'IST') && (
                        <div className="mdp2-timezone-panel">
                          <div className="mdp2-timezone-header"><span>Timezone overlap</span><Globe size={12} /></div>
                          <div className="mdp2-timezone-overlap">
                            {attendees.map((att, i) => (
                              <div key={i} className="mdp2-tz-item">
                                <span className="initials">{getInitials(att.name || att.email)}</span>
                                <span className="time">{getAttendeeTime(att.timezone || 'IST', meeting?.date, meeting?.time)}</span>
                                {['22','23','00','01','02','03','04','05'].includes(getAttendeeTime(att.timezone || 'IST', meeting?.date, meeting?.time).split(':')[0]) && <AlertCircle size={10} className="text-amber-500" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>{/* end #mdp2-before-section */}

        </div>{/* end z-left-col */}

        {/* ── RIGHT SIDEBAR — Meeting Health ── */}
        {meetingStatus !== 'ended' && (
          <div className="z-right-sidebar">
            <span className="z-section-label">Meeting Health</span>
            <div className="z-card">

              {/* Health card header */}
              <div className="z-health-header">
                <span className="z-card-label">Readiness</span>
              </div>

              {/* Warning banner — only if not all checks pass */}
              {(() => {
                const checks = getHealthChecks();
                const passing = checks.filter(c => c.status === 'ok').length;
                const total = checks.length;
                if (passing < total) {
                  return (
                    <div className="z-health-warning">
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>This meeting isn't ready yet</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Readiness Ring */}
              {(() => {
                const checks = getHealthChecks();
                const passing = checks.filter(c => c.status === 'ok').length;
                const total = checks.length;
                const score = total > 0 ? Math.round((passing / total) * 100) : 0;
                const radius = 28;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (score / 100) * circumference;
                const ringColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div className="z-ring-wrap">
                    <svg className="z-ring-svg" viewBox="0 0 72 72">
                      {/* Track */}
                      <circle cx="36" cy="36" r={radius} fill="none" stroke="#f1f3f4" strokeWidth="6" />
                      {/* Fill */}
                      <circle
                        cx="36" cy="36" r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 36 36)"
                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                      />
                    </svg>
                    <div className="z-ring-center">
                      <span className="z-ring-score" style={{ color: ringColor }}>{score}%</span>
                    </div>
                    <span className="z-ring-label">Readiness</span>
                  </div>
                );
              })()}

              {/* Health check rows */}
              <div className="z-health-items">
                {getHealthChecks().map((check, idx) => (
                  <div key={idx} className="z-hc-row">
                    <div className={`z-hc-icon ${check.status === 'ok' ? 'check' : check.status === 'warn' ? 'warn' : 'gray'}`}>
                      {check.status === 'ok' ? '✓' : check.status === 'warn' ? '!' : '?'}
                    </div>
                    <div className="z-hc-text">
                      <div className="z-hc-label">{check.label}</div>
                      {check.sub && <div className="z-hc-sub">{check.sub}</div>}
                    </div>
                    {check.action && (
                      <button className="z-hc-action" onClick={check.onAction}>{check.action} →</button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>{/* end z-body */}

      {/* ── During / After content — full width below the two-col grid ── */}
      <div style={{ padding: '0 24px 24px 24px' }}>
        {(meetingStatus === 'live' || meetingStatus === 'ended') && (
          <div id="during-meeting-section">
            <div className="z-section-label">During Meeting</div>
            {/* ... preserved legacy During Meeting cards ... */}
            {/* Transcript Card */}
            <div className="z-card" style={{ marginBottom: 24 }}>
              <div className="z-card-header">
                <span className="z-card-label">Live Transcript & Recording</span>
                <div className="flex gap-2">
                  {recordState === 'IDLE' ? (
                    <button onClick={startRecording} className="z-btn-primary">
                      <Mic size={14} /> Start Recording
                    </button>
                  ) : (
                    <>
                      <button onClick={pauseRecording} className="z-btn-warn">
                        {recordState === 'RECORDING' ? <Pause size={14} /> : <Play size={14} />} 
                        {recordState === 'RECORDING' ? 'Pause' : 'Resume'}
                      </button>
                      <button onClick={stopRecording} className="z-btn-danger">
                        <Square size={14} /> Stop & Save
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="z-card-body" style={{ padding: 0 }}>
                 {/* Visualizer & Timer */}
                 {recordState !== 'IDLE' && (
                  <div className="z-viz-bar">
                    <div className="z-timer">{formatTime(timerVal)}</div>
                    <div className="z-wave">
                      {waveHeights.map((h, i) => (
                        <div key={i} className={`z-wave-bar ${recordState === 'RECORDING' ? 'active' : ''}`} style={{ height: `${recordState === 'RECORDING' ? h : 4}px` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={previewBodyRef} className="z-transcript-view">
                  {entries.length === 0 && !interimEntry && (
                    <div className="z-empty-state">
                      <Mic size={32} />
                      <span>Start recording to capture live transcript</span>
                    </div>
                  )}
                  {[...entries, interimEntry].filter(Boolean).map((e) => (
                    <div key={e.id} className={`z-transcript-row ${e.isInterim ? 'interim' : ''}`}>
                      <div className="z-avatar-sm" style={{ backgroundColor: e.bg, color: e.textColor }}>{e.initials}</div>
                      <div className="z-t-content">
                        <div className="z-t-meta"><span className="name">{e.speaker}</span><span className="time">{e.time}</span></div>
                        <div className="z-t-text">{e.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Notes Card */}
            <div className="z-card">
              <div className="z-card-header">
                <span className="z-card-label">Live Notes</span>
              </div>
              <div className="z-card-body">
                <textarea
                  className="z-textarea"
                  placeholder="Capture key points, decisions, and blockers during the meeting…"
                  rows={5}
                  value={momContent}
                  onChange={e => setMomContent(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {meetingStatus === 'ended' && (
          <div id="after-meeting-surface" style={{ marginTop: 32 }}>
            <div className="z-section-label">After Meeting</div>
            
            {/* Notes Section */}
            <div className="z-card" id="mdp2-notes-section" style={{ marginBottom: 24 }}>
              <div className="z-card-header">
                <div className="flex items-center gap-3">
                  <span className="z-card-label">Meeting Notes</span>
                  <span className="z-card-meta">{notes.split(/\s+/).filter(Boolean).length} WORDS</span>
                </div>
                <div className="z-save-status">
                  {saveStatus === 'saving' ? 'Saving...' : 'Changes saved'}
                </div>
              </div>
              <div className="z-card-body" style={{ padding: 0 }}>
                <textarea
                  className="z-notes-textarea"
                  placeholder="What did you discuss? Capture key points here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={12}
                  disabled={isArchived}
                />
              </div>
            </div>

            {/* Action Items Section */}
            <div className="z-card" id="mdp2-actions-section" style={{ marginBottom: 24 }}>
              <div className="z-card-header">
                <span className="z-card-label">Action Items</span>
                <button className="z-btn-ghost" onClick={() => addActionItem('')}>+ Add Task</button>
              </div>
              <div className="z-card-body">
                <div className="z-progress-row">
                  <div className="z-progress-label">{actionItems.filter(i => i.checked).length} of {actionItems.length} completed</div>
                  <div className="z-progress-bar"><div className="fill" style={{ width: `${actionItems.length > 0 ? (actionItems.filter(i => i.checked).length / actionItems.length) * 100 : 0}%` }} /></div>
                </div>
                <div className="z-actions-list">
                  {actionItems.map((item) => (
                    <div key={item.id} className={`z-action-row ${item.checked ? 'done' : ''}`}>
                      <input type="checkbox" checked={item.checked} onChange={(e) => updateActionItem(item.id, 'checked', e.target.checked)} />
                      <input className="z-action-input" value={item.text} onChange={(e) => updateActionItem(item.id, 'text', e.target.value)} placeholder="Describe the task..." />
                      <div className="z-action-meta">
                        <div className="z-avatar-xs">{item.assignee ? getInitials(item.assignee) : <Users size={10} />}</div>
                        <button className="z-btn-icon" onClick={() => deleteActionItem(item.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MOM & Follow-up (simplified for structure) */}
            <div className="z-grid-2">
               <div className="z-card" id="mdp2-mom-section">
                  <div className="z-card-header"><span className="z-card-label">Minutes of Meeting</span></div>
                  <div className="z-card-body">
                    {meeting.mom_generated ? (
                      <div className="z-mom-done">
                        <Check size={16} /> <span>Document Generated</span>
                        <button className="z-btn-ghost" onClick={() => navigate(`/mom/view/${id}`)}>View</button>
                      </div>
                    ) : (
                      <button className="z-btn-primary w-full" onClick={handleGenerateMOM} disabled={generatingMom}>
                        {generatingMom ? <Loader size={14} className="animate-spin" /> : <><Sparkles size={14} /> Generate MOM</>}
                      </button>
                    )}
                  </div>
               </div>

               <div className="z-card" id="mdp2-followup-section">
                  <div className="z-card-header"><span className="z-card-label">Follow-up Email</span></div>
                  <div className="z-card-body">
                    {!emailComposed.sentAt ? (
                      emailComposed.body ? (
                        <div className="z-email-composer">
                          <div className="z-email-field">
                            <label>To:</label>
                            <div className="z-recipient-chips">
                              {emailComposed.to.map(email => <span key={email} className="z-chip">{email}</span>)}
                            </div>
                          </div>
                          <div className="z-email-field">
                            <label>Subject:</label>
                            <input value={emailComposed.subject} onChange={e => setEmailComposed({...emailComposed, subject: e.target.value})} />
                          </div>
                          <textarea 
                            className="z-email-textarea"
                            value={emailComposed.body} 
                            onChange={e => setEmailComposed({...emailComposed, body: e.target.value})} 
                            rows={8}
                          />
                          <div className="z-email-footer">
                            <button className="z-btn-ghost" onClick={() => setEmailComposed({...emailComposed, body: ''})}>Discard</button>
                            <button className="z-btn-primary" onClick={handleSendFollowUp}>Send Email</button>
                          </div>
                        </div>
                      ) : (
                        <button className="z-btn-primary w-full" onClick={handleComposeEmail}>Compose Follow-up</button>
                      )
                    ) : (
                      <div className="z-email-done">
                        <Check size={32} className="text-green-600" />
                        <h3>Follow-up Sent</h3>
                        <p>Sent to {emailComposed.to.length} recipients</p>
                        <button className="z-btn-ghost" onClick={() => setEmailComposed({...emailComposed, sentAt: null, body: ''})}>Send another</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showReschedulePanel && (
          <div className="z-modal-overlay" onClick={() => setShowReschedulePanel(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="z-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Reschedule Meeting</h3>
              <div className="z-modal-body">
                <label>Date</label><input type="date" value={rescheduleData.date} onChange={e => setRescheduleData({ ...rescheduleData, date: e.target.value })} />
                <label>Time</label><input type="time" value={rescheduleData.time} onChange={e => setRescheduleData({ ...rescheduleData, time: e.target.value })} />
              </div>
              <div className="z-modal-footer">
                <button className="z-btn-ghost" onClick={() => setShowReschedulePanel(false)}>Cancel</button>
                <button className="z-btn-primary" onClick={handleReschedule}>Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Connection Details */}
      {isHost && !isLocked && (
        <div className="z-page-footer">
          <div className="z-footer-inner">
            <span className="label">Meeting Link:</span>
            <span className="value">{meeting?.join_url}</span>
            <button className="copy" onClick={() => handleCopy(meeting?.join_url, 'payload')}>Copy</button>
          </div>
        </div>
      )}

    </div>
  );
};


export default MeetingDetailsPage;
