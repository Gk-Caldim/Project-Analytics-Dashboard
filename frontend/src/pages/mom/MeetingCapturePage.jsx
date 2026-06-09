/**
 * MeetingCapturePage.jsx
 * Enterprise Meeting Capture — 3 input modes → unified pipeline → structured preview
 * Backend frozen: all existing API contracts preserved.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  Upload, Mic, Edit3, ChevronRight,
  Play, Square, Pause, X, Plus, Edit2, Check,
  FileText, Loader, AlertCircle, CheckCircle, Clock,
  FileUp, Sparkles, Zap, GitBranch, Target, AlertTriangle,
  Info, Trash2
} from 'lucide-react';
import API from '../../utils/api';
import {
  setMeetingContext, saveMOM, addMomRows, fetchMOM, setMomData
} from '../../store/slices/momSlice';
import { Skeleton } from '../../components/ui/skeleton';
import { Progress } from '../../components/ui/progress';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import { setActiveModule } from '../../store/slices/navSlice';
import './tokens.css';
import './MeetingCapturePage.css';
import FillerDetector, { normalise as fdNormalise } from '../../utils/fillerDetector';


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

// isNoiseLine — thin adapter over the shared FillerDetector module
function isNoiseLine(text) {
  return FillerDetector.classify(text).isFiller;
}


const ACTION_VERBS = /\b(will|need|must|assign|action|decide|agree|approve|plan|schedule|review|update|fix|resolve|create|build|share|send|follow|investigate|check|verify|test|deploy|start|finish|complete|work on|look into|align|discuss|roadmap|revamp|feature|prepare|confirm|coordinate|ensure|implement|migrate|refactor|optimize|document|track|monitor|escalate|present|submit|evaluate|define|establish)\b/i;

// Patterns that look like genuine tasks even without an explicit verb
const TASK_PATTERN = /\b(by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|end of|next week|tomorrow)|deadline|due|assigned to|owned by|responsible for|action item|to-do|todo|blocker|dependency)\b/i;

// Hard-exclude patterns — these are filler even if they contain an action verb
const FILLER_PATTERNS = [
  /^(alright|okay|ok|sure|yeah|yep|nope|sounds good|got it|absolutely|perfect|great|cool|nice|makes sense|i see|i think|i believe|actually|honestly|basically|so|right|let me|let's|we need to talk|can you|could you|anyone|everyone|by the way|anyway|moving on|quick|just|simply|maybe|probably|i guess)\b/i,
  /^[A-Z][a-z]+,?\s+(can you|could you|will you|please|just|quickly|should we|should i)/i,
  /thank(s| you)/i,
];

function isActionable(text) {
  // Hard exclude filler patterns first
  for (const re of FILLER_PATTERNS) {
    if (re.test(text.trim())) return false;
  }
  // Must have a verb OR a task pattern
  return ACTION_VERBS.test(text) || TASK_PATTERN.test(text);
}

// Returns true if the text passes actionable but without strong verb confidence (flag as needs review)
function isLowConfidence(text) {
  return !ACTION_VERBS.test(text) && TASK_PATTERN.test(text);
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
      if (text.length < 15) return;

      let speaker = entry.speaker;
      let point = text;
      const speakerMatch = text.match(/^([A-Za-z\s]{2,20}):\s*(.*)$/);
      if (speakerMatch) { speaker = speakerMatch[1].trim(); point = speakerMatch[2].trim(); }
      if (!point || point.length < 15) return;

      point = point.replace(/^(I think|I believe|Maybe|Probably|Honestly|Actually|So)\s+/i, '');
      point = point.charAt(0).toUpperCase() + point.slice(1);

      const tl = point.toLowerCase();
      let targetDate = '';
      if (tl.includes('tomorrow')) { const d = new Date(); d.setDate(d.getDate() + 1); targetDate = d.toISOString().split('T')[0]; }
      else if (tl.includes('today')) targetDate = new Date().toISOString().split('T')[0];

      let funcStr = 'General';
      if (/api|backend|database|db|sql|server|latency|endpoint|python|fastapi/i.test(tl)) funcStr = 'Backend';
      else if (/ui|frontend|react|dashboard|button|page|screen|component|css/i.test(tl)) funcStr = 'Frontend';

      const lowConf = isLowConfidence(point);

      generatedRows.push({
        id: Date.now() + Math.random(),
        s_no: String(rowCount++),
        function: funcStr,
        project_name: projectName || meetingTitle || 'Untitled',
        criticality: tl.includes('urgent') || tl.includes('critical') ? 'High' : 'Medium',
        discussion_point: point,
        responsibility: speaker || currentUserName,
        target: targetDate || null,
        project_id: projectId ? Number(projectId) : undefined,
        status: lowConf ? 'Needs Review' : (/(completed|done|finished|resolved)/i.test(tl) ? 'Done' : 'Pending'),
        action_taken: 'None',
        isHeuristic: true,
        needsReview: lowConf,
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
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const [projectName, setProjectName] = useState('');
  const reduxProjects = useSelector(s => s.project?.projects) || [];
  const [projects, setProjects] = useState([]);
  const isProjectLinked = Boolean(projectId);

  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const titleInputRef = useRef(null);
  const projectSelectRef = useRef(null);

  // Inline validation helper — focuses the first missing required field
  const focusFirstMissingField = () => {
    if (!meetingTitle.trim()) { titleInputRef.current?.focus(); return true; }
    if (!projectId) { projectSelectRef.current?.focus(); return true; }
    return false;
  };

  const meetingId = useMemo(() => searchParams.get('id') || searchParams.get('meetingId') || 'unscheduled', [searchParams]);

  // ── Core model: each uploaded/recorded file is a TranscriptDoc ──────────
  // TranscriptDoc shape: { id, fileName, fileSize, uploadedAt, status, entries[], lineCount, signature }
  // status: 'reviewing' | 'confirmed' | 'duplicate'
  const [transcripts, setTranscripts] = useState([]);
  const hasTranscripts = transcripts.length > 0;
  const [isSetupOpen, setIsSetupOpen] = useState(true);

  const handleModeSelect = (newMode) => {
    if (!meetingTitle.trim() || !projectId) {
      setIsAlertOpen(true);
    } else {
      setMode(newMode);
    }
  };

  const requireFields = (callback) => {
    if (!meetingTitle.trim() || !projectId) {
      setIsAlertOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  useEffect(() => {
    if (hasTranscripts) {
      setIsSetupOpen(false);
    } else {
      setIsSetupOpen(true);
    }
  }, [hasTranscripts]);

  const [activeTranscriptId, setActiveTranscriptId] = useState(null);
  const sigSetRef = useRef(new Set()); // content fingerprints — ref avoids stale closure in FileReader
  const abortControllerRef = useRef(null);

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerating(false);
    toast('Generation cancelled', { icon: '🛑' });
  };

  // Upload UI
  const [mode, setMode] = useState('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState('');
  const fileInputRef = useRef(null);

  const [recordState, setRecordState] = useState('IDLE');
  const [timerVal, setTimerVal] = useState(0);
  const [micError, setMicError] = useState('');
  const canvasRef = useRef(null);
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

  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualForm, setManualForm] = useState({ speaker: '', text: '', type: 'note' });
  const [genError, setGenError] = useState(null);
  const [renamingSpeaker, setRenamingSpeaker] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const genProgressRef = useRef(null);
  // protectedIds: keyed by entry id, scoped to active transcript review
  const [protectedIds, setProtectedIds] = useState(() => new Set());

  const getSpeakerColor = useCallback((name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      speakerColorMapRef.current[name] = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  }, []);

  // Drive a simulated progress counter while generating
  useEffect(() => {
    if (generating) {
      setGenProgress(0);
      let val = 0;
      genProgressRef.current = setInterval(() => {
        // Eased increment: fast early, slows near ceiling
        const increment = val < 40 ? 4 + Math.random() * 4
          : val < 70 ? 2 + Math.random() * 2
            : val < 88 ? 0.8 + Math.random() * 0.8
              : 0.2;
        val = Math.min(95, val + increment);
        setGenProgress(Math.round(val));
        if (val >= 95) clearInterval(genProgressRef.current);
      }, 350);
    } else {
      clearInterval(genProgressRef.current);
      setGenProgress(0);
    }
    return () => clearInterval(genProgressRef.current);
  }, [generating]);

  useEffect(() => {
    const init = async () => {
      try {
        // Set meeting title early but don't update state yet during render
        let titleToSet = '';
        const promises = [];

        if (!(reduxProjects && reduxProjects.length > 0)) {
          promises.push(
            API.get('/projects/')
              .then(r => setProjects(r.data?.projects || r.data || []))
              .catch(err => {
                toast.error('Failed to load projects', { description: 'Could not fetch project list from server.' });
              })
          );
        } else {
          setProjects(reduxProjects);
        }

        if (meetingId && meetingId !== 'unscheduled') {
          titleToSet = `Meeting #${meetingId}`;
          promises.push(
            API.get(`/transcript/${meetingId}`)
              .then(r => {
                if (r.data?.transcript_data) {
                  const existingEntries = r.data.transcript_data.map((e, i) => ({
                    ...e,
                    id: e.id || `ext-${Date.now()}-${i}`,
                    ...getSpeakerColor(e.speaker || 'Transcript')
                  }));
                  const doc = {
                    id: `tdoc-existing-${meetingId}`,
                    fileName: `Transcript #${meetingId}`,
                    fileSize: 0,
                    uploadedAt: nowTime(),
                    status: 'confirmed',
                    entries: existingEntries,
                    lineCount: existingEntries.length,
                    signature: `existing_${meetingId}`,
                    isExisting: true
                  };
                  setTranscripts(prev => {
                    if (prev.some(t => t.id === doc.id)) return prev;
                    return [...prev, doc];
                  });
                  setActiveTranscriptId(doc.id);
                }
              })
              .catch(err => {
                toast.error('Failed to load transcript', { description: 'Could not load existing meeting transcript data.' });
              })
          );
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }

        // Defer setState calls until after Promise.all completes
        if (titleToSet) {
          setMeetingTitle(titleToSet);
        }
      } catch (err) {
        console.error("Initial load error in MeetingCapturePage:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [meetingId, reduxProjects, getSpeakerColor]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      // Find by either dbProjectId (integer) or id (slug/integer)
      const p = projects.find(proj =>
        String(proj.dbProjectId || proj.id || proj.project_id) === String(projectId)
      );
      if (p) setProjectName(p.name || p.project_name);
    }
  }, [projectId, projects]);

  // ── Recording buffer → TranscriptDoc on stop ─────────────────────────
  const recordingEntriesRef = useRef([]);

  const flushBuffer = useCallback(() => {
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    if (text.length < 3) { setInterimEntry(null); return; }
    const color = getSpeakerColor(currentUser.name);
    const entry = { id: `rec-${Date.now()}-${Math.random()}`, type: 'dialogue', speaker: currentUser.name, time: nowTime(), text, ...color };
    recordingEntriesRef.current = [...recordingEntriesRef.current, entry];
    setInterimEntry(null);
  }, [currentUser.name, getSpeakerColor]);

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
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0D9488';
            ctx.globalAlpha = 0.8;
            const barWidth = 4;
            const gap = 4;
            for (let i = 0; i < 28; i++) {
              const val = dataArray[i * 4] || 0;
              const barHeight = 4 + (val / 255) * 44;
              const x = i * (barWidth + gap);
              const y = (canvas.height - barHeight) / 2;
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barHeight, 2);
              } else {
                ctx.rect(x, y, barWidth, barHeight);
              }
              ctx.fill();
            }
          }
        }
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

  const initRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { bufferRef.current += (bufferRef.current ? ' ' : '') + e.results[i][0].transcript.trim(); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(flushBuffer, 1000); }
        else interim += e.results[i][0].transcript;
      }
      if (interim) setInterimEntry({ id: 'int', type: 'dialogue', speaker: currentUser.name, time: nowTime(), text: interim, isInterim: true });
    };
    return rec;
  }, [flushBuffer, currentUser.name]);

  const startRecording = async () => {
    recordingEntriesRef.current = [];
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
    // Package recorded lines into a TranscriptDoc
    const captured = recordingEntriesRef.current;
    if (captured.length > 0) {
      const doc = {
        id: `tdoc-rec-${Date.now()}`,
        fileName: `Recording ${nowTime()}`,
        fileSize: 0,
        uploadedAt: nowTime(),
        status: 'reviewing',
        entries: captured,
        lineCount: captured.length,
        signature: `rec_${Date.now()}`,
        isRecording: true,
      };
      setTranscripts(prev => [...prev, doc]);
      setActiveTranscriptId(doc.id);
    }
  };

  // ── TranscriptDoc factory ────────────────────────────────────────────────
  const makeTranscriptDoc = useCallback((rawText, fileName, fileSize) => {
    const signature = `${fileName}_${fileSize}_${rawText.slice(0, 400)}`;
    const isDup = sigSetRef.current.has(signature);

    const parsed = parseTranscriptFile(rawText, currentUser.name);
    if (!isDup) {
      parsed.forEach(p => {
        if (p.type === 'metadata' && p.field.toLowerCase() === 'meeting title')
          setMeetingTitle(prev => (prev && !prev.startsWith('Meeting #')) ? prev : p.value);
      });
    }

    const entries = parsed.map((p, i) => {
      if (p.type === 'metadata' || p.type === 'platform_header')
        return { ...p, id: `m-${Date.now()}-${i}` };
      const spk = p.speaker || 'Transcript';
      return { id: `e-${Date.now()}-${Math.random()}-${i}`, type: 'dialogue', speaker: spk, time: p.timestamp || nowTime(), text: p.text, ...getSpeakerColor(spk) };
    });

    if (!isDup) sigSetRef.current.add(signature);

    return {
      id: `tdoc-${Date.now()}-${Math.random()}`,
      fileName, fileSize,
      uploadedAt: nowTime(),
      status: isDup ? 'duplicate' : 'reviewing',
      entries,
      lineCount: entries.filter(e => e.type === 'dialogue').length,
      signature,
    };
  }, [currentUser.name, getSpeakerColor]);

  // ── Bulk file handler ────────────────────────────────────────────────────
  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadingLabel(fileList.length === 1 ? fileList[0].name : `${fileList.length} transcripts`);

    const tick = setInterval(() => setUploadProgress(p => { const n = p + Math.random() * 18 + 6; if (n >= 90) { clearInterval(tick); return 90; } return n; }), 110);
    let done = 0;

    fileList.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const doc = makeTranscriptDoc(ev.target.result, file.name, file.size);
        setTranscripts(prev => {
          const next = [...prev, doc];
          // Auto-activate first reviewing doc
          if (doc.status === 'reviewing' && !prev.some(t => t.status === 'reviewing'))
            setActiveTranscriptId(doc.id);
          return next;
        });
        if (doc.status === 'duplicate')
          toast(`"${file.name}" already uploaded — shown as duplicate`, { icon: '⚠️' });
        done++;
        if (done === fileList.length) {
          clearInterval(tick); setUploadProgress(100);
          setTimeout(() => setIsUploading(false), 250);
        }
      };
      reader.readAsText(file);
    });
  };

  // ── TranscriptDoc mutations ──────────────────────────────────────────────
  const confirmTranscript = (id) => {
    setTranscripts(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status: 'confirmed' } : t);
      const next = updated.find(t => t.status === 'reviewing');
      setActiveTranscriptId(next?.id || null);
      return updated;
    });
    setProtectedIds(new Set());
    toast.success('Transcript confirmed ✓');
  };

  const importDuplicate = (id) => {
    setTranscripts(prev => prev.map(t => t.id === id ? { ...t, status: 'reviewing' } : t));
    setActiveTranscriptId(id);
  };

  const removeTranscript = (id) => {
    setTranscripts(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTranscriptId === id) setActiveTranscriptId(next.find(t => t.status === 'reviewing')?.id || next[0]?.id || null);
      return next;
    });
  };

  const deleteEntryFromTranscript = (tid, eid) =>
    setTranscripts(prev => prev.map(t => t.id === tid ? { ...t, entries: t.entries.filter(e => e.id !== eid) } : t));

  const updateEntryInTranscript = (tid, eid, text) =>
    setTranscripts(prev => prev.map(t => t.id === tid ? { ...t, entries: t.entries.map(e => e.id === eid ? { ...e, text } : e) } : t));

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeTranscript = transcripts.find(t => t.id === activeTranscriptId) || null;
  const mergedEntries = useMemo(() => transcripts.filter(t => t.status === 'confirmed').flatMap(t => t.entries), [transcripts]);
  const hasConfirmed = transcripts.some(t => t.status === 'confirmed');





  const handleRenameSpeaker = (name) => { setRenamingSpeaker(name); setRenameValue(name); };
  const commitRename = () => {
    const next = renameValue.trim();
    if (!next || !activeTranscriptId) return;
    setTranscripts(prev => prev.map(t =>
      t.id === activeTranscriptId
        ? { ...t, entries: t.entries.map(e => e.speaker === renamingSpeaker ? { ...e, speaker: next, ...getSpeakerColor(next) } : e) }
        : t
    ));
    setRenamingSpeaker(null);
  };

  const saveManualLine = () => {
    if (!manualForm.speaker.trim() || !manualForm.text.trim()) { toast.error('Speaker and content are required'); return; }
    if (!activeTranscriptId) { toast.error('Select or create a transcript first'); return; }
    const newEntry = {
      id: `manual-${Date.now()}-${Math.random()}`,
      type: 'manual', speaker: manualForm.speaker, text: manualForm.text,
      entry_type: manualForm.type, time: nowTime(), ...getSpeakerColor(manualForm.speaker)
    };
    setTranscripts(prev => prev.map(t => t.id === activeTranscriptId ? { ...t, entries: [...t.entries, newEntry] } : t));
    setIsAddingManual(false);
    setManualForm({ speaker: '', text: '', type: 'note' });
  };

  const cancelManualLine = () => { setIsAddingManual(false); setManualForm({ speaker: '', text: '', type: 'note' }); };
  const addNewLine = () => { setIsAddingManual(true); setManualForm(prev => ({ ...prev, speaker: currentUser.name })); };

  const handleGenerate = async () => {
    if (!projectId) { toast.error('Select a project first'); return; }
    if (!hasConfirmed) { toast.error('Confirm at least one transcript first'); return; }
    const dialogueEntries = mergedEntries.filter(e => e.type === 'dialogue' || e.type === 'manual');
    if (dialogueEntries.length === 0) {
      toast.error('Transcript is empty. Capture some dialogue first.');
      return;
    }
    setGenerating(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    try {
      const payload = {
        transcript: dialogueEntries.map(e => ({
          speaker: e.speaker, text: e.text, time: e.time, isManual: e.type === 'manual'
        })),
        title: meetingTitle, projectId
      };
      const resp = await API.post(`/meetings/${meetingId}/generate-mom`, payload, {
        signal: abortControllerRef.current.signal
      });
      dispatch(setMeetingContext({ meetingId, meetingName: meetingTitle, projectId, projectName }));

      if (resp.data?.success) {
        const intel = resp.data.intelligence;
        const aiRows = [
          ...(intel.action_items || []).map(a => ({ id: Math.random(), function: 'General', criticality: a.priority || 'Medium', discussion_point: a.description, responsibility: a.owner, target: a.due_date || 'TBD', status: 'Pending', project_id: projectId, project_name: projectName })),
          ...(intel.decisions || []).map(d => ({ id: Math.random(), function: 'Decision', criticality: 'Medium', discussion_point: d, responsibility: 'Everyone', status: 'Closed', project_id: projectId, project_name: projectName }))
        ];
        if (aiRows.length > 0) aiRows[0]._rawEntries = mergedEntries;
        dispatch(setMomData(aiRows));

        if (aiRows.length === 0) {
          const fallback = makeRowsFromEntries(mergedEntries, { meetingTitle, projectId, projectName, currentUserName: currentUser.name });
          if (fallback.length > 0) {
            dispatch(setMomData(fallback));
            dispatch(saveMOM({
              meetingId,
              meetingName: meetingTitle || 'Unscheduled Session',
              projectId,
              projectName,
              momData: fallback
            }));
            dispatch(setActiveModule('mom-module'));
            navigate(`/dashboard/mom/view/${meetingId}`);
            return;
          }
          setGenError('Generation produced no content. Check transcript format.');
          setGenerating(false);
          return;
        }

        // Save AI generated rows
        dispatch(saveMOM({
          meetingId,
          meetingName: meetingTitle || 'Unscheduled Session',
          projectId,
          projectName,
          momData: aiRows
        }));

        setGenError(null);
        const destId = resp.data.sync_id || resp.data.meeting_id || meetingId;
        dispatch(setActiveModule('mom-module'));
        navigate(`/dashboard/mom/view/${destId}`);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') return;
      
      toast.warning('AI model generation failed', {
        description: 'MOM compiled locally using standard rule-based parsing.',
        duration: 5000
      });

      const rows = makeRowsFromEntries(mergedEntries, { meetingTitle, projectId, projectName, currentUserName: currentUser.name });
      if (rows.length > 0) rows[0]._rawEntries = mergedEntries;
      dispatch(setMeetingContext({ meetingId, meetingName: meetingTitle, projectId, projectName }));
      dispatch(setMomData(rows));
      if (rows.length > 0) {
        dispatch(saveMOM({
          meetingId,
          meetingName: meetingTitle || 'Unscheduled Session',
          projectId,
          projectName,
          momData: rows
        }));
      }
      if (rows.length === 0) { setGenError('Generation produced no content.'); setGenerating(false); return; }
      setGenError(null);
      dispatch(setActiveModule('mom-module'));
      navigate(`/dashboard/mom/view/${meetingId}`);
    } finally { setGenerating(false); }
  };


  // ── Filler removal for active transcript ─────────────────────────────────
  const handleRemoveFillerFromActive = () => {
    if (!activeTranscriptId) return;
    setTranscripts(prev => prev.map(t => {
      if (t.id !== activeTranscriptId) return t;
      const dialogueEntries = t.entries.filter(e => e.type === 'dialogue' || e.type === 'manual');
      const fillerIds = new Set(dialogueEntries.filter(e => isNoiseLine(e.text) && !protectedIds.has(e.id)).map(e => e.id));
      let cleaned = t.entries.filter(e => !fillerIds.has(e.id));
      cleaned = FillerDetector.deduplicate(cleaned);
      toast.success(`Removed ${fillerIds.size} filler line${fillerIds.size !== 1 ? 's' : ''}`);
      return { ...t, entries: cleaned, lineCount: cleaned.filter(e => e.type === 'dialogue').length };
    }));
    setProtectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="mcp-root mom-theme">
        {/* Top Bar Skeleton */}
        <div className="mcp-topbar">
          <nav className="mcp-breadcrumb">
            <Skeleton className="h-5 w-44 rounded" />
          </nav>
        </div>

        {/* Steps Skeleton */}
        <div className="mcp-steps flex gap-4 items-center" style={{ margin: '16px 24px' }}>
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-0.5 w-16" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-0.5 w-16" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>

        {/* Body Skeleton */}
        <div className="mcp-body mcp-body-3col" style={{ display: 'grid', gridTemplateColumns: '380px 260px 1fr', gap: '24px', padding: '0 24px 24px' }}>
          {/* Column 1: Left Panel */}
          <div className="mcp-left-panel space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mcp-lp-section space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="mcp-lp-section space-y-3" style={{ marginTop: '20px' }}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="mcp-lp-section space-y-3" style={{ marginTop: '20px' }}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>

          {/* Column 2: Queue Panel */}
          <div className="mcp-queue-panel space-y-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mcp-queue-header flex justify-between items-center">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>

          {/* Column 3: Right Panel */}
          <div className="mcp-right-panel flex flex-col space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm" style={{ flex: 1 }}>
            <div className="mcp-rp-header flex justify-between items-center">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="flex-1 space-y-4 pt-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mcp-root mom-theme">
      {/* ── Top Bar (Removed) ── */}

      {/* ── Progress Steps ── */}
      <div className="mcp-steps">
        {[
          { label: 'CAPTURE', done: hasTranscripts, active: !hasTranscripts },
          { label: 'REVIEW', done: hasConfirmed, active: hasTranscripts && !hasConfirmed },
          { label: 'GENERATE', done: false, active: hasConfirmed, locked: !hasConfirmed },
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

      {/* ════════ BODY ════════ */}
      {!hasTranscripts ? (
        /* ═══ STEP 1: CENTERED SINGLE-COLUMN CAPTURE ═══ */
        <div className="mcp-body mcp-capture-centered">
          <div className="mcp-capture-column">
            {/* Page-level intent heading */}
            <h1 className="mcp-capture-heading">Minutes of meeting</h1>
            <p className="mcp-capture-subheading">Fill in the details below, then upload or record your meeting transcript.</p>

            {/* ── BEAT 1: Form Fields ── */}
            <div className="mcp-capture-fields">
              <div className="mcp-capture-field">
                <div className="mcp-lp-label-row">
                  <span className="mcp-lp-label" style={{ marginBottom: 0 }}>Meeting title</span>
                  <span className="mcp-lp-required">*</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={14} className="mcp-tooltip-icon" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Used as the document name for your MOM. Be specific — e.g. include the date or sprint number.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <input
                  ref={titleInputRef}
                  id="mcp-meeting-title"
                  className="mcp-lp-input mcp-animated-placeholder"
                  placeholder="e.g. Sprint Review — May 6"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                />
              </div>

              <div className="mcp-capture-field">
                <div className="mcp-lp-label-row">
                  <span className="mcp-lp-label" style={{ marginBottom: 0 }}>Link project</span>
                  <span className="mcp-lp-required">*</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={14} className="mcp-tooltip-icon" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Associates generated action items and decisions with the selected project for tracking.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="mcp-lp-select-wrap">
                  <select
                    ref={projectSelectRef}
                    id="mcp-link-project"
                    className="mcp-lp-select"
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id || p.dbProjectId} value={p.dbProjectId || p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── BEAT 2: Visual Divider ── */}
            <div className="mcp-capture-divider" />

            {/* ── BEAT 3: Capture Method Cards ── */}
            <div className="mcp-capture-methods">

              <div className="mcp-capture-cards">
                {/* Upload Card */}
                <div
                  className={`mcp-capture-card ${mode === 'upload' ? 'active' : ''}`}
                  onClick={() => handleModeSelect('upload')}
                >
                  <div className="mcp-capture-card-icon"><Upload size={22} strokeWidth={1.5} /></div>
                  <div className="mcp-capture-card-title">Upload transcript</div>
                  <div className="mcp-capture-card-hint">.txt .md .vtt .srt · multiple files</div>
                </div>

                {/* Record Card */}
                <div
                  className={`mcp-capture-card ${mode === 'record' ? 'active' : ''}`}
                  onClick={() => handleModeSelect('record')}
                >
                  <div className="mcp-capture-card-icon"><Mic size={22} strokeWidth={1.5} /></div>
                  <div className="mcp-capture-card-title">Record live</div>
                  <div className="mcp-capture-card-hint">Browser mic · real-time transcript</div>
                </div>
              </div>

              {/* Expanded content based on mode */}
              {mode === 'upload' && (
                <div className="mcp-capture-expanded">
                  {isUploading ? (
                    <div className="mcp-upload-progress-wrap">
                      <div className="mcp-upload-progress-filename"><FileText size={14} color="#0D9488" /><span>{uploadingLabel}</span></div>
                      <div className="mcp-progress-track"><div className="mcp-progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
                      <div className="mcp-upload-progress-pct">{Math.round(uploadProgress)}%</div>
                    </div>
                  ) : (
                    <div
                      className={`mcp-dropzone ${isDragOver ? 'drag-over' : ''}`}
                      onClick={() => requireFields(() => fileInputRef.current.click())}
                      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) requireFields(() => handleFiles(e.dataTransfer.files)); }}
                    >
                      <Upload size={28} color="#0D9488" strokeWidth={1.5} />
                      <div className="mcp-dropzone-title">Drop transcripts or click to browse</div>
                      <div className="mcp-dropzone-sub">Multiple files · .txt .md .vtt .srt</div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'record' && (
                <div className="mcp-capture-expanded">
                  <div className="mcp-record-zone">
                    <button className={`mcp-record-btn ${recordState.toLowerCase()}`} onClick={() => recordState === 'IDLE' ? requireFields(startRecording) : stopRecording()}>
                      {recordState === 'IDLE' ? <Mic size={24} color="#fff" /> : <Square size={18} color="#fff" />}
                    </button>
                    <div className="mcp-record-timer-display">{formatTime(timerVal)}</div>
                    <div className="mcp-waveform">
                      <canvas ref={canvasRef} width={220} height={48} style={{ display: 'block' }} />
                    </div>
                    {micError && <div className="mcp-mic-error">{micError}</div>}
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.vtt,.srt" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>
          </div>
        </div>
      ) : (
        /* ═══ STEP 2+: 2-COLUMN REVIEW LAYOUT ═══ */
        <div className="mcp-body mcp-body-2col">
          {/* hidden file input since we removed the left panel */}
          <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.vtt,.srt" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

          {/* ── COL 1: TRANSCRIPT QUEUE ── */}
          <div className="mcp-queue-panel">
            <div className="mcp-queue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mcp-queue-title">TRANSCRIPTS</span>
                <span className="mcp-queue-count">{transcripts.length}</span>
              </div>
              <button className="mcp-add-more-btn" onClick={() => fileInputRef.current.click()} title="Add more files" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#0D9488', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                <Plus size={14} /> Add more
              </button>
            </div>

            {transcripts.length === 0 ? (
              <div className="mcp-queue-empty">
                <FileUp size={28} color="#CBD5E1" strokeWidth={1.2} />
                <span>No transcripts yet</span>
                <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Upload files or start recording</span>
              </div>
            ) : (
              <div className="mcp-queue-list">
                {transcripts.map((t, idx) => {
                  const isActive = t.id === activeTranscriptId;
                  const statusColors = {
                    reviewing: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', label: 'reviewing' },
                    confirmed: { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', label: 'confirmed' },
                    duplicate: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', label: 'duplicate' },
                  };
                  const sc = statusColors[t.status];
                  return (
                    <div
                      key={t.id}
                      className={`mcp-queue-item ${isActive ? 'active' : ''} ${t.status}`}
                      onClick={() => setActiveTranscriptId(t.id)}
                    >
                      <div className="mcp-qi-top">
                        <div className="mcp-qi-index">{idx + 1}</div>
                        <div className="mcp-qi-name">{t.isRecording ? '🎙 ' : ''}{t.fileName}</div>
                        <button className="mcp-qi-remove" title="Remove" onClick={e => { e.stopPropagation(); removeTranscript(t.id); }}><X size={12} /></button>
                      </div>
                      <div className="mcp-qi-meta">
                        <span className="mcp-qi-lines">{t.lineCount} lines</span>
                        {t.fileSize > 0 && <span className="mcp-qi-size">{(t.fileSize / 1024).toFixed(1)} KB</span>}
                        <span className="mcp-qi-time">{t.uploadedAt}</span>
                      </div>
                      <div className="mcp-qi-footer">
                        <span className="mcp-qi-status-chip" style={{ background: sc.bg, color: sc.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, display: 'inline-block', marginRight: 4 }} />
                          {sc.label}
                        </span>
                        {t.status === 'duplicate' && (
                          <button className="mcp-qi-import-btn" onClick={e => { e.stopPropagation(); importDuplicate(t.id); }}>Import Anyway</button>
                        )}
                        {t.status === 'confirmed' && (
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>✓ In session</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── COL 3: REVIEW PANEL ── */}
          <div className="mcp-right-panel">
            <div className="mcp-rp-header">
              <span className="mcp-rp-header-title">
                {activeTranscript
                  ? activeTranscript.status === 'confirmed' ? `✓ ${activeTranscript.fileName}` : `REVIEWING · ${activeTranscript.fileName}`
                  : 'TRANSCRIPT REVIEW'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeTranscript && activeTranscript.status === 'reviewing' && (
                  <button
                    className="mcp-confirm-btn"
                    onClick={() => confirmTranscript(activeTranscript.id)}
                  >
                    <Check size={14} /> Confirm Transcript
                  </button>
                )}
                {activeTranscript && (
                  <button
                    className="mcp-rp-trash-btn"
                    title="Delete transcript"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this transcript? This action cannot be undone.")) {
                        removeTranscript(activeTranscript.id);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '6px', opacity: 0.7, transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = '#FEE2E2'; }}
                    onMouseOut={(e) => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.background = 'none'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Active transcript filler banner */}
            {activeTranscript && (() => {
              const dialogueEntries = activeTranscript.entries.filter(e => e.type === 'dialogue' || e.type === 'manual');
              const fillerEntries = dialogueEntries.filter(e => isNoiseLine(e.text) && !protectedIds.has(e.id));
              if (fillerEntries.length === 0) return null;
              const CATEGORY_LABELS = { greeting: 'greetings', ritual: 'mic checks', hesitation: 'hesitations', affirmation: 'filler replies', filler_word: 'filler words', formatting: 'formatting' };
              const catCounts = fillerEntries.reduce((acc, e) => { const cat = FillerDetector.classify(e.text).category; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
              const breakdown = Object.entries(catCounts).map(([k, v]) => `${v} ${CATEGORY_LABELS[k] || k}`).join(', ');
              return (
                <div className="mcp-cleanup-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--mcp-warning-text, #92400E)' }}>
                      <strong>{fillerEntries.length} filler line{fillerEntries.length !== 1 ? 's' : ''}</strong> — {breakdown}
                    </span>
                  </div>
                  <button className="mcp-cleanup-btn" onClick={handleRemoveFillerFromActive}>Remove Filler</button>
                </div>
              );
            })()}

            {/* Summary bar */}
            {activeTranscript && (() => {
              const dialogues = activeTranscript.entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker);
              const speakers = Array.from(new Set(dialogues.map(e => e.speaker))).filter(n => !PLATFORM_NAMES.has(n.toLowerCase()));
              return (
                <div className="mcp-summary-bar" style={{ padding: '6px 20px' }}>
                  <span style={{ color: '#0D9488', fontSize: '12px', fontWeight: 500 }}>
                    {dialogues.length} lines · {speakers.length} speakers
                    {activeTranscript.status === 'confirmed' ? ' · confirmed ✓' : ' · pending confirmation'}
                  </span>
                </div>
              );
            })()}

            <div className="mcp-rp-body" ref={previewBodyRef}>
              {!activeTranscript ? (
                generating ? (
                  /* ── Processing state — enterprise-grade, no gimmicks ── */
                  <div className="mcp-generating-state">
                    <div className="mcp-generating-inner">

                      {/* Status label */}
                      <div className="mcp-gen-status-label">
                        <span className="mcp-gen-status-dot" />
                        Processing
                      </div>

                      {/* Title */}
                      <div className="mcp-generating-title">Compiling Minutes of Meeting</div>

                      {/* Factual subtitle — no ellipsis jargon */}
                      <div className="mcp-generating-subtitle">
                        {mergedEntries.filter(e => e.type === 'dialogue' || e.type === 'manual').length} statements &nbsp;·&nbsp; {Array.from(new Set(mergedEntries.filter(e => e.speaker).map(e => e.speaker))).length} participants &nbsp;·&nbsp; {transcripts.filter(t => t.status === 'confirmed').length} transcript{transcripts.filter(t => t.status === 'confirmed').length !== 1 ? 's' : ''}
                      </div>

                      {/* Progress row: IN PROGRESS pill · percentage · bar */}
                      <div className="mcp-gen-progress-header">
                        <span className="mcp-gen-inprogress-badge">In Progress</span>
                        <span className="mcp-gen-progress-pct">{genProgress}%</span>
                      </div>
                      <div className="mcp-generating-progress-wrap">
                        <Progress value={genProgress} className="mcp-generating-progress-bar" />
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="mcp-rp-empty">
                    <FileText size={32} strokeWidth={1.2} color="#CBD5E1" />
                    <span className="mcp-rp-empty-text">Select a transcript from the queue to review</span>
                  </div>
                )
              ) : (
                <>
                  {/* Metadata rows */}
                  {activeTranscript.entries.filter(e => e.type === 'metadata').length > 0 && (
                    <div className="mcp-metadata-block">
                      {activeTranscript.entries.filter(e => e.type === 'metadata').map(m => (
                        <div key={m.id} className="mcp-metadata-row">
                          <span className="mcp-metadata-label">{m.field}:</span>
                          <span className="mcp-metadata-value">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dialogue lines */}
                  <div style={{ marginTop: 16 }}>
                    {[...activeTranscript.entries.filter(e => (e.type === 'dialogue' || e.type === 'manual') && e.speaker), ...(interimEntry ? [interimEntry] : [])].map(e => {
                      const classification = FillerDetector.classify(e.text);
                      const isNoise = classification.isFiller && !protectedIds.has(e.id);
                      const isProtected = classification.isFiller && protectedIds.has(e.id);
                      return (
                        <div key={e.id} className="mcp-dialogue-card" style={{ opacity: isNoise ? 0.6 : 1, background: isNoise ? 'var(--mcp-noise-bg, #FFFBEB)' : isProtected ? 'var(--mcp-protected-bg, #F0FDF4)' : undefined, transition: 'opacity 0.2s, background 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div className="mcp-dialogue-accent" style={{ background: isNoise ? 'var(--mcp-noise-border, #FCD34D)' : isProtected ? 'var(--mcp-protected-border, #4ADE80)' : 'var(--mcp-primary, #0D9488)' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span onClick={() => handleRenameSpeaker(e.speaker)} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mcp-text-main, #334155)', cursor: 'pointer' }}>{e.speaker}</span>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{e.time}</span>
                                {e.type === 'manual' && <span style={{ background: '#EEF2FF', color: '#4338CA', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>MANUAL</span>}
                                {isNoise && (
                                  <>
                                    <span className="mcp-filler-chip" title={classification.reason}>{classification.category}</span>
                                    <button title="Keep this line" onClick={() => setProtectedIds(prev => { const next = new Set(prev); next.add(e.id); return next; })} style={{ fontSize: '11px', color: 'var(--mcp-primary, #0D9488)', background: 'var(--mcp-btn-bg, #F0FDFA)', border: '1px solid var(--mcp-btn-border, #99F6E4)', borderRadius: '4px', padding: '1px 7px', cursor: 'pointer', fontWeight: 600 }}>Keep</button>
                                  </>
                                )}
                                {isProtected && (
                                  <>
                                    <span style={{ fontSize: '10px', color: 'var(--mcp-kept-text, #059669)', background: 'var(--mcp-kept-bg, #D1FAE5)', border: '1px solid var(--mcp-kept-border, #6EE7B7)', borderRadius: '4px', padding: '1px 6px', fontWeight: 600 }}>KEPT</span>
                                    <button onClick={() => setProtectedIds(prev => { const next = new Set(prev); next.delete(e.id); return next; })} style={{ fontSize: '11px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px' }}>✕</button>
                                  </>
                                )}
                                <div style={{ marginLeft: 'auto' }}>
                                  <button className="mcp-delete-btn" onClick={() => deleteEntryFromTranscript(activeTranscriptId, e.id)}><X size={14} /></button>
                                </div>
                              </div>
                              <textarea value={e.text} onChange={val => updateEntryInTranscript(activeTranscriptId, e.id, val.target.value)}
                                onInput={el => { el.target.style.height = 'auto'; el.target.style.height = el.target.scrollHeight + 'px'; }}
                                style={{ width: '100%', border: 'none', background: 'none', fontSize: '14px', lineHeight: 1.6, outline: 'none', resize: 'none', minHeight: '24px', display: 'block', padding: 0, color: isNoise ? '#94a3b8' : 'var(--mcp-text-main, #1e293b)', textDecoration: isNoise ? 'line-through' : 'none', textDecorationColor: 'var(--mcp-noise-border, #FCD34D)' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Manual entry form */}
                    {isAddingManual && (
                      <div style={{ borderLeft: '3px solid #0D9488', padding: '12px 16px', background: '#F8FAFC', borderRadius: '0 8px 8px 0', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input placeholder="Speaker name" value={manualForm.speaker} onChange={e => setManualForm(prev => ({ ...prev, speaker: e.target.value }))} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--mcp-text-main, #1E293B)', border: 'none', borderBottom: '1px solid var(--mcp-border, #E2E8F0)', background: 'transparent', width: '160px', padding: '2px 0', outline: 'none' }} />
                          <span style={{ fontSize: '12px', color: 'var(--mcp-text-muted, #94A3B8)', marginLeft: '12px' }}>Manual entry</span>
                        </div>
                        <textarea placeholder="Type meeting note, decision, or action item..." value={manualForm.text} onChange={e => setManualForm(prev => ({ ...prev, text: e.target.value }))} style={{ width: '100%', marginTop: '8px', fontSize: '14px', color: 'var(--mcp-text-main, #1E293B)', border: 'none', borderBottom: '1px solid var(--mcp-border, #E2E8F0)', background: 'transparent', resize: 'none', minHeight: '60px', lineHeight: '1.6', outline: 'none' }} />
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select value={manualForm.type} onChange={e => setManualForm(prev => ({ ...prev, type: e.target.value }))} style={{ fontSize: '12px', border: '0.5px solid var(--mcp-border, #E2E8F0)', borderRadius: '4px', padding: '3px 8px', color: 'var(--mcp-text-muted, #475569)', background: 'var(--mcp-bg, #fff)', outline: 'none' }}>
                            <option value="note">Note</option>
                            <option value="decision">Decision</option>
                            <option value="action">Action Item</option>
                          </select>
                          <button onClick={saveManualLine} style={{ fontSize: '12px', color: '#0D9488', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Save</button>
                          <button onClick={cancelManualLine} style={{ fontSize: '12px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    <button onClick={addNewLine} style={{ color: '#0D9488', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
                      <Plus size={13} /> Add line
                    </button>
                  </div>

                  {/* Confirm button at bottom of panel */}
                  {activeTranscript.status === 'reviewing' && (
                    <div style={{ padding: '16px 0 8px', borderTop: '1px solid #F1F5F9', marginTop: 16 }}>
                      <button className="mcp-confirm-bottom-btn" onClick={() => confirmTranscript(activeTranscript.id)}>
                        <Check size={15} /> Confirm &amp; Add to Session
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Bottom progress bar — visible only while generating AND a transcript is active ── */}
            {generating && activeTranscript && (
              <div className="mcp-rp-generating-footer">
                <Loader size={13} className="mcp-spin-icon" style={{ color: '#0D9488' }} />
                <span>Generating MOM from {transcripts.filter(t => t.status === 'confirmed').length} transcript{transcripts.filter(t => t.status === 'confirmed').length !== 1 ? 's' : ''}…</span>
                <Progress className="mcp-rp-generating-progress" />
              </div>
            )}
          </div>
          
          {/* ── FOOTER CTA (Sticky Bottom) ── */}
          <div className="mcp-footer-cta">
            <div className="mcp-footer-stats">
              <span className="mcp-footer-counter">
                {transcripts.filter(t => t.status === 'reviewing').length > 0 ? (
                  <span style={{ color: '#F59E0B' }}>{transcripts.filter(t => t.status === 'reviewing').length} of {transcripts.length} transcripts pending</span>
                ) : (
                  <span style={{ color: '#10B981' }}><CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />All transcripts confirmed</span>
                )}
              </span>
              <span className="mcp-footer-summary">
                {mergedEntries.filter(e => e.type === 'dialogue' || e.type === 'manual').length} lines · {Array.from(new Set(mergedEntries.filter(e => e.speaker).map(e => e.speaker))).length} speakers
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {generating && (
                <button
                  className="mcp-footer-cancel-btn"
                  onClick={cancelGeneration}
                  style={{ background: 'none', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: '6px', height: '36px', padding: '0 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <X size={14} /> Cancel
                </button>
              )}
              <button
                className={`mcp-footer-generate-btn ${generating ? 'generating' : ''}`}
                onClick={handleGenerate}
                disabled={generating || transcripts.filter(t => t.status === 'reviewing').length > 0 || !hasConfirmed}
              >
                {generating
                  ? <><Loader size={16} className="mcp-spin-icon" /> Generating…</>
                  : <><Sparkles size={16} /> Proceed to Generate</>}
              </button>
            </div>
            {genError && <div className="mcp-footer-error">{genError}</div>}
          </div>
        </div>
      )}

      {/* ── Rename Speaker Modal ── */}
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
      {/* ── AlertDialog for Missing Information ── */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Missing Information</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a meeting title and select a project before capturing a transcript.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setIsAlertOpen(false); focusFirstMissingField(); }}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingCapturePage;
