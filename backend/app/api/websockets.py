from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Set, Optional
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # Dictionary mapping meeting_id to a set of active WebSockets
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Global active connections for system-wide broadcasts (like Dashboard notifications)
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, meeting_id: Optional[str] = None):
        await websocket.accept()
        if meeting_id:
            if meeting_id not in self.rooms:
                self.rooms[meeting_id] = set()
            self.rooms[meeting_id].add(websocket)
        else:
            self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket, meeting_id: Optional[str] = None):
        if meeting_id:
            if meeting_id in self.rooms and websocket in self.rooms[meeting_id]:
                self.rooms[meeting_id].remove(websocket)
                if not self.rooms[meeting_id]:
                    del self.rooms[meeting_id]
        else:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast_to_room(self, meeting_id: str, message: dict, sender: Optional[WebSocket] = None):
        if meeting_id in self.rooms:
            # Convert to list to avoid runtime errors if connections disconnect mid-loop
            for connection in list(self.rooms[meeting_id]):
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def broadcast(self, message: dict):
        """Broadcasts to all system-wide connected clients."""
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")

manager = ConnectionManager()

# NOTE: More specific routes must come BEFORE wildcard routes in FastAPI
@router.websocket("/capture/{meeting_id}/{client_id}")
async def capture_websocket_endpoint(websocket: WebSocket, meeting_id: str, client_id: str):
    """Room-based WebSocket for MeetingCapture live collaboration."""
    await manager.connect(websocket, meeting_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await manager.broadcast_to_room(meeting_id, message, sender=websocket)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, meeting_id)

@router.websocket("/status/{client_id}")
async def global_websocket_endpoint(websocket: WebSocket, client_id: str):
    """Global WebSocket for system-wide notifications (MOM_SAVED, etc.)."""
    logger.info(f"WS Attempt: {client_id}")
    await manager.connect(websocket)
    try:
        logger.info(f"WS Connected: {client_id}")
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"WS Disconnected: {client_id}")
        manager.disconnect(websocket)
