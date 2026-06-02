/**
 * fillerDetector.js
 * =================
 * Single source of truth for filler detection across the MOM pipeline.
 *
 * Definition: A filler is any word/sentence that carries no actionable or
 * informational value for meeting minutes.
 *
 * Categories (returned in classify().category):
 *   formatting   — empty, symbol-only, or number-only line
 *   filler_word  — standalone hesitation/verbal-tic words (um, uh, like, basically)
 *   greeting     — social openers and closers (hello, bye, good morning, thanks)
 *   ritual       — meeting-specific procedure phrases (let's begin, can you hear me)
 *   hesitation   — discourse fillers and clichés (you know, kind of, I mean)
 *   affirmation  — pure acknowledgements with no new information (noted, agreed)
 *   content      — substantive content that should be kept
 *
 * API:
 *   FillerDetector.classify(text)           → { isFiller, confidence, category, reason }
 *   FillerDetector.deduplicate(entries)     → filtered entries array
 *   FillerDetector.loadProtected()          → Set of user-protected normalised phrases
 *   FillerDetector.saveProtected(set)       → persists to localStorage
 */

// ─────────────────────────────────────────────────────────────────────────────
// Cat-1: Standalone filler words
// A transcript line consisting ONLY of these words (up to 5) is always filler.
// ─────────────────────────────────────────────────────────────────────────────
const FD_FILLER_WORDS = new Set([
  // Discourse markers
  'basically', 'actually', 'literally', 'honestly', 'clearly', 'obviously', 'simply',
  'really', 'totally', 'anyway', 'right', 'so', 'well', 'now', 'like', 'just',
  // Hesitation sounds
  'um', 'uh', 'uhh', 'hmm', 'hm', 'ahh', 'ah', 'err', 'er', 'erm', 'uh-huh',
  // Back-channel responses
  'yeah', 'yep', 'yah', 'nah', 'nope',
  // Social singles
  'hello', 'hi', 'hey', 'bye', 'goodbye',
  // Affirmation singles
  'yes', 'no', 'sure', 'fine', 'great', 'nice', 'wow', 'cool', 'awesome', 'perfect',
  'ok', 'okay', 'alright',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Cat-2: Greeting / social / closing — full-line patterns
// These match entire lines that are purely social openers or closers.
// ─────────────────────────────────────────────────────────────────────────────
const FD_GREETING = [
  [/^good\s+(morning|afternoon|evening|night|day)(\s+(everyone|all|folks|team|guys|all))?[.!]?$/, 'Social greeting'],
  [/^(hello|hi+|hey)(\s+(everyone|all|folks|team|guys|there))?[.!]?$/, 'Social greeting'],
  [/^(bye|goodbye|see\s+you(\s+later|\s+soon|\s+then)?|take\s+care|talk\s+(soon|later))[.!]?$/, 'Meeting closing'],
  [/^have\s+a\s+(good|great|nice|wonderful)\s+(day|one|evening|weekend|rest)[.!]?$/, 'Meeting closing'],
  [/^enjoy\s+(your\s+)?(day|evening|weekend|rest)[.!]?$/, 'Meeting closing'],
  [/^(thanks|thank\s+you)(\s+(so\s+much|very\s+much|everyone|all|for\s+joining|for\s+attending|for\s+your\s+time))?[.!]?$/, 'Social closing'],
  [/^(you\s+too|same\s+(to\s+you|here))[.!]?$/, 'Social closing'],
  [/^(you['']?re\s+welcome|welcome)[.!]?$/, 'Social pleasantry'],
  [/^(happy\s+to\s+help|glad\s+to\s+help)[.!]?$/, 'Social pleasantry'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Cat-3: Meeting ritual — procedural noise specific to virtual meetings
// ─────────────────────────────────────────────────────────────────────────────
const FD_RITUAL = [
  [/^let['']?s\s+(get\s+started|begin|start|jump\s+in|dive\s+in|kick\s+off|get\s+going|get\s+into\s+it)[.!]?$/, 'Meeting opener'],
  [/^shall\s+we\s+(start|begin|get\s+started|get\s+going)[?.]?$/, 'Meeting opener'],
  [/^(before\s+we\s+(start|begin|get\s+started|dive\s+in|move\s+on))(\s*,.*)?$/, 'Meeting opener'],
  [/^(just\s+wanted\s+to\s+(say|mention|add|check|quickly))(\s*,.*)?$/, 'Empty opener'],
  [/^(can\s+(you\s+all|everyone)\s+hear\s+me|can\s+you\s+hear\s+me)[?.]?$/, 'Audio check'],
  [/^is\s+everyone\s+(on|here|ready|there|with\s+us)[?.]?$/, 'Audio check'],
  [/^(are\s+you\s+(there|with\s+us))[?.]?$/, 'Audio check'],
  [/^(mic\s+check|audio\s+check|checking\s+(audio|sound|mic))[.!]?$/, 'Audio check'],
  [/^sorry[,\s]+(i\s+was|i\s+am|was|got)\s+(on\s+)?muted?[.!]?$/, 'Mute issue'],
  [/^(i\s+was|got)\s+(on\s+)?muted?[.!]?$/, 'Mute issue'],
  [/^(you\s+(are|were)\s+(on\s+)?muted?)[.!]?$/, 'Mute issue'],
  [/^(oops|oh|oh\s+no|whoops)[,.]?\s+(muted?|on\s+mute)[.!]?$/, 'Mute issue'],
  [/^(moving\s+on|let['']?s\s+move\s+on|moving\s+forward|next\s+(item|point|topic))[.!]?$/, 'Transition phrase'],
  [/^(with\s+that\s+(said|being\s+said)|on\s+that\s+note)[,.]?$/, 'Transition phrase'],
  [/^alright[,.]?\s+(so|everyone|team|folks|let['']?s)?[.!]?$/, 'Transition phrase'],
  [/^(any\s+(other\s+)?(questions|comments|points|concerns|thoughts|additions)(\s+from\s+anyone)?)[?.]?$/, 'Closing ritual'],
  [/^(anything\s+else(\s+to\s+(add|discuss|cover|say))?)[?.]?$/, 'Closing ritual'],
  [/^(that['']?s\s+all(\s+from\s+me)?|that['']?s\s+it(\s+from\s+me)?)[.!]?$/, 'Closing ritual'],
  [/^(i\s+think\s+(we['']?re\s+)?(done|good|all\s+set|covered\s+it|good\s+to\s+go))[.!]?$/, 'Closing ritual'],
  [/^(we['']?re\s+(done|good|all\s+set))[.!]?$/, 'Closing ritual'],
  [/^(let['']?s\s+(wrap\s+up|close\s+out|end\s+(here|the\s+call|the\s+meeting)))[.!]?$/, 'Closing ritual'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Cat-4: Hesitation / discourse filler — clichés and empty openers
// ─────────────────────────────────────────────────────────────────────────────
const FD_HESITATION = [
  [/^(um+|uh+|hmm+|ahh+|err+|erm+)[,\s.]*$/, 'Hesitation sound'],
  [/^so[,\s]+yeah[,\s.]*$/, 'Discourse filler'],
  [/^(so\s+anyway|anyway)[,\s.]*$/, 'Discourse filler'],
  [/^(you\s+know(\s+what\s+i\s+mean)?)[,?.]?$/, 'Discourse filler'],
  [/^(i\s+mean[,.]?(\s+like)?)[,?.]?$/, 'Discourse filler'],
  [/^(kind\s+of|sort\s+of|more\s+or\s+less)[,?.]?$/, 'Vague qualifier'],
  [/^(at\s+the\s+end\s+of\s+the\s+day)[,.]?$/, 'Cliché phrase'],
  [/^(if\s+that\s+makes\s+sense)[,?.]?$/, 'Filler closer'],
  [/^(if\s+you\s+know\s+what\s+i\s+mean)[,?.]?$/, 'Filler closer'],
  [/^(long\s+story\s+short)[,.]?$/, 'Cliché phrase'],
  [/^(to\s+cut\s+(a\s+long\s+story\s+short|to\s+the\s+chase))[,.]?$/, 'Cliché phrase'],
  [/^(well[,\s]+)(i\s+)?(think|guess|mean|suppose)[,.]?/, 'Hesitation opener'],
  [/^(basically|literally|honestly|actually|clearly|obviously)(,\s+.{0,40})?$/, 'Discourse marker only'],
  [/^(to\s+be\s+(honest|fair|frank|clear|transparent))[,.]?$/, 'Filler opener'],
  [/^(as\s+i\s+(was\s+saying|mentioned|said))[,.]?$/, 'Filler opener'],
  [/^(just\s+to\s+(add|be\s+clear|confirm|recap|clarify))[,.]?$/, 'Filler opener'],
  [/^(by\s+the\s+way)[,.]?$/, 'Off-topic signal'],
  [/^(on\s+a\s+(side\s+note|related\s+note))[,.]?$/, 'Off-topic signal'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Cat-5: Pure affirmation / acknowledgement
// Replies that add zero new information to the meeting record.
// ─────────────────────────────────────────────────────────────────────────────
const FD_AFFIRMATION = [
  [/^(noted|understood|got\s+it|i\s+see|i\s+know|fair\s+enough)[.!]?$/, 'Pure acknowledgement'],
  [/^(agreed?|i\s+agree)[.!]?$/, 'Pure acknowledgement'],
  [/^(makes\s+sense(\s+to\s+me)?)[.!]?$/, 'Affirmation'],
  [/^(sounds\s+(good|great|perfect|right|fair)(\s+to\s+me)?)[.!]?$/, 'Affirmation'],
  [/^(works\s+for\s+me)[.!]?$/, 'Affirmation'],
  [/^(that\s+(works|makes\s+sense|sounds\s+good)(\s+to\s+me|\s+for\s+me)?)[.!]?$/, 'Affirmation'],
  [/^(no\s+(problem|objection|worries|issue)(\s+from\s+me|\s+here)?)[.!]?$/, 'Affirmation'],
  [/^(absolutely|definitely|certainly|of\s+course|exactly|correct)[.!]?$/, 'Affirmation'],
  [/^(good\s+(to\s+go|point|call|idea|one))[.!]?$/, 'Affirmation'],
  [/^(all\s+good(\s+here)?)[.!]?$/, 'Affirmation'],
  [/^(will\s+do)[.!]?$/, 'Affirmation'],
  [/^(you['']?re\s+(welcome|right|good(\s+to\s+go)?))[.!]?$/, 'Social reply'],
  [/^(no\s+worries|don['']?t\s+worry(\s+about\s+it)?)[.!]?$/, 'Social reply'],
  [/^(sure[,.]?\s*(thing|sounds\s+good)?)[.!]?$/, 'Affirmation'],
  [/^(loud\s+and\s+clear)[.!]?$/, 'Audio confirmation'],
  [/^(perfect(ly\s+fine)?)[.!]?$/, 'Affirmation'],
  [/^(happy\s+to)[.!]?$/, 'Affirmation'],
  [/^(of\s+course)[.!]?$/, 'Affirmation'],
  [/^(yeah[,.]?\s*(sure|ok|okay|good|fine|right|no\s+problem|sounds\s+good|totally|for\s+sure)?)[.!]?$/, 'Affirmation'],
  [/^(yep[,.]?\s*(loud\s+and\s+clear|sounds\s+good|sure|ok|okay|totally|for\s+sure)?)[.!]?$/, 'Affirmation'],
  [/^(ok(ay)?[,.]?\s*(sure|sounds\s+good|got\s+it|noted|perfect|fine)?)[.!]?$/, 'Affirmation'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Cat-6: Formatting noise
// ─────────────────────────────────────────────────────────────────────────────
const FD_FORMAT_RE = /^[-–—=*_#.\s]{2,}$|^\d+\.?$|^\[.{0,30}\]$|^(\w)\1{3,}$/;

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTANCE VETO
// If any of these tokens appear, the line is NEVER filler — hard stop.
// Represents concrete meeting deliverables, technical terms, business nouns.
// ─────────────────────────────────────────────────────────────────────────────
const FD_SUBSTANCE_TOKENS = new Set([
  // Technical
  'api', 'endpoint', 'server', 'database', 'db', 'sql', 'query', 'backend', 'frontend',
  'bug', 'fix', 'patch', 'issue', 'ticket', 'jira', 'pr', 'commit', 'merge', 'deploy', 'release',
  'feature', 'milestone', 'sprint', 'roadmap', 'scope', 'backlog',
  'test', 'qa', 'review', 'audit', 'integration', 'migration', 'refactor',
  'dashboard', 'ui', 'ux', 'design', 'figma', 'prototype', 'mockup',
  // Business
  'budget', 'cost', 'revenue', 'invoice', 'contract', 'vendor', 'sla',
  'deadline', 'target', 'eta', 'timeline', 'schedule', 'plan',
  'report', 'document', 'spec', 'requirement', 'proposal',
  'client', 'customer', 'stakeholder', 'owner',
  'critical', 'urgent', 'blocker', 'priority', 'escalate',
  // Collaboration
  'email', 'slack', 'confluence', 'github', 'gitlab',
  'action', 'follow', 'sync', 'agenda',
  // Metrics
  'kpi', 'metric', 'okr',
  // Quarter references
  'q1', 'q2', 'q3', 'q4',
]);

// Substance multi-word phrases (checked via includes on normalised string)
const FD_SUBSTANCE_PHRASES = [
  'action item', 'follow up', 'follow-up', 'pull request', 'due date',
  'end of day', 'end of week', 'code review', 'peer review', 'tech debt', 'user story',
];

// Stop words excluded from Jaccard deduplication so content words dominate similarity
const FD_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'is', 'it', 'its', 'that', 'this', 'was', 'are', 'be', 'been', 'have', 'has',
  'had', 'will', 'would', 'can', 'could', 'should', 'we', 'i', 'you', 'they',
  'he', 'she', 'my', 'our', 'your', 'their', 'with', 'from', 'by', 'about',
  'as', 'into', 'if', 'so', 'not', 'do', 'does', 'did', 'just', 'up', 'out',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normalise a raw text string for pattern matching
// ─────────────────────────────────────────────────────────────────────────────
function normalise(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/, '')        // strip trailing punctuation
    .replace(/['\u2018\u2019]/g, "'") // normalise smart quotes
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Levenshtein edit distance (used for short-line dedup)
// ─────────────────────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: content-word Jaccard similarity (used for long-line dedup)
// Removes stop words so similarity is driven by meaningful words only.
// ─────────────────────────────────────────────────────────────────────────────
function contentJaccard(a, b) {
  const toContentSet = str =>
    new Set(str.split(/\W+/).filter(w => w.length > 1 && !FD_STOP_WORDS.has(w)));
  const setA = toContentSet(a);
  const setB = toContentSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  const inter = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

// ─────────────────────────────────────────────────────────────────────────────
// FillerDetector — the exported API
// ─────────────────────────────────────────────────────────────────────────────
const FillerDetector = {

  /**
   * classify(text)
   *
   * Classify a single transcript line.
   * Returns { isFiller, confidence, category, reason }
   *
   * Confidence:
   *   'high'   — unambiguous match (filler word, greeting, ritual, affirmation)
   *   'medium' — hesitation pattern (could be mid-sentence fragment)
   *
   * Precedence (first match wins — no ambiguity, no score accumulation):
   *   0. Empty / <2 chars          → filler:formatting
   *   1. Formatting symbols        → filler:formatting
   *   2. Substance token present   → NOT filler (hard veto)
   *   3. All words are filler words (≤5 words) → filler:filler_word
   *   4. Greeting pattern match    → filler:greeting
   *   5. Ritual pattern match      → filler:ritual
   *   6. Hesitation pattern match  → filler:hesitation  (medium confidence)
   *   7. Affirmation pattern match → filler:affirmation
   *   8. Otherwise                 → content
   */
  classify(text) {
    if (!text || !text.trim()) {
      return { isFiller: true, confidence: 'high', category: 'formatting', reason: 'Empty line' };
    }
    const raw = text.trim();
    if (raw.length < 2) {
      return { isFiller: true, confidence: 'high', category: 'formatting', reason: 'Too short' };
    }

    // Rule 1: Formatting noise
    if (FD_FORMAT_RE.test(raw)) {
      return { isFiller: true, confidence: 'high', category: 'formatting', reason: 'Symbol or number-only line' };
    }

    const norm = normalise(raw);
    const words = norm.split(/\s+/).filter(Boolean);

    // Rule 2: Substance veto — token check
    for (const w of words) {
      if (FD_SUBSTANCE_TOKENS.has(w)) {
        return { isFiller: false, confidence: 'high', category: 'content', reason: `Contains substantive term: "${w}"` };
      }
    }
    // Substance phrase check
    for (const phrase of FD_SUBSTANCE_PHRASES) {
      if (norm.includes(phrase)) {
        return { isFiller: false, confidence: 'high', category: 'content', reason: `Contains substantive phrase: "${phrase}"` };
      }
    }

    // Rule 3: All words are standalone filler words (max 5 words)
    if (words.length > 0 && words.length <= 5 && words.every(w => FD_FILLER_WORDS.has(w))) {
      return { isFiller: true, confidence: 'high', category: 'filler_word', reason: 'Standalone filler word(s)' };
    }

    // Rule 4: Greeting patterns
    for (const [pattern, reason] of FD_GREETING) {
      if (pattern.test(norm)) {
        return { isFiller: true, confidence: 'high', category: 'greeting', reason };
      }
    }

    // Rule 5: Ritual patterns
    for (const [pattern, reason] of FD_RITUAL) {
      if (pattern.test(norm)) {
        return { isFiller: true, confidence: 'high', category: 'ritual', reason };
      }
    }

    // Rule 6: Hesitation / discourse filler (medium confidence — could be a fragment)
    for (const [pattern, reason] of FD_HESITATION) {
      if (pattern.test(norm)) {
        return { isFiller: true, confidence: 'medium', category: 'hesitation', reason };
      }
    }

    // Rule 7: Affirmation / pure acknowledgement
    for (const [pattern, reason] of FD_AFFIRMATION) {
      if (pattern.test(norm)) {
        return { isFiller: true, confidence: 'high', category: 'affirmation', reason };
      }
    }

    return { isFiller: false, confidence: 'high', category: 'content', reason: 'Substantive content' };
  },

  /**
   * deduplicate(entries, threshold = 0.82)
   *
   * Removes near-identical dialogue entries.
   * Strategy:
   *   - Short lines (≤6 words): normalised Levenshtein distance
   *   - Longer lines: content-word Jaccard (stop words excluded)
   */
  deduplicate(entries, threshold = 0.82) {
    const seen = []; // array of { norm, words } for already-kept lines

    return entries.filter(e => {
      if (e.type !== 'dialogue' && e.type !== 'manual') return true; // keep metadata etc.
      const txt = (e.text || '').trim();
      if (!txt || txt.length < 5) return false; // drop empty lines

      const norm = normalise(txt);
      const words = norm.split(/\s+/).filter(Boolean);

      const isDuplicate = seen.some(prev => {
        if (words.length <= 6 && prev.words.length <= 6) {
          // Short lines: use normalised Levenshtein
          const maxLen = Math.max(norm.length, prev.norm.length);
          if (maxLen === 0) return true;
          const dist = levenshtein(norm, prev.norm);
          return 1 - dist / maxLen >= threshold;
        } else {
          // Longer lines: content-word Jaccard
          return contentJaccard(norm, prev.norm) >= threshold;
        }
      });

      if (!isDuplicate) seen.push({ norm, words });
      return !isDuplicate;
    });
  },

  /**
   * loadProtected()
   * Returns a Set of normalised phrase strings the user has chosen to keep.
   * These are excluded from filler removal regardless of classification.
   */
  loadProtected() {
    try {
      return new Set(JSON.parse(localStorage.getItem('fd_protected') || '[]'));
    } catch {
      return new Set();
    }
  },

  /**
   * saveProtected(set)
   * Persists the protected phrases Set to localStorage.
   */
  saveProtected(set) {
    try {
      localStorage.setItem('fd_protected', JSON.stringify([...set]));
    } catch {
      // localStorage not available — silently ignore
    }
  },
};

export default FillerDetector;
export { normalise };
