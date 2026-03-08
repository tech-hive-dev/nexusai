"""
Webhooks Handler
─────────────────
Receives messages from WhatsApp, Facebook Messenger, Instagram.
Routes them through the AI agent and sends responses back.
"""
from fastapi import APIRouter, Request, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import httpx, json
from loguru import logger

from app.core.database import AsyncSessionLocal
from app.core.config import settings

router = APIRouter()


# ─── WHATSAPP ─────────────────────────────────────────────────
@router.get("/whatsapp/{tenant_slug}")
async def whatsapp_verify(
    tenant_slug: str,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    """WhatsApp webhook verification"""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/whatsapp/{tenant_slug}")
async def whatsapp_incoming(tenant_slug: str, request: Request):
    """Handle incoming WhatsApp messages"""
    try:
        body = await request.json()
        logger.info(f"WhatsApp webhook received for {tenant_slug}: {json.dumps(body)[:200]}")

        # Extract message from WhatsApp payload
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        for msg in messages:
            if msg.get("type") == "text":
                await _process_whatsapp_message(
                    tenant_slug=tenant_slug,
                    from_number=msg["from"],
                    message_text=msg["text"]["body"],
                    message_id=msg["id"],
                )
            elif msg.get("type") == "audio":
                # Voice message — transcribe with Whisper then process as text
                audio_id = msg.get("audio", {}).get("id", "")
                if audio_id:
                    audio_url = await _get_whatsapp_media_url(audio_id)
                    if audio_url:
                        transcribed = await _transcribe_voice(audio_url)
                        if transcribed:
                            await _process_whatsapp_message(
                                tenant_slug=tenant_slug,
                                from_number=msg["from"],
                                message_text=f"[Voice message]: {transcribed}",
                                message_id=msg["id"],
                            )
            elif msg.get("type") == "image":
                # Image message — download and pass to vision agent
                image_id = msg.get("image", {}).get("id", "")
                caption = msg.get("image", {}).get("caption", "")
                if image_id:
                    media_url = await _get_whatsapp_media_url(image_id)
                    if media_url:
                        text_with_context = caption or "What product is this? Can you identify it and help me with it?"
                        await _process_whatsapp_message(
                            tenant_slug=tenant_slug,
                            from_number=msg["from"],
                            message_text=text_with_context,
                            message_id=msg["id"],
                            media_url=media_url,
                        )

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}")
        return {"status": "error"}


async def _get_whatsapp_media_url(media_id: str) -> str:
    """Resolve a WhatsApp media ID to a downloadable URL."""
    if not settings.WHATSAPP_TOKEN:
        return ""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://graph.facebook.com/v18.0/{media_id}",
                headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"},
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json().get("url", "")
    except Exception as e:
        logger.error(f"Media URL fetch failed: {e}")
    return ""


async def _process_whatsapp_message(
    tenant_slug: str, from_number: str, message_text: str, message_id: str,
    media_url: str = "",
):
    """Process WhatsApp message through the agent"""
    from app.api.chat import send_message
    from app.api.chat import ChatRequest

    async with AsyncSessionLocal() as db:
        from app.models.tenant import Tenant
        from sqlalchemy import select
        result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant = result.scalar_one_or_none()
        
        request = ChatRequest(
            message=message_text,
            tenant_slug=tenant_slug,
            channel="whatsapp",
            customer_external_id=from_number,
            media_url=media_url or None,
        )

        response = await send_message(request, db)

        if response.response:
            # 1. Send text reply (primary)
            await _send_whatsapp_reply(from_number, response.response)
            
            # 2. Optionally send voice reply if enabled
            if tenant and getattr(tenant, "voice_replies_enabled", False):
                from app.services.voice import send_voice_reply
                await send_voice_reply(from_number, response.response)


async def _send_whatsapp_reply(to_number: str, message: str):
    """Send message back via WhatsApp API"""
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        logger.warning("WhatsApp credentials not configured")
        return

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_ID}/messages",
            headers={
                "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": to_number,
                "type": "text",
                "text": {"body": message},
            },
        )
        if response.status_code != 200:
            logger.error(f"WhatsApp send failed: {response.text}")


