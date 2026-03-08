"""
Broadcast Sender Service
─────────────────────────
Executes a broadcast campaign: fetches matching customers,
sends WhatsApp or email messages, updates delivery counts.
"""
import json
from loguru import logger
from sqlalchemy import text


async def execute_broadcast(broadcast_id: str, AsyncSessionLocal):
    async with AsyncSessionLocal() as db:
        # Load broadcast
        result = await db.execute(
            text("SELECT * FROM broadcasts WHERE id = :id"),
            {"id": broadcast_id},
        )
        broadcast = result.mappings().one_or_none()
        if not broadcast or broadcast["status"] == "sent":
            return

        # Mark as sending
        await db.execute(
            text("UPDATE broadcasts SET status = 'sending' WHERE id = :id"),
            {"id": broadcast_id},
        )
        await db.commit()

        tenant_id = str(broadcast["tenant_id"])
        target_filter = broadcast["target_filter"] or {}
        if isinstance(target_filter, str):
            try:
                target_filter = json.loads(target_filter)
            except Exception:
                target_filter = {}

        # Fetch recipients
        where = ["tenant_id = :tenant_id", "phone IS NOT NULL"]
        params: dict = {"tenant_id": tenant_id}

        if target_filter.get("channel"):
            where.append("channel = :channel")
            params["channel"] = target_filter["channel"]

        customers_result = await db.execute(
            text(f"SELECT id, name, phone, external_id, channel FROM customers WHERE {' AND '.join(where)} LIMIT 5000"),
            params,
        )
        customers = customers_result.mappings().all()

        sent_count = 0
        content = broadcast["content"]

        for customer in customers:
            try:
                phone = customer["phone"] or customer["external_id"]
                if not phone:
                    continue

                # Personalize message
                message = content.replace("{{name}}", customer["name"] or "there")

                if broadcast["type"] == "whatsapp":
                    from app.api.webhooks import _send_whatsapp_reply
                    await _send_whatsapp_reply(phone, message)
                    sent_count += 1

                elif broadcast["type"] == "email" and customer.get("email"):
                    # Email sending via SendGrid (if configured)
                    from app.services.email import send_email
                    await send_email(
                        to_email=customer["email"],
                        subject=broadcast.get("subject", "Message from us"),
                        body=message,
                    )
                    sent_count += 1

            except Exception as e:
                logger.warning(f"Broadcast send to {customer['id']} failed: {e}")
                continue

        # Mark as sent
        await db.execute(
            text("UPDATE broadcasts SET status = 'sent', sent_count = :sent, sent_at = NOW() WHERE id = :id"),
            {"sent": sent_count, "id": broadcast_id},
        )
        await db.commit()
        logger.info(f"Broadcast {broadcast_id} sent to {sent_count}/{len(customers)} recipients")
