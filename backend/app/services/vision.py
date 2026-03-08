"""
Vision Service
──────────────
Downloads images from WhatsApp/URLs and converts them to base64
for Claude's multimodal image analysis.
"""
import base64
from loguru import logger
import httpx

from app.core.config import settings


async def download_and_encode(image_url: str, auth_token: str | None = None) -> tuple[str, str]:
    """
    Download an image from a URL and return (base64_data, media_type).
    For WhatsApp CDN URLs, pass auth_token = WHATSAPP_TOKEN.
    Returns ("", "") on failure.
    """
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(image_url, headers=headers)
            if resp.status_code != 200:
                logger.warning(f"Image download failed: HTTP {resp.status_code} for {image_url[:80]}")
                return "", ""

            content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
            # Normalize to supported Claude media types
            if content_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
                content_type = "image/jpeg"

            encoded = base64.standard_b64encode(resp.content).decode("utf-8")
            return encoded, content_type
    except Exception as e:
        logger.error(f"Image download error: {e}")
        return "", ""


def build_image_content_block(base64_data: str, media_type: str) -> dict:
    """Build a Claude API image content block."""
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": base64_data,
        },
    }
