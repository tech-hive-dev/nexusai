"""
Instant Quote / Estimate Generator
────────────────────────────────────
Generates a professional price estimate from customer requirements using
the tenant's knowledge base (pricing docs) as context.
"""
import json
from datetime import datetime, timedelta
from loguru import logger

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.quote import Quote
from app.models.customer import Customer


def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def generate_quote(
    requirements: str,
    tenant_id: str,
    db: AsyncSession,
    customer: Customer | None = None,
    conversation_id: str | None = None,
    lead_id: str | None = None,
    currency: str = "GBP",
) -> dict:
    """
    Generate a price estimate based on customer requirements.
    Pulls pricing context from the tenant knowledge base.
    Returns the quote dict and persists to DB.
    """
    # Pull pricing info from the tenant's knowledge base
    pricing_context = ""
    try:
        from app.services.knowledge import search_knowledge
        pricing_context = await search_knowledge(
            query=f"pricing rates cost estimate {requirements}",
            tenant_id=tenant_id,
            db=db,
            top_k=5,
        )
    except Exception as e:
        logger.warning(f"Knowledge search failed for quote: {e}")

    prompt = f"""You are a professional quoting assistant. Generate a price estimate for the customer.

Pricing information from this business:
{pricing_context or "No specific pricing loaded. Use reasonable estimates and note they are approximate."}

Customer requirements: {requirements}
Currency: {currency}

Return ONLY valid JSON with no markdown:
{{"line_items": [{{"description": "string", "price": 0.00}}],
  "subtotal": 0.00,
  "notes": "string",
  "valid_days": 30,
  "chat_summary": "One sentence summary for the chat (e.g. 'Based on your requirements, the estimated cost is £X.')"}}

Be specific and professional. If pricing info is unavailable, give a realistic range with a note."""

    try:
        response = await _get_client().messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        result = json.loads(raw)
    except Exception as e:
        logger.error(f"Quote generation failed: {e}")
        return {"error": str(e)}

    # Persist quote
    import uuid
    try:
        valid_until = datetime.utcnow() + timedelta(days=result.get("valid_days", 30))
        quote = Quote(
            tenant_id=uuid.UUID(tenant_id),
            lead_id=uuid.UUID(lead_id) if lead_id else None,
            customer_id=customer.id if customer else None,
            conversation_id=uuid.UUID(conversation_id) if conversation_id else None,
            line_items=result.get("line_items", []),
            subtotal=float(result.get("subtotal", 0)),
            currency=currency,
            notes=result.get("notes", ""),
            chat_summary=result.get("chat_summary", ""),
            valid_until=valid_until,
            status="draft",
            contact_name=customer.name if customer else "",
            contact_email=customer.email if customer else "",
        )
        db.add(quote)
        await db.commit()
        result["quote_id"] = str(quote.id)
    except Exception as e:
        logger.error(f"Failed to save quote: {e}")

    return result
