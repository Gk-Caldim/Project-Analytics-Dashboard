from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.agent import AgentChatRequest, AgentChatResponse
from app.services.agent_service import AgentService

router = APIRouter()

@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(
    request: AgentChatRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        response_text, action = await AgentService.process_chat(
            db=db, 
            message=request.message, 
            context=request.context,
            current_user=current_user
        )
        
        suggestions = AgentService.get_suggestions(request.message)
        
        return AgentChatResponse(
            response=response_text,
            action=action, # Include navigation/commands
            context_used=request.context,
            suggestions=suggestions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
