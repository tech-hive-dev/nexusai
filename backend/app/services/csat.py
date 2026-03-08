"""
CSAT & Review Automation Service
──────────────────────────────────
After a conversation resolves:
  - Send 1–5 star rating request via WhatsApp
  - If score >= 4: schedule Google review link (2hr delay)
  - If score <= 2: send private feedback form link
"""
from loguru import logger
from sqlalchemy import text, select


async def send_csat_to_customer(conversation_id: str, AsyncSessionLocal):
    """Send CSAT request when conversation is resolved."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT c.id, c.tenant_id, c.customer_id,
                       cu.phone, cu.external_id, cu.name,
                       t.agent_name, t.name as tenant_name
                FROM conversations c
                JOIN customers cu ON c.customer_id = cu.id
                JOIN tenants t ON c.tenant_id = t.id
                WHERE c.id = :id
            """),
            {"id": conversation_id},
        )
        row = result.mappings().one_or_none()
        if not row:
            return

        phone = row["phone"] or row["external_id"]
        if not phone:
            return

        agent_name = row["agent_name"] or "our team"
        customer_name = row["name"] or "there"

        message = (
            f"Hi {customer_name}! Thanks for chatting with {agent_name} at {row['tenant_name']}. "
            f"How would you rate your experience today?\n\n"
            f"Reply with a number:\n"
            f"⭐ 1 - Poor\n⭐⭐ 2 - Fair\n⭐⭐⭐ 3 - Good\n"
            f"⭐⭐⭐⭐ 4 - Great\n⭐⭐⭐⭐⭐ 5 - Excellent"
        )

        from app.api.webhooks import _send_whatsapp_reply
        await _send_whatsapp_reply(phone, message)

        # Mark CSAT as requested
        await db.execute(
            text("UPDATE conversations SET csat_requested_at = NOW() WHERE id = :id"),
            {"id": conversation_id},
        )

        # Log in review_requests table
        await db.execute(
            text("""
                INSERT INTO review_requests (tenant_id, customer_id, conversation_id, type, status)
                VALUES (:tenant_id, :customer_id, :conversation_id, 'csat', 'sent')
            """),
            {
                "tenant_id": str(row["tenant_id"]),
                "customer_id": str(row["customer_id"]),
                "conversation_id": conversation_id,
            },
        )
        await db.commit()
        logger.info(f"CSAT request sent for conversation {conversation_id}")


async def process_csat_response(conversation_id: str, score: int, AsyncSessionLocal):
    """Process a customer's CSAT score reply."""
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE conversations SET csat_score = :score WHERE id = :id"),
            {"score": score, "id": conversation_id},
        )
        await db.commit()

    if score >= 4:
        # Schedule Google review request in 2 hours
        from app.workers.tasks import send_google_review_request
        send_google_review_request.apply_async(args=[conversation_id], countdown=7200)
    elif score <= 2:
        # Send private feedback form immediately
        await _send_feedback_form(conversation_id, AsyncSessionLocal)


async def send_review_request(conversation_id: str, AsyncSessionLocal):
    """Send Google review link after high CSAT (called by Celery 2hr later)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT c.csat_score, cu.phone, cu.external_id, cu.name,
                       t.google_review_url, t.name as tenant_name
                FROM conversations c
                JOIN customers cu ON c.customer_id = cu.id
                JOIN tenants t ON c.tenant_id = t.id
                WHERE c.id = :id
            """),
            {"id": conversation_id},
        )
        row = result.mappings().one_or_none()
        if not row or not row["google_review_url"]:
            return

        # Only send if still a good score
        if (row["csat_score"] or 0) < 4:
            return

        phone = row["phone"] or row["external_id"]
        if not phone:
            return

        message = (
            f"Thank you for the wonderful feedback, {row['name'] or 'there'}! 🙏\n"
            f"Would you mind leaving us a quick Google review? It helps other customers find us:\n"
            f"{row['google_review_url']}\n\nIt only takes 30 seconds!"
        )

        from app.api.webhooks import _send_whatsapp_reply
        await _send_whatsapp_reply(phone, message)

        await db.execute(
            text("""
                INSERT INTO review_requests (tenant_id, customer_id, conversation_id, type, status)
                SELECT tenant_id, customer_id, :conv_id, 'google_review', 'sent'
                FROM conversations WHERE id = :conv_id
            """),
            {"conv_id": conversation_id},
        )
        await db.commit()
        logger.info(f"Google review request sent for conversation {conversation_id}")


async def _send_feedback_form(conversation_id: str, AsyncSessionLocal):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT cu.phone, cu.external_id, cu.name, t.feedback_form_url
                FROM conversations c
                JOIN customers cu ON c.customer_id = cu.id
                JOIN tenants t ON c.tenant_id = t.id
                WHERE c.id = :id
            """),
            {"id": conversation_id},
        )
        row = result.mappings().one_or_none()
        if not row or not row["feedback_form_url"]:
            return

        phone = row["phone"] or row["external_id"]
        if not phone:
            return

        message = (
            f"Hi {row['name'] or 'there'}, we're sorry your experience wasn't perfect. "
            f"We'd love to hear how we can improve:\n{row['feedback_form_url']}\n"
            f"Your feedback goes directly to our management team."
        )
        from app.api.webhooks import _send_whatsapp_reply
        await _send_whatsapp_reply(phone, message)
