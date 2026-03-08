"""
Voice Service
─────────────
ElevenLabs TTS for generating voice replies (premium feature).
Used when tenant.voice_replies_enabled is True.
"""
import httpx
from loguru import logger
from app.core.config import settings


async def text_to_speech(text: str, voice_id: str | None = None) -> bytes | None:
    """
    Convert text to speech using ElevenLabs API.
    Returns raw MP3 audio bytes, or None if unavailable.
    """
    if not settings.ELEVENLABS_API_KEY:
        logger.warning("ElevenLabs API key not configured")
        return None

    vid = voice_id or "21m00Tcm4TlvDq8ikWAM"  # default: Rachel

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.0,
                        "use_speaker_boost": True,
                    },
                },
            )
            if resp.status_code == 200:
                return resp.content
            logger.error(f"ElevenLabs TTS failed: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
    return None


async def send_voice_reply(
    to_number: str,
    text: str,
    voice_id: str | None = None,
) -> bool:
    """
    Generate TTS audio and send as WhatsApp voice message.
    Falls back to text message if TTS fails.
    """
    audio_bytes = await text_to_speech(text, voice_id)
    if not audio_bytes:
        return False

    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        return False

    try:
        # 1. Upload audio to WhatsApp media endpoint
        async with httpx.AsyncClient(timeout=30) as client:
            upload_resp = await client.post(
                f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_ID}/media",
                headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                files={
                    "file": ("voice.mp3", audio_bytes, "audio/mpeg"),
                    "messaging_product": (None, "whatsapp"),
                    "type": (None, "audio/mpeg"),
                },
            )
            if upload_resp.status_code != 200:
                logger.error(f"WhatsApp media upload failed: {upload_resp.text[:200]}")
                return False
            media_id = upload_resp.json().get("id")
            if not media_id:
                return False

        # 2. Send as audio message
        async with httpx.AsyncClient(timeout=15) as client:
            send_resp = await client.post(
                f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_ID}/messages",
                headers={
                    "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": to_number,
                    "type": "audio",
                    "audio": {"id": media_id},
                },
            )
            if send_resp.status_code == 200:
                logger.info(f"Voice reply sent to {to_number}")
                return True
            logger.error(f"WhatsApp voice send failed: {send_resp.text[:200]}")
    except Exception as e:
        logger.error(f"Voice reply error: {e}")
    return False
