import os
import json
import logging
from typing import List, Dict, Any
from openai import OpenAI

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = "gpt-4o-mini" # Fast, cheap, and very capable for MOM tasks

    def generate_mom_intelligence(self, transcript_entries: List[Dict[str, Any]], meeting_title: str) -> Dict[str, Any]:
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
Analyze the following meeting transcript and generate a structured Minutes of Meeting (MOM).

MEETING TITLE: {meeting_title}

TRANSCRIPT:
{transcript_text}

OUTPUT FORMAT (JSON):
{{
  "summary": "A concise executive summary of the meeting.",
  "action_items": [
    {{
      "title": "Short title of the action",
      "description": "Full details of the task",
      "owner": "Name of the person responsible",
      "priority": "Critical|High|Medium|Low",
      "status": "Open|Planned|Closed",
      "due_date": "YYYY-MM-DD (estimate if mentioned, otherwise leave null)"
    }}
  ],
  "decisions": [
    "List of key decisions made during the meeting"
  ],
  "participation_metrics": {{
    "SpeakerName": "Contribution percentage (e.g. 40%)"
  }}
}}

Ensure the output is valid JSON.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {{"role": "system", "content": "You are a professional meeting intelligence engine."}},
                    {{"role": "user", "content": prompt}}
                ],
                response_format={{ "type": "json_object" }}
            )

            result = json.loads(response.choices[0].message.content)
            logger.info("LLMService: Successfully generated MOM for '%s'", meeting_title)
            return result

        except Exception as e:
            logger.error("LLMService error: %s", str(e))
            return self._fallback_intelligence(transcript_entries, str(e))

    def _fallback_intelligence(self, entries: List[Dict], error_msg: str) -> Dict[str, Any]:
        """Simple heuristic fallback if LLM fails."""
        # This can call the existing mom_parser or return a structured error
        return {{
            "summary": f"Failed to generate AI summary. (Error: {error_msg})",
            "action_items": [],
            "decisions": ["Check transcript for manual review."],
            "participation_metrics": {{}}
        }}

llm_service = LLMService()
