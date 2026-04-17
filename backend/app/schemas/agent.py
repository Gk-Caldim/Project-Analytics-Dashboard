from pydantic import BaseModel
from typing import Optional, List, Any

class AgentChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    chat_history: Optional[List[dict]] = None

class AgentChatResponse(BaseModel):
    response: str
    context_used: Optional[dict] = None
    suggestions: Optional[List[str]] = None
    action: Optional[dict] = None # { "type": "NAVIGATE", "target": "/path" }
