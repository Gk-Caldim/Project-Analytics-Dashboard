import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Mic, Upload, X, Play, Pause, Square, FileText, FileUp, CornerDownLeft, Plus,
  CheckCircle, Edit2, Sparkles, Download, Clipboard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ── Speaker colour palette ──────────────────────────────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion: { dot: '#D97706', label: 'text-amber-600' },
  Decisions: { dot: '#2563EB', label: 'text-blue-600' },
  'Action Items': { dot: '#059669', label: 'text-green-600' },
};

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Check browser support ───────────────────────────────────────────
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// ── CSRF token helper ───────────────────────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? match[2] : '';
}

// ── Structured transcript file parser ──────────────────────────────
function parseTranscriptFile(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    // Format 1: [10:30 AM] Speaker Name: The text
    const full = line.match(/^\[?(\d{1,2}:\d{2}\s?(?:[AP]M)?)\]?\s*(.*?):\s+(.+)/i);
    if (full) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: full[1].trim(), speaker: full[2].trim(), text: full[3].trim() };
      continue;
    }

    // Format 2: Speaker Name (10:30 AM): The text
    const timeInParen = line.match(/^([^()]+?)\s*\(([\d:]+\s?(?:[AP]M)?)\):\s+(.+)/i);
    if (timeInParen) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: timeInParen[2].trim(), speaker: timeInParen[1].trim(), text: timeInParen[3].trim() };
      continue;
    }

    // Format 3: Speaker Name: The text
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
    if (lower.startsWith('discussion')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'discussion', text: line.replace(/^discussion:?\s*/i, '').trim() };
      continue;
    }
    if (lower.includes('adjourned')) {
      if (currentEntry) entries.push(currentEntry);
      entries.push({ type: 'adjourned', text: 'Meeting adjourned' });
      currentEntry = null;
      continue;
    }

    if (currentEntry) {
      currentEntry.text += ' ' + line.replace(/^[-•]\s*/, '');
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

// ════════════════════════════════════════════════════════════════════
const SpeechToText = ({ onProcessSpeech, switchToTable }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    const name = user?.full_name || user?.name || user?.username || user?.email || '';
    const storedUser = (() => { try { return JSON.parse(sessionStorage.getItem('user') || 'null'); } catch { return null; } })();
    const resolvedName = name || storedUser?.full_name || storedUser?.name || storedUser?.username || 'Unknown';
    return {
      name: resolvedName,
      initials: getInitials(resolvedName),
      avatarColor: SPEAKER_COLORS[0],
    };
  }, [user]);

  // ── Config state ────────────────────────────────────────────────
  const [meetingTitle, setMeetingTitle] = useState('');

  useEffect(() => {
    const id = searchParams.get('meetingId');
    if (id) {
      setMeetingTitle(`Meeting #${id}`);
    }
  }, [searchParams]);

  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [mode, setMode] = useState('live'); // 'live' | 'upload'

  // ── Recording state ─────────────────────────────────────────────
  const [recordingState, setRecordingState] = useState('IDLE');
  const [micError, setMicError] = useState('');
  const [timerVal, setTimerVal] = useState(0);
  const timerRef = useRef(null);

  // ── Toast state ─────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // ── Transcript state ───────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [hasUploadedTranscript, setHasUploadedTranscript] = useState(false);
  const [uploadPreviewLines, setUploadPreviewLines] = useState([]); // first 5 lines
  const [speakersConfirmed, setSpeakersConfirmed] = useState(false);
  const [isAddingPoints, setIsAddingPoints] = useState(false);
  const transcriptRef = useRef(null);

  // ── Speaker rename state ─────────────────────────────────────────
  const [renamingSpeaker, setRenamingSpeaker] = useState(null); // name being renamed
  const [renameValue, setRenameValue] = useState('');

  // ── Speaker colour map ──────────────────────────────────────────
  const speakerColorMapRef = useRef({});
  const getSpeakerColor = (name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      const idx = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
      speakerColorMapRef.current[name] = idx;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  };

  // ── Speech recognition ref ──────────────────────────────────────
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const retryTimeoutRef = useRef(null);

  // ── Debounce buffer ─────────────────────────────────────────────
  const bufferRef = useRef('');
  const debounceTimerRef = useRef(null);
  const isAddingPointsRef = useRef(false);
  useEffect(() => { isAddingPointsRef.current = isAddingPoints; }, [isAddingPoints]);

  const forceFlushRef = useRef(false);

  const flushBuffer = () => {
    clearTimeout(debounceTimerRef.current);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    if (!text) return;

    forceFlushRef.current = false;

    const color = getSpeakerColor(currentUser.name);
    const entry = {
      id: Date.now() + Math.random(),
      type: 'speech',
      speaker: currentUser.name,
      initials: currentUser.initials,
      color: color.dot,
      bg: color.bg,
      textColor: color.text,
      time: nowTime(),
      text,
      isAdditional: isAddingPointsRef.current,
    };
    setEntries(prev => [...prev, entry]);
    setInterimText('');
  };

  const scheduleDebouncedFlush = (text) => {
    clearTimeout(debounceTimerRef.current);
    // If text ends with punctuation, flush faster to show the sentence concluded
    if (/[.?!]\s*$/.test(text)) {
      debounceTimerRef.current = setTimeout(() => flushBuffer(), 400);
    } else {
      debounceTimerRef.current = setTimeout(() => flushBuffer(), 1200);
    }
  };

  // ── Waveform (Web Audio API) ────────────────────────────────────
  const [waveHeights, setWaveHeights] = useState(Array(30).fill(4));
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const targetWaveHeightsRef = useRef(Array(30).fill(4));

  useEffect(() => {
    let stream = null;
    let isActive = true;
    const isRecording = recordingState === 'RECORDING';

    const setupAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
          console.warn('Microphone visualization error:', err);
          setMicError('Microphone access needed for visualizer.');
          return null;
        });
        if (!isActive || !stream) return;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        source.connect(analyserRef.current);

        const updateWaveform = () => {
          if (!analyserRef.current || !dataArrayRef.current || !isActive) return;
          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

          const newTargets = [];
          for (let i = 0; i < 30; i++) {
            const dataIndex = Math.floor(i * (dataArrayRef.current.length / 30));
            const amplitude = Math.abs(dataArrayRef.current[dataIndex] - 128);
            newTargets.push(Math.max(4, amplitude * 1.5));
          }
          targetWaveHeightsRef.current = newTargets;

          setWaveHeights(prev => prev.map((current, i) => {
            const target = targetWaveHeightsRef.current[i];
            return current + (target - current) * 0.3; // lerp
          }));

          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        updateWaveform();
      } catch (err) {
        console.warn('Audio visualization fallback:', err);
        const interval = setInterval(() => {
          if (isActive) setWaveHeights(Array.from({ length: 30 }, () => Math.round(4 + Math.random() * 32)));
        }, 80);
        animationFrameRef.current = interval;
      }
    };

    if (isRecording) {
      setupAudio();
    } else {
      setWaveHeights(Array(30).fill(4));
    }

    return () => {
      isActive = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) {
        if (typeof animationFrameRef.current === 'number') {
          clearInterval(animationFrameRef.current);
        } else {
          cancelAnimationFrame(animationFrameRef.current);
        }
      }
    };
  }, [recordingState]);

  // ── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (recordingState === 'RECORDING') {
      timerRef.current = setInterval(() => setTimerVal(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recordingState]);

  // ── Auto-scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [entries, interimText]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecord();
      }
      if (e.code === 'KeyP' && recordingState !== 'IDLE') {
        e.preventDefault();
        togglePause();
      }
      if (e.ctrlKey && e.code === 'Enter') {
        e.preventDefault();
        handleConvert();
      }
      if (e.ctrlKey && e.code === 'Backspace') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recordingState, entries]);

  // ── Format timer ────────────────────────────────────────────────
  const formatTime = (s) => {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(retryTimeoutRef.current);
      clearTimeout(debounceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try { recognitionRef.current.stop(); } catch (_) { }
      }
    };
  }, []);

  // ── Init recognition ────────────────────────────────────────────
  const initRecognition = () => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) {
            bufferRef.current += (bufferRef.current ? ' ' : '') + trimmed;
            scheduleDebouncedFlush(bufferRef.current);
          }
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error);
      }

      switch (e.error) {
        case 'no-speech':
          break;
        case 'network':
          setMicError('Network error, retrying...');
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            setMicError('');
            if (!manualStopRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (_) { }
            }
          }, 1500);
          break;
        case 'not-allowed':
        case 'service-not-allowed':
          setMicError('Allow mic permission and retry');
          manualStopRef.current = true;
          setRecordingState('IDLE');
          break;
        case 'aborted':
          break;
        default:
          console.error('Unhandled speech error:', e.error);
          break;
      }
    };

    rec.onend = () => {
      if (manualStopRef.current) return;
      setTimeout(() => {
        if (!manualStopRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) { }
        }
      }, 300);
    };

    return rec;
  };

  const stopAndFlush = () => {
    manualStopRef.current = true;
    forceFlushRef.current = true;
    clearTimeout(retryTimeoutRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) { }
      recognitionRef.current = null;
    }
    flushBuffer();
    setInterimText('');
  };

  // ── Actions ─────────────────────────────────────────────────────
  const toggleRecord = () => {
    if (!SpeechRecognition) {
      setMicError('Browser not supported for recording. Try Chrome or Edge.');
      return;
    }

    if (recordingState === 'IDLE') {
      manualStopRef.current = false;
      setMicError('');

      try {
        // Resume/Start AudioContext on user gesture
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const rec = initRecognition();
        if (!rec) throw new Error("Recognition failed to initialize");
        recognitionRef.current = rec;
        rec.start();
        setRecordingState('RECORDING');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setMicError('Could not start microphone. Check browser permissions.');
      }
    } else {
      stopAndFlush();
      setTimerVal(0);
      setRecordingState('IDLE');
      showToast('Recording stopped — ready to generate.');
    }
  };

  const togglePause = () => {
    if (recordingState === 'RECORDING') {
      stopAndFlush();
      setRecordingState('PAUSED');
    } else if (recordingState === 'PAUSED') {
      manualStopRef.current = false;
      setMicError('');
      const rec = initRecognition();
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) { }
      setRecordingState('RECORDING');
    }
  };

  const handleClear = () => {
    stopAndFlush();
    setRecordingState('IDLE');
    setTimerVal(0);
    setEntries([]);
    setInterimText('');
    setMicError('');
    setHasUploadedTranscript(false);
    setIsAddingPoints(false);
    setUploadPreviewLines([]);
    setSpeakersConfirmed(false);
    speakerColorMapRef.current = {};
  };

  const handleConvert = () => {
    if (entries.length === 0 && !bufferRef.current.trim()) return;
    stopAndFlush();
    setRecordingState('IDLE');

    setTimeout(() => {
      setEntries(currentEntries => {
        const speechEntries = currentEntries.filter(e => e.type === 'speech');
        const fullText = speechEntries.map(e => e.text).join(' ');
        const additionalText = speechEntries.filter(e => e.isAdditional).map(e => e.text).join(' ');

        onProcessSpeech([{
          id: Date.now(),
          s_no: '1',
          function: 'General',
          project_name: meetingTitle || 'Untitled meeting',
          criticality: 'High',
          discussion_point: fullText || 'No context recorded.',
          responsibility: attendees.join(', ') || currentUser.name,
          target: new Date().toLocaleDateString(),
          status: 'Pending',
          action_taken: additionalText ? `Additional: ${additionalText}` : 'None',
          // pass through structured entries for rich table
          _rawEntries: currentEntries,
        }]);
        switchToTable();
        return currentEntries;
      });
    }, 50);
  };

  // ── File upload ──────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      let rawText = '';
      if (ext === 'json') {
        try {
          const json = JSON.parse(ev.target.result);
          rawText = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
        } catch (_) {
          rawText = 'Error parsing JSON file';
        }
      } else {
        rawText = ev.target.result;
      }

      const parsed = parseTranscriptFile(rawText);
      const uploadTime = nowTime();

      const uploadedEntries = parsed.map((p, i) => {
        if (p.type === 'adjourned') {
          return { id: Date.now() + i, type: 'adjourned', time: p.time || uploadTime, text: 'Meeting adjourned', isAdditional: false };
        }
        if (p.type === 'decision' || p.type === 'action' || p.type === 'discussion') {
          const labelMap = { decision: 'Decisions', action: 'Action Items', discussion: 'Discussion' };
          const es = EVENT_STYLES[labelMap[p.type]] || { dot: '#6B7280', label: 'text-gray-500' };
          return { id: Date.now() + i, type: 'event', label: labelMap[p.type], time: p.time || uploadTime, text: p.text, dot: es.dot, labelClass: es.label, isAdditional: false };
        }
        const speakerName = p.speaker || 'Transcript';
        const color = getSpeakerColor(speakerName);
        return {
          id: Date.now() + i,
          type: 'speech',
          speaker: speakerName,
          initials: getInitials(speakerName),
          color: color.dot,
          bg: color.bg,
          textColor: color.text,
          time: p.time || uploadTime,
          text: p.text,
          isAdditional: false,
        };
      });

      setEntries(uploadedEntries);
      setHasUploadedTranscript(true);
      setIsAddingPoints(false);
      setSpeakersConfirmed(false);

      // Build preview of first 5 speech lines
      const previewLines = uploadedEntries.filter(e => e.type === 'speech').slice(0, 5);
      setUploadPreviewLines(previewLines);
    };
    reader.readAsText(file);
  };

  // ── Speaker rename ───────────────────────────────────────────────
  const startRename = (speaker) => {
    setRenamingSpeaker(speaker);
    setRenameValue(speaker);
  };

  const commitRename = () => {
    if (!renameValue.trim() || renameValue === renamingSpeaker) {
      setRenamingSpeaker(null);
      return;
    }
    const oldName = renamingSpeaker;
    const newName = renameValue.trim();

    // Remap color index
    if (speakerColorMapRef.current[oldName] !== undefined) {
      speakerColorMapRef.current[newName] = speakerColorMapRef.current[oldName];
      delete speakerColorMapRef.current[oldName];
    }

    setEntries(prev => prev.map(e => {
      if (e.type !== 'speech' || e.speaker !== oldName) return e;
      const color = getSpeakerColor(newName);
      return {
        ...e,
        speaker: newName,
        initials: getInitials(newName),
        color: color.dot,
        bg: color.bg,
        textColor: color.text,
      };
    }));

    setUploadPreviewLines(prev => prev.map(e =>
      e.speaker === oldName ? { ...e, speaker: newName, initials: getInitials(newName) } : e
    ));

    setRenamingSpeaker(null);
  };

  // ── Add points after upload ──────────────────────────────────────
  const handleAddPoints = () => {
    if (!SpeechRecognition) return;

    setEntries(prev => [...prev, {
      id: Date.now(),
      type: 'divider',
      time: nowTime(),
      text: `Additional points — ${currentUser.name} · ${new Date().toLocaleString('en-IN')}`,
      isAdditional: true,
    }]);

    setIsAddingPoints(true);

    const rec = initRecognition();
    recognitionRef.current = rec;
    try { rec.start(); } catch (_) { }
    setRecordingState('RECORDING');
  };

  // ── Unique speakers ──────────────────────────────────────────────
  const uniqueSpeakers = useMemo(() => {
    const set = new Set();
    entries.forEach(e => { if (e.type === 'speech') set.add(e.speaker); });
    return [...set];
  }, [entries]);

  // ── Can generate? ────────────────────────────────────────────────
  const canGenerate = mode === 'live'
    ? (entries.filter(e => e.type === 'speech').length > 0 || !!bufferRef.current.trim())
    : (hasUploadedTranscript && speakersConfirmed);

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* CSS keyframes */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.85); opacity: 0.4; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        .animate-ripple { animation: ripple 1.6s infinite ease-out; }

        @keyframes recPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        .animate-rec-pulse { animation: recPulse 1.4s infinite; }

        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        .animate-pulse-dot { animation: pulse-dot 1.2s infinite; }

        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.25s ease; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-fadeInFast { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* ── TOAST ── */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 animate-slideUp bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* ── BACK LINK ── */}
      <div className="mb-2">
        <button onClick={() => navigate('/dashboard/meetings')} className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
          <CornerDownLeft className="w-3.5 h-3.5" /> Back to Manage Meetings
        </button>
      </div>

      {/* ── METADATA BAR ── */}
      <div className="bg-white rounded-xl border border-black/10 overflow-hidden flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <input
          type="text"
          placeholder="Untitled meeting"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-3 text-xs focus:outline-none placeholder-gray-400"
        />
        <div className="w-full sm:w-1/4 px-4 py-3 text-xs text-gray-500 whitespace-nowrap bg-gray-50/50">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="w-full flex-1 px-4 py-2 flex items-center flex-wrap gap-2">
          {attendees.map((att, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] uppercase tracking-wider font-medium text-gray-700 border border-gray-200">
              {att}
              <button className="ml-1 text-gray-500 hover:text-red-500" onClick={() => setAttendees(attendees.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="+ Add attendee"
            value={attendeeInput}
            onChange={(e) => setAttendeeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && attendeeInput.trim()) {
                setAttendees([...attendees, attendeeInput.trim()]);
                setAttendeeInput('');
              }
            }}
            className="text-xs w-24 py-1 focus:outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* ── MODE SELECTOR ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('live')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${mode === 'live' ? 'bg-[#1e2a3a] text-white border border-[#1e2a3a]' : 'bg-transparent text-gray-600 border border-black/10 hover:bg-gray-50/50'
            }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Record live
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${mode === 'upload' ? 'bg-[#1e2a3a] text-white border border-[#1e2a3a]' : 'bg-transparent text-gray-600 border border-black/10 hover:bg-gray-50/50'
            }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload transcript
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 space-y-4 w-full">

          {/* DYNAMIC CARD */}
          {mode === 'live' ? (
            !SpeechRecognition ? (
              <div className="bg-white border border-black/10 rounded-xl p-8 flex flex-col items-center justify-center min-h-[260px]">
                <Mic className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">Browser not supported</p>
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Record live requires Chrome or Edge. Upload a transcript file instead.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-black/10 rounded-xl flex flex-col relative overflow-hidden">
                {/* ── Recording Pill ── */}
                <div className={`absolute top-3 right-3 z-10 transition-all duration-300 ${recordingState === 'IDLE' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  {recordingState === 'RECORDING' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#fee2e2] border border-[#fca5a5] text-[#dc2626] font-medium text-[12px] rounded-[20px] shadow-sm tracking-wide animate-fadeInFast">
                      <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-rec-pulse flex-shrink-0" />
                      REC &nbsp;{formatTime(timerVal)}
                    </div>
                  )}
                  {recordingState === 'PAUSED' && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-300 text-gray-500 font-medium text-[12px] rounded-[20px] shadow-sm tracking-wide animate-fadeInFast">
                      <Pause className="w-3 h-3 flex-shrink-0" />
                      PAUSED
                    </div>
                  )}
                </div>

                {/* ── Waveform / Mic Visual ── */}
                <div className="flex flex-col items-center py-8 px-6">
                  {/* 24-bar waveform replaces the circle button */}
                  <button
                    onClick={recordingState === 'IDLE' ? toggleRecord : undefined}
                    title={recordingState === 'IDLE' ? 'Click or press Space to start recording' : undefined}
                    className={`flex items-end justify-center gap-[2px] w-full max-w-[220px] h-16 px-4 py-3 rounded-2xl border transition-all duration-200 ${recordingState === 'IDLE'
                      ? 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer'
                      : 'border-transparent cursor-default'
                      }`}
                  >
                    {waveHeights.map((h, i) => (
                      <div
                        key={i}
                        className={`rounded-full flex-shrink-0 transition-all ease-in-out ${recordingState === 'RECORDING'
                          ? 'bg-red-500'
                          : recordingState === 'PAUSED'
                            ? 'bg-amber-400'
                            : 'bg-gray-300'
                          }`}
                        style={{
                          width: '3px',
                          height: recordingState === 'IDLE' ? '8px' : `${h}px`,
                          transitionDuration: recordingState === 'RECORDING' ? '80ms' : '300ms',
                        }}
                      />
                    ))}
                  </button>

                  {recordingState === 'IDLE' && (
                    <p className="text-xs text-gray-400 mt-3 font-medium">Click waveform or press <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 border border-gray-200 rounded">Space</kbd> to start</p>
                  )}

                  {micError && (
                    <p className="text-xs text-red-500 font-medium mt-2">{micError}</p>
                  )}
                </div>

                {/* ── Secondary controls: Pause ── */}
                <div className="border-t border-black/[0.06] flex">
                  <button
                    onClick={togglePause}
                    disabled={recordingState === 'IDLE'}
                    className="flex-1 py-3 text-xs text-center text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {recordingState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {recordingState === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 py-3 text-xs text-center text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors border-l border-black/[0.06]"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>

                {/* ── Primary Stop button ── */}
                {recordingState !== 'IDLE' && (
                  <button
                    onClick={toggleRecord}
                    className="w-full py-4 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 animate-fadeInFast"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Stop recording
                  </button>
                )}

                {recordingState === 'IDLE' && (
                  <button
                    onClick={toggleRecord}
                    className="w-full py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Start recording
                  </button>
                )}
              </div>
            )
          ) : (
            /* ── Upload Mode Card ── */
            <div className="bg-white border border-black/10 rounded-xl overflow-hidden">
              {/* Upload area */}
              {!hasUploadedTranscript ? (
                <div className="p-8 flex flex-col items-center justify-center min-h-[240px]">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">Upload Transcript</h3>
                  <p className="text-xs text-gray-500 mb-5 text-center max-w-xs">
                    Upload your meeting transcript to generate minutes.<br />Supports <strong>.txt</strong>, <strong>.doc</strong>, and <strong>.json</strong> files.
                  </p>
                  <label className="px-5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2">
                    <FileUp className="w-3.5 h-3.5" />
                    Select file
                    <input type="file" className="hidden" accept=".txt,.doc,.json" onChange={handleFileUpload} />
                  </label>
                </div>
              ) : (
                /* ── Post-upload preview ── */
                <div className="animate-fadeInFast">
                  {/* Preview header */}
                  <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Transcript loaded — first 5 lines
                    </span>
                    <label className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1 transition-colors">
                      <FileUp className="w-3 h-3" />
                      Replace file
                      <input type="file" className="hidden" accept=".txt,.doc,.json" onChange={handleFileUpload} />
                    </label>
                  </div>

                  {/* Preview lines */}
                  <div className="divide-y divide-gray-50">
                    {uploadPreviewLines.map((line, i) => {
                      const color = getSpeakerColor(line.speaker);
                      return (
                        <div key={i} className="flex items-start gap-3 px-5 py-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                            style={{ background: color.bg, color: color.text }}
                          >
                            {line.speaker}
                          </span>
                          {line.time && (
                            <span className="text-[10px] text-gray-400 font-mono mt-1 flex-shrink-0">{line.time}</span>
                          )}
                          <span className="text-xs text-gray-700 leading-relaxed line-clamp-2">{line.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* People speaking chips */}
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">People speaking:</span>
                      {uniqueSpeakers.map(speaker => {
                        const color = getSpeakerColor(speaker);
                        return (
                          <div key={speaker} className="flex items-center gap-1">
                            {renamingSpeaker === speaker ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingSpeaker(null); }}
                                  className="text-[11px] px-2 py-1 rounded-full border-2 border-indigo-400 outline-none font-semibold"
                                  style={{ background: color.bg, color: color.text, minWidth: 70 }}
                                />
                                <button onClick={commitRename} className="text-emerald-600 hover:text-emerald-800">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startRename(speaker)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold hover:opacity-80 transition-opacity border border-transparent hover:border-current"
                                style={{ background: color.bg, color: color.text }}
                                title="Click to rename"
                              >
                                {speaker}
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!speakersConfirmed ? (
                      <button
                        onClick={() => setSpeakersConfirmed(true)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Confirm speakers & continue
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Speakers confirmed — ready to generate
                      </div>
                    )}
                  </div>

                  {/* Add points via mic */}
                  {hasUploadedTranscript && SpeechRecognition && !isAddingPoints && (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <button onClick={handleAddPoints} className="text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        Add points via mic
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-full lg:w-72 space-y-4 flex-shrink-0">
          {/* Stats */}
          <div className="bg-white border border-black/10 rounded-xl p-4 grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Duration</div>
              <div className="text-sm font-medium text-slate-800">{formatTime(timerVal)}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-xs text-gray-400 mb-1">Lines captured</div>
              <div className="text-sm font-medium text-slate-800">{entries.filter(e => e.type === 'speech').length}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-xs text-gray-400 mb-1">People speaking</div>
              <div className="text-sm font-medium text-slate-800">{uniqueSpeakers.length}</div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-[10px] uppercase font-medium tracking-wider text-gray-500 mb-3">Shortcuts</div>
            <div className="space-y-2 text-xs font-normal text-slate-600">
              <div className="flex justify-between">
                <span>Start / Stop</span>
                <kbd className="px-1.5 text-[10px] bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span>Pause</span>
                <kbd className="px-1.5 text-[10px] bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">P</kbd>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Generate notes</span>
                <kbd className="px-1.5 text-xs bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">{"\u2303\u21B5"}</kbd>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Clear</span>
                <kbd className="px-1.5 text-xs bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">{"\u2303\u232B"}</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TRANSCRIPT PANEL — "What's being said"
         ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-black/10 rounded-xl flex flex-col mt-4" style={{ minHeight: '340px', maxHeight: '520px' }}>

        {/* Header */}
        <div className="flex justify-between items-center py-2 px-4 border-b border-black/10 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-800">What's being said</span>
          <span className="text-[10px] font-medium text-gray-500">{entries.filter(e => e.type === 'speech').length} lines captured</span>
        </div>

        {/* Speaker legend */}
        {uniqueSpeakers.length > 0 && (
          <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-black/[0.04] bg-gray-50/60 flex-shrink-0">
            {uniqueSpeakers.map((name) => {
              const c = getSpeakerColor(name);
              return (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                  <span className="text-[10px] font-medium" style={{ color: c.text }}>{name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline scroll area */}
        <div ref={transcriptRef} className="flex-1 overflow-y-auto">
          {entries.length === 0 && !interimText ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12 gap-3">
              <Mic className="w-6 h-6 opacity-30" />
              <span className="text-xs text-gray-500 font-medium text-center">
                Start recording to see the transcript appear here.
              </span>
            </div>
          ) : (
            <div>
              {entries.map((entry, i) => {
                const isLast = i === entries.length - 1 && !interimText;

                if (entry.type === 'divider') {
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{entry.text}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  );
                }

                if (entry.type === 'speech') {
                  const c = getSpeakerColor(entry.speaker);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 animate-slideInUp" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      {/* Speaker chip */}
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {entry.initials}
                      </span>
                      {/* Timestamp */}
                      <span className="font-mono text-[10px] text-gray-400 flex-shrink-0 mt-1">{entry.time}</span>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium mb-0.5" style={{ fontSize: 10, color: c.text }}>{entry.speaker}</div>
                        <div className="text-slate-700 leading-relaxed text-[13px]">{entry.text}</div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Interim indicator */}
              {interimText && (
                <div className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{ background: currentUser.avatarColor.bg, color: currentUser.avatarColor.text }}
                  >
                    {currentUser.initials}
                  </span>
                  <span className="font-mono text-[10px] text-gray-300 flex-shrink-0 mt-1">{nowTime()}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mb-0.5" style={{ fontSize: 10, color: currentUser.avatarColor.text }}>{currentUser.name}</div>
                    <div className="text-gray-400 italic leading-relaxed text-[13px]">{interimText}...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── GENERATE MEETING NOTES — below transcript ── */}
      <div className="pt-2">
        <button
          onClick={handleConvert}
          disabled={!canGenerate}
          className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Generate meeting notes
        </button>
        {mode === 'upload' && !speakersConfirmed && hasUploadedTranscript && (
          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">Confirm speakers above to enable</p>
        )}
      </div>
    </div>
  );
};

export default SpeechToText;