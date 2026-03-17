"""
WhatsApp Sender — thin wrapper around the webhooks helper.
Used by services that need to send outbound WhatsApp messages.
"""
from loguru import logger


async def send_text_message(to: str, message: str) -> bool:
    """Send a plain-text WhatsApp message to a phone number."""
    try:
        from app.api.webhooks import _send_whatsapp_reply
        await _send_whatsapp_reply(to, message)
        return True
    except Exception as e:
        logger.error(f"WhatsApp send failed to {to}: {e}")
        return False
