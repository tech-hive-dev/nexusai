"""
Email Channel Reader Service
─────────────────────────────
Polls Gmail/Outlook inboxes via OAuth2 IMAP for new customer inquiries.
Routes incoming emails to the Chat API as new messages.
"""
from loguru import logger
from sqlalchemy import text
from datetime import datetime
import asyncio
import httpx

async def poll_all_email_channels(AsyncSessionLocal):
    """
    Background job to poll all active email channels across all tenants.
    Runs every few minutes via Celery beat.
    """
    async with AsyncSessionLocal() as db:
        # 1. Fetch active email channel configs
        result = await db.execute(
            text("""
                SELECT id, tenant_id, config
                FROM channel_configs
                WHERE channel_type = 'email' AND is_active = True
            """)
        )
        channels = result.mappings().all()
        
        for ch in channels:
            try:
                await _poll_channel(ch, db)
            except Exception as e:
                logger.error(f"Failed to poll email channel {ch['id']}: {e}")

async def _poll_channel(channel_data, db):
    """Polls a single email channel (Gmail or Outlook)."""
    config = channel_data["config"]
    provider = config.get("provider") # 'gmail' | 'outlook'
    refresh_token = config.get("refresh_token")
    
    if not refresh_token:
        logger.warning(f"No refresh token for email channel {channel_data['id']}")
        return

    # 1. Refresh access token
    access_token = await _refresh_oauth_token(provider, refresh_token)
    if not access_token:
        return

    # 2. Fetch new messages (Pseudo-code for IMAP over HTTP or specific API)
    # Using Gmail/Outlook REST APIs is preferred over IMAP for OAuth.
    if provider == "gmail":
        new_emails = await _fetch_gmail_messages(access_token, config.get("last_history_id"))
    else:
        new_emails = await _fetch_outlook_messages(access_token, config.get("last_delta_link"))

    # 3. Route to Chat API
    for email in new_emails:
        await _route_email_to_chat(email, channel_data["tenant_id"], db)

async def _refresh_oauth_token(provider, refresh_token):
    """Refreshes OAuth2 access token via provider's token endpoint."""
    # Logic for Google/Microsoft token endpoints
    # Requires client_id / client_secret in settings
    return "mock_access_token"

async def _fetch_gmail_messages(token, last_id):
    """Calls Gmail API users.messages.list."""
    return []

async def _fetch_outlook_messages(token, delta_link):
    """Calls Microsoft Graph API mailFolders/messages/delta."""
    return []

async def _route_email_to_chat(email_data, tenant_id, db):
    """Converts email into a ChatRequest and calls the internal message handler."""
    from app.api.chat import send_message, ChatRequest
    
    request = ChatRequest(
        message=email_data["body"],
        tenant_slug=email_data["tenant_slug"],
        channel="email",
        customer_external_id=email_data["from_email"],
        customer_name=email_data["from_name"],
        customer_email=email_data["from_email"]
    )
    # Note: send_message is an endpoint, we might want to refactor the core logic
    # out of the endpoint into a service to call it more cleanly from here.
    # For now, we'll assume a shared service 'app.services.chat.process_message'.
    pass
