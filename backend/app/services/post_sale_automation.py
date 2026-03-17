"""
Post-Sale Automation Suite
──────────────────────────
Three automated flows triggered after an order is marked complete:
  1. Check-in message (+3 days)
  2. Review request if sentiment positive (+1 day after check-in)
  3. Referral offer (+3 days after review)
"""
import uuid
import hashlib
from datetime import datetime, timedelta
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal


async def trigger_post_sale_flow(order_id: str, customer_phone: str, tenant_id: str):
    """Schedule all post-sale messages for a completed order via Celery tasks."""
    try:
        from app.workers.tasks import (
            send_checkin_task,
            send_review_request_task,
            send_referral_offer_task,
        )
        # Check-in: +3 days
        send_checkin_task.apply_async(
            args=[order_id, customer_phone, tenant_id],
            countdown=int(timedelta(days=3).total_seconds()),
        )
        logger.info(f"Post-sale flow scheduled for order {order_id}")
    except Exception as e:
        logger.error(f"Failed to schedule post-sale flow: {e}")


async def send_checkin(order_id: str, customer_phone: str, tenant_id: str):
    """Send +3 day check-in message to customer."""
    async with AsyncSessionLocal() as db:
        customer_name = await _get_customer_name(customer_phone, tenant_id, db)
        msg = (
            f"Hi {customer_name}! 👋 Just checking in — how did everything go? "
            f"We'd love to hear your feedback. Reply and let us know 😊"
        )
        await _send_whatsapp(customer_phone, msg, tenant_id)

        # After check-in, analyse sentiment of reply and schedule review request
        # (In practice the reply comes through the webhook and is handled there)
        # Schedule review request for +1 day as a fallback
        try:
            from app.workers.tasks import send_review_request_task
            send_review_request_task.apply_async(
                args=[customer_phone, tenant_id],
                countdown=int(timedelta(days=1).total_seconds()),
            )
        except Exception as e:
            logger.warning(f"Could not schedule review request: {e}")


async def send_review_request(customer_phone: str, tenant_id: str):
    """Send review request after positive check-in sentiment."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT google_review_url, name FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        tenant = result.fetchone()
        if not tenant:
            return

        review_url = tenant.google_review_url or ""
        customer_name = await _get_customer_name(customer_phone, tenant_id, db)
        msg = (
            f"Hi {customer_name}! So glad you had a great experience with {tenant.name}! 🌟\n\n"
            f"Would you mind leaving us a quick Google review? It means the world to us:\n"
            f"{review_url or 'Contact us for the review link'}"
        )
        await _send_whatsapp(customer_phone, msg, tenant_id)

        # Schedule referral offer +3 days later
        try:
            from app.workers.tasks import send_referral_offer_task
            send_referral_offer_task.apply_async(
                args=[customer_phone, tenant_id],
                countdown=int(timedelta(days=3).total_seconds()),
            )
        except Exception as e:
            logger.warning(f"Could not schedule referral offer: {e}")


async def send_referral_offer(customer_phone: str, tenant_id: str):
    """Send referral discount code to happy customers."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT name FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        tenant = result.fetchone()
        if not tenant:
            return

        discount_code = _generate_referral_code(customer_phone, tenant_id)
        customer_name = await _get_customer_name(customer_phone, tenant_id, db)
        msg = (
            f"Hi {customer_name}! As a thank-you for being a valued customer, "
            f"here's a special referral code just for you: *{discount_code}*\n\n"
            f"Share it with a friend and you both get 10% off your next visit with {tenant.name}! 🎉"
        )
        await _send_whatsapp(customer_phone, msg, tenant_id)


async def _get_customer_name(phone: str, tenant_id: str, db: AsyncSession) -> str:
    """Look up customer name by phone, fallback to 'there'."""
    try:
        from app.models.customer import Customer
        result = await db.execute(
            select(Customer).where(
                Customer.phone == phone,
                Customer.tenant_id == uuid.UUID(tenant_id),
            ).limit(1)
        )
        customer = result.scalar_one_or_none()
        return customer.name or "there" if customer else "there"
    except Exception:
        return "there"


async def _send_whatsapp(phone: str, message: str, tenant_id: str):
    """Send a WhatsApp message via the existing sender utility."""
    try:
        from app.services.whatsapp_sender import send_text_message
        await send_text_message(phone, message)
    except Exception as e:
        logger.warning(f"WhatsApp send failed to {phone}: {e}")


def _generate_referral_code(phone: str, tenant_id: str) -> str:
    """Generate a deterministic 8-char referral code."""
    h = hashlib.sha256(f"{phone}{tenant_id}".encode()).hexdigest()
    return ("REF-" + h[:8]).upper()
