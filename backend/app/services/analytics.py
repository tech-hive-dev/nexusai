"""
Analytics Service
─────────────────
Aggregates KPIs for the analytics dashboard:
- Lead score distribution (hot/warm/cold)
- Conversation trends
- Top unanswered questions (knowledge gaps)
- Estimated lost revenue from unconverted hot leads
- Sentiment trend
- Campaign performance
"""
from datetime import datetime, timedelta
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.models.lead import Lead
from app.models.conversation import Conversation
from app.models.customer import Customer


async def get_dashboard_metrics(tenant_id: str, db: AsyncSession, days: int = 7) -> dict:
    """Aggregate all KPIs for the analytics dashboard."""
    since = datetime.utcnow() - timedelta(days=days)
    tid = tenant_id

    # Lead distribution
    leads_result = await db.execute(
        select(Lead.status, func.count(Lead.id).label("count"))
        .where(Lead.tenant_id == tid)
        .where(Lead.created_at >= since)
        .group_by(Lead.status)
    )
    lead_counts = {row.status: row.count for row in leads_result.fetchall()}

    # Conversion rate
    total_leads = sum(lead_counts.values())
    converted = await db.scalar(
        select(func.count(Lead.id))
        .where(Lead.tenant_id == tid)
        .where(Lead.converted == True)
        .where(Lead.created_at >= since)
    ) or 0
    conversion_rate = round(converted / total_leads * 100, 1) if total_leads else 0

    # Estimated lost revenue (unconverted hot leads × avg deal value × 30% close rate)
    unconverted_hot = await db.scalar(
        select(func.count(Lead.id))
        .where(Lead.tenant_id == tid)
        .where(Lead.status == "hot")
        .where(Lead.converted == False)
        .where(Lead.created_at >= since)
    ) or 0

    # Get tenant avg_deal_value setting
    avg_deal = await _get_avg_deal_value(tid, db)
    lost_revenue = round(unconverted_hot * avg_deal * 0.30, 2)

    # Top unanswered questions (knowledge gaps)
    top_questions = []
    try:
        gaps_result = await db.execute(
            text("""
                SELECT query, COUNT(*) AS frequency
                FROM knowledge_gaps
                WHERE tenant_id = :tid
                  AND created_at >= :since
                GROUP BY query
                ORDER BY frequency DESC
                LIMIT 10
            """),
            {"tid": tid, "since": since},
        )
        top_questions = [{"query": r.query, "frequency": r.frequency} for r in gaps_result.fetchall()]
    except Exception as e:
        logger.warning(f"knowledge_gaps query failed: {e}")

    # Sentiment trend (daily % positive last N days)
    sentiment_trend = []
    try:
        sent_result = await db.execute(
            text("""
                SELECT DATE(created_at) AS day,
                       COUNT(*) FILTER (WHERE sentiment IN ('delighted','satisfied')) AS positive,
                       COUNT(*) AS total
                FROM conversations
                WHERE tenant_id = :tid
                  AND created_at >= :since
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            """),
            {"tid": tid, "since": since},
        )
        sentiment_trend = [
            {
                "day": str(r.day),
                "positive_pct": round(r.positive / r.total * 100, 1) if r.total else 0,
            }
            for r in sent_result.fetchall()
        ]
    except Exception as e:
        logger.warning(f"Sentiment trend query failed: {e}")

    # Avg response time (seconds)
    avg_response_secs = None
    try:
        rt_result = await db.execute(
            text("""
                SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) AS avg_secs
                FROM conversations
                WHERE tenant_id = :tid
                  AND first_response_at IS NOT NULL
                  AND created_at >= :since
            """),
            {"tid": tid, "since": since},
        )
        row = rt_result.fetchone()
        avg_response_secs = round(float(row.avg_secs), 1) if row and row.avg_secs else None
    except Exception as e:
        logger.warning(f"Response time query failed: {e}")

    return {
        "period_days": days,
        "leads": lead_counts,
        "total_leads": total_leads,
        "conversion_rate": conversion_rate,
        "unconverted_hot_leads": unconverted_hot,
        "estimated_lost_revenue": lost_revenue,
        "avg_deal_value": avg_deal,
        "top_unanswered_questions": top_questions,
        "sentiment_trend": sentiment_trend,
        "avg_response_seconds": avg_response_secs,
    }


async def get_campaign_performance(tenant_id: str, db: AsyncSession) -> list:
    """Return per-campaign send/deliver/reply stats."""
    try:
        result = await db.execute(
            text("""
                SELECT c.id, c.name, c.status, c.created_at,
                       COUNT(cc.id)                            AS total_contacts,
                       COUNT(cc.id) FILTER (WHERE cc.sent_at IS NOT NULL)  AS sent,
                       COUNT(cc.id) FILTER (WHERE cc.delivered)            AS delivered,
                       COUNT(cc.id) FILTER (WHERE cc.replied)              AS replied
                FROM campaigns c
                LEFT JOIN campaign_contacts cc ON cc.campaign_id = c.id
                WHERE c.tenant_id = :tid
                GROUP BY c.id, c.name, c.status, c.created_at
                ORDER BY c.created_at DESC
                LIMIT 50
            """),
            {"tid": tenant_id},
        )
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "status": r.status,
                "created_at": str(r.created_at),
                "total_contacts": r.total_contacts,
                "sent": r.sent,
                "delivered": r.delivered,
                "replied": r.replied,
                "reply_rate": round(r.replied / r.sent * 100, 1) if r.sent else 0,
            }
            for r in result.fetchall()
        ]
    except Exception as e:
        logger.warning(f"Campaign performance query failed: {e}")
        return []


async def _get_avg_deal_value(tenant_id: str, db: AsyncSession) -> float:
    """Return avg_deal_value from tenant settings or default 500."""
    try:
        result = await db.execute(
            text("SELECT settings FROM tenants WHERE id = :tid"),
            {"tid": tenant_id},
        )
        row = result.fetchone()
        if row and row.settings and isinstance(row.settings, dict):
            return float(row.settings.get("avg_deal_value", 500))
    except Exception:
        pass
    return 500.0


async def daily_lost_opportunity_alert():
    """
    Daily job (run from Celery beat at 08:00).
    Sends WhatsApp alert to any tenant owner with unconverted hot leads.
    """
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text as sql

    async with AsyncSessionLocal() as db:
        tenants = await db.execute(
            sql("SELECT id, name, owner_whatsapp_number, settings FROM tenants WHERE owner_whatsapp_number IS NOT NULL")
        )
        for t in tenants.fetchall():
            try:
                metrics = await get_dashboard_metrics(str(t.id), db, days=1)
                hot_unconverted = metrics.get("unconverted_hot_leads", 0)
                if hot_unconverted > 0:
                    lost = metrics.get("estimated_lost_revenue", 0)
                    msg = (
                        f"📊 NexusAI Daily Report — {t.name}\n\n"
                        f"Yesterday you had {hot_unconverted} hot lead(s) that didn't convert.\n"
                        f"Estimated missed revenue: £{lost:.0f}\n\n"
                        f"Log in to follow up: https://app.nexusai.co/dashboard#leads"
                    )
                    from app.services.whatsapp_sender import send_text_message
                    await send_text_message(t.owner_whatsapp_number, msg)
            except Exception as e:
                logger.warning(f"Daily alert failed for tenant {t.id}: {e}")
