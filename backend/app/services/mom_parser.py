import re
from datetime import date, timedelta
from typing import List, Dict, Optional, Any

# ── Filler / noise word sets (mirrors frontend isNoiseLine) ──────────────────
_FILLER_EXACT = {
    # Social acknowledgements
    'thanks', 'thank you', 'thanks everyone', 'thank you everyone', 'thank you all',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'hello', 'hello everyone', 'hi', 'hi everyone', 'hey', 'hey everyone',
    'bye', 'goodbye', 'see you', 'see you later', 'take care', 'talk soon',
    'have a good day', 'have a great day', 'enjoy your day',
    # Affirmations
    'ok', 'okay', 'yes', 'no', 'yep', 'nope', 'yeah', 'yah', 'nah',
    'sure', 'alright', 'right', 'correct', 'exactly', 'absolutely', 'definitely',
    'agreed', 'agree', 'makes sense', 'that makes sense', 'fair enough',
    'got it', 'understood', 'noted', 'sounds good', 'sounds great',
    'perfect', 'great', 'nice', 'awesome', 'cool', 'wow', 'wonderful', 'excellent',
    'good point', 'good call', 'good idea',
    "i'll get back to you", "will get back to you", "i will get back to you",
    "you're welcome", 'welcome', 'no problem', 'no worries', 'of course',
    # Filler sounds
    'uh', 'um', 'hmm', 'erm', 'er',
    # Meeting rituals
    "let's get started", "let's go ahead", "let's go ahead and get started",
    "let's begin", "let's start", 'shall we start', 'shall we begin',
    'can you hear me', 'can everyone hear me', 'is everyone on', 'is everyone here',
    'are you there', 'checking audio', 'mic check',
    'just a moment', 'one moment please', 'hold on', 'hold on a second',
    'give me a second', 'one second', 'just a second', 'let me think',
    'sorry i was on mute', 'i was muted', 'you were on mute', 'you are on mute',
    # Transition closers
    'any questions', 'any other questions', 'anything else', 'that is all', 'that is it',
    'i think that covers it', 'i think we are done', 'we are good',
    'alright then', 'okay then', 'great then', 'perfect then',
}

_FILLER_SYMBOL_RE = re.compile(r'^[-–—=*_#.\s]{2,}$|^\d+\.?$|^\[.{0,20}\]$|^(\w)\1{3,}$')

_FILLER_PREFIX_RE = re.compile(
    r'^(i\s+think\s+|i\s+believe\s+|i\s+feel\s+like|just\s+checking|'
    r'before\s+we\s+(start|begin)|anyway\b|moving\s+on\b|by\s+the\s+way\b|'
    r'you\s+know\b|i\s+mean\b|kind\s+of\b|sort\s+of\b|basically\b|'
    r'literally\b|honestly\b|so\s+yeah\b|so\s+anyway\b|alright\s+so\b|okay\s+so\b)',
    re.IGNORECASE
)

_SUBSTANCE_RE = re.compile(
    r'\b(api|bug|fix|deploy|build|review|update|create|send|share|schedule|test|'
    r'block|issue|deadline|pr|commit|merge|release|feature|report|document|dashboard|'
    r'database|backend|frontend|server|client|budget|scope|plan|roadmap|sprint|'
    r'milestone|assign|owner|priority|critical|urgent|blocker|launch|risk|dependency|'
    r'module|endpoint|pipeline|ticket|jira|slack|email|call|demo|poc|mvp|'
    r'integration|migration|refactor|design|ux|ui|figma)\b',
    re.IGNORECASE
)


