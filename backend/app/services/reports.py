"""
Auto-Generated Weekly Reports Service
───────────────────────────────────────
Every Monday at 9am, Claude generates a natural-language business summary
for each active tenant and sends it via WhatsApp to the owner.
"""
import anthropic
from loguru import logger
from sqlalchemy import text

from app.core.config import settings

client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def send_all_weekly_reports(AsyncSessionLocal):
    """Entry point called by Celery beat — loops all active tenants."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT id, name, owner_whatsapp_number, weekly_report_enabled
                FROM tenants
                WHERE is_active = true AND weekly_report_enabled = true
                  AND owner_whatsapp_number IS NOT NULL
            """)
        )
        tenants = result.mappings().all()

    for tenant in tenants:
        try:
            await send_weekly_summary(str(tenant["id"]), tenant["name"], tenant["owner_whatsapp_number"], AsyncSessionLocal)
        except Exception as e:
            logger.error(f"Weekly report failed for tenant {tenant['id']}: {e}")


async def send_weekly_summary(tenant_id: str, tenant_name: str, owner_phone: str, AsyncSessionLocal):
    """Generate and send one tenant's weekly report."""
    async with AsyncSessionLocal() as db:
        # Gather last 7 days stats
        stats = await db.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as conversations_week,
                    COUNT(*) FILTER (WHERE status = 'resolved' AND created_at >= NOW() - INTERVAL '7 days') as resolved_week,
                    COUNT(*) FILTER (WHERE status = 'escalated' AND created_at >= NOW() - INTERVAL '7 days') as escalated_week,
                    ROUND(AVG(csat_score) FILTER (WHERE csat_score IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days'), 1) as avg_csat
                FROM conversations
                WHERE tenant_id = :tenant_id
            """),
            {"tenant_id": tenant_id},
        )
        s = stats.mappings().one()

        leads_result = await db.execute(
            text("""
                SELECT COUNT(*) as new_leads
                FROM customers
                WHERE tenant_id = :tenant_id AND created_at >= NOW() - INTERVAL '7 days'
            """),
            {"tenant_id": tenant_id},
        )
        leads = leads_result.scalar()

        appointments_result = await db.execute(
            text("""
                SELECT COUNT(*) as booked
                FROM appointments
                WHERE tenant_id = :tenant_id AND created_at >= NOW() - INTERVAL '7 days'
            """),
            {"tenant_id": tenant_id},
        )
        appointments = appointments_result.scalar()

        recovery_result = await db.execute(
            text("""
                SELECT COUNT(*) FILTER (WHERE status = 'recovered') as recovered,
                       COUNT(*) as total
                FROM cart_recoveries
                WHERE tenant_id = :tenant_id AND created_at >= NOW() - INTERVAL '7 days'
            """),
            {"tenant_id": tenant_id},
        )
        recovery = recovery_result.mappings().one()

    data = {
        "conversations": s["conversations_week"] or 0,
        "resolved": s["resolved_week"] or 0,
        "escalated": s["escalated_week"] or 0,
        "avg_csat": float(s["avg_csat"]) if s["avg_csat"] else None,
        "new_leads": leads or 0,
        "appointments": appointments or 0,
        "carts_recovered": recovery["recovered"] or 0,
        "carts_total": recovery["total"] or 0,
    }

    summary = await _generate_report(tenant_name, data)

    from app.api.webhooks import _send_whatsapp_reply
    await _send_whatsapp_reply(owner_phone, summary)
    logger.info(f"Weekly report sent to {tenant_name} ({owner_phone})")


async def _generate_report(tenant_name: str, data: dict) -> str:
    resolution_rate = round(data["resolved"] / max(data["conversations"], 1) * 100)
    recovery_rate = round(data["carts_recovered"] / max(data["carts_total"], 1) * 100) if data["carts_total"] else 0

    prompt = f"""Write a friendly, concise weekly business report for {tenant_name}.
Keep it under 200 words. Use emojis sparingly. Highlight wins and one improvement suggestion.

Data for the past 7 days:
- Conversations handled: {data['conversations']}
- Resolved by AI: {data['resolved']} ({resolution_rate}% resolution rate)
- Escalated to humans: {data['escalated']}
- Average CSAT score: {data['avg_csat'] or 'N/A'}/5
- New leads captured: {data['new_leads']}
- Appointments booked: {data['appointments']}
- Abandoned carts recovered: {data['carts_recovered']}/{data['carts_total']} ({recovery_rate}%)

Format: plain WhatsApp message (no markdown headers, use line breaks)."""

    try:
        response = await client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        return (
            f"📊 Weekly Report — {tenant_name}\n\n"
            f"Conversations: {data['conversations']}\n"
            f"Resolved: {data['resolved']}\n"
            f"New leads: {data['new_leads']}\n"
            f"Appointments: {data['appointments']}\n"
            f"CSAT: {data['avg_csat'] or 'N/A'}/5"
        )
