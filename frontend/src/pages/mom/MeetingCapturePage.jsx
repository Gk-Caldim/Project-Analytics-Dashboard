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
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion: { bg: '#fef3c7', text: '#92400e' },
  Decisions: { bg: '#dbeafe', text: '#1d4ed8' },
  'Action Items': { bg: '#d1fae5', text: '#065f46' },
  Metadata: { bg: '#f1f5f9', text: '#475569' },
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

// ── Platform names that should never appear as speakers ─────────────────
const PLATFORM_NAMES = new Set([
  'google meet', 'zoom', 'teams', 'microsoft teams', 'webex',
  'cisco webex', 'skype', 'slack', 'discord', 'meet',
  'google', 'zoom meeting', 'teams meeting'
]);

function parseTranscriptFile(rawText, defaultSpeaker = 'Unattributed') {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];

  // ── Regex patterns for all common transcript formats ─────────────────
  const RE_TS_SPEAKER = /^\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\]?\s+(.+?):\s+(.+)/i;
  const RE_SPK_PAREN = /^(.+?)\s*\(\s*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\s*\):\s+(.+)/i;
  const RE_SPK_PLAIN = /^([^:\n]{2,45}):\s+(.+)/;
  const RE_TS_ONLY = /^(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)$/i;
  const RE_NAME_ALONE = /^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4}):?$/i;
  const RE_NAME_TIME = /^([A-Z][a-zA-Z''-]{1,25}(?:\s+[A-Z][a-zA-Z''-]{1,25}){0,4})\s{2,}(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)$/i;
  const RE_VTT = /^<v\s+([^>]+)>\s*(.+)/i;
  const RE_SRT_SPEAKER = /^\[([A-Z][a-zA-Z ]{1,30})\]:\s*(.+)/i;
  const RE_TS_NAME = /^\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?)\]?\s+([^:]{2,45})$/i;

  // ── Pre-scan Phase: Identify Dominant Format ────────────────────────
  const scores = { ts_spk: 0, spk_paren: 0, spk_plain: 0, ts_name: 0, vtt: 0, teams: 0 };
  for (let j = 0; j < Math.min(lines.length, 40); j++) {
    if (RE_TS_SPEAKER.test(lines[j])) scores.ts_spk++;
    if (RE_SPK_PAREN.test(lines[j])) scores.spk_paren++;
    if (RE_SPK_PLAIN.test(lines[j])) scores.spk_plain++;
    if (RE_TS_NAME.test(lines[j])) scores.ts_name++;
    if (RE_VTT.test(lines[j])) scores.vtt++;
    if (RE_NAME_TIME.test(lines[j])) scores.teams++;
  }
  const dominant = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

  let pendingSpeaker = null;
  let pendingTime = null;

  const push = (entry) => {
    if (!entry || !entry.text || !entry.text.trim()) return;
    // Smart Merging: If same speaker as last entry, merge text
    const last = entries[entries.length - 1];
    if (last && last.type === 'speech' && entry.type === 'speech' && last.speaker === entry.speaker) {
      last.text += '\n' + entry.text;
    } else {
      entries.push(entry);
    }
  };
  let cur = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (/^[=\-_*─\s]{3,}$/.test(line)) continue;
    if (lower === 'meeting transcript' || lower === 'transcript' || lower.includes('---')) continue;

    // Metadata extraction
    const metaM = line.match(/^[-*\s]*(meeting title|date|start time|end time|platform|participants|word count|duration|active speech|auto-generated transcript|transcript|meeting id|organizer)\s*:\s*(.*)/i);
    if (metaM) {
      push(cur); cur = null; pendingSpeaker = null;
      push({ type: 'metadata', label: metaM[1].trim(), text: metaM[2].trim() });
      continue;
    }

    // Decisions / Actions detection
    const decisionM = line.match(/^(decision[s]?|decided|we decided to)\s*:\s*(.*)/i);
    if (decisionM) {
      push(cur); cur = null; pendingSpeaker = null;
      push({ type: 'decision', text: decisionM[2].trim() || line.replace(/^(decision[s]?|decided|we decided to)\s*:\s*/i, '').trim() });
      continue;
    }
    const actionM = line.match(/^(action items?|task|todo|to-do)\s*:\s*(.*)/i);
    if (actionM) {
      push(cur); cur = null; pendingSpeaker = null;
      push({ type: 'action', text: actionM[2].trim() || line.replace(/^(action items?|task|todo|to-do)\s*:\s*/i, '').trim() });
      continue;
    }

    // Adaptive Parsing Logic
    let matched = false;

    // Try dominant format first
    if (dominant === 'ts_spk') {
      const m = line.match(RE_TS_SPEAKER);
      if (m && !METADATA_KEYS.has(m[2].trim().toLowerCase())) {
        push(cur); cur = { type: 'speech', time: m[1].trim(), speaker: m[2].trim(), text: m[3].trim() };
        matched = true;
      }
    } else if (dominant === 'spk_paren') {
      const m = line.match(RE_SPK_PAREN);
      if (m && !METADATA_KEYS.has(m[1].trim().toLowerCase())) {
        push(cur); cur = { type: 'speech', time: m[2].trim(), speaker: m[1].trim(), text: m[3].trim() };
        matched = true;
      }
    }

    if (matched) continue;

    // Fallback to general patterns
    const m1 = line.match(RE_TS_SPEAKER);
    if (m1 && !METADATA_KEYS.has(m1[2].trim().toLowerCase())) {
      push(cur); cur = { type: 'speech', time: m1[1].trim(), speaker: m1[2].trim(), text: m1[3].trim() };
      continue;
    }

    const m9 = line.match(RE_TS_NAME);
    if (m9 && !METADATA_KEYS.has(m9[2].trim().toLowerCase())) {
      push(cur); cur = null;
      pendingSpeaker = m9[2].trim();
      pendingTime = m9[1].trim();
      continue;
    }

    const m7 = line.match(RE_VTT);
    if (m7) {
      push(cur); cur = { type: 'speech', time: pendingTime || null, speaker: m7[1].trim(), text: m7[2].trim() };
      continue;
    }

    const m2 = line.match(RE_SPK_PAREN);
    if (m2 && !METADATA_KEYS.has(m2[1].trim().toLowerCase())) {
      push(cur); cur = { type: 'speech', time: m2[2].trim(), speaker: m2[1].trim(), text: m2[3].trim() };
      continue;
    }

    const m3 = line.match(/^([^:\n]{2,45})\s*[:-]\s+(.+)/);
    if (m3 && !lower.startsWith('http') && !METADATA_KEYS.has(m3[1].trim().toLowerCase())) {
      push(cur); cur = { type: 'speech', time: pendingTime || null, speaker: m3[1].trim(), text: m3[2].trim() };
      continue;
    }

    if (RE_TS_ONLY.test(line)) {
      pendingTime = line.trim();
      continue;
    }

    const m5 = line.match(RE_NAME_ALONE);
    if (m5 && !METADATA_KEYS.has(lower.replace(':', ''))) {
      const next = lines[i + 1] || '';
      const nextIsText = next.length > 2 && !RE_NAME_ALONE.test(next) && !RE_NAME_TIME.test(next);
      if (nextIsText) {
        push(cur); cur = null;
        pendingSpeaker = m5[1].trim();
        continue;
      }
    }

    const m6 = line.match(RE_NAME_TIME);
    if (m6 && !METADATA_KEYS.has(m6[1].trim().toLowerCase())) {
      push(cur); cur = null;
      pendingSpeaker = m6[1].trim();
      pendingTime = m6[2].trim();
      continue;
    }

    const clean = line.replace(/^[-•]\s*/, '');
    if (pendingSpeaker) {
      push(cur); cur = { type: 'speech', time: pendingTime || null, speaker: pendingSpeaker, text: clean };
      pendingSpeaker = null; pendingTime = null;
      continue;
    }

    if (cur) {
      if (clean) cur.text = cur.text ? cur.text + '\n' + clean : clean;
    } else if (clean.length > 2) {
      push(cur); cur = { type: 'speech', time: pendingTime || null, speaker: defaultSpeaker, text: clean };
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
        isHeuristic: true
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
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const reduxProjects = useSelector(s => s.project?.projects) || [];
  const [projects, setProjects] = useState([]);
  const isProjectLinked = Boolean(projectId);

  const meetingId = useMemo(() =>
    searchParams.get('id') || searchParams.get('meetingId') || 'unscheduled',
    [searchParams]);

  // ── Entries (unified across all 3 modes) ──────────────────────────────
  const [entries, setEntries] = useState([]);

  // ── Input Mode ────────────────────────────────────────────────────────
  const [mode, setMode] = useState('upload'); // 'upload' | 'record' | 'manual'

  // ── Upload Mode ───────────────────────────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [uploadedFileTime, setUploadedFileTime] = useState('');
  const fileInputRef = useRef(null);
  const [speakerRoles, setSpeakerRoles] = useState({});

  // ── Record Mode ───────────────────────────────────────────────────────
  const [recordState, setRecordState] = useState('IDLE'); // IDLE | RECORDING | PAUSED
  const [timerVal, setTimerVal] = useState(0);
  const [micError, setMicError] = useState('');
  const [waveHeights, setWaveHeights] = useState(Array(28).fill(4));
  const [interimText, setInterimText] = useState('');
  const [interimEntry, setInterimEntry] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const manualStopRef = useRef(false);
  const bufferRef = useRef('');
  const debounceRef = useRef(null);
  const timerRef = useRef(null);
  const waveAnimRef = useRef(null);
  const speakerColorMapRef = useRef({});

  // ── High-Precision Audio Visualization ──────────────────────────────
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previewBodyRef = useRef(null);
  const wsRef = useRef(null);

  // ── Manual Mode ───────────────────────────────────────────────────────
  const [manualText, setManualText] = useState('');

  // ── Preview editing ───────────────────────────────────────────────────
  const [renamingSpeaker, setRenamingSpeaker] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // ── Generating ────────────────────────────────────────────────────────
  const [isConfirmingSpeakers, setIsConfirmingSpeakers] = useState(false);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [generating, setGenerating] = useState(false);

  // ── Flow Steps ──
  const currentStep = useMemo(() => {
    if (generating) return 3;
    if (entries.length > 0) return 2;
    return 1;
  }, [entries.length, generating]);

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
      }).catch(() => { });
    }

    if (meetingId && meetingId !== 'unscheduled') {
      setMeetingTitle(`Meeting #${meetingId}`);
      // Restore existing transcript if available
      API.get(`/transcript/${meetingId}`).then(r => {
        if (r.data?.transcript_data?.length > 0) setEntries(r.data.transcript_data);
      }).catch(() => { });
    }
  }, [meetingId]);

  // WebSocket Collaboration
  useEffect(() => {
    if (!meetingId || meetingId === 'unscheduled') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host.includes('localhost') ? 'localhost:8000' : window.location.host;
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
    if (recordState !== 'RECORDING' && recordState !== 'PAUSED') {
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
        try { recognitionRef.current.stop(); } catch (_) { }
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
        setTimeout(() => { try { rec.start(); } catch (_) { } }, 300);
      }
    };

    return rec;
  }, [flushBuffer]);

  // --- High-Precision Transcription (Whisper) ---
  const sendAudioToBackend = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'chunk.webm');
      formData.append('speaker', currentUser.name);

      const response = await API.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.text && response.data.text.trim().length > 3) {
        const text = response.data.text.trim();
        const color = getSpeakerColor(currentUser.name);

        setEntries(prev => {
          // If the last entry was a Whisper result from the same speaker, maybe merge it?
          // For now, just add as a new entry if it's substantial
          const newEntry = {
            id: `whisper-${Date.now()}-${Math.random()}`,
            type: 'speech',
            speaker: currentUser.name,
            initials: getInitials(currentUser.name),
            color: color.dot,
            bg: color.bg,
            textColor: color.text,
            time: nowTime(),
            text,
            isWhisper: true
          };

          // Broadcast for collaboration
          const updated = [...prev, newEntry];
          broadcastEntries(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error("Whisper transcription error:", err);
    }
  };

  const startRecording = useCallback(async () => {
    manualStopRef.current = false;
    setMicError('');

    try {
      // 1. Start Audio Analysis for Waves
      await startAudioAnalysis();

      // 2. Setup SpeechRecognition for Interim Feedback
      if (SpeechRecognitionAPI) {
        const rec = initRecognition();
        recognitionRef.current = rec;
        try { rec.start(); } catch (_) { }
      }

      // 3. Setup MediaRecorder for High-Precision Whisper
      if (streamRef.current) {
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            sendAudioToBackend(e.data);
          }
        };

        // Collect and send every 6 seconds for balanced latency/accuracy
        recorder.start(6000);
      }

      setRecordState('RECORDING');
    } catch (err) {
      console.error("Start recording failed:", err);
      setMicError('Could not start microphone. Check permissions.');
    }
  }, [initRecognition, currentUser.name]);

  const stopRecording = useCallback(() => {
    manualStopRef.current = true;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) { }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) { }
    }

    stopAudioAnalysis();
    flushBuffer();
    setInterimText('');
    setTimerVal(0);
    setRecordState('IDLE');
  }, [flushBuffer]);

  const pauseRecording = useCallback(() => {
    if (recordState === 'RECORDING') {
      manualStopRef.current = true;
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (_) { } }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.pause(); } catch (_) { }
      }
      flushBuffer();
      setRecordState('PAUSED');
    } else if (recordState === 'PAUSED') {
      manualStopRef.current = false;
      const rec = initRecognition();
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) { }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        try { mediaRecorderRef.current.resume(); } catch (_) { }
      }
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

    setPendingEntries(uploadedEntries);
    setIsConfirmingSpeakers(true);
    toast.success(`Parsed ${uploadedEntries.length} lines. Please confirm speakers.`);
  }, [getSpeakerColor, projectId]);

  const handleConfirmSpeakers = useCallback(() => {
    setEntries(prev => {
      const combined = [...prev, ...pendingEntries];
      broadcastEntries(combined);
      return combined;
    });
    setPendingEntries([]);
    setIsConfirmingSpeakers(false);
    toast.success('Transcript added to session');
  }, [pendingEntries, broadcastEntries]);

  const handleCancelConfirmation = useCallback(() => {
    setPendingEntries([]);
    setIsConfirmingSpeakers(false);
    setUploadedFileName('');
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    setUploadedFileTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      let raw = ev.target.result;
      if (ext === 'json') {
        try { raw = JSON.stringify(JSON.parse(raw), null, 2); } catch (_) { }
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

  const handleInlineRename = useCallback((oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setEntries(prev => prev.map(e =>
      e.speaker === oldName ? { ...e, speaker: trimmed, initials: getInitials(trimmed), ...getSpeakerColor(trimmed) } : e
    ));
    setPendingEntries(prev => prev.map(e =>
      e.speaker === oldName ? { ...e, speaker: trimmed, initials: getInitials(trimmed), ...getSpeakerColor(trimmed) } : e
    ));
  }, [getSpeakerColor]);

  const commitRename = useCallback(() => {
    const newName = renameValue.trim();
    if (!newName || newName === renamingSpeaker) { setRenamingSpeaker(null); return; }

    // Rename in main entries
    setEntries(prev => prev.map(e =>
      e.speaker === renamingSpeaker
        ? { ...e, speaker: newName, initials: getInitials(newName), ...getSpeakerColor(newName) }
        : e
    ));

    // Rename in pending entries (for confirmation step)
    setPendingEntries(prev => prev.map(e =>
      e.speaker === renamingSpeaker
        ? { ...e, speaker: newName, initials: getInitials(newName), ...getSpeakerColor(newName) }
        : e
    ));

    setRenamingSpeaker(null);
  }, [renamingSpeaker, renameValue, getSpeakerColor]);

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
    } catch (_) { }
  }, [meetingId, entries]);

  // ── Generate MOM ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (entries.length === 0) {
      toast.error('Nothing to generate from — add some content first');
      return;
    }

    if (!projectId) {
      toast.error('Please select a project before generating the MOM');
      return;
    }
    setGenerating(true);

    try {
      // 1. Prepare data for AI
      const payload = {
        transcript: entries.map(e => ({
          speaker: e.speaker || 'Unknown',
          text: e.text,
          time: e.time,
          label: e.label,
          type: e.type
        })),
        title: meetingTitle || 'Untitled Meeting',
        projectId
      };

      // 2. Call Backend LLM Generation
      const mId = meetingId || 'unscheduled';
      const resp = await API.post(`/meetings/${mId}/generate-mom`, payload);

      if (resp.data?.success) {
        const intel = resp.data.intelligence;

        // 3. Map AI Intelligence to MOM Rows (Aligned with MeetingTable schema)
        const aiRows = [
          ...(intel.action_items || []).map((a, idx) => ({
            id: `ai-act-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            function: 'General',
            criticality: a.priority || 'Medium',
            discussion_point: a.description || a.title,
            responsibility: a.owner || '',
            target: a.due_date || 'TBD',
            status: a.status || 'Pending',
            action_taken: 'Pending AI assignment.',
            time: nowTime()
          })),
          ...(intel.decisions || []).map((d, idx) => ({
            id: `ai-dec-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            function: 'Decision',
            criticality: 'Medium',
            discussion_point: d,
            responsibility: 'Everyone',
            target: 'Permanent',
            status: 'Closed',
            action_taken: 'Decision finalized.',
            time: nowTime()
          }))
        ];

        const proj = projects.find(p => String(p.id ?? p.project_id) === String(projectId));
        const projName = proj ? (proj.name ?? proj.project_name) : (meetingTitle || 'Untitled');

        // 4. Save to Redux & DB
        dispatch(setMeetingContext({
          meetingId: mId,
          meetingName: payload.title,
          projectId: projectId || null,
          projectName: projName,
        }));

        dispatch(setMomData(aiRows));

        await API.post('/mom/save', {
          meeting_id: mId,
          meeting_name: payload.title,
          project_id: projectId,
          project_name: projName,
          mom_data: aiRows
        });

        // 5. Also save raw transcript for future reference
        await saveTranscript(entries);

        toast.success('AI Meeting Intelligence Generated!');
        navigate('/dashboard/mom/view');
      }
    } catch (err) {
      console.error('AI Generation failed:', err);

      // Fallback to local heuristic (legacy mapping)
      const rows = makeRowsFromEntries(entries, {
        meetingTitle: meetingTitle || 'Untitled',
        projectId,
        currentUserName: currentUser.name,
      });
      dispatch(setMomData(rows));
      navigate('/dashboard/mom/view');
    } finally {
      setGenerating(false);
    }
  }, [entries, meetingTitle, projectId, projects, currentUser.name, meetingId, dispatch, navigate, saveTranscript]);

  // ── Render ─────────────────────────────────────────────────────────────
  const hasEntries = entries.length > 0;

  return (
    <div className="mcp-root mom-theme">

      {/* ── Top Bar — Crisp Navigation ── */}
      <div className="mcp-topbar">
        <nav className="mcp-breadcrumb">
          <Link to="/dashboard" className="mcp-bc-link"><Home style={{ width: 12, height: 12 }} />Dashboard</Link>
          <ChevronRight className="mcp-bc-sep" style={{ width: 12, height: 12 }} />
          <Link to="/dashboard/meetings" className="mcp-bc-link"><Layout style={{ width: 12, height: 12 }} />Meetings</Link>
          <ChevronRight className="mcp-bc-sep" style={{ width: 12, height: 12 }} />
          <span className="mcp-bc-current">Meeting Intelligence Intake</span>
        </nav>

        <div className="mcp-save-status">
          {generating ? 'Processing Intelligence…' : (lastSaved ? `Last synced: ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Draft Mode')}
        </div>
      </div>

      {/* ── 3-Step Guided Flow Indicator ── */}
      <div className="mcp-steps">
        <div className={`mcp-step ${hasEntries ? 'completed' : 'active'}`}>
          <div className="mcp-step-num">{hasEntries ? <Check style={{width: 14, height: 14}} /> : 1}</div>
          <div className="mcp-step-label">Capture</div>
        </div>
        <div className="mcp-step-connector" />
        <div className={`mcp-step ${hasEntries ? 'active' : ''} ${lastSaved ? 'completed' : ''}`}>
          <div className="mcp-step-num">2</div>
          <div className="mcp-step-label">Review</div>
        </div>
        <div className="mcp-step-connector" />
        <div className={`mcp-step ${lastSaved ? 'active' : ''}`}>
          <div className="mcp-step-num">3</div>
          <div className="mcp-step-label">Generate</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={`mcp-body ${hasEntries ? 'step-2' : ''}`}>

        {/* ── Left Pane: Session Context + Input ── */}
        {!hasEntries && (
          <div className="mcp-input-pane">

          {/* Session Context Header Card */}
          <div className="mcp-session-card mcp-fade-up">
            <input
              className="mcp-session-title-input"
              placeholder="Name this session..."
              value={meetingTitle || ''}
              onChange={e => setMeetingTitle(e.target.value)}
            />
            <div className="mcp-project-pill" style={{
              width: 'fit-content',
              borderLeft: isProjectLinked ? 'none' : '2px solid #D97706',
              transition: 'border-left 0.2s',
            }}>
              <Layout style={{ width: 10, height: 10 }} />
              <select
                className="mcp-project-select-minimal"
                value={projectId}
                onChange={e => {
                  setProjectId(e.target.value);
                }}
              >
                <option value="">Link Project...</option>
                {projects.map(p => (
                  <option key={p.id ?? p.project_id} value={p.id ?? p.project_id}>
                    {p.name ?? p.project_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mcp-session-time">
              {nowTime()}
            </div>
          </div>

          {/* ── Level 2: Segmented Mode Selector ── */}
          <div className="mcp-segmented-control mcp-fade-up">
            <button className={`mcp-segment ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>Upload</button>
            <button className={`mcp-segment ${mode === 'record' ? 'active' : ''}`} onClick={() => setMode('record')}>Record Live</button>
            <button className={`mcp-segment ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Paste Notes</button>
          </div>

          {/* ── Level 3: Focused Input Zones ── */}
          <div className="mcp-input-canvas mcp-fade-up" style={{ position: 'relative' }}>

            {/* Gate: project must be linked */}
            {!isProjectLinked && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.7)', borderRadius: 'inherit',
                pointerEvents: 'all',
              }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                  Link a project to begin
                </span>
              </div>
            )}
            
            {/* 1. Upload Zone */}
            {mode === 'upload' && !isConfirmingSpeakers && (
              <div className="mcp-mode-content" style={{ pointerEvents: isProjectLinked ? 'auto' : 'none' }}>
                <div
                  className={`mcp-dropzone ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="mcp-dropzone-icon" size={32} />
                  <div className="mcp-dropzone-title">Import Meeting Transcript</div>
                  <div className="mcp-dropzone-sub">Supports .txt, .md, .vtt, .srt</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.vtt,.srt" style={{ display: 'none' }} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
              </div>
            )}

            {/* Upload File Summary (shown during speaker confirmation) */}
            {mode === 'upload' && isConfirmingSpeakers && uploadedFileName && (
              <div className="mcp-mode-content">
                <div style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: '10px', padding: '20px', display: 'flex',
                  flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '10px',
                      background: '#F0FDFA', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0
                    }}>
                      <FileText style={{ width: 20, height: 20, color: '#0D9488' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 600, color: '#0F172A',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{uploadedFileName}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {uploadedFileSize < 1024
                          ? `${uploadedFileSize} B`
                          : `${(uploadedFileSize / 1024).toFixed(1)} KB`}
                        {uploadedFileTime && ` · Uploaded at ${uploadedFileTime}`}
                      </div>
                    </div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '999px', fontSize: '10px',
                      fontWeight: 700, background: '#DCFCE7', color: '#166534',
                      flexShrink: 0
                    }}>
                      <CheckCircle style={{ width: 10, height: 10 }} /> Uploaded
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Record Zone */}
            {mode === 'record' && (
              <div className="mcp-mode-content mcp-record-zone" style={{ pointerEvents: isProjectLinked ? 'auto' : 'none' }}>
                <div className="mcp-record-center">
                  <button
                    id="mcp-record-btn"
                    className={`mcp-record-btn ${recordState.toLowerCase()}`}
                    onClick={recordState === 'IDLE' ? startRecording : stopRecording}
                  >
                    {recordState === 'IDLE'
                      ? <Mic style={{ width: 32, height: 32, color: 'white' }} />
                      : <Square style={{ width: 24, height: 24, color: 'white', fill: 'white' }} />}
                  </button>

                  <div className="mcp-record-timer">{formatTime(timerVal)}</div>

                  {recordState === 'RECORDING' && (
                    <div className="mcp-waveform">
                      {waveHeights.map((h, i) => (
                        <div
                          key={i}
                          className="mcp-wave-bar"
                          style={{ height: `${h * 100}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {micError && <div className="mcp-mic-error"><AlertCircle style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />{micError}</div>}

                  {!SpeechRecognitionAPI && (
                    <div className="mcp-mic-error">Live recording requires Chrome or Edge browser.</div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Manual Paste Zone */}
            {mode === 'manual' && (
              <div className="mcp-mode-content" style={{ padding: 0, pointerEvents: isProjectLinked ? 'auto' : 'none' }}>
                <textarea
                  className="mcp-manual-textarea"
                  placeholder={`Paste notes or type directly:\n\nRahul: We need to review the API performance.\nPriya: Budget approval is needed by Friday.\nDecision: Move to cloud infra in Q3.`}
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  disabled={!isProjectLinked}
                />
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <button 
                    className="mcp-file-btn" 
                    onClick={parseManualText} 
                    disabled={!manualText.trim()}
                    style={{ background: 'var(--mom-primary)' }}
                  >
                    <Check style={{ width: 14, height: 14 }} /> Convert to Intelligence
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── Level 4: Intelligence Preview Pane (Transcript 70%) ── */}
        <div className="mcp-preview-pane">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            
            {/* Main Preview Canvas */}
            <div className="mcp-preview-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="mcp-intelligence-header" style={{ flexShrink: 0 }}>
                <div className="mcp-pulse-dot" style={{ display: hasEntries && !isConfirmingSpeakers ? 'none' : 'block' }} />
                <span className="mcp-intelligence-header-title">
                  {isConfirmingSpeakers ? 'CONFIRM SPEAKERS' : (hasEntries ? 'MEETING EXTRACTS' : 'TRANSCRIPT PREVIEW')}
                </span>
                {isConfirmingSpeakers && (
                  <span className="mcp-preview-count" style={{ marginLeft: 'auto' }}>
                    {Array.from(new Set(pendingEntries.filter(e => e.type === 'speech').map(e => e.speaker))).length} found
                  </span>
                )}
              </div>

              {/* STICKY TOP SUMMARY BAR FOR STEP 2 */}
              {hasEntries && !isConfirmingSpeakers && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, flexShrink: 0, padding: '16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-success)' }} />
                    {entries.filter(e => e.type === 'speech').length} dialogue lines <span style={{ color: 'var(--color-text-tertiary)' }}>·</span> {entries.filter(e => e.type === 'event').length} metadata <span style={{ color: 'var(--color-text-tertiary)' }}>·</span> {speakers.filter(s => s.name !== 'Transcript').length || speakers.length} speakers detected — ready to generate MOM
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="mcp-btn-ghost" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 500 }} onClick={() => { setEntries([]); setManualText(''); }}>
                      Clear
                    </button>
                    <button className="mcp-file-btn" style={{ background: '#0D9488', padding: '8px 16px', fontSize: '14px', fontWeight: 500, minWidth: 0, height: 'auto', borderRadius: '4px', color: '#fff' }} onClick={handleGenerate} disabled={generating}>
                      {generating ? 'Generating...' : 'Generate MOM →'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mcp-preview-body" ref={previewBodyRef} style={{ padding: isConfirmingSpeakers || hasEntries ? 0 : undefined, flex: 1, overflowY: 'auto' }}>
                {isConfirmingSpeakers ? (() => {
                  const allSpeakers = Array.from(new Set(pendingEntries.filter(e => e.type === 'speech').map(e => e.speaker)));
                  const humanSpeakers = allSpeakers.filter(name => !PLATFORM_NAMES.has(name.toLowerCase().trim()));
                  return (
                  <div className="mcp-confirm-slide-in">
                    <div className="mcp-confirm-subtext">Review detected participants before import</div>
                    <div className="mcp-speaker-row-list">
                      {humanSpeakers.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#D97706', fontSize: '13px', fontWeight: 600 }}>
                          <AlertCircle style={{ width: 24, height: 24, margin: '0 auto 8px', display: 'block' }} />
                          No human speakers detected. Check transcript format.
                        </div>
                      ) : humanSpeakers.map(name => {
                        const color = getSpeakerColor(name);
                        return (
                          <div key={name} className="mcp-speaker-row">
                            <div className="mcp-speaker-avatar" style={{ background: '#0D9488', color: '#fff' }}>
                              {getInitials(name)}
                            </div>
                            <div className="mcp-speaker-info">
                              <input 
                                className="mcp-speaker-name-input" 
                                defaultValue={name} 
                                onBlur={(e) => handleInlineRename(name, e.target.value)} 
                                title="Click to edit name"
                              />
                              <input 
                                className="mcp-speaker-role-input" 
                                placeholder="Participant" 
                                value={speakerRoles[name] || ''} 
                                onChange={(e) => setSpeakerRoles(prev => ({ ...prev, [name]: e.target.value }))}
                                title="Click to add role"
                              />
                            </div>
                            <CheckCircle className="mcp-speaker-check" size={20} />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mcp-confirm-footer">
                      <span className="mcp-confirm-footer-caption">
                        {humanSpeakers.length} speakers detected
                        {allSpeakers.length !== humanSpeakers.length && (
                          <span style={{ marginLeft: 6, color: '#94A3B8' }}>
                            ({allSpeakers.length - humanSpeakers.length} platform label{allSpeakers.length - humanSpeakers.length > 1 ? 's' : ''} filtered)
                          </span>
                        )}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                        <button className="mcp-btn-ghost" onClick={handleCancelConfirmation}>Cancel</button>
                        <button className="mcp-file-btn" onClick={handleConfirmSpeakers} disabled={humanSpeakers.length === 0} style={{ background: 'var(--mom-primary)', minWidth: 160, opacity: humanSpeakers.length === 0 ? 0.5 : 1 }}>
                          Import Transcript
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })() : !hasEntries && !interimEntry ? (
                  <div className="mcp-preview-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      Upload a transcript to preview content here.
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px 0' }}>
                    {/* ── Metadata Block (Meeting Header Info) ── */}
                    {entries.some(e => e.type === 'event' && e.label && ['Meeting Title', 'Date', 'Start Time', 'End Time', 'Platform', 'Participants', 'Word Count', 'Duration'].includes(e.label)) && (
                      <div style={{
                        padding: '4px 0 4px 12px',
                        margin: '0 16px 24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: '3px solid #0D9488'
                      }}>
                        {entries
                          .filter(e => e.type === 'event' && ['Meeting Title', 'Date', 'Start Time', 'End Time', 'Platform', 'Participants', 'Word Count', 'Duration'].includes(e.label))
                          .map(entry => (
                            <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', alignItems: 'center', padding: '6px 0' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                {entry.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{entry.text}</span>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    )}

                    {/* ── Speech / Dialogue Entries (Redesigned Step 2 Blocks) ── */}
                    {[...entries.filter(e => e.type === 'speech'), ...(interimEntry ? [interimEntry] : [])].map((entry) => {
                      const spkColor = { bg: entry.bg || '#EDE9FE', text: entry.textColor || '#6D28D9', dot: entry.color || '#7C3AED' };
                      const isAction = entry.text.includes('Action Item:') || entry.text.includes('ACTION:');
                      const isRisk = entry.text.includes('Risk:') || entry.text.includes('Decision:');
                      
                      return (
                        <div key={entry.id} className={`mcp-entry-row ${isAction ? 'action' : ''} ${isRisk ? 'risk' : ''} ${entry.isWhisper ? 'whisper-precision' : ''} ${entry.isInterim ? 'mcp-entry-interim' : ''}`}>
                          <div className="mcp-entry-meta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                className="mcp-speaker-pill"
                                onClick={() => !entry.isInterim && handleRenameSpeaker(entry.speaker)}
                                title="Click to rename speaker"
                              >
                                {entry.speaker}
                                {entry.isWhisper && <span className="whisper-badge">Precision</span>}
                              </span>
                              {entry.time && <span className="mcp-entry-time">{entry.time}</span>}
                            </div>
                            {isAction && <span className="mcp-insight-chip action"><Zap size={10} /> ACTION</span>}
                            {isRisk && <span className="mcp-insight-chip risk"><AlertTriangle size={10} /> RISK</span>}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
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
                        </div>
                      );
                    })}

                    {/* ── Action/Decision Events (not metadata) ── */}
                    {entries.filter(e => e.type === 'event' && !['Meeting Title', 'Date', 'Start Time', 'End Time', 'Platform', 'Participants', 'Word Count', 'Duration', 'Metadata'].includes(e.label)).map((entry) => {
                      const es = EVENT_STYLES[entry.label] || { bg: '#f3f4f6', text: '#6b7280' };
                      return (
                        <div key={entry.id} className="mcp-entry-row event-row">
                          <div className="mcp-entry-meta">
                            <span className="mcp-event-label" style={{ background: es.bg, color: es.text }}>
                              {entry.label}
                            </span>
                            <span className="mcp-entry-time">{entry.time}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
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
                        </div>
                      );
                    })}

                    <button className="mcp-btn-ghost" style={{ marginLeft: 16, marginTop: 8, color: 'var(--mom-primary)', borderColor: 'rgba(13, 148, 136, 0.2)' }} onClick={addNewLine}>
                      <Plus style={{ width: 13, height: 13 }} /> Add line
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar (30% in Step 2) ── */}
        {hasEntries && (
          <div className="mcp-sidebar-pane">
            <div className="mcp-sidebar-header">
              <Target style={{ width: 12, height: 12, display: 'inline', marginRight: 8 }} />
              PARTICIPANTS
            </div>
            <div className="mcp-sidebar-list">
              {speakers
                .filter(s => speakers.length === 1 ? true : s.name !== 'Transcript')
                .map(spk => (
                  <div key={spk.name} className="mcp-participant-card">
                    <div
                      className="mcp-speaker-avatar"
                      style={{ background: spk.bg, color: spk.textColor, width: 36, height: 36, fontSize: 11 }}
                    >
                      {getInitials(spk.name)}
                    </div>
                    <div className="mcp-participant-info">
                      <div className="mcp-participant-name">{spk.name}</div>
                      <div className="mcp-participant-role">{speakerRoles[spk.name] || 'Participant'}</div>
                    </div>
                    <div className="mcp-participant-stats">
                      <div className="mcp-participant-badge">{spk.count} {spk.count === 1 ? 'turn' : 'turns'}</div>
                      <div className="mcp-confidence-indicator">
                        <div className="mcp-confidence-dot" style={{ background: 'var(--mom-resolved)' }} />
                        {speakerRoles[spk.name] ? 'Confirmed' : 'Auto'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
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