def is_filler_fragment(text: str) -> bool:
    """
    Returns True when *text* is a conversational noise/filler fragment that
    should NOT become a MOM action item.

    Uses a 3-tier scoring system (score >= 3 → filler):
      +2  exact match in canonical filler set
      +2  filler prefix opener detected
      +1  symbol / formatting noise
      +1  very short (≤2 words) with no substance
      +1  short (3–4 words) with no substance
      Hard veto: substance keyword found → always returns False
    """
    if not text:
        return True
    t = text.strip()
    if len(t) < 4:
        return True
    if len(t) >= 120:
        return False

    normalised = re.sub(r'[.!?,;:]+$', '', t.lower()).strip()
    words = [w for w in normalised.split() if w]
    word_count = len(words)

    # Hard veto: substance detected
    if _SUBSTANCE_RE.search(normalised):
        return False

    score = 0
    if normalised in _FILLER_EXACT:
        score += 2
    if _FILLER_SYMBOL_RE.match(t):
        score += 1
    if _FILLER_PREFIX_RE.match(normalised[:80]):
        score += 2
    if word_count <= 2:
        score += 1
    elif word_count <= 4:
        score += 1

    return score >= 3


def split_mom_action(text: str, default_due_date: Optional[date] = None, default_owner: str = "") -> List[Dict[str, Any]]:
    """
    Intelligently splits a MOM action string into multiple sub-actions using:
    - sentence breaks (.)
    - speaker changes (e.g. 'John:')
    - keywords ('pending', 'will', 'need', 'blocked', 'delay')
    """
    if not text:
        return []
        
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 1. Dots \.\s+|\.\s*$
    # 2. Lookahead for Speaker names: (?:^|\s+)(?=[A-Z][a-zA-Z\s]{0,20}:\s+)
    # 3. Lookahead for action-oriented keywords
    split_pattern = r'\.\s+|\.\s*$|(?:^|\s+)(?=[A-Z][a-zA-Z\s]{0,20}:\s+)|\s+(?=[Ww]ill\b|[Nn]eed\b|[Bb]locked\b|[Dd]elay\b)'
    
    raw_fragments = re.split(split_pattern, text)
    
    results = []
    today = date.today()
    current_speaker = default_owner
    
    for frag in raw_fragments:
        if not frag:
            continue
            
        frag = frag.strip()
        if len(frag) < 3:
            continue

        # Skip filler/noise fragments before any further processing
        if is_filler_fragment(frag):
            continue
            
        # Extract speaker from this fragment if present
        speaker_match = re.match(r'^([A-Z][a-zA-Z\s]{0,20}):(?:\s+(.*)|$)', frag)
        if speaker_match:
            current_speaker = speaker_match.group(1).strip()
            frag = speaker_match.group(2)
            if frag is not None:
                frag = frag.strip()
            else:
                frag = ""
            
        if not frag or len(frag) < 3:
            continue

        # Re-check after stripping speaker prefix
        if is_filler_fragment(frag):
            continue

        derived_due_date = default_due_date
        frag_lower = frag.lower()
        
        # Simple date heuristic based on the current context chunk
        if "tomorrow" in frag_lower:
            derived_due_date = today + timedelta(days=1)
        elif "today" in frag_lower:
            derived_due_date = today
        elif "next week" in frag_lower:
            derived_due_date = today + timedelta(days=7)
            
        # Clean up the fragment by dropping filler preamble 
        # (e.g. "will share..." -> "share...")
        clean_frag = re.sub(r'(?i)^(we\s+will|i\s+will|will|we\s+need\s+to|i\s+need\s+to|need\s+to|need)\s+', '', frag).strip()
        
        if clean_frag and len(clean_frag) >= 3:
            # Determine status
            derived_status = "Open"
            if any(w in frag_lower for w in ["completed", "done"]):
                derived_status = "Closed"
            elif any(w in frag_lower for w in ["will", "plan"]):
                derived_status = "Planned"
            elif any(w in frag_lower for w in ["pending", "blocked", "delay"]):
                derived_status = "Open"
                
            # Determine priority
            derived_priority = "Medium"
            if any(w in frag_lower for w in ["critical", "blocker"]):
                derived_priority = "High"

            # Title case first char
            clean_frag = clean_frag[0].upper() + clean_frag[1:]
            
            title_50 = clean_frag[:50]
            
            results.append({
                "title": title_50,
                "description": frag,
                "due_date": derived_due_date,
                "owner": current_speaker or "Unassigned",
                "status": derived_status,
                "priority": derived_priority
            })
            
    return results

