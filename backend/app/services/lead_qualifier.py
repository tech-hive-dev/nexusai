"""
Lead Qualification Engine
─────────────────────────
Analyses conversation history with Claude and assigns a 0-100 lead score.
Persists the result to the leads table and notifies the owner if hot.
"""
import json
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

import anthropic
from app.core.config import settings
from app.models.lead import Lead
from app.models.customer import Customer


QUALIFICATION_PROMPT = """You are a lead qualification assistant. Based on the conversation below,
extract and score this lead on a scale of 0-100.

Scoring criteria:
- Budget confirmed or implied (0-25 pts): customer mentions budget, price range, or agrees to a cost
- Clear timeline / urgency (0-25 pts): customer has a specific timeframe or immediate need
- Decision maker (0-25 pts): customer appears to be the one who makes the purchase decision
- Specific need matches our service (0-25 pts): clear, concrete requirement described

Return ONLY valid JSON with no markdown or explanation:
{"score": int, "budget": str, "timeline": str, "decision_maker": bool,
 "need_summary": str, "recommended_action": str,
 "contact_name": str, "contact_email": str, "contact_phone": str}

For missing fields use empty string or false. Keep need_summary under 200 chars."""


def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def qualify_lead(
    conversation: list[dict],
    tenant_id: str,
    conversation_id: str | None,
    customer: Customer | None,
    db: AsyncSession,
) -> dict:
    """
    Analyse conversation and return lead qualification result.
    Saves to DB and notifies owner for hot leads.
    """
    try:
        response = await _get_client().messages.create(
            model=settings.ANTHROPIC_HAIKU_MODEL,
            max_tokens=512,
            system=QUALIFICATION_PROMPT,
            messages=[{"role": "user", "content": json.dumps(conversation)}],
        )
        raw = response.content[0].text.strip()
        result = json.loads(raw)
    except Exception as e:
        logger.warning(f"Lead qualification failed: {e}")
        return {}

    score = int(result.get("score", 0))
    status = "hot" if score >= 70 else "warm" if score >= 40 else "cold"

    import uuid
    try:
        lead = Lead(
            tenant_id=uuid.UUID(tenant_id),
            conversation_id=uuid.UUID(conversation_id) if conversation_id else None,
            customer_id=customer.id if customer else None,
            score=score,
            status=status,
            budget=result.get("budget", ""),
            timeline=result.get("timeline", ""),
            decision_maker=bool(result.get("decision_maker", False)),
            need_summary=result.get("need_summary", ""),
            recommended_action=result.get("recommended_action", ""),
            contact_name=result.get("contact_name") or (customer.name if customer else ""),
            contact_email=result.get("contact_email") or (customer.email if customer else ""),
            contact_phone=result.get("contact_phone") or (customer.phone if customer else ""),
        )
        db.add(lead)
        await db.commit()
        result["lead_id"] = str(lead.id)
        result["status"] = status
    except Exception as e:
        logger.error(f"Failed to save lead: {e}")

    # Notify owner for hot leads
    if status == "hot":
        try:
            await _notify_owner_hot_lead(result, tenant_id, conversation_id)
        except Exception as e:
            logger.warning(f"Hot lead notification failed: {e}")

    return result


async def _notify_owner_hot_lead(lead_data: dict, tenant_id: str, conversation_id: str | None):
    """Send WhatsApp/email notification to tenant owner for a hot lead."""
    from sqlalchemy import select, text
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT owner_whatsapp_number, escalation_email, name FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        tenant = result.fetchone()
        if not tenant:
            return

        msg = (
            f"🔥 Hot Lead Alert — {tenant.name}\n\n"
            f"Name: {lead_data.get('contact_name') or 'Unknown'}\n"
            f"Score: {lead_data.get('score', 0)}/100\n"
            f"Need: {lead_data.get('need_summary', 'N/A')}\n"
            f"Budget: {lead_data.get('budget', 'N/A')}\n"
            f"Timeline: {lead_data.get('timeline', 'N/A')}\n"
            f"Action: {lead_data.get('recommended_action', 'Follow up now')}\n\n"
            f"View at: https://app.nexusai.co/dashboard#leads"
        )

        if tenant.owner_whatsapp_number:
            try:
                from app.services.whatsapp_sender import send_text_message
                await send_text_message(tenant.owner_whatsapp_number, msg)
            except Exception as e:
                logger.warning(f"WhatsApp hot lead alert failed: {e}")

        if tenant.escalation_email:
            try:
                from app.services.email import send_email
                await send_email(
                    to=tenant.escalation_email,
                    subject=f"🔥 Hot Lead — Score {lead_data.get('score', 0)}/100",
                    body=msg,
                )
            except Exception as e:
                logger.warning(f"Email hot lead alert failed: {e}")
