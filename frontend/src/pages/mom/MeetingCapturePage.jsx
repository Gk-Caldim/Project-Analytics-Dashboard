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
  FileUp, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../utils/api';
import {
  setMeetingContext, saveMOM, addMomRows, fetchMOM, setMomData
} from '../../store/slices/momSlice';
import './MeetingCapturePage.css';

// ── Speaker colour palette (shared with old SpeechToText) ──────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion:     { bg: '#fef3c7', text: '#92400e' },
  Decisions:      { bg: '#dbeafe', text: '#1d4ed8' },
  'Action Items': { bg: '#d1fae5', text: '#065f46' },
  Metadata:       { bg: '#f1f5f9', text: '#475569' },
};

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// ── Transcript file parser (identical to old SpeechToText) ─────────────────
function parseTranscriptFile(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    // ── Extract Metadata (Title, Date, Participants, etc.) ──
    const metaMatch = line.match(/^(meeting title|date|start time|end time|platform|participants|word count|duration|active speech|auto-generated transcript):\s*(.*)/i);
    if (metaMatch) {
      if (currentEntry) entries.push(currentEntry);
      entries.push({ type: 'metadata', label: metaMatch[1].trim(), text: metaMatch[2].trim() });
      currentEntry = null;
      continue;
    }

    const full = line.match(/^\[?(\d{1,2}:\d{2}\s?(?:[AP]M)?)\]?\s*(.*?):\s+(.+)/i);
    if (full) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: full[1].trim(), speaker: full[2].trim(), text: full[3].trim() };
      continue;
    }
    const timeInParen = line.match(/^([^()]+?)\s*\(([\d:]+\s?(?:[AP]M)?)\):\s+(.+)/i);
    if (timeInParen) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: timeInParen[2].trim(), speaker: timeInParen[1].trim(), text: timeInParen[3].trim() };
      continue;
    }
    const speakerOnly = line.match(/^([^:]{1,30}):\s+(.+)/);
    if (speakerOnly && !line.toLowerCase().startsWith('http')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: null, speaker: speakerOnly[1].trim(), text: speakerOnly[2].trim() };
      continue;
    }
    const lower = line.toLowerCase();
    if (lower.startsWith('decision')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'decision', text: line.replace(/^decisions?:?\s*/i, '').trim() };
      continue;
    }
    if (lower.startsWith('action item')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'action', text: line.replace(/^action items?:?\s*/i, '').trim() };
      continue;
    }
    
    const cleanLine = line.replace(/^[-•]\s*/, '');
    if (currentEntry) {
      currentEntry.text += ' ' + cleanLine;
    } else {
      currentEntry = { type: 'speech', time: null, speaker: 'Transcript', text: cleanLine };
    }
  }
  if (currentEntry) entries.push(currentEntry);
  return entries;
}

