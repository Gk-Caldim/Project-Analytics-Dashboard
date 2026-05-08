/**
 * MeetingCapturePage.jsx
 * Enterprise Meeting Capture — 3 input modes → unified pipeline → structured preview
 * Backend frozen: all existing API contracts preserved.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Upload, Mic, Edit3, ChevronRight, Home, Layout,
  Play, Square, Pause, X, Plus, Edit2, Check,
  FileText, Loader, AlertCircle, CheckCircle, Clock,
  FileUp, Sparkles, Zap, GitBranch, Target, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../utils/api';
import {
  setMeetingContext, saveMOM, addMomRows, fetchMOM, setMomData
} from '../../store/slices/momSlice';
import './tokens.css';
import './MeetingCapturePage.css';

// ── Speaker colour palette (shared with old SpeechToText) ──────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', textColor: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', textColor: '#1D4ED8', dot: '#1e293b' },
  { bg: '#D1FAE5', textColor: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', textColor: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', textColor: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion: { bg: '#fef3c7', textColor: '#92400e' },
  Decisions: { bg: '#dbeafe', textColor: '#1d4ed8' },
  'Action Items': { bg: '#d1fae5', textColor: '#065f46' },
  Metadata: { bg: '#f1f5f9', textColor: '#475569' },
};

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// ── Platform names that should never appear as speakers ─────────────────
const PLATFORM_NAMES = new Set([
  'google meet', 'zoom', 'teams', 'microsoft teams', 'webex',
  'cisco webex', 'skype', 'slack', 'discord', 'meet',
  'google', 'zoom meeting', 'teams meeting'
]);

// ── Transcript file parser ────────────────────────────────────────────────
function parseTranscriptFile(rawText, defaultSpeaker = 'Unattributed') {
  const lines = rawText.split('\n').map(l => l.trim());
  const entries = [];

  // Regex to match header-style: [00:00:00] Speaker Name:
  const HEADER_RE = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([^:]+):\s*$/;
  // Regex to match inline-style: [00:00:00] Speaker Name: Dialogue
  const INLINE_RE = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([^:]+):\s*(.+)$/;
  const METADATA_RE = /^(MEETING TITLE|DATE|DURATION|PARTICIPANTS|START TIME|END TIME|PLATFORM)\s*:\s*(.+)$/i;

  let currentDialogue = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('───')) continue;

    // 1. Check Metadata
    const metaMatch = line.match(METADATA_RE);
    if (metaMatch) {
      entries.push({
        type: 'metadata',
        field: metaMatch[1].toUpperCase(),
        value: metaMatch[2].trim()
      });
      currentDialogue = null;
      continue;
    }

    // 2. Check Header Style [00:00] Speaker:
    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      currentDialogue = {
        type: 'dialogue',
        timestamp: headerMatch[1],
        speaker: headerMatch[2].trim(),
        text: ''
      };
      entries.push(currentDialogue);
      continue;
    }

    // 3. Check Inline Style [00:00] Speaker: Dialogue
    const inlineMatch = line.match(INLINE_RE);
    if (inlineMatch) {
      currentDialogue = {
        type: 'dialogue',
        timestamp: inlineMatch[1],
        speaker: inlineMatch[2].trim(),
        text: inlineMatch[3].trim()
      };
      entries.push(currentDialogue);
      continue;
    }

    // 4. Append to existing dialogue if it's just a text line
    if (currentDialogue && currentDialogue.type === 'dialogue') {
      currentDialogue.text += (currentDialogue.text ? ' ' : '') + line;
    }
  }

  return entries;
}

// ── Noise/Filler & Intent Detection ──────────────────────────────────────────
const FILLER_EXACT = new Set([
  'thanks', 'thank you', 'thanks everyone', 'good morning', 'good afternoon',
  'good evening', 'hello', 'hi', 'hey', 'bye', 'goodbye', 'ok', 'okay',
  'yes', 'no', 'sure', 'alright', 'absolutely', 'great', 'perfect',
  "let's go ahead and get started", "let's get started", 'you\'re welcome',
  'welcome', 'thank you all', 'see you', 'take care', 'noted',
  "i'll get back to you", 'sounds good', 'got it', 'understood',
  'yeah', 'wow', 'awesome', 'cool', 'exactly', 'agreed', 'makes sense',
  'uh', 'um', 'let me think', 'give me a second', 'hold on'
]);

const FILLER_PATTERN = /^[-–—=*_#.\s]{2,}$|^\d+\.?$|^\[.{0,20}\]$|^(\w)\1{3,}$/;

function isNoiseLine(text) {
  if (!text || text.trim().length < 8) return true;
  const t = text.trim().toLowerCase().replace(/[.!?,;:]+$/, '');
  if (FILLER_EXACT.has(t)) return true;
  if (FILLER_PATTERN.test(text.trim())) return true;
  if (t.split(' ').length <= 3 && t.length < 20) return true;
  return false;
}

const ACTION_VERBS = /\b(will|need|must|assign|action|decide|agree|approve|plan|schedule|review|update|fix|resolve|create|build|share|send|follow|investigate|check|verify|test|deploy|start|finish|complete|work on|look into|align|discuss|roadmap|revamp|feature)\b/i;

function isActionable(text) {
  if (ACTION_VERBS.test(text)) return true;
  if (text.length > 45) return true; // Long sentences are usually discussion points
  return false;
}

// ── Generate MOM rows from entries ────────────────────────────────────────
function makeRowsFromEntries(entries, meta) {
  const { meetingTitle, projectId, projectName, currentUserName } = meta;
  const speechEntries = entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker !== 'Unattributed');
  const generatedRows = [];
  let rowCount = 1;

  speechEntries.forEach(entry => {
    // If it's a manual entry, we trust it more
    if (entry.type === 'manual') {
      let funcStr = 'General';
      const tl = entry.text.toLowerCase();
      if (/api|backend|database|db|sql|server|latency|endpoint|python|fastapi/i.test(tl)) funcStr = 'Backend';
      else if (/ui|frontend|react|dashboard|button|page|screen|component|css/i.test(tl)) funcStr = 'Frontend';
      else if (entry.entry_type === 'decision') funcStr = 'Decision';

      generatedRows.push({
        id: Date.now() + Math.random(),
        s_no: String(rowCount++),
        function: funcStr,
        project_name: projectName || meetingTitle || 'Untitled',
        criticality: 'Medium',
        discussion_point: entry.text,
        responsibility: entry.speaker || currentUserName,
        target: '',
        project_id: projectId ? Number(projectId) : undefined,
        status: entry.entry_type === 'decision' ? 'Closed' : 'Pending',
        action_taken: 'None',
        isManual: true
      });
      return;
    }

    let rawSentences = [entry.text];
    if (/[.?!]/.test(entry.text)) {
      rawSentences = entry.text.replace(/([a-z])\.([A-Z])/g, "$1. $2").split(/(?<=[.?!])\s+/);
    }

    rawSentences.forEach(raw => {
      const text = raw.trim();
      if (isNoiseLine(text) || !isActionable(text)) return;

      let speaker = entry.speaker;
      let point = text;
      const speakerMatch = text.match(/^([A-Za-z\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) { speaker = speakerMatch[1].trim(); point = speakerMatch[2].trim(); }
      if (!point || point.length < 15) return;

      point = point.replace(/^(I think|I believe|Maybe|Probably|Honestly|Actually|So)\s+/i, '');
      point = point.charAt(0).toUpperCase() + point.slice(1);

      const tl = point.toLowerCase();
      let targetDate = '';
      if (tl.includes('tomorrow')) { const d = new Date(); d.setDate(d.getDate() + 1); targetDate = d.toLocaleDateString('en-GB'); }
      else if (tl.includes('today')) targetDate = new Date().toLocaleDateString('en-GB');

      let funcStr = 'General';
      if (/api|backend|database|db|sql|server|latency|endpoint|python|fastapi/i.test(tl)) funcStr = 'Backend';
      else if (/ui|frontend|react|dashboard|button|page|screen|component|css/i.test(tl)) funcStr = 'Frontend';

      generatedRows.push({
        id: Date.now() + Math.random(),
        s_no: String(rowCount++),
        function: funcStr,
        project_name: projectName || meetingTitle || 'Untitled',
        criticality: tl.includes('urgent') || tl.includes('critical') ? 'High' : 'Medium',
        discussion_point: point,
        responsibility: speaker || currentUserName,
        target: targetDate,
        project_id: projectId ? Number(projectId) : undefined,
        status: /(completed|done|finished|resolved)/i.test(tl) ? 'Done' : 'Pending',
        action_taken: 'None',
        isHeuristic: true
      });
    });
  });

  if (generatedRows.length === 0) {
    generatedRows.push({
      id: Date.now(),
      s_no: '1',
      function: 'General',
      project_name: projectName || meetingTitle || 'Untitled',
      criticality: 'Medium',
      discussion_point: 'No action items were identified from the transcript.',
      responsibility: currentUserName,
      target: new Date().toLocaleDateString(),
      project_id: projectId ? Number(projectId) : undefined,
      status: 'Pending',
      action_taken: 'None',
    });
  }
  return generatedRows;
}

const MeetingCapturePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useSelector(state => state.auth);
  const { lastSaved } = useSelector(s => s.mom);

  const currentUser = useMemo(() => {
    let name = user?.full_name || user?.name || user?.displayName;
    if (!name && user?.email) {
      const prefix = user.email.split('@')[0];
      name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    const finalName = name || 'Anonymous User';
    return { name: finalName, initials: getInitials(finalName) };
  }, [user]);

  const [meetingTitle, setMeetingTitle] = useState('');
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const [projectName, setProjectName] = useState('');
  const reduxProjects = useSelector(s => s.project?.projects) || [];
  const [projects, setProjects] = useState([]);
  const isProjectLinked = Boolean(projectId);
  const meetingId = useMemo(() => searchParams.get('id') || searchParams.get('meetingId') || 'unscheduled', [searchParams]);

  const [entries, setEntries] = useState([]);
  const [mode, setMode] = useState('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [uploadedFileTime, setUploadedFileTime] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [speakerRoles, setSpeakerRoles] = useState({});

  const [recordState, setRecordState] = useState('IDLE');
  const [timerVal, setTimerVal] = useState(0);
  const [micError, setMicError] = useState('');
  const [waveHeights, setWaveHeights] = useState(Array(28).fill(4));
  const [interimEntry, setInterimEntry] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previewBodyRef = useRef(null);
  const wsRef = useRef(null);
  const bufferRef = useRef('');
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const speakerColorMapRef = useRef({});

  const [manualText, setManualText] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualForm, setManualForm] = useState({ speaker: '', text: '', type: 'note' });
  const [genError, setGenError] = useState(null);
  const [renamingSpeaker, setRenamingSpeaker] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [isConfirmingSpeakers, setIsConfirmingSpeakers] = useState(false);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [generating, setGenerating] = useState(false);

  const getSpeakerColor = useCallback((name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      speakerColorMapRef.current[name] = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  }, []);

  useEffect(() => {
    if (reduxProjects.length > 0) setProjects(reduxProjects);
    else API.get('/projects/').then(r => setProjects(r.data?.projects || r.data || [])).catch(() => { });
    
    if (meetingId !== 'unscheduled') {
      setMeetingTitle(`Meeting #${meetingId}`);
      API.get(`/transcript/${meetingId}`).then(r => { if (r.data?.transcript_data) setEntries(r.data.transcript_data); }).catch(() => { });
    }
  }, [meetingId, reduxProjects]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      // Find by either dbProjectId (integer) or id (slug/integer)
      const p = projects.find(proj => 
        String(proj.dbProjectId || proj.id || proj.project_id) === String(projectId)
      );
      if (p) setProjectName(p.name || p.project_name);
    }
  }, [projectId, projects]);

  const broadcastEntries = useCallback((newEntries) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SYNC_ENTRIES', payload: newEntries }));
    }
  }, []);

  useEffect(() => {
    if (previewBodyRef.current) previewBodyRef.current.scrollTop = previewBodyRef.current.scrollHeight;
  }, [entries, interimEntry]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        setWaveHeights(Array.from({ length: 28 }, (_, i) => 4 + (dataArray[i * 4] / 255) * 44));
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (_) { setMicError("Mic visualization unavailable."); }
  };

  const stopAudioAnalysis = () => {
    cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
  };

  const flushBuffer = useCallback(() => {
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    if (text.length < 3) { setInterimEntry(null); return; }
    const color = getSpeakerColor(currentUser.name);
    setEntries(prev => {
      const updated = [...prev, { id: Date.now() + Math.random(), type: 'dialogue', speaker: currentUser.name, time: nowTime(), text, ...color }];
      broadcastEntries(updated);
      return updated;
    });
    setInterimEntry(null);
  }, [currentUser.name, getSpeakerColor, broadcastEntries]);

  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          bufferRef.current += (bufferRef.current ? ' ' : '') + e.results[i][0].transcript.trim();
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(flushBuffer, 1000);
        } else interim += e.results[i][0].transcript;
      }
      if (interim) setInterimEntry({ id: 'int', type: 'dialogue', speaker: currentUser.name, time: nowTime(), text: interim, isInterim: true });
    };
    return rec;
  }, [flushBuffer, currentUser.name]);

  const startRecording = async () => {
    await startAudioAnalysis();
    recognitionRef.current = initRecognition();
    recognitionRef.current?.start();
    setRecordState('RECORDING');
    timerRef.current = setInterval(() => setTimerVal(v => v + 1), 1000);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    stopAudioAnalysis();
    flushBuffer();
    clearInterval(timerRef.current);
    setTimerVal(0);
    setRecordState('IDLE');
  };

  const processFileText = useCallback((rawText) => {
    const parsed = parseTranscriptFile(rawText, currentUser.name);
    parsed.forEach(p => { if (p.type === 'metadata' && p.field.toLowerCase() === 'meeting title') setMeetingTitle(p.value); });
    const mapped = parsed.map((p, i) => {
      if (p.type === 'metadata') return { ...p, id: Date.now() + i };
      if (p.type === 'platform_header') return { ...p, id: Date.now() + i };
      const spk = p.speaker || 'Transcript';
      return {
        id: Date.now() + i,
        type: 'dialogue',
        speaker: spk,
        time: p.timestamp || nowTime(),
        text: p.text,
        ...getSpeakerColor(spk)
      };
    });
    setPendingEntries(mapped);
    setIsConfirmingSpeakers(true);
  }, [currentUser.name, getSpeakerColor]);

  const handleConfirmSpeakers = () => {
    setEntries(prev => { const combined = [...prev, ...pendingEntries]; broadcastEntries(combined); return combined; });
    setPendingEntries([]);
    setIsConfirmingSpeakers(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setUploadedFileTime(nowTime());
    // Animate progress bar over 600ms then parse
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 22 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(tick);
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          const reader = new FileReader();
          reader.onload = (ev) => processFileText(ev.target.result);
          reader.readAsText(file);
        }, 180);
      }
      setUploadProgress(Math.min(p, 100));
    }, 80);
  };

  const speakers = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (e.type === 'dialogue' && e.speaker) {
        if (!map[e.speaker]) map[e.speaker] = { name: e.speaker, count: 0 };
        map[e.speaker].count++;
      }
    });
    return Object.values(map);
  }, [entries]);

  const deleteEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));
  const updateEntryText = (id, text) => setEntries(prev => prev.map(e => e.id === id ? { ...e, text } : e));
  const handleRenameSpeaker = (name) => { setRenamingSpeaker(name); setRenameValue(name); };
  const commitRename = () => {
    const next = renameValue.trim();
    if (!next) return;
    const update = (list) => list.map(e => e.speaker === renamingSpeaker ? { ...e, speaker: next, ...getSpeakerColor(next) } : e);
    setEntries(update);
    setPendingEntries(update);
    setRenamingSpeaker(null);
  };

  const saveManualLine = () => {
    if (!manualForm.speaker.trim() || !manualForm.text.trim()) {
      toast.error('Speaker and content are required');
      return;
    }
    const color = getSpeakerColor(manualForm.speaker);
    const newEntry = {
      id: Date.now() + Math.random(),
      type: 'manual',
      speaker: manualForm.speaker,
      text: manualForm.text,
      entry_type: manualForm.type,
      time: nowTime(),
      ...color
    };
    setEntries(prev => {
      const updated = [...prev, newEntry];
      broadcastEntries(updated);
      return updated;
    });
    setIsAddingManual(false);
    setManualForm({ speaker: '', text: '', type: 'note' });
  };

  const cancelManualLine = () => {
    setIsAddingManual(false);
    setManualForm({ speaker: '', text: '', type: 'note' });
  };

  const addNewLine = () => {
    setIsAddingManual(true);
    setManualForm(prev => ({ ...prev, speaker: currentUser.name }));
  };

  const handleGenerate = async () => {
    if (!projectId) { toast.error('Select a project first'); return; }
    setGenerating(true);
    try {
      const payload = { 
        transcript: entries.filter(e => e.type === 'dialogue' || e.type === 'manual').map(e => ({ 
          speaker: e.speaker, 
          text: e.text, 
          time: e.time,
          isManual: e.type === 'manual'
        })), 
        title: meetingTitle, 
        projectId 
      };
      const resp = await API.post(`/meetings/${meetingId}/generate-mom`, payload);
      
      // One source of truth for Redux
      dispatch(setMeetingContext({ meetingId, meetingName: meetingTitle, projectId, projectName }));

      if (resp.data?.success) {
        const intel = resp.data.intelligence;
        const aiRows = [
          ...(intel.action_items || []).map(a => ({ 
            id: Math.random(), 
            function: 'General', 
            criticality: a.priority || 'Medium', 
            discussion_point: a.description, 
            responsibility: a.owner, 
            target: a.due_date || 'TBD', 
            status: 'Pending', 
            project_id: projectId,
            project_name: projectName 
          })),
          ...(intel.decisions || []).map(d => ({ 
            id: Math.random(), 
            function: 'Decision', 
            criticality: 'Medium', 
            discussion_point: d, 
            responsibility: 'Everyone', 
            status: 'Closed', 
            project_id: projectId,
            project_name: projectName
          }))
        ];
        if (aiRows.length > 0) {
          aiRows[0]._rawEntries = entries;
        }
        dispatch(setMomData(aiRows));
        
        if (aiRows.length === 0) {
          // If AI fails to find structured points, try heuristic fallback instead of just erroring
          const fallback = makeRowsFromEntries(entries, { meetingTitle, projectId, projectName, currentUserName: currentUser.name });
          if (fallback.length > 0) {
            dispatch(setMomData(fallback));
            navigate('/dashboard/mom/view');
            return;
          }
          setGenError("Generation produced no content. Check transcript format.");
          setGenerating(false);
          return;
        }

        setGenError(null);
        const mid = resp.data.meeting_id || meetingId;
        navigate(`/dashboard/mom/view/${mid}`);
      }
    } catch (_) {
      const rows = makeRowsFromEntries(entries, { meetingTitle, projectId, projectName, currentUserName: currentUser.name });
      if (rows.length > 0) {
        rows[0]._rawEntries = entries;
      }
      dispatch(setMeetingContext({ meetingId, meetingName: meetingTitle, projectId, projectName }));
      dispatch(setMomData(rows));
      
      if (rows.length === 0) {
        setGenError("Generation produced no content. Check transcript format.");
        setGenerating(false);
        return;
      }

      setGenError(null);
      navigate('/dashboard/mom/view');
    } finally { setGenerating(false); }
  };

  const hasEntries = entries.length > 0;

  return (
    <div className="mcp-root mom-theme">
      <div className="mcp-topbar">
        <nav className="mcp-breadcrumb">
          <Link to="/dashboard" className="mcp-bc-link"><Home size={12} />Dashboard</Link>
          <ChevronRight size={12} className="mcp-bc-sep" />
          <span className="mcp-bc-current">Meeting Intelligence</span>
        </nav>
      </div>

      <div className="mcp-steps">
        {[
          { label: 'CAPTURE',  done: hasEntries, active: !hasEntries },
          { label: 'REVIEW',   done: generating, active: hasEntries && !generating },
          { label: 'GENERATE', done: false,       active: generating, locked: !hasEntries },
        ].map((step, i, arr) => (
          <React.Fragment key={step.label}>
            <div className={`mcp-step2 ${step.active ? 'active' : ''} ${step.done ? 'done' : ''} ${step.locked ? 'locked' : ''}`}>
              <div className="mcp-step2-bubble">{step.done ? <Check size={13} strokeWidth={3} /> : i + 1}</div>
              <div className="mcp-step2-label">{step.label}</div>
            </div>
            {i < arr.length - 1 && <div className={`mcp-step2-connector ${step.done ? 'filled' : ''}`} />}
          </React.Fragment>
        ))}
      </div>


      {/* ════════ BODY: left 420px fixed | right fills ════════ */}
      <div className="mcp-body">

        {/* LEFT PANEL */}
        <div className="mcp-left-panel">

          {/* S1 — Meeting Title */}
          <div className="mcp-lp-section">
            <div className="mcp-lp-label">MEETING TITLE</div>
            <input
              className="mcp-lp-input"
              placeholder="e.g. Sprint Review — May 6"
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
            />
          </div>

          {/* S2 — Link Project */}
          <div className="mcp-lp-section">
            <div className="mcp-lp-label-row">
              <span className="mcp-lp-label" style={{ marginBottom: 0 }}>LINK PROJECT</span>
              <span className="mcp-lp-required">*</span>
            </div>
            <div className="mcp-lp-select-wrap">
              <select
                className="mcp-lp-select"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id || p.dbProjectId} value={p.dbProjectId || p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!isProjectLinked && (
              <div className="mcp-lp-hint">Select a project to enable capture</div>
            )}
          </div>

          {/* S3 + S4 — Tabs + Zone */}
          <div className={`mcp-lp-section mcp-capture-gated ${!isProjectLinked ? 'disabled' : ''}`}>
            <div className="mcp-tab-bar">
              <button className={`mcp-tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
                <Upload size={16} /> Upload
              </button>
              <button className={`mcp-tab ${mode === 'record' ? 'active' : ''}`} onClick={() => setMode('record')}>
                <Mic size={16} /> Record
              </button>
            </div>

            {mode === 'upload' && (
              <>
                {isUploading ? (
                  <div className="mcp-upload-progress-wrap">
                    <div className="mcp-upload-progress-filename">
                      <FileText size={14} color="#0D9488" />
                      <span>{uploadedFileName}</span>
                    </div>
                    <div className="mcp-progress-track">
                      <div className="mcp-progress-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="mcp-upload-progress-pct">{Math.round(uploadProgress)}%</div>
                  </div>
                ) : uploadedFileName && !isConfirmingSpeakers ? (
                  <div className="mcp-file-card">
                    <FileText size={16} color="#0D9488" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{uploadedFileName}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{(uploadedFileSize / 1024).toFixed(1)} KB · {uploadedFileTime}</div>
                    </div>
                    <button onClick={() => { setUploadedFileName(''); fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 4 }}><X size={14} /></button>
                  </div>
                ) : (
                  <div
                    className={`mcp-dropzone ${isDragOver ? 'drag-over' : ''} ${!isProjectLinked ? 'mcp-dropzone-disabled' : ''}`}
                    onClick={() => isProjectLinked && fileInputRef.current.click()}
                    onDragOver={e => { e.preventDefault(); if (isProjectLinked) setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => { e.preventDefault(); setIsDragOver(false); if (isProjectLinked && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                  >
                    <Upload size={28} color="#0D9488" strokeWidth={1.5} />
                    <div className="mcp-dropzone-title">Drop transcript here or click to browse</div>
                    <div className="mcp-dropzone-sub">.txt · .md · .vtt · .srt</div>
                  </div>
                )}
              </>
            )}

            {mode === 'record' && (
              <div className="mcp-record-zone">
                <button
                  className={`mcp-record-btn ${recordState.toLowerCase()}`}
                  onClick={recordState === 'IDLE' ? startRecording : stopRecording}
                >
                  {recordState === 'IDLE' ? <Mic size={24} color="#fff" /> : <Square size={18} color="#fff" />}
                </button>
                <div className="mcp-record-timer-display">{formatTime(timerVal)}</div>
                <div className="mcp-waveform">
                  {waveHeights.map((h, i) => <div key={i} className="mcp-wave-bar" style={{ height: h }} />)}
                </div>
                {micError && <div className="mcp-mic-error">{micError}</div>}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".txt,.md,.vtt,.srt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="mcp-right-panel">
          <div className="mcp-rp-header">
            <span className="mcp-rp-header-title">
              {isConfirmingSpeakers ? 'CONFIRM SPEAKERS' : (hasEntries ? 'TRANSCRIPT REVIEW' : 'PREVIEW')}
            </span>
            {hasEntries && !isConfirmingSpeakers && (() => {
              const dialogues = entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker);
              const hasDialogues = dialogues.length > 0;
              return (
                <div style={{ position: 'relative' }}>
                  <button 
                    className="mcp-generate-btn-inline" 
                    onClick={handleGenerate} 
                    disabled={generating || !hasDialogues}
                    style={{ 
                      background: '#0D9488', 
                      color: 'white', 
                      fontSize: '14px', 
                      fontWeight: 500, 
                      padding: '9px 20px', 
                      borderRadius: '6px', 
                      border: 'none',
                      cursor: (generating || !hasDialogues) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {generating ? 'Processing...' : 'Generate MOM'}
                  </button>
                  {genError && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', fontSize: '13px', color: '#F59E0B', width: '240px', textAlign: 'right', fontWeight: 500 }}>
                      {genError}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {hasEntries && !isConfirmingSpeakers && (() => {
            const dialogues = entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker);
            const metadata  = entries.filter(e => e.type === 'metadata');
            const uniqueSpeakers = Array.from(new Set(dialogues.map(e => e.speaker))).filter(n => !PLATFORM_NAMES.has(n.toLowerCase()));
            
            const isNoDialogue = dialogues.length === 0;
            const summaryText = isNoDialogue 
              ? "No dialogue detected — check transcript format"
              : `${dialogues.length} lines · ${metadata.length} metadata · ${uniqueSpeakers.length} speakers — ready to generate MOM`;
            
            return (
              <div className="mcp-summary-bar" style={{ padding: '8px 24px' }}>
                <span style={{ 
                  color: isNoDialogue ? '#F59E0B' : '#0D9488', 
                  fontSize: '13px', 
                  fontWeight: 500 
                }}>
                  {summaryText}
                </span>
              </div>
            );
          })()}

          {hasEntries && !isConfirmingSpeakers && entries.some(e => (e.type === 'dialogue' || e.type === 'manual') && isNoiseLine(e.text)) && (
            <div className="mcp-cleanup-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#92400E' }}>
                  {entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && isNoiseLine(e.text)).length} filler lines detected — these are greetings and mic checks
                </span>
              </div>
              <button className="mcp-cleanup-btn" onClick={() => { const cleaned = entries.filter(e => (e.type !== 'dialogue' && e.type !== 'manual') || !isNoiseLine(e.text)); setEntries(cleaned); broadcastEntries(cleaned); toast.success('Filler lines removed'); }}>Remove Filler Lines</button>
            </div>
          )}

          <div className="mcp-rp-body" ref={previewBodyRef}>
            {isConfirmingSpeakers ? (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detected Speakers</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Review names before importing. Click to rename.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from(new Set(pendingEntries.filter(e => e.type === 'dialogue').map(e => e.speaker))).map((name, idx) => {
                    const colors = ['#EDE9FE','#DBEAFE','#D1FAE5','#FEE2E2','#FEF3C7'];
                    const textColors = ['#6D28D9','#1D4ED8','#065F46','#991B1B','#92400E'];
                    const ci = idx % colors.length;
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F1F5F9', background: '#FAFAFA', transition: 'border-color 0.15s, background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F0FDFA'; e.currentTarget.style.borderColor = '#99F6E4'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#F1F5F9'; }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors[ci], color: textColors[ci], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                        <input defaultValue={name} onBlur={e => commitRename(name, e.target.value)}
                          style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 500, color: '#1E293B', outline: 'none', padding: 0, fontFamily: 'inherit', cursor: 'text' }}
                          onFocus={e => { e.target.style.borderBottom = '1.5px solid #0D9488'; }}
                          onBlurCapture={e => { e.target.style.borderBottom = 'none'; }}
                        />
                        <span style={{ fontSize: '10px', color: '#CBD5E1', fontWeight: 500, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>CLICK TO RENAME</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={handleConfirmSpeakers}
                  style={{ marginTop: '20px', width: '100%', height: '40px', background: '#0D9488', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(13,148,136,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0B7F74'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0D9488'; }}
                >
                  <Check size={15} /> Import Content
                </button>
              </div>
            ) : !hasEntries ? (
              <div className="mcp-rp-empty">
                <FileText size={32} strokeWidth={1.2} color="var(--color-text-tertiary, #94A3B8)" />
                <span className="mcp-rp-empty-text">Transcript preview will appear here</span>
              </div>
            ) : (
              <>
                {entries.filter(e => e.type === 'metadata').length > 0 && (
                  <div className="mcp-metadata-block">
                    {entries.filter(e => e.type === 'metadata').map(m => (
                      <div key={m.id} className="mcp-metadata-row">
                        <span className="mcp-metadata-label">{m.field}:</span>
                        <span className="mcp-metadata-value">{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  {[...entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker), ...(interimEntry ? [interimEntry] : [])].map(e => {
                    const isNoise = isNoiseLine(e.text);
                    return (
                      <div key={e.id} className="mcp-dialogue-card" style={{ opacity: isNoise ? 0.7 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div className="mcp-dialogue-accent" style={{ background: isNoise ? '#FEF3C7' : '#0D9488' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span onClick={() => handleRenameSpeaker(e.speaker)} style={{ fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>{e.speaker}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{e.time}</span>
                              {e.type === 'manual' && (
                                <span style={{ background: '#EEF2FF', color: '#4338CA', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 600 }}>MANUAL</span>
                              )}
                              {isNoise && <span className="mcp-filler-chip">FILLER</span>}
                              <div style={{ marginLeft: 'auto' }}>
                                <button className="mcp-delete-btn" onClick={() => deleteEntry(e.id)}><X size={14} /></button>
                              </div>
                            </div>
                            <textarea value={e.text} onChange={val => updateEntryText(e.id, val.target.value)}
                              onInput={(el) => { el.target.style.height = 'auto'; el.target.style.height = (el.target.scrollHeight) + 'px'; }}
                              style={{ width: '100%', border: 'none', background: 'none', fontSize: '14px', lineHeight: 1.6, outline: 'none', resize: 'none', minHeight: '24px', display: 'block', color: isNoise ? '#94a3b8' : '#1e293b', padding: 0 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isAddingManual && (
                    <div style={{ 
                      borderLeft: '3px solid #0D9488', 
                      padding: '12px 16px', 
                      background: '#F8FAFC', 
                      borderRadius: '0 8px 8px 0', 
                      marginBottom: '8px',
                      animation: 'mcp-slide-up 0.2s ease-out'
                    }}>
                      {/* Row 1 — speaker + label */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                          placeholder="Speaker name" 
                          value={manualForm.speaker}
                          onChange={e => setManualForm(prev => ({ ...prev, speaker: e.target.value }))}
                          style={{ 
                            fontSize: '13px', 
                            fontWeight: 500, 
                            color: '#1E293B',
                            border: 'none', 
                            borderBottom: '1px solid #E2E8F0', 
                            background: 'transparent', 
                            width: '160px', 
                            padding: '2px 0',
                            outline: 'none'
                          }}
                        />
                        <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '12px' }}>Manual entry</span>
                      </div>

                      {/* Row 2 — content textarea */}
                      <textarea 
                        placeholder="Type meeting note, decision, or action item..."
                        value={manualForm.text}
                        onChange={e => setManualForm(prev => ({ ...prev, text: e.target.value }))}
                        style={{ 
                          width: '100%', 
                          marginTop: '8px', 
                          fontSize: '14px', 
                          color: '#1E293B', 
                          border: 'none', 
                          borderBottom: '1px solid #E2E8F0',
                          background: 'transparent', 
                          resize: 'none', 
                          minHeight: '60px', 
                          lineHeight: '1.6', 
                          outline: 'none'
                        }}
                      />

                      {/* Row 3 — type selector + save */}
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
                        <select 
                          value={manualForm.type}
                          onChange={e => setManualForm(prev => ({ ...prev, type: e.target.value }))}
                          style={{ 
                            fontSize: '12px', 
                            border: '0.5px solid #E2E8F0',
                            borderRadius: '4px', 
                            padding: '3px 8px', 
                            color: '#475569',
                            background: '#fff',
                            outline: 'none'
                          }}
                        >
                          <option value="note">Note</option>
                          <option value="decision">Decision</option>
                          <option value="action">Action Item</option>
                        </select>
                        
                        <button 
                          onClick={saveManualLine}
                          style={{ 
                            marginLeft: '8px', 
                            fontSize: '12px', 
                            color: '#0D9488',
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 500 
                          }}
                        >
                          Save
                        </button>
                        
                        <button 
                          onClick={cancelManualLine}
                          style={{ 
                            marginLeft: '8px', 
                            fontSize: '12px', 
                            color: '#94A3B8',
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer' 
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={addNewLine} style={{ color: '#0D9488', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
                    <Plus size={13} /> Add line
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {renamingSpeaker && (
        <div className="mcp-rename-modal" onClick={() => setRenamingSpeaker(null)}>
          <div className="mcp-rename-card" onClick={e => e.stopPropagation()}>
            <div className="mcp-rename-title">Rename Speaker: <em>{renamingSpeaker}</em></div>
            <input autoFocus className="mcp-rename-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && commitRename()} />
            <div className="mcp-rename-actions">
              <button className="mcp-rename-save" onClick={commitRename}>Rename All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MeetingCapturePage;

