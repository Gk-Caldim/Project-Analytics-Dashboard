from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.chat_history import ChatHistory
from pydantic import BaseModel

router = APIRouter(prefix="/chats", tags=["Chats"])

class ChatUpdate(BaseModel):
    chat_id: str
    title: str
    messages: List[dict]
    user_email: str
    pinned: bool = False

@router.get("/")
def get_chats(user_email: str, db: Session = Depends(get_db)):
    return db.query(ChatHistory).filter(ChatHistory.user_email == user_email).order_by(ChatHistory.pinned.desc(), ChatHistory.timestamp.desc()).all()

@router.post("/save")
def save_chat(chat: ChatUpdate, db: Session = Depends(get_db)):
    existing_chat = db.query(ChatHistory).filter(ChatHistory.chat_id == chat.chat_id).first()
    
    if existing_chat:
        existing_chat.title = chat.title
        existing_chat.messages = chat.messages
        existing_chat.pinned = chat.pinned
        existing_chat.updated_at = datetime.utcnow()
    else:
        new_chat = ChatHistory(
            chat_id=chat.chat_id,
            user_email=chat.user_email,
            title=chat.title,
            messages=chat.messages,
            pinned=chat.pinned
        )
        db.add(new_chat)
    
    db.commit()
    return {"status": "success"}

@router.post("/rename")
def rename_chat(data: dict, db: Session = Depends(get_db)):
    chat_id = data.get("chat_id")
    new_title = data.get("title")
    chat = db.query(ChatHistory).filter(ChatHistory.chat_id == chat_id).first()
    if chat:
        chat.title = new_title
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Chat not found")

@router.post("/toggle-pin")
def toggle_pin(data: dict, db: Session = Depends(get_db)):
    chat_id = data.get("chat_id")
    chat = db.query(ChatHistory).filter(ChatHistory.chat_id == chat_id).first()
    if chat:
        chat.pinned = not chat.pinned
        db.commit()
        return {"status": "success", "pinned": chat.pinned}
    raise HTTPException(status_code=404, detail="Chat not found")

@router.delete("/{chat_id}")
def delete_chat(chat_id: str, db: Session = Depends(get_db)):
    chat = db.query(ChatHistory).filter(ChatHistory.chat_id == chat_id).first()
    if chat:
        db.delete(chat)
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Chat not found")