# ─── FACEBOOK MESSENGER ───────────────────────────────────────
@router.get("/facebook/{tenant_slug}")
async def facebook_verify(
    tenant_slug: str,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403)


@router.post("/facebook/{tenant_slug}")
async def facebook_incoming(tenant_slug: str, request: Request):
    """Handle Facebook Messenger messages"""
    try:
        body = await request.json()
        for entry in body.get("entry", []):
            for messaging in entry.get("messaging", []):
                if "message" in messaging and "text" in messaging["message"]:
                    sender_id = messaging["sender"]["id"]
                    message_text = messaging["message"]["text"]

                    from app.api.chat import ChatRequest, send_message
                    async with AsyncSessionLocal() as db:
                        req = ChatRequest(
                            message=message_text,
                            tenant_slug=tenant_slug,
                            channel="facebook",
                            customer_external_id=sender_id,
                        )
                        response = await send_message(req, db)

                    if response.response:
                        await _send_facebook_reply(sender_id, response.response)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Facebook webhook error: {e}")
        return {"status": "error"}


async def _send_facebook_reply(recipient_id: str, message: str):
    if not settings.WHATSAPP_TOKEN:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://graph.facebook.com/v18.0/me/messages",
            params={"access_token": settings.WHATSAPP_TOKEN},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message},
            },
        )


# ─── STRIPE ───────────────────────────────────────────────────
@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe subscription events"""
    import stripe
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select, update
        from app.models.tenant import Tenant

        if event["type"] == "customer.subscription.created":
            sub = event["data"]["object"]
            plan = _get_plan_from_price(sub.get("items", {}).get("data", [{}])[0].get("price", {}).get("id"))
            await db.execute(
                update(Tenant)
                .where(Tenant.stripe_subscription_id == sub["id"])
                .values(plan=plan, plan_status="active")
            )
            await db.commit()

        elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
            sub = event["data"]["object"]
            await db.execute(
                update(Tenant)
                .where(Tenant.stripe_subscription_id == sub["id"])
                .values(plan_status="cancelled")
            )
            await db.commit()

        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]
            await db.execute(
                update(Tenant)
                .where(Tenant.stripe_customer_id == invoice["customer"])
                .values(plan_status="past_due")
            )
            await db.commit()

        elif event["type"] == "payment_intent.succeeded":
            pi = event["data"]["object"]
            metadata = pi.get("metadata", {})
            conversation_id = metadata.get("conversation_id")
            customer_id = metadata.get("customer_id")
            tenant_id = metadata.get("tenant_id")

            if conversation_id and tenant_id:
                # Record payment transaction
                await db.execute(
                    text("""
                        INSERT INTO payment_transactions
                            (tenant_id, conversation_id, customer_id, stripe_payment_intent_id, amount, currency, status)
                        VALUES (:tenant_id, :conv_id, :cust_id, :pi_id, :amount, :currency, 'succeeded')
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "tenant_id": tenant_id,
                        "conv_id": conversation_id,
                        "cust_id": customer_id,
                        "pi_id": pi["id"],
                        "amount": pi["amount"] / 100,
                        "currency": pi.get("currency", "usd").upper(),
                    },
                )
                await db.commit()

                # Send WhatsApp confirmation to customer
                if customer_id:
                    cust_result = await db.execute(
                        text("SELECT phone, external_id, name FROM customers WHERE id = :id"),
                        {"id": customer_id},
                    )
                    cust = cust_result.mappings().one_or_none()
                    if cust:
                        phone = cust["phone"] or cust["external_id"]
                        amount_str = f"{pi['amount'] / 100:.2f} {pi.get('currency', 'USD').upper()}"
                        await _send_whatsapp_reply(
                            phone,
                            f"✅ Payment confirmed! We received {amount_str}. "
                            f"Thank you, {cust['name'] or 'valued customer'}! Your order is being processed.",
                        )

    return {"status": "ok"}


