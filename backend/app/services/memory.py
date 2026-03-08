"""
Customer Memory Profiles Service
──────────────────────────────────
After a conversation resolves, Claude generates a 2–3 sentence summary
of what was discussed, what the customer needed, and any preferences noted.
This summary is stored on the customer profile and injected into future
conversations to make the agent feel like it "remembers" the customer.
"""
import anthropic
from loguru import logger
from sqlalchemy import text

from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def summarize_and_store(conversation_id: str, AsyncSessionLocal):
    """Generate and persist a memory summary for the customer."""
    async with AsyncSessionLocal() as db:
        # Load conversation messages
        result = await db.execute(
            text("""
                SELECT m.role, m.content, c.customer_id, c.intent,
                       cu.name, cu.conversation_summary, cu.preferences
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN customers cu ON c.customer_id = cu.id
                WHERE m.conversation_id = :id AND m.role IN ('user', 'assistant')
                ORDER BY m.created_at
                LIMIT 40
            """),
            {"id": conversation_id},
        )
        rows = result.mappings().all()
        if not rows:
            return

        customer_id = str(rows[0]["customer_id"])
        existing_summary = rows[0]["conversation_summary"] or ""
        existing_prefs = rows[0]["preferences"] or {}

        # Build transcript
        transcript = "\n".join(
            f"{r['role'].upper()}: {r['content'][:300]}" for r in rows
        )

        summary = await _generate_summary(
            transcript=transcript,
            existing_summary=existing_summary,
            customer_name=rows[0]["name"] or "Customer",
        )

        preferences = await _extract_preferences(transcript, existing_prefs)

        # Update customer record
        import json
        await db.execute(
            text("""
                UPDATE customers
                SET conversation_summary = :summary,
                    preferences = :preferences::jsonb,
                    last_seen_at = NOW()
                WHERE id = :customer_id
            """),
            {
                "summary": summary,
                "preferences": json.dumps(preferences),
                "customer_id": customer_id,
            },
        )
        await db.commit()
        logger.info(f"Memory summary updated for customer {customer_id}")


async def _generate_summary(transcript: str, existing_summary: str, customer_name: str) -> str:
    """Use Claude Haiku to generate a compact memory summary."""
    context = f"Previous summary: {existing_summary}\n\n" if existing_summary else ""

    prompt = f"""{context}New conversation transcript:
{transcript[:2000]}

Write a 2-3 sentence memory note about {customer_name} for an AI assistant.
Include: what they needed, any preferences mentioned, outcome of the conversation.
Be factual and specific. No filler words."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.warning(f"Memory summary generation failed: {e}")
        return existing_summary


async def _extract_preferences(transcript: str, existing: dict) -> dict:
    """Extract structured preferences from conversation."""
    prompt = f"""Extract customer preferences from this conversation as JSON.
Fields to look for: language, product_interests, communication_style, timezone, budget_range.
Only include fields explicitly mentioned. Return only valid JSON, no explanation.
Existing preferences: {existing}

Transcript (last 1000 chars): {transcript[-1000:]}"""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text_resp = response.content[0].text.strip()
        new_prefs = json.loads(text_resp)
        # Merge with existing, new values override
        return {**existing, **new_prefs}
    except Exception:
        return existing
