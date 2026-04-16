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
// ── Known metadata keys that should never be treated as speakers ──────────
const METADATA_KEYS = new Set([
  'meeting title', 'date', 'start time', 'end time', 'platform',
  'participants', 'word count', 'duration', 'active speech',
  'auto-generated transcript', 'transcript', 'location', 'organizer',
  'attendees', 'meeting id', 'recording', 'summary', 'meeting transcript',
  'meeting', 'vtt', 'srt', 'subtitle', 'agenda', 'notes'
]);

function parseTranscriptFile(rawText, defaultSpeaker = 'Unattributed') {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];

  // ── Regex patterns for all common transcript formats ─────────────────
  // Format 1: [10:00 AM] Speaker: text  OR  10:00 Speaker: text
  const RE_TS_SPEAKER  = /^\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\]?\s+(.+?):\s+(.+)/i;
  // Format 2: Speaker (10:00 AM): text
  const RE_SPK_PAREN   = /^(.+?)\s*\(\s*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\s*\):\s+(.+)/i;
  // Format 3: Simple  Speaker Name: text on one line (no timestamp)
  const RE_SPK_PLAIN   = /^([^:\n]{2,45}):\s+(.+)/;
  // Format 4: Standalone timestamp only line "10:00 AM" or "10:30:00"
  const RE_TS_ONLY     = /^(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)$/i;
  // Format 5: Teams/Zoom multi-line — proper name alone on a line
  const RE_NAME_ALONE  = /^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4})$/;
  // Format 6: Teams  "Speaker Name   10:00 AM" — name + timestamp on SAME line, text on NEXT line
  const RE_NAME_TIME   = /^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4})\s{2,}(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)$/i;
  // Format 7: WebVTT  <v Speaker>text
  const RE_VTT         = /^<v\s+([^>]+)>\s*(.+)/i;
  // Format 8: SRT-style speaker indicator
  const RE_SRT_SPEAKER = /^\[([A-Z][a-zA-Z ]{1,30})\]:\s*(.+)/i;
  // Format 9: [Timestamp] Name (No colon, dialogue on next line)
  const RE_TS_NAME     = /^\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\]?\s+([^:]{2,45})$/i;

  let pendingSpeaker = null;
  let pendingTime    = null;

  const push = (entry) => { if (entry && entry.text && entry.text.trim()) entries.push(entry); };
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    
    // Skip decoration/header lines like "---" or "───"
    if (/^[=\-_*─\s]{3,}$/.test(line)) continue;
    if (lower === 'meeting transcript' || lower === 'transcript' || lower.includes('---')) continue;

    // ── Metadata ────────────────────────────────────────────────────────
    const metaM = line.match(/^[-*\s]*(meeting title|date|start time|end time|platform|participants|word count|duration|active speech|auto-generated transcript|transcript|meeting id|organizer)\s*:\s*(.*)/i);
    if (metaM) {
      push(cur); cur = null; pendingSpeaker = null;
      push({ type: 'metadata', label: metaM[1].trim(), text: metaM[2].trim() });
      continue;
    }

    // ── Decisions / Actions ─────────────────────────────────────────────
    if (/^decision[s]?\s*:/i.test(line)) {
      push(cur); cur = null; pendingSpeaker = null;
      cur = { type: 'decision', text: line.replace(/^decisions?:\s*/i, '').trim() };
      continue;
    }
    if (/^action items?\s*:/i.test(line)) {
      push(cur); cur = null; pendingSpeaker = null;
      cur = { type: 'action', text: line.replace(/^action items?:\s*/i, '').trim() };
      continue;
    }

    // ── Format 9: [Timestamp] Name alone on Line ────────────────────────
    const m9 = line.match(RE_TS_NAME);
    if (m9) {
      const spkLower = m9[2].trim().toLowerCase();
      if (!METADATA_KEYS.has(spkLower) && !spkLower.includes('meeting') && !spkLower.includes('transcript')) {
        push(cur); cur = null;
        pendingSpeaker = m9[2].trim();
        pendingTime    = m9[1].trim();
        continue;
      }
    }

    // ── Format 1: [Timestamp] Speaker: text ─────────────────────────────
    const m1 = line.match(RE_TS_SPEAKER);
    if (m1) {
      const spkLower = m1[2].trim().toLowerCase();
      if (!METADATA_KEYS.has(spkLower) && !spkLower.includes('meeting') && !spkLower.includes('transcript')) {
        push(cur);
        cur = { type: 'speech', time: m1[1].trim(), speaker: m1[2].trim(), text: m1[3].trim() };
        pendingSpeaker = null; pendingTime = null;
        continue;
      }
    }

    // ── Format 7: WebVTT <v Speaker>text ────────────────────────────────
    const m7 = line.match(RE_VTT);
    if (m7) {
      push(cur);
      cur = { type: 'speech', time: pendingTime || null, speaker: m7[1].trim(), text: m7[2].trim() };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    // ── Format 8: [Speaker]: text ────────────────────────────────────────
    const m8 = line.match(RE_SRT_SPEAKER);
    if (m8 && !METADATA_KEYS.has(m8[1].trim().toLowerCase())) {
      push(cur);
      cur = { type: 'speech', time: pendingTime || null, speaker: m8[1].trim(), text: m8[2].trim() };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    // ── Format 2: Speaker (Time): text ──────────────────────────────────
    const m2 = line.match(RE_SPK_PAREN);
    if (m2 && !METADATA_KEYS.has(m2[1].trim().toLowerCase())) {
      push(cur);
      cur = { type: 'speech', time: m2[2].trim(), speaker: m2[1].trim(), text: m2[3].trim() };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    // ── Format 3: Plain Speaker: text (or Speaker - text) ───────────────
    const m3 = line.match(/^([^:\n]{2,45})\s*[:-]\s+(.+)/);
    if (m3 && !lower.startsWith('http') && !METADATA_KEYS.has(m3[1].trim().toLowerCase())) {
      push(cur);
      cur = { type: 'speech', time: pendingTime || null, speaker: m3[1].trim(), text: m3[2].trim() };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    // ── Format 4: Standalone timestamp ──────────────────────────────────
    if (RE_TS_ONLY.test(line)) {
      pendingTime = line.trim();
      continue;
    }

    // ── Format 5: Name alone on line (or Name:) ────────────────────────
    const m5 = line.match(/^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4}):?$/i);
    if (m5 && !METADATA_KEYS.has(lower.replace(':', ''))) {
      const next = lines[i + 1] || '';
      const nextIsText = next.length > 2
        && !/^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4}):?$/i.test(next)
        && !RE_NAME_TIME.test(next)
        && !/^[-*\s]*(meeting title|date|start time|end time|platform):/i.test(next);
      if (nextIsText) {
        push(cur); cur = null;
        pendingSpeaker = m5[1].trim();
        continue;
      }
    }

    // ── Format 6: Teams "Name   10:00 AM" line — speaker name + time on same line ─
    const m6 = line.match(RE_NAME_TIME);
    if (m6) {
      const spkLower = m6[1].trim().toLowerCase();
      if (!METADATA_KEYS.has(spkLower) && !spkLower.includes('meeting') && !spkLower.includes('transcript')) {
        // Next line should be the dialogue
        push(cur); cur = null;
        pendingSpeaker = m6[1].trim();
        pendingTime    = m6[2].trim();
        continue;
      }
    }

    // ── If there is a pending Teams-style speaker, this line is their text ─
    const clean = line.replace(/^[-•]\s*/, '');
    if (pendingSpeaker) {
      push(cur);
      cur = { type: 'speech', time: pendingTime || null, speaker: pendingSpeaker, text: clean };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    // ── Continuation / overflow ──────────────────────────────────────────
    if (cur) {
      // Don't append empty lines
      if (clean) cur.text = cur.text ? cur.text + '\n' + clean : clean;
    } else if (clean.length > 2) {
      push(cur);
      cur = { type: 'speech', time: pendingTime || null, speaker: defaultSpeaker, text: clean };
      pendingTime = null;
    }
  }
  push(cur);
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