def _get_plan_from_price(price_id: str) -> str:
    if price_id == settings.STRIPE_STARTER_PRICE_ID:
        return "starter"
    elif price_id == settings.STRIPE_GROWTH_PRICE_ID:
        return "growth"
    elif price_id == settings.STRIPE_BUSINESS_PRICE_ID:
        return "business"
    return "starter"


# ─── SHOPIFY CART ABANDONMENT ──────────────────────────────────
@router.post("/shopify/{tenant_slug}/cart-abandon")
async def shopify_cart_abandon(tenant_slug: str, request: Request):
    """Handle Shopify cart/update webhook for abandonment recovery."""
    import hmac, hashlib, base64
    from app.core.config import settings

    body: bytes = await request.body()

    # Validate HMAC signature
    if settings.SHOPIFY_WEBHOOK_SECRET:
        sig = request.headers.get("X-Shopify-Hmac-Sha256", "")
        digest = base64.b64encode(
            hmac.new(settings.SHOPIFY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).digest()
        ).decode()
        if not hmac.compare_digest(sig, digest):
            raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    try:
        data = json.loads(body.decode("utf-8"))
        cart_token = data.get("token", "")
        line_items = data.get("line_items", [])

        if not line_items:
            return {"status": "ok", "action": "empty_cart_ignored"}

        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            from app.models.tenant import Tenant
            result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
            tenant = result.scalar_one_or_none()
            if not tenant:
                raise HTTPException(status_code=404, detail="Tenant not found")

        cart_data = {
            "items": [
                {
                    "name": item.get("title", "Product"),
                    "qty": item.get("quantity", 1),
                    "price": item.get("price", "0"),
                    "sku": item.get("sku", ""),
                }
                for item in line_items
            ],
            "total": data.get("total_price", "0"),
            "currency": data.get("currency", "USD"),
        }

        customer_info = data.get("customer", {})
        customer_phone = customer_info.get("phone", "")
        cart_url = f"https://{data.get('domain', '')}/cart/{cart_token}"

        if customer_phone:
            from app.services.cart_recovery import create_recovery_sequence
            await create_recovery_sequence(
                tenant_id=str(tenant.id),
                customer_external_id=customer_phone,
                channel="whatsapp",
                cart_data=cart_data,
                cart_url=cart_url,
            )

        return {"status": "ok", "action": "recovery_scheduled"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shopify cart webhook error: {e}")
        return {"status": "error"}


@router.post("/woocommerce/{tenant_slug}/cart-abandon")
async def woocommerce_cart_abandon(tenant_slug: str, request: Request):
    """Handle WooCommerce cart abandonment webhook."""
    try:
        data = await request.json()
        line_items = data.get("line_items", [])

        if not line_items:
            return {"status": "ok"}

        async with AsyncSessionLocal() as db:
            from sqlalchemy import select
            from app.models.tenant import Tenant
            result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
            tenant = result.scalar_one_or_none()
            if not tenant:
                raise HTTPException(status_code=404)

        cart_data = {
            "items": [
                {"name": item.get("name", "Product"), "qty": item.get("quantity", 1), "price": item.get("total", "0")}
                for item in line_items
            ],
            "total": data.get("total", "0"),
            "currency": data.get("currency", "USD"),
        }

        customer_phone = data.get("billing", {}).get("phone", "")
        cart_url = data.get("cart_url", "")

        if customer_phone and cart_url:
            from app.services.cart_recovery import create_recovery_sequence
            await create_recovery_sequence(
                tenant_id=str(tenant.id),
                customer_external_id=customer_phone,
                channel="whatsapp",
                cart_data=cart_data,
                cart_url=cart_url,
            )

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"WooCommerce cart webhook error: {e}")
        return {"status": "error"}


async def _transcribe_voice(audio_url: str) -> str:
    """Transcribe voice message using OpenAI Whisper"""
    if not settings.OPENAI_API_KEY:
        return ""
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        async with httpx.AsyncClient() as http:
            response = await http.get(audio_url, headers={"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"})
            audio_data = response.content

        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=("audio.ogg", audio_data, "audio/ogg"),
        )
        return transcript.text
    except Exception as e:
        logger.error(f"Whisper transcription error: {e}")
        return ""
