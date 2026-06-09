import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  Mic, Upload, X, Play, Pause, Square, FileText, FileUp, CornerDownLeft, Plus,
  CheckCircle, Edit2, Sparkles, Download, Clipboard, Target, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import API from '../../utils/api';
import { setMeetingContext, saveMOM } from '../../store/slices/momSlice';
import FillerDetector from '../../utils/fillerDetector';


// ── Speaker colour palette ──────────────────────────────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#1e293b' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion: { dot: '#D97706', label: 'text-amber-600' },
  Decisions: { dot: '#1e293b', label: 'text-blue-600' },
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
const SpeechToText = ({ onProcessSpeech, meetings, switchToTable, lockedProjectId }) => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const [meetingTitle, setMeetingTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSaved, setLastSaved] = useState(null);

  // ── Transcript state ───────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [hasUploadedTranscript, setHasUploadedTranscript] = useState(false);
  const [uploadPreviewLines, setUploadPreviewLines] = useState([]); // first 5 lines
  const [speakersConfirmed, setSpeakersConfirmed] = useState(false);
  const [isAddingPoints, setIsAddingPoints] = useState(false);
  const transcriptRef = useRef(null);

  const meetingId = useMemo(() => {
    return searchParams.get('id') || searchParams.get('meetingId') || 'unscheduled-session';
  }, [searchParams]);

  const fetchTranscript = React.useCallback(async (id) => {
    try {
      setSaveStatus('loading');
      const resp = await API.get(`/transcript/${id}`);
      if (resp.data && resp.data.transcript_data) {
        setEntries(resp.data.transcript_data);
        if (resp.data.transcript_data.length > 0) {
          setHasUploadedTranscript(true);
          setSpeakersConfirmed(true);
        }
        setSaveStatus('saved');
        setLastSaved(new Date(resp.data.updated_at));
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch transcript', err);
        setSaveStatus('error');
      } else {
        setSaveStatus('idle');
      }
    }
  }, []);

  const saveTranscript = React.useCallback(async (dataToSave = entries) => {
    if (!meetingId || (dataToSave.length === 0 && saveStatus === 'idle')) return;
    
    try {
      setSaveStatus('saving');
      const resp = await API.post('/transcript/save', {
        meeting_id: meetingId,
        transcript_data: dataToSave
      });
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save transcript', err);
      setSaveStatus('error');
    }
  }, [meetingId, entries, saveStatus]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const resp = await API.get('/projects');
        const data = resp.data.success ? resp.data.projects : (Array.isArray(resp.data) ? resp.data : []);
        setProjects(data);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    };
    fetchProjects();

    const pid = lockedProjectId || searchParams.get('projectId');
    
    // Always fetch transcript for the current meetingId (includes unscheduled-session fallback)
    if (meetingId) {
      if (!meetingTitle && meetingId !== 'unscheduled-session') {
        setMeetingTitle(`Meeting #${meetingId}`);
      }
      fetchTranscript(meetingId);
    }
    
    if (pid) {
      setProjectId(pid);
    }
  }, [searchParams, lockedProjectId, fetchTranscript, meetingId, meetingTitle]);

  // Auto-save logic
  useEffect(() => {
    if (entries.length === 0) return;
    const timer = setTimeout(() => {
      saveTranscript();
    }, 4000); // Debounce save for 4 seconds
    return () => clearTimeout(timer);
  }, [entries, saveTranscript]);

  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [mode, setMode] = useState('live'); // 'live' | 'upload'

  // ── Recording state ─────────────────────────────────────────────
  const [recordingState, setRecordingState] = useState('IDLE');
  const [micError, setMicError] = useState('');
  const [timerVal, setTimerVal] = useState(0);
  const timerRef = useRef(null);



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

  // ── Speech recognition refs ─────────────────────────────────────
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const abortCountRef = useRef(0);    // track repeated aborts
  const mediaRecorderRef = useRef(null); // fallback recorder
  const [useMediaFallback, setUseMediaFallback] = useState(false);

  // ── Debounce buffer ─────────────────────────────────────────────
  const bufferRef = useRef('');
  const debounceTimerRef = useRef(null);
  const streamRef = useRef(null);
  const recordingStateRef = useRef('IDLE');
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
  const [waveHeights, setWaveHeights] = useState(Array(32).fill(4));
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioStreamRef = useRef(null);
  const targetWaveHeightsRef = useRef(Array(32).fill(4));

  const stopAudioAnalysis = () => {
    recordingStateRef.current = 'IDLE';
    if (typeof animationFrameRef.current === 'number') {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setWaveHeights(Array(32).fill(4));
  };

  // Started 300ms AFTER SpeechRecognition to avoid Windows/Chrome hardware lock
  const setupAudio = () => {
    setTimeout(async () => {
      if (recordingStateRef.current !== 'RECORDING') return;
      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        if (recordingStateRef.current !== 'RECORDING') {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        audioStreamRef.current = stream;

        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufLen = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufLen);

        const draw = () => {
          if (recordingStateRef.current !== 'RECORDING' || !analyserRef.current) return;
          analyser.getByteFrequencyData(dataArrayRef.current);

          const bars = 32;
          const step = Math.floor(bufLen / bars);
          const newH = [];
          for (let i = 0; i < bars; i++) {
            let s = 0;
            for (let j = 0; j < step; j++) s += dataArrayRef.current[i * step + j];
            const avg = s / step;
            newH.push(Math.min(56, Math.max(4, (avg / 200) * 56)));
          }
          targetWaveHeightsRef.current = newH;
          setWaveHeights(prev => prev.map((c, i) => c + (targetWaveHeightsRef.current[i] - c) * 0.4));
          animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch (err) {
        // Fallback: pulse random bars so UI still feels alive
        console.warn('Waveform fallback:', err);
        const id = setInterval(() => {
          if (recordingStateRef.current !== 'RECORDING') { clearInterval(id); return; }
          setWaveHeights(Array.from({ length: 32 }, () => 4 + Math.random() * 28));
        }, 80);
      }
    }, 300); // 300ms delay lets SpeechRecognition claim the mic first
  };

  useEffect(() => {
    return () => stopAudioAnalysis();
  }, []);

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

  // ── MediaRecorder fallback (when Chrome STT cloud is unreachable) ─
  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Determine supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (manualStopRef.current || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        chunks.length = 0;

        // Send to backend for Whisper transcription
        try {
          const formData = new FormData();
          const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
          formData.append('file', blob, `chunk.${ext}`);
          formData.append('speaker', currentUser.name);
          const resp = await API.post('/transcribe', formData, { 
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000
          });
          const text = resp.data?.text?.trim();
          if (text) {
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
          }
        } catch (err) {
          console.warn('Transcription chunk failed:', err);
        }

        // Restart for next chunk if still recording
        if (!manualStopRef.current && recordingStateRef.current === 'RECORDING') {
          recorder.start();
          setTimeout(() => {
            if (!manualStopRef.current && recorder.state === 'recording') recorder.stop();
          }, 5000); // 5s chunks
        }
      };

      // Start + schedule first stop after 5s
      recorder.start();
      setInterimText('Listening… (processing every 5 seconds)');
      setTimeout(() => {
        if (!manualStopRef.current && recorder.state === 'recording') recorder.stop();
      }, 5000);

      // Also start waveform visualizer from this stream
      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;
        audioContextRef.current.createMediaStreamSource(stream).connect(analyser);
        const bufLen = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufLen);
        const draw = () => {
          if (recordingStateRef.current !== 'RECORDING' || !analyserRef.current) return;
          analyser.getByteFrequencyData(dataArrayRef.current);
          const bars = 32; const step = Math.floor(bufLen / bars); const newH = [];
          for (let i = 0; i < bars; i++) {
            let s = 0;
            for (let j = 0; j < step; j++) s += dataArrayRef.current[i * step + j];
            newH.push(Math.min(56, Math.max(4, (s / step / 200) * 56)));
          }
          setWaveHeights(prev => prev.map((c, i) => c + (newH[i] - c) * 0.4));
          animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      } catch (_) {}

    } catch (err) {
      console.error('MediaRecorder fallback failed:', err);
      setMicError('Microphone access denied. Please allow mic and retry.');
    }
  };

  const stopMediaRecorderFallback = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    mediaRecorderRef.current = null;
  };

  // ── Init recognition ────────────────────────────────────────────
  const initRecognition = () => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      console.log('[SpeechRecognition] Started — mic is now active');
      setMicError('');
      setInterimText('Listening…');
    };

    rec.onaudiostart = () => {
      console.log('[SpeechRecognition] Audio capture started');
      setInterimText('Listening…');
    };

    rec.onspeechstart = () => {
      console.log('[SpeechRecognition] Speech detected');
    };

    rec.onresult = (event) => {
      console.log('[SpeechRecognition] onresult fired, results:', event.results.length);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log('[SpeechRecognition] result[' + i + ']:', transcript, 'final:', event.results[i].isFinal);
        if (event.results[i].isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) {
            // Flush immediately — don't wait for debounce
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
              text: trimmed,
              isAdditional: isAddingPointsRef.current,
            };
            setEntries(prev => [...prev, entry]);
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
        case 'aborted':
          abortCountRef.current += 1;
          if (abortCountRef.current >= 3) {
            // Chrome cloud STT is unreachable — switch to MediaRecorder fallback
            console.warn('[SpeechRecognition] Aborted 3 times — switching to MediaRecorder fallback');
            manualStopRef.current = true;
            if (recognitionRef.current) {
              recognitionRef.current.onend = null;
              try { recognitionRef.current.stop(); } catch (_) {}
              recognitionRef.current = null;
            }
            setUseMediaFallback(true);
            setMicError('');
            startMediaRecorderFallback();
          }
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
    stopMediaRecorderFallback();
    flushBuffer();
    setInterimText('');
  };

  // ── Actions ─────────────────────────────────────────────────────
  const toggleRecord = async () => {
    if (!SpeechRecognition) {
      // No SpeechRecognition at all — go straight to MediaRecorder
      if (recordingState === 'IDLE') {
        manualStopRef.current = false;
        abortCountRef.current = 0;
        setMicError('');
        setUseMediaFallback(true);
        recordingStateRef.current = 'RECORDING';
        setRecordingState('RECORDING');
        await startMediaRecorderFallback();
      } else {
        stopAndFlush();
        stopAudioAnalysis();
        setTimerVal(0);
        setUseMediaFallback(false);
        setRecordingState('IDLE');
        toast.success('Recording stopped — ready to generate.');
      }
      return;
    }

    if (recordingState === 'IDLE') {
      manualStopRef.current = false;
      abortCountRef.current = 0;
      setMicError('');
      setUseMediaFallback(false);
      recordingStateRef.current = 'RECORDING';

      try {
        const rec = initRecognition();
        if (!rec) throw new Error("Recognition failed to initialize");
        recognitionRef.current = rec;
        rec.start();
        setRecordingState('RECORDING');
        setupAudio(); // Starts AFTER recognition — no hardware lock
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setMicError('Could not start microphone. Check browser permissions.');
        recordingStateRef.current = 'IDLE';
      }
    } else {
      stopAndFlush();
      stopAudioAnalysis();
      setTimerVal(0);
      setUseMediaFallback(false);
      setRecordingState('IDLE');
      toast.success('Recording stopped — ready to generate.');
    }
  };

  const togglePause = async () => {
    if (recordingState === 'RECORDING') {
      stopAndFlush();
      stopAudioAnalysis();
      setRecordingState('PAUSED');
    } else if (recordingState === 'PAUSED') {
      manualStopRef.current = false;
      setMicError('');
      recordingStateRef.current = 'RECORDING';
      try {
        const rec = initRecognition();
        recognitionRef.current = rec;
        try { rec.start(); } catch (_) { }
        setRecordingState('RECORDING');
        setupAudio();
      } catch (err) {
        setMicError('Could not restart microphone.');
        recordingStateRef.current = 'IDLE';
      }
    }
  };

  const handleClear = () => {
    stopAndFlush();
    stopAudioAnalysis();
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
        const additionalText = speechEntries.filter(e => e.isAdditional).map(e => e.text).join(' ');

        const generatedRows = [];
        let rowCount = 1;

        speechEntries.forEach(entry => {
          // Split entry text by punctuation followed by space
          const rawSentences = entry.text.split(/(?<=[.?!])\s+/);

          rawSentences.forEach(rawSentence => {
            const cleanText = rawSentence.trim();

            // Ignore very short bursts
            if (cleanText.length < 3) return;

            // ── Filler detection — delegated to shared FillerDetector module ──
            if (FillerDetector.classify(cleanText).isFiller) return;


            let sentenceSpeaker = entry.speaker;
            let actualPoint = cleanText;

            // Extract speaker before ":" if text is formatted like "Rahul: API latency reduced."
            const speakerMatch = cleanText.match(/^([A-Za-z\s]{2,20}):\s*(.*)$/);
            if (speakerMatch) {
              sentenceSpeaker = speakerMatch[1].trim();
              actualPoint = speakerMatch[2].trim();
            }

            if (!actualPoint) return;

            // Detect semantic targets (tomorrow, next week, etc) or keep null
            let targetDate = ''; // Fallback for UI if null
            const pointLower = actualPoint.toLowerCase();
            if (pointLower.includes('tomorrow')) {
              const t = new Date(); t.setDate(t.getDate() + 1); targetDate = t.toLocaleDateString('en-GB');
            } else if (pointLower.includes('today')) {
              targetDate = new Date().toLocaleDateString('en-GB');
            } else if (pointLower.includes('next week')) {
              const t = new Date(); t.setDate(t.getDate() + 7); targetDate = t.toLocaleDateString('en-GB');
            }

            // Determine Function (module mapping)
            let funcStr = 'General';
            if (/api|backend|database|db|sql|server|latency/i.test(pointLower)) funcStr = 'Backend';
            else if (/ui|frontend|react|dashboard|button|page/i.test(pointLower)) funcStr = 'Frontend';
            else if (/design|ux|figma|color/i.test(pointLower)) funcStr = 'Design';
            else if (/test|qa|bug|issue/i.test(pointLower)) funcStr = 'QA';

            // Ensure status is correctly defaulted
            let statusStr = 'Pending';
            if (/(completed|done|finished|resolved)/i.test(pointLower)) {
              statusStr = 'Done';
            }

            generatedRows.push({
              id: Date.now() + Math.random(),
              s_no: String(rowCount++),
              function: funcStr,
              project_name: meetingTitle || 'Untitled meeting',
              criticality: 'High',
              discussion_point: actualPoint,
              responsibility: sentenceSpeaker || attendees.join(', ') || currentUser.name,
              target: targetDate || '',  // Null/Empty string if none detected
              project_id: projectId ? Number(projectId) : undefined,
              status: statusStr,
              action_taken: additionalText ? `Additional: ${additionalText}` : 'None',
              _rawEntries: currentEntries,
            });
          });
        });

        // Fallback if somehow everything was filtered out
        if (generatedRows.length === 0) {
          generatedRows.push({
            id: Date.now(),
            s_no: '1',
            function: 'General',
            project_name: meetingTitle || 'Untitled meeting',
            criticality: 'High',
            discussion_point: 'No context recorded.',
            responsibility: attendees.join(', ') || currentUser.name,
            target: new Date().toLocaleDateString(),
            project_id: projectId ? Number(projectId) : undefined,
            status: 'Pending',
            action_taken: additionalText ? `Additional: ${additionalText}` : 'None',
            _rawEntries: currentEntries,
          });
        }

        // Final Data Sync to Redux & Backend
        const proj = projects.find(p => String(p.id || p.project_id) === String(projectId));
        const projName = proj ? (proj.name || proj.project_name) : (meetingTitle || 'Untitled meeting');

        dispatch(setMeetingContext({
          meetingId,
          meetingName: meetingTitle || 'Untitled meeting',
          projectId: projectId || null,
          projectName: projName
        }));

        dispatch(saveMOM({
          meetingId,
          meetingName: meetingTitle || 'Untitled meeting',
          projectId: projectId || null,
          projectName: projName,
          momData: generatedRows
        }));

        onProcessSpeech(generatedRows);
        switchToTable();
        return currentEntries;
      });
    }, 50);
  };

  // ── File upload ──────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    // ── Validation ──
    if (!meetingTitle.trim()) {
      toast.error('Please enter a Meeting Name first');
      e.target.value = '';
      return;
    }
    if (!lockedProjectId && !projectId) {
      toast.error('Please select a Project first');
      e.target.value = '';
      return;
    }

    if (entries.length > 0) {
      const confirmed = window.confirm("Warning: Uploading a new file will replace the current transcript data. This action cannot be undone. Do you want to proceed?");
      if (!confirmed) {
        e.target.value = ''; 
        return;
      }
    }
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


      {/* ── SAVE STATUS INDICATOR ── */}
      <div className="fixed bottom-6 left-6 z-40">
        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase shadow-lg border flex items-center gap-2 transition-all duration-300 ${
          saveStatus === 'saving' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
          saveStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
          'bg-gray-50 text-gray-400 border-gray-200'
        }`}>
          {saveStatus === 'saving' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          {saveStatus === 'saved' && <CheckCircle className="w-3.5 h-3.5" />}
          {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          
          <span>
            {saveStatus === 'saving' ? 'Syncing Transcript...' : 
             saveStatus === 'saved' ? `Transcript Cached` :
             saveStatus === 'error' ? 'Sync Error' : 'Offline'}
          </span>
        </div>
      </div>

      {/* ── BACK LINK ── */}
      <div className="mb-2">
        <button onClick={() => navigate('/dashboard/calendar')} className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
          <CornerDownLeft className="w-3.5 h-3.5" /> Back to Calendar
        </button>
      </div>

      {/* ── TRANSCRIPTION MODE BANNER ── */}
      {useMediaFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
          <div className="text-xs text-amber-800">
            <p className="font-semibold mb-0.5">Using audio fallback mode (5-second chunks)</p>
            <p className="text-amber-700">Chrome's built-in speech recognition could not connect to Google's servers. 
            Audio is being captured and sent to your backend every 5 seconds for transcription.
            {' '}<strong>Add <code>OPENAI_API_KEY=sk-...</code> to your backend <code>.env</code></strong> file to enable Whisper transcription.</p>
          </div>
        </div>
      )}

      {/* ── METADATA BAR ── */}
      <div className="bg-white rounded-xl border border-black/10 overflow-hidden flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <div className="relative w-full sm:w-1/4">
          <input
            type="text"
            placeholder="Meeting Name *"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className={`w-full px-4 py-3 text-xs focus:outline-none placeholder-gray-400 font-medium ${
              mode === 'upload' && !meetingTitle.trim() ? 'bg-red-50/30' : ''
            }`}
          />
        </div>
        {!lockedProjectId && (
          <div className="w-full sm:w-1/4 px-2 py-2 text-xs flex items-center">
            <Target className="w-3.5 h-3.5 text-gray-400 mr-2 ml-2" />
            <select
              className={`w-full bg-transparent focus:outline-none appearance-none cursor-pointer text-gray-700 font-medium ${
                mode === 'upload' && !projectId ? 'bg-red-50/50' : ''
              }`}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select Project *</option>
              {projects.map(p => (
                <option key={p.id || p.project_id} value={p.id || p.project_id}>
                  {p.name || p.project_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="w-full sm:w-[15%] px-4 py-3 text-xs text-gray-500 whitespace-nowrap bg-gray-50/50">
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
                        className={`rounded-full flex-shrink-0 transition-all ease-out ${recordingState === 'RECORDING'
                          ? 'bg-gradient-to-t from-red-600 to-rose-400'
                          : recordingState === 'PAUSED'
                            ? 'bg-amber-400'
                            : 'bg-gray-200'
                          }`}
                        style={{
                          width: '4px',
                          height: recordingState === 'IDLE' ? '6px' : `${h}px`,
                          opacity: recordingState === 'IDLE' ? 0.3 : 1,
                          transitionDuration: recordingState === 'RECORDING' ? '50ms' : '200ms',
                        }}
                      />
                    ))}
                  </button>

                  {recordingState === 'IDLE' && (
                    <p className="text-xs text-gray-400 mt-3 font-medium">Click waveform or press <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 border border-gray-200 rounded">Space</kbd> to start</p>
                  )}

                  {/* Live interim text below waveform */}
                  {recordingState === 'RECORDING' && (
                    <div className="mt-3 min-h-[36px] w-full max-w-[280px] text-center">
                      {interimText ? (
                        <p className="text-[13px] text-slate-600 italic leading-snug animate-pulse">{interimText}</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                          Listening for speech…
                        </p>
                      )}
                    </div>
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

        {/* ── RIGHT COLUMN — Live transcript feed ── */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-3">

          {/* Live stats strip */}
          <div className="bg-white border border-black/10 rounded-xl px-4 py-3 flex items-center gap-4">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Duration</div>
              <div className="text-sm font-semibold text-slate-800 font-mono">{formatTime(timerVal)}</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Lines</div>
              <div className="text-sm font-semibold text-slate-800">{entries.filter(e => e.type === 'speech').length}</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Speakers</div>
              <div className="text-sm font-semibold text-slate-800">{uniqueSpeakers.length}</div>
            </div>
            {recordingState === 'RECORDING' && (
              <div className="ml-auto flex items-center gap-1.5 text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-rec-pulse" />
                <span className="text-[10px] font-bold tracking-wider">LIVE</span>
              </div>
            )}
          </div>

          {/* Live transcript panel */}
          <div
            ref={transcriptRef}
            className="bg-white border border-black/10 rounded-xl overflow-y-auto"
            style={{ minHeight: 320, maxHeight: 480 }}
          >
            {/* Panel header */}
            <div className="sticky top-0 bg-white border-b border-black/[0.06] px-4 py-2.5 flex items-center justify-between z-10">
              <span className="text-xs font-semibold text-slate-700">Live Transcript</span>
              {uniqueSpeakers.length > 0 && (
                <div className="flex items-center gap-2">
                  {uniqueSpeakers.slice(0, 3).map(name => {
                    const c = getSpeakerColor(name);
                    return (
                      <span
                        key={name}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: c.bg, color: c.text }}
                        title={name}
                      >
                        {getInitials(name)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Entries */}
            {entries.length === 0 && !interimText ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Mic className="w-8 h-8 opacity-20" />
                <p className="text-xs font-medium text-center px-4">
                  {recordingState === 'IDLE'
                    ? 'Start recording to see transcript appear here'
                    : 'Listening… start speaking'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {entries.map((entry) => {
                  if (entry.type === 'divider') {
                    return (
                      <div key={entry.id} className="flex items-center gap-2 px-4 py-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[9px] font-medium text-gray-400 whitespace-nowrap">{entry.text}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    );
                  }

                  if (entry.type === 'speech') {
                    const c = getSpeakerColor(entry.speaker);
                    return (
                      <div key={entry.id} className="flex items-start gap-3 px-4 py-3 animate-slideUp">
                        {/* Avatar */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: c.bg, color: c.text }}
                        >
                          {entry.initials || getInitials(entry.speaker)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-semibold" style={{ color: c.text }}>
                              {entry.speaker}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono">{entry.time}</span>
                          </div>
                          <p className="text-[13px] text-slate-700 leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Interim — greyed out, typing effect */}
                {interimText && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-indigo-50/40">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: currentUser.avatarColor.bg, color: currentUser.avatarColor.text }}
                    >
                      {currentUser.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold" style={{ color: currentUser.avatarColor.text }}>
                          {currentUser.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">{nowTime()}</span>
                        <span className="inline-flex gap-0.5 items-end h-3">
                          {[0,1,2].map(i => (
                            <span
                              key={i}
                              className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                              style={{ animationDelay: `${i * 150}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-400 italic leading-relaxed">{interimText}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keyboard shortcuts */}
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-[10px] uppercase font-medium tracking-wider text-gray-400 mb-2">Shortcuts</div>
            <div className="space-y-1.5 text-xs text-slate-600">
              {[['Start / Stop','Space'],['Pause','P'],['Generate','⌃↵'],['Clear','⌃⌫']].map(([label, key]) => (
                <div key={label} className="flex justify-between items-center">
                  <span>{label}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 border border-gray-200 rounded text-gray-500">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── GENERATE MEETING NOTES ── */}
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
