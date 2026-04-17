from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Set
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Dictionary mapping meeting_id to a set of active WebSockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str):
        await websocket.accept()
        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = set()
        self.rooms[meeting_id].add(websocket)

    def disconnect(self, websocket: WebSocket, meeting_id: str):
        if meeting_id in self.rooms:
            self.rooms[meeting_id].remove(websocket)
            if not self.rooms[meeting_id]:
                del self.rooms[meeting_id]

    async def broadcast_to_room(self, meeting_id: str, message: dict, sender: WebSocket = None):
        if meeting_id in self.rooms:
            for connection in self.rooms[meeting_id]:
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()

@router.websocket("/ws/capture/{meeting_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str, client_id: str):
    await manager.connect(websocket, meeting_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Broadcast incoming messages to everyone else in the same meeting room
                await manager.broadcast_to_room(meeting_id, message, sender=websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, meeting_id)
