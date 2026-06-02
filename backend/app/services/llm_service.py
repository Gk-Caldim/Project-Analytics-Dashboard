import os
import json
import logging
from typing import List, Dict, Any
from openai import OpenAI

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get("OPENAI_API_KEY")
        # Support for OpenRouter if key is sk-or-...
        base_url = None
        if self.api_key and self.api_key.startswith("sk-or-"):
            base_url = "https://openrouter.ai/api/v1"
            logger.info("LLMService: OpenRouter key detected, setting base_url")
            
        self.client = OpenAI(api_key=self.api_key, base_url=base_url) if self.api_key else None
        self.model = "gpt-4o-mini" # Fast, cheap, and very capable for MOM tasks

    def generate_mom_intelligence(self, transcript_entries: List[Dict[str, Any]], meeting_title: str, project_name: str = "Unknown Project") -> Dict[str, Any]:
        """
        Processes a raw meeting transcript and returns structured MOM intelligence.
        """
        if not self.client:
            logger.error("LLMService: OpenAI API key missing")
            return self._fallback_intelligence(transcript_entries, "API Key Missing")

        # Prepare transcript for prompt
        transcript_text = ""
        for entry in transcript_entries:
            speaker = entry.get("speaker", "Unknown")
            text = entry.get("text", "")
            time = entry.get("time", "")
            transcript_text += f"[{time}] {speaker}: {text}\n"

        prompt = f"""
You are an expert project manager and executive assistant. 
Analyze the following meeting transcript and generate a high-fidelity Minutes of Meeting (MOM) in JSON format.

PROJECT: {project_name}
SESSION: {meeting_title}

GOALS:
1. Extract professionally worded action items from the discussion.
2. Group related points into clear, actionable tasks.
3. Identify key decisions made during the session.
4. Capture the essence of the meeting even if the tone is informal.

RULES:
1. CONVERT casual conversation or filler talk into professional business language.
2. DO NOT use raw transcript snippets or quotes as titles; interpret the intent instead.
3. Distill discussions into clear, actionable tasks (e.g., "Prepare Q2 Budget Report" instead of "I think we should do the report").
4. Ensure every action item has a logical 'owner' and 'criticality' (Low, Medium, High, Critical).

OUTPUT FORMAT (JSON):
{{
  "summary": "A concise executive summary of the meeting highlights (2-3 sentences)",
  "action_items": [
    {{
      "title": "Professional task title",
      "description": "Context and specific requirements",
      "owner": "Specific name or 'Everyone'",
      "criticality": "Critical/High/Medium/Low"
    }}
  ],
  "decisions": ["Professional decision statement 1", "Professional decision statement 2"],
  "participation_metrics": {{
    "SpeakerName": "Contribution percentage (e.g. 40%)"
  }}
}}

Ensure the output is valid JSON and only contains the requested intelligence.

TRANSCRIPT:
{transcript_text}
"""

        try:
            system_prompt = """You are a professional meeting intelligence engine.

You are extracting ONLY genuine action items from a meeting transcript.

STRICT RULES for what qualifies as an action item:
1. Must be a concrete task, commitment, or decision assigned to a person
2. Must contain a clear verb of action: "will", "shall", "to", "send", 
   "update", "review", "schedule", "prepare", "confirm", "follow up"
3. Must be actionable by a specific person

EXCLUDE these categories completely — do not return them as action items:
- Greetings and check-ins ("Can you all hear me", "Good morning")
- Closing remarks ("Thanks everyone", "Enjoy your Monday", "See you")
- Questions with no answer or commitment ("Any other quick things?")
- Status updates that contain no task ("We're 60% done")  
- Opinions or concerns with no action ("There's no way this makes Q2")
- Raw transcript metadata lines ("[Meeting ended", "[Meeting started",
  "Action items (auto-detected)")
- Filler affirmations ("Yep", "Same", "Good to go", "Sounds good")

For RESPONSIBILITY: 
- Only assign a person if their name is EXPLICITLY mentioned in the 
  transcript as the person doing the task.
- If no person is mentioned, return responsibility as null or empty string.
- NEVER assign the meeting organizer or logged-in user as a default.

For DUE DATE:
- Only set a due_date if a specific date, day, or deadline is 
  EXPLICITLY mentioned in the transcript for that action item.
- "by Wednesday", "end of June", "before EOD today" are valid.
- If no date is mentioned for the item, return due_date as null.
- NEVER generate or infer a date that is not stated in the transcript.

Return a JSON object containing an action_items array only.
Each item: { title, description, owner, department, due_date }
If no genuine action items exist, return an empty array []."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={ "type": "json_object" }
            )

            result = json.loads(response.choices[0].message.content)
            logger.info("LLMService: Successfully generated MOM for '%s'", meeting_title)
            return result

        except Exception as e:
            logger.error("LLMService error: %s", str(e))
            return self._fallback_intelligence(transcript_entries, str(e))

    def _fallback_intelligence(self, entries: List[Dict], error_msg: str) -> Dict[str, Any]:
        """Simple heuristic fallback if LLM fails."""
        # Avoid returning instructional text as 'data' rows
        return {
            "summary": f"Could not generate AI intelligence. Please review the transcript manually. (Source: {error_msg})",
            "action_items": [],
            "decisions": [],
            "participation_metrics": {},
            "error": error_msg
        }

llm_service = LLMService()
