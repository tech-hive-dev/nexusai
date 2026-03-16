"""
Follow-up Sequence Service
───────────────────────────
Handles automated Day 1/3/7 follow-up messages for unresolved conversations.
Sends personalized messages via Claude to check if customer needs more help.
"""
from loguru import logger
from sqlalchemy import text
from datetime import datetime
import json
import asyncio

async def execute_followup_step(conversation_id: str, step: int, AsyncSessionLocal):
    """
    Execute one step (1, 2, or 3) of the follow-up sequence.
    Step 1: +24h (Day 1)
    Step 2: +72h (Day 3)
    Step 3: +168h (Day 7)
    """
    async with AsyncSessionLocal() as db:
        # 1. Load conversation and customer info
        result = await db.execute(
            text("""
                SELECT conv.id, conv.tenant_id, conv.status, conv.channel,
                       cust.id as customer_id, cust.name as customer_name, cust.phone, cust.external_id,
                       t.name as business_name, t.slug as tenant_slug
                FROM conversations conv
                JOIN customers cust ON conv.customer_id = cust.id
                JOIN tenants t ON conv.tenant_id = t.id
                WHERE conv.id = :id
            """),
            {"id": conversation_id}
        )
        conv = result.mappings().one_or_none()
        
        if not conv:
            logger.error(f"Follow-up failed: Conversation {conversation_id} not found")
            return

        # 2. Check if should still send (only for 'open' or 'escalated' but inactive)
        if conv["status"] == "resolved":
            logger.info(f"Skipping follow-up for resolved conversation {conversation_id}")
            return

        # 3. Get last message content for context
        last_msg_result = await db.execute(
            text("SELECT content FROM messages WHERE conversation_id = :id ORDER BY created_at DESC LIMIT 1"),
            {"id": conversation_id}
        )
        last_msg = last_msg_result.scalar_one_or_none() or "our previous chat"

        # 4. Generate personalized follow-up via Claude
        message = await _generate_followup_text(
            customer_name=conv["customer_name"] or "there",
            business_name=conv["business_name"],
            last_topic=last_msg,
            step=step
        )

        # 5. Send message (WhatsApp preference)
        target = conv["phone"] or conv["external_id"]
        if not target:
            logger.warning(f"No contact target for follow-up on conversation {conversation_id}")
            return

        try:
            from app.api.webhooks import _send_whatsapp_reply
            await _send_whatsapp_reply(target, message)
            
            # Record in proactive_messages
            await db.execute(
                text("""
                    INSERT INTO proactive_messages (tenant_id, customer_id, trigger_type, message_text, status, sent_at)
                    VALUES (:t_id, :c_id, 'followup', :msg, 'sent', NOW())
                """),
                {
                    "t_id": conv["tenant_id"],
                    "c_id": conv["customer_id"],
                    "msg": message
                }
            )
            await db.commit()
            logger.info(f"Follow-up step {step} sent for conversation {conversation_id}")

        except Exception as e:
            logger.error(f"Failed to send follow-up for {conversation_id}: {e}")

async def _generate_followup_text(customer_name: str, business_name: str, last_topic: str, step: int) -> str:
    """Uses Claude to generate a contextual follow-up."""
    try:
        from app.services.agent import client
        
        step_prompts = {
            1: "Initial check-in after 24h. Just seeing if they had any more questions.",
            2: "Second follow-up after 3 days. A bit more brief.",
            3: "Final check-in after 7 days before closing the loop."
        }
        
        prompt = f"""
        Generate a friendly follow-up message for a customer.
        Customer: {customer_name}
        Business: {business_name}
        Context of last message: "{last_topic}"
        Goal: {step_prompts.get(step)}
        
        Tone: Empathetic, helpful, low-pressure.
        Rule: Max 25 words. Do NOT use placeholders.
        Return ONLY the message text.
        """
        
        response = await client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception:
        # Fallbacks
        if step == 1:
            return f"Hi {customer_name}! Just checking in to see if you had any more questions about our last chat. We're here to help! - {business_name}"
        return f"Hi {customer_name}! Just wanted to follow up and see if everything was resolved for you. Let us know if you need anything else! - {business_name}"