// ── Generate MOM rows from entries ────────────────────────────────────────
function makeRowsFromEntries(entries, meta) {
  const { meetingTitle, projectId, currentUserName } = meta;
  const speechEntries = entries.filter(e => e.type === 'speech');
  const generatedRows = [];
  let rowCount = 1;

  speechEntries.forEach(entry => {
    const rawSentences = entry.text.split(/(?<=[.?!])\s+/);
    rawSentences.forEach(raw => {
      const text = raw.trim();
      if (text.length < 3) return;
      const isFiller = /^(thanks|good afternoon|good morning|hello|hi|bye|ok|yes|no)\.?$/i.test(text);
      if (isFiller) return;

      let speaker = entry.speaker;
      let point = text;
      const speakerMatch = text.match(/^([A-Za-z\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) { speaker = speakerMatch[1].trim(); point = speakerMatch[2].trim(); }
      if (!point) return;

      let targetDate = '';
      const tl = point.toLowerCase();
      if (tl.includes('tomorrow')) { const d = new Date(); d.setDate(d.getDate() + 1); targetDate = d.toLocaleDateString('en-GB'); }
      else if (tl.includes('today')) targetDate = new Date().toLocaleDateString('en-GB');
      else if (tl.includes('next week')) { const d = new Date(); d.setDate(d.getDate() + 7); targetDate = d.toLocaleDateString('en-GB'); }

      let funcStr = 'General';
      if (/api|backend|database|db|sql|server|latency/i.test(tl)) funcStr = 'Backend';
      else if (/ui|frontend|react|dashboard|button|page/i.test(tl)) funcStr = 'Frontend';
      else if (/design|ux|figma/i.test(tl)) funcStr = 'Design';
      else if (/test|qa|bug|issue/i.test(tl)) funcStr = 'QA';

      const statusStr = /(completed|done|finished|resolved)/i.test(tl) ? 'Done' : 'Pending';

      generatedRows.push({
        id: Date.now() + Math.random(),
        s_no: String(rowCount++),
        function: funcStr,
        project_name: meetingTitle || 'Untitled',
        criticality: 'High',
        discussion_point: point,
        responsibility: speaker || currentUserName,
        target: targetDate,
        project_id: projectId ? Number(projectId) : undefined,
        status: statusStr,
        action_taken: 'None',
      });
    });
  });

  if (generatedRows.length === 0) {
    generatedRows.push({
      id: Date.now(),
      s_no: '1',
      function: 'General',
      project_name: meetingTitle || 'Untitled',
      criticality: 'High',
      discussion_point: 'No context recorded.',
      responsibility: currentUserName,
      target: new Date().toLocaleDateString(),
      project_id: projectId ? Number(projectId) : undefined,
      status: 'Pending',
      action_taken: 'None',
    });
  }

  return generatedRows;
}

// ═══════════════════════════════════════════════════════════════════════════
const MeetingCapturePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { status: reduxStatus, lastSaved } = useSelector(s => s.mom);

  const currentUser = useMemo(() => {
    const name = user?.full_name || user?.name || user?.username || user?.email || 'You';
    return { name, initials: getInitials(name) };
  }, [user]);

  // ── Meta ───────────────────────────────────────────────────────────────
  const [meetingTitle, setMeetingTitle] = useState('');
  const [projectId, setProjectId]       = useState(searchParams.get('projectId') || '');
  const reduxProjects                   = useSelector(s => s.project?.projects) || [];
  const [projects, setProjects]         = useState([]);
  const [projectError, setProjectError] = useState(false);

  const meetingId = useMemo(() =>
    searchParams.get('id') || searchParams.get('meetingId') || 'unscheduled',
    [searchParams]);

  // ── Entries (unified across all 3 modes) ──────────────────────────────
  const [entries, setEntries] = useState([]);

  // ── Input Mode ────────────────────────────────────────────────────────
  const [mode, setMode] = useState('upload'); // 'upload' | 'record' | 'manual'

  // ── Upload Mode ───────────────────────────────────────────────────────
  const [isDragOver, setIsDragOver]     = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef                    = useRef(null);

  // ── Record Mode ───────────────────────────────────────────────────────
  const [recordState, setRecordState]   = useState('IDLE'); // IDLE | RECORDING | PAUSED
  const [timerVal, setTimerVal]         = useState(0);
  const [micError, setMicError]         = useState('');
  const [waveHeights, setWaveHeights]   = useState(Array(28).fill(4));
  const [interimText, setInterimText]   = useState('');
  const recognitionRef                  = useRef(null);
  const manualStopRef                   = useRef(false);
  const bufferRef                       = useRef('');
  const debounceRef                     = useRef(null);
  const timerRef                        = useRef(null);
  const waveAnimRef                     = useRef(null);
  const speakerColorMapRef              = useRef({});

  // ── Manual Mode ───────────────────────────────────────────────────────
  const [manualText, setManualText]     = useState('');

  // ── Preview editing ───────────────────────────────────────────────────
  const [renamingSpeaker, setRenamingSpeaker] = useState(null);
  const [renameValue, setRenameValue]         = useState('');

  // ── Generating ────────────────────────────────────────────────────────
  const [generating, setGenerating]     = useState(false);

  // ── Speaker colour helper ──────────────────────────────────────────────
  const getSpeakerColor = useCallback((name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      const idx = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
      speakerColorMapRef.current[name] = idx;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (reduxProjects && reduxProjects.length > 0) {
      setProjects(reduxProjects);
    } else {
      API.get('/projects/').then(r => {
        const data = r.data?.success ? r.data.projects : (Array.isArray(r.data) ? r.data : []);
        setProjects(data);
      }).catch(() => {});
    }

    if (meetingId && meetingId !== 'unscheduled') {
      setMeetingTitle(`Meeting #${meetingId}`);
      // Restore existing transcript if available
      API.get(`/transcript/${meetingId}`).then(r => {
        if (r.data?.transcript_data?.length > 0) setEntries(r.data.transcript_data);
      }).catch(() => {});
    }
  }, [meetingId]);

  // Timer
  useEffect(() => {
    if (recordState === 'RECORDING') {
      timerRef.current = setInterval(() => setTimerVal(v => v + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recordState]);

  // Waveform animation (fake bars when not recording)
  useEffect(() => {
    if (recordState === 'RECORDING') {
      waveAnimRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 28 }, () => 4 + Math.random() * 40));
      }, 80);
    } else {
      clearInterval(waveAnimRef.current);
      setWaveHeights(Array(28).fill(4));
    }
    return () => clearInterval(waveAnimRef.current);
  }, [recordState]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearInterval(timerRef.current);
      clearInterval(waveAnimRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Speech Recognition ────────────────────────────────────────────────
  const flushBuffer = useCallback(() => {
    clearTimeout(debounceRef.current);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    if (!text) return;
    const color = getSpeakerColor(currentUser.name);
    setEntries(prev => [...prev, {
      id: Date.now() + Math.random(),
      type: 'speech',
      speaker: currentUser.name,
      initials: getInitials(currentUser.name),
      color: color.dot,
      bg: color.bg,
      textColor: color.text,
      time: nowTime(),
      text,
    }]);
    setInterimText('');
  }, [currentUser.name, getSpeakerColor]);

  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

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
      if (interim) setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setMicError('Microphone permission denied. Check browser settings.');
        setRecordState('IDLE');
        manualStopRef.current = true;
      }
    };

    rec.onend = () => {
      if (!manualStopRef.current) {
        setTimeout(() => { try { rec.start(); } catch (_) {} }, 300);
      }
    };

    return rec;
  }, [flushBuffer]);

  const startRecording = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setMicError('Browser not supported. Use Chrome or Edge.');
      return;
    }
    manualStopRef.current = false;
    setMicError('');
    try {
      const rec = initRecognition();
      if (!rec) throw new Error('Init failed');
      recognitionRef.current = rec;
      rec.start();
      setRecordState('RECORDING');
    } catch {
      setMicError('Could not start microphone.');
    }
  }, [initRecognition]);

  const stopRecording = useCallback(() => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    flushBuffer();
    setInterimText('');
    setTimerVal(0);
    setRecordState('IDLE');
  }, [flushBuffer]);

  const pauseRecording = useCallback(() => {
    if (recordState === 'RECORDING') {
      manualStopRef.current = true;
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (_) {} }
      flushBuffer();
      setRecordState('PAUSED');
    } else if (recordState === 'PAUSED') {
      manualStopRef.current = false;
      const rec = initRecognition();
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
      setRecordState('RECORDING');
    }
  }, [recordState, flushBuffer, initRecognition]);

  // ── File Upload ────────────────────────────────────────────────────────
  const processFileText = useCallback((rawText) => {
    const parsed = parseTranscriptFile(rawText);
    const uploadTime = nowTime();

    // Adapt UI fields from metadata
    parsed.forEach(p => {
      if (p.type === 'metadata') {
        const lbl = p.label.toLowerCase();
        if (lbl === 'meeting title' && p.text) setMeetingTitle(p.text);
      }
    });
    
    if (!projectId) {
      setProjectError(true);
    }

    const uploadedEntries = parsed.map((p, i) => {
      if (p.type === 'metadata') {
        const es = EVENT_STYLES['Metadata'];
        return { 
          id: Date.now() + i, 
          type: 'event', 
          label: p.label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), 
          time: uploadTime, 
          text: p.text, 
          bg: es.bg, 
          textColor: es.text 
        };
      }
      if (p.type === 'decision' || p.type === 'action' || p.type === 'discussion') {
        const labelMap = { decision: 'Decisions', action: 'Action Items', discussion: 'Discussion' };
        const lbl = labelMap[p.type];
        const es = EVENT_STYLES[lbl] || { bg: '#f3f4f6', text: '#6b7280' };
        return { id: Date.now() + i, type: 'event', label: lbl, time: p.time || uploadTime, text: p.text, bg: es.bg, textColor: es.text };
      }
      const spk = p.speaker || 'Transcript';
      const color = getSpeakerColor(spk);
      return {
        id: Date.now() + i,
        type: 'speech',
        speaker: spk,
        initials: getInitials(spk),
        color: color.dot,
        bg: color.bg,
        textColor: color.text,
        time: p.time || uploadTime,
        text: p.text,
      };
    });
    setEntries(uploadedEntries);
    toast.success(`Parsed ${uploadedEntries.length} lines`);
  }, [getSpeakerColor, projectId]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      let raw = ev.target.result;
      if (ext === 'json') {
        try { raw = JSON.stringify(JSON.parse(raw), null, 2); } catch (_) {}
      }
      processFileText(raw);
    };
    reader.readAsText(file);
  }, [processFileText]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  // ── Manual mode parse ─────────────────────────────────────────────────
  const parseManualText = useCallback(() => {
    if (!manualText.trim()) return;
    processFileText(manualText);
    toast.success('Text parsed into preview');
  }, [manualText, processFileText]);

  // ── Derived Speaker list ───────────────────────────────────────────────
  const speakers = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (e.type === 'speech' && e.speaker) {
        if (!map[e.speaker]) map[e.speaker] = { name: e.speaker, count: 0, bg: e.bg, textColor: e.textColor, color: e.color };
        map[e.speaker].count++;
      }
    });
    return Object.values(map);
  }, [entries]);

  // ── Entry editing ──────────────────────────────────────────────────────
  const deleteEntry = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateEntryText = useCallback((id, text) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, text } : e));
  }, []);

  const handleRenameSpeaker = useCallback((oldName) => {
    setRenamingSpeaker(oldName);
    setRenameValue(oldName);
  }, []);

  const commitRename = useCallback(() => {
    const newName = renameValue.trim();
    if (!newName || newName === renamingSpeaker) { setRenamingSpeaker(null); return; }
    const color = getSpeakerColor(currentUser.name);
    setEntries(prev => prev.map(e =>
      e.speaker === renamingSpeaker
        ? { ...e, speaker: newName, initials: getInitials(newName) }
        : e
    ));
    setRenamingSpeaker(null);
  }, [renamingSpeaker, renameValue, getSpeakerColor, currentUser.name]);

  const addNewLine = useCallback(() => {
    setEntries(prev => [...prev, {
      id: Date.now() + Math.random(),
      type: 'speech',
      speaker: currentUser.name,
      initials: getInitials(currentUser.name),
      ...getSpeakerColor(currentUser.name),
      color: getSpeakerColor(currentUser.name).dot,
      time: nowTime(),
      text: '',
    }]);
  }, [currentUser.name, getSpeakerColor]);

  // ── Save transcript to backend ─────────────────────────────────────────
  const saveTranscript = useCallback(async (data = entries) => {
    if (!meetingId || data.length === 0) return;
    try {
      await API.post('/transcript/save', { meeting_id: meetingId, transcript_data: data });
    } catch (_) {}
  }, [meetingId, entries]);

  // ── Generate MOM ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (entries.length === 0) { toast.error('Nothing to generate from — add some content first'); return; }
    if (!projectId) { 
        setProjectError(true);
        toast.error('Please select a project before generating the MOM'); 
        return; 
    }
    setProjectError(false);
    setGenerating(true);

    const rows = makeRowsFromEntries(entries, {
      meetingTitle: meetingTitle || 'Untitled',
      projectId,
      currentUserName: currentUser.name,
    });

    const proj = projects.find(p => String(p.id ?? p.project_id) === String(projectId));
    const projName = proj ? (proj.name ?? proj.project_name) : (meetingTitle || 'Untitled');

    dispatch(setMeetingContext({
      meetingId,
      meetingName: meetingTitle || 'Untitled',
      projectId: projectId || null,
      projectName: projName,
    }));
    
    dispatch(setMomData(rows));

    dispatch(saveMOM({
      meetingId,
      meetingName: meetingTitle || 'Untitled',
      projectId: projectId || null,
      projectName: projName,
      momData: rows,
    }));

    // Also save raw transcript
    await saveTranscript(entries);

    setGenerating(false);
    toast.success('MOM generated');
    navigate('/dashboard/mom/view');
  }, [entries, meetingTitle, projectId, projects, currentUser.name, meetingId, dispatch, navigate, saveTranscript]);

  // ── Render ─────────────────────────────────────────────────────────────
  const hasEntries = entries.length > 0;

  return (
    <div className="mcp-root">

      {/* ── Top Bar ── */}
      <div className="mcp-topbar">
        <nav className="mcp-breadcrumb">
          <Link to="/dashboard" className="mcp-bc-link">
            <Home style={{ width: 12, height: 12 }} />Dashboard
          </Link>
          <ChevronRight className="mcp-bc-sep" style={{ width: 12, height: 12 }} />
          <Link to="/dashboard/meetings" className="mcp-bc-link">
            <Layout style={{ width: 12, height: 12 }} />Meetings
          </Link>
          <ChevronRight className="mcp-bc-sep" style={{ width: 12, height: 12 }} />
          <span className="mcp-bc-current">Capture</span>
        </nav>

        <div className={`mcp-save-status${reduxStatus === 'saving' ? ' saving' : reduxStatus === 'saved' ? ' saved' : ''}`}>
          {reduxStatus === 'saving' && <Loader style={{ width: 10, height: 10 }} className="animate-spin" />}
          {reduxStatus === 'saved'  && <CheckCircle style={{ width: 10, height: 10 }} />}
          {reduxStatus === 'saving' ? 'Saving…'
            : reduxStatus === 'saved' && lastSaved
              ? `Saved at ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Ready'}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mcp-body">

        {/* ── Left Pane: Input ── */}
        <div className="mcp-input-pane">

          {/* Meeting Meta */}
          <div className="mcp-meta-card">
            <label className="mcp-meta-label">Meeting Title</label>
            <input
              id="mcp-meeting-title"
              className="mcp-meta-input"
              placeholder="e.g. Q2 Project Review"
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
            />
            <label className="mcp-meta-label" style={{ marginTop: 12 }}>
                Project <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
            </label>
            <select
              id="mcp-project-select"
              className="mcp-meta-select"
              style={projectError ? { 
                  border: '2px solid #ef4444', 
                  backgroundColor: '#fef2f2', 
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.3s ease-in-out'
              } : {}}
              value={projectId}
              onChange={e => {
                  setProjectId(e.target.value);
                  if (e.target.value) setProjectError(false);
              }}
            >
              <option value="">— Select Project —</option>
              {projects.map(p => (
                <option key={p.id ?? p.project_id} value={p.id ?? p.project_id}>
                  {p.name ?? p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Tabs */}
          <div className="mcp-mode-tabs">
            {[
              { key: 'upload', icon: <Upload style={{ width: 13, height: 13 }} />, label: 'Upload' },
              { key: 'record', icon: <Mic style={{ width: 13, height: 13 }} />, label: 'Record Live' },
              { key: 'manual', icon: <Edit3 style={{ width: 13, height: 13 }} />, label: 'Manual' },
            ].map(m => (
              <button
                key={m.key}
                id={`mcp-mode-${m.key}`}
                className={`mcp-mode-tab${mode === m.key ? ' active' : ''}`}
                onClick={() => setMode(m.key)}
              >
                {m.icon}{m.label}
              </button>
            ))}
          </div>

          {/* ── Upload Mode ── */}
          {mode === 'upload' && (
            <div className="mcp-input-card mcp-fade-up">
              <div className="mcp-input-card-header">
                <span className="mcp-input-card-title">Upload Transcript</span>
              </div>
              <div className="mcp-input-card-body">
                <div
                  className={`mcp-dropzone${isDragOver ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mcp-dropzone-icon">
                    {uploadedFileName ? <CheckCircle style={{ width: 18, height: 18, color: '#059669' }} /> : <FileUp style={{ width: 18, height: 18 }} />}
                  </div>
                  <div className="mcp-dropzone-title">
                    {uploadedFileName ? <span style={{ color: '#059669', fontWeight: '600' }}>{uploadedFileName}</span> : 'Drop transcript file here'}
                  </div>
                  <div className="mcp-dropzone-sub">
                    {uploadedFileName ? 'File uploaded successfully' : 'Supports .txt · .md · .json · .vtt'}
                  </div>
                  <button className="mcp-file-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <FileUp style={{ width: 12, height: 12 }} />{uploadedFileName ? 'Change File' : 'Browse File'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.vtt,.srt"
                  style={{ display: 'none' }}
                  onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }}
                />
                <div className="mcp-manual-hint">
                  <strong>Accepted formats:</strong> Standard transcript with timestamps, or plain speaker-colon format:<br />
                  <code style={{ fontSize: 10 }}>[10:30 AM] Rahul: We need to fix the API…</code>
                </div>
              </div>
            </div>
          )}

          {/* ── Record Mode ── */}
          {mode === 'record' && (
            <div className="mcp-input-card mcp-fade-up">
              <div className="mcp-input-card-header">
                <span className="mcp-input-card-title">Live Recording</span>
                {recordState === 'RECORDING' && (
                  <span className="mcp-save-status saving">
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'mcpFadeUp 1s infinite alternate' }} />
                    REC
                  </span>
                )}
              </div>
              <div className="mcp-input-card-body" style={{ alignItems: 'center' }}>
                <div className="mcp-record-center">
                  {/* Waveform */}
                  <div className="mcp-waveform">
                    {waveHeights.map((h, i) => (
                      <div
                        key={i}
                        className="mcp-wave-bar"
                        style={{ height: `${h}px`, opacity: recordState === 'RECORDING' ? 0.8 : 0.25 }}
                      />
                    ))}
                  </div>

                  {/* Big Record Button */}
                  <button
                    id="mcp-record-btn"
                    className={`mcp-record-btn ${recordState.toLowerCase()}`}
                    onClick={recordState === 'IDLE' ? startRecording : stopRecording}
                  >
                    {recordState === 'IDLE'
                      ? <Mic style={{ width: 28, height: 28, color: 'white' }} />
                      : <Square style={{ width: 22, height: 22, color: 'white', fill: 'white' }} />}
                  </button>

                  <div className="mcp-record-timer">{formatTime(timerVal)}</div>
                  <div className="mcp-record-status">
                    {recordState === 'IDLE' && 'Click to start recording'}
                    {recordState === 'RECORDING' && 'Listening… click to stop'}
                    {recordState === 'PAUSED' && 'Paused — click to resume'}
                  </div>

                  {recordState !== 'IDLE' && (
                    <div className="mcp-record-controls">
                      <button className="mcp-ctrl-btn" onClick={pauseRecording}>
                        {recordState === 'PAUSED'
                          ? <><Play style={{ width: 12, height: 12 }} />Resume</>
                          : <><Pause style={{ width: 12, height: 12 }} />Pause</>}
                      </button>
                    </div>
                  )}

                  {/* Interim Text */}
                  {interimText && (
                    <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic', maxWidth: 280 }}>
                      {interimText}
                    </div>
                  )}
                </div>

                {micError && <div className="mcp-mic-error"><AlertCircle style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />{micError}</div>}

                {!SpeechRecognitionAPI && (
                  <div className="mcp-mic-error">Live recording requires Chrome or Edge browser.</div>
                )}
              </div>
            </div>
          )}

          {/* ── Manual Mode ── */}
          {mode === 'manual' && (
            <div className="mcp-input-card mcp-fade-up">
              <div className="mcp-input-card-header">
                <span className="mcp-input-card-title">Manual Input</span>
                <button className="mcp-ctrl-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={parseManualText}>
                  <Check style={{ width: 11, height: 11 }} />Parse
                </button>
              </div>
              <div className="mcp-input-card-body">
                <textarea
                  id="mcp-manual-textarea"
                  className="mcp-manual-textarea"
                  placeholder={`Paste notes or type directly:\n\nRahul: We need to review the API performance.\nPriya: Budget approval is needed by Friday.\nDecision: Move to cloud infra in Q3.`}
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  rows={12}
                />
                <div className="mcp-manual-hint">
                  Use <code>Speaker: Text</code> format. Start a line with <code>Decision:</code> or <code>Action Item:</code> to tag events.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Right Pane: Preview + Speakers ── */}
        <div className="mcp-preview-pane">

          {/* Speaker sidebar + Preview in row */}
          <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

            {/* Preview Card */}
            <div className="mcp-preview-card">
              <div className="mcp-preview-header">
                <span className="mcp-preview-title">
                  <FileText style={{ width: 12, height: 12 }} />
                  Structured Preview
                </span>
                <span className="mcp-preview-count">{entries.length} lines</span>
              </div>

              <div className="mcp-preview-body">
                {!hasEntries ? (
                  <div className="mcp-preview-empty">
                    <div className="mcp-preview-empty-icon">
                      <FileText style={{ width: 20, height: 20 }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#6b7280' }}>No content yet</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {mode === 'upload'  && 'Upload a transcript file to see a preview'}
                      {mode === 'record'  && 'Start recording to capture speech'}
                      {mode === 'manual'  && 'Type your notes and click Parse'}
                    </div>
                  </div>
                ) : (
                  <>
                    {entries.map((entry) => {
                      if (entry.type === 'event') {
                        const es = EVENT_STYLES[entry.label] || { bg: '#f3f4f6', text: '#6b7280' };
                        return (
                          <div key={entry.id} className="mcp-entry-row event-row">
                            <span
                              className="mcp-event-label"
                              style={{ background: es.bg, color: es.text }}
                            >
                              {entry.label}
                            </span>
                            <span className="mcp-entry-time">{entry.time}</span>
                            <textarea
                              className="mcp-entry-text-editable"
                              defaultValue={entry.text}
                              rows={1}
                              onBlur={e => updateEntryText(entry.id, e.target.value)}
                            />
                            <button className="mcp-entry-del" onClick={() => deleteEntry(entry.id)}>
                              <X style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        );
                      }
                      // speech
                      const spkColor = { bg: entry.bg, text: entry.textColor, dot: entry.color };
                      return (
                        <div key={entry.id} className="mcp-entry-row">
                          <span
                            className="mcp-speaker-pill"
                            style={{ background: spkColor.bg, color: spkColor.text }}
                            title="Click to rename speaker"
                            onClick={() => handleRenameSpeaker(entry.speaker)}
                          >
                            <span className="mcp-speaker-dot" style={{ background: spkColor.dot }} />
                            {entry.speaker}
                          </span>
                          <span className="mcp-entry-time">{entry.time}</span>
                          <textarea
                            className="mcp-entry-text-editable"
                            defaultValue={entry.text}
                            rows={1}
                            onBlur={e => updateEntryText(entry.id, e.target.value)}
                          />
                          <button className="mcp-entry-del" onClick={() => deleteEntry(entry.id)}>
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      );
                    })}
                    <button className="mcp-add-row-btn" onClick={addNewLine}>
                      <Plus style={{ width: 13, height: 13 }} />Add line
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Speaker Sidebar */}
            {speakers.length > 0 && (
              <div className="mcp-speaker-sidebar">
                <div className="mcp-speaker-sidebar-header">Speakers · {speakers.length}</div>
                <div className="mcp-speaker-list">
                  {speakers.map(spk => (
                    <div key={spk.name} className="mcp-speaker-item">
                      <div
                        className="mcp-speaker-avatar"
                        style={{ background: spk.bg, color: spk.textColor }}
                      >
                        {getInitials(spk.name)}
                      </div>
                      <span className="mcp-speaker-name">{spk.name}</span>
                      <span className="mcp-speaker-count">{spk.count}</span>
                      <button
                        className="mcp-speaker-edit-btn"
                        title="Rename speaker"
                        onClick={() => handleRenameSpeaker(spk.name)}
                      >
                        <Edit2 style={{ width: 11, height: 11 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Generate CTA Bar */}
          <div className="mcp-cta-bar">
            <div>
              <div className="mcp-cta-count">{entries.length} lines captured</div>
              <div className="mcp-cta-info">{speakers.length} speaker{speakers.length !== 1 ? 's' : ''} detected · ready to generate MOM</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hasEntries && (
                <button
                  className="mcp-ctrl-btn danger"
                  onClick={() => { setEntries([]); setManualText(''); }}
                >
                  <X style={{ width: 12, height: 12 }} />Clear
                </button>
              )}
              <button
                id="mcp-generate-btn"
                className="mcp-generate-btn"
                onClick={handleGenerate}
                disabled={generating || !hasEntries}
              >
                {generating
                  ? <><Loader style={{ width: 14, height: 14 }} className="animate-spin" />Generating…</>
                  : <><Sparkles style={{ width: 14, height: 14 }} />Generate MOM →</>}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Rename Speaker Modal ── */}
      {renamingSpeaker && (
        <div className="mcp-rename-modal" onClick={() => setRenamingSpeaker(null)}>
          <div className="mcp-rename-card" onClick={e => e.stopPropagation()}>
            <div className="mcp-rename-title">Rename Speaker: <em>{renamingSpeaker}</em></div>
            <input
              autoFocus
              className="mcp-rename-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingSpeaker(null); }}
              placeholder="New speaker name…"
            />
            <div className="mcp-rename-actions">
              <button className="mcp-rename-cancel" onClick={() => setRenamingSpeaker(null)}>Cancel</button>
              <button className="mcp-rename-save" onClick={commitRename}>
                <Check style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />Rename All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MeetingCapturePage;
