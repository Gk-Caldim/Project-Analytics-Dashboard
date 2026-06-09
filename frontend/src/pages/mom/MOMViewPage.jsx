/**
 * MOMViewPage.jsx
 * Enterprise MOM Display — Executive Summary · Action Items · Issues · Discussion
 * Backend frozen: uses existing momSlice + POST /mom/issues API
 */
import React, { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ChevronRight, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Loader, Zap,
  MessageSquare, Target, Users, X, Clock, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../utils/api';
import { updateMomRow, deleteMomRow, setMomData as setMomDataRedux, setMeetingContext, saveMOM } from '../../store/slices/momSlice';
import MeetingTable from './MeetingTable';
import MOMSyncResultModal from '../../components/issues/MOMSyncResultModal';
import { Skeleton } from '../../components/ui/skeleton';
import './MOMViewPage.css';

// ── Speaker colour palette ───────────────────────────────────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#1e293b' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

let colorIdx = 0;
const speakerColorCache = {};
function getSpeakerColor(name) {
  if (!name) return SPEAKER_COLORS[0];
  if (!speakerColorCache[name]) {
    speakerColorCache[name] = SPEAKER_COLORS[colorIdx % SPEAKER_COLORS.length];
    colorIdx++;
  }
  return speakerColorCache[name];
}

// ── Component ────────────────────────────────────────────────────────────
const MOMViewPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { meetingId, meetingName, projectId, projectName, momData, status, lastSaved } = useSelector(s => s.mom);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Transcript Search & Highlight State ──
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [activeHighlightIdx, setActiveHighlightIdx] = useState(0);

  const { meetingId: urlMeetingId } = useParams();

  const pathMeetingId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    const viewIdx = parts.indexOf('view');
    if (viewIdx !== -1 && parts[viewIdx + 1]) {
      return parts[viewIdx + 1];
    }
    return null;
  }, []);

  const effectiveMeetingId = urlMeetingId || pathMeetingId || meetingId;

  const [loading, setLoading] = useState(false);
  const [localTranscript, setLocalTranscript] = useState([]);
  const [meetingDate, setMeetingDate] = useState(null);
  const [meetingDuration, setMeetingDuration] = useState('—');
  const [meetingAttendees, setMeetingAttendees] = useState([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [pickerProjectId, setPickerProjectId] = useState('');

  // ── Dual-Layer Route Synchronization & Session Hydration Fallback ──
  useEffect(() => {
    const resolvedId = urlMeetingId || pathMeetingId;
    if (resolvedId) {
      sessionStorage.setItem('active_meeting_id', resolvedId);
    } else {
      if (meetingId) {
        console.log('[MOMViewPage] Syncing URL with Redux active ID:', meetingId);
        navigate(`/dashboard/mom/view/${meetingId}`, { replace: true });
      } else {
        const storedId = sessionStorage.getItem('active_meeting_id');
        if (storedId) {
          console.log('[MOMViewPage] Syncing URL with SessionStorage active ID:', storedId);
          navigate(`/dashboard/mom/view/${storedId}`, { replace: true });
        } else {
          console.warn('[MOMViewPage] No active meeting ID found. Redirecting to MOM main page.');
          toast.error('No active meeting selected. Returning to dashboard.');
          navigate('/dashboard/mom', { replace: true });
        }
      }
    }
  }, [urlMeetingId, pathMeetingId, meetingId, navigate]);

  const lastSavedMomDataRef = useRef(null);

  useEffect(() => {
    API.get('/projects').then(r => {
      const data = r.data.success ? r.data.projects : (Array.isArray(r.data) ? r.data : []);
      setProjects(data);
    }).catch(() => { });

    API.get('/employees').then(r => {
      setEmployees(r.data?.success ? r.data.employees : (Array.isArray(r.data) ? r.data : []));
    }).catch(() => { });

    console.log('[MOMViewPage] Mount — urlMeetingId:', urlMeetingId, '| pathMeetingId:', pathMeetingId, '| redux meetingId:', meetingId);

    // Always hydrate from DB when the effectiveMeetingId is known.
    // This guarantees data survives hard refreshes (Redux is in-memory only).
    if (!effectiveMeetingId) return;

    setLoading(true);

    Promise.all([
      API.get(`/meetings/${effectiveMeetingId}`).catch(() => null),
      API.get(`/mom/${effectiveMeetingId}`).catch(() => null),
      API.get(`/mom/issues/${effectiveMeetingId}`).catch(() => null),
      API.get(`/transcript/${effectiveMeetingId}`).catch(() => null),
    ])
      .then(([meetingRes, momRes, issuesRes, transcriptRes]) => {
        console.log('[MOMViewPage] Hydration responses:', {
          meeting:      meetingRes?.data?.success,
          momDataRows:  momRes?.data?.mom_data?.length ?? 0,
          syncedIssues: issuesRes?.data?.total ?? 0,
          hasTranscript: !!transcriptRes?.data?.transcript_data,
        });

        const m = meetingRes?.data?.success ? meetingRes.data.meeting : null;
        if (m?.date) setMeetingDate(m.date);
        else if (m?.created_at) setMeetingDate(m.created_at);
        
        if (m?.actual_duration_minutes) setMeetingDuration(String(m.actual_duration_minutes));
        else if (m?.duration_minutes) setMeetingDuration(String(m.duration_minutes));
        
        if (m?.attendees) {
          try {
            const parsedAtt = typeof m.attendees === 'string' ? JSON.parse(m.attendees) : m.attendees;
            if (Array.isArray(parsedAtt)) setMeetingAttendees(parsedAtt);
          } catch(e) {}
        }
        
        let parsedTranscript = [];
        if (transcriptRes?.data?.transcript_data) {
          const tData = transcriptRes.data.transcript_data;
          if (Array.isArray(tData)) {
            parsedTranscript = tData;
          } else if (typeof tData === 'string') {
            try {
              const parsed = JSON.parse(tData);
              if (Array.isArray(parsed)) parsedTranscript = parsed;
            } catch (e) {}
          }
        }

        if (parsedTranscript.length === 0 && m?.transcript) {
          if (typeof m.transcript === 'string') {
            try { 
              const parsed = JSON.parse(m.transcript); 
              if (Array.isArray(parsed)) parsedTranscript = parsed;
              else parsedTranscript = [parsed];
            } catch (e) { 
              parsedTranscript = [{ type: 'dialogue', speaker: 'System', text: m.transcript }]; 
            }
          } else if (Array.isArray(m.transcript)) {
            parsedTranscript = m.transcript;
          } else if (typeof m.transcript === 'object') {
            if (Array.isArray(m.transcript.dialogue)) parsedTranscript = m.transcript.dialogue;
            else parsedTranscript = [m.transcript];
          }
        }
        setLocalTranscript(parsedTranscript);

        let finalRows = [];

        if (momRes?.data?.mom_data && momRes.data.mom_data.length > 0) {
          // Priority 1: Saved MOMSession rows — survives refresh
          finalRows = momRes.data.mom_data;
          console.log('[MOMViewPage] Source: MOMSession.mom_data →', finalRows.length, 'rows');
        } else if (issuesRes?.data?.success && issuesRes.data.rows?.length > 0) {
          // Priority 2: Synced Issue table rows
          finalRows = issuesRes.data.rows;
          console.log('[MOMViewPage] Source: Issue table →', finalRows.length, 'rows');
        } else if (m?.intelligence_data) {
          // Priority 3: Raw AI intelligence on the Meeting record
          const intel = m.intelligence_data;
          finalRows = [
            ...(intel?.action_items || []).map(a => ({
              id: Math.random(),
              function: 'General',
              criticality: a.priority || 'Medium',
              discussion_point: a.description,
              responsibility: a.owner,
              target: a.due_date || 'TBD',
              status: 'Pending',
              project_id: m.project_id,
              project_name: m.title,
            })),
            ...(intel?.decisions || []).map(d => ({
              id: Math.random(),
              function: 'Decision',
              criticality: 'Medium',
              discussion_point: d,
              responsibility: 'Everyone',
              status: 'Resolved',
              project_id: m.project_id,
              project_name: m.title,
            })),
          ];
          console.log('[MOMViewPage] Source: intelligence_data →', finalRows.length, 'rows');
        } else {
          console.warn('[MOMViewPage] No data source found for meetingId:', effectiveMeetingId);
        }

        if (finalRows.length > 0) {
          finalRows[0]._rawEntries = parsedTranscript.length > 0 ? parsedTranscript : (m?.transcript || []);
        }

        dispatch(setMomDataRedux(finalRows));
        // Stamp ref so debounced autosave does NOT re-save what was just loaded
        lastSavedMomDataRef.current = JSON.stringify(finalRows);

        // The fixed backend now returns meeting_name / project_id / project_name
        // directly on momRes.data, so we can fully hydrate without the projects list.
        const resolvedMeetingId   = m?.id ?? effectiveMeetingId;
        const resolvedMeetingName = m?.title || momRes?.data?.meeting_name || 'Unscheduled Session';
        const resolvedProjectId   = m?.project_id ?? momRes?.data?.project_id ?? null;
        const resolvedProjectName = momRes?.data?.project_name || m?.project_name || '';

        dispatch({
          type: 'mom/setMeetingContext',
          payload: {
            meetingId:   resolvedMeetingId,
            meetingName: resolvedMeetingName,
            projectId:   resolvedProjectId,
            projectName: resolvedProjectName,
          },
        });
      })
      .catch(err => {
        console.error('[MOMViewPage] Hydration failed:', err);
        toast.error('Failed to load saved meeting data.');
      })
      .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMeetingId, dispatch]);

  // Autosave MOM changes to the database
  useEffect(() => {
    if (!effectiveMeetingId || !momData || momData.length === 0) return;
    
    // Check if momData has actually changed compared to what we last saved or loaded
    const serialized = JSON.stringify(momData);
    if (lastSavedMomDataRef.current === serialized) return;

    const timer = setTimeout(() => {
      lastSavedMomDataRef.current = serialized;
      dispatch(saveMOM({
        meetingId: effectiveMeetingId,
        meetingName: meetingName || 'Unscheduled Session',
        projectId,
        projectName,
        momData
      }));
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(timer);
  }, [momData, effectiveMeetingId, meetingName, projectId, projectName, dispatch]);


  // ── Derive sections from momData ─────────────────────────────────────
  const rows = momData || [];

  // Executive Summary counts
  const execSummary = useMemo(() => {
    const risks = rows.filter(r => r.criticality === 'High' || r.criticality === 'Critical').length;
    const pending = rows.filter(r => r.status === 'Pending' || r.status === 'Open').length;
    const resolved = rows.filter(r => r.status === 'Done' || r.status === 'Closed' || r.status === 'Resolved').length;
    return { risks, pending, resolved, total: rows.length };
  }, [rows]);

  // Discussion entries from raw transcript stored per row or local state
  const transcriptEntries = useMemo(() => {
    let entries = [];
    if (localTranscript && localTranscript.length > 0) {
      entries = localTranscript;
    } else {
      for (const row of rows) {
        if (typeof row._rawEntries === 'string') {
          try { 
            const parsed = JSON.parse(row._rawEntries); 
            entries = Array.isArray(parsed) ? parsed : [parsed];
            break; 
          } catch(e) { 
            entries = [{ type: 'dialogue', speaker: 'System', text: row._rawEntries }]; 
            break; 
          }
        } else if (Array.isArray(row._rawEntries)) {
          entries = row._rawEntries;
          break;
        } else if (typeof row._rawEntries === 'object' && row._rawEntries !== null) {
          entries = Array.isArray(row._rawEntries.dialogue) ? row._rawEntries.dialogue : [row._rawEntries];
          break;
        }
      }
    }
    return entries.map(e => {
      if (typeof e === 'string') return { type: 'dialogue', speaker: 'Unknown', text: e };
      if (!e) return { type: 'dialogue', speaker: 'Unknown', text: '' };
      
      const speaker = e.speaker || e.role || e.name || 'Unknown';
      let text = e.text || e.content || e.message || '';
      if (!text && typeof e === 'object') {
         text = JSON.stringify(e);
      }
      const type = e.type || 'dialogue';
      
      return { ...e, speaker, text, type };
    });
  }, [rows, localTranscript]);

  // Participation Metrics
  const participationData = useMemo(() => {
    const stats = {};
    let totalWords = 0;
    transcriptEntries.forEach(e => {
      if (e.type === 'dialogue' && e.speaker && e.text) {
        const words = e.text.trim().split(/\s+/).length;
        if (!stats[e.speaker]) stats[e.speaker] = { name: e.speaker, value: 0 };
        stats[e.speaker].value += words;
        totalWords += words;
      }
    });
    return Object.values(stats).sort((a, b) => b.value - a.value);
  }, [transcriptEntries]);

  const metaDisplay = useMemo(() => {
    let durText = meetingDuration !== '—' ? meetingDuration : '—';
    if (durText === '—') {
      const durEntry = transcriptEntries.find(e => e.type === 'metadata' && (e.field === 'DURATION' || e.label === 'Duration'));
      if (durEntry && durEntry.value) {
        durText = durEntry.value.replace(/minutes?|min/gi, '').trim();
      }
    }

    const transcriptParticipants = transcriptEntries
      .filter(e => e.type === 'dialogue' && e.speaker && e.speaker !== 'Unknown' && e.speaker !== 'System')
      .map(e => e.speaker);

    const participantNames = Array.from(new Set([...meetingAttendees, ...transcriptParticipants]));
    return { duration: durText, participants: participantNames };
  }, [transcriptEntries, meetingDuration, meetingAttendees]);

  const session = useMemo(() => {
    let formattedTime = '—';
    if (lastSaved) {
      // Append 'Z' to treat as UTC if missing, preventing local time offset double-shifting
      const safeIso = lastSaved.endsWith('Z') ? lastSaved : `${lastSaved}Z`;
      formattedTime = new Date(safeIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return {
      name: meetingName || 'Untitled Session',
      metadata: metaDisplay,
      lastSavedTime: formattedTime
    };
  }, [meetingName, metaDisplay, lastSaved]);

  const chartOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} words ({d}%)' },
    legend: { bottom: '0%', left: 'center', itemWidth: 8, itemHeight: 8, textStyle: { fontSize: 10, color: '#6b7280' } },
    series: [
      {
        name: 'Participation',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: false } },
        labelLine: { show: false },
        data: participationData.map((d, i) => ({
          ...d,
          itemStyle: { color: getSpeakerColor(d.name).dot }
        }))
      }
    ]
  }), [participationData]);

  // ── Search & Highlight Handlers ──
  const matches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const res = [];
    transcriptEntries.forEach((entry, entryIdx) => {
      if (entry.type === 'dialogue' && entry.text) {
        const textLower = entry.text.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        if (textLower.includes(searchLower)) {
          res.push(entryIdx);
        }
      }
    });
    return res;
  }, [transcriptEntries, searchTerm]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    startTransition(() => {
      setSearchTerm(val);
      setActiveHighlightIdx(0);
    });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (matches.length > 0) {
        if (e.shiftKey) {
          setActiveHighlightIdx(prev => (prev - 1 + matches.length) % matches.length);
        } else {
          setActiveHighlightIdx(prev => (prev + 1) % matches.length);
        }
      }
    }
  };

  const handlePrevMatch = () => {
    if (matches.length > 0) {
      setActiveHighlightIdx(prev => (prev - 1 + matches.length) % matches.length);
    }
  };

  const handleNextMatch = () => {
    if (matches.length > 0) {
      setActiveHighlightIdx(prev => (prev + 1) % matches.length);
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    startTransition(() => {
      setSearchTerm('');
      setActiveHighlightIdx(0);
    });
  };

  // Scroll active match into viewport
  useEffect(() => {
    if (discussionOpen && matches.length > 0 && activeHighlightIdx < matches.length) {
      const entryIdx = matches[activeHighlightIdx];
      const element = document.getElementById(`transcript-entry-${entryIdx}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeHighlightIdx, matches, discussionOpen]);

  const highlightText = useCallback((text, highlight, isActiveEntry) => {
    if (!highlight || !highlight.trim()) return text;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark
              key={i}
              className={isActiveEntry ? "mvp-transcript-mark-active" : "mvp-transcript-mark"}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleUpdate = useCallback((id, data) => {
    dispatch(updateMomRow({ id, data }));
  }, [dispatch]);

  const handleDelete = useCallback((id) => {
    dispatch(deleteMomRow(id));
  }, [dispatch]);

  const handleCopy = useCallback(() => {
    const header = 'Priority\tAction\tOwner\tDue Date\tStatus';
    const body = rows.map(r => `${r.criticality}\t${r.discussion_point}\t${r.responsibility}\t${r.target}\t${r.status}`).join('\n');
    navigator.clipboard.writeText(`${header}\n${body}`).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rows]);


  if (loading) {
    return (
      <div className="mvp-root-wrapper">
        <div className="mvp-main-content">
          <div className="mvp-root">
            <div className="mvp-content-container">
              {/* ── Executive Header Card Skeleton ── */}
              <div className="mvp-top-container">
                {/* Breadcrumb */}
                <nav className="mvp-breadcrumb">
                  <Skeleton className="h-4 w-16" />
                  <ChevronRight size={12} className="text-gray-300" />
                  <Skeleton className="h-4 w-16" />
                  <ChevronRight size={12} className="text-gray-300" />
                  <Skeleton className="h-4 w-32" />
                  <ChevronRight size={12} className="text-gray-300" />
                  <Skeleton className="h-4 w-20" />
                </nav>

                {/* Header Card — Zoho flat style */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
                  padding: '20px 24px', background: '#fff',
                  border: '1px solid #E2E8F0', borderRadius: '10px',
                  gap: '24px'
                }}>
                  {/* Left: session identity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Skeleton className="h-6 w-80" />
                    </div>
                    <div style={{ marginBottom: '14px' }}>
                      <Skeleton className="h-4 w-28" />
                    </div>
                    {/* Slim meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock style={{ width: 12, height: 12, color: '#CBD5E1' }} />
                        <Skeleton className="h-4 w-12" />
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users style={{ width: 12, height: 12, color: '#CBD5E1' }} />
                        <Skeleton className="h-4 w-24" />
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  </div>

                  {/* Right: controls bar */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    justifyContent: 'center', gap: '12px', flexShrink: 0
                  }}>
                    {/* Row 1: Project & Status Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Skeleton className="h-6 w-28 rounded-[4px]" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    {/* Row 2: Buttons Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Skeleton className="h-9 w-32 rounded-[6px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="mvp-body">
                {/* ── 1. The Dynamic Metrics Band ── */}
                <div className="mvp-section">
                  <div className="mvp-stats-band" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    
                    {/* KEY RISKS */}
                    <div className="mvp-stat-item risks" style={{ 
                      background: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%)', 
                      border: '1px solid #FECACA', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <AlertTriangle size={16} /> Key Risks
                      </div>
                      <Skeleton className="h-8 w-12 mt-1" />
                    </div>

                    {/* PENDING ACTIONS */}
                    <div className="mvp-stat-item pending" style={{ 
                      background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)', 
                      border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Clock size={16} /> Pending Actions
                      </div>
                      <Skeleton className="h-8 w-12 mt-1" />
                    </div>

                    {/* RESOLVED */}
                    <div className="mvp-stat-item resolved" style={{ 
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)', 
                      border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <CheckCircle size={16} /> Resolved
                      </div>
                      <Skeleton className="h-8 w-12 mt-1" />
                    </div>

                    {/* TOTAL ACTIONS */}
                    <div className="mvp-stat-item total" style={{ 
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)', 
                      border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Target size={16} /> Total Actions
                      </div>
                      <Skeleton className="h-8 w-12 mt-1" />
                    </div>
                  </div>
                </div>

                {/* ── 2. The Meeting Table ── */}
                <div style={{ marginTop: '24px' }}>
                  <MeetingTable
                    meetings={[]}
                    loading={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mvp-root-wrapper">
        <div className="mvp-main-content">
          <div className="mvp-root">
            <div className="mvp-content-container">
              {/* ── Executive Header Card ── */}
              <div className="mvp-top-container">

                {/* Breadcrumb */}
                <nav className="mvp-breadcrumb">
                  <Link to="/dashboard">Dashboard</Link>
                  <ChevronRight size={12} />
                  <Link to="/dashboard/calendar">Calendar</Link>
                  <ChevronRight size={12} />
                  <span>{session.name}</span>
                  <ChevronRight size={12} />
                  <span className="active">MOM Output</span>
                </nav>

                {/* Header Card — Zoho flat style */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
                  padding: '20px 24px', background: '#fff',
                  border: '1px solid #E2E8F0', borderRadius: '10px',
                  gap: '24px'
                }}>
                  {/* Left: session identity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
                        {session.name}
                      </h1>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px' }}>
                      {meetingDate 
                        ? new Date(meetingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    {/* Slim meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                        <Clock style={{ width: 12, height: 12, color: '#94A3B8' }} />
                        {session.metadata.duration !== '—' ? `${session.metadata.duration} min` : '—'}
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                        <Users style={{ width: 12, height: 12, color: '#94A3B8' }} />
                        {session.metadata.participants.length > 0 ? `${session.metadata.participants.length} participants` : '—'}
                      </span>
                      <span style={{ width: 1, height: 12, background: '#E2E8F0' }} />
                      <span style={{ fontSize: '13px', color: '#64748B' }}>
                        {session.lastSavedTime !== '—' ? `Last saved: ${session.lastSavedTime}` : 'not yet'}
                      </span>
                    </div>
                  </div>

                  {/* Right: controls bar — Split into two right-aligned rows */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                    justifyContent: 'center', gap: '12px', flexShrink: 0
                  }}>
                     {/* Row 1: Project & Status Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                      {projectName ? (
                        <div style={{
                          padding: '4px 12px', borderRadius: '4px',
                          background: '#F0FDFA', color: '#0D9488',
                          border: '1px solid #99F6E4',
                          fontSize: '12px', fontWeight: 700,
                          whiteSpace: 'nowrap', maxWidth: '180px',
                          overflow: 'hidden', textOverflow: 'ellipsis'
                        }} title={projectName}>
                          {projectName}
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowProjectPicker(v => !v)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '4px 12px', borderRadius: '4px',
                              background: '#FFFBEB', color: '#D97706',
                              border: '1px solid #FDE68A',
                              fontSize: '12px', fontWeight: 700,
                              cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                          >
                            No Project Linked <ChevronDown size={12} />
                          </button>
                          {showProjectPicker && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                              background: '#fff', border: '1px solid #E2E8F0',
                              borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                              zIndex: 200, minWidth: '220px', overflow: 'hidden'
                            }}>
                              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Link a Project
                              </div>
                              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                {projects.length === 0 && (
                                  <div style={{ padding: '16px', fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>No projects found</div>
                                )}
                                {projects.map(p => {
                                  const pid = p.dbProjectId || p.id || p.project_id;
                                  const pname = p.name || p.project_name;
                                  return (
                                    <button
                                      key={pid}
                                      onClick={() => {
                                        dispatch(setMeetingContext({ projectId: String(pid), projectName: pname }));
                                        setShowProjectPicker(false);
                                        toast.success(`Linked to ${pname}`);
                                      }}
                                      style={{
                                        width: '100%', textAlign: 'left',
                                        padding: '10px 14px', fontSize: '13px',
                                        color: '#1E293B', background: 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        borderBottom: '1px solid #F8FAFC',
                                        fontWeight: 500
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#F0FDFA'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      {pname}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '11px', fontWeight: 700, color: '#059669',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                        On Track
                      </div>
                    </div>

                    {/* Row 2: Buttons Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      <button
                        onClick={() => setDiscussionOpen(true)}
                        style={{
                          height: '36px', padding: '7px 16px',
                          background: 'white', color: '#0D9488',
                          border: '1px solid #0D9488', borderRadius: '6px',
                          fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <MessageSquare size={14} />
                        View Transcript
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="mvp-body">
                {/* ── 1. The Dynamic Metrics Band ── */}
                <div className="mvp-section">
                  <div className="mvp-stats-band" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    
                    {/* KEY RISKS */}
                    <div className="mvp-stat-item risks" style={{ 
                      background: 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%)', 
                      border: '1px solid #FECACA', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', right: '-10px', top: '-10px', color: '#FCA5A5', opacity: 0.2 }}>
                        <AlertTriangle size={64} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B91C1C', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <AlertTriangle size={16} /> Key Risks
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#991B1B', lineHeight: 1 }}>{execSummary.risks}</div>
                    </div>

                    {/* PENDING ACTIONS */}
                    <div className="mvp-stat-item pending" style={{ 
                      background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)', 
                      border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', right: '-10px', top: '-10px', color: '#FCD34D', opacity: 0.2 }}>
                        <Clock size={64} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Clock size={16} /> Pending Actions
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400E', lineHeight: 1 }}>{execSummary.pending}</div>
                    </div>

                    {/* RESOLVED */}
                    <div className="mvp-stat-item resolved" style={{ 
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)', 
                      border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', right: '-10px', top: '-10px', color: '#86EFAC', opacity: 0.2 }}>
                        <CheckCircle size={64} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803D', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <CheckCircle size={16} /> Resolved
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 800, color: '#166534', lineHeight: 1 }}>{execSummary.resolved}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803D', opacity: 0.8 }}>
                          {execSummary.resolved === 0 ? 'None yet' : 'Tasks completed'}
                        </div>
                      </div>
                    </div>

                    {/* TOTAL ACTIONS */}
                    <div className="mvp-stat-item total" style={{ 
                      background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)', 
                      border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px',
                      display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', right: '-10px', top: '-10px', color: '#CBD5E1', opacity: 0.2 }}>
                        <Target size={64} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Target size={16} /> Total Actions
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#334155', lineHeight: 1 }}>{execSummary.total}</div>
                    </div>

                  </div>
                </div>

                {/* ── 2. The Original Meeting Table ── */}
                <div style={{ marginTop: '24px' }}>
                  {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                      <Loader size={24} className="animate-spin" style={{ color: '#0D9488', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '13px', color: '#94A3B8' }}>Loading action items…</p>
                    </div>
                  ) : rows.length > 0 ? (
                    <MeetingTable
                      meetings={rows}
                      employees={employees}
                      onUpdateMeeting={handleUpdate}
                      onDeleteMeeting={handleDelete}
                      lockedProjectId={projectId ? String(projectId) : undefined}
                    />
                  ) : (
                    <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                      <p style={{ fontSize: '15px', color: '#1E293B', fontWeight: 500 }}>
                        No action items generated
                      </p>
                      <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px' }}>
                        This meeting has no synced action items yet.
                      </p>
                      <Link 
                        to="/dashboard/saved-moms" 
                        style={{ fontSize: '13px', color: '#0D9488', marginTop: '16px', display: 'inline-block', fontWeight: 500 }}
                      >
                        ← Back to Saved MOMs
                      </Link>
                    </div>
                  )}

                </div>

                <style>{`
                  @keyframes greenPulse {
                    0% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(22, 101, 52, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(22, 101, 52, 0); }
                  }
                  .pulse-green {
                    animation: greenPulse 2s infinite;
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>

        <MOMSyncResultModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          results={syncResult}
        />

        {/* Discussion Drawer (Simplified) */}
        <AnimatePresence>
          {discussionOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDiscussionOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '480px', background: '#fff', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Raw Discussion</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Full transcript history for this session</p>
                    </div>
                  </div>
                  <button onClick={() => setDiscussionOpen(false)} style={{ padding: '8px', borderRadius: '50%', border: 'none', background: '#F1F5F9', color: '#64748B', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Search Bar Container */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search discussion dialogue..."
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        fontSize: '13px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        background: '#fff',
                        transition: 'border-color 0.15s ease',
                        opacity: isPending ? 0.7 : 1
                      }}
                    />
                    {searchInput && (
                      <button
                        onClick={clearSearch}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {searchTerm && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: '#64748B', minWidth: '45px', textAlign: 'center', fontWeight: 500 }}>
                        {matches.length > 0 ? `${activeHighlightIdx + 1}/${matches.length}` : '0/0'}
                      </span>
                      <button
                        disabled={matches.length === 0}
                        onClick={handlePrevMatch}
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                          background: '#fff',
                          cursor: matches.length > 0 ? 'pointer' : 'not-allowed',
                          opacity: matches.length > 0 ? 1 : 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Previous Match"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        disabled={matches.length === 0}
                        onClick={handleNextMatch}
                        style={{
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                          background: '#fff',
                          cursor: matches.length > 0 ? 'pointer' : 'not-allowed',
                          opacity: matches.length > 0 ? 1 : 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Next Match"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  {transcriptEntries.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {transcriptEntries.map((entry, idx) => {
                        if (entry.type === 'event') {
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <Zap size={14} style={{ color: '#0D9488' }} />
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{entry.label}</span>
                            </div>
                          );
                        }
                        const color = getSpeakerColor(entry.speaker);
                        const isMatch = matches.includes(idx);
                        const isActiveMatch = matches.length > 0 && matches[activeHighlightIdx] === idx;
                        return (
                          <div
                            key={idx}
                            id={`transcript-entry-${idx}`}
                            className={isActiveMatch ? "mvp-transcript-active-bubble" : ""}
                            style={{
                              display: 'flex',
                              gap: '12px',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              borderLeft: '4px solid transparent',
                              transition: 'all 0.2s ease',
                              background: isActiveMatch ? '#FFFBEB' : 'transparent',
                              borderLeftColor: isActiveMatch ? '#F59E0B' : 'transparent',
                            }}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                              {entry.speaker?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{entry.speaker}</span>
                                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{entry.time}</span>
                              </div>
                              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                                {highlightText(entry.text, searchTerm, isActiveMatch)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', textAlign: 'center' }}>
                      <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                      <p style={{ fontSize: '14px' }}>No discussion data available for this meeting.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default MOMViewPage;
