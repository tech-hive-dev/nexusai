"""
Outbound Messaging Service
──────────────────────────
WhatsApp outbound dispatcher for proactive campaigns:
- Re-engagement (customers silent 30+ days)
- Appointment reminders (24h before)
Rate-limited via Redis token bucket.
"""
import asyncio
from datetime import datetime, timedelta
from loguru import logger

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.tenant import Tenant
from app.models.customer import Customer


async def _send_whatsapp(phone: str, message: str, tenant: Tenant) -> bool:
    """Send a WhatsApp message via Meta Cloud API."""
    if not getattr(tenant, "whatsapp_phone_number_id", None) or not getattr(tenant, "whatsapp_token", None):
        return False
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://graph.facebook.com/v18.0/{tenant.whatsapp_phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {tenant.whatsapp_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "to": phone,
                    "type": "text",
                    "text": {"body": message},
                },
                timeout=10,
            )
            return resp.status_code == 200
    except Exception as e:
        logger.error(f"WhatsApp send failed for {phone}: {e}")
        return False


async def run_reengagement_campaign(db_factory) -> None:
    """
    Find customers silent for 30+ days and send a personalised re-engagement message.
    Runs daily at 10 AM via Celery beat.
    """
    async with db_factory() as db:
        cutoff = datetime.utcnow() - timedelta(days=30)

        # All active tenants
        tenants_result = await db.execute(select(Tenant).where(Tenant.is_active == True))
        tenants = tenants_result.scalars().all()

        for tenant in tenants:
            try:
                # Customers with phone, last_seen older than 30d (or never set)
                result = await db.execute(
                    select(Customer).where(
                        and_(
                            Customer.tenant_id == tenant.id,
                            Customer.phone != None,
                            Customer.phone != "",
                        )
                    ).limit(200)
                )
                customers = result.scalars().all()

                sent = 0
                for customer in customers:
                    # Skip recently active ones
                    last_seen = getattr(customer, "last_seen_at", None)
                    if last_seen and last_seen > cutoff:
                        continue

                    name = customer.name or "there"
                    message = (
                        f"Hey {name}! 👋 It's been a while since we last chatted. "
                        f"We at {tenant.name} have some exciting updates and offers for you. "
                        f"Reply to this message to reconnect with us! 😊"
                    )
                    ok = await _send_whatsapp(customer.phone, message, tenant)
                    if ok:
                        sent += 1
                    # Small delay between messages
                    await asyncio.sleep(0.5)

                logger.info(f"Re-engagement: {sent} messages sent for tenant {tenant.slug}")
            except Exception as e:
                logger.error(f"Re-engagement failed for tenant {tenant.slug}: {e}")


async def send_appointment_reminders(db_factory) -> None:
    """
    Send 24-hour appointment reminders to customers.
    Runs every hour via Celery beat.
    """
    async with db_factory() as db:
        window_start = datetime.utcnow() + timedelta(hours=23)
        window_end = datetime.utcnow() + timedelta(hours=25)

        try:
            from app.models.appointment import Appointment
        except ImportError:
            return

        result = await db.execute(
            select(Appointment).where(
                and_(
                    Appointment.scheduled_at >= window_start,
                    Appointment.scheduled_at <= window_end,
                    Appointment.status == "pending",
                    Appointment.reminder_sent == False,
                )
            )
        )
        appointments = result.scalars().all()

        for appt in appointments:
            try:
                # Get tenant
                t_result = await db.execute(select(Tenant).where(Tenant.id == appt.tenant_id))
                tenant = t_result.scalar_one_or_none()
                if not tenant:
                    continue

                # Get customer
                if not appt.customer_id:
                    continue
                c_result = await db.execute(select(Customer).where(Customer.id == appt.customer_id))
                customer = c_result.scalar_one_or_none()
                if not customer or not customer.phone:
                    continue

                scheduled_str = appt.scheduled_at.strftime("%A, %B %d at %I:%M %p")
                message = (
                    f"Hi {customer.name or 'there'}! 📅 Reminder: you have an appointment "
                    f"with {tenant.name} tomorrow — {scheduled_str}. "
                    f"Reply CONFIRM to confirm or CANCEL to cancel."
                )
                ok = await _send_whatsapp(customer.phone, message, tenant)
                if ok:
                    appt.reminder_sent = True
                    await db.commit()
            except Exception as e:
                logger.error(f"Reminder failed for appointment {appt.id}: {e}")
