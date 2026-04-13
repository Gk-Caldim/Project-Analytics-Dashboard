import re
from datetime import date, timedelta
from typing import List, Dict, Optional, Any

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