// Strip out timestamp brackets, generic dashes, and pure repeating characters
const FILLER_PATTERN = /^[-–—=*_#.\s]{2,}$|^\d+\.?$|^\[.{0,20}\]$|^(\w)\1{3,}$/;

function isNoiseLine(text) {
  if (!text || text.trim().length < 8) return true;
  const t = text.trim().toLowerCase().replace(/[.!?,;:]+$/, '');
  if (FILLER_EXACT.has(t)) return true;
  if (FILLER_PATTERN.test(text.trim())) return true;
  // Very short sentences that add no value
  if (t.split(' ').length <= 3 && t.length < 20) return true;
  return false;
}

const ACTION_VERBS = /\b(will|need|must|assign|action|decide|agree|approve|plan|schedule|review|update|fix|resolve|create|build|share|send|follow|investigate|check|verify|test|deploy|start|finish|complete|work on|look into)\b/i;

function isActionable(text) {
  // Relaxed: actionable if it contains task verbs OR if it's a substantive sentence (>30 chars).
  if (ACTION_VERBS.test(text)) return true;
  if (text.length > 40 && !text.includes('?')) return true; // Likely a substantive statement
  return false;
}


// ── Generate MOM rows from entries ────────────────────────────────────────
function makeRowsFromEntries(entries, meta) {
  const { meetingTitle, projectId, currentUserName } = meta;
  // Only process real speech (not metadata events, not generic unattributed noise)
  const speechEntries = entries.filter(e =>
    e.type === 'speech' && e.speaker !== 'Unattributed'
  );
  const generatedRows = [];
  let rowCount = 1;

  speechEntries.forEach(entry => {
    // Better sentence splitting avoiding acronyms like U.S. or e.g.
    // If transcript lacks punctuation, fallback to splitting by lines or just process as chunks.
    let rawSentences = [];
    if (/[.?!]/.test(entry.text)) {
      rawSentences = entry.text
        .replace(/([a-z])\.([A-Z])/g, "$1. $2") 
        .split(/(?<=[.?!])\s+/);
    } else {
      // Unpunctuated text (common in raw auto-captions)
      // Break by arbitrary length or just keep it as one chunk if short enough
      rawSentences = [entry.text];
    }
      
    rawSentences.forEach(raw => {
      const text = raw.trim();
      if (isNoiseLine(text)) return;
      
      // Intent filter: Only parse sentences that have an action verb or substantive length
      if (!isActionable(text)) return;

      let speaker = entry.speaker;
      let point = text;
      
      // Clean up inline speaker artifacts "John Doe: I will fix this"
      const speakerMatch = text.match(/^([A-Za-z\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) { speaker = speakerMatch[1].trim(); point = speakerMatch[2].trim(); }
      if (!point || point.length < 15) return;
      
      // Remove conversational preamble ("I think we will", "Maybe we should")
      point = point.replace(/^(I think|I believe|Maybe|Probably|Honestly|Actually|So)\s+/i, '');
      point = point.charAt(0).toUpperCase() + point.slice(1);

      let targetDate = '';
      const tl = point.toLowerCase();
      if (tl.includes('tomorrow')) { const d = new Date(); d.setDate(d.getDate() + 1); targetDate = d.toLocaleDateString('en-GB'); }
      else if (tl.includes('today')) targetDate = new Date().toLocaleDateString('en-GB');
      else if (tl.includes('next week')) { const d = new Date(); d.setDate(d.getDate() + 7); targetDate = d.toLocaleDateString('en-GB'); }

      let funcStr = 'General';
      if (/api|backend|database|db|sql|server|latency|endpoint|python|fastapi/i.test(tl)) funcStr = 'Backend';
      else if (/ui|frontend|react|dashboard|button|page|screen|component|css/i.test(tl)) funcStr = 'Frontend';
      else if (/design|ux|figma|prototype|wireframe|mockup/i.test(tl)) funcStr = 'Design';
      else if (/test|qa|bug|issue|defect|regression|verify/i.test(tl)) funcStr = 'QA';
      else if (/deploy|release|prod|staging|ci|cd|pipeline|docker|kubernetes/i.test(tl)) funcStr = 'DevOps';

      const statusStr = /(completed|done|finished|resolved|closed|fixed)/i.test(tl) ? 'Done' : 'Pending';

      generatedRows.push({
        id: Date.now() + Math.random(),
        s_no: String(rowCount++),
        function: funcStr,
        project_name: meetingTitle || 'Untitled',
        criticality: tl.includes('urgent') || tl.includes('critical') || tl.includes('blocker') || tl.includes('asap') ? 'High' : 'Medium',
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

// ═══════════════════════════════════════════════════════════════════════════
const MeetingCapturePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useSelector(state => state.auth);
  const { status: reduxStatus, lastSaved } = useSelector(s => s.mom);

  const currentUser = useMemo(() => {
    // Priority: full_name -> name -> email prefix -> Anonymous
    let name = user?.full_name || user?.name || user?.displayName;
    if (!name && user?.email) {
      const prefix = user.email.split('@')[0];
      name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    const finalName = name || 'Anonymous User';
    
    return { name: finalName, initials: getInitials(finalName) };
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
  const [interimEntry, setInterimEntry] = useState(null);
  const recognitionRef                  = useRef(null);
  const manualStopRef                   = useRef(false);
  const bufferRef                       = useRef('');
  const debounceRef                     = useRef(null);
  const timerRef                        = useRef(null);
  const waveAnimRef                     = useRef(null);
  const speakerColorMapRef              = useRef({});

  // ── High-Precision Audio Visualization ──────────────────────────────
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef   = useRef(null);
  const sourceRef   = useRef(null);
  const animationFrameRef = useRef(null);
  const previewBodyRef    = useRef(null);
  const wsRef             = useRef(null);

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

  // WebSocket Collaboration
  useEffect(() => {
    if (!meetingId || meetingId === 'unscheduled') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.includes('localhost') ? 'localhost:8001' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws/capture/${meetingId}/${currentUser.name}-${Date.now()}`;
    
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'SYNC_ENTRIES') {
          setEntries(message.payload);
        }
      } catch (err) {
        console.error("WS Message error:", err);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [meetingId, currentUser.name]);

  const broadcastEntries = useCallback((newEntries) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SYNC_ENTRIES', payload: newEntries }));
    }
  }, []);

  // Auto-scroll to bottom on new content
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

  // Waveform animation (Real-time Audio Analysis)
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // We have 28 bars. Map frequencies to these bars.
        const newHeights = [];
        const binSize = Math.floor(bufferLength / 28) || 1;
        
        for (let i = 0; i < 28; i++) {
          let sum = 0;
          for (let j = 0; j < binSize; j++) {
            sum += dataArray[i * binSize + j];
          }
          const avg = sum / binSize;
          // Scale for visual impact: base 4px + (avg/255 * max_height)
          const h = 4 + (avg / 255) * 44;
          newHeights.push(h);
        }
        setWaveHeights(newHeights);
        animationFrameRef.current = requestAnimationFrame(updateWave);
      };

      updateWave();
    } catch (err) {
      console.warn("Audio analysis failed:", err);
      setMicError("Microphone visualization unavailable.");
    }
  };

  const stopAudioAnalysis = () => {
    cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setWaveHeights(Array(28).fill(4));
  };

  useEffect(() => {
    if (recordState === 'RECORDING') {
      startAudioAnalysis();
    } else {
      stopAudioAnalysis();
    }
    return () => stopAudioAnalysis();
  }, [recordState]);

  // Cleanup
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

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Speech Recognition ────────────────────────────────────────────────
  const flushBuffer = useCallback(() => {
    clearTimeout(debounceRef.current);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    
    // Noise Filter: Ignore nonsense bursts or very short filler (< 3 chars)
    if (!text || text.length < 3) {
      setInterimText('');
      setInterimEntry(null);
      return;
    }

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
    setInterimEntry(null);
    // Broadcast newly finished turn
    setEntries(prev => {
      broadcastEntries(prev);
      return prev;
    });
  }, [currentUser.name, getSpeakerColor, broadcastEntries]);

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
      if (interim) {
        setInterimText(interim);
        const color = getSpeakerColor(currentUser.name);
        setInterimEntry({
          id: 'interim-entry',
          type: 'speech',
          speaker: currentUser.name,
          initials: getInitials(currentUser.name),
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
    const parsed = parseTranscriptFile(rawText, currentUser.name);
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
    setEntries(prev => {
      const combined = [...prev, ...uploadedEntries];
      broadcastEntries(combined);
      return combined;
    });
    toast.success(`Added ${uploadedEntries.length} lines to session`);
  }, [getSpeakerColor, projectId, broadcastEntries]);

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
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, text } : e);
      broadcastEntries(updated);
      return updated;
    });
  }, [broadcastEntries]);

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
    
    // Check if MOM already exists (via lastSaved state or simple prompt)
    if (lastSaved) {
      const confirmOverwrite = window.confirm("A Minutes of Meeting already exists for this session. Do you want to overwrite it with the current data?");
      if (!confirmOverwrite) return;
    }

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

              <div className="mcp-preview-body" ref={previewBodyRef}>
                {!hasEntries && !interimEntry ? (
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
                    {/* ── Metadata Block (Meeting Header Info) ── */}
                    {entries.some(e => e.type === 'event' && e.label && ['Meeting Title','Date','Start Time','End Time','Platform','Participants','Word Count'].includes(e.label)) && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '10px 12px',
                        marginBottom: 8,
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '4px 12px',
                        alignItems: 'start',
                      }}>
                        {entries
                          .filter(e => e.type === 'event')
                          .map(entry => (
                            <React.Fragment key={entry.id}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 2, whiteSpace: 'nowrap' }}>
                                {entry.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{entry.text}</span>
                                <button className="mcp-entry-del" style={{ opacity: 0.4 }} onClick={() => deleteEntry(entry.id)}>
                                  <X style={{ width: 10, height: 10 }} />
                                </button>
                              </div>
                            </React.Fragment>
                          ))
                        }
                      </div>
                    )}

                    {/* ── Speech / Dialogue Entries ── */}
                    {[...entries.filter(e => e.type === 'speech'), ...(interimEntry ? [interimEntry] : [])].map((entry) => {
                      const spkColor = { bg: entry.bg || '#EDE9FE', text: entry.textColor || '#6D28D9', dot: entry.color || '#7C3AED' };
                      return (
                        <div key={entry.id} className={`mcp-entry-row ${entry.isInterim ? 'mcp-entry-interim' : ''}`}>
                          <span
                            className="mcp-speaker-pill"
                            style={{ background: spkColor.bg, color: spkColor.text, cursor: 'pointer', userSelect: 'none' }}
                            title="Click to rename speaker"
                            onClick={() => !entry.isInterim && handleRenameSpeaker(entry.speaker)}
                          >
                            <span className="mcp-speaker-dot" style={{ background: spkColor.dot }} />
                            {entry.speaker}
                          </span>
                          {entry.time && <span className="mcp-entry-time">{entry.time}</span>}
                          {entry.isInterim ? (
                            <div className="mcp-entry-text">{entry.text}<em>...</em></div>
                          ) : (
                            <textarea
                              className="mcp-entry-text-editable"
                              defaultValue={entry.text}
                              rows={1}
                              onBlur={e => updateEntryText(entry.id, e.target.value)}
                            />
                          )}
                          {!entry.isInterim && (
                            <button className="mcp-entry-del" onClick={() => deleteEntry(entry.id)}>
                              <X style={{ width: 12, height: 12 }} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* ── Action/Decision Events (not metadata) ── */}
                    {entries.filter(e => e.type === 'event' && !['Meeting Title','Date','Start Time','End Time','Platform','Participants','Word Count','Metadata'].includes(e.label)).map((entry) => {
                      const es = EVENT_STYLES[entry.label] || { bg: '#f3f4f6', text: '#6b7280' };
                      return (
                        <div key={entry.id} className="mcp-entry-row event-row">
                          <span className="mcp-event-label" style={{ background: es.bg, color: es.text }}>
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
                    })}

                    <button className="mcp-add-row-btn" onClick={addNewLine}>
                      <Plus style={{ width: 13, height: 13 }} />Add line
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Speaker Sidebar — only real speakers (exclude generic 'Transcript' if actual speakers exist) */}
            {speakers.filter(s => speakers.length === 1 ? true : s.name !== 'Transcript').length > 0 && (
              <div className="mcp-speaker-sidebar">
                <div className="mcp-speaker-sidebar-header">Speakers · {speakers.filter(s => speakers.length === 1 ? true : s.name !== 'Transcript').length}</div>
                <div className="mcp-speaker-list">
                  {speakers
                    .filter(s => speakers.length === 1 ? true : s.name !== 'Transcript')
                    .map(spk => (
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
              <div className="mcp-cta-count">{entries.filter(e => e.type === 'speech').length} dialogue lines · {entries.filter(e => e.type === 'event').length} metadata</div>
              <div className="mcp-cta-info">{speakers.filter(s => s.name !== 'Transcript').length || speakers.length} speaker{speakers.length !== 1 ? 's' : ''} detected · ready to generate MOM</div>
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
