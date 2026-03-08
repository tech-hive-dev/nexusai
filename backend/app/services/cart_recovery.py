"""
Abandoned Cart Recovery Service
────────────────────────────────
Generates 3-step personalized recovery sequences via Claude.
Steps: immediate (step 1), +1 hour (step 2), +24 hours (step 3).
"""
import uuid
from typing import Optional
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from loguru import logger

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.customer import Customer

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

RECOVERY_DELAYS = {
    1: 0,        # immediate
    2: 3600,     # 1 hour
    3: 86400,    # 24 hours
}

DISCOUNT_AT_STEP = {
    2: 0,        # no discount at step 2
    3: 10,       # 10% off at step 3
}


async def create_recovery_sequence(
    tenant_id: str,
    customer_external_id: str,
    channel: str,
    cart_data: dict,
    cart_url: str,
    discount_code: Optional[str] = None,
) -> Optional[str]:
    """
    Create a cart recovery record and schedule the 3-step sequence.
    Returns the recovery_id.
    """
    from app.workers.tasks import send_cart_recovery_message

    async with AsyncSessionLocal() as db:
        # Get or find customer
        result = await db.execute(
            select(Customer).where(
                Customer.tenant_id == uuid.UUID(tenant_id),
                Customer.external_id == customer_external_id,
                Customer.channel == channel,
            )
        )
        customer = result.scalar_one_or_none()
        customer_id = str(customer.id) if customer else None

        # Insert cart recovery record
        recovery_id = str(uuid.uuid4())
        await db.execute(
            text("""
                INSERT INTO cart_recoveries (id, tenant_id, customer_id, cart_data, cart_url, discount_code)
                VALUES (:id, :tenant_id, :customer_id, :cart_data, :cart_url, :discount_code)
            """),
            {
                "id": recovery_id,
                "tenant_id": tenant_id,
                "customer_id": customer_id,
                "cart_data": str(cart_data),  # JSON serialized
                "cart_url": cart_url,
                "discount_code": discount_code,
            },
        )
        await db.commit()

    # Schedule step 1 immediately, steps 2+3 with countdown
    send_cart_recovery_message.apply_async(
        args=[recovery_id, 1],
        countdown=RECOVERY_DELAYS[1],
    )
    send_cart_recovery_message.apply_async(
        args=[recovery_id, 2],
        countdown=RECOVERY_DELAYS[2],
    )
    send_cart_recovery_message.apply_async(
        args=[recovery_id, 3],
        countdown=RECOVERY_DELAYS[3],
    )

    logger.info(f"Cart recovery sequence created: {recovery_id} for tenant {tenant_id}")
    return recovery_id


async def send_recovery_message(recovery_id: str, step: int):
    """Send one step of the cart recovery sequence."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT * FROM cart_recoveries WHERE id = :id"),
            {"id": recovery_id},
        )
        recovery = result.mappings().one_or_none()
        if not recovery:
            logger.warning(f"Recovery {recovery_id} not found")
            return

        if recovery["status"] == "recovered":
            logger.info(f"Recovery {recovery_id} already completed, skipping step {step}")
            return

        # Get tenant and customer info
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.id == recovery["tenant_id"])
        )
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            return

        customer_name = "there"
        customer_phone = None
        if recovery["customer_id"]:
            cust_result = await db.execute(
                select(Customer).where(Customer.id == recovery["customer_id"])
            )
            cust = cust_result.scalar_one_or_none()
            if cust:
                customer_name = cust.name or "there"
                customer_phone = cust.phone or cust.external_id

        import json
        try:
            cart_data = json.loads(recovery["cart_data"]) if isinstance(recovery["cart_data"], str) else recovery["cart_data"]
        except Exception:
            cart_data = {}

        message = await _generate_recovery_message(
            tenant_name=tenant.name,
            agent_name=tenant.agent_name,
            customer_name=customer_name,
            cart_data=cart_data,
            cart_url=recovery["cart_url"],
            step=step,
            discount_code=recovery["discount_code"] if step == 3 else None,
        )

        # Send via WhatsApp if phone available
        if customer_phone:
            from app.api.webhooks import _send_whatsapp_reply
            await _send_whatsapp_reply(customer_phone, message)

        # Update messages_sent count
        await db.execute(
            text("UPDATE cart_recoveries SET messages_sent = :step WHERE id = :id"),
            {"step": step, "id": recovery_id},
        )
        await db.commit()
        logger.info(f"Cart recovery step {step} sent for recovery {recovery_id}")


async def _generate_recovery_message(
    tenant_name: str,
    agent_name: str,
    customer_name: str,
    cart_data: dict,
    cart_url: str,
    step: int,
    discount_code: Optional[str],
) -> str:
    """Use Claude to generate a personalized cart recovery message."""
    items = cart_data.get("items", [])
    total = cart_data.get("total", "")
    currency = cart_data.get("currency", "USD")

    items_text = ", ".join([f"{i.get('name', 'item')} (x{i.get('qty', 1)})" for i in items[:3]])

    step_prompts = {
        1: f"Write a friendly first reminder that the customer left {items_text} in their cart. Keep it warm, not pushy. Under 60 words.",
        2: f"Write a second follow-up (they didn't respond). Mention the items ({items_text}) and total ({total} {currency}). Ask if they had questions. Under 60 words.",
        3: f"Write a final message offering {discount_code or '10%'} off to complete their purchase of {items_text}. Create urgency but stay friendly. Under 70 words.",
    }

    discount_note = f"\nInclude this discount code prominently: {discount_code}" if discount_code else ""

    prompt = f"""You are {agent_name}, the AI assistant for {tenant_name}.
Customer name: {customer_name}
Cart URL: {cart_url}
{step_prompts[step]}{discount_note}

Write ONLY the message text. No labels, no explanation."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude cart recovery generation error: {e}")
        # Fallback message
        return f"Hi {customer_name}! You left some items in your cart. Complete your purchase here: {cart_url}"


async def mark_recovered(tenant_id: str, cart_url: str):
    """Mark a cart as recovered (called when order is placed)."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("""
                UPDATE cart_recoveries
                SET status = 'recovered', recovered_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND cart_url = :cart_url
                  AND status = 'in_progress'
            """),
            {"tenant_id": tenant_id, "cart_url": cart_url},
        )
        await db.commit()
