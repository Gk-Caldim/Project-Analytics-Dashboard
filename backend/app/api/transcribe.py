"""
POST /api/transcribe
====================
Accepts a raw audio file (webm/ogg/wav) recorded by MediaRecorder,
passes it to OpenAI Whisper, and returns the transcribed text.

Used as a fallback when webkitSpeechRecognition is unavailable or aborts.
"""
from __future__ import annotations

import os
import logging
import tempfile
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def transcribe_audio(
    file: UploadFile = File(...),
    speaker: str = Form(default="Speaker"),
):
    """
    Transcribe an audio chunk using OpenAI Whisper.
    Returns: { "text": "...", "speaker": "..." }
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "No OPENAI_API_KEY configured. "
                "Add OPENAI_API_KEY=sk-... to your backend .env file to enable transcription."
            ),
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Empty audio file received.")

    # Determine extension from mime type / filename
    filename = file.filename or "chunk.webm"
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "webm"
    if ext not in ("webm", "ogg", "wav", "mp3", "mp4", "m4a"):
        ext = "webm"

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)

        # Write to a temp file — Whisper API requires a real file object
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            with open(tmp_path, "rb") as audio_file:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="en",
                    response_format="text",
                )
            text = response.strip() if isinstance(response, str) else str(response).strip()
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        logger.info("Transcribed %d bytes → %d chars", len(audio_bytes), len(text))
        return {"text": text, "speaker": speaker}

    except Exception as exc:
        logger.error("Transcription error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")
